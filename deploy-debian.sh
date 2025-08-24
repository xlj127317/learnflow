#!/bin/bash

# LearnFlow Docker 部署脚本 (Debian 12版本)
# 针对2核4GB服务器优化
# 使用方法: ./deploy-debian.sh [start|stop|restart|logs|clean]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目名称
PROJECT_NAME="learnflow"

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
        log_warning "检测到root用户，建议使用普通用户运行此脚本"
        read -p "是否继续？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 检查系统要求
check_system() {
    log_info "检查系统要求..."
    
    # 检查操作系统
    if [[ ! -f /etc/debian_version ]]; then
        log_error "此脚本仅支持Debian系统"
        exit 1
    fi
    
    # 检查Debian版本
    DEBIAN_VERSION=$(cat /etc/debian_version | cut -d. -f1)
    if [[ $DEBIAN_VERSION -lt 12 ]]; then
        log_warning "检测到Debian $DEBIAN_VERSION，建议使用Debian 12或更高版本"
    fi
    
    # 检查内存
    MEMORY_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEMORY_GB=$((MEMORY_KB / 1024 / 1024))
    if [[ $MEMORY_GB -lt 3 ]]; then
        log_error "内存不足，需要至少3GB内存，当前: ${MEMORY_GB}GB"
        exit 1
    fi
    
    # 检查CPU核心数
    CPU_CORES=$(nproc)
    if [[ $CPU_CORES -lt 2 ]]; then
        log_warning "CPU核心数较少，当前: ${CPU_CORES}核，建议至少2核"
    fi
    
    # 检查磁盘空间
    DISK_SPACE=$(df / | tail -1 | awk '{print $4}')
    DISK_SPACE_GB=$((DISK_SPACE / 1024 / 1024))
    if [[ $DISK_SPACE_GB -lt 10 ]]; then
        log_error "磁盘空间不足，需要至少10GB，当前: ${DISK_SPACE_GB}GB"
        exit 1
    fi
    
    log_success "系统要求检查通过"
    log_info "内存: ${MEMORY_GB}GB, CPU: ${CPU_CORES}核, 磁盘: ${DISK_SPACE_GB}GB"
}

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_info "Docker未安装，开始安装..."
        install_docker
    else
        log_success "Docker已安装"
        docker --version
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_info "Docker Compose未安装，开始安装..."
        install_docker_compose
    else
        log_success "Docker Compose已安装"
        docker-compose --version
    fi
    
    # 启动Docker服务
    if ! systemctl is-active --quiet docker; then
        log_info "启动Docker服务..."
        sudo systemctl start docker
        sudo systemctl enable docker
    fi
    
    # 将当前用户添加到docker组
    if ! groups $USER | grep -q docker; then
        log_info "将用户添加到docker组..."
        sudo usermod -aG docker $USER
        log_warning "请重新登录以使组权限生效，或运行: newgrp docker"
    fi
}

# 安装Docker
install_docker() {
    log_info "安装Docker..."
    
    # 更新包索引
    sudo apt update
    
    # 安装必要的包
    sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    # 添加Docker官方GPG密钥
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # 设置稳定版仓库
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 安装Docker Engine
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    log_success "Docker安装完成"
}

# 安装Docker Compose
install_docker_compose() {
    log_info "安装Docker Compose..."
    
    # 下载最新版本
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # 设置执行权限
    sudo chmod +x /usr/local/bin/docker-compose
    
    # 创建软链接
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    log_success "Docker Compose安装完成"
}

# 检查端口是否被占用
check_ports() {
    local ports=("5432" "3000" "80")
    
    for port in "${ports[@]}"; do
        if netstat -an 2>/dev/null | grep -q ":$port "; then
            log_warning "端口 $port 已被占用，请确保没有其他服务使用这些端口"
        fi
    done
}

# 优化系统设置
optimize_system() {
    log_info "优化系统设置..."
    
    # 创建系统配置文件
    sudo tee /etc/sysctl.d/99-docker.conf > /dev/null <<EOF
# Docker优化设置
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = bbr
net.core.default_qdisc = fq
EOF
    
    # 应用设置
    sudo sysctl -p /etc/sysctl.d/99-docker.conf
    
    # 优化文件描述符限制
    sudo tee /etc/security/limits.d/99-docker.conf > /dev/null <<EOF
# Docker文件描述符限制
* soft nofile 65536
* hard nofile 65536
EOF
    
    log_success "系统优化完成"
}

# 启动服务
start_services() {
    log_info "启动 LearnFlow 服务..."
    
    # 使用生产环境配置
    docker-compose -f docker-compose.production.yml up -d
    
    log_success "服务启动完成！"
    log_info "等待服务就绪..."
    
    # 等待数据库就绪
    wait_for_database
    
    # 执行数据库迁移
    run_migrations
    
    log_success "部署完成！"
    show_status
}

