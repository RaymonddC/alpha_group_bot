import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { supabase } from '../../db/client';
import { logger } from '../../services/logger';
import { authenticateAdmin, generateToken } from '../middleware/auth';
import {
  validateRequest,
  validateQuery,
  SettingsUpdateSchema,
  KickMemberSchema,
  LoginSchema,
  RegisterSchema,
  MembersQuerySchema,
  AnalyticsQuerySchema,
  ActivityLogQuerySchema
} from '../middleware/validation';
import { asyncHandler } from '../middleware/error-handler';
import {
  AuthRequest,
  MembersResponse,
  AnalyticsResponse,
  ERROR_MESSAGES
} from '../../types';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { success: false, error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Note: Bot function will be imported from bot/telegram-bot.ts
let kickMember: (userId: number, groupId: number) => Promise<void>;

export function setBotFunctions(kick: typeof kickMember): void {
  kickMember = kick;
}

/**
 * POST /api/admin/login
 * Admin authentication
 */
router.post(
  '/login',
  loginLimiter,
  validateRequest(LoginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    logger.info('Admin login attempt', { email });

    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !admin) {
      logger.warn('Admin not found', { email });
      res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
      return;
    }

    const validPassword = await bcrypt.compare(password, admin.password_hash);
    if (!validPassword) {
      logger.warn('Invalid password', { email });
      res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
      return;
    }

    // Update last login
    await supabase
      .from('admins')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // Get all groups this admin manages
    const { data: groupAdmins } = await supabase
      .from('group_admins')
      .select('group_id, groups(id, name)')
      .eq('admin_id', admin.id);

    const groups = await Promise.all(
      (groupAdmins || []).map(async (ga: any) => {
        const group = ga.groups;
        const { count } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', ga.group_id);
        return { id: group.id, name: group.name, member_count: count || 0 };
      })
    );

    const token = generateToken(admin.id, admin.email);

    logger.info('Admin logged in successfully', { adminId: admin.id });

    res.json({
      success: true,
      token,
      groups,
      groupId: groups[0]?.id || null
    });
  })
);

/**
 * GET /api/admin/register/validate
 * Validate a registration token
 */
router.get(
  '/register/validate',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ valid: false, error: 'Token is required' });
      return;
    }

    const { data: regToken, error } = await supabase
      .from('admin_registration_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !regToken) {
      res.status(404).json({ valid: false, error: 'Invalid token' });
      return;
    }

    if (regToken.used_at) {
      res.status(400).json({ valid: false, error: 'Token already used. Please log in instead.' });
      return;
    }

    if (new Date(regToken.expires_at) < new Date()) {
      res.status(400).json({ valid: false, error: 'Token expired. Use /admin in your group to get a new link.' });
      return;
    }

    // Get group name
    const { data: group } = await supabase
      .from('groups')
      .select('name')
      .eq('id', regToken.group_id)
      .single();

    res.json({
      valid: true,
      groupName: group?.name || 'Unknown Group',
      telegramUsername: regToken.telegram_username
    });
  })
);

/**
 * POST /api/admin/register
 * Register a new admin via onboarding token
 */
router.post(
  '/register',
  validateRequest(RegisterSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { token, name, email, password } = req.body;

    // Validate token
    const { data: regToken, error: tokenError } = await supabase
      .from('admin_registration_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !regToken) {
      res.status(404).json({ success: false, error: 'Invalid registration token' });
      return;
    }

    if (regToken.used_at) {
      res.status(400).json({ success: false, error: 'Token already used' });
      return;
    }

    if (new Date(regToken.expires_at) < new Date()) {
      res.status(400).json({ success: false, error: 'Token expired' });
      return;
    }

    // Check if email already exists
    const { data: existingAdmin } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();

    let adminId: string;

    if (existingAdmin) {
      // Link existing admin to group
      adminId = existingAdmin.id;
      // Ensure telegram_user_id is set
      if (!existingAdmin.telegram_user_id && regToken.telegram_user_id) {
        await supabase
          .from('admins')
          .update({ telegram_user_id: regToken.telegram_user_id })
          .eq('id', adminId);
      }
    } else {
      // Create new admin
      const passwordHash = await bcrypt.hash(password, 10);

      const { data: newAdmin, error: insertError } = await supabase
        .from('admins')
        .insert({
          email,
          password_hash: passwordHash,
          name,
          telegram_user_id: regToken.telegram_user_id
        });

      if (insertError || !newAdmin) {
        res.status(500).json({ success: false, error: 'Failed to create admin account' });
        return;
      }
      adminId = newAdmin.id;
    }

    // Link admin to group (ignore if already linked)
    await supabase.from('group_admins').insert({
      group_id: regToken.group_id,
      admin_id: adminId,
      role: 'admin'
    });

    // Mark token as used
    await supabase.from('admin_registration_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', regToken.id);

    // Generate JWT
    const jwtToken = generateToken(adminId, email);

    // Get all groups this admin manages
    const { data: allGroupAdmins } = await supabase
      .from('group_admins')
      .select('group_id, groups(id, name)')
      .eq('admin_id', adminId);

    const groups = await Promise.all(
      (allGroupAdmins || []).map(async (ga: any) => {
        const group = ga.groups;
        const { count } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', ga.group_id);
        return { id: group.id, name: group.name, member_count: count || 0 };
      })
    );

    logger.info('Admin registered via onboarding', { adminId, email, groupId: regToken.group_id });

    res.json({
      success: true,
      token: jwtToken,
      groups,
      groupId: regToken.group_id,
      isExisting: !!existingAdmin
    });
  })
);

