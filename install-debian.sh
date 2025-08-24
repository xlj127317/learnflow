#!/bin/bash

# LearnFlow Debian 12 服务器安装脚本
# 针对2核4GB服务器优化
# 使用方法: ./install-debian.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 主函数
main() {
    log_info "开始安装 LearnFlow 服务器环境..."
    
    # 检查是否为root用户
    if [[ $EUID -eq 0 ]]; then
        log_warning "检测到root用户运行"
        log_info "将以root用户身份继续安装..."
        
        # 设置用户变量为root
        USER="root"
        USER_HOME="/root"
    else
        log_info "使用普通用户运行，将自动请求sudo权限"
        USER=$USER
        USER_HOME=$HOME
    fi
    
    # 更新系统
    update_system
    
    # 安装基础依赖
    install_dependencies
    
    # 配置防火墙
    configure_firewall
    
    # 配置fail2ban
    configure_fail2ban
    
    # 配置日志轮转
    configure_logrotate
    
    # 创建应用目录
    create_directories
    
    # 配置系统优化
    configure_system_optimization
    
    # 配置定时任务
    configure_cron
    
    # 配置监控脚本
    configure_monitoring
    
    # 显示完成信息
    show_completion_info
}

# 更新系统
update_system() {
    log_info "更新系统包..."
    apt update
    apt upgrade -y
    log_success "系统更新完成"
}

# 安装基础依赖
install_dependencies() {
    log_info "安装基础依赖..."
    apt install -y \
        curl wget git vim htop net-tools ufw fail2ban logrotate unzip \
        software-properties-common apt-transport-https ca-certificates gnupg lsb-release
    log_success "基础依赖安装完成"
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow from 127.0.0.1 to any port 5432
    ufw allow from 127.0.0.1 to any port 3000
    log_success "防火墙配置完成"
}

# 配置fail2ban
configure_fail2ban() {
    log_info "配置fail2ban..."
    tee /etc/fail2ban/jail.local > /dev/null <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
EOF
    systemctl restart fail2ban
    systemctl enable fail2ban
    log_success "fail2ban配置完成"
}

# 配置日志轮转
configure_logrotate() {
    log_info "配置日志轮转..."
    tee /etc/logrotate.d/learnflow > /dev/null <<EOF
/var/log/learnflow/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
EOF
    log_success "日志轮转配置完成"
}

# 创建应用目录
create_directories() {
    log_info "创建应用目录..."
    mkdir -p /opt/learnflow
    mkdir -p /var/log/learnflow
    mkdir -p /var/backups/learnflow
    chown -R $USER:$USER /opt/learnflow
    chown -R $USER:$USER /var/log/learnflow
    chown -R $USER:$USER /var/backups/learnflow
    log_success "应用目录创建完成"
}

# 配置系统优化
configure_system_optimization() {
    log_info "配置系统优化..."
    tee /etc/sysctl.d/99-learnflow.conf > /dev/null <<EOF
# 网络优化
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = bbr
net.core.default_qdisc = fq

# 文件系统优化
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5

# 进程优化
kernel.pid_max = 65536
EOF
    sysctl -p /etc/sysctl.d/99-learnflow.conf
    tee /etc/security/limits.d/99-learnflow.conf > /dev/null <<EOF
# 文件描述符限制
* soft nofile 65536
* hard nofile 65536
root soft nofile 65536
root hard nofile 65536
EOF
    log_success "系统优化配置完成"
}

# 配置定时任务 (Backup)
configure_cron() {
    log_info "配置定时任务..."
    cat > /opt/learnflow/backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/learnflow"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/learnflow_${TIMESTAMP}.sql"
mkdir -p $BACKUP_DIR
docker-compose -f /opt/learnflow/docker-compose.production.yml exec -T postgres pg_dump -U learnflow_user learnflow > $BACKUP_FILE
if [ $? -eq 0 ]; then
    gzip $BACKUP_FILE
    echo "数据库备份完成: ${BACKUP_FILE}.gz"
    find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
    echo "已清理7天前的备份文件"
else
    echo "数据库备份失败"
    exit 1
fi
EOF
    chmod +x /opt/learnflow/backup.sh
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/learnflow/backup.sh >> /var/log/learnflow/backup.log 2>&1") | crontab -
    log_success "定时任务配置完成"
}

# 配置监控脚本
configure_monitoring() {
    log_info "配置监控脚本..."
    cat > /opt/learnflow/monitor.sh <<'EOF'
#!/bin/bash
LOG_FILE="/var/log/learnflow/monitor.log"
ALERT_EMAIL="admin@example.com"

DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "$(date): 磁盘使用率过高: ${DISK_USAGE}%" >> $LOG_FILE
fi

MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
if [ $MEMORY_USAGE -gt 90 ]; then
    echo "$(date): 内存使用率过高: ${MEMORY_USAGE}%" >> $LOG_FILE
fi

if ! docker info >/dev/null 2>&1; then
    echo "$(date): Docker服务异常" >> $LOG_FILE
fi

if ! curl -f http://localhost/health >/dev/null 2>&1; then
    echo "$(date): 应用健康检查失败" >> $LOG_FILE
fi
EOF
    chmod +x /opt/learnflow/monitor.sh
    (crontab -l 2>/dev/null; echo "*/5 * * * * /opt/learnflow/monitor.sh") | crontab -
    log_success "监控脚本配置完成"
}

# 显示完成信息
show_completion_info() {
    echo ""
    log_success "LearnFlow 服务器环境安装完成！"
    echo ""
    echo "=== 安装完成信息 ==="
    echo "✅ 系统更新完成"
    echo "✅ 基础依赖安装完成"
    echo "✅ 防火墙配置完成"
    echo "✅ Fail2ban配置完成"
    echo "✅ 日志轮转配置完成"
    echo "✅ 应用目录创建完成"
    echo "✅ 系统优化配置完成"
    echo "✅ 定时任务配置完成"
    echo "✅ 监控脚本配置完成"
    echo ""
    echo "=== 下一步操作 ==="
    echo "1. 配置环境变量: cp env.production.example .env"
    echo "2. 编辑配置文件: nano .env"
    echo "3. 部署应用: ./deploy-debian.sh start"
    echo ""
    echo "=== 重要提醒 ==="
    echo "⚠️  请务必修改 .env 文件中的密码和密钥"
    echo "⚠️  确保防火墙规则符合您的需求"
    echo "⚠️  定期检查系统监控日志"
    echo ""
    echo "=== 管理命令 ==="
    echo "查看防火墙状态: ufw status"
    echo "查看fail2ban状态: fail2ban-client status"
    echo "查看系统资源: htop"
    echo "查看磁盘使用: df -h"
    echo ""
    log_success "安装脚本执行完毕！"
}

# 执行主函数
main "$@"
