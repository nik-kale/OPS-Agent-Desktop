import { Router, Request, Response } from 'express';
import { missionService } from '../missions/missionService';
import { browserAgent } from '../browser/browserAgent';
import { CreateMissionRequest, CreateMissionResponse } from '../types/mission';
import { missionRateLimiter } from '../middleware/securityMiddleware';

const router = Router();

/**
 * POST /api/missions
 * Create a new mission and begin execution.
 */
router.post('/missions', missionRateLimiter, async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body as CreateMissionRequest;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid prompt' });
    }

    const mission = missionService.createMission(prompt);

    // Execute mission asynchronously (don't await - let it run in background)
    browserAgent.executeMission(mission.id, prompt).catch((error) => {
      console.error(`Mission ${mission.id} execution failed:`, error);
    });

    const response: CreateMissionResponse = {
      missionId: mission.id,
    };

    res.json(response);
  } catch (error) {
    console.error('Error creating mission:', error);
    res.status(500).json({ error: 'Failed to create mission' });
  }
});

/**
 * GET /api/missions/:id/stream
 * Get current state of a mission (polling endpoint).
 * For MVP, this returns the full mission state.
 * TODO: Implement WebSocket for real-time streaming.
 */
router.get('/missions/:id/stream', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mission = missionService.getMission(id);

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    // Get latest screenshot if available
    const latestScreenshot = mission.steps
      .slice()
      .reverse()
      .find((step) => step.screenshotPath)?.screenshotPath;

    res.json({
      mission,
      latestScreenshot: latestScreenshot
        ? `/screenshots/${latestScreenshot}`
        : undefined,
    });
  } catch (error) {
    console.error('Error streaming mission:', error);
    res.status(500).json({ error: 'Failed to stream mission' });
  }
});

/**
 * GET /api/missions
 * List all missions (for debugging).
 */
router.get('/missions', (req: Request, res: Response) => {
  try {
    const missions = missionService.getAllMissions();
    res.json({ missions });
  } catch (error) {
    console.error('Error listing missions:', error);
    res.status(500).json({ error: 'Failed to list missions' });
  }
});

/**
 * GET /api/missions/:id
 * Get a specific mission.
 */
router.get('/missions/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mission = missionService.getMission(id);

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    res.json({ mission });
  } catch (error) {
    console.error('Error getting mission:', error);
    res.status(500).json({ error: 'Failed to get mission' });
  }
});

export default router;
