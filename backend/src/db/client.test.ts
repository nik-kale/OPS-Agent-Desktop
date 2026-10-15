/**
 * Database client logging tests
 */
import { describe, it, expect, vi } from 'vitest';

const handlers = vi.hoisted(() => new Map<string, (event: unknown) => void>());

vi.mock('@prisma/client', () => ({
  PrismaClient: class {
    $on(event: string, handler: (event: unknown) => void) {
      handlers.set(event, handler);
    }
    $disconnect() {
      return Promise.resolve();
    }
  },
}));

vi.mock('../observability/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import './client';
import { logger } from '../observability/logger';

describe('prisma client query logging', () => {
  it('logs the statement and duration but never the bound parameters', () => {
    const onQuery = handlers.get('query');
    expect(onQuery).toBeDefined();

    onQuery?.({
      query: 'SELECT * FROM "refresh_tokens" WHERE "token" = $1',
      params: '["eyJhbGciOiJIUzI1NiJ9.secret-refresh-token"]',
      duration: 3,
      target: 'quaint::connector::metrics',
      timestamp: new Date(),
    });

    expect(logger.debug).toHaveBeenCalledTimes(1);
    const [, meta] = vi.mocked(logger.debug).mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];
    expect(meta).toEqual({
      query: 'SELECT * FROM "refresh_tokens" WHERE "token" = $1',
      duration: 3,
    });
    expect(JSON.stringify(meta)).not.toContain('secret-refresh-token');
  });
});
