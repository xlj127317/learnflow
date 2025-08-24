# LearnFlow Docker 部署指南

## 🚀 概述

这是一个完整的Docker部署方案，包含前端、后端、数据库和反向代理服务。整个系统使用Docker Compose进行编排，支持一键部署和管理。

## 🏗️ 架构图

```mermaid
graph TB
    subgraph "外部访问"
        User[用户浏览器]
    end
    
    subgraph "Nginx 反向代理 (8080)"
        Nginx[Nginx]
    end
    
    subgraph "前端服务 (80)"
        Frontend[React + Nginx]
    end
    
    subgraph "后端服务 (3000)"
        Backend[Node.js + Express]
    end
    
    subgraph "数据库 (5432)"
        DB[(PostgreSQL)]
    end
    
    User -->|http://localhost:8080| Nginx
    Nginx -->|静态文件| Frontend
    Nginx -->|/api/*| Backend
    Backend -->|数据操作| DB
    
    style Nginx fill:#ff9999
    style Frontend fill:#99ccff
    style Backend fill:#99ff99
    style DB fill:#ffcc99
```

## 📋 系统要求

- **操作系统**: Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **内存**: 最少 4GB RAM
- **磁盘**: 最少 10GB 可用空间

## 🛠️ 安装步骤

### 1. 安装 Docker

#### Windows
1. 下载并安装 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
2. 启动 Docker Desktop
3. 确保 WSL2 已启用（推荐）

#### macOS
1. 下载并安装 [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop)
2. 启动 Docker Desktop

#### Ubuntu
```bash
# 更新包索引
sudo apt update

# 安装必要的包
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release

# 添加Docker官方GPG密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 设置稳定版仓库
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装Docker Engine
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动Docker服务
sudo systemctl start docker
sudo systemctl enable docker

# 将当前用户添加到docker组
sudo usermod -aG docker $USER
```

### 2. 验证安装

```bash
# 检查Docker版本
docker --version

# 检查Docker Compose版本
docker-compose --version

# 运行测试容器
docker run hello-world
```

## 🚀 快速部署

### 方法1: 使用部署脚本（推荐）

#### Windows PowerShell
```powershell
# 启动所有服务
.\deploy.ps1 start

# 查看服务状态
.\deploy.ps1 status

# 查看日志
.\deploy.ps1 logs

# 停止服务
.\deploy.ps1 stop

# 重启服务
.\deploy.ps1 restart

# 健康检查
.\deploy.ps1 health

# 清理资源
.\deploy.ps1 clean
```

#### Linux/macOS
```bash
# 给脚本执行权限
chmod +x deploy.sh

# 启动所有服务
./deploy.sh start

# 查看服务状态
./deploy.sh status

# 查看日志
./deploy.sh logs

# 停止服务
./deploy.sh stop

# 重启服务
./deploy.sh restart

# 健康检查
./deploy.sh health

# 清理资源
./deploy.sh clean
```

### 方法2: 手动部署

```bash
# 1. 启动所有服务
docker-compose up -d

# 2. 查看服务状态
docker-compose ps

# 3. 查看日志
docker-compose logs -f

# 4. 停止服务
docker-compose down
```

## 🌐 访问地址

部署成功后，您可以通过以下地址访问服务：

- **前端应用**: http://localhost:8080
- **后端API**: http://localhost:8080/api
- **数据库**: localhost:5432
- **健康检查**: http://localhost:8080/health

## 📊 服务说明

### 1. 前端服务 (Frontend)
- **技术栈**: React + Vite + TypeScript
- **容器**: 基于 Nginx Alpine 镜像
- **端口**: 80 (内部)
- **功能**: 提供用户界面，支持SPA路由

### 2. 后端服务 (Backend)
- **技术栈**: Node.js + Express + TypeScript
- **容器**: 基于 Node.js 18 Alpine 镜像
- **端口**: 3000 (内部)
- **功能**: 提供RESTful API，处理业务逻辑

### 3. 数据库服务 (PostgreSQL)
- **版本**: PostgreSQL 15 Alpine
- **端口**: 5432
- **功能**: 数据持久化存储
- **数据卷**: postgres_data (持久化)

### 4. 反向代理 (Nginx)
- **版本**: Nginx Alpine
- **端口**: 8080 (外部访问)
- **功能**: 统一入口、负载均衡、API路由

