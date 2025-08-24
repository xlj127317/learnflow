# LearnFlow AI服务配置指南

## 🎯 概述

LearnFlow使用OpenRouter作为AI服务提供商，支持多种AI模型来生成个性化学习计划。

## 🔑 获取OpenRouter API Key

### 步骤1: 注册OpenRouter账户

1. 访问 [OpenRouter官网](https://openrouter.ai/)
2. 点击 "Sign Up" 注册账户
3. 验证邮箱地址

### 步骤2: 获取API Key

1. 登录后进入 [API Keys页面](https://openrouter.ai/keys)
2. 点击 "Create Key" 创建新的API Key
3. 复制生成的API Key（格式：sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx）

### 步骤3: 配置API Key

在`.env`文件中设置：

```bash
OPENROUTER_API_KEY=sk-or-v1-your-actual-api-key-here
```

## ⚙️ AI服务配置参数

### 基础配置

```bash
# API Key（必需）
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# API基础URL（可选，有默认值）
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# AI模型（可选，有默认值）
OPENROUTER_MODEL=gpt-3.5-turbo
```

### 高级配置

```bash
# 最大Token数（可选，有默认值）
OPENROUTER_MAX_TOKENS=4000

# 创造性参数（可选，有默认值）
OPENROUTER_TEMPERATURE=0.7
```

## 🚀 支持的AI模型

### GPT系列
- `gpt-3.5-turbo` - 推荐，性价比高
- `gpt-4` - 更智能，但成本较高
- `gpt-4-turbo` - 平衡性能和成本

### Claude系列
- `claude-3-haiku` - 快速响应
- `claude-3-sonnet` - 平衡选择
- `claude-3-opus` - 最高性能

### 其他模型
- `llama-3.1-8b-instruct` - 开源模型
- `gemini-pro` - Google模型

## 💰 成本控制

### 模型成本对比（每1K tokens）

| 模型 | 输入成本 | 输出成本 |
|------|----------|----------|
| gpt-3.5-turbo | $0.0005 | $0.0015 |
| gpt-4 | $0.03 | $0.06 |
| claude-3-haiku | $0.00025 | $0.00125 |

### 优化建议

1. **使用gpt-3.5-turbo**：性价比最高
2. **限制输出长度**：设置合理的MAX_TOKENS
3. **缓存结果**：避免重复请求
4. **监控使用量**：定期检查API使用情况

## 🔧 配置验证

### 测试AI服务

```bash
# 启动服务后，测试AI功能
curl -X POST http://localhost/api/ai/generate-plan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "goal": "学习React基础",
    "currentLevel": "beginner",
    "hoursPerWeek": 10,
    "durationWeeks": 4
  }'
```

### 检查日志

```bash
# 查看AI服务日志
docker-compose logs backend | grep -i "ai\|openrouter"

# 或者查看应用日志
tail -f /var/log/learnflow/app.log
```

## 🚨 常见问题

### 1. API Key无效

**错误信息**：`AI 服务认证失败，请检查 API Key`

**解决方案**：
- 检查API Key是否正确复制
- 确认API Key是否已激活
- 检查账户余额是否充足

### 2. 请求频率过高

**错误信息**：`AI 服务请求频率过高，请稍后重试`

**解决方案**：
- 等待一段时间后重试
- 检查RATE_LIMIT配置
- 考虑升级OpenRouter账户

### 3. 模型不可用

**错误信息**：`AI 服务暂时不可用，请稍后重试`

**解决方案**：
- 检查OpenRouter服务状态
- 尝试切换到其他模型
- 检查网络连接

## 📊 监控和告警

### 设置监控

```bash
# 在监控脚本中添加AI服务检查
if ! curl -f http://localhost/api/ai/health >/dev/null 2>&1; then
    echo "$(date): AI服务健康检查失败" >> /var/log/learnflow/monitor.log
fi
```

### 成本告警

```bash
# 设置API使用量告警
# 可以通过OpenRouter Dashboard设置
# 或通过脚本定期检查使用量
```

## 🔒 安全建议

1. **保护API Key**：不要在代码中硬编码
2. **限制访问**：只允许授权用户使用AI功能
3. **监控使用**：定期检查API调用日志
4. **设置配额**：限制每个用户的AI请求次数

## 📚 相关资源

- [OpenRouter官方文档](https://openrouter.ai/docs)
- [OpenRouter模型列表](https://openrouter.ai/models)
- [OpenRouter定价](https://openrouter.ai/pricing)
- [LearnFlow AI服务代码](server/src/services/aiService.ts)

---

**重要提醒**：请妥善保管您的OpenRouter API Key，不要将其提交到Git仓库！
