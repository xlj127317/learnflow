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

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "请不要使用root用户运行此脚本"
        log_info "请使用普通用户运行，脚本会自动请求sudo权限"
        exit 1
    fi
}

# 更新系统
update_system() {
    log_info "更新系统包..."
    sudo apt update
    sudo apt upgrade -y
    log_success "系统更新完成"
}

# 安装基础依赖
install_dependencies() {
    log_info "安装基础依赖..."
    
    # 安装必要的系统包
    sudo apt install -y \
        curl \
        wget \
        git \
        vim \
        htop \
        net-tools \
        ufw \
        fail2ban \
        logrotate \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release
    
    log_success "基础依赖安装完成"
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."
    
    # 启用防火墙
    sudo ufw --force enable
    
    # 设置默认策略
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # 允许SSH连接
    sudo ufw allow ssh
    
    # 允许HTTP和HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # 允许Docker端口（仅本地访问）
    sudo ufw allow from 127.0.0.1 to any port 5432
    sudo ufw allow from 127.0.0.1 to any port 3000
    
    log_success "防火墙配置完成"
}

# 配置fail2ban
configure_fail2ban() {
    log_info "配置fail2ban..."
    
    # 创建SSH保护配置
    sudo tee /etc/fail2ban/jail.local > /dev/null <<EOF
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
    
    # 重启fail2ban服务
    sudo systemctl restart fail2ban
    sudo systemctl enable fail2ban
    
    log_success "fail2ban配置完成"
}

# 配置日志轮转
configure_logrotate() {
    log_info "配置日志轮转..."
    
    # 创建应用日志轮转配置
    sudo tee /etc/logrotate.d/learnflow > /dev/null <<EOF
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
    
    # 创建应用目录
    sudo mkdir -p /opt/learnflow
    sudo mkdir -p /var/log/learnflow
    sudo mkdir -p /var/backups/learnflow
    
    # 设置目录权限
    sudo chown -R $USER:$USER /opt/learnflow
    sudo chown -R $USER:$USER /var/log/learnflow
    sudo chown -R $USER:$USER /var/backups/learnflow
    
    log_success "应用目录创建完成"
}

# 配置系统优化
configure_system_optimization() {
    log_info "配置系统优化..."
    
    # 创建系统配置文件
    sudo tee /etc/sysctl.d/99-learnflow.conf > /dev/null <<EOF
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
    
    # 应用设置
    sudo sysctl -p /etc/sysctl.d/99-learnflow.conf
    
    # 优化文件描述符限制
    sudo tee /etc/security/limits.d/99-learnflow.conf > /dev/null <<EOF
# 文件描述符限制
* soft nofile 65536
* hard nofile 65536
root soft nofile 65536
root hard nofile 65536
EOF
    
    log_success "系统优化配置完成"
}

# 配置定时任务
configure_cron() {
    log_info "配置定时任务..."
    
    # 创建备份脚本
    cat > /opt/learnflow/backup.sh <<'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/learnflow"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/learnflow_${TIMESTAMP}.sql"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行数据库备份
docker-compose -f /opt/learnflow/docker-compose.production.yml exec -T postgres pg_dump -U learnflow_user learnflow > $BACKUP_FILE

if [ $? -eq 0 ]; then
    # 压缩备份文件
    gzip $BACKUP_FILE
    echo "数据库备份完成: ${BACKUP_FILE}.gz"
    
    # 清理旧备份（保留最近7天）
    find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
    echo "已清理7天前的备份文件"
else
    echo "数据库备份失败"
    exit 1
fi
EOF
    
    # 设置执行权限
    chmod +x /opt/learnflow/backup.sh
    
    # 添加到crontab（每天凌晨2点执行备份）
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/learnflow/backup.sh >> /var/log/learnflow/backup.log 2>&1") | crontab -
    
    log_success "定时任务配置完成"
}

# 配置监控脚本
configure_monitoring() {
    log_info "配置监控脚本..."
    
    # 创建监控脚本
    cat > /opt/learnflow/monitor.sh <<'EOF'
#!/bin/bash
LOG_FILE="/var/log/learnflow/monitor.log"
ALERT_EMAIL="admin@example.com"

# 检查磁盘使用率
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "$(date): 磁盘使用率过高: ${DISK_USAGE}%" >> $LOG_FILE
    # 这里可以添加邮件通知
fi

# 检查内存使用率
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
if [ $MEMORY_USAGE -gt 90 ]; then
    echo "$(date): 内存使用率过高: ${MEMORY_USAGE}%" >> $LOG_FILE
fi

# 检查Docker服务状态
if ! docker info >/dev/null 2>&1; then
    echo "$(date): Docker服务异常" >> $LOG_FILE
fi

# 检查应用健康状态
if ! curl -f http://localhost/health >/dev/null 2>&1; then
    echo "$(date): 应用健康检查失败" >> $LOG_FILE
fi
EOF
    
    # 设置执行权限
    chmod +x /opt/learnflow/monitor.sh
    
    # 添加到crontab（每5分钟执行一次监控）
    (crontab -l 2>/dev/null; echo "*/5 * * * * /opt/learnflow/monitor.sh") | crontab -
    
    log_success "监控脚本配置完成"
}

# 显示安装完成信息
show_completion_info() {
    log_success "LearnFlow 服务器安装完成！"
    echo ""
    echo "=== 安装摘要 ==="
    echo "✅ 系统更新完成"
    echo "✅ 基础依赖安装完成"
    echo "✅ 防火墙配置完成"
    echo "✅ fail2ban配置完成"
    echo "✅ 日志轮转配置完成"
    echo "✅ 应用目录创建完成"
    echo "✅ 系统优化配置完成"
    echo "✅ 定时任务配置完成"
    echo "✅ 监控脚本配置完成"
    echo ""
    echo "=== 下一步操作 ==="
    echo "1. 将项目代码复制到 /opt/learnflow 目录"
    echo "2. 运行部署脚本: ./deploy-debian.sh start"
    echo "3. 检查服务状态: ./deploy-debian.sh status"
    echo "4. 查看服务日志: ./deploy-debian.sh logs"
    echo ""
    echo "=== 安全提醒 ==="
    echo "⚠️  请修改默认密码和密钥"
    echo "⚠️  请配置SSL证书"
    echo "⚠️  请定期检查日志文件"
    echo "⚠️  请定期更新系统"
    echo ""
    echo "=== 监控信息 ==="
    echo "📊 系统监控: 每5分钟执行一次"
    echo "💾 数据库备份: 每天凌晨2点执行"
    echo "📝 日志文件: /var/log/learnflow/"
    echo "🔒 防火墙状态: sudo ufw status"
    echo "🚫 fail2ban状态: sudo fail2ban-client status"
}

# 主函数
main() {
    log_info "开始安装 LearnFlow 服务器环境..."
    
    # 检查用户权限
    check_root
    
    # 执行安装步骤
    update_system
    install_dependencies
    configure_firewall
    configure_fail2ban
    configure_logrotate
    create_directories
    configure_system_optimization
    configure_cron
    configure_monitoring
    
    # 显示完成信息
    show_completion_info
}

# 执行主函数
main "$@"
