import { Mission, MissionStreamResponse } from '../types/mission';

const API_BASE_URL = '/api';

/**
 * API service for communicating with the backend.
 */
export const api = {
  /**
   * Create a new mission.
   */
  async createMission(prompt: string): Promise<{ missionId: string }> {
    const response = await fetch(`${API_BASE_URL}/missions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create mission: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get mission stream (polling endpoint).
   */
  async getMissionStream(missionId: string): Promise<MissionStreamResponse> {
    const response = await fetch(`${API_BASE_URL}/missions/${missionId}/stream`);

    if (!response.ok) {
      throw new Error(`Failed to get mission stream: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get a specific mission.
   */
  async getMission(missionId: string): Promise<{ mission: Mission }> {
    const response = await fetch(`${API_BASE_URL}/missions/${missionId}`);

    if (!response.ok) {
      throw new Error(`Failed to get mission: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * List all missions.
   */
  async listMissions(): Promise<{ missions: Mission[] }> {
    const response = await fetch(`${API_BASE_URL}/missions`);

    if (!response.ok) {
      throw new Error(`Failed to list missions: ${response.statusText}`);
    }

    return response.json();
  },
};
