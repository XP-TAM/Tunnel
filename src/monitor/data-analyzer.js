/**
 * تجزیه داده‌ها
 * Data Analyzer - Analyze bandwidth and traffic patterns
 */

const logger = require('../utils/logger');

class DataAnalyzer {
  constructor() {
    this.dataPoints = new Map(); // { tunnelId -> [data] }
  }

  /**
   * ثبت نقطه داده
   */
  recordDataPoint(tunnelId, data) {
    if (!this.dataPoints.has(tunnelId)) {
      this.dataPoints.set(tunnelId, []);
    }

    const point = {
      timestamp: Date.now(),
      bytes: data.bytes,
      direction: data.direction
    };

    this.dataPoints.get(tunnelId).push(point);

    // Keep only last 1000 points
    const points = this.dataPoints.get(tunnelId);
    if (points.length > 1000) {
      points.shift();
    }
  }

  /**
   * محاسبه پهنای باند
   */
  calculateBandwidth(tunnelId, timeWindowMs = 1000) {
    const points = this.dataPoints.get(tunnelId) || [];
    if (points.length === 0) return 0;

    const now = Date.now();
    const recentPoints = points.filter(p => now - p.timestamp <= timeWindowMs);

    const totalBytes = recentPoints.reduce((sum, p) => sum + p.bytes, 0);
    const bandwidth = (totalBytes * 8) / (timeWindowMs / 1000); // bits per second

    return bandwidth;
  }

  /**
   * دریافت آمار ترافیک
   */
  getTrafficStats(tunnelId) {
    const points = this.dataPoints.get(tunnelId) || [];
    if (points.length === 0) {
      return { current: 0, avg: 0, peak: 0, total: 0 };
    }

    const currentBandwidth = this.calculateBandwidth(tunnelId, 1000);
    const avgBandwidth = this.calculateBandwidth(tunnelId, 5000);
    const peakBandwidth = this.calculateBandwidth(tunnelId, 100);
    const totalBytes = points.reduce((sum, p) => sum + p.bytes, 0);

    return {
      current: Math.round(currentBandwidth / 1024 / 1024), // Mbps
      average: Math.round(avgBandwidth / 1024 / 1024),
      peak: Math.round(peakBandwidth / 1024 / 1024),
      total: totalBytes,
      totalFormatted: this.formatBytes(totalBytes)
    };
  }

  /**
   * فرمت‌کردن بایت
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = DataAnalyzer;