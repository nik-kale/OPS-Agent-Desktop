import { Router, Request, Response } from 'express';
import { missionRepository } from '../repositories/missionRepository';
import { browserAgent } from '../browser/browserAgent';
import { CreateMissionRequest, CreateMissionResponse } from '../types/mission';
import { missionRateLimiter, authRateLimiter } from '../middleware/securityMiddleware';
import { requireAuth, requireRole, isAdmin, isOwner } from '../middleware/authMiddleware';
import { logger } from '../observability/logger';
import { Role } from '@prisma/client';

const router = Router();

/**
 * POST /api/missions
 * Create a new mission and begin execution.
 * Requires authentication. OPERATOR and ADMIN roles can create missions.
 */
router.post(
  '/missions',
  requireAuth,
  requireRole('OPERATOR' as Role, 'ADMIN' as Role),
  missionRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { prompt, dashboardUrl, dashboardType, priority } = req.body as CreateMissionRequest;
      const userId = req.user!.userId;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Invalid prompt' });
      }

      logger.info('Creating mission', { userId, prompt: prompt.substring(0, 50) });

      // Create mission with user ownership
      const mission = await missionRepository.create({
        prompt,
        userId,
        dashboardUrl,
        dashboardType,
        priority,
      });

      // Execute mission asynchronously (don't await - let it run in background)
      browserAgent.executeMission(mission.id, prompt).catch((error) => {
        logger.error('Mission execution failed', {
          missionId: mission.id,
          userId,
          error: error.message,
        });
      });

      const response: CreateMissionResponse = {
        missionId: mission.id,
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Error creating mission', { error, userId: req.user?.userId });
      res.status(500).json({ error: 'Failed to create mission' });
    }
  }
);

/**
 * GET /api/missions/:id/stream
 * Get current state of a mission (polling endpoint).
 * Requires authentication. Users can only access their own missions.
 * TODO: Implement WebSocket for real-time streaming.
 */
router.get('/missions/:id/stream', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const mission = await missionRepository.findById(id);

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    // Check ownership - users can only access their own missions unless admin
    if (!isAdmin(req) && !isOwner(req, mission.userId)) {
      logger.warn('Unauthorized mission access attempt', {
        userId,
        missionId: id,
        missionOwnerId: mission.userId,
      });
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get latest screenshot if available
    const latestScreenshot = mission.steps
      .slice()
      .reverse()
      .find((step) => step.screenshotPath)?.screenshotPath;

    res.json({
      mission,
      latestScreenshot: latestScreenshot ? `/screenshots/${latestScreenshot}` : undefined,
    });
  } catch (error) {
    logger.error('Error streaming mission', { error, missionId: req.params.id });
    res.status(500).json({ error: 'Failed to stream mission' });
  }
});

/**
 * GET /api/missions
 * List missions scoped to the authenticated user.
 * Admins can see all missions with optional userId filter.
 */
router.get('/missions', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { page = 1, limit = 20, status, sortBy, sortOrder } = req.query;

    // Admins can optionally filter by userId, regular users only see their own
    const filterUserId = isAdmin(req) && req.query.userId
      ? String(req.query.userId)
      : userId;

    logger.debug('Listing missions', { userId, filterUserId, page, limit });

    const result = await missionRepository.list({
      page: Number(page),
      limit: Number(limit),
      status: status as any,
      userId: filterUserId,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
    });

    res.json(result);
  } catch (error) {
    logger.error('Error listing missions', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to list missions' });
  }
});

/**
 * GET /api/missions/:id
 * Get a specific mission.
 * Requires authentication. Users can only access their own missions.
 */
router.get('/missions/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const mission = await missionRepository.findById(id);

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    // Check ownership - users can only access their own missions unless admin
    if (!isAdmin(req) && !isOwner(req, mission.userId)) {
      logger.warn('Unauthorized mission access attempt', {
        userId,
        missionId: id,
        missionOwnerId: mission.userId,
      });
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ mission });
  } catch (error) {
    logger.error('Error getting mission', { error, missionId: req.params.id });
    res.status(500).json({ error: 'Failed to get mission' });
  }
});

/**
 * GET /api/missions/stats
 * Get mission statistics for the authenticated user.
 */
router.get('/missions/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Admins can optionally get stats for a specific user
    const targetUserId = isAdmin(req) && req.query.userId
      ? String(req.query.userId)
      : userId;

    const stats = await missionRepository.getStats(targetUserId);

    res.json({ stats });
  } catch (error) {
    logger.error('Error getting mission stats', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to get mission statistics' });
  }
});

/**
 * DELETE /api/missions/:id
 * Delete a mission.
 * Requires authentication and ownership (or admin role).
 */
router.delete('/missions/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const mission = await missionRepository.findOne(id);

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    // Check ownership - users can only delete their own missions unless admin
    if (!isAdmin(req) && !isOwner(req, mission.userId)) {
      logger.warn('Unauthorized mission deletion attempt', {
        userId,
        missionId: id,
        missionOwnerId: mission.userId,
      });
      return res.status(403).json({ error: 'Access denied' });
    }

    await missionRepository.delete(id);

    logger.info('Mission deleted', { missionId: id, userId });

    res.json({ message: 'Mission deleted successfully' });
  } catch (error) {
    logger.error('Error deleting mission', { error, missionId: req.params.id });
    res.status(500).json({ error: 'Failed to delete mission' });
  }
});

/**
 * Authentication routes
 * These should be moved to a separate auth routes file in production
 */

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post('/auth/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    // Implementation would go here - stubbed for now
    res.status(501).json({ error: 'Registration endpoint not implemented yet' });
  } catch (error) {
    logger.error('Registration error', { error });
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate and receive JWT tokens
 */
router.post('/auth/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    // Implementation would go here - stubbed for now
    res.status(501).json({ error: 'Login endpoint not implemented yet' });
  } catch (error) {
    logger.error('Login error', { error });
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/auth/refresh', async (req: Request, res: Response) => {
  try {
    // Implementation would go here - stubbed for now
    res.status(501).json({ error: 'Token refresh endpoint not implemented yet' });
  } catch (error) {
    logger.error('Token refresh error', { error });
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

export default router;
