import { Router, Request, Response } from 'express';
import { missionService } from '../missions/missionService';
import { browserAgent } from '../browser/browserAgent';
import { CreateMissionRequest, CreateMissionResponse } from '../types/mission';

const router = Router();

/**
 * @openapi
 * /api/missions:
 *   post:
 *     summary: Create a new mission
 *     description: Creates a new autonomous ops mission and begins execution in the background
 *     tags: [Missions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateMissionRequest'
 *     responses:
 *       200:
 *         description: Mission created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateMissionResponse'
 *       400:
 *         description: Invalid request (missing or invalid prompt)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/missions', async (req: Request, res: Response) => {
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
 * @openapi
 * /api/missions/{id}/stream:
 *   get:
 *     summary: Get mission state with latest screenshot
 *     description: Returns the current mission state and latest screenshot (polling endpoint)
 *     tags: [Missions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Mission ID
 *     responses:
 *       200:
 *         description: Mission state retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MissionStreamResponse'
 *       404:
 *         description: Mission not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @openapi
 * /api/missions:
 *   get:
 *     summary: List all missions
 *     description: Returns a list of all missions (for debugging and monitoring)
 *     tags: [Missions]
 *     responses:
 *       200:
 *         description: List of missions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 missions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Mission'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 * @openapi
 * /api/missions/{id}:
 *   get:
 *     summary: Get a specific mission
 *     description: Returns detailed information about a specific mission
 *     tags: [Missions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Mission ID
 *     responses:
 *       200:
 *         description: Mission retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mission:
 *                   $ref: '#/components/schemas/Mission'
 *       404:
 *         description: Mission not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
