import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import apiRoutes from './api/routes';
import { swaggerSpec } from './config/swagger';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve screenshots as static files
app.use('/screenshots', express.static(path.join(__dirname, '../screenshots')));

// Swagger API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'OPS-Agent-Desktop API Docs',
  customCss: '.swagger-ui .topbar { display: none }',
}));

// OpenAPI JSON spec
app.get('/api/docs/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API routes
app.use('/api', apiRoutes);

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the service
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: ops-agent-desktop-backend
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ops-agent-desktop-backend' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Ops-Agent-Desktop Backend running on http://localhost:${PORT}`);
  console.log(`📸 Screenshots available at http://localhost:${PORT}/screenshots`);
  console.log(`📚 API docs: http://localhost:${PORT}/api/docs`);
  console.log(`📄 OpenAPI spec: http://localhost:${PORT}/api/docs/openapi.json`);
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
