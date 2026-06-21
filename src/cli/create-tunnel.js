/**
 * ابزار CLI برای ایجاد تانل
 * CLI Tool - Create Tunnel
 */

const readline = require('readline');
const axios = require('axios');
const chalk = require('chalk');
const logger = require('../utils/logger');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function createTunnel() {
  try {
    console.log(chalk.cyan('\n╔════════════════════════════════════════════╗'));
    console.log(chalk.cyan('║     ایجاد تانل جدید - Create Tunnel      ║'));
    console.log(chalk.cyan('╚════════════════════════════════════════════╝\n'));

    const serverUrl = process.env.TUNNEL_SERVER_URL || 'http://localhost:3000';
    const apiKey = process.env.API_KEY || '';

    const localHost = await question(chalk.yellow('پورت محلی (Local Host) [127.0.0.1]: '));
    const localPort = await question(chalk.yellow('پورت محلی (Local Port) [8080]: '));
    const remoteHost = await question(chalk.yellow('سرور ریموت (Remote Host) [مثال: example.com]: '));
    const remotePort = await question(chalk.yellow('پورت ریموت (Remote Port) [80]: '));
    const name = await question(chalk.yellow('نام تانل (Tunnel Name): '));
    const description = await question(chalk.yellow('توضیحات (Description) [Optional]: '));

    const config = {
      localHost: localHost || '127.0.0.1',
      localPort: parseInt(localPort) || 8080,
      remoteHost: remoteHost || 'localhost',
      remotePort: parseInt(remotePort) || 80,
      name,
      description,
      portCount: 1
    };

    console.log(chalk.blue('\n📍 درحال ایجاد تانل...\n'));

    const response = await axios.post(`${serverUrl}/api/tunnels/create`, config, {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log(chalk.green('✅ تانل با موفقیت ایجاد شد!\n'));
      console.log(chalk.cyan('╔════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║          اطلاعات تانل - Tunnel Info       ║'));
      console.log(chalk.cyan('╠════════════════════════════════════════════╣'));
      console.log(chalk.white(`║ شناسه تانل (Tunnel ID): ${response.data.tunnelId.padEnd(20)}`));
      console.log(chalk.white(`║ پورت‌ها (Ports): ${response.data.ports.join(', ').padEnd(28)}`));
      console.log(chalk.white(`║ وضعیت (Status): ${response.data.status.padEnd(28)}`));
      console.log(chalk.cyan('╚════════════════════════════════════════════╝\n'));
      
      console.log(chalk.green('✅ شما می‌توانید از تانل استفاده کنید\n'));
    } else {
      console.log(chalk.red('❌ خطا در ایجاد تانل\n'));
      console.log(chalk.red(response.data.message));
    }

    rl.close();
  } catch (error) {
    console.log(chalk.red('\n❌ خطا:\n'), error.message);
    rl.close();
    process.exit(1);
  }
}

createT unnel();