/**
 * GET /api/admin/groups
 * Get all groups the authenticated admin manages
 */
router.get(
  '/groups',
  authenticateAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const adminId = req.adminId;

    const { data: groupAdmins, error } = await supabase
      .from('group_admins')
      .select('group_id, groups(id, name)')
      .eq('admin_id', adminId);

    if (error) {
      logger.error('Failed to fetch admin groups', { error });
      res.status(500).json({ success: false, error: ERROR_MESSAGES.DATABASE_ERROR });
      return;
    }

    const groups = await Promise.all(
      (groupAdmins || []).map(async (ga: any) => {
        const group = ga.groups;
        const { count } = await supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', ga.group_id);
        return { id: group.id, name: group.name, member_count: count || 0 };
      })
    );

    res.json({ success: true, groups });
  })
);

/**
 * GET /api/admin/members
 * Get all members with pagination, search, and filtering
 */
router.get(
  '/members',
  authenticateAdmin,
  validateQuery(MembersQuerySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
      groupId,
      page = '1',
      limit = '50',
      search,
      tier,
      sortBy = 'joined_at',
      sortOrder = 'desc'
    } = req.query as any;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 per page
    const offset = (pageNum - 1) * limitNum;

    // Verify admin has access to this group
    const { data: accessCheck } = await supabase
      .from('group_admins')
      .select('group_id')
      .eq('admin_id', req.adminId)
      .eq('group_id', groupId)
      .single();

    if (!accessCheck) {
      res.status(403).json({ success: false, error: 'Access denied to this group' });
      return;
    }

    logger.info('Fetching members', {
      groupId,
      page: pageNum,
      limit: limitNum,
      search,
      tier
    });

    // Build query
    let query = supabase
      .from('members')
      .select('*', { count: 'exact' })
      .eq('group_id', groupId);

    // Apply filters
    if (search) {
      query = query.or(
        `telegram_username.ilike.%${search}%,wallet_address.ilike.%${search}%`
      );
    }

    if (tier) {
      query = query.eq('tier', tier);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + limitNum - 1);

    const { data: members, count, error } = await query;

    if (error) {
      logger.error('Failed to fetch members', { error });
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.DATABASE_ERROR
      });
      return;
    }

    const totalPages = Math.ceil((count || 0) / limitNum);

    const response: MembersResponse = {
      members: members || [],
      pagination: {
        total: count || 0,
        page: pageNum,
        limit: limitNum,
        totalPages
      }
    };

    res.json(response);
  })
);

/**
 * GET /api/admin/settings
 * Get group settings for the authenticated admin
 */
router.get(
  '/settings',
  authenticateAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const adminId = req.adminId;
    const requestedGroupId = req.query.groupId as string | undefined;

    let groupId: string;

    if (requestedGroupId) {
      // Verify admin has access to this group
      const { data: link } = await supabase
        .from('group_admins')
        .select('group_id')
        .eq('admin_id', adminId)
        .eq('group_id', requestedGroupId)
        .single();

      if (!link) {
        res.status(404).json({ success: false, error: 'No group found for this admin' });
        return;
      }
      groupId = link.group_id;
    } else {
      // Fall back to first group
      const { data: groupAdmin, error: gaError } = await supabase
        .from('group_admins')
        .select('group_id')
        .eq('admin_id', adminId)
        .limit(1)
        .single();

      if (gaError || !groupAdmin) {
        res.status(404).json({ success: false, error: 'No group found for this admin' });
        return;
      }
      groupId = groupAdmin.group_id;
    }

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      res.status(404).json({ success: false, error: 'Group not found' });
      return;
    }

    res.json({
      groupId: group.id,
      groupName: group.name,
      bronzeThreshold: group.bronze_threshold,
      silverThreshold: group.silver_threshold,
      goldThreshold: group.gold_threshold,
      autoKickEnabled: group.auto_kick_enabled
    });
  })
);

