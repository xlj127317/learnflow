# LearnFlow 环境变量配置对比指南

## 🎯 概述

本文档详细对比LearnFlow项目中不同环境变量配置文件的差异，帮助您选择最适合的配置方案。

## 📁 配置文件概览

```
learnflow/
├── env.production.example          # 🏭 生产环境配置（推荐）
├── env.docker.example             # 🐳 Docker环境配置
├── server/
│   └── env.example               # 🔧 服务端开发配置
└── .env                          # ⚠️ 实际配置文件（不要提交到Git）
```

## 🔍 详细配置对比

### 1. 根目录生产环境配置 (`env.production.example`)

**用途**: Docker生产环境部署
**推荐度**: ⭐⭐⭐⭐⭐
**适用场景**: 服务器生产环境部署

```bash
# 数据库配置
DATABASE_URL=postgresql://learnflow_user:YOUR_DB_PASSWORD@postgres:5432/learnflow
POSTGRES_DB=learnflow
POSTGRES_USER=learnflow_user
POSTGRES_PASSWORD=YOUR_DB_PASSWORD

# JWT配置
JWT_SECRET=YOUR_JWT_SECRET_KEY_HERE
JWT_EXPIRES_IN=7d

# 服务器配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 前端配置
VITE_API_BASE_URL=http://127.0.0.1:3000/api

# AI服务配置 (OpenRouter)
OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY_HERE
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=gpt-3.5-turbo
OPENROUTER_MAX_TOKENS=4000
OPENROUTER_TEMPERATURE=0.7

# 安全配置
CORS_ORIGIN=http://127.0.0.1:8080
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 性能优化配置
NODE_OPTIONS=--max-old-space-size=512
POSTGRES_SHARED_BUFFERS=256MB
POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
POSTGRES_WORK_MEM=4MB
POSTGRES_MAINTENANCE_WORK_MEM=64MB

# 日志配置
LOG_LEVEL=info
LOG_FILE=/var/log/learnflow/app.log

# 监控配置
ENABLE_METRICS=true
METRICS_PORT=9090
```

### 2. Docker环境配置 (`env.docker.example`)

**用途**: Docker开发环境
**推荐度**: ⭐⭐⭐⭐
**适用场景**: 本地Docker开发环境

```bash
# 数据库配置
DATABASE_URL=postgresql://learnflow_user:YOUR_DB_PASSWORD@localhost:5432/learnflow
POSTGRES_DB=learnflow
POSTGRES_USER=learnflow_user
POSTGRES_PASSWORD=YOUR_DB_PASSWORD

# JWT配置
JWT_SECRET=YOUR_JWT_SECRET_KEY_HERE
JWT_EXPIRES_IN=7d

# 服务器配置
NODE_ENV=production
PORT=3000

# 前端配置
VITE_API_BASE_URL=http://localhost:8080/api

# 安全配置
CORS_ORIGIN=http://localhost:8080
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. 服务端开发配置 (`server/env.example`)

**用途**: 服务端本地开发
**推荐度**: ⭐⭐⭐
**适用场景**: 服务端代码开发和调试

```bash
# 数据库配置
DATABASE_URL=postgresql://learnflow_user:YOUR_DB_PASSWORD@localhost:5432/learnflow

# JWT配置
JWT_SECRET=YOUR_JWT_SECRET_KEY_HERE
JWT_EXPIRES_IN=7d

# 服务器配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# AI服务配置 (OpenRouter)
OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY_HERE
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=gpt-3.5-turbo
OPENROUTER_MAX_TOKENS=4000
OPENROUTER_TEMPERATURE=0.7

# 安全配置
CORS_ORIGIN=http://localhost:8080
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 日志配置
LOG_LEVEL=info
LOG_FILE=/var/log/learnflow/server.log

