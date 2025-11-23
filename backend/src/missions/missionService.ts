import { v4 as uuidv4 } from 'uuid';
import {
  Mission,
  MissionStep,
  MissionStepType,
  MissionStatus,
} from '../types/mission';

/**
 * MissionService orchestrates autonomous ops missions.
 *
 * For each mission:
 * 1. Parse the user prompt
 * 2. Execute browser automation steps (via BrowserAgent)
 * 3. Call AutoRCA-Core for root cause analysis (stubbed for MVP)
 * 4. Propose remediation via Secure-MCP-Gateway (stubbed for MVP)
 * 5. Execute approved actions
 */
export class MissionService {
  private missions: Map<string, Mission> = new Map();

  /**
   * Create a new mission from a user prompt.
   */
  createMission(prompt: string): Mission {
    const mission: Mission = {
      id: uuidv4(),
      prompt,
      status: MissionStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: [],
    };

    this.missions.set(mission.id, mission);
    return mission;
  }

  /**
   * Get a mission by ID.
   */
  getMission(id: string): Mission | undefined {
    return this.missions.get(id);
  }

  /**
   * Add a step to a mission.
   */
  addStep(
    missionId: string,
    type: MissionStepType,
    message: string,
    screenshotPath?: string,
    metadata?: Record<string, any>
  ): void {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }

    const step: MissionStep = {
      id: uuidv4(),
      timestamp: new Date(),
      type,
      message,
      screenshotPath,
      metadata,
    };

    mission.steps.push(step);
    mission.updatedAt = new Date();
  }

  /**
   * Update mission status.
   */
  updateStatus(missionId: string, status: MissionStatus): void {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }

    mission.status = status;
    mission.updatedAt = new Date();
  }

  /**
   * Set RCA summary for a mission.
   */
  setRCASummary(missionId: string, summary: string): void {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }

    mission.rcaSummary = summary;
    mission.updatedAt = new Date();
  }

  /**
   * Set remediation proposal for a mission.
   */
  setRemediationProposal(missionId: string, proposal: string): void {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Mission ${missionId} not found`);
    }

    mission.remediationProposal = proposal;
    mission.updatedAt = new Date();
  }

  /**
   * Get all missions (for debugging/admin).
   */
  getAllMissions(): Mission[] {
    return Array.from(this.missions.values());
  }
}

// Singleton instance
export const missionService = new MissionService();
