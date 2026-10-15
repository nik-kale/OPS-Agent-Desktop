/**
 * Prisma database client
 * Singleton instance for database access
 */
import { PrismaClient as BasePrismaClient } from '@prisma/client';
import { logger } from '../observability/logger';

// Extend PrismaClient with logging
const prismaClientSingleton = () => {
  return new BasePrismaClient({
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

// Log database queries in development. Only the statement and its timing are
// logged: bound parameters carry password hashes and refresh tokens.
prisma.$on('query', (e) => {
  logger.debug('Database query', {
    query: e.query,
    duration: e.duration,
  });
});

// Log database errors
prisma.$on('error', (e) => {
  logger.error('Database error', {
    message: e.message,
    target: e.target,
  });
});

// Log database warnings
prisma.$on('warn', (e) => {
  logger.warn('Database warning', {
    message: e.message,
  });
});

// Graceful shutdown
process.on('beforeExit', () => {
  void prisma.$disconnect().then(() => logger.info('Disconnected from database'));
});

// Export type for use in repositories
export type PrismaClient = typeof prisma;