/**
 * POST /api/admin/settings
 * Update group settings and thresholds
 */
router.post(
  '/settings',
  authenticateAdmin,
  validateRequest(SettingsUpdateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { groupId, bronzeThreshold, silverThreshold, goldThreshold, autoKickEnabled } =
      req.body;

    logger.info('Updating group settings', { groupId, adminId: req.adminId });

    // Verify admin has access to this group
    const { data: accessCheck } = await supabase
      .from('group_admins')
      .select('group_id')
      .eq('admin_id', req.adminId)
      .eq('group_id', groupId)
      .single();

    if (!accessCheck) {
      res.status(403).json({ success: false, error: 'Access denied to this group' });
      return;
    }

    const updates: any = {};
    if (bronzeThreshold !== undefined) updates.bronze_threshold = bronzeThreshold;
    if (silverThreshold !== undefined) updates.silver_threshold = silverThreshold;
    if (goldThreshold !== undefined) updates.gold_threshold = goldThreshold;
    if (autoKickEnabled !== undefined) updates.auto_kick_enabled = autoKickEnabled;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', groupId);

    if (error) {
      logger.error('Failed to update settings', { error });
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.DATABASE_ERROR
      });
      return;
    }

    logger.info('Settings updated successfully', { groupId });

    // Fire-and-forget audit log
    supabase.from('activity_log').insert({
      group_id: groupId,
      admin_id: req.adminId,
      action: 'settings_updated',
      action_source: 'admin',
      details: JSON.stringify({ bronzeThreshold, silverThreshold, goldThreshold, autoKickEnabled })
    }).then(({ error: logError }: { error: unknown }) => {
      if (logError) logger.warn('Failed to log settings update', { logError });
    });

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  })
);

/**
 * POST /api/admin/kick
 * Manually kick a member from the group
 */
router.post(
  '/kick',
  authenticateAdmin,
  validateRequest(KickMemberSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { groupId, memberId, reason = 'Manual removal by admin' } = req.body;

    logger.info('Manual kick request', { groupId, memberId, adminId: req.adminId });

    // Verify admin has access to this group
    const { data: accessCheck } = await supabase
      .from('group_admins')
      .select('group_id')
      .eq('admin_id', req.adminId)
      .eq('group_id', groupId)
      .single();

    if (!accessCheck) {
      res.status(403).json({ success: false, error: 'Access denied to this group' });
      return;
    }

    // Get member and group info
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*, groups(*)')
      .eq('id', memberId)
      .eq('group_id', groupId)
      .single();

    if (memberError || !member) {
      logger.error('Member not found', { memberId, groupId });
      res.status(404).json({
        success: false,
        error: ERROR_MESSAGES.NOT_FOUND
      });
      return;
    }

    const group = member.groups as any;

    // Kick from Telegram
    if (kickMember) {
      await kickMember(member.telegram_id, group.telegram_group_id);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('members')
      .delete()
      .eq('id', memberId);

    if (deleteError) {
      logger.error('Failed to delete member', { error: deleteError });
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.DATABASE_ERROR
      });
      return;
    }

    // Log activity
    await supabase.from('activity_log').insert({
      member_id: memberId,
      action: 'kicked',
      old_score: member.fairscore,
      details: reason,
      admin_id: req.adminId,
      group_id: groupId,
      action_source: 'admin'
    });

    logger.info('Member kicked successfully', { memberId, groupId });

    res.json({
      success: true,
      message: 'Member kicked successfully'
    });
  })
);

/**
 * GET /api/admin/analytics
 * Get analytics and statistics for a group
 */
