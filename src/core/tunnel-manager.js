/**
 * مدیریت تانل‌ها
 * Tunnel Manager - Core tunnel operations
 * 
 * مسئول:
 * - ایجاد و حذف تانل‌ها
 * - مدیریت پورت‌ها
 * - نظارت بر اتصالات
 * - ذخیره و بازیابی تانل‌های دائمی
 */

const net = require('net');
const { EventEmitter } = require('events');
const logger = require('../utils/logger');
const TunnelSession = require('./tunnel-session');
const PortManager = require('./port-manager');
const ConnectionMonitor = require('../monitor/connection-monitor');
const DataAnalyzer = require('../monitor/data-analyzer');

class TunnelManager extends EventEmitter {
  constructor(database) {
    super();
    this.database = database;
    this.tunnels = new Map(); // { tunnelId -> TunnelSession }
    this.portManager = new PortManager();
    this.connectionMonitor = new ConnectionMonitor();
    this.dataAnalyzer = new DataAnalyzer();
    this.stats = new Map(); // { tunnelId -> statistics }
  }

  /**
   * راه‌اندازی مدیریت تانل
   */
  async initialize() {
    try {
      await this.portManager.initialize();
      this.connectionMonitor.on('connectionChange', (data) => {
        this.emit('connectionStatusChanged', data);
      });
      logger.info('✅ TunnelManager آماده شد');
    } catch (error) {
      logger.error('خطا در راه‌اندازی TunnelManager', error);
      throw error;
    }
  }

  /**
   * ایجاد تانل جدید
   * Create new tunnel with detailed configuration
   * 
   * @param {Object} config - تنظیمات تانل
   * @returns {Object} - اطلاعات تانل ایجاد شده
   */
  async createTunnel(config) {
    try {
      logger.info('📍 ایجاد تانل جدید...', { config });

      // Validate configuration
      this.validateTunnelConfig(config);

      // Generate tunnel ID
      const tunnelId = this.generateTunnelId();

      // Allocate ports
      const ports = await this.portManager.allocatePorts(
        tunnelId,
        config.portCount || 1
      );

      if (!ports || ports.length === 0) {
        throw new Error('❌ نتوانست پورت خالی برای تانل پیدا کند');
      }

      // Create tunnel session
      const tunnelSession = new TunnelSession({
        tunnelId,
        config,
        ports,
        database: this.database
      });

      // Initialize tunnel
      await tunnelSession.initialize();

      // Store tunnel
      this.tunnels.set(tunnelId, tunnelSession);

      // Initialize statistics
      this.stats.set(tunnelId, {
        created: new Date(),
        bytesReceived: 0,
        bytesSent: 0,
        packetsReceived: 0,
        packetsSent: 0,
        connections: 0,
        disconnections: 0,
        errors: 0,
        avgLatency: 0,
        peakBandwidth: 0,
        minPing: Infinity,
        maxPing: 0,
        averagePing: 0
      });

      // Register with connection monitor
      this.connectionMonitor.registerTunnel(tunnelId, tunnelSession);

      // Start monitoring
      tunnelSession.on('data', (data) => {
        this.updateStats(tunnelId, data);
      });

      tunnelSession.on('metrics', (metrics) => {
        this.updateMetrics(tunnelId, metrics);
      });

      // Save to database
      await this.database.saveTunnel({
        tunnelId,
        config,
        ports,
        status: 'active',
        createdAt: new Date()
      });

      logger.info(`✅ تانل ایجاد شد: ${tunnelId}`, {
        ports,
        localHost: config.localHost,
        localPort: config.localPort,
        remoteHost: config.remoteHost,
        remotePort: config.remotePort
      });

      this.emit('tunnelCreated', { tunnelId, config, ports });

      return {
        success: true,
        tunnelId,
        ports,
        status: 'active',
        config,
        message: `✅ تانل ${tunnelId} با موفقیت ایجاد شد`
      };

    } catch (error) {
      logger.error('❌ خطا در ایجاد تانل', error);
      throw error;
    }
  }

