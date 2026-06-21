/**
 * سرور WebSocket
 * WebSocket Server - Real-time communication
 */

const SocketIO = require('socket.io');
const logger = require('../utils/logger');

class WebSocketServer {
  constructor(httpServer, tunnelManager) {
    this.httpServer = httpServer;
    this.tunnelManager = tunnelManager;
    this.io = null;
    this.connectedClients = new Map();
  }

  async initialize() {
    try {
      this.io = SocketIO(this.httpServer, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST']
        }
      });

      this.io.on('connection', (socket) => {
        logger.info(`✅ کلاینت متصل شد: ${socket.id}`);
        this.connectedClients.set(socket.id, socket);

        // Subscribe to tunnel updates
        socket.on('subscribe', (tunnelId) => {
          socket.join(`tunnel_${tunnelId}`);
          logger.info(`📍 کلاینت ${socket.id} به تانل ${tunnelId} مشترک شد`);
        });

        // Request tunnel details
        socket.on('get-tunnel-details', async (tunnelId) => {
          try {
            const details = await this.tunnelManager.getTunnelDetails(tunnelId);
            socket.emit('tunnel-details', details);
          } catch (error) {
            socket.emit('error', { message: error.message });
          }
        });

        // Unsubscribe
        socket.on('unsubscribe', (tunnelId) => {
          socket.leave(`tunnel_${tunnelId}`);
          logger.info(`📍 کلاینت ${socket.id} از تانل ${tunnelId} خارج شد`);
        });

        // Disconnect
        socket.on('disconnect', () => {
          logger.info(`❌ کلاینت قطع شد: ${socket.id}`);
          this.connectedClients.delete(socket.id);
        });
      });

      // Emit tunnel events to clients
      this.tunnelManager.on('tunnelCreated', (data) => {
        this.io.emit('tunnel-created', data);
      });

      this.tunnelManager.on('tunnelDeleted', (data) => {
        this.io.emit('tunnel-deleted', data);
      });

      this.tunnelManager.on('connectionStatusChanged', (data) => {
        this.io.to(`tunnel_${data.tunnelId}`).emit('connection-status', data);
      });

      logger.info('✅ سرور WebSocket راه‌اندازی شد');
    } catch (error) {
      logger.error('خطا در راه‌اندازی سرور WebSocket', error);
      throw error;
    }
  }

  /**
   * ارسال بروز رسانی به کلاینت‌های متصل
   */
  broadcastMetrics(tunnelId, metrics) {
    this.io.to(`tunnel_${tunnelId}`).emit('metrics-update', {
      tunnelId,
      ...metrics,
      timestamp: new Date()
    });
  }

  /**
   * بستن سرور WebSocket
   */
  close() {
    if (this.io) {
      this.io.close();
      logger.info('✅ سرور WebSocket بسته شد');
    }
  }
}

module.exports = WebSocketServer;
