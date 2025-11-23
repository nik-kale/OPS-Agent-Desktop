/**
 * Structured logging with Winston
 * Provides JSON-formatted logs with correlation IDs for tracing
 */
import winston from 'winston';
import { config } from '../config';

// Custom format for development (human-readable)
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// JSON format for production (machine-readable)
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.logLevel,
  format: config.nodeEnv === 'production' ? prodFormat : devFormat,
  defaultMeta: {
    service: 'ops-agent-desktop-backend',
    environment: config.nodeEnv,
  },
  transports: [
    // Console output
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),

    // File output for errors (production)
    ...(config.nodeEnv === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
          }),
        ]
      : []),
  ],
});

// Create child logger with correlation ID
export const createCorrelationLogger = (correlationId: string) => {
  return logger.child({ correlationId });
};

// Express middleware for request logging with correlation ID
export const requestLogger = (
  req: any,
  res: any,
  next: any
) => {
  const correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
  req.correlationId = correlationId;
  req.logger = createCorrelationLogger(correlationId);

  const start = Date.now();

  // Log request
  req.logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
    };

    if (res.statusCode >= 500) {
      req.logger.error('Request failed', logData);
    } else if (res.statusCode >= 400) {
      req.logger.warn('Request error', logData);
    } else {
      req.logger.info('Request completed', logData);
    }
  });

  // Set correlation ID header in response
  res.setHeader('X-Correlation-ID', correlationId);

  next();
};

// Generate correlation ID (UUID v4)
function generateCorrelationId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper functions for common log patterns
export const loggers = {
  mission: (missionId: string) =>
    logger.child({ context: 'mission', missionId }),

  auth: () =>
    logger.child({ context: 'authentication' }),

  browser: (missionId?: string) =>
    logger.child({ context: 'browser-agent', missionId }),

  api: (endpoint: string) =>
    logger.child({ context: 'api', endpoint }),

  db: () =>
    logger.child({ context: 'database' }),

  queue: () =>
    logger.child({ context: 'queue' }),
};
