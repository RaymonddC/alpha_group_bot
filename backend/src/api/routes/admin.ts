import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../../db/client';
import { logger } from '../../services/logger';
import { authenticateAdmin, generateToken } from '../middleware/auth';
import {
  validateRequest,
  validateQuery,
  SettingsUpdateSchema,
  KickMemberSchema,
  LoginSchema,
  MembersQuerySchema,
  AnalyticsQuerySchema
} from '../middleware/validation';
import { asyncHandler } from '../middleware/error-handler';
import {
  AuthRequest,
  MembersResponse,
  AnalyticsResponse,
  ERROR_MESSAGES
} from '../../types';

const router = Router();

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

    const token = generateToken(admin.id, admin.email);

    logger.info('Admin logged in successfully', { adminId: admin.id });

    res.json({
      success: true,
      token
    });
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
      details: reason
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

export default router;
