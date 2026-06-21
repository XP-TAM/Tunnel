/**
 * روت‌های آمار
 * Statistics Routes - API endpoints for statistics and analytics
 */

const express = require('express');
const logger = require('../utils/logger');

module.exports = (tunnelManager, database) => {
  const router = express.Router();

  /**
   * آمار کلی سیستم
   * GET /api/stats/global
   */
  router.get('/global', (req, res) => {
    try {
      const globalStats = tunnelManager.getGlobalStats();
      res.json({
        timestamp: new Date(),
        ...globalStats,
        formattedDataTransferred: formatBytes(globalStats.totalDataTransferred)
      });
    } catch (error) {
      logger.error('خطا در دریافت آمار کلی', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * آمار تانل خاص
   * GET /api/stats/tunnel/:tunnelId
   */
  router.get('/tunnel/:tunnelId', async (req, res) => {
    try {
      const { tunnelId } = req.params;
      const tunnelSession = tunnelManager.tunnels?.get(tunnelId);

      if (!tunnelSession) {
        return res.status(404).json({ error: 'تانل یافت نشد' });
      }

      const metrics = tunnelSession.getMetrics();
      res.json({
        tunnelId,
        timestamp: new Date(),
        ...metrics,
        dataTransferredFormatted: {
          received: formatBytes(metrics.totalBytesReceived),
          sent: formatBytes(metrics.totalBytesSent),
          total: formatBytes(metrics.totalDataTransferred)
        }
      });
    } catch (error) {
      logger.error('خطا در دریافت آمار تانل', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * آمار اتصالات
   * GET /api/stats/connections
   */
  router.get('/connections', async (req, res) => {
    try {
      let totalConnections = 0;
      let totalActiveSessions = 0;
      let totalBytesTransferred = 0;

      for (const tunnelSession of tunnelManager.tunnels.values()) {
        const metrics = tunnelSession.getMetrics();
        totalConnections += metrics.totalConnections;
        totalActiveSessions += metrics.activeConnections;
        totalBytesTransferred += metrics.totalDataTransferred;
      }

      res.json({
        timestamp: new Date(),
        totalConnections,
        totalActiveSessions,
        totalBytesTransferred,
        dataTransferredFormatted: formatBytes(totalBytesTransferred),
        activeTunnels: tunnelManager.getTunnelCount()
      });
    } catch (error) {
      logger.error('خطا در دریافت آمار اتصالات', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * آمار بروز در زمان واقعی
   * GET /api/stats/live
   */
  router.get('/live', (req, res) => {
    try {
      const liveStats = [];

      for (const [tunnelId, tunnelSession] of tunnelManager.tunnels) {
        const metrics = tunnelSession.getMetrics();
        liveStats.push({
          tunnelId,
          activeConnections: metrics.activeConnections,
          bytesPerSecond: Math.round(metrics.totalDataTransferred / ((Date.now() - metrics.startTime) / 1000)),
          ping: metrics.connections.length > 0 
            ? Math.round(metrics.connections.reduce((sum, c) => sum + (c.ping || 0), 0) / metrics.connections.length)
            : 0,
          quality: getAverageQuality(metrics.connections),
          errorRate: metrics.errorCount
        });
      }

      res.json({
        timestamp: new Date(),
        liveStats,
        totalTunnels: liveStats.length
      });
    } catch (error) {
      logger.error('خطا در دریافت آمار زمان واقعی', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * سابقه اتصالات
   * GET /api/stats/history
   */
  router.get('/history/:tunnelId', async (req, res) => {
    try {
      const { tunnelId } = req.params;
      const limit = parseInt(req.query.limit) || 100;

      // Get connection history from database
      // This is a placeholder - implement actual database query
      res.json({
        tunnelId,
        connectionHistory: [],
        message: 'Connection history would be fetched from database'
      });
    } catch (error) {
      logger.error('خطا در دریافت سابقه اتصالات', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};

/**
 * کمکی - فرمت کردن بایت
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * کمکی - دریافت میانگین کیفیت
 */
function getAverageQuality(connections) {
  if (connections.length === 0) return 'نامعلوم';
  // Logic to determine average quality
  return 'خوب';
}
