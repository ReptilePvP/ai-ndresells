import bcrypt from 'bcryptjs';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

const pgStore = connectPg(session);

// Session configuration
export const sessionMiddleware = session({
  store: new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    tableName: 'sessions',
  }),
  secret: process.env.SESSION_SECRET || 'default-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Allow HTTP for development and mobile compatibility
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax', // Better mobile compatibility
  },
});

// Extend Express Request type
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userRole?: string;
  }
}

// Authentication middleware
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const user = await storage.getUserById(req.session.userId);
  if (!user || !user.isActive) {
    req.session.destroy(() => {});
    return res.status(401).json({ message: 'Invalid session' });
  }

  (req as any).user = user;
  next();
};

// Admin role middleware
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  await requireAuth(req, res, () => {
    const user = (req as any).user;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  });
};

// Optional authentication (for routes that work with or without auth)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (req.session.userId) {
    const user = await storage.getUserById(req.session.userId);
    if (user && user.isActive) {
      (req as any).user = user;
    }
  }
  next();
};

// Password hashing utilities
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};