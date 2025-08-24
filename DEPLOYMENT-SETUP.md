# LearnFlow 部署设置指南

## 🎯 概述

本文档说明如何在服务器上正确设置LearnFlow项目的环境变量和配置文件。

## 📁 配置文件说明

### 1. 环境变量文件

项目包含以下环境变量文件：

- **`env.production.example`** - 生产环境配置示例
- **`env.docker.example`** - Docker环境配置示例
- **`env.example`** - 通用配置示例

### 2. 重要提醒

⚠️ **不要直接使用这些示例文件！** 它们包含占位符，需要您填入实际值。

## 🚀 部署步骤

### 步骤1: 准备环境变量

```bash
# 在服务器上克隆项目
git clone https://github.com/xlj127317/learnflow.git
cd learnflow

# 复制生产环境配置示例
cp env.production.example .env

# 编辑配置文件，填入实际值
nano .env
```

### 步骤2: 配置关键参数

在`.env`文件中，您需要修改以下参数：

```bash
# 数据库配置 - 必须修改
POSTGRES_PASSWORD=your-very-strong-password-here
DATABASE_URL=postgresql://learnflow_user:your-very-strong-password-here@postgres:5432/learnflow

# JWT配置 - 必须修改
JWT_SECRET=your-very-long-random-secret-key-here

# 域名配置 - 根据实际情况修改
VITE_API_BASE_URL=http://your-domain.com/api
CORS_ORIGIN=http://your-domain.com
```

### 步骤3: 生成安全密钥

```bash
# 生成数据库密码
openssl rand -base64 32

# 生成JWT密钥
openssl rand -base64 64

# 设置环境变量
export POSTGRES_PASSWORD="$(openssl rand -base64 32)"
export JWT_SECRET="$(openssl rand -base64 64)"
```

### 步骤4: 部署应用

```bash
# 给脚本执行权限
chmod +x install-debian.sh
chmod +x deploy-debian.sh

# 安装系统环境
./install-debian.sh

# 部署应用
./deploy-debian.sh start
```

## 🔒 安全配置

### 1. 密码要求

- **数据库密码**: 至少32个字符，包含大小写字母、数字和特殊字符
- **JWT密钥**: 至少64个字符，完全随机

### 2. 环境变量安全

```bash
# 正确做法：使用环境变量
export POSTGRES_PASSWORD="your-password"
export JWT_SECRET="your-secret"

# 错误做法：直接在文件中写入密码
POSTGRES_PASSWORD=123456
JWT_SECRET=mysecret
```

### 3. 文件权限

```bash
# 设置正确的文件权限
chmod 600 .env
chown $USER:$USER .env
```

## 📋 配置检查清单

在部署前，请确认：

- [ ] 已复制示例配置文件为`.env`
- [ ] 已修改所有`YOUR_*`占位符
- [ ] 数据库密码足够强
- [ ] JWT密钥足够长且随机
- [ ] 域名配置正确
- [ ] 文件权限设置正确
- [ ] 环境变量已设置

## 🚨 常见问题

### 1. 配置文件被忽略

如果配置文件被Git忽略，请检查：

```bash
# 检查文件是否被忽略
git check-ignore env.production

# 查看.gitignore规则
cat .gitignore
```

### 2. 环境变量未生效

```bash
# 检查环境变量
echo $POSTGRES_PASSWORD
echo $JWT_SECRET

# 重新加载环境变量
source .env
```

### 3. 权限问题

```bash
# 检查文件权限
ls -la .env

# 修复权限
chmod 600 .env
chown $USER:$USER .env
```

## 📚 相关文档

- [README-DEBIAN.md](README-DEBIAN.md) - Debian服务器部署指南
- [README-DEPLOY.md](README-DEPLOY.md) - 通用部署指南
- [TEST-CASES.md](TEST-CASES.md) - 测试用例

## 🤝 技术支持

如果遇到问题：

1. 检查配置文件是否正确
2. 查看服务日志: `./deploy-debian.sh logs`
3. 执行健康检查: `./deploy-debian.sh health`
4. 检查系统资源: `./deploy-debian.sh monitor`

---

**重要提醒**: 永远不要将包含实际密码的`.env`文件提交到Git仓库！