  /**
   * حذف تانل
   * Delete tunnel and free all resources
   * 
   * @param {string} tunnelId - شناسه تانل
   * @returns {Object} - نتیجه عملیات
   */
  async deleteTunnel(tunnelId) {
    try {
      logger.info(`📍 درحال حذف تانل: ${tunnelId}`);

      const tunnelSession = this.tunnels.get(tunnelId);
      if (!tunnelSession) {
        throw new Error(`❌ تانل با شناسه ${tunnelId} یافت نشد`);
      }

      // Get tunnel details before deletion
      const tunnelDetails = await this.database.getTunnel(tunnelId);
      const ports = tunnelDetails?.ports || [];

      // Close tunnel connections
      await tunnelSession.close();

      // Release ports
      for (const port of ports) {
        await this.portManager.releasePort(port, tunnelId);
      }

      // Unregister from connection monitor
      this.connectionMonitor.unregisterTunnel(tunnelId);

      // Get statistics before deletion
      const stats = this.stats.get(tunnelId);

      // Remove from memory
      this.tunnels.delete(tunnelId);
      this.stats.delete(tunnelId);

      // Update database
      await this.database.updateTunnelStatus(tunnelId, 'deleted', {
        deletedAt: new Date(),
        finalStats: stats
      });

      logger.info(`✅ تانل حذف شد: ${tunnelId}`, {
        releasedPorts: ports,
        stats
      });

      this.emit('tunnelDeleted', { tunnelId, ports, stats });

      return {
        success: true,
        tunnelId,
        message: `✅ تانل ${tunnelId} و تمام اتصالات حذف شدند`,
        releasedPorts: ports,
        finalStatistics: stats
      };

    } catch (error) {
      logger.error(`❌ خطا در حذف تانل ${tunnelId}`, error);
      throw error;
    }
  }

  /**
   * دریافت جزئیات تانل
   * Get detailed tunnel information
   */
  async getTunnelDetails(tunnelId) {
    try {
      const tunnelSession = this.tunnels.get(tunnelId);
      if (!tunnelSession) {
        throw new Error(`❌ تانل ${tunnelId} یافت نشد`);
      }

      const config = await this.database.getTunnel(tunnelId);
      const stats = this.stats.get(tunnelId) || {};
      const metrics = tunnelSession.getMetrics();
      const connections = tunnelSession.getActiveConnections();

      return {
        tunnelId,
        config,
        statistics: stats,
        metrics,
        activeConnections: connections.length,
        connectionDetails: connections.map(conn => ({
          id: conn.id,
          source: conn.source,
          destination: conn.destination,
          bytesTransferred: conn.bytesTransferred,
          duration: conn.duration,
          status: conn.status,
          ping: conn.ping,
          packetLoss: conn.packetLoss
        })),
        systemHealth: {
          cpuUsage: process.cpuUsage(),
          memoryUsage: process.memoryUsage(),
          uptime: process.uptime()
        }
      };

    } catch (error) {
      logger.error(`خطا در دریافت جزئیات تانل ${tunnelId}`, error);
      throw error;
    }
  }

  /**
   * دریافت تمام تانل‌ها
   * Get all tunnels with summary
   */
  async getAllTunnels() {
    try {
      const allTunnels = [];

      for (const [tunnelId, tunnelSession] of this.tunnels) {
        const config = await this.database.getTunnel(tunnelId);
        const stats = this.stats.get(tunnelId) || {};

        allTunnels.push({
          tunnelId,
          status: 'active',
          config,
          ports: config.ports,
          statistics: {
            bytesReceived: stats.bytesReceived,
            bytesSent: stats.bytesSent,
            totalData: stats.bytesReceived + stats.bytesSent,
            averagePing: Math.round(stats.averagePing),
            activeConnections: tunnelSession.getActiveConnections().length,
            errors: stats.errors,
            uptime: new Date() - stats.created
          }
        });
      }

      return {
        totalTunnels: allTunnels.length,
        tunnels: allTunnels
      };

    } catch (error) {
      logger.error('خطا در دریافت لیست تانل‌ها', error);
      throw error;
    }
  }

  /**
   * بروز رسانی آمار
   * Update statistics
   */
  updateStats(tunnelId, data) {
    const stats = this.stats.get(tunnelId);
    if (!stats) return;

    if (data.direction === 'received') {
      stats.bytesReceived += data.bytes;
      stats.packetsReceived++;
    } else if (data.direction === 'sent') {
      stats.bytesSent += data.bytes;
      stats.packetsSent++;
    }
  }

