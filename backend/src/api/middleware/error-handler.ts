import { Request, Response, NextFunction } from 'express';
import { logger } from '../../services/logger';
import { ERROR_MESSAGES } from '../../types';

/**
 * Get user-friendly error message
 */
function getUserFriendlyError(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('signature')) return ERROR_MESSAGES.INVALID_SIGNATURE;
  if (message.includes('fairscale') || message.includes('circuit breaker')) {
    return ERROR_MESSAGES.FAIRSCALE_ERROR;
  }
  if (message.includes('timeout')) return ERROR_MESSAGES.FAIRSCALE_TIMEOUT;
  if (message.includes('nonce')) return ERROR_MESSAGES.NONCE_REUSE;
  if (message.includes('telegram')) return ERROR_MESSAGES.TELEGRAM_ERROR;
  if (message.includes('database') || message.includes('supabase')) {
    return ERROR_MESSAGES.DATABASE_ERROR;
  }
  if (message.includes('rate limit')) return ERROR_MESSAGES.RATE_LIMIT;
  if (message.includes('unauthorized')) return ERROR_MESSAGES.UNAUTHORIZED;
  if (message.includes('not found')) return ERROR_MESSAGES.NOT_FOUND;

  return 'An unexpected error occurred. Please try again or contact support.';
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error with context
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query
  });

  // Determine status code
  let statusCode = 500;
  if (err.message.includes('not found')) {
    statusCode = 404;
  } else if (
    err.message.includes('unauthorized') ||
    err.message.includes('invalid token')
  ) {
    statusCode = 401;
  } else if (
    err.message.includes('validation') ||
    err.message.includes('invalid')
  ) {
    statusCode = 400;
  }

  // Send user-friendly error response
  res.status(statusCode).json({
    success: false,
    error: getUserFriendlyError(err)
  });
}

/**
 * 404 handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn('Route not found', { method: req.method, path: req.path });
  res.status(404).json({
    success: false,
    error: ERROR_MESSAGES.NOT_FOUND
  });
}

/**
 * Async handler wrapper to catch promise rejections
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
