/**
 * API Routes Integration Tests
 * Exercises the mission endpoints mounted by src/index.ts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../browser/browserAgent', () => ({
  browserAgent: {
    executeMission: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../middleware/securityMiddleware', () => ({
  missionRateLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
}));

import routes, { MAX_PROMPT_LENGTH } from './routes';
import { browserAgent } from '../browser/browserAgent';
import { missionService } from '../missions/missionService';
import { MissionStepType } from '../types/mission';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api', routes);
  return app;
};

describe('API Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = createApp();
    vi.clearAllMocks();
  });

  describe('POST /api/missions', () => {
    it('creates a mission and starts executing it', async () => {
      const response = await request(app)
        .post('/api/missions')
        .send({ prompt: 'Diagnose 500 errors on checkout service' });

      expect(response.status).toBe(200);
      const { missionId } = response.body as { missionId: string };
      expect(missionId).toEqual(expect.any(String));

      const mission = missionService.getMission(missionId);
      expect(mission?.prompt).toBe('Diagnose 500 errors on checkout service');
      expect(vi.mocked(browserAgent.executeMission)).toHaveBeenCalledWith(
        missionId,
        'Diagnose 500 errors on checkout service'
      );
    });

    it('trims surrounding whitespace from the prompt', async () => {
      const response = await request(app)
        .post('/api/missions')
        .send({ prompt: '   Check the dashboard  ' });

      const { missionId } = response.body as { missionId: string };
      expect(missionService.getMission(missionId)?.prompt).toBe('Check the dashboard');
    });

    it.each([
      ['an empty prompt', { prompt: '' }],
      ['a whitespace-only prompt', { prompt: '   ' }],
      ['a missing prompt', {}],
      ['a non-string prompt', { prompt: 42 }],
    ])('rejects %s', async (_label, body) => {
      const response = await request(app).post('/api/missions').send(body);

      expect(response.status).toBe(400);
      expect((response.body as { error: string }).error).toContain('prompt');
      expect(vi.mocked(browserAgent.executeMission)).not.toHaveBeenCalled();
    });

    it('rejects prompts longer than the maximum length', async () => {
      const response = await request(app)
        .post('/api/missions')
        .send({ prompt: 'x'.repeat(MAX_PROMPT_LENGTH + 1) });

      expect(response.status).toBe(400);
      expect(vi.mocked(browserAgent.executeMission)).not.toHaveBeenCalled();
    });

    it('accepts a prompt of exactly the maximum length', async () => {
      const response = await request(app)
        .post('/api/missions')
        .send({ prompt: 'x'.repeat(MAX_PROMPT_LENGTH) });

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/missions/:id', () => {
    it('returns an existing mission', async () => {
      const mission = missionService.createMission('Check dashboard');

      const response = await request(app).get(`/api/missions/${mission.id}`);

      expect(response.status).toBe(200);
      expect((response.body as { mission: { id: string } }).mission.id).toBe(mission.id);
    });

    it('returns 404 for an unknown mission', async () => {
      const response = await request(app).get('/api/missions/does-not-exist');

      expect(response.status).toBe(404);
      expect((response.body as { error: string }).error).toContain('not found');
    });
  });

  describe('GET /api/missions/:id/stream', () => {
    it('returns the most recent screenshot path', async () => {
      const mission = missionService.createMission('Check dashboard');
      missionService.addStep(mission.id, MissionStepType.OBSERVATION, 'first', 'first.png');
      missionService.addStep(mission.id, MissionStepType.OBSERVATION, 'no screenshot');
      missionService.addStep(mission.id, MissionStepType.ACTION, 'second', 'second.png');
      missionService.addStep(mission.id, MissionStepType.RCA, 'analysis');

      const response = await request(app).get(`/api/missions/${mission.id}/stream`);

      expect(response.status).toBe(200);
      expect((response.body as { latestScreenshot: string }).latestScreenshot).toBe(
        '/screenshots/second.png'
      );
    });

    it('omits the screenshot before one has been captured', async () => {
      const mission = missionService.createMission('Check dashboard');

      const response = await request(app).get(`/api/missions/${mission.id}/stream`);

      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('latestScreenshot');
    });

    it('returns 404 for an unknown mission', async () => {
      const response = await request(app).get('/api/missions/does-not-exist/stream');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/missions', () => {
    it('lists created missions', async () => {
      const mission = missionService.createMission('Listed mission');

      const response = await request(app).get('/api/missions');

      expect(response.status).toBe(200);
      const { missions } = response.body as { missions: Array<{ id: string }> };
      expect(missions.map((m) => m.id)).toContain(mission.id);
    });
  });
});
