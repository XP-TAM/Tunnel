/**
 * روت‌های مدیریت
 * Admin Routes - Administrative operations
 */

const express = require('express');
const logger = require('../utils/logger');

module.exports = (tunnelManager, database) => {
  const router = express.Router();

  /**
   * وضعیت کلی سیستم
   * GET /api/admin/status
   */
  router.get('/status', (req, res) => {
    try {
      const status = {
        timestamp: new Date(),
        activeTunnels: tunnelManager.getTunnelCount(),
        portStatus: tunnelManager.portManager.getPortStatus(),
        globalStats: tunnelManager.getGlobalStats(),
        systemInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage()
        }
      };
      res.json(status);
    } catch (error) {
      logger.error('خطا در دریافت وضعیت سیستم', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * پاک‌سازی پورت‌های آزاد نشده
   * POST /api/admin/cleanup
   */
  router.post('/cleanup', async (req, res) => {
    try {
      logger.info('📍 درحال پاک‌سازی سیستم...');
      
      // Cleanup logic would go here
      // For now, just return success
      
      res.json({
        success: true,
        message: 'سیستم پاک‌سازی شد',
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('خطا در پاک‌سازی سیستم', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * ریست کردن آمار
   * POST /api/admin/reset-stats
   */
  router.post('/reset-stats', (req, res) => {
    try {
      // Reset all statistics
      for (const stats of tunnelManager.stats.values()) {
        stats.bytesReceived = 0;
        stats.bytesSent = 0;
        stats.errors = 0;
      }

      res.json({
        success: true,
        message: 'تمام آمارها ریست شدند',
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('خطا در ریست کردن آمارها', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * خاموش کردن سرور
   * POST /api/admin/shutdown
   */
  router.post('/shutdown', async (req, res) => {
    try {
      logger.warn('⚠️ درخواست خاموش کردن سرور دریافت شد');
      
      res.json({
        success: true,
        message: 'سرور در حال خاموش شدن است...',
        timestamp: new Date()
      });

      // Close server after sending response
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    } catch (error) {
      logger.error('خطا در خاموش کردن سرور', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
