import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, TokenPayload, ERROR_MESSAGES } from '../../types';
import { logger } from '../../services/logger';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

const JWT_SECRET: string = getJwtSecret();

/**
 * JWT authentication middleware for admin routes
 */
export function authenticateAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn('Missing authorization header');
    res.status(401).json({ error: ERROR_MESSAGES.UNAUTHORIZED });
    return;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    if (decoded.type !== 'admin') {
      logger.warn('Invalid token type', { type: decoded.type });
      res.status(403).json({ error: 'Invalid token type' });
      return;
    }

    req.adminId = decoded.adminId;
    logger.info('Admin authenticated', { adminId: decoded.adminId });
    next();
  } catch (error) {
    logger.warn('Invalid or expired token', { error });
    res.status(401).json({ error: ERROR_MESSAGES.INVALID_TOKEN });
  }
}

/**
 * Generate JWT token for admin
 */
export function generateToken(adminId: string, email: string): string {
  return jwt.sign(
    { adminId, email, type: 'admin' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify JWT token (without middleware)
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
