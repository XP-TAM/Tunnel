#!/bin/bash

################################################################################
#                                                                              #
#          سیستم تانل فوق پیشرفته - Advanced Tunnel Server System           #
#                    اسکریپت نصب و راه‌اندازی                                 #
#                                                                              #
#  سازگار با: Ubuntu 20.04 LTS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS       #
#  و سایر توزیع‌های مبتنی بر Debian                                         #
#                                                                              #
################################################################################

set -e

# رنگ‌ها برای خروجی
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# متغیرهای سیستم
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="${INSTALL_DIR:-/opt/tunnel-server}"
USER_NAME="${USER_NAME:-tunnel}"
SERVICE_NAME="tunnel-server"
LOG_DIR="/var/log/tunnel-server"
DATA_DIR="${INSTALL_DIR}/data"

# شمارش‌گرهای نصب
STEP=0
TOTAL_STEPS=12

################################################################################
# توابع کمکی
################################################################################

print_header() {
    clear
    echo -e "${CYAN}"
    cat << "EOF"
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║           🚀 سیستم تانل فوق پیشرفته - Advanced Tunnel Server 🚀        ║
║                                                                            ║
║                       اسکریپت نصب خودکار - Auto Setup                    ║
║                                                                            ║
╚══════════════��═════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

print_step() {
    ((STEP++))
    echo -e "\n${BLUE}[${STEP}/${TOTAL_STEPS}]${NC} ${GREEN}$1${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "این اسکریپت باید با دسترسی root اجرا شود!"
        echo -e "${YELLOW}لطفاً با دستور زیر دوباره سعی کنید:${NC}"
        echo -e "${CYAN}sudo bash $0${NC}"
        exit 1
    fi
}

check_os() {
    if [[ ! -f /etc/os-release ]]; then
        print_error "نتوانستیم سیستم عامل را شناسایی کنیم"
        exit 1
    fi

    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID

    if [[ ! "$OS" =~ ^(ubuntu|debian)$ ]]; then
        print_error "این اسکریپت تنها بر روی Ubuntu و Debian کار می‌کند"
        print_info "سیستم عامل شناسایی شده: $PRETTY_NAME"
        exit 1
    fi

    print_success "سیستم عامل: $PRETTY_NAME"
}

install_dependencies() {
    print_step "نصب وابستگی‌های سیستم"

    print_info "به‌روز رسانی فهرست بسته‌ها..."
    apt-get update -qq

    local packages=(
        "curl"
        "wget"
        "git"
        "build-essential"
        "python3-dev"
        "python3-pip"
        "libssl-dev"
        "libffi-dev"
        "net-tools"
        "netcat-openbsd"
        "iperf3"
        "dnsutils"
        "traceroute"
        "mtr"
        "tcpdump"
        "htop"
        "iotop"
        "unzip"
        "zip"
        "jq"
    )

    echo -e "${CYAN}درحال نصب بسته‌ها...${NC}"
    for package in "${packages[@]}"; do
        if ! dpkg -l | grep -q "^ii  $package"; then
            echo -ne "  📦 ��صب $package... "
            apt-get install -y -qq "$package" 2>/dev/null && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}⊘${NC}"
        fi
    done

    print_success "وابستگی‌های سیستم نصب شدند"
}

install_nodejs() {
    print_step "نصب Node.js و NPM"

    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_warning "Node.js قبلاً نصب است: $NODE_VERSION"
        return
    fi

    print_info "نصب Node.js 20.x LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null || true
    apt-get install -y -qq nodejs

    print_success "Node.js $(node --version) نصب شد"
    print_success "NPM $(npm --version) نصب شد"
}

setup_user() {
    print_step "تنظیم کاربر و دایرکتوری‌ها"

    # ایجاد کاربر
    if ! id "$USER_NAME" &>/dev/null; then
        useradd -m -s /bin/bash "$USER_NAME"
        print_success "کاربر $USER_NAME ایجاد شد"
    else
        print_warning "کاربر $USER_NAME قبلاً وجود دارد"
    fi

    # ایجاد دایرکتوری‌ها
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$DATA_DIR"
    mkdir -p "/etc/tunnel-server"

    # تنظیم دسترسی‌ها
    chown -R "$USER_NAME:$USER_NAME" "$INSTALL_DIR"
    chown -R "$USER_NAME:$USER_NAME" "$LOG_DIR"
    chown -R "$USER_NAME:$USER_NAME" "$DATA_DIR"
    chmod -R 755 "$INSTALL_DIR"
    chmod -R 755 "$LOG_DIR"

    print_success "دایرکتوری‌ها و دسترسی‌ها تنظیم شدند"
}

