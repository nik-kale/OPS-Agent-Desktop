/**
 * WebSocket server for real-time communication
 * Replaces HTTP polling with efficient bi-directional messaging
 */
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { authService } from '../auth/authService';
import { logger } from '../observability/logger';
import { config } from '../config';

export class WebSocketServer {
  private io: SocketIOServer;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socket IDs

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.allowedOrigins,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    logger.info('WebSocket server initialized');
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware() {
    this.io.use((socket, next) => {
      try {
        // Get token from handshake auth
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify token
        const payload = authService.verifyAccessToken(token);

        // Attach user info to socket
        socket.data.userId = payload.userId;
        socket.data.email = payload.email;
        socket.data.role = payload.role;

        logger.info('WebSocket authenticated', {
          userId: payload.userId,
          socketId: socket.id,
        });

        next();
      } catch (error) {
        logger.warn('WebSocket authentication failed', { error });
        next(new Error('Invalid token'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;

      logger.info('WebSocket client connected', {
        userId,
        socketId: socket.id,
      });

      // Track user's sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // Join user's personal room
      socket.join(`user:${userId}`);

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info('WebSocket client disconnected', {
          userId,
          socketId: socket.id,
        });

        // Remove from tracking
        const userSocketSet = this.userSockets.get(userId);
        if (userSocketSet) {
          userSocketSet.delete(socket.id);
          if (userSocketSet.size === 0) {
            this.userSockets.delete(userId);
          }
        }
      });

      // Handle mission subscription
      socket.on('mission:subscribe', (missionId: string) => {
        socket.join(`mission:${missionId}`);
        logger.debug('Subscribed to mission', { userId, missionId, socketId: socket.id });
      });

      // Handle mission unsubscribe
      socket.on('mission:unsubscribe', (missionId: string) => {
        socket.leave(`mission:${missionId}`);
        logger.debug('Unsubscribed from mission', { userId, missionId, socketId: socket.id });
      });

      // Handle approval events
      socket.on('approval:subscribe', (approvalId: string) => {
        socket.join(`approval:${approvalId}`);
        logger.debug('Subscribed to approval', { userId, approvalId, socketId: socket.id });
      });

      // Handle ping for connection keep-alive
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Error handling
      socket.on('error', (error) => {
        logger.error('WebSocket error', {
          userId,
          socketId: socket.id,
          error,
        });
      });
    });
  }

  /**
   * Emit mission update to all subscribers
   */
  emitMissionUpdate(missionId: string, data: any) {
    this.io.to(`mission:${missionId}`).emit('mission:update', data);
    logger.debug('Emitted mission update', { missionId });
  }

  /**
   * Emit mission step to subscribers
   */
  emitMissionStep(missionId: string, step: any) {
    this.io.to(`mission:${missionId}`).emit('mission:step', step);
    logger.debug('Emitted mission step', { missionId, stepType: step.type });
  }

  /**
   * Emit mission status change
   */
  emitMissionStatus(missionId: string, status: string) {
    this.io.to(`mission:${missionId}`).emit('mission:status', { missionId, status });
    logger.debug('Emitted mission status', { missionId, status });
  }

  /**
   * Emit approval request to user
   */
  emitApprovalRequest(userId: string, approval: any) {
    this.io.to(`user:${userId}`).emit('approval:request', approval);
    logger.info('Emitted approval request', { userId, approvalId: approval.id });
  }

  /**
   * Emit approval response
   */
  emitApprovalResponse(approvalId: string, response: any) {
    this.io.to(`approval:${approvalId}`).emit('approval:response', response);
    logger.info('Emitted approval response', { approvalId, status: response.status });
  }

  /**
   * Emit notification to user
   */
  emitNotification(userId: string, notification: any) {
    this.io.to(`user:${userId}`).emit('notification', notification);
    logger.debug('Emitted notification to user', { userId });
  }

  /**
   * Broadcast system announcement to all connected clients
   */
  broadcastAnnouncement(message: string) {
    this.io.emit('system:announcement', { message, timestamp: new Date() });
    logger.info('Broadcasted system announcement', { message });
  }

  /**
   * Get connected user count
   */
  getConnectedUserCount(): number {
    return this.userSockets.size;
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }

  /**
   * Get socket server instance
   */
  getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Shutdown server gracefully
   */
  async shutdown() {
    logger.info('Shutting down WebSocket server');

    // Disconnect all clients
    this.io.disconnectSockets();

    // Close server
    return new Promise<void>((resolve) => {
      this.io.close(() => {
        logger.info('WebSocket server closed');
        resolve();
      });
    });
  }
}

// Export singleton instance (will be initialized in main server file)
let wsServer: WebSocketServer | null = null;

export const initializeWebSocketServer = (httpServer: HTTPServer): WebSocketServer => {
  wsServer = new WebSocketServer(httpServer);
  return wsServer;
};

export const getWebSocketServer = (): WebSocketServer => {
  if (!wsServer) {
    throw new Error('WebSocket server not initialized');
  }
  return wsServer;
};