# 性能配置
NODE_OPTIONS=--max-old-space-size=512
```

## 📊 配置项对比表

### 数据库配置对比

| 配置项 | 生产环境 | Docker环境 | 服务端开发 | 说明 |
|--------|----------|------------|------------|------|
| DATABASE_URL | `@postgres:5432` | `@localhost:5432` | `@localhost:5432` | Docker服务名 vs 本地地址 |
| POSTGRES_DB | ✅ | ✅ | ❌ | 数据库名称 |
| POSTGRES_USER | ✅ | ✅ | ❌ | 数据库用户 |
| POSTGRES_PASSWORD | ✅ | ✅ | ❌ | 数据库密码 |

### AI服务配置对比

| 配置项 | 生产环境 | Docker环境 | 服务端开发 | 说明 |
|--------|----------|------------|------------|------|
| OPENROUTER_API_KEY | ✅ | ❌ | ✅ | AI服务API密钥 |
| OPENROUTER_BASE_URL | ✅ | ❌ | ✅ | AI服务基础URL |
| OPENROUTER_MODEL | ✅ | ❌ | ✅ | AI模型选择 |
| OPENROUTER_MAX_TOKENS | ✅ | ❌ | ✅ | 最大Token数 |
| OPENROUTER_TEMPERATURE | ✅ | ❌ | ✅ | 创造性参数 |

### 性能优化配置对比

| 配置项 | 生产环境 | Docker环境 | 服务端开发 | 说明 |
|--------|----------|------------|------------|------|
| NODE_OPTIONS | ✅ | ❌ | ✅ | Node.js内存优化 |
| POSTGRES_SHARED_BUFFERS | ✅ | ❌ | ❌ | PostgreSQL共享缓冲区 |
| POSTGRES_EFFECTIVE_CACHE_SIZE | ✅ | ❌ | ❌ | PostgreSQL有效缓存 |
| POSTGRES_WORK_MEM | ✅ | ❌ | ❌ | PostgreSQL工作内存 |
| POSTGRES_MAINTENANCE_WORK_MEM | ✅ | ❌ | ❌ | PostgreSQL维护内存 |

### 监控和日志配置对比

| 配置项 | 生产环境 | Docker环境 | 服务端开发 | 说明 |
|--------|----------|------------|------------|------|
| LOG_LEVEL | ✅ | ❌ | ✅ | 日志级别 |
| LOG_FILE | ✅ | ❌ | ✅ | 日志文件路径 |
| ENABLE_METRICS | ✅ | ❌ | ❌ | 启用监控 |
| METRICS_PORT | ✅ | ❌ | ❌ | 监控端口 |

## 🎯 配置选择建议

### 生产环境部署（推荐）

```bash
# 使用根目录生产环境配置
cp env.production.example .env
```

**优势**:
- ✅ 配置最完整
- ✅ 包含所有性能优化参数
- ✅ 针对Docker部署优化
- ✅ 包含监控和日志配置

**适用场景**:
- 服务器生产环境
- Docker Compose部署
- 需要完整功能支持

### 本地Docker开发

```bash
# 使用Docker环境配置
cp env.docker.example .env
```

**优势**:
- ✅ 配置简洁
- ✅ 适合本地开发
- ✅ 包含基本安全配置

**适用场景**:
- 本地Docker开发
- 快速原型验证
- 基础功能测试

### 服务端代码开发

```bash
# 使用服务端开发配置
cp server/env.example .env
```

**优势**:
- ✅ 包含AI服务配置
- ✅ 适合服务端调试
- ✅ 包含性能优化

**适用场景**:
- 服务端代码开发
- AI功能测试
- 本地调试

## 🔧 配置迁移指南

### 从开发环境迁移到生产环境

```bash
# 1. 备份当前配置
cp .env .env.backup

# 2. 复制生产环境配置
cp env.production.example .env

# 3. 修改关键配置项
nano .env

# 4. 重启服务
./deploy-debian.sh restart
```

### 从生产环境迁移到开发环境

```bash
# 1. 备份生产配置
cp .env .env.production.backup

# 2. 复制开发环境配置
cp env.docker.example .env

# 3. 修改配置项
nano .env

# 4. 重启服务
docker-compose restart
```

## ⚠️ 重要提醒

### 安全注意事项

1. **永远不要提交`.env`文件到Git**
2. **定期更换API密钥和密码**
3. **使用强密码和长随机密钥**
4. **限制配置文件访问权限**

### 配置验证

```bash
# 验证环境变量是否正确加载
docker-compose exec backend env | grep -E "(OPENROUTER|DATABASE|JWT)"

# 检查服务是否正常启动
docker-compose ps

# 查看服务日志
docker-compose logs backend
```

### 故障排除

如果配置有问题，请检查：

1. **环境变量格式**：确保没有多余的空格或引号
2. **文件编码**：使用UTF-8编码，避免特殊字符
3. **权限设置**：确保配置文件有正确的读取权限
4. **服务重启**：修改配置后必须重启相关服务

## 📚 相关文档

- [Debian部署指南](README-DEBIAN.md)
- [AI服务配置指南](AI-SERVICE-SETUP.md)
- [部署设置指南](DEPLOYMENT-SETUP.md)
- [Docker部署指南](README-DEPLOY.md)

---

**总结**: 根据您的部署需求选择合适的配置文件，生产环境推荐使用`env.production.example`，开发环境可以使用`env.docker.example`或`server/env.example`。
