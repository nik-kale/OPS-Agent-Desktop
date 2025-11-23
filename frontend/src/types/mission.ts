/**
 * Frontend types for missions (matching backend types)
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
  timestamp: string;
  type: MissionStepType;
  message: string;
  screenshotPath?: string;
  metadata?: Record<string, any>;
}

export interface Mission {
  id: string;
  prompt: string;
  status: MissionStatus;
  createdAt: string;
  updatedAt: string;
  steps: MissionStep[];
  rcaSummary?: string;
  remediationProposal?: string;
}

export interface MissionStreamResponse {
  mission: Mission;
  latestScreenshot?: string;
}
