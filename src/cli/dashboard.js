#!/usr/bin/env node

/**
 * سیستم تانل - داشبورد تعاملی
 * Interactive Dashboard CLI
 */

const blessed = require('blessed');
const contrib = require('blessed-contrib');
const axios = require('axios');

const API_URL = process.env.TUNNEL_API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || '';

class TunnelDashboard {
  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      mouse: true,
      title: 'Tunnel Server Dashboard'
    });

    this.grid = new contrib.grid({
      rows: 12,
      cols: 12,
      screen: this.screen
    });

    this.setupLayout();
    this.setupKeyBindings();
    this.startDataUpdates();
  }

  setupLayout() {
    // Header
    this.header = this.screen.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: '{center}{cyan-fg}🚀 Advanced Tunnel Server Dashboard{/cyan-fg}{/center}',
      border: {
        fg: 'cyan'
      }
    });

    // Status Box
    this.statusBox = this.grid.set(1, 0, 2, 3, blessed.box, {
      label: 'Status',
      content: '{cyan-fg}Loading...{/cyan-fg}',
      tags: true,
      border: {
        fg: 'blue'
      }
    });

    // Tunnels List
    this.tunnelsList = this.grid.set(1, 3, 5, 4, contrib.table, {
      keys: true,
      fg: 'white',
      selectedFg: 'white',
      selectedBg: 'blue',
      interactive: true,
      label: 'Active Tunnels',
      width: '100%',
      height: '100%',
      columnSpacing: 3,
      columnWidth: [15, 10, 12, 15]
    });

    this.tunnelsList.setData({
      headers: ['Tunnel ID', 'Status', 'Connections', 'Data'],
      data: []
    });

    // System Stats
    this.sysStats = this.grid.set(1, 7, 5, 5, blessed.box, {
      label: 'System Statistics',
      content: '{cyan-fg}Loading...{/cyan-fg}',
      tags: true,
      border: {
        fg: 'green'}
    });

    // Bandwidth Chart
    this.bandwidthChart = this.grid.set(6, 0, 3, 6, contrib.line, {
      label: 'Bandwidth Usage (Mbps)',
      showLegend: true,
      xLabelPadding: 3,
      xPadding: 5
    });

    this.bandwidthChart.addSeries({
      title: 'Download',
      style: { line: 'green' }
    });
    this.bandwidthChart.addSeries({
      title: 'Upload',
      style: { line: 'blue' }
    });

    // Connection Chart
    this.connChart = this.grid.set(6, 6, 3, 6, contrib.bar, {
      label: 'Connection Count by Tunnel',
      barWidth: 4,
      barSpacing: 6,
      maxHeight: 9
    });

    // Log Box
    this.logBox = this.grid.set(9, 0, 3, 12, blessed.box, {
      label: 'Event Log',
      content: '{cyan-fg}System started...{/cyan-fg}',
      tags: true,
      scrollable: true,
      mouse: true,
      keys: true,
      vi: true,
      border: {
        fg: 'yellow'
      },
      style: {
        scrollbar: {
          bg: 'yellow'
        }
      }
    });

    this.logMessages = [];
  }

  setupKeyBindings() {
    this.screen.key(['escape', 'q', 'C-c'], () => {
      return process.exit(0);
    });

    this.screen.key(['r'], () => {
      this.updateData();
      this.screen.render();
    });

    this.screen.key(['c'], async () => {
      await this.showCreateTunnelDialog();
    });

    this.screen.key(['d'], async () => {
      await this.showDeleteTunnelDialog();
    });

    this.screen.key(['h'], () => {
      this.showHelp();
    });
  }

  async updateData() {
    try {
      const response = await axios.get(`${API_URL}/api/stats/global`, {
        headers: { 'x-api-key': API_KEY }
      });

      const data = response.data;

      // Update status
      this.statusBox.setContent(
        `{cyan-fg}Active Tunnels:{/cyan-fg} ${data.activeTunnels}\n` +
        `{green-fg}Connections:{/green-fg} ${data.totalConnections}\n` +
        `{blue-fg}Total Data:{/blue-fg} ${this.formatBytes(data.totalDataTransferred)}`
      );

      // Update tunnels list
      await this.updateTunnelsList();

      // Update system stats
      this.updateSysStats(data);
    } catch (error) {
      this.logBox.setContent(`{red-fg}Error: ${error.message}{/red-fg}`);
    }

    this.screen.render();
  }

  async updateTunnelsList() {
    try {
      const response = await axios.get(`${API_URL}/api/tunnels/list`, {
        headers: { 'x-api-key': API_KEY }
      });

      const tunnels = response.data.tunnels || [];
      const data = tunnels.map(t => [
        t.tunnelId.substring(0, 15),
        t.status,
        t.statistics.activeConnections,
        this.formatBytes(t.statistics.bytesReceived + t.statistics.bytesSent)
      ]);

      this.tunnelsList.setData({
        headers: ['Tunnel ID', 'Status', 'Connections', 'Data'],
        data: data
      });
    } catch (error) {
      this.addLog(`Error updating tunnels: ${error.message}`);
    }
  }

  updateSysStats(data) {
    const mem = data.memoryUsage;
    const uptime = Math.floor(data.uptime / 3600);

    this.sysStats.setContent(
      `{cyan-fg}Memory:{/cyan-fg}\n` +
      `  Heap: ${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB\n\n` +
      `{green-fg}Uptime:{/green-fg}\n` +
      `  ${uptime} hours\n\n` +
      `{blue-fg}Errors:{/blue-fg}\n` +
      `  ${data.totalErrors}`
    );
  }

  async showCreateTunnelDialog() {
    this.addLog('Create Tunnel feature - Coming soon');
  }

  async showDeleteTunnelDialog() {
    this.addLog('Delete Tunnel feature - Coming soon');
  }

  showHelp() {
    this.addLog('Help: r=Refresh, c=Create, d=Delete, h=Help, q=Quit');
  }

  addLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    this.logMessages.push(`[${timestamp}] ${message}`);
    if (this.logMessages.length > 100) this.logMessages.shift();
    this.logBox.setContent(this.logMessages.join('\n'));
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  startDataUpdates() {
    this.updateData();
    setInterval(() => this.updateData(), 2000);
  }
}

if (require.main === module) {
  try {
    new TunnelDashboard();
  } catch (error) {
    console.error('Error starting dashboard:', error.message);
    process.exit(1);
  }
}

module.exports = TunnelDashboard;