## 🔧 配置说明

### 环境变量

主要环境变量在 `env.docker` 文件中配置：

```bash
# 数据库配置
DATABASE_URL=postgresql://learnflow_user:learnflow_password@localhost:5432/learnflow
POSTGRES_DB=learnflow
POSTGRES_USER=learnflow_user
POSTGRES_PASSWORD=learnflow_password

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# 服务器配置
NODE_ENV=production
PORT=3000

# 前端配置
VITE_API_BASE_URL=http://localhost:8080/api
```

### 端口配置

| 服务 | 内部端口 | 外部端口 | 说明 |
|------|----------|----------|------|
| 前端 | 80 | - | 仅内部访问 |
| 后端 | 3000 | - | 仅内部访问 |
| 数据库 | 5432 | 5432 | 可直接访问 |
| 反向代理 | 80 | 8080 | 主要访问入口 |

## 📝 常见问题

### 1. 端口被占用
```bash
# 检查端口占用
netstat -an | findstr :8080  # Windows
netstat -an | grep :8080     # Linux/macOS

# 修改端口映射
# 在 docker-compose.yml 中修改 ports 配置
```

### 2. 数据库连接失败
```bash
# 检查数据库容器状态
docker-compose ps postgres

# 查看数据库日志
docker-compose logs postgres

# 手动连接测试
docker-compose exec postgres psql -U learnflow_user -d learnflow
```

### 3. 前端无法访问后端API
```bash
# 检查网络配置
docker network ls
docker network inspect learnflow_learnflow-network

# 检查容器间通信
docker-compose exec frontend ping backend
```

### 4. 权限问题
```bash
# 在Windows上可能需要以管理员身份运行PowerShell
# 在Linux/macOS上可能需要sudo权限
sudo chmod +x deploy.sh
```

## 🔒 安全配置

### 生产环境注意事项

1. **修改默认密码**: 更改 `POSTGRES_PASSWORD` 和 `JWT_SECRET`
2. **限制端口访问**: 只开放必要的端口
3. **启用HTTPS**: 配置SSL证书
4. **防火墙配置**: 限制IP访问范围
5. **定期备份**: 配置数据库备份策略

### 安全头配置

Nginx已配置以下安全头：
- `X-Frame-Options`: 防止点击劫持
- `X-XSS-Protection`: XSS保护
- `X-Content-Type-Options`: 防止MIME类型嗅探
- `Referrer-Policy`: 引用策略控制

## 📈 性能优化

### 1. 资源限制
在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
        reservations:
          memory: 512M
          cpus: '0.25'
```

### 2. 缓存策略
- 静态资源缓存: 1年
- API响应缓存: 根据业务需求配置
- 数据库查询缓存: 使用Redis

### 3. 负载均衡
支持多实例部署：

```yaml
services:
  backend:
    deploy:
      replicas: 3
```

## 🧹 维护操作

### 日常维护
```bash
# 查看资源使用情况
docker stats

# 清理未使用的镜像
docker image prune

# 清理未使用的容器
docker container prune

# 清理未使用的数据卷
docker volume prune
```

### 备份和恢复
```bash
# 备份数据库
docker-compose exec postgres pg_dump -U learnflow_user learnflow > backup.sql

# 恢复数据库
docker-compose exec -T postgres psql -U learnflow_user -d learnflow < backup.sql
```

### 日志管理
```bash
# 查看特定服务日志
docker-compose logs -f backend

# 清理日志
docker-compose exec backend sh -c '> /var/log/nginx/access.log'
```

## 📚 相关文档

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Nginx 配置指南](https://nginx.org/en/docs/)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)

## 🤝 技术支持

如果遇到问题，请：

1. 查看服务日志: `.\deploy.ps1 logs`
2. 执行健康检查: `.\deploy.ps1 health`
3. 检查服务状态: `.\deploy.ps1 status`
4. 查看常见问题章节
5. 提交Issue到项目仓库

---

**注意**: 这是一个生产就绪的部署方案，但在生产环境中使用前，请务必：
- 修改所有默认密码和密钥
- 配置适当的防火墙规则
- 启用HTTPS
- 配置监控和告警
- 制定备份和恢复策略

