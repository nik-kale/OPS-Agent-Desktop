/**
 * Authentication service
 * Handles user authentication, JWT tokens, and sessions
 */
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/client';
import { config } from '../config';
import { logger } from '../observability/logger';
import { User, Role } from '@prisma/client';

const SALT_ROUNDS = 12;

interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  async register(email: string, password: string, name: string): Promise<User> {
    logger.info('Registering new user', { email });

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'OPERATOR', // Default role
      },
    });

    logger.info('User registered successfully', { userId: user.id, email });

    return user;
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthTokens> {
    logger.info('User login attempt', { email });

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      logger.warn('Login failed - user not found or inactive', { email });
      throw new Error('Invalid credentials');
    }

    // For OAuth users without password
    if (!user.passwordHash) {
      logger.warn('Login failed - OAuth user attempting password login', { email });
      throw new Error('Please login with your OAuth provider');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      logger.warn('Login failed - invalid password', { email });
      throw new Error('Invalid credentials');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    logger.info('User logged in successfully', { userId: user.id, email });

    return tokens;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, config.refreshTokenSecret) as TokenPayload;

      // Check if refresh token is in database and not revoked
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
        throw new Error('Invalid or expired refresh token');
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Revoke old refresh token
      await this.revokeRefreshToken(refreshToken);

      // Generate new tokens
      return await this.generateTokens(user);
    } catch (error) {
      logger.error('Refresh token failed', { error });
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.jwtSecret) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    await this.revokeRefreshToken(refreshToken);
    logger.info('User logged out');
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new Error('User not found');
    }

    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid old password');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    logger.info('Password changed successfully', { userId });
  }

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    // Generate access token
    const accessToken = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiration,
    });

    // Generate refresh token
    const refreshToken = jwt.sign(payload, config.refreshTokenSecret, {
      expiresIn: config.refreshTokenExpiration,
    });

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Revoke refresh token
   */
  private async revokeRefreshToken(token: string): Promise<void> {
    try {
      await prisma.refreshToken.update({
        where: { token },
        data: { revokedAt: new Date() },
      });
    } catch (error) {
      // Token not found or already revoked
      logger.warn('Failed to revoke refresh token', { error });
    }
  }

  /**
   * Create OAuth user
   */
  async createOAuthUser(
    email: string,
    name: string,
    oauthProvider: string,
    oauthId: string
  ): Promise<User> {
    logger.info('Creating OAuth user', { email, oauthProvider });

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Update OAuth info
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          oauthProvider,
          oauthId,
          lastLoginAt: new Date(),
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          name,
          oauthProvider,
          oauthId,
          role: 'OPERATOR',
          lastLoginAt: new Date(),
        },
      });
    }

    return user;
  }

  /**
   * Generate tokens for OAuth user
   */
  async loginOAuth(user: User): Promise<AuthTokens> {
    return await this.generateTokens(user);
  }
}

// Singleton instance
export const authService = new AuthService();
