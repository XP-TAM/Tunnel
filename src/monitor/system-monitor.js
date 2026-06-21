/**
 * سیستم نظارت
 * System Monitor - Real-time system and tunnel monitoring
 */

const logger = require('../utils/logger');

class SystemMonitor {
  constructor(tunnelManager) {
    this.tunnelManager = tunnelManager;
    this.monitorInterval = null;
    this.isRunning = false;
    this.checkInterval = parseInt(process.env.MONITOR_INTERVAL) || 30000;
  }

  /**
   * شروع نظارت
   */
  start() {
    try {
      logger.info('📍 سیستم نظارت شروع شد');
      this.isRunning = true;

      this.monitorInterval = setInterval(() => {
        this.performMonitoring();
      }, this.checkInterval);
    } catch (error) {
      logger.error('خطا در شروع نظارت', error);
    }
  }

  /**
   * انجام نظارت
   */
  async performMonitoring() {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      const stats = {
        timestamp: new Date(),
        activeTunnels: this.tunnelManager.getTunnelCount(),
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        uptime: process.uptime()
      };

      // Check for memory issues
      if (stats.memory.heapUsed > stats.memory.heapTotal * 0.9) {
        logger.warn('⚠️ مصرف حافظه بالا است');
      }

      // Log statistics
      logger.info('📊 آمار سیستم', stats);

    } catch (error) {
      logger.error('خطا در نظارت', error);
    }
  }

  /**
   * توقف نظارت
   */
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.isRunning = false;
      logger.info('✅ سیستم نظارت متوقف شد');
    }
  }
}

module.exports = SystemMonitor;
