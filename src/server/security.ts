import type { User } from '@prisma/client';

export type SafeUser = Omit<User, 'password'>;

const WEAK_JWT_SECRETS = new Set([
  'larptubex_secret_jwt_key_2026',
  'secret',
  'changeme',
]);

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set and at least 32 characters in production');
    }
    console.warn('[security] JWT_SECRET is missing or too short — use a strong secret in .env');
    return secret || 'dev-only-insecure-jwt-secret-change-me-now';
  }
  if (WEAK_JWT_SECRETS.has(secret)) {
    console.warn('[security] JWT_SECRET is a known weak default — change it in .env');
  }
  return secret;
}

export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || 'admin@larptube.ru').trim().toLowerCase();
}

export function isReservedAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === getAdminEmail();
}

export function sanitizeUser(user: User | SafeUser): SafeUser {
  const { password: _password, ...safe } = user as User;
  return safe;
}

export function validateUserPassword(password: string): string | null {
  if (password.length < 8) {
    return 'Пароль должен содержать минимум 8 символов';
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Пароль должен содержать буквы и цифры';
  }
  return null;
}

type RateBucket = { count: number; resetAt: number };

export function createRateLimiter(maxAttempts: number, windowMs: number) {
  const buckets = new Map<string, RateBucket>();

  return (key: string): { allowed: boolean; retryAfterSec: number } => {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterSec: 0 };
    }

    if (bucket.count >= maxAttempts) {
      return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
    }

    bucket.count += 1;
    return { allowed: true, retryAfterSec: 0 };
  };
}
