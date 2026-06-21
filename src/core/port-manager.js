/**
 * مدیریت پورت‌ها
 * Port Manager - Allocate and manage tunnel ports
 * 
 * مسئول:
 * - تخصیص پورت‌های خالی
 * - انتشار پورت‌های آزاد شده
 * - نگاه‌داری فهرست پورت‌های استفاده شده
 */

const logger = require('../utils/logger');

class PortManager {
  constructor() {
    this.portRangeStart = parseInt(process.env.TUNNEL_PORT_RANGE_START) || 4000;
    this.portRangeEnd = parseInt(process.env.TUNNEL_PORT_RANGE_END) || 5000;
    this.allocatedPorts = new Map(); // { port -> tunnelId }
    this.availablePorts = new Set();
    this.portLocks = new Map(); // { port -> isLocked }
  }

  /**
   * راه‌اندازی مدیریت پورت
   */
  async initialize() {
    try {
      logger.info(`📍 راه‌اندازی مدیریت پورت (${this.portRangeStart} - ${this.portRangeEnd})`);

      // Initialize available ports
      for (let port = this.portRangeStart; port <= this.portRangeEnd; port++) {
        this.availablePorts.add(port);
        this.portLocks.set(port, false);
      }

      logger.info(`✅ ${this.availablePorts.size} پورت آماده شد`);

    } catch (error) {
      logger.error('خطا در راه‌اندازی مدیریت پورت', error);
      throw error;
    }
  }

  /**
   * تخصیص پورت‌ها
   * Allocate ports for tunnel
   */
  async allocatePorts(tunnelId, portCount = 1) {
    try {
      logger.info(`📍 درخواست ${portCount} پورت برای ${tunnelId}`);

      const allocatedPorts = [];

      for (let i = 0; i < portCount; i++) {
        const port = this.findAvailablePort();

        if (!port) {
          throw new Error(`❌ پورت خالی برای تخصیص یافت نشد. تعداد پورت‌های خالی: ${this.availablePorts.size}`);
        }

        // Lock port
        this.portLocks.set(port, true);

        // Mark as allocated
        this.availablePorts.delete(port);
        this.allocatedPorts.set(port, tunnelId);

        allocatedPorts.push(port);
      }

      logger.info(`✅ پورت‌های تخصیص داده شده: ${allocatedPorts.join(', ')} برای ${tunnelId}`);

      return allocatedPorts;

    } catch (error) {
      logger.error(`خطا در تخصیص پورت برای ${tunnelId}`, error);
      throw error;
    }
  }

  /**
   * یافتن پورت در دسترس
   * Find available port
   */
  findAvailablePort() {
    for (const port of this.availablePorts) {
      if (!this.portLocks.get(port)) {
        return port;
      }
    }
    return null;
  }

  /**
   * انتشار پورت
   * Release port
   */
  async releasePort(port, tunnelId) {
    try {
      logger.info(`📍 انتشار پورت ${port} از ${tunnelId}`);

      if (!this.allocatedPorts.has(port)) {
        logger.warn(`⚠️ پورت ${port} قبلاً انتشار داده شده بود`);
        return;
      }

      // Verify ownership
      if (this.allocatedPorts.get(port) !== tunnelId) {
        throw new Error(`❌ پورت ${port} متعلق به ${tunnelId} نیست`);
      }

      // Unlock port
      this.portLocks.set(port, false);

      // Mark as available
      this.allocatedPorts.delete(port);
      this.availablePorts.add(port);

      logger.info(`✅ پورت ${port} انتشار داده شد`);

    } catch (error) {
      logger.error(`خطا در انتشار پورت ${port}`, error);
      throw error;
    }
  }

  /**
   * دریافت وضعیت پورت‌ها
   * Get port status
   */
  getPortStatus() {
    return {
      portRange: {
        start: this.portRangeStart,
        end: this.portRangeEnd,
        total: this.portRangeEnd - this.portRangeStart + 1
      },
      availablePorts: this.availablePorts.size,
      allocatedPorts: this.allocatedPorts.size,
      usage: {
        percentage: Math.round((this.allocatedPorts.size / (this.portRangeEnd - this.portRangeStart + 1)) * 100),
        allocated: this.allocatedPorts.size,
        available: this.availablePorts.size
      },
      allocatedByTunnel: this.getPortsByTunnel()
    };
  }

  /**
   * دریافت پورت‌های تخصیص داده شده برای هر تانل
   */
  getPortsByTunnel() {
    const portsByTunnel = {};

    for (const [port, tunnelId] of this.allocatedPorts) {
      if (!portsByTunnel[tunnelId]) {
        portsByTunnel[tunnelId] = [];
      }
      portsByTunnel[tunnelId].push(port);
    }

    return portsByTunnel;
  }

  /**
   * بررسی اگر پورت در دسترس است
   */
  isPortAvailable(port) {
    return this.availablePorts.has(port) && !this.portLocks.get(port);
  }

  /**
   * دریافت تانل مالک پورت
   */
  getPortOwner(port) {
    return this.allocatedPorts.get(port);
  }
}

module.exports = PortManager;
