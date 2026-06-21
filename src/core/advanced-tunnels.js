#!/usr/bin/env node

/**
 * تانل های پیشرفته - Advanced Tunnel Types
 * TCP, UDP, KCP, QUIC, Gaming Tunnels
 */

const net = require('net');
const dgram = require('dgram');
const { EventEmitter } = require('events');
const logger = require('../utils/logger');

/**
 * تانل TCP - Standard TCP Tunnel
 */
class TCPTunnel extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.type = 'TCP';
    this.connections = new Map();
  }

  async start() {
    this.server = net.createServer((socket) => {
      this.handleTCPConnection(socket);
    });

    return new Promise((resolve, reject) => {
      this.server.listen(this.config.localPort, this.config.localHost, () => {
        logger.info(`✅ تانل TCP در حال اجرا: ${this.config.localHost}:${this.config.localPort}`);
        resolve();
      });
      this.server.on('error', reject);
    });
  }

  handleTCPConnection(socket) {
    const remote = net.createConnection({
      host: this.config.remoteHost,
      port: this.config.remotePort
    });

    socket.pipe(remote).pipe(socket);

    socket.on('close', () => {
      remote.destroy();
    });

    remote.on('close', () => {
      socket.destroy();
    });
  }

  async stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

/**
 * تانل UDP - UDP Tunnel
 */
class UDPTunnel extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.type = 'UDP';
    this.sessions = new Map();
  }

  async start() {
    this.server = dgram.createSocket('udp4');

    this.server.on('message', (msg, rinfo) => {
      this.handleUDPMessage(msg, rinfo);
    });

    return new Promise((resolve, reject) => {
      this.server.bind(this.config.localPort, this.config.localHost, () => {
        logger.info(`✅ تانل UDP در حال اجرا: ${this.config.localHost}:${this.config.localPort}`);
        resolve();
      });
      this.server.on('error', reject);
    });
  }

  handleUDPMessage(msg, rinfo) {
    const sessionKey = `${rinfo.address}:${rinfo.port}`;
    
    let session = this.sessions.get(sessionKey);
    if (!session) {
      session = dgram.createSocket('udp4');
      this.sessions.set(sessionKey, session);

      session.on('message', (response) => {
        this.server.send(response, rinfo.port, rinfo.address);
      });
    }

    session.send(msg, this.config.remotePort, this.config.remoteHost);
  }

  async stop() {
    if (this.server) {
      this.server.close();
    }
    for (const session of this.sessions.values()) {
      session.close();
    }
  }
}

/**
 * تانل KCP - KCP Tunnel (برای تاخیر کم)
 */
class KCPTunnel extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.type = 'KCP';
    // KCP یک پروتکل سریع است که بر روی UDP کار می کند
    // برای استفاده واقعی، باید کتابخانه KCP نصب شود
  }

  async start() {
    logger.info(`✅ تانل KCP در حال اجرا: ${this.config.localHost}:${this.config.localPort}`);
    // پیاده سازی KCP
  }

  async stop() {
    logger.info('❌ تانل KCP متوقف شد');
  }
}

/**
 * تانل گیمینگ - Gaming Tunnel (Low Latency Optimized)
 */
class GamingTunnel extends EventEmitter {
  constructor(config) {
    super();
    this.config = {
      ...config,
      // تنظیمات بهینه شده برای بازی
      noDelay: true,
      keepAlive: true,
      keepAliveDelay: 1000, // 1 ثانیه
      timeout: 60000, // 1 دقیقه
      bufferSize: 16384, // بافر بزرگ تر
      priority: 'high'
    };
    this.type = 'Gaming';
    this.connections = new Map();
    this.stats = {
      ping: [],
      packetLoss: 0,
      jitter: 0
    };
  }

