import { Router, Request, Response } from 'express';
import { missionService } from '../missions/missionService';
import { CreateMissionRequest, CreateMissionResponse } from '../types/mission';
import { addMissionToQueue, getQueueStatus, getJobDetails } from '../queue/missionQueue';

const router = Router();

/**
 * POST /api/missions
 * Create a new mission and begin execution.
 */
router.post('/missions', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body as CreateMissionRequest;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid prompt' });
    }

    const mission = missionService.createMission(prompt);

    // Add mission to queue for concurrent execution
    await addMissionToQueue(mission.id, prompt);

    const response: CreateMissionResponse = {
      missionId: mission.id,
    };

    res.status(201).json(response);
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

/**
 * @openapi
 * /api/queue/status:
 *   get:
 *     summary: Get mission queue status
 *     description: Returns queue metrics and status
 *     tags: [Missions]
 *     responses:
 *       200:
 *         description: Queue status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: object
 *                   properties:
 *                     waiting:
 *                       type: number
 *                     active:
 *                       type: number
 *                     completed:
 *                       type: number
 *                     failed:
 *                       type: number
 *                     delayed:
 *                       type: number
 *                     workers:
 *                       type: number
 *                     concurrency:
 *                       type: number
 */
router.get('/queue/status', async (req: Request, res: Response) => {
  try {
    const status = await getQueueStatus();
    res.json({ status });
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

/**
 * @openapi
 * /api/queue/job/{jobId}:
 *   get:
 *     summary: Get job details and position in queue
 *     description: Returns job status, position, and progress
 *     tags: [Missions]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job/Mission ID
 *     responses:
 *       200:
 *         description: Job details retrieved
 *       404:
 *         description: Job not found
 */
router.get('/queue/job/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await getJobDetails(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ job });
  } catch (error) {
    console.error('Error getting job details:', error);
    res.status(500).json({ error: 'Failed to get job details' });
  }
});

export default router;