  /**
   * بروز رسانی معیارها
   * Update metrics
   */
  updateMetrics(tunnelId, metrics) {
    const stats = this.stats.get(tunnelId);
    if (!stats) return;

    if (metrics.ping) {
      stats.minPing = Math.min(stats.minPing, metrics.ping);
      stats.maxPing = Math.max(stats.maxPing, metrics.ping);
      stats.averagePing = (stats.averagePing + metrics.ping) / 2;
    }

    if (metrics.bandwidth) {
      stats.peakBandwidth = Math.max(stats.peakBandwidth, metrics.bandwidth);
    }

    if (metrics.errors) {
      stats.errors += metrics.errors;
    }
  }

  /**
   * تغییر پورت تانل
   * Change tunnel ports
   */
  async changeTunnelPorts(tunnelId, newPorts) {
    try {
      logger.info(`📍 درحال تغییر پورت تانل: ${tunnelId}`);

      const tunnelSession = this.tunnels.get(tunnelId);
      if (!tunnelSession) {
        throw new Error(`❌ تانل ${tunnelId} یافت نشد`);
      }

      // Release old ports
      const oldPorts = tunnelSession.getPorts();
      for (const port of oldPorts) {
        await this.portManager.releasePort(port, tunnelId);
      }

      // Allocate new ports
      const allocatedPorts = await this.portManager.allocatePorts(
        tunnelId,
        newPorts.length
      );

      // Update tunnel session
      await tunnelSession.updatePorts(allocatedPorts);

      // Update database
      await this.database.updateTunnelPorts(tunnelId, allocatedPorts);

      logger.info(`✅ پورت‌های تانل تغییر یافت`, {
        tunnelId,
        oldPorts,
        newPorts: allocatedPorts
      });

      return {
        success: true,
        tunnelId,
        oldPorts,
        newPorts: allocatedPorts
      };

    } catch (error) {
      logger.error(`خطا در تغییر پورت تانل ${tunnelId}`, error);
      throw error;
    }
  }

  /**
   * بازگذاری تانل‌های ذخیره شده
   * Restore persisted tunnels on startup
   */
  async restorePersistedTunnels() {
    try {
      logger.info('📍 بازیابی تانل‌های ذخیره شده...');

      const persistedTunnels = await this.database.getActiveTunnels();

      for (const tunnelConfig of persistedTunnels) {
        try {
          await this.createTunnel(tunnelConfig.config);
        } catch (error) {
          logger.error(`خطا در بازیابی تانل ${tunnelConfig.tunnelId}`, error);
        }
      }

      logger.info(`✅ ${persistedTunnels.length} تانل بازیابی شدند`);

    } catch (error) {
      logger.error('خطا در بازیابی تانل‌ها', error);
    }
  }

  /**
   * بستن تمام تانل‌ها
   * Close all tunnels gracefully
   */
  async closeAllTunnels() {
    try {
      logger.info('📍 بستن تمام تانل‌ها...');

      const tunnelIds = Array.from(this.tunnels.keys());

      for (const tunnelId of tunnelIds) {
        try {
          await this.deleteTunnel(tunnelId);
        } catch (error) {
          logger.error(`خطا در بستن تانل ${tunnelId}`, error);
        }
      }

      logger.info('✅ تمام تانل‌ها بسته شدند');

    } catch (error) {
      logger.error('خطا در بستن تانل‌ها', error);
    }
  }

  /**
   * اعتبارسنجی تنظیمات تانل
   */
  validateTunnelConfig(config) {
    if (!config.localHost || !config.localPort) {
      throw new Error('❌ لطفاً localHost و localPort را مشخص کنید');
    }
    if (!config.remoteHost || !config.remotePort) {
      throw new Error('❌ لطفاً remoteHost و remotePort را مشخص کنید');
    }
    if (config.localPort < 1024 || config.localPort > 65535) {
      throw new Error('❌ پورت محلی باید بین 1024 و 65535 باشد');
    }
  }

  /**
   * تولید شناسه یکتا برای تانل
   */
  generateTunnelId() {
    return `tunnel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * دریافت تعداد تانل‌های فعال
   */
  getTunnelCount() {
    return this.tunnels.size;
  }

  /**
   * دریافت آمار کلی
   */
  getGlobalStats() {
    let totalBytes = 0;
    let totalConnections = 0;
    let totalErrors = 0;

    for (const stats of this.stats.values()) {
      totalBytes += stats.bytesReceived + stats.bytesSent;
      totalConnections += stats.connections;
      totalErrors += stats.errors;
    }

    return {
      activeTunnels: this.tunnels.size,
      totalDataTransferred: totalBytes,
      totalConnections,
      totalErrors,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
}

module.exports = TunnelManager;