# 停止服务
stop_services() {
    log_info "停止 LearnFlow 服务..."
    docker-compose -f docker-compose.production.yml down
    log_success "服务已停止"
}

# 重启服务
restart_services() {
    log_info "重启 LearnFlow 服务..."
    docker-compose -f docker-compose.production.yml restart
    log_success "服务已重启"
}

# 查看日志
show_logs() {
    log_info "显示服务日志..."
    docker-compose -f docker-compose.production.yml logs -f
}

# 清理资源
clean_resources() {
    log_warning "这将删除所有容器、镜像和数据卷，确定继续吗？(y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "清理资源..."
        docker-compose -f docker-compose.production.yml down -v --rmi all
        docker system prune -f
        log_success "资源清理完成"
    else
        log_info "取消清理操作"
    fi
}

# 等待数据库就绪
wait_for_database() {
    log_info "等待数据库就绪..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U learnflow_user -d learnflow >/dev/null 2>&1; then
            log_success "数据库已就绪"
            return 0
        fi
        
        log_info "等待数据库... (尝试 $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    log_error "数据库启动超时"
    exit 1
}

# 执行数据库迁移
run_migrations() {
    log_info "执行数据库迁移..."
    
    try {
        # 生成Prisma客户端
        docker-compose -f docker-compose.production.yml exec -T backend npx prisma generate
        
        # 执行迁移
        docker-compose -f docker-compose.production.yml exec -T backend npx prisma migrate deploy
        
        log_success "数据库迁移完成"
    } catch {
        log_warning "数据库迁移失败，请检查日志"
    }
}

# 显示服务状态
show_status() {
    log_info "服务状态："
    docker-compose -f docker-compose.production.yml ps
    
    echo ""
    log_info "访问地址："
    echo "  - 前端应用: http://$(hostname -I | awk '{print $1}')"
    echo "  - 后端API: http://$(hostname -I | awk '{print $1}')/api"
    echo "  - 数据库: localhost:5432"
    
    echo ""
    log_info "管理命令："
    echo "  - 查看日志: ./deploy-debian.sh logs"
    echo "  - 重启服务: ./deploy-debian.sh restart"
    echo "  - 停止服务: ./deploy-debian.sh stop"
    echo "  - 清理资源: ./deploy-debian.sh clean"
    
    echo ""
    log_info "系统监控："
    echo "  - 查看资源使用: docker stats"
    echo "  - 查看系统资源: htop"
    echo "  - 查看磁盘使用: df -h"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 检查前端
    if curl -f http://localhost/health >/dev/null 2>&1; then
        log_success "前端服务正常"
    else
        log_error "前端服务异常"
    fi
    
    # 检查后端
    if curl -f http://localhost/api/health >/dev/null 2>&1; then
        log_success "后端服务正常"
    else
        log_error "后端服务异常"
    fi
    
    # 检查数据库
    if docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U learnflow_user -d learnflow >/dev/null 2>&1; then
        log_success "数据库服务正常"
    else
        log_error "数据库服务异常"
    fi
}

# 性能监控
monitor_performance() {
    log_info "系统性能监控..."
    
    echo "=== 系统资源使用 ==="
    echo "内存使用:"
    free -h
    
    echo ""
    echo "CPU使用:"
    top -bn1 | grep "Cpu(s)"
    
    echo ""
    echo "磁盘使用:"
    df -h
    
    echo ""
    echo "Docker容器资源使用:"
    docker stats --no-stream
}

# 主函数
main() {
    local action=${1:-start}
    
    case $action in
        "start")
            check_root
            check_system
            check_docker
            check_ports
            optimize_system
            start_services
            ;;
        "stop")
            stop_services
            ;;
        "restart")
            restart_services
            ;;
        "logs")
            show_logs
            ;;
        "clean")
            clean_resources
            ;;
        "status")
            docker-compose -f docker-compose.production.yml ps
            ;;
        "health")
            health_check
            ;;
        "monitor")
            monitor_performance
            ;;
        *)
            echo "使用方法: $0 [start|stop|restart|logs|clean|status|health|monitor]"
            echo ""
            echo "命令说明："
            echo "  start   - 启动所有服务（包含系统检查和优化）"
            echo "  stop    - 停止所有服务"
            echo "  restart - 重启所有服务"
            echo "  logs    - 查看服务日志"
            echo "  clean   - 清理所有资源"
            echo "  status  - 查看服务状态"
            echo "  health  - 执行健康检查"
            echo "  monitor - 监控系统性能"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
