/**
 * ابزار CLI برای حذف تانل
 * CLI Tool - Delete Tunnel
 */

const readline = require('readline');
const axios = require('axios');
const chalk = require('chalk');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function deleteTunnel() {
  try {
    console.log(chalk.red('\n╔════════════════════════════════════════════╗'));
    console.log(chalk.red('║        حذف تانل - Delete Tunnel          ║'));
    console.log(chalk.red('╚════════════════════════════════════════════╝\n'));

    const serverUrl = process.env.TUNNEL_SERVER_URL || 'http://localhost:3000';
    const apiKey = process.env.API_KEY || '';

    const tunnelId = await question(chalk.yellow('شناسه تانل (Tunnel ID): '));

    const confirm = await question(chalk.red('\n⚠️  آیا مطمئنید؟ (y/n) [n]: '));

    if (confirm.toLowerCase() !== 'y') {
      console.log(chalk.yellow('\n❌ عملیات لغو شد\n'));
      rl.close();
      return;
    }

    console.log(chalk.blue('\n📍 درحال حذف تانل...\n'));

    const response = await axios.delete(`${serverUrl}/api/tunnels/${tunnelId}`, {
      headers: {
        'x-api-key': apiKey
      }
    });

    if (response.data.success) {
      console.log(chalk.green('✅ تانل با موفقیت حذف شد!\n'));
      console.log(chalk.cyan('╔════════════════════════════════════════════╗'));
      console.log(chalk.cyan(`║ پورت‌های آزاد شده: ${response.data.releasedPorts.join(', ').padEnd(19)}`));
      console.log(chalk.cyan(`║ داده دریافتی: ${formatBytes(response.data.finalStatistics.bytesReceived).padEnd(21)}`));
      console.log(chalk.cyan(`║ داده ارسالی: ${formatBytes(response.data.finalStatistics.bytesSent).padEnd(23)}`));
      console.log(chalk.cyan('╚════════════════════════════════════════════╝\n'));
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

deleteTunnel();
