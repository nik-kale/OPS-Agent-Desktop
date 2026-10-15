/**
 * Configuration parsing tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const REQUIRED_ENV = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/test_db',
  JWT_SECRET: 'test-jwt-secret-minimum-32-characters-long',
  REFRESH_TOKEN_SECRET: 'test-refresh-secret-minimum-32-characters',
};

const loadConfig = async (env: Record<string, string | undefined>) => {
  vi.resetModules();
  for (const [key, value] of Object.entries({ ...REQUIRED_ENV, ...env })) {
    vi.stubEnv(key, value);
  }
  const { config } = await import('./index');
  return config;
};

describe('config', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('parses "false" as false for boolean flags', async () => {
    const config = await loadConfig({
      BROWSER_HEADLESS: 'false',
      ENABLE_TELEMETRY: 'false',
      ENABLE_WEBSOCKET: 'FALSE',
      ENABLE_LLM_PLANNING: '0',
    });

    expect(config.browserHeadless).toBe(false);
    expect(config.enableTelemetry).toBe(false);
    expect(config.enableWebsocket).toBe(false);
    expect(config.enableLlmPlanning).toBe(false);
  });

  it('parses "true" as true and applies defaults when unset', async () => {
    const config = await loadConfig({
      ENABLE_AUTO_APPROVAL: 'true',
      BROWSER_HEADLESS: undefined,
      ENABLE_LLM_PLANNING: undefined,
    });

    expect(config.enableAutoApproval).toBe(true);
    expect(config.browserHeadless).toBe(true);
    expect(config.enableLlmPlanning).toBe(false);
  });

  it('rejects unrecognised boolean values instead of treating them as true', async () => {
    await expect(loadConfig({ ENABLE_AUTO_APPROVAL: 'nope' })).rejects.toThrow(
      'Invalid configuration'
    );
  });

  it('starts without ALLOWED_DASHBOARD_DOMAINS or ALLOWED_ORIGINS set', async () => {
    const config = await loadConfig({
      ALLOWED_DASHBOARD_DOMAINS: undefined,
      ALLOWED_ORIGINS: undefined,
    });

    expect(config.allowedDashboardDomains).toEqual(['localhost:5174']);
    expect(config.allowedOrigins).toEqual(['http://localhost:5173']);
  });

  it('trims whitespace around comma-separated origins', async () => {
    const config = await loadConfig({
      ALLOWED_ORIGINS: 'http://localhost:5173, http://localhost:5174 ,',
    });

    expect(config.allowedOrigins).toEqual(['http://localhost:5173', 'http://localhost:5174']);
  });
});
