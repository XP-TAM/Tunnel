/**
 * نظارت بر اتصالات
 * Connection Monitor - Track active connections and their status
 */

const { EventEmitter } = require('events');
const logger = require('../utils/logger');

class ConnectionMonitor extends EventEmitter {
  constructor() {
    super();
    this.tunnelConnections = new Map(); // { tunnelId -> { connId -> connection } }
    this.updateInterval = null;
  }

  /**
   * ثبت تانل برای نظارت
   */
  registerTunnel(tunnelId, tunnelSession) {
    this.tunnelConnections.set(tunnelId, new Map());
    logger.info(`📊 تانل ${tunnelId} برای نظارت ثبت شد`);
  }

  /**
   * حذف نظارت بر تانل
   */
  unregisterTunnel(tunnelId) {
    this.tunnelConnections.delete(tunnelId);
    logger.info(`📊 تانل ${tunnelId} از نظارت حذف شد`);
  }

  /**
   * دریافت وضعیت کلی
   */
  getOverallStatus() {
    let totalConnections = 0;
    let totalErrors = 0;
    let healthyConnections = 0;

    for (const connections of this.tunnelConnections.values()) {
      totalConnections += connections.size;
      // Add more logic for error and health tracking
    }

    return {
      totalTunnels: this.tunnelConnections.size,
      totalConnections,
      healthyConnections,
      totalErrors
    };
  }
}

module.exports = ConnectionMonitor;