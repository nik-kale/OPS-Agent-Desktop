/**
 * API Routes Integration Tests
 * Tests for API endpoint behavior and authorization
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import routes from './routes';
import jwt from 'jsonwebtoken';
import { config } from '../config';

// Mock dependencies
vi.mock('../repositories/missionRepository', () => ({
  missionRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
  },
}));

vi.mock('../browser/browserAgent', () => ({
  browserAgent: {
    executeMission: vi.fn().mockResolvedValue(undefined),
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

vi.mock('../middleware/securityMiddleware', () => ({
  missionRateLimiter: (req: any, res: any, next: any) => next(),
  authRateLimiter: (req: any, res: any, next: any) => next(),
}));

import { missionRepository } from '../repositories/missionRepository';

// Create test Express app
const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api', routes);
  return app;
};

// Helper to generate test JWT token
const generateTestToken = (payload: any) => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '1h' });
};

describe('API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createApp();
    vi.clearAllMocks();
  });

  describe('POST /api/missions', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .post('/api/missions')
        .send({ prompt: 'Check dashboard' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should reject VIEWER role', async () => {
      const token = generateTestToken({
        userId: 'user-123',
        email: 'viewer@example.com',
        role: 'VIEWER',
      });

      const response = await request(app)
        .post('/api/missions')
        .set('Authorization', `Bearer ${token}`)
        .send({ prompt: 'Check dashboard' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('permissions');
    });

    it('should allow OPERATOR role to create mission', async () => {
      const token = generateTestToken({
        userId: 'user-123',
        email: 'operator@example.com',
        role: 'OPERATOR',
      });

      const mockMission = {
        id: 'mission-123',
        userId: 'user-123',
        prompt: 'Check dashboard',
        status: 'PENDING',
        createdAt: new Date(),
      };

      (missionRepository.create as any).mockResolvedValue(mockMission);

      const response = await request(app)
        .post('/api/missions')
        .set('Authorization', `Bearer ${token}`)
        .send({ prompt: 'Check dashboard' });

      expect(response.status).toBe(201);
      expect(response.body.missionId).toBe('mission-123');
      expect(missionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Check dashboard',
          userId: 'user-123',
        })
      );
    });

    it('should allow ADMIN role to create mission', async () => {
      const token = generateTestToken({
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN',
      });

      const mockMission = {
        id: 'mission-456',
        userId: 'admin-123',
        prompt: 'Admin mission',
        status: 'PENDING',
        createdAt: new Date(),
      };

      (missionRepository.create as any).mockResolvedValue(mockMission);

      const response = await request(app)
        .post('/api/missions')
        .set('Authorization', `Bearer ${token}`)
        .send({ prompt: 'Admin mission' });

      expect(response.status).toBe(201);
      expect(response.body.missionId).toBeDefined();
    });

    it('should reject empty prompt', async () => {
      const token = generateTestToken({
        userId: 'user-123',
        email: 'operator@example.com',
        role: 'OPERATOR',
      });

      const response = await request(app)
        .post('/api/missions')
        .set('Authorization', `Bearer ${token}`)
        .send({ prompt: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('prompt');
    });

    it('should reject missing prompt', async () => {
      const token = generateTestToken({
        userId: 'user-123',
        email: 'operator@example.com',
        role: 'OPERATOR',
      });

      const response = await request(app)
        .post('/api/missions')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/missions/:id', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app).get('/api/missions/mission-123');

      expect(response.status).toBe(401);
    });

    it('should allow owner to access their mission', async () => {
      const token = generateTestToken({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'OPERATOR',
      });

      const mockMission = {
        id: 'mission-123',
        userId: 'user-123',
        prompt: 'Check dashboard',
        status: 'COMPLETED',
        steps: [],
      };

      (missionRepository.findById as any).mockResolvedValue(mockMission);

      const response = await request(app)
        .get('/api/missions/mission-123')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.mission.id).toBe('mission-123');
    });

    it('should prevent user from accessing another users mission', async () => {
      const token = generateTestToken({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'OPERATOR',
      });

      const mockMission = {
        id: 'mission-456',
        userId: 'user-456', // Different user
        prompt: 'Other users mission',
        status: 'RUNNING',
      };

      (missionRepository.findById as any).mockResolvedValue(mockMission);

      const response = await request(app)
        .get('/api/missions/mission-456')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });

    it('should allow admin to access any mission', async () => {
      const token = generateTestToken({
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN',
      });

      const mockMission = {
        id: 'mission-789',
        userId: 'user-456', // Different user
        prompt: 'Some mission',
        status: 'COMPLETED',
        steps: [],
      };

      (missionRepository.findById as any).mockResolvedValue(mockMission);

      const response = await request(app)
        .get('/api/missions/mission-789')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.mission.id).toBe('mission-789');
    });

    it('should return 404 for non-existent mission', async () => {
      const token = generateTestToken({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'OPERATOR',
      });

      (missionRepository.findById as any).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/missions/nonexistent')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/missions', () => {
    it('should list missions scoped to user', async () => {
      const token = generateTestToken({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'OPERATOR',
      });

      const mockResult = {
        missions: [
          { id: 'mission-1', userId: 'user-123', prompt: 'Mission 1' },
          { id: 'mission-2', userId: 'user-123', prompt: 'Mission 2' },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          totalPages: 1,
        },
      };

      (missionRepository.list as any).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/missions')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.missions).toHaveLength(2);
      expect(missionRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
        })
      );
    });

    it('should support pagination parameters', async () => {
      const token = generateTestToken({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'OPERATOR',
      });

      (missionRepository.list as any).mockResolvedValue({
        missions: [],
        pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
      });

      await request(app)
        .get('/api/missions?page=2&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(missionRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 10,
        })
      );
    });
  });

  describe('DELETE /api/missions/:id', () => {
    it('should allow owner to delete their mission', async () => {
      const token = generateTestToken({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'OPERATOR',
      });

      const mockMission = {
        id: 'mission-123',
        userId: 'user-123',
      };

      (missionRepository.findOne as any).mockResolvedValue(mockMission);
      (missionRepository.delete as any).mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/missions/mission-123')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(missionRepository.delete).toHaveBeenCalledWith('mission-123');
    });

    it('should prevent user from deleting another users mission', async () => {
      const token = generateTestToken({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'OPERATOR',
      });

      const mockMission = {
        id: 'mission-456',
        userId: 'user-456', // Different user
      };

      (missionRepository.findOne as any).mockResolvedValue(mockMission);

      const response = await request(app)
        .delete('/api/missions/mission-456')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(missionRepository.delete).not.toHaveBeenCalled();
    });

    it('should allow admin to delete any mission', async () => {
      const token = generateTestToken({
        userId: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN',
      });

      const mockMission = {
        id: 'mission-789',
        userId: 'user-456',
      };

      (missionRepository.findOne as any).mockResolvedValue(mockMission);
      (missionRepository.delete as any).mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/missions/mission-789')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(missionRepository.delete).toHaveBeenCalledWith('mission-789');
    });
  });

  describe('Authorization Headers', () => {
    it('should reject malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/missions')
        .set('Authorization', 'InvalidFormat token');

      expect(response.status).toBe(401);
    });

    it('should reject missing Bearer prefix', async () => {
      const response = await request(app)
        .get('/api/missions')
        .set('Authorization', 'some-token');

      expect(response.status).toBe(401);
    });

    it('should reject invalid JWT token', async () => {
      const response = await request(app)
        .get('/api/missions')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(response.status).toBe(401);
    });
  });
});

