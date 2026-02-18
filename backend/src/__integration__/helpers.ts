import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-vitest';

export function generateTestToken(adminId: string, email = 'test@test.com'): string {
  return jwt.sign(
    { adminId, email, type: 'admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}
