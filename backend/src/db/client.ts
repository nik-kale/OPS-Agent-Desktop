/**
 * Prisma database client
 * Singleton instance for database access
 */
import { PrismaClient } from '@prisma/client';
import { logger } from '../observability/logger';

// Extend PrismaClient with logging
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  });
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

// Create singleton instance
export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Log database queries in development
prisma.$on('query' as never, (e: any) => {
  logger.debug('Database query', {
    query: e.query,
    duration: e.duration,
    params: e.params,
  });
});

// Log database errors
prisma.$on('error' as never, (e: any) => {
  logger.error('Database error', {
    message: e.message,
    target: e.target,
  });
});

// Log database warnings
prisma.$on('warn' as never, (e: any) => {
  logger.warn('Database warning', {
    message: e.message,
  });
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  logger.info('Disconnected from database');
});

// Export type for use in repositories
export type PrismaClient = typeof prisma;
