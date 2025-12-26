/**
 * Auth Middleware Tests
 * Tests for authentication and authorization middleware
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole, isAdmin, isOwner } from './authMiddleware';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Role } from '@prisma/client';

// Mock dependencies
vi.mock('../auth/authService', () => ({
  authService: {
    verifyAccessToken: vi.fn(),
  },
}));

vi.mock('../observability/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { authService } from '../auth/authService';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: undefined,
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    nextFn = vi.fn();
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should reject request without Authorization header', () => {
      mockReq.headers = {};

      requireAuth(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing or invalid authorization header',
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should reject Authorization header without Bearer prefix', () => {
      mockReq.headers = { authorization: 'InvalidToken' };

      requireAuth(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing or invalid authorization header',
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should accept valid Bearer token', () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'OPERATOR' as Role,
      };

      mockReq.headers = { authorization: 'Bearer valid-token' };
      (authService.verifyAccessToken as any).mockReturnValue(mockPayload);

      requireAuth(mockReq as Request, mockRes as Response, nextFn);

      expect(authService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(mockReq.user).toEqual(mockPayload);
      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject invalid token', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      (authService.verifyAccessToken as any).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      requireAuth(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should reject expired token', () => {
      mockReq.headers = { authorization: 'Bearer expired-token' };
      (authService.verifyAccessToken as any).mockImplementation(() => {
        throw new Error('Token expired');
      });

      requireAuth(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
      });
    });

    it('should handle token with correct format', () => {
      const payload = {
        userId: 'user-456',
        email: 'admin@example.com',
        role: 'ADMIN' as Role,
      };

      const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });
      mockReq.headers = { authorization: `Bearer ${token}` };

      (authService.verifyAccessToken as any).mockReturnValue(payload);

      requireAuth(mockReq as Request, mockRes as Response, nextFn);

      expect(mockReq.user?.userId).toBe('user-456');
      expect(mockReq.user?.role).toBe('ADMIN');
      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should reject request without authenticated user', () => {
      mockReq.user = undefined;

      const middleware = requireRole('ADMIN' as Role);
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should allow user with correct role', () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'admin@example.com',
        role: 'ADMIN' as Role,
      };

      const middleware = requireRole('ADMIN' as Role);
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject user with incorrect role', () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'VIEWER' as Role,
      };

      const middleware = requireRole('ADMIN' as Role);
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
      });
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should allow user with one of multiple allowed roles', () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'operator@example.com',
        role: 'OPERATOR' as Role,
      };

      const middleware = requireRole('OPERATOR' as Role, 'ADMIN' as Role);
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject user not in multiple allowed roles', () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'viewer@example.com',
        role: 'VIEWER' as Role,
      };

      const middleware = requireRole('OPERATOR' as Role, 'ADMIN' as Role);
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
      });
    });
  });

  describe('isAdmin', () => {
    it('should return true for ADMIN role', () => {
      mockReq.user = {
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN' as Role,
      };

      const result = isAdmin(mockReq as Request);

      expect(result).toBe(true);
    });

    it('should return false for non-ADMIN roles', () => {
      const roles: Role[] = ['OPERATOR', 'VIEWER'];

      roles.forEach((role) => {
        mockReq.user = {
          userId: 'user-123',
          email: 'user@example.com',
          role,
        };

        const result = isAdmin(mockReq as Request);
        expect(result).toBe(false);
      });
    });

    it('should return false when user is undefined', () => {
      mockReq.user = undefined;

      const result = isAdmin(mockReq as Request);

      expect(result).toBe(false);
    });
  });

  describe('isOwner', () => {
    it('should return true when userId matches resource userId', () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'OPERATOR' as Role,
      };

      const result = isOwner(mockReq as Request, 'user-123');

      expect(result).toBe(true);
    });

    it('should return false when userId does not match', () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'OPERATOR' as Role,
      };

      const result = isOwner(mockReq as Request, 'user-456');

      expect(result).toBe(false);
    });

    it('should return false when user is undefined', () => {
      mockReq.user = undefined;

      const result = isOwner(mockReq as Request, 'user-123');

      expect(result).toBe(false);
    });
  });

  describe('Authorization Scenarios', () => {
    it('should properly chain requireAuth and requireRole', () => {
      const mockPayload = {
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN' as Role,
      };

      mockReq.headers = { authorization: 'Bearer valid-token' };
      (authService.verifyAccessToken as any).mockReturnValue(mockPayload);

      // First requireAuth
      requireAuth(mockReq as Request, mockRes as Response, nextFn);
      expect(mockReq.user).toEqual(mockPayload);

      // Then requireRole
      const roleMiddleware = requireRole('ADMIN' as Role);
      roleMiddleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalledTimes(2);
    });

    it('should prevent role check without authentication', () => {
      // Skip requireAuth
      mockReq.user = undefined;

      const roleMiddleware = requireRole('ADMIN' as Role);
      roleMiddleware(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(nextFn).not.toHaveBeenCalled();
    });

    it('should handle case-sensitive role comparison', () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'ADMIN' as Role,
      };

      // Role must match exactly
      const middleware = requireRole('ADMIN' as Role);
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle malformed Bearer token', () => {
      mockReq.headers = { authorization: 'Bearer' }; // No token after Bearer

      requireAuth(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should handle multiple spaces in Authorization header', () => {
      mockReq.headers = { authorization: 'Bearer  token-with-spaces' };

      (authService.verifyAccessToken as any).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      requireAuth(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should not leak user information in error messages', () => {
      mockReq.user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'VIEWER' as Role,
      };

      const middleware = requireRole('ADMIN' as Role);
      middleware(mockReq as Request, mockRes as Response, nextFn);

      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
      });

      // Should not include role information in response
      const jsonCall = (mockRes.json as any).mock.calls[0][0];
      expect(JSON.stringify(jsonCall)).not.toContain('VIEWER');
      expect(JSON.stringify(jsonCall)).not.toContain('user@example.com');
    });
  });
});

