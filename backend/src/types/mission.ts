/**
 * Mission step types categorize agent actions for transparency and auditing.
 *
 * - OBSERVATION: Read-only actions (viewing dashboards, reading logs)
 * - ACTION: Interventions requiring gateway approval (restart, scale, config changes)
 * - RCA: Root cause analysis reasoning steps
 * - REMEDIATION: Proposed or executed fixes
 */
export enum MissionStepType {
  OBSERVATION = 'OBSERVATION',
  ACTION = 'ACTION',
  RCA = 'RCA',
  REMEDIATION = 'REMEDIATION',
}

export enum MissionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
}

export interface MissionStep {
  id: string;
  timestamp: Date;
  type: MissionStepType;
  message: string;
  screenshotPath?: string;
  metadata?: Record<string, any>;
}

export interface Mission {
  id: string;
  prompt: string;
  status: MissionStatus;
  createdAt: Date;
  updatedAt: Date;
  steps: MissionStep[];
  rcaSummary?: string;
  remediationProposal?: string;
}

export interface CreateMissionRequest {
  prompt: string;
  dashboardUrl?: string;
  dashboardType?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
}

export interface CreateMissionResponse {
  missionId: string;
}

export interface MissionStreamResponse {
  mission: Mission;
  latestScreenshot?: string;
}