clone_repository() {
    print_step "دانلود کد منبع پروژه"

    if [[ -d "${INSTALL_DIR}/src" && -f "${INSTALL_DIR}/package.json" ]]; then
        print_warning "کد منبع قبلاً دانلود شده است"
        print_info "درحال به‌روز رسانی..."
        cd "$INSTALL_DIR"
        sudo -u "$USER_NAME" git pull origin main 2>/dev/null || true
    else
        print_info "درحال کلون کردن مخزن گیت‌هاب..."
        if ! sudo -u "$USER_NAME" git clone --depth 1 https://github.com/XP-TAM/Tunnel.git "$INSTALL_DIR" 2>&1 | grep -q "fatal"; then
            print_success "کد منبع دانلود شد"
        else
            print_error "نتوانستیم کد منبع را دانلود کنیم"
            print_info "درحال کپی کردن از دایرکتوری محلی..."
            cp -r "$SCRIPT_DIR"/* "$INSTALL_DIR/" 2>/dev/null || true
        fi
    fi
}

install_npm_dependencies() {
    print_step "نصب وابستگی‌های Node.js (NPM)"

    cd "$INSTALL_DIR"
    print_info "درحال نصب بسته‌های npm..."
    sudo -u "$USER_NAME" npm install --production 2>&1 | tail -5

    if [[ -d "node_modules" ]]; then
        print_success "وابستگی‌های npm نصب شدند"
    else
        print_error "نصب npm ناموفق بود"
        exit 1
    fi
}

setup_environment() {
    print_step "تنظیم فایل محیطی"

    local ENV_FILE="${INSTALL_DIR}/.env"
    local ENV_EXAMPLE="${INSTALL_DIR}/.env.example"

    if [[ ! -f "$ENV_FILE" ]]; then
        if [[ -f "$ENV_EXAMPLE" ]]; then
            cp "$ENV_EXAMPLE" "$ENV_FILE"
            print_success "فایل .env ایجاد شد"
        else
            print_warning "فایل .env.example یافت نشد"
        fi
    else
        print_warning "فایل .env ��بلاً وجود دارد"
    fi

    # تنظیم دسترسی‌ها
    chown "$USER_NAME:$USER_NAME" "$ENV_FILE"
    chmod 600 "$ENV_FILE"

    # بروز رسانی متغیرهای محیطی
    sed -i "s|^SERVER_PORT=.*|SERVER_PORT=3000|" "$ENV_FILE"
    sed -i "s|^DB_PATH=.*|DB_PATH=${DATA_DIR}/tunnel.db|" "$ENV_FILE"
    sed -i "s|^LOG_FILE=.*|LOG_FILE=${LOG_DIR}/tunnel.log|" "$ENV_FILE"
    sed -i "s|^NODE_ENV=.*|NODE_ENV=production|" "$ENV_FILE"

    print_success "فایل محیطی تنظیم شد"
}

setup_systemd_service() {
    print_step "راه‌اندازی سرویس Systemd"

    local SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Advanced Tunnel Server
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node ${INSTALL_DIR}/src/index.js
Restart=always
RestartSec=10
StandardOutput=append:${LOG_DIR}/stdout.log
StandardError=append:${LOG_DIR}/stderr.log
Environment="NODE_ENV=production"
Environment="PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# محدودیت‌های منابع
LimitNOFILE=65536
LimitNPROC=65536

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    print_success "سرویس Systemd راه‌اندازی شد"
}

setup_firewall() {
    print_step "تنظیم دیوار آتش (Firewall)"

    if command -v ufw &> /dev/null && ufw status | grep -q "Status: active"; then
        print_info "درحال باز کردن پورت‌های لازم..."
        ufw allow 3000/tcp || print_warning "نتوانستیم پورت 3000 را باز کنیم"
        ufw allow 4000:5000/tcp || print_warning "نتوانستیم پورت‌های 4000:5000 را باز کنیم"
        print_success "دیوار آتش تنظیم شد"
    elif command -v firewall-cmd &> /dev/null; then
        print_info "تنظیم FirewallD..."
        firewall-cmd --permanent --add-port=3000/tcp || true
        firewall-cmd --permanent --add-port-range=4000-5000/tcp || true
        firewall-cmd --reload || true
        print_success "FirewallD تنظیم شد"
    else
        print_warning "هیچ دیوار آتش فعالی یافت نشد"
    fi
}

setup_cli_tools() {
    print_step "راه‌اندازی ا��زارهای Command Line"

    local BIN_DIR="/usr/local/bin"

    # ایجاد CLI wrapper
    cat > "${BIN_DIR}/tunnel" << 'EOFCLI'
#!/bin/bash
cd /opt/tunnel-server
sudo -u tunnel npm run "$@" 2>/dev/null || node src/cli/main.js "$@"
EOFCLI

    chmod +x "${BIN_DIR}/tunnel"

    # ایجاد dashboard CLI
    cat > "${BIN_DIR}/tunnel-dashboard" << 'EOFDASH'
#!/bin/bash
node /opt/tunnel-server/src/cli/dashboard.js
EOFDASH

    chmod +x "${BIN_DIR}/tunnel-dashboard"

    print_success "ابزارهای CLI نصب شدند"
    print_info "می‌توانید از دستورات زیر استفاده کنید:"
    echo -e "  ${CYAN}tunnel create${NC}        - ایجاد تانل جدید"
    echo -e "  ${CYAN}tunnel list${NC}           - نمایش لیست تانل‌ها"
    echo -e "  ${CYAN}tunnel delete${NC}         - حذف تانل"
    echo -e "  ${CYAN}tunnel-dashboard${NC}      - باز کردن داشبورد"
}

test_installation() {
    print_step "تست نصب"

    cd "$INSTALL_DIR"

    # تست Node.js
    print_info "تست Node.js..."
    node --version || { print_error "تست Node.js ناموفق"; return 1; }

    # تست npm
    print_info "تست npm..."
    npm --version || { print_error "تست npm ناموفق"; return 1; }

    # تست فایل‌های منبع
    if [[ -f "src/index.js" && -f "package.json" ]]; then
        print_success "فایل‌های منبع موجودند"
    else
        print_error "فایل‌های منبع ناقصند"
        return 1
    fi

    print_success "تمام تست‌ها با موفقیت انجام شدند"
}

start_service() {
    print_step "راه‌اندازی سرویس"

    systemctl start "$SERVICE_NAME"
    sleep 2

    if systemctl is-active --quiet "$SERVICE_NAME"; then
        print_success "سرویس با موفقیت راه‌اندازی شد"
        systemctl status "$SERVICE_NAME" | head -10
    else
        print_error "نتوانستیم سرویس را راه‌اندازی کنیم"
        systemctl status "$SERVICE_NAME"
        return 1
    fi
}

print_summary() {
    print_step "خلاصه نصب"

    local IP=$(hostname -I | awk '{print $1}')
    local PORT=3000

    echo -e "\n${GREEN}"
    cat << EOF
╔══════════════════════���═════════════════════════════════════════════════════╗
║                    ✅ نصب با موفقیت تکمیل شد!                           ║
╚════════════════════════════════════════════════════════════════════════════╝

📊 اطلاعات سرویس:
   ${CYAN}سرویس:${NC}               $SERVICE_NAME
   ${CYAN}وضعیت:${NC}               $(systemctl is-active $SERVICE_NAME)
   ${CYAN}دایرکتوری نصب:${NC}       $INSTALL_DIR
   ${CYAN}دایرکتوری لاگ:${NC}       $LOG_DIR
   ${CYAN}دایرکتوری داده:${NC}      $DATA_DIR

🌐 دسترسی به سرویس:
   ${CYAN}آدرس محلی:${NC}          http://localhost:$PORT
   ${CYAN}آدرس شبکه:${NC}          http://$IP:$PORT
   ${CYAN}API مستندات:${NC}       http://$IP:$PORT/api/docs

🛠️  دستورات مفید:
   ${CYAN}داشبورد:${NC}             tunnel-dashboard
   ${CYAN}ایجاد تانل:${NC}          tunnel create
   ${CYAN}لیست تانل‌ها:${NC}       tunnel list
   ${CYAN}مشاهده وضعیت:${NC}       systemctl status $SERVICE_NAME
   ${CYAN}مشاهده لاگ‌ها:${NC}       tail -f $LOG_DIR/tunnel.log
   ${CYAN}متوقف کردن:${NC}          systemctl stop $SERVICE_NAME
   ${CYAN}راه‌اندازی:${NC}           systemctl start $SERVICE_NAME
   ${CYAN}مجدد راه‌اندازی:${NC}      systemctl restart $SERVICE_NAME

📝 فایل‌های پیکربندی:
   ${CYAN}.env:${NC}                $INSTALL_DIR/.env
   ${CYAN}سرویس:${NC}               /etc/systemd/system/$SERVICE_NAME.service

🔐 نکات امنیتی:
   1️⃣  کلید API را در فایل .env تغییر دهید
   2️⃣  از HTTPS استفاده کنید (Nginx/Reverse Proxy)
   3️⃣  Firewall را به‌درستی تنظیم کنید
   4️⃣  لاگ‌ها را به‌صورت منظم بررسی کنید

📚 مستندات و پیوندها:
   ${CYAN}مستندات:${NC}             https://github.com/XP-TAM/Tunnel/wiki
   ${CYAN}مشکلات:${NC}              https://github.com/XP-TAM/Tunnel/issues
   ${CYAN}تغییرات:${NC}             https://github.com/XP-TAM/Tunnel/releases

EOF
    echo -e "${NC}"
}

################################################################################
# اجرای اصلی
################################################################################

main() {
    print_header
    check_root
    check_os

    echo ""
    print_info "شروع نصب سیستم تانل..."
    print_info "دایرکتوری نصب: $INSTALL_DIR"
    print_info "کاربر سرویس: $USER_NAME"
    echo ""

    install_dependencies
    install_nodejs
    setup_user
    clone_repository
    install_npm_dependencies
    setup_environment
    setup_systemd_service
    setup_firewall
    setup_cli_tools
    test_installation
    start_service
    print_summary

    echo -e "\n${GREEN}🎉 نصب تکمیل شد! برای شروع استفاده کنید.${NC}\n"
}

# اجرا
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
