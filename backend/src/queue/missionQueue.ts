/**
 * Mission Queue Service
 * Manages concurrent mission execution using BullMQ
 */
import { Queue, Worker, Job } from 'bullmq';
import { browserAgent } from '../browser/browserAgent';
import { missionService } from '../missions/missionService';
import { logger } from '../observability/logger';
import { config } from '../config';
import IORedis from 'ioredis';

// Redis connection for BullMQ
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

interface MissionJobData {
  missionId: string;
  prompt: string;
}

// Create mission queue
export const missionQueue = new Queue<MissionJobData>('missions', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 50, // Keep last 50 failed jobs
      age: 7 * 24 * 3600, // 7 days
    },
  },
});

// Create worker with concurrency
export const missionWorker = new Worker<MissionJobData>(
  'missions',
  async (job: Job<MissionJobData>) => {
    const { missionId, prompt } = job.data;

    logger.info('Processing mission job', {
      missionId,
      jobId: job.id,
      attempt: job.attemptsMade + 1,
    });

    try {
      // Update job progress
      await job.updateProgress(10);

      // Execute mission
      await browserAgent.executeMission(missionId, prompt);

      // Mark as complete
      await job.updateProgress(100);

      logger.info('Mission job completed', {
        missionId,
        jobId: job.id,
      });

      return { success: true, missionId };
    } catch (error) {
      logger.error('Mission job failed', {
        missionId,
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
        attempt: job.attemptsMade + 1,
      });

      // Update mission status
      missionService.updateStatus(missionId, 'FAILED' as any);

      throw error; // Re-throw to mark job as failed
    }
  },
  {
    connection,
    concurrency: config.maxConcurrentMissions || 3,
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // per second
    },
  }
);

// Event handlers
missionWorker.on('completed', (job: Job) => {
  logger.info('Mission worker completed job', { jobId: job.id });
});

missionWorker.on('failed', (job: Job | undefined, error: Error) => {
  logger.error('Mission worker failed job', {
    jobId: job?.id,
    error: error.message,
  });
});

missionWorker.on('error', (error: Error) => {
  logger.error('Mission worker error', { error: error.message });
});

/**
 * Add a mission to the queue
 */
export async function addMissionToQueue(
  missionId: string,
  prompt: string
): Promise<Job<MissionJobData>> {
  const job = await missionQueue.add(
    'execute',
    { missionId, prompt },
    {
      jobId: missionId, // Use missionId as jobId for easy tracking
    }
  );

  logger.info('Mission added to queue', {
    missionId,
    jobId: job.id,
    queueName: missionQueue.name,
  });

  return job;
}

/**
 * Get queue status and metrics
 */
export async function getQueueStatus() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    missionQueue.getWaitingCount(),
    missionQueue.getActiveCount(),
    missionQueue.getCompletedCount(),
    missionQueue.getFailedCount(),
    missionQueue.getDelayedCount(),
  ]);

  const workers = await missionQueue.getWorkers();

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    workers: workers.length,
    concurrency: config.maxConcurrentMissions || 3,
  };
}

/**
 * Get job position in queue
 */
export async function getJobPosition(jobId: string): Promise<number | null> {
  const waitingJobs = await missionQueue.getWaiting();
  const position = waitingJobs.findIndex((job) => job.id === jobId);
  return position === -1 ? null : position + 1;
}

/**
 * Get job details
 */
export async function getJobDetails(jobId: string) {
  const job = await missionQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const position = state === 'waiting' ? await getJobPosition(jobId) : null;

  return {
    id: job.id,
    state,
    progress: job.progress,
    attempts: job.attemptsMade,
    position,
    data: job.data,
    timestamp: job.timestamp,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  };
}

/**
 * Graceful shutdown
 */
export async function shutdownQueue() {
  logger.info('Shutting down mission queue');

  await missionWorker.close();
  await missionQueue.close();
  await connection.quit();

  logger.info('Mission queue shut down successfully');
}

// Handle process termination
process.on('SIGTERM', async () => {
  await shutdownQueue();
});

process.on('SIGINT', async () => {
  await shutdownQueue();
});

logger.info('Mission queue initialized', {
  concurrency: config.maxConcurrentMissions || 3,
  queueName: missionQueue.name,
});

