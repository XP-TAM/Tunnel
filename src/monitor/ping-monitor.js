/**
 * نظارت بر پینگ
 * Ping Monitor - Real-time connection latency monitoring
 */

const { promisify } = require('util');
const { exec } = require('child_process');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

class PingMonitor {
  constructor(host) {
    this.host = host;
    this.pings = [];
    this.maxPings = 100;
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
  }

  /**
   * اندازه‌گیری پینگ
   */
  async ping() {
    try {
      const startTime = Date.now();
      
      const command = process.platform === 'win32' 
        ? `ping -n 1 ${this.host}` 
        : `ping -c 1 ${this.host}`;

      await execAsync(command, { timeout: 5000 });
      const latency = Date.now() - startTime;

      this.pings.push({
        timestamp: new Date(),
        latency
      });

      // Keep only last 100 pings
      if (this.pings.length > this.maxPings) {
        this.pings.shift();
      }

      return latency;

    } catch (error) {
      logger.error(`خطا در ping ${this.host}`, error);
      return null;
    }
  }

  /**
   * دریافت میانگین پینگ
   */
  getAveragePing() {
    if (this.pings.length === 0) return 0;
    const sum = this.pings.reduce((acc, p) => acc + p.latency, 0);
    return Math.round(sum / this.pings.length);
  }

  /**
   * دریافت آمار پینگ
   */
  getStats() {
    if (this.pings.length === 0) {
      return { average: 0, min: 0, max: 0, current: 0 };
    }

    const latencies = this.pings.map(p => p.latency);
    return {
      average: Math.round(latencies.reduce((a, b) => a + b) / latencies.length),
      min: Math.min(...latencies),
      max: Math.max(...latencies),
      current: latencies[latencies.length - 1],
      samples: latencies.length
    };
  }

  async stop() {
    this.isRunning = false;
  }
}

module.exports = PingMonitor;