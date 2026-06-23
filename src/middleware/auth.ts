import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.ts';
import { getJwtSecret, sanitizeUser, type SafeUser } from '../server/security.ts';

export interface AuthRequest extends Request {
  user?: SafeUser;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: number; email: string };
    if (decoded?.userId) {
      const foundUser = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });
      if (foundUser) {
        req.user = sanitizeUser(foundUser);
        return next();
      }
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  } catch (error) {
    console.error('Unified Auth Middleware Error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

/** Sets req.user when a valid token is present; does not reject unauthenticated requests. */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: number };
    const foundUser = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (foundUser) req.user = sanitizeUser(foundUser);
  } catch {
    // ignore invalid token for optional auth
  }
  next();
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора.' });
  }
  return next();
};
