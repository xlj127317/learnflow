#!/bin/bash
#
# LearnFlow 一键部署脚本
# 用法: curl -fsSL <repo>/setup.sh | bash
#   或: git clone <repo> && cd learnflow && ./setup.sh
#

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC}   $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail()    { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }

# ─── 1. 检查 Docker ───
check_docker() {
  info "检查 Docker 环境..."
  if ! command -v docker &>/dev/null; then
    warn "Docker 未安装，正在自动安装..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker && systemctl start docker
    success "Docker 安装完成"
  else
    success "Docker 已安装: $(docker --version)"
  fi

  if ! docker compose version &>/dev/null; then
    fail "Docker Compose 插件未安装，请运行: apt install docker-compose-plugin"
  fi
  success "Docker Compose 已安装"
}

# ─── 2. 生成 .env ───
generate_env() {
  if [ -f .env ]; then
    info ".env 文件已存在，跳过生成"
    return
  fi

  info "生成 .env 配置文件..."

  JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
  POSTGRES_PASSWORD=$(openssl rand -hex 16 2>/dev/null || head -c 16 /dev/urandom | xxd -p)

  cat > .env <<EOF
# ═══════════════════════════════════════
# LearnFlow 生产环境配置
# 由 setup.sh 自动生成于 $(date '+%Y-%m-%d %H:%M:%S')
# ═══════════════════════════════════════

# 数据库密码（自动生成）
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}

# JWT 密钥（自动生成，请勿泄露）
JWT_SECRET=${JWT_SECRET}

# 对外端口（默认 80）
PORT=80

# 前端访问地址（用于 CORS，改成你的域名）
CORS_ORIGIN=http://localhost

# AI 服务（可选，不填则 AI 功能不可用）
OPENROUTER_API_KEY=
OPENROUTER_MODEL=gpt-3.5-turbo
EOF

  success ".env 配置文件已生成（JWT 密钥和数据库密码已自动随机生成）"
}

# ─── 3. 构建并启动 ───
build_and_start() {
  info "构建 Docker 镜像（首次约 3-5 分钟）..."
  docker compose build --no-cache

  info "启动服务..."
  docker compose up -d

  success "容器已启动"
}

# ─── 4. 等待数据库就绪并初始化 ───
init_database() {
  info "等待数据库就绪..."
  local max=30
  local i=1
  while [ $i -le $max ]; do
    if docker compose exec -T postgres pg_isready -U learnflow_user -d learnflow &>/dev/null; then
      success "数据库已就绪"
      break
    fi
    sleep 2
    i=$((i+1))
  done
  [ $i -gt $max ] && fail "数据库启动超时"

  info "同步数据库表结构..."
  docker compose exec -T backend npx prisma db push --accept-data-loss 2>/dev/null || \
  docker compose exec -T backend npx prisma db push 2>/dev/null || \
  warn "Prisma db push 失败，稍后手动执行: docker compose exec backend npx prisma db push"

  success "数据库初始化完成"
}

# ─── 5. 健康检查 ───
health_check() {
  info "执行健康检查..."
  sleep 3

  local ok=true
  if curl -sf http://localhost:${PORT:-80}/health &>/dev/null; then
    success "应用服务正常"
  else
    warn "应用服务暂未就绪，可能需要等待几秒"
    ok=false
  fi
}

# ─── 6. 完成提示 ───
show_result() {
  local port=${PORT:-80}
  echo ""
  echo -e "${GREEN}════════════════════════════════════════${NC}"
  echo -e "${GREEN}  LearnFlow 部署完成！${NC}"
  echo -e "${GREEN}════════════════════════════════════════${NC}"
  echo ""
  echo "  访问地址:  http://<你的服务器IP>:${port}"
  echo "  后端 API:  http://<你的服务器IP>:${port}/api"
  echo "  健康检查:  http://<你的服务器IP>:${port}/health"
  echo ""
  echo "  管理命令:"
  echo "    查看状态:  docker compose ps"
  echo "    查看日志:  docker compose logs -f"
  echo "    重启服务:  docker compose restart"
  echo "    停止服务:  docker compose down"
  echo "    更新部署:  git pull && docker compose up -d --build"
  echo ""
  echo "  配置文件:  .env（修改后需重启: docker compose up -d）"
  echo ""
  if [ -z "${OPENROUTER_API_KEY}" ]; then
    echo -e "  ${YELLOW}提示: AI 功能未配置。如需启用，请编辑 .env 填入 OPENROUTER_API_KEY${NC}"
    echo ""
  fi
}

# ─── 主流程 ───
main() {
  echo ""
  echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║    LearnFlow 一键部署脚本            ║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"
  echo ""

  # 加载已有 .env
  [ -f .env ] && export $(grep -v '^#' .env | grep -v '^$' | xargs) 2>/dev/null

  check_docker
  generate_env

  # 重新加载 .env
  export $(grep -v '^#' .env | grep -v '^$' | xargs) 2>/dev/null

  build_and_start
  init_database
  health_check
  show_result
}

main "$@"
