/**
 * Authentication middleware
 * Protects routes and enforces RBAC
 */
import { Request, Response, NextFunction } from 'express';
import { authService } from '../auth/authService';
import { logger } from '../observability/logger';
import { Role } from '@prisma/client';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: Role;
      };
      correlationId?: string;
      logger?: any;
    }
  }
}

/**
 * Require authentication
 * Verifies JWT token and adds user to request
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = authService.verifyAccessToken(token);

    // Add user to request
    req.user = payload;

    logger.debug('User authenticated', { userId: payload.userId, role: payload.role });

    next();
  } catch (error) {
    logger.warn('Authentication failed', { error });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Require specific role(s)
 * Must be used after requireAuth
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed', {
        userId: req.user.userId,
        role: req.user.role,
        requiredRoles: allowedRoles,
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

/**
 * Optional authentication
 * Adds user to request if token is present, but doesn't require it
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = authService.verifyAccessToken(token);
      req.user = payload;
    }
  } catch (error) {
    // Ignore invalid tokens in optional auth
  }

  next();
};

/**
 * Check if user is admin
 */
export const isAdmin = (req: Request): boolean => {
  return req.user?.role === 'ADMIN';
};

/**
 * Check if user owns a resource
 */
export const isOwner = (req: Request, resourceUserId: string): boolean => {
  return req.user?.userId === resourceUserId;
};

/**
 * Require ownership or admin role
 */
export const requireOwnershipOrAdmin = (getUserId: (req: Request) => Promise<string>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const resourceUserId = await getUserId(req);

      if (isAdmin(req) || isOwner(req, resourceUserId)) {
        next();
      } else {
        logger.warn('Authorization failed - not owner or admin', {
          userId: req.user.userId,
          resourceUserId,
        });
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
    } catch (error) {
      logger.error('Authorization check failed', { error });
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};
