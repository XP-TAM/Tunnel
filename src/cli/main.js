#!/usr/bin/env node

/**
 * CLI اصلی - Main CLI Interface
 * رابط کاربری تعاملی برای مدیریت تانل‌ها
 */

const readline = require('readline');
const chalk = require('chalk');
const axios = require('axios');
const Table = require('cli-table3');

const API_URL = process.env.TUNNEL_API_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || 'your-api-key';

class TunnelCLI {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.running = true;
  }

  async start() {
    this.printHeader();
    await this.mainMenu();
  }

  printHeader() {
    console.clear();
    console.log(chalk.cyan(`
╔════════════════════════════════════════════════════════════════════════════╗
║                  🚀 Advanced Tunnel Server Management 🚀                    ║
║                       سیستم مدیریت تانل پیشرفته                            ║
╚════════════════════════════════════════════════════════════════════════════╝
    `));
  }

  async mainMenu() {
    while (this.running) {
      console.log(chalk.blue(`
┌─────────────────────────────────────────────────────────┐
│              📋 منو اصلی - Main Menu                    │
├───────────────────────────────────���─────────────────────┤
│ 1) �� ایجاد تانل جدید          - Create New Tunnel   │
│ 2) 📊 لیست تانل‌ها              - List All Tunnels    │
│ 3) 👁️  مشاهده جزئیات تانل       - View Tunnel Details │
│ 4) ❌ حذف تانل                  - Delete Tunnel      │
│ 5) 📈 مشاهده آمارها             - View Statistics    │
│ 6) 🎮 ایجاد تانل گیمینگ         - Create Gaming Tunnel│
│ 7) 🌐 تنظیمات شبکه              - Network Settings   │
│ 8) 📝 مشاهده لاگ‌ها              - View Logs          │
│ 9) ❓ راهنما                     - Help               │
│ 0) 🚪 خروج                      - Exit               │
└─────────────────────────────────────────────────────────┘
    `));

      const choice = await this.prompt('لطفاً انتخاب کنید (0-9): ');

      switch(choice) {
        case '1':
          await this.createTunnel();
          break;
        case '2':
          await this.listTunnels();
          break;
        case '3':
          await this.viewTunnelDetails();
          break;
        case '4':
          await this.deleteTunnel();
          break;
        case '5':
          await this.viewStatistics();
          break;
        case '6':
          await this.createGamingTunnel();
          break;
        case '7':
          await this.networkSettings();
          break;
        case '8':
          await this.viewLogs();
          break;
        case '9':
          this.showHelp();
          break;
        case '0':
          this.running = false;
          console.log(chalk.green('\n👋 خداحافظ!\n'));
          this.rl.close();
          break;
        default:
          console.log(chalk.red('❌ انتخاب نامعتبر!'));
      }

      if (this.running && choice !== '0') {
        await this.prompt('فشار دهید Enter برای ادامه...');
      }
    }
  }

  async createTunnel() {
    console.clear();
    console.log(chalk.cyan('\n🔌 ایجاد تانل جدید - Create New Tunnel\n'));

    const name = await this.prompt('نام تانل: ');
    const type = await this.selectTunnelType();
    const localHost = await this.prompt('میزبان محلی (مثال: 127.0.0.1): ', '127.0.0.1');
    const localPort = await this.prompt('پورت محلی (مثال: 8080): ', '8080');
    const remoteHost = await this.prompt('میزبان دور (مثال: example.com): ');
    const remotePort = await this.prompt('پورت دور (مثال: 80): ', '80');
    const description = await this.prompt('توضیحات (اختیاری): ', '');

    try {
      const response = await axios.post(`${API_URL}/api/tunnels/create`, {
        name,
        type,
        localHost,
        localPort: parseInt(localPort),
        remoteHost,
        remotePort: parseInt(remotePort),
        description,
        portCount: 1
      }, {
        headers: { 'x-api-key': API_KEY }
      });

      console.log(chalk.green(`\n✅ تانل با موفقیت ایجاد شد!\n`));
      this.printTunnelInfo(response.data);
    } catch (error) {
      console.log(chalk.red(`\n❌ خطا: ${error.response?.data?.message || error.message}\n`));
    }
  }

  async selectTunnelType() {
    console.log(chalk.blue('\nنوع تانل:'));
    console.log('1) TCP      - استاندارد (Standard)');
    console.log('2) UDP      - پروتکل داتاگرام (Datagram)');
    console.log('3) Gaming   - بهینه شده برای بازی (Optimized for Games)');
    console.log('4) KCP      - سریع (Fast Protocol)');
    console.log('5) QUIC     - HTTP/3');
    console.log('6) Socks5   - پروکسی (Proxy)');

    const typeMap = {
      '1': 'TCP',
      '2': 'UDP',
      '3': 'Gaming',
      '4': 'KCP',
      '5': 'QUIC',
      '6': 'Socks5'
    };

    const choice = await this.prompt('انتخاب نوع (1-6): ', '1');
    return typeMap[choice] || 'TCP';
  }

  async listTunnels() {
    console.clear();
    console.log(chalk.cyan('\n📊 لیست تانل‌ها\n'));

    try {
      const response = await axios.get(`${API_URL}/api/tunnels/list`, {
        headers: { 'x-api-key': API_KEY }
      });

      if (!response.data.tunnels || response.data.tunnels.length === 0) {
        console.log(chalk.yellow('⚠️  هیچ تانلی یافت نشد\n'));
        return;
      }

      const table = new Table({
        head: [
          chalk.cyan('ID'),
          chalk.cyan('نام'),
          chalk.cyan('نوع'),
          chalk.cyan('وضعیت'),
          chalk.cyan('اتصالات'),
          chalk.cyan('داده')
        ],
        style: {
          head: [],
          border: ['cyan']
        },
        colWidths: [20, 15, 10, 12, 12, 15]
      });

      for (const tunnel of response.data.tunnels) {
        table.push([
          tunnel.tunnelId.substring(0, 18),
          tunnel.config?.name || 'N/A',
          tunnel.config?.type || 'TCP',
          chalk.green(tunnel.status),
          tunnel.statistics?.activeConnections || 0,
          this.formatBytes(tunnel.statistics?.bytesReceived + tunnel.statistics?.bytesSent || 0)
        ]);
      }

      console.log(table.toString());
      console.log(chalk.green(`\n✅ کل تانل‌ها: ${response.data.totalTunnels}\n`));
    } catch (error) {
      console.log(chalk.red(`\n❌ خطا: ${error.message}\n`));
    }
  }

  async createGamingTunnel() {
    console.clear();
    console.log(chalk.magenta('\n🎮 ایجاد تانل گیمینگ - Create Gaming Tunnel\n'));
    console.log(chalk.blue('تانل گیمینگ برای بازی‌های آنلاین بهینه شده است'));
    console.log(chalk.blue('با پینگ کم و بدون تاخیر\n'));

    const name = await this.prompt('نام تانل گیمینگ (مثال: CSGO Server): ');
    const gameType = await this.promptGameType();
    const localPort = await this.prompt('پورت محلی (مثال: 27015): ', '27015');
    const remoteHost = await this.prompt('میزبان سرور (Server IP/Domain): ');
    const remotePort = await this.prompt('پورت سرور (Server Port): ', '27015');

    try {
      const response = await axios.post(`${API_URL}/api/tunnels/create`, {
        name,
        type: 'Gaming',
        localHost: '127.0.0.1',
        localPort: parseInt(localPort),
        remoteHost,
        remotePort: parseInt(remotePort),
        gameType,
        description: `Gaming Tunnel optimized for ${gameType}`,
        portCount: 1
      }, {
        headers: { 'x-api-key': API_KEY }
      });

      console.log(chalk.green(`\n✅ تانل گیمینگ با موفقیت ایجاد شد!\n`));
      console.log(chalk.magenta('📊 تنظیمات گیمینگ:'));
      console.log(`   بدون تاخیر: ✓`);
      console.log(`   Keep Alive: ✓`);
      console.log(`   نگاه‌داری اتصال: ✓`);
      console.log(`   پینگ پایین: ✓\n`);
      
      this.printTunnelInfo(response.data);
    } catch (error) {
      console.log(chalk.red(`\n❌ خطا: ${error.message}\n`));
    }
  }

  async promptGameType() {
    console.log(chalk.blue('\nنوع بازی:'));
    console.log('1) Counter-Strike (CS2, CSGO)');
    console.log('2) Valorant');
    console.log('3) Dota 2');
    console.log('4) League of Legends');
    console.log('5) Minecraft');
    console.log('6) Fortnite');
    console.log('7) عمومی (General)');

    const gameMap = {
      '1': 'Counter-Strike',
      '2': 'Valorant',
      '3': 'Dota 2',
      '4': 'League of Legends',
      '5': 'Minecraft',
      '6': 'Fortnite',
      '7': 'General'
    };

    const choice = await this.prompt('انتخاب بازی (1-7): ', '7');
    return gameMap[choice] || 'General';
  }

  async viewStatistics() {
    console.clear();
    console.log(chalk.cyan('\n📈 آمارهای سیستم\n'));

    try {
      const response = await axios.get(`${API_URL}/api/stats/global`, {
        headers: { 'x-api-key': API_KEY }
      });

      const data = response.data;

      console.log(chalk.blue('📊 آمارهای کلی:'));
      console.log(`   تانل‌های فعال: ${chalk.green(data.activeTunnels)}`);
      console.log(`   کل اتصالات: ${chalk.green(data.totalConnections)}`);
      console.log(`   کل داده منتقل شده: ${chalk.green(this.formatBytes(data.totalDataTransferred))}`);
      console.log(`   تعداد خطاها: ${chalk.red(data.totalErrors)}`);
      console.log(`   وقت اجرا: ${chalk.yellow(this.formatUptime(data.uptime))}\n`);

      if (data.memoryUsage) {
        console.log(chalk.blue('💾 مصرف حافظه:'));
        console.log(`   Heap Used: ${Math.round(data.memoryUsage.heapUsed / 1024 / 1024)} MB`);
        console.log(`   Heap Total: ${Math.round(data.memoryUsage.heapTotal / 1024 / 1024)} MB\n`);
      }
    } catch (error) {
      console.log(chalk.red(`\n❌ خطا: ${error.message}\n`));
    }
  }

  printTunnelInfo(tunnel) {
    console.log(chalk.blue('📍 اطلاعات تانل:'));
    console.log(`   ID: ${chalk.yellow(tunnel.tunnelId)}`);
    console.log(`   پورت‌ها: ${chalk.yellow(tunnel.ports.join(', '))}`);
    console.log(`   وضعیت: ${chalk.green(tunnel.status)}`);
    console.log(`   پیام: ${tunnel.message}\n`);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }

  async deleteTunnel() {
    console.clear();
    console.log(chalk.red('\n❌ حذف تانل\n'));
    const tunnelId = await this.prompt('ID تانل: ');
    const confirm = await this.prompt('آیا مطمئن هستید؟ (yes/no): ', 'no');

    if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
      try {
        await axios.delete(`${API_URL}/api/tunnels/${tunnelId}`, {
          headers: { 'x-api-key': API_KEY }
        });
        console.log(chalk.green('\n✅ تانل حذف شد!\n'));
      } catch (error) {
        console.log(chalk.red(`\n❌ خطا: ${error.message}\n`));
      }
    }
  }

  async viewTunnelDetails() {
    const tunnelId = await this.prompt('ID تانل: ');
    try {
      const response = await axios.get(`${API_URL}/api/tunnels/${tunnelId}`, {
        headers: { 'x-api-key': API_KEY }
      });
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log(chalk.red(`❌ خطا: ${error.message}`));
    }
  }

  async networkSettings() {
    console.log(chalk.cyan('\n🌐 تنظیمات شبکه (قریب‌الوقوع)'));
  }

  async viewLogs() {
    console.log(chalk.cyan('\n📝 مشاهده لاگ‌ها (قریب‌الوقوع)'));
  }

  showHelp() {
    console.log(chalk.green(`
📚 راهنما - Help

دستورات اساسی:
  create    - ایجاد تانل جدید
  list      - لیست تانل‌ها
  delete    - حذف تانل
  stats     - مشاهده آمارها
  gaming    - ایجاد تانل گیمینگ

مثال‌ها:
  tunnel create --type TCP --port 8080
  tunnel list
  tunnel delete --id tunnel_123456
    `));
  }

  prompt(question, defaultValue = null) {
    return new Promise((resolve) => {
      const prompt = defaultValue ? `${question} [${defaultValue}] ` : question;
      this.rl.question(chalk.yellow(prompt), (answer) => {
        resolve(answer || defaultValue || '');
      });
    });
  }
}

if (require.main === module) {
  const cli = new TunnelCLI();
  cli.start().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = TunnelCLI;
