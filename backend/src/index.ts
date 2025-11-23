import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import apiRoutes from './api/routes';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Serve screenshots as static files
app.use('/screenshots', express.static(path.join(__dirname, '../screenshots')));

// API routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ops-agent-desktop-backend' });
});

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
