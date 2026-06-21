/**
 * جلسه تانل
 * Tunnel Session - Individual tunnel connection handler
 * 
 * مسئول:
 * - مدیریت اتصالات تک تانل
 * - نظارت بر پینگ و کیفیت اتصال
 * - شمارش داده‌های رد و بدل
 * - ثبت جزئیات هر اتصال
 */

const net = require('net');
const { EventEmitter } = require('events');
const logger = require('../utils/logger');
const PingMonitor = require('../monitor/ping-monitor');

class TunnelSession extends EventEmitter {
  constructor(config) {
    super();
    this.tunnelId = config.tunnelId;
    this.config = config.config;
    this.ports = config.ports;
    this.database = config.database;
    
    this.server = null;
    this.connections = new Map(); // { connectionId -> connection details }
    this.pingMonitor = null;
    this.isRunning = false;
    this.startTime = new Date();
    
    // Metrics
    this.totalBytesReceived = 0;
    this.totalBytesSent = 0;
    this.totalConnections = 0;
    this.totalDisconnections = 0;
    this.errorCount = 0;
  }

  /**
   * راه‌اندازی جلسه تانل
   */
  async initialize() {
    try {
      this.pingMonitor = new PingMonitor(this.config.remoteHost);
      await this.pingMonitor.start();

      this.server = net.createServer((socket) => {
        this.handleNewConnection(socket);
      });

      this.server.listen(this.ports[0], '0.0.0.0', () => {
        logger.info(`🔌 تانل آماده است: ${this.tunnelId} پورت ${this.ports[0]}`);
        this.isRunning = true;
      });

      this.server.on('error', (error) => {
        logger.error(`خطا در سرور تانل ${this.tunnelId}`, error);
        this.errorCount++;
      });

    } catch (error) {
      logger.error(`خطا در راه‌اندازی تانل ${this.tunnelId}`, error);
      throw error;
    }
  }

  /**
   * مدیریت اتصال جدید
   * Handle new incoming connection
   */
  handleNewConnection(socket) {
    const connectionId = this.generateConnectionId();
    
    logger.info(`✅ اتصال جدید: ${connectionId}`, {
      remoteAddress: socket.remoteAddress,
      remotePort: socket.remotePort
    });

    // Set socket options
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 60000);

    // Create connection object
    const connection = {
      id: connectionId,
      clientSocket: socket,
      remoteSocket: null,
      source: {
        host: socket.remoteAddress,
        port: socket.remotePort
      },
      destination: {
        host: this.config.remoteHost,
        port: this.config.remotePort
      },
      startTime: new Date(),
      endTime: null,
      bytesReceived: 0,
      bytesSent: 0,
      packetsReceived: 0,
      packetsSent: 0,
      status: 'connecting',
      ping: 0,
      packetLoss: 0,
      quality: 'unknown',
      errors: []
    };

    this.connections.set(connectionId, connection);
    this.totalConnections++;

    // Connect to remote server
    this.connectToRemote(connection);

    // Handle client data
    socket.on('data', (data) => {
      if (connection.remoteSocket && !connection.remoteSocket.destroyed) {
        connection.bytesSent += data.length;
        connection.packetsSent++;
        this.totalBytesSent += data.length;

        // Forward data to remote
        try {
          connection.remoteSocket.write(data, (err) => {
            if (err) {
              logger.error(`خطا در ارسال داده: ${connectionId}`, err);
              connection.errors.push({
                timestamp: new Date(),
                error: err.message,
                type: 'send'
              });
              this.errorCount++;
            }
          });
        } catch (error) {
          logger.error('خطا در نوشتن به سوکت', error);
          connection.errors.push({
            timestamp: new Date(),
            error: error.message,
            type: 'write'
          });
        }

        // Emit data event
        this.emit('data', {
          connectionId,
          direction: 'sent',
          bytes: data.length
        });
      }
    });

    // Handle client errors
    socket.on('error', (error) => {
      logger.error(`خطا در سوکت کلاینت ${connectionId}`, error);
      connection.errors.push({
        timestamp: new Date(),
        error: error.message,
        type: 'client'
      });
      this.errorCount++;
    });

    // Handle client close
    socket.on('close', () => {
      logger.info(`❌ اتصال کلاینت بسته شد: ${connectionId}`);
      this.handleConnectionClose(connectionId);
    });

