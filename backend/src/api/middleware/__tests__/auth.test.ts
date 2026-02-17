import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateToken, verifyToken, authenticateAdmin } from '../auth';
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../../../types';

describe('generateToken', () => {
  it('generates a valid JWT string', () => {
    const token = generateToken('admin-123', 'admin@test.com');
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });
});

describe('verifyToken', () => {
  it('returns payload for valid token', () => {
    const token = generateToken('admin-123', 'admin@test.com');
    const payload = verifyToken(token);

    expect(payload).not.toBeNull();
    expect(payload!.adminId).toBe('admin-123');
    expect(payload!.email).toBe('admin@test.com');
    expect(payload!.type).toBe('admin');
  });

  it('returns null for invalid token', () => {
    const payload = verifyToken('invalid.token.string');
    expect(payload).toBeNull();
  });

  it('returns null for empty string', () => {
    const payload = verifyToken('');
    expect(payload).toBeNull();
  });
});

describe('authenticateAdmin', () => {
  let req: Partial<AuthRequest>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    req = { headers: {} };
    res = { status: statusMock } as any;
    next = vi.fn();
  });

  it('passes with valid Bearer token', () => {
    const token = generateToken('admin-123', 'admin@test.com');
    req.headers = { authorization: `Bearer ${token}` };

    authenticateAdmin(req as AuthRequest, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.adminId).toBe('admin-123');
  });

  it('rejects missing authorization header', () => {
    req.headers = {};

    authenticateAdmin(req as AuthRequest, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects non-Bearer authorization', () => {
    req.headers = { authorization: 'Basic abc123' };

    authenticateAdmin(req as AuthRequest, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid token', () => {
    req.headers = { authorization: 'Bearer invalid.token.here' };

    authenticateAdmin(req as AuthRequest, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