router.get(
  '/analytics',
  authenticateAdmin,
  validateQuery(AnalyticsQuerySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { groupId, period = '30d' } = req.query as any;

    logger.info('Fetching analytics', { groupId, period, adminId: req.adminId });

    // Verify admin has access to this group
    const { data: accessCheck } = await supabase
      .from('group_admins')
      .select('group_id')
      .eq('admin_id', req.adminId)
      .eq('group_id', groupId)
      .single();

    if (!accessCheck) {
      res.status(403).json({ success: false, error: 'Access denied to this group' });
      return;
    }

    // Get all members for the group
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('*')
      .eq('group_id', groupId);

    if (membersError) {
      logger.error('Failed to fetch members for analytics', { error: membersError });
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.DATABASE_ERROR
      });
      return;
    }

    const totalMembers = members?.length || 0;

    // Calculate stats
    const scores: number[] = members?.map((m: any) => m.fairscore) || [];
    const avgScore = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0;
    const sortedScores = [...scores].sort((a: number, b: number) => a - b);
    const medianScore =
      sortedScores.length > 0
        ? sortedScores[Math.floor(sortedScores.length / 2)]
        : 0;

    // Tier distribution
    const tierDistribution = {
      bronze: members?.filter((m: any) => m.tier === 'bronze').length || 0,
      silver: members?.filter((m: any) => m.tier === 'silver').length || 0,
      gold: members?.filter((m: any) => m.tier === 'gold').length || 0
    };

    // Score distribution
    const scoreDistribution = [
      { range: '0-200', count: scores.filter((s: number) => s < 200).length },
      { range: '200-400', count: scores.filter((s: number) => s >= 200 && s < 400).length },
      { range: '400-600', count: scores.filter((s: number) => s >= 400 && s < 600).length },
      { range: '600-800', count: scores.filter((s: number) => s >= 600 && s < 800).length },
      { range: '800-1000', count: scores.filter((s: number) => s >= 800).length }
    ];

    // Get period date
    const daysAgo = parseInt(period.replace('d', ''));
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - daysAgo);

    // Recent activity
    const { data: activities } = await supabase
      .from('activity_log')
      .select('*')
      .gte('created_at', periodStart.toISOString())
      .in(
        'member_id',
        members?.map((m: any) => m.id) || []
      );

    // Group activities by date and action
    const activityMap = new Map<string, any>();
    activities?.forEach((activity: any) => {
      const date = activity.created_at.split('T')[0];
      if (!activityMap.has(date)) {
        activityMap.set(date, { date, verified: 0, promoted: 0, demoted: 0, kicked: 0 });
      }
      const dayData = activityMap.get(date)!;
      if (activity.action === 'verified') dayData.verified++;
      if (activity.action === 'promoted') dayData.promoted++;
      if (activity.action === 'demoted') dayData.demoted++;
      if (activity.action === 'kicked') dayData.kicked++;
    });

    const recentActivity = Array.from(activityMap.values()).sort(
      (a: any, b: any) => b.date.localeCompare(a.date)
    );

    // Top members
    const topMembers =
      members
        ?.sort((a: any, b: any) => b.fairscore - a.fairscore)
        .slice(0, 10)
        .map((m: any) => ({
          telegram_username: m.telegram_username || 'Unknown',
          fairscore: m.fairscore,
          tier: m.tier
        })) || [];

    const response: AnalyticsResponse = {
      totalMembers,
      avgScore: Math.round(avgScore * 10) / 10,
      medianScore,
      tierDistribution,
      scoreDistribution,
      recentActivity,
      topMembers
    };

    res.json(response);
  })
);

/**
 * GET /api/admin/activity-log
 * Get activity log entries for admin's group
 */
router.get(
  '/activity-log',
  authenticateAdmin,
  validateQuery(ActivityLogQuerySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const groupId = req.query.groupId as string;
    const action = req.query.action as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;

    // Verify admin has access to this group
    const { data: link } = await supabase
      .from('group_admins')
      .select('group_id')
      .eq('admin_id', req.adminId)
      .eq('group_id', groupId)
      .single();

    if (!link) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }

    // Build query
    let query = supabase
      .from('activity_log')
      .select('*')
      .eq('group_id', groupId);

    if (action) {
      query = query.eq('action', action);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: logs, error } = await query;

    if (error) {
      logger.error('Failed to fetch activity log', { error });
      res.status(500).json({ success: false, error: 'Failed to fetch activity log' });
      return;
    }

    // Get total count
    let countQuery = supabase
      .from('activity_log')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);

    if (action) {
      countQuery = countQuery.eq('action', action);
    }

    const { count } = await countQuery;

    // Fetch admin names for entries that have admin_id
    const adminIds = [...new Set((logs || []).filter((l: any) => l.admin_id).map((l: any) => l.admin_id))];
    let adminMap: Record<string, string> = {};
    if (adminIds.length > 0) {
      const { data: admins } = await supabase
        .from('admins')
        .select('id, name, email')
        .in('id', adminIds);

      if (admins) {
        for (const a of admins) {
          adminMap[a.id] = a.name || a.email;
        }
      }
    }

    const entries = (logs || []).map((log: any) => ({
      id: log.id,
      action: log.action,
      actionSource: log.action_source || 'system',
      adminName: log.admin_id ? (adminMap[log.admin_id] || 'Unknown Admin') : 'System',
      details: log.details,
      oldScore: log.old_score,
      newScore: log.new_score,
      oldTier: log.old_tier,
      newTier: log.new_tier,
      createdAt: log.created_at
    }));

    res.json({
      success: true,
      logs: entries,
      total: count || 0,
      page,
      limit
    });
  })
);

export default router;
