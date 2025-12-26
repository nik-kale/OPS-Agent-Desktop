import express from 'express';
import morgan from 'morgan';
import path from 'path';
import apiRoutes from './api/routes';
import {
  configureCors,
  configureHelmet,
  generalRateLimiter,
  sanitizeInput,
  validateContentType,
  validateRequestSize,
  sanitizeQueryParams,
  errorHandler,
  notFoundHandler,
} from './middleware/securityMiddleware';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware - Applied in order of execution
app.use(configureHelmet()); // Security headers (CSP, HSTS, X-Frame-Options)
app.use(configureCors()); // CORS with origin validation
app.use(generalRateLimiter); // Rate limiting for all endpoints
app.use(express.json()); // JSON body parser
app.use(sanitizeInput); // XSS protection
app.use(validateContentType); // Content-Type validation
app.use(validateRequestSize(10 * 1024 * 1024)); // Max 10MB request size
app.use(sanitizeQueryParams); // Parameter pollution prevention
app.use(morgan('dev'));

// Serve screenshots as static files
app.use('/screenshots', express.static(path.join(__dirname, '../screenshots')));

// Health check (before other routes, no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ops-agent-desktop-backend' });
});

// API routes
app.use('/api', apiRoutes);

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Ops-Agent-Desktop Backend running on http://localhost:${PORT}`);
  console.log(`📸 Screenshots available at http://localhost:${PORT}/screenshots`);
  console.log(`🔍 API docs: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
