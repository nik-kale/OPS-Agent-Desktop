/**
 * Mission repository
 * Data access layer for mission operations
 */
import { prisma } from '../db/client';
import {
  Mission,
  MissionStep,
  MissionStatus,
  Priority,
  MissionStepType,
  Prisma,
} from '@prisma/client';
import { logger } from '../observability/logger';

export class MissionRepository {
  /**
   * Create a new mission
   */
  async create(data: {
    prompt: string;
    userId: string;
    dashboardUrl?: string;
    dashboardType?: string;
    priority?: Priority;
  }): Promise<Mission> {
    logger.info('Creating mission', { userId: data.userId });

    return prisma.mission.create({
      data: {
        prompt: data.prompt,
        userId: data.userId,
        dashboardUrl: data.dashboardUrl,
        dashboardType: data.dashboardType,
        priority: data.priority || 'NORMAL',
        status: 'PENDING',
      },
    });
  }

  /**
   * Find mission by ID with all relations
   */
  async findById(id: string): Promise<(Mission & { steps: MissionStep[] }) | null> {
    return prisma.mission.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { sequenceNumber: 'asc' },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        approvals: true,
      },
    });
  }

  /**
   * Find mission by ID (simple)
   */
  async findOne(id: string): Promise<Mission | null> {
    return prisma.mission.findUnique({
      where: { id },
    });
  }

  /**
   * List missions with pagination and filtering
   */
  async list(params: {
    page: number;
    limit: number;
    status?: MissionStatus;
    userId?: string;
    sortBy?: 'createdAt' | 'updatedAt' | 'priority';
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page, limit, status, userId, sortBy = 'createdAt', sortOrder = 'desc' } = params;

    const where: Prisma.MissionWhereInput = {
      ...(status && { status }),
      ...(userId && { userId }),
    };

    const [missions, total] = await Promise.all([
      prisma.mission.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              steps: true,
              approvals: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.mission.count({ where }),
    ]);

    return {
      missions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update mission status
   */
  async updateStatus(id: string, status: MissionStatus): Promise<Mission> {
    const updateData: Prisma.MissionUpdateInput = {
      status,
      updatedAt: new Date(),
    };

    // Set timestamps based on status
    if (status === 'RUNNING' && !await this.hasStarted(id)) {
      updateData.startedAt = new Date();
    }

    if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
      updateData.completedAt = new Date();

      // Calculate execution time
      const mission = await this.findOne(id);
      if (mission?.startedAt) {
        const executionTimeMs = new Date().getTime() - new Date(mission.startedAt).getTime();
        updateData.executionTimeMs = executionTimeMs;
      }
    }

    return prisma.mission.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Add a step to a mission
   */
  async addStep(params: {
    missionId: string;
    type: MissionStepType;
    message: string;
    screenshotPath?: string;
    screenshotUrl?: string;
    metadata?: any;
    durationMs?: number;
  }): Promise<MissionStep> {
    const { missionId, ...stepData } = params;

    // Get next sequence number
    const lastStep = await prisma.missionStep.findFirst({
      where: { missionId },
      orderBy: { sequenceNumber: 'desc' },
    });

    const sequenceNumber = (lastStep?.sequenceNumber || 0) + 1;

    return prisma.missionStep.create({
      data: {
        missionId,
        sequenceNumber,
        ...stepData,
      },
    });
  }

  /**
   * Set RCA summary
   */
  async setRCASummary(id: string, summary: string): Promise<Mission> {
    return prisma.mission.update({
      where: { id },
      data: {
        rcaSummary: summary,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Set remediation proposal
   */
  async setRemediationProposal(id: string, proposal: string): Promise<Mission> {
    return prisma.mission.update({
      where: { id },
      data: {
        remediationProposal: proposal,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete mission and all related data
   */
  async delete(id: string): Promise<void> {
    await prisma.mission.delete({
      where: { id },
    });
  }

  /**
   * Get mission statistics for a user
   */
  async getStats(userId: string) {
    const [total, completed, failed, running, pending] = await Promise.all([
      prisma.mission.count({ where: { userId } }),
      prisma.mission.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.mission.count({ where: { userId, status: 'FAILED' } }),
      prisma.mission.count({ where: { userId, status: 'RUNNING' } }),
      prisma.mission.count({ where: { userId, status: 'PENDING' } }),
    ]);

    // Calculate average execution time
    const avgExecution = await prisma.mission.aggregate({
      where: {
        userId,
        executionTimeMs: { not: null },
      },
      _avg: {
        executionTimeMs: true,
      },
    });

    return {
      total,
      completed,
      failed,
      running,
      pending,
      avgExecutionTimeMs: avgExecution._avg.executionTimeMs || 0,
      successRate: total > 0 ? (completed / total) * 100 : 0,
    };
  }

  /**
   * Check if mission has started
   */
  private async hasStarted(id: string): Promise<boolean> {
    const mission = await prisma.mission.findUnique({
      where: { id },
      select: { startedAt: true },
    });
    return mission?.startedAt !== null;
  }
}

// Singleton instance
export const missionRepository = new MissionRepository();
