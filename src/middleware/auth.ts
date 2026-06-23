import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'larptubex_secret_jwt_key_2026';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    uid: string | null;
    email: string;
    displayName: string;
    avatar: string | null;
    bio: string | null;
    isAdmin: boolean;
  };
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
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; email: string };
    if (decoded && decoded.userId) {
      const foundUser = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });
      if (foundUser) {
        // Double check roomop86@gmail.com is set as Admin
        if (foundUser.email.toLowerCase() === 'roomop86@gmail.com' && !foundUser.isAdmin) {
          const updatedUser = await prisma.user.update({
            where: { id: foundUser.id },
            data: { isAdmin: true }
          });
          req.user = updatedUser;
        } else {
          req.user = foundUser;
        }
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
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const foundUser = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (foundUser) req.user = foundUser;
  } catch {
    // ignore invalid token for optional auth
  }
  next();
};
