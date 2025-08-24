#!/bin/bash

# LearnFlow Docker 部署脚本
# 使用方法: ./deploy.sh [start|stop|restart|logs|clean]

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

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_success "Docker 环境检查通过"
}

# 检查端口是否被占用
check_ports() {
    local ports=("5432" "3000" "80" "8080")
    
    for port in "${ports[@]}"; do
        if netstat -an 2>/dev/null | grep -q ":$port "; then
            log_warning "端口 $port 已被占用，请确保没有其他服务使用这些端口"
        fi
    done
}

# 启动服务
start_services() {
    log_info "启动 LearnFlow 服务..."
    
    # 创建网络（如果不存在）
    docker network create ${PROJECT_NAME}-network 2>/dev/null || true
    
    # 启动服务
    docker-compose up -d
    
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
    docker-compose down
    log_success "服务已停止"
}

# 重启服务
restart_services() {
    log_info "重启 LearnFlow 服务..."
    docker-compose restart
    log_success "服务已重启"
}

# 查看日志
show_logs() {
    log_info "显示服务日志..."
    docker-compose logs -f
}

# 清理资源
clean_resources() {
    log_warning "这将删除所有容器、镜像和数据卷，确定继续吗？(y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "清理资源..."
        docker-compose down -v --rmi all
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
        if docker-compose exec -T postgres pg_isready -U learnflow_user -d learnflow >/dev/null 2>&1; then
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
    
    # 生成Prisma客户端
    docker-compose exec -T backend npx prisma generate
    
    # 执行迁移
    docker-compose exec -T backend npx prisma migrate deploy
    
    log_success "数据库迁移完成"
}

# 显示服务状态
show_status() {
    log_info "服务状态："
    docker-compose ps
    
    echo ""
    log_info "访问地址："
    echo "  - 前端应用: http://localhost:8080"
    echo "  - 后端API: http://localhost:8080/api"
    echo "  - 数据库: localhost:5432"
    echo ""
    log_info "管理命令："
    echo "  - 查看日志: ./deploy.sh logs"
    echo "  - 重启服务: ./deploy.sh restart"
    echo "  - 停止服务: ./deploy.sh stop"
    echo "  - 清理资源: ./deploy.sh clean"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 检查前端
    if curl -f http://localhost:8080/health >/dev/null 2>&1; then
        log_success "前端服务正常"
    else
        log_error "前端服务异常"
    fi
    
    # 检查后端
    if curl -f http://localhost:8080/api/health >/dev/null 2>&1; then
        log_success "后端服务正常"
    else
        log_error "后端服务异常"
    fi
    
    # 检查数据库
    if docker-compose exec -T postgres pg_isready -U learnflow_user -d learnflow >/dev/null 2>&1; then
        log_success "数据库服务正常"
    else
        log_error "数据库服务异常"
    fi
}

# 主函数
main() {
    local action=${1:-start}
    
    case $action in
        "start")
            check_docker
            check_ports
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
            docker-compose ps
            ;;
        "health")
            health_check
            ;;
        *)
            echo "使用方法: $0 [start|stop|restart|logs|clean|status|health]"
            echo ""
            echo "命令说明："
            echo "  start   - 启动所有服务"
            echo "  stop    - 停止所有服务"
            echo "  restart - 重启所有服务"
            echo "  logs    - 查看服务日志"
            echo "  clean   - 清理所有资源"
            echo "  status  - 查看服务状态"
            echo "  health  - 执行健康检查"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"

