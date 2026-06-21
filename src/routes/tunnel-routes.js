/**
 * روت‌های تانل
 * Tunnel Routes - API endpoints for tunnel management
 */

const express = require('express');
const logger = require('../utils/logger');

module.exports = (tunnelManager) => {
  const router = express.Router();

  /**
   * ایجاد تانل جدید
   * POST /api/tunnels/create
   */
  router.post('/create', async (req, res, next) => {
    try {
      const { localHost, localPort, remoteHost, remotePort, name, description, portCount } = req.body;

      const tunnel = await tunnelManager.createTunnel({
        localHost,
        localPort,
        remoteHost,
        remotePort,
        name: name || `tunnel_${Date.now()}`,
        description,
        portCount: portCount || 1,
        timeout: 3600000
      });

      res.status(201).json(tunnel);
    } catch (error) {
      logger.error('خطا در ایجاد تانل', error);
      res.status(400).json({
        error: error.message,
        success: false
      });
    }
  });

  /**
   * دریافت تمام تا��ل‌ها
   * GET /api/tunnels/list
   */
  router.get('/list', async (req, res, next) => {
    try {
      const tunnels = await tunnelManager.getAllTunnels();
      res.json(tunnels);
    } catch (error) {
      logger.error('خطا در دریافت لیست تانل‌ها', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * دریافت جزئیات تانل
   * GET /api/tunnels/:tunnelId
   */
  router.get('/:tunnelId', async (req, res, next) => {
    try {
      const { tunnelId } = req.params;
      const details = await tunnelManager.getTunnelDetails(tunnelId);
      res.json(details);
    } catch (error) {
      logger.error(`خطا در دریافت جزئیات تانل ${req.params.tunnelId}`, error);
      res.status(404).json({ error: error.message });
    }
  });

  /**
   * حذف تانل
   * DELETE /api/tunnels/:tunnelId
   */
  router.delete('/:tunnelId', async (req, res, next) => {
    try {
      const { tunnelId } = req.params;
      const result = await tunnelManager.deleteTunnel(tunnelId);
      res.json(result);
    } catch (error) {
      logger.error(`خطا در حذف تانل ${req.params.tunnelId}`, error);
      res.status(400).json({
        error: error.message,
        success: false
      });
    }
  });

  /**
   * تغییر پورت‌های تانل
   * PUT /api/tunnels/:tunnelId/ports
   */
  router.put('/:tunnelId/ports', async (req, res, next) => {
    try {
      const { tunnelId } = req.params;
      const { newPorts } = req.body;

      if (!newPorts || !Array.isArray(newPorts)) {
        return res.status(400).json({
          error: 'لطفاً آرایه‌ای از پورت‌های جدید بفرستید'
        });
      }

      const result = await tunnelManager.changeTunnelPorts(tunnelId, newPorts);
      res.json(result);
    } catch (error) {
      logger.error(`خطا در تغییر پورت تانل ${req.params.tunnelId}`, error);
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * دریافت اتصالات فعال تانل
   * GET /api/tunnels/:tunnelId/connections
   */
  router.get('/:tunnelId/connections', async (req, res, next) => {
    try {
      const { tunnelId } = req.params;
      const tunnelSession = tunnelManager.tunnels?.get(tunnelId);
      
      if (!tunnelSession) {
        return res.status(404).json({ error: 'تانل یافت نشد' });
      }

      const connections = tunnelSession.getActiveConnections();
      res.json({
        tunnelId,
        activeConnections: connections.length,
        connections: connections.map(conn => ({
          id: conn.id,
          source: conn.source,
          destination: conn.destination,
          status: conn.status,
          ping: conn.ping,
          quality: conn.quality,
          bytesReceived: conn.bytesReceived,
          bytesSent: conn.bytesSent,
          packetsReceived: conn.packetsReceived,
          packetsSent: conn.packetsSent,
          duration: new Date() - conn.startTime,
          errors: conn.errors.length
        }))
      });
    } catch (error) {
      logger.error(`خطا در دریافت اتصالات تانل`, error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * دریافت آمار تانل
   * GET /api/tunnels/:tunnelId/stats
   */
  router.get('/:tunnelId/stats', async (req, res, next) => {
    try {
      const { tunnelId } = req.params;
      const tunnelSession = tunnelManager.tunnels?.get(tunnelId);
      
      if (!tunnelSession) {
        return res.status(404).json({ error: 'تانل یافت نشد' });
      }

      const metrics = tunnelSession.getMetrics();
      res.json(metrics);
    } catch (error) {
      logger.error(`خطا در دریافت آمار تانل`, error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * دریافت وضعیت پورت‌ها
   * GET /api/tunnels/ports/status
   */
  router.get('/ports/status', (req, res) => {
    try {
      const portStatus = tunnelManager.portManager.getPortStatus();
      res.json(portStatus);
    } catch (error) {
      logger.error('خطا در دریافت وضعیت پورت‌ها', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