    // Handle client timeout
    socket.on('timeout', () => {
      logger.warn(`⏱️ تایم‌آوت کلاینت: ${connectionId}`);
      socket.destroy();
      this.handleConnectionClose(connectionId);
    });

    socket.setTimeout(this.config.timeout || 3600000);
  }

  /**
   * اتصال به سرور ریموت
   * Connect to remote server
   */
  connectToRemote(connection) {
    try {
      const remoteSocket = net.createConnection({
        host: connection.destination.host,
        port: connection.destination.port,
        timeout: this.config.timeout || 3600000
      });

      remoteSocket.setNoDelay(true);
      remoteSocket.setKeepAlive(true, 60000);

      // On successful connection
      remoteSocket.on('connect', () => {
        logger.info(`✅ متصل به ریموت: ${connection.id}`);
        connection.status = 'connected';
        connection.remoteSocket = remoteSocket;

        // Start ping monitoring
        this.startPingMonitoring(connection);

        // Send connection metrics
        this.sendConnectionMetrics(connection);
      });

      // Handle remote data
      remoteSocket.on('data', (data) => {
        if (connection.clientSocket && !connection.clientSocket.destroyed) {
          connection.bytesReceived += data.length;
          connection.packetsReceived++;
          this.totalBytesReceived += data.length;

          try {
            connection.clientSocket.write(data, (err) => {
              if (err) {
                logger.error(`خطا در دریافت داده: ${connection.id}`, err);
                connection.errors.push({
                  timestamp: new Date(),
                  error: err.message,
                  type: 'receive'
                });
                this.errorCount++;
              }
            });
          } catch (error) {
            logger.error('خطا در نوشتن به کلاینت', error);
            connection.errors.push({
              timestamp: new Date(),
              error: error.message,
              type: 'write'
            });
          }

          // Emit data event
          this.emit('data', {
            connectionId: connection.id,
            direction: 'received',
            bytes: data.length
          });
        }
      });

      // Handle remote errors
      remoteSocket.on('error', (error) => {
        logger.error(`خطا در سوکت ریموت ${connection.id}`, error);
        connection.status = 'error';
        connection.errors.push({
          timestamp: new Date(),
          error: error.message,
          type: 'remote'
        });
        this.errorCount++;
      });

      // Handle remote close
      remoteSocket.on('close', () => {
        logger.info(`❌ اتصال ریموت بسته شد: ${connection.id}`);
        this.handleConnectionClose(connection.id);
      });

      remoteSocket.on('timeout', () => {
        logger.warn(`⏱️ تایم‌آوت ریموت: ${connection.id}`);
        remoteSocket.destroy();
        this.handleConnectionClose(connection.id);
      });

    } catch (error) {
      logger.error(`خطا در اتصال به ریموت ${connection.id}`, error);
      connection.status = 'failed';
      connection.errors.push({
        timestamp: new Date(),
        error: error.message,
        type: 'connection'
      });
      this.errorCount++;
      
      connection.clientSocket.destroy();
      this.handleConnectionClose(connection.id);
    }
  }

  /**
   * نظارت بر پینگ
   * Monitor ping for connection
   */
  startPingMonitoring(connection) {
    const pingInterval = setInterval(async () => {
      if (!this.connections.has(connection.id)) {
        clearInterval(pingInterval);
        return;
      }

      try {
        const ping = await this.pingMonitor.ping();
        connection.ping = ping;
        
        // Calculate quality based on ping
        if (ping < 50) {
          connection.quality = 'عالی';
        } else if (ping < 100) {
          connection.quality = 'خوب';
        } else if (ping < 200) {
          connection.quality = 'متوسط';
        } else {
          connection.quality = 'ضعیف';
        }

        this.emit('metrics', {
          connectionId: connection.id,
          ping,
          quality: connection.quality
        });

      } catch (error) {
        logger.error(`خطا در محاسبه پینگ ${connection.id}`, error);
      }
    }, 5000); // Every 5 seconds

    connection.pingInterval = pingInterval;
  }

  /**
   * ارسال معیارهای اتصال
   */
  sendConnectionMetrics(connection) {
    const metrics = {
      connectionId: connection.id,
      source: connection.source,
      destination: connection.destination,
      status: connection.status,
      startTime: connection.startTime
    };

    this.emit('metrics', metrics);
  }

  /**
   * بستن اتصال
   * Handle connection close
   */
  handleConnectionClose(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    logger.info(`📊 بستن اتصال: ${connectionId}`, {
      duration: new Date() - connection.startTime,
      bytesReceived: connection.bytesReceived,
      bytesSent: connection.bytesSent
    });

    // Clear ping interval
    if (connection.pingInterval) {
      clearInterval(connection.pingInterval);
    }

    // Close sockets
    if (connection.clientSocket && !connection.clientSocket.destroyed) {
      connection.clientSocket.destroy();
    }
    if (connection.remoteSocket && !connection.remoteSocket.destroyed) {
      connection.remoteSocket.destroy();
    }

    connection.endTime = new Date();
    connection.status = 'closed';
    this.totalDisconnections++;

    // Save connection log
    this.saveConnectionLog(connection);

    // Remove from active connections
    this.connections.delete(connectionId);
  }

  /**
   * ذخیره سیاق اتصال
   */
  async saveConnectionLog(connection) {
    try {
      await this.database.saveConnectionLog({
        tunnelId: this.tunnelId,
        connectionId: connection.id,
        source: connection.source,
        destination: connection.destination,
        startTime: connection.startTime,
        endTime: connection.endTime,
        duration: connection.endTime - connection.startTime,
        bytesReceived: connection.bytesReceived,
        bytesSent: connection.bytesSent,
        packetsReceived: connection.packetsReceived,
        packetsSent: connection.packetsSent,
        averagePing: connection.ping,
        quality: connection.quality,
        errorCount: connection.errors.length,
        errors: connection.errors
      });
    } catch (error) {
      logger.error(`خطا در ذخیره سیاق اتصال ${connection.id}`, error);
    }
  }

  /**
   * دریافت اتصالات فعال
   */
  getActiveConnections() {
    return Array.from(this.connections.values());
  }

  /**
   * دریافت معیارها
   */
  getMetrics() {
    return {
      tunnelId: this.tunnelId,
      isRunning: this.isRunning,
      startTime: this.startTime,
      uptime: new Date() - this.startTime,
      totalConnections: this.totalConnections,
      totalDisconnections: this.totalDisconnections,
      activeConnections: this.connections.size,
      totalBytesReceived: this.totalBytesReceived,
      totalBytesSent: this.totalBytesSent,
      totalDataTransferred: this.totalBytesReceived + this.totalBytesSent,
      averageConnectionDuration: this.getAverageConnectionDuration(),
      errorCount: this.errorCount,
      connections: Array.from(this.connections.values()).map(conn => ({
        id: conn.id,
        status: conn.status,
        ping: conn.ping,
        quality: conn.quality,
        bytesReceived: conn.bytesReceived,
        bytesSent: conn.bytesSent,
        duration: conn.remoteSocket ? new Date() - conn.startTime : 0
      }))
    };
  }

  /**
   * دریافت میانگین مدت اتصال
   */
  getAverageConnectionDuration() {
    if (this.totalDisconnections === 0) return 0;
    // این باید از بانک داده محاسبه شود
    return 0;
  }

  /**
   * دریافت پورت‌ها
   */
  getPorts() {
    return this.ports;
  }

  /**
   * بروز رسانی پورت‌ها
   */
  async updatePorts(newPorts) {
    this.ports = newPorts;
    // بازشروع سرور با پورت‌های جدید
    await this.close();
    await this.initialize();
  }

  /**
   * تولید شناسه اتصال
   */
  generateConnectionId() {
    return `conn_${this.tunnelId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * بستن تانل
   */
  async close() {
    try {
      logger.info(`📍 بستن تانل: ${this.tunnelId}`);

      // Close all connections
      const connectionIds = Array.from(this.connections.keys());
      for (const connectionId of connectionIds) {
        this.handleConnectionClose(connectionId);
      }

      // Close server
      if (this.server) {
        this.server.close();
      }

      // Stop ping monitor
      if (this.pingMonitor) {
        await this.pingMonitor.stop();
      }

      this.isRunning = false;
      logger.info(`✅ تانل بسته شد: ${this.tunnelId}`);

    } catch (error) {
      logger.error(`خطا در بستن تانل ${this.tunnelId}`, error);
      throw error;
    }
  }
}

module.exports = TunnelSession;
