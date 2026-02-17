import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { logger } from '../../services/logger';
import { ERROR_MESSAGES } from '../../types';

/**
 * Zod validation middleware factory
 */
export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Validation error', { errors: error.errors });
        res.status(400).json({
          error: ERROR_MESSAGES.INVALID_INPUT,
          details: error.errors
        });
      } else {
        res.status(400).json({ error: ERROR_MESSAGES.INVALID_INPUT });
      }
    }
  };
}

/**
 * Validate query parameters
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Query validation error', { errors: error.errors });
        res.status(400).json({
          error: ERROR_MESSAGES.INVALID_INPUT,
          details: error.errors
        });
      } else {
        res.status(400).json({ error: ERROR_MESSAGES.INVALID_INPUT });
      }
    }
  };
}

// Common validation schemas
export const VerifyRequestSchema = z.object({
  telegramId: z.string().regex(/^\d+$/, 'Invalid Telegram ID'),
  publicKey: z.string().min(32).max(44, 'Invalid public key'),
  signature: z.array(z.number().min(0).max(255)).length(64, 'Invalid signature length'),
  message: z.string().min(50).max(1000, 'Invalid message length'),
  groupId: z.string().uuid('Invalid group ID').optional()
});

export const SettingsUpdateSchema = z.object({
  groupId: z.string().uuid('Invalid group ID'),
  bronzeThreshold: z.number().min(0).max(1000).optional(),
  silverThreshold: z.number().min(0).max(1000).optional(),
  goldThreshold: z.number().min(0).max(1000).optional(),
  autoKickEnabled: z.boolean().optional()
}).refine(
  (data) => {
    // Ensure thresholds are in ascending order
    if (
      data.bronzeThreshold !== undefined &&
      data.silverThreshold !== undefined &&
      data.bronzeThreshold >= data.silverThreshold
    ) {
      return false;
    }
    if (
      data.silverThreshold !== undefined &&
      data.goldThreshold !== undefined &&
      data.silverThreshold >= data.goldThreshold
    ) {
      return false;
    }
    return true;
  },
  { message: 'Thresholds must be in ascending order (bronze < silver < gold)' }
);

export const KickMemberSchema = z.object({
  groupId: z.string().uuid('Invalid group ID'),
  memberId: z.string().uuid('Invalid member ID'),
  reason: z.string().optional()
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const MembersQuerySchema = z.object({
  groupId: z.string().uuid('Invalid group ID'),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  search: z.string().optional(),
  tier: z.enum(['bronze', 'silver', 'gold']).optional(),
  sortBy: z.enum(['fairscore', 'joined_at', 'last_checked']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

export const AnalyticsQuerySchema = z.object({
  groupId: z.string().uuid('Invalid group ID'),
  period: z.enum(['7d', '30d', '90d']).optional()
});

export const RegisterSchema = z.object({
  token: z.string().length(64, 'Invalid registration token'),
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});
