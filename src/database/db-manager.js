/**
 * مدیریت بانک داده
 * Database Manager - SQLite database operations
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');
const fs = require('fs');

class DatabaseManager {
  constructor() {
    const dbPath = process.env.DB_PATH || './data/tunnel.db';
    const dbDir = path.dirname(dbPath);
    
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error('خطا در اتصال به بانک داده', err);
      } else {
        logger.info('✅ بانک داده متصل شد');
      }
    });
  }

  /**
   * راه‌اندازی جداول
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Tunnels table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS tunnels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tunnelId TEXT UNIQUE NOT NULL,
            config TEXT NOT NULL,
            ports TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            deletedAt DATETIME,
            finalStats TEXT
          )
        `);

        // Connection logs table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS connectionLogs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tunnelId TEXT NOT NULL,
            connectionId TEXT UNIQUE NOT NULL,
            source TEXT NOT NULL,
            destination TEXT NOT NULL,
            startTime DATETIME NOT NULL,
            endTime DATETIME NOT NULL,
            duration INTEGER NOT NULL,
            bytesReceived INTEGER DEFAULT 0,
            bytesSent INTEGER DEFAULT 0,
            packetsReceived INTEGER DEFAULT 0,
            packetsSent INTEGER DEFAULT 0,
            averagePing INTEGER DEFAULT 0,
            quality TEXT,
            errorCount INTEGER DEFAULT 0,
            errors TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Statistics table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS statistics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tunnelId TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            bytesReceived INTEGER DEFAULT 0,
            bytesSent INTEGER DEFAULT 0,
            packetsReceived INTEGER DEFAULT 0,
            packetsSent INTEGER DEFAULT 0,
            activeConnections INTEGER DEFAULT 0,
            averagePing INTEGER DEFAULT 0,
            errors INTEGER DEFAULT 0
          )
        `);

        // Create indexes
        this.db.run('CREATE INDEX IF NOT EXISTS idx_tunnelId ON tunnels(tunnelId)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_connTunnelId ON connectionLogs(tunnelId)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_statsTunnelId ON statistics(tunnelId)');

        logger.info('✅ جداول بانک داده آماده شدند');
        resolve();
      });
    });
  }

  /**
   * ذخیره تانل
   */
  async saveTunnel(tunnelData) {
    return new Promise((resolve, reject) => {
      const { tunnelId, config, ports, status, createdAt } = tunnelData;

      this.db.run(
        `INSERT INTO tunnels (tunnelId, config, ports, status, createdAt) VALUES (?, ?, ?, ?, ?)`,
        [tunnelId, JSON.stringify(config), JSON.stringify(ports), status, createdAt],
        (err) => {
          if (err) {
            logger.error(`خطا در ذخیره تانل ${tunnelId}`, err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * دریافت تانل
   */
  async getTunnel(tunnelId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT * FROM tunnels WHERE tunnelId = ?`,
        [tunnelId],
        (err, row) => {
          if (err) {
            reject(err);
          } else if (row) {
            resolve({
              ...row,
              config: JSON.parse(row.config),
              ports: JSON.parse(row.ports)
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  /**
   * دریافت تانل‌های فعال
   */
  async getActiveTunnels() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM tunnels WHERE status = 'active'`,
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve((rows || []).map(row => ({
              ...row,
              config: JSON.parse(row.config),
              ports: JSON.parse(row.ports)
            })));
          }
        }
      );
    });
  }

  /**
   * بروز رسانی وضعیت تانل
   */
  async updateTunnelStatus(tunnelId, status, additionalData = {}) {
    return new Promise((resolve, reject) => {
      const { deletedAt, finalStats } = additionalData;
      const finalStatsJson = finalStats ? JSON.stringify(finalStats) : null;

      this.db.run(
        `UPDATE tunnels SET status = ?, deletedAt = ?, finalStats = ?, updatedAt = CURRENT_TIMESTAMP WHERE tunnelId = ?`,
        [status, deletedAt, finalStatsJson, tunnelId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * بروز رسانی پورت‌های تانل
   */
  async updateTunnelPorts(tunnelId, newPorts) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE tunnels SET ports = ?, updatedAt = CURRENT_TIMESTAMP WHERE tunnelId = ?`,
        [JSON.stringify(newPorts), tunnelId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * ذخیره سیاق اتصال
   */
  async saveConnectionLog(logData) {
    return new Promise((resolve, reject) => {
      const {
        tunnelId, connectionId, source, destination, startTime, endTime,
        duration, bytesReceived, bytesSent, packetsReceived, packetsSent,
        averagePing, quality, errorCount, errors
      } = logData;

      this.db.run(
        `INSERT INTO connectionLogs (tunnelId, connectionId, source, destination, startTime, endTime, duration, bytesReceived, bytesSent, packetsReceived, packetsSent, averagePing, quality, errorCount, errors)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tunnelId, connectionId, JSON.stringify(source), JSON.stringify(destination), startTime, endTime, duration, bytesReceived, bytesSent, packetsReceived, packetsSent, averagePing, quality, errorCount, JSON.stringify(errors)],
        (err) => {
          if (err) {
            logger.error(`خطا در ذخیره سیاق اتصال`, err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  /**
   * بستن بانک داده
   */
  async close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          logger.error('خطا در بستن بانک داده', err);
          reject(err);
        } else {
          logger.info('✅ بانک داده بسته شد');
          resolve();
        }
      });
    });
  }
}

module.exports = DatabaseManager;