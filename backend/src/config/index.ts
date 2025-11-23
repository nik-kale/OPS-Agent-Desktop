/**
 * Configuration management for OPS-Agent-Desktop
 * Loads and validates environment variables
 */
import * as dotenv from 'dotenv';
import { z } from 'zod';
import * as path from 'path';

// Load .env file from project root
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Configuration schema
const configSchema = z.object({
  // Server
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.coerce.number().default(3001),
  frontendUrl: z.string().url().default('http://localhost:5173'),

  // Database
  databaseUrl: z.string().min(1, 'DATABASE_URL is required'),

  // Authentication
  jwtSecret: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  jwtExpiration: z.string().default('24h'),
  refreshTokenSecret: z.string().min(32, 'REFRESH_TOKEN_SECRET must be at least 32 characters'),
  refreshTokenExpiration: z.string().default('7d'),

  // CORS
  allowedOrigins: z.string().transform((val) => val.split(',')),

  // Storage
  storageType: z.enum(['local', 's3', 'minio']).default('local'),
  s3Bucket: z.string().optional(),
  s3Region: z.string().default('us-east-1'),
  s3AccessKeyId: z.string().optional(),
  s3SecretAccessKey: z.string().optional(),
  s3Endpoint: z.string().optional(),
  screenshotRetentionDays: z.coerce.number().default(30),

  // Redis
  redisUrl: z.string().default('redis://localhost:6379'),
  redisPassword: z.string().optional(),

  // Browser Agent
  browserHeadless: z.coerce.boolean().default(true),
  browserPoolSize: z.coerce.number().default(5),
  maxConcurrentMissions: z.coerce.number().default(3),
  missionTimeoutMs: z.coerce.number().default(300000),

  // Dashboard
  allowedDashboardDomains: z.string().transform((val) => val.split(',')),

  // External Integrations
  autorcaCoreUrl: z.string().url().optional(),
  secureMcpGatewayUrl: z.string().url().optional(),

  // LLM
  anthropicApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  llmProvider: z.enum(['anthropic', 'openai']).default('anthropic'),
  llmModel: z.string().default('claude-3-5-sonnet-20241022'),
  llmMaxTokens: z.coerce.number().default(4096),

  // Observability
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  enableTelemetry: z.coerce.boolean().default(true),
  otelExporterEndpoint: z.string().optional(),

  // Rate Limiting
  rateLimitWindowMs: z.coerce.number().default(60000),
  rateLimitMaxRequests: z.coerce.number().default(100),
  missionRateLimitPerHour: z.coerce.number().default(10),

  // Feature Flags
  enableWebsocket: z.coerce.boolean().default(true),
  enableMultiMission: z.coerce.boolean().default(true),
  enableLlmPlanning: z.coerce.boolean().default(false),
  enableAutoApproval: z.coerce.boolean().default(false),
});

// Parse and validate environment variables
const parseConfig = () => {
  const rawConfig = {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    frontendUrl: process.env.FRONTEND_URL,

    databaseUrl: process.env.DATABASE_URL,

    jwtSecret: process.env.JWT_SECRET,
    jwtExpiration: process.env.JWT_EXPIRATION,
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
    refreshTokenExpiration: process.env.REFRESH_TOKEN_EXPIRATION,

    allowedOrigins: process.env.ALLOWED_ORIGINS,

    storageType: process.env.STORAGE_TYPE,
    s3Bucket: process.env.S3_BUCKET,
    s3Region: process.env.S3_REGION,
    s3AccessKeyId: process.env.S3_ACCESS_KEY_ID,
    s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    s3Endpoint: process.env.S3_ENDPOINT,
    screenshotRetentionDays: process.env.SCREENSHOT_RETENTION_DAYS,

    redisUrl: process.env.REDIS_URL,
    redisPassword: process.env.REDIS_PASSWORD,

    browserHeadless: process.env.BROWSER_HEADLESS,
    browserPoolSize: process.env.BROWSER_POOL_SIZE,
    maxConcurrentMissions: process.env.MAX_CONCURRENT_MISSIONS,
    missionTimeoutMs: process.env.MISSION_TIMEOUT_MS,

    allowedDashboardDomains: process.env.ALLOWED_DASHBOARD_DOMAINS,

    autorcaCoreUrl: process.env.AUTORKA_CORE_URL,
    secureMcpGatewayUrl: process.env.SECURE_MCP_GATEWAY_URL,

    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    llmProvider: process.env.LLM_PROVIDER,
    llmModel: process.env.LLM_MODEL,
    llmMaxTokens: process.env.LLM_MAX_TOKENS,

    logLevel: process.env.LOG_LEVEL,
    enableTelemetry: process.env.ENABLE_TELEMETRY,
    otelExporterEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,

    rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
    rateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
    missionRateLimitPerHour: process.env.MISSION_RATE_LIMIT_PER_HOUR,

    enableWebsocket: process.env.ENABLE_WEBSOCKET,
    enableMultiMission: process.env.ENABLE_MULTI_MISSION,
    enableLlmPlanning: process.env.ENABLE_LLM_PLANNING,
    enableAutoApproval: process.env.ENABLE_AUTO_APPROVAL,
  };

  try {
    return configSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:');
      console.error(error.errors);
      throw new Error('Invalid configuration. Check environment variables.');
    }
    throw error;
  }
};

// Export validated configuration
export const config = parseConfig();

// Type export for TypeScript
export type Config = z.infer<typeof configSchema>;

// Helper to check if running in production
export const isProduction = () => config.nodeEnv === 'production';
export const isDevelopment = () => config.nodeEnv === 'development';
export const isTest = () => config.nodeEnv === 'test';
