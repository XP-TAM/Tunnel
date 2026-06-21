/**
 * ابزار CLI برای مشاهده وضعیت تانل
 * CLI Tool - Tunnel Status
 */

const readline = require('readline');
const axios = require('axios');
const chalk = require('chalk');
const Table = require('cli-table3');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function tunnelStatus() {
  try {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║       وضعیت تانل - Tunnel Status          ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════╝\n'));

    const serverUrl = process.env.TUNNEL_SERVER_URL || 'http://localhost:3000';
    const apiKey = process.env.API_KEY || '';

    const tunnelId = await question(chalk.yellow('شناسه تانل (Tunnel ID): '));

    console.log(chalk.blue('\n📍 درحال دریافت اطلاعات...\n'));

    const response = await axios.get(`${serverUrl}/api/tunnels/${tunnelId}`, {
      headers: {
        'x-api-key': apiKey
      }
    });

    const details = response.data;

    console.log(chalk.cyan('╔════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║          اطلاعات کلی - General Info       ║'));
    console.log(chalk.cyan('╠════════════════════════════════════════════╣'));
    console.log(chalk.white(`║ شناسه: ${details.tunnelId}\n║\n║ میزبان محلی: ${details.config.localHost}:${details.config.localPort}\n║ میزبان ریموت: ${details.config.remoteHost}:${details.config.remotePort}\n║`));
    console.log(chalk.cyan('╠════════════════════════════════════════════╣'));
    console.log(chalk.cyan('║          آمار - Statistics                ║'));
    console.log(chalk.cyan('╠════════════════════════════════════════════╣'));
    console.log(chalk.white(`║ داده دریافتی: ${formatBytes(details.statistics.bytesReceived)}`));
    console.log(chalk.white(`║ داده ارسالی: ${formatBytes(details.statistics.bytesSent)}`));
    console.log(chalk.white(`║ کل داده: ${formatBytes(details.statistics.bytesReceived + details.statistics.bytesSent)}`));
    console.log(chalk.white(`║ اتصالات فعال: ${details.activeConnections}`));
    console.log(chalk.white(`║ خطاها: ${details.statistics.errors}`));
    console.log(chalk.cyan('╚════════════════════════════════════════════╝\n'));

    // Show active connections
    if (details.connectionDetails && details.connectionDetails.length > 0) {
      console.log(chalk.cyan('╔════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║       اتصالات فعال - Active Connections  ║'));
      console.log(chalk.cyan('╠════════════════════════════════════════════╣\n'));

      const table = new Table({
        head: [
          chalk.cyan('شناسه'),
          chalk.cyan('منبع'),
          chalk.cyan('مقصد'),
          chalk.cyan('پینگ'),
          chalk.cyan('وضعیت')
        ],
        style: {
          head: [],
          border: ['cyan']
        }
      });

      for (const conn of details.connectionDetails) {
        table.push([
          chalk.yellow(conn.id.substring(0, 15) + '...'),
          chalk.blue(`${conn.source.host}:${conn.source.port}`),
          chalk.green(`${conn.destination.host}:${conn.destination.port}`),
          chalk.magenta(conn.ping + ' ms'),
          chalk.cyan(conn.status)
        ]);
      }

      console.log(table.toString());
      console.log();
    }

    rl.close();
  } catch (error) {
    console.log(chalk.red('\n❌ خطا:\n'), error.message);
    rl.close();
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

tunnelStatus();
