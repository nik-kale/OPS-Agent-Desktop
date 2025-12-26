/**
 * AuthService Tests
 * Tests for password hashing, JWT generation, and authentication flows
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from './authService';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// Mock dependencies
vi.mock('../db/client', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../observability/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { prisma } from '../db/client';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Password Hashing', () => {
    it('should hash passwords securely with bcrypt', async () => {
      const password = 'MySecurePassword123!';
      const hashedPassword = await bcrypt.hash(password, 12);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
      expect(hashedPassword).toMatch(/^\$2[aby]\$/); // bcrypt format
    });

    it('should verify correct password', async () => {
      const password = 'MySecurePassword123!';
      const hashedPassword = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'MySecurePassword123!';
      const hashedPassword = await bcrypt.hash(password, 12);

      const isValid = await bcrypt.compare('WrongPassword', hashedPassword);
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'MySecurePassword123!';
      const hash1 = await bcrypt.hash(password, 12);
      const hash2 = await bcrypt.hash(password, 12);

      expect(hash1).not.toBe(hash2);

      // Both should still verify correctly
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate valid access token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'OPERATOR' as const,
      };

      const token = jwt.sign(payload, config.jwtSecret, {
        expiresIn: config.jwtExpiration,
      });

      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

      const decoded = jwt.verify(token, config.jwtSecret) as any;
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should reject token with invalid signature', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'OPERATOR' as const,
      };

      const token = jwt.sign(payload, 'wrong-secret');

      expect(() => {
        jwt.verify(token, config.jwtSecret);
      }).toThrow();
    });

    it('should reject expired token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'OPERATOR' as const,
      };

      const token = jwt.sign(payload, config.jwtSecret, {
        expiresIn: '-1s', // Expired 1 second ago
      });

      expect(() => {
        jwt.verify(token, config.jwtSecret);
      }).toThrow(/expired/);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'OPERATOR' as const,
      };

      const token = jwt.sign(payload, config.jwtSecret, {
        expiresIn: '1h',
      });

      const result = authService.verifyAccessToken(token);

      expect(result.userId).toBe(payload.userId);
      expect(result.email).toBe(payload.email);
      expect(result.role).toBe(payload.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        authService.verifyAccessToken('invalid-token');
      }).toThrow(/Invalid or expired access token/);
    });

    it('should throw error for expired token', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'OPERATOR' as const,
      };

      const token = jwt.sign(payload, config.jwtSecret, {
        expiresIn: '-1s',
      });

      expect(() => {
        authService.verifyAccessToken(token);
      }).toThrow(/Invalid or expired access token/);
    });
  });

  describe('register', () => {
    it('should create new user with hashed password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        passwordHash: 'hashed-password',
        name: 'New User',
        role: 'OPERATOR',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        oauthProvider: null,
        oauthId: null,
      };

      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue(mockUser);

      const result = await authService.register(
        'newuser@example.com',
        'SecurePass123!',
        'New User'
      );

      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' },
      });
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      const existingUser = {
        id: 'user-123',
        email: 'existing@example.com',
        role: 'OPERATOR',
      };

      (prisma.user.findUnique as any).mockResolvedValue(existingUser);

      await expect(
        authService.register('existing@example.com', 'password', 'User')
      ).rejects.toThrow('User with this email already exists');
    });
  });

  describe('login', () => {
    it('should authenticate valid credentials', async () => {
      const password = 'SecurePass123!';
      const hashedPassword = await bcrypt.hash(password, 12);

      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        passwordHash: hashedPassword,
        name: 'Test User',
        role: 'OPERATOR',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        oauthProvider: null,
        oauthId: null,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.user.update as any).mockResolvedValue(mockUser);
      (prisma.refreshToken.create as any).mockResolvedValue({});

      const tokens = await authService.login('user@example.com', password);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const password = 'SecurePass123!';
      const hashedPassword = await bcrypt.hash(password, 12);

      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        passwordHash: hashedPassword,
        isActive: true,
        oauthProvider: null,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      await expect(
        authService.login('user@example.com', 'WrongPassword')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(
        authService.login('nonexistent@example.com', 'password')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject inactive user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'inactive@example.com',
        passwordHash: 'hash',
        isActive: false,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      await expect(
        authService.login('inactive@example.com', 'password')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject OAuth user attempting password login', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'oauth@example.com',
        passwordHash: null, // OAuth user has no password
        isActive: true,
        oauthProvider: 'google',
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      await expect(
        authService.login('oauth@example.com', 'password')
      ).rejects.toThrow('Please login with your OAuth provider');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const oldPassword = 'OldPass123!';
      const newPassword = 'NewPass456!';
      const oldHash = await bcrypt.hash(oldPassword, 12);

      const mockUser = {
        id: 'user-123',
        passwordHash: oldHash,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.user.update as any).mockResolvedValue({});

      await expect(
        authService.changePassword('user-123', oldPassword, newPassword)
      ).resolves.not.toThrow();

      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should reject incorrect old password', async () => {
      const oldPassword = 'OldPass123!';
      const oldHash = await bcrypt.hash(oldPassword, 12);

      const mockUser = {
        id: 'user-123',
        passwordHash: oldHash,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);

      await expect(
        authService.changePassword('user-123', 'WrongOldPass', 'NewPass456!')
      ).rejects.toThrow('Invalid old password');
    });

    it('should reject if user not found', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(
        authService.changePassword('nonexistent', 'old', 'new')
      ).rejects.toThrow('User not found');
    });
  });
});