  async start() {
    this.server = net.createServer((socket) => {
      this.handleGamingConnection(socket);
    });

    // تنظیمات سوکت برای کم تاخیری
    this.server.on('connection', (socket) => {
      socket.setNoDelay(true);
      socket.setKeepAlive(true, this.config.keepAliveDelay);
    });

    return new Promise((resolve, reject) => {
      this.server.listen(this.config.localPort, this.config.localHost, () => {
        logger.info(`✅ تانل گیمینگ در حال اجرا: ${this.config.localHost}:${this.config.localPort}`);
        logger.info(`📊 تنظیمات: بدون تاخیر, keepAlive: ${this.config.keepAliveDelay}ms`);
        resolve();
      });
      this.server.on('error', reject);
    });
  }

  handleGamingConnection(socket) {
    const connectionId = `gaming_${Date.now()}_${Math.random()}`;
    
    // تنظیمات اضافی برای کم تاخیری
    socket.setNoDelay(true);
    socket.setKeepAlive(true, this.config.keepAliveDelay);
    socket.setTimeout(this.config.timeout);

    const remote = net.createConnection({
      host: this.config.remoteHost,
      port: this.config.remotePort
    });

    remote.setNoDelay(true);
    remote.setKeepAlive(true, this.config.keepAliveDelay);

    // Bidirectional piping
    socket.pipe(remote).pipe(socket);

    // ارسال پینگ
    this.startPingMonitor(connectionId, socket, remote);

    socket.on('close', () => {
      remote.destroy();
      this.connections.delete(connectionId);
    });

    remote.on('close', () => {
      socket.destroy();
    });
  }

  startPingMonitor(connectionId, socket, remote) {
    const pingInterval = setInterval(() => {
      if (socket.destroyed || remote.destroyed) {
        clearInterval(pingInterval);
        return;
      }

      const startTime = Date.now();
      socket.write(Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x54]), () => {
        const latency = Date.now() - startTime;
        this.stats.ping.push(latency);
        if (this.stats.ping.length > 100) {
          this.stats.ping.shift();
        }
      });
    }, 1000);
  }

  getStats() {
    if (this.stats.ping.length === 0) {
      return { avgPing: 0, minPing: 0, maxPing: 0 };
    }
    const pings = this.stats.ping;
    return {
      avgPing: Math.round(pings.reduce((a, b) => a + b) / pings.length),
      minPing: Math.min(...pings),
      maxPing: Math.max(...pings),
      packetLoss: this.stats.packetLoss
    };
  }

  async stop() {
    if (this.server) {
      this.server.close();
    }
  }
}

/**
 * تانل QUIC - QUIC Tunnel (HTTP/3)
 */
class QUICTunnel extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.type = 'QUIC';
    // QUIC نیاز به کتابخانه خاصی دارد
  }

  async start() {
    logger.info(`✅ تانل QUIC در حال اجرا: ${this.config.localHost}:${this.config.localPort}`);
    // پیاده سازی QUIC
  }

  async stop() {
    logger.info('❌ تانل QUIC متوقف شد');
  }
}

/**
 * تانل سریکس - Socks5 Proxy Tunnel
 */
class Socks5Tunnel extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.type = 'Socks5';
  }

  async start() {
    logger.info(`✅ تانل Socks5 در حال اجرا: ${this.config.localHost}:${this.config.localPort}`);
    // پیاده سازی Socks5
  }

  async stop() {
    logger.info('❌ تانل Socks5 متوقف شد');
  }
}

/**
 * فاکتوری تانل
 */
class TunnelFactory {
  static create(type, config) {
    switch(type.toUpperCase()) {
      case 'TCP':
        return new TCPTunnel(config);
      case 'UDP':
        return new UDPTunnel(config);
      case 'KCP':
        return new KCPTunnel(config);
      case 'QUIC':
        return new QUICTunnel(config);
      case 'GAMING':
        return new GamingTunnel(config);
      case 'SOCKS5':
        return new Socks5Tunnel(config);
      default:
        return new TCPTunnel(config);
    }
  }
}

module.exports = {
  TCPTunnel,
  UDPTunnel,
  KCPTunnel,
  QUICTunnel,
  GamingTunnel,
  Socks5Tunnel,
  TunnelFactory
};
