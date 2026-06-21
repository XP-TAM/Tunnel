/**
 * ابزار CLI برای مشاهده لیست تانل‌ها
 * CLI Tool - List Tunnels
 */

const axios = require('axios');
const chalk = require('chalk');
const Table = require('cli-table3');

async function listTunnels() {
  try {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║        لیست تانل‌ها - List Tunnels       ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════╝\n'));

    const serverUrl = process.env.TUNNEL_SERVER_URL || 'http://localhost:3000';
    const apiKey = process.env.API_KEY || '';

    const response = await axios.get(`${serverUrl}/api/tunnels/list`, {
      headers: {
        'x-api-key': apiKey
      }
    });

    if (response.data.tunnels && response.data.tunnels.length > 0) {
      const table = new Table({
        head: [
          chalk.cyan('شناسه تانل'),
          chalk.cyan('وضعیت'),
          chalk.cyan('پورت‌ها'),
          chalk.cyan('داده دریافتی'),
          chalk.cyan('داده ارسالی'),
          chalk.cyan('پینگ'),
          chalk.cyan('اتصالات')
        ],
        style: {
          head: [],
          border: ['cyan']
        },
        wordWrap: true
      });

      for (const tunnel of response.data.tunnels) {
        table.push([
          chalk.yellow(tunnel.tunnelId.substring(0, 20) + '...'),
          chalk.green(tunnel.status),
          chalk.blue(tunnel.ports.join(', ')),
          chalk.magenta(formatBytes(tunnel.statistics.bytesReceived)),
          chalk.magenta(formatBytes(tunnel.statistics.bytesSent)),
          chalk.cyan(tunnel.statistics.averagePing + ' ms'),
          chalk.yellow(tunnel.statistics.activeConnections)
        ]);
      }

      console.log(table.toString());
      console.log(chalk.green(`\n✅ کل تانل‌ها: ${response.data.totalTunnels}\n`));
    } else {
      console.log(chalk.yellow('⚠️  هیچ تانلی یافت نشد\n'));
    }

  } catch (error) {
    console.log(chalk.red('\n❌ خطا:\n'), error.message);
    process.exit(1);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

listTunnels();
