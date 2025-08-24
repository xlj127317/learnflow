import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// 导入路由
import authRoutes from './routes/auth';
import goalRoutes from './routes/goals';
import planRoutes from './routes/plans';
import taskRoutes from './routes/tasks';
import checkinRoutes from './routes/checkins';
import aiTaskRoutes, { initPrisma as initAiTaskPrisma } from './routes/aiTasks';

// 导入 Passport 配置
import passport from './config/passport';

// 加载环境变量
dotenv.config();

// 创建 Express 应用
const app = express();
const PORT = process.env.PORT || 3000;

// 创建 Prisma 客户端
const prisma = new PrismaClient();

// 初始化各个路由的Prisma客户端
initAiTaskPrisma(prisma);

// 全局中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 速率限制 - 开发环境放宽限制
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 生产环境100次/分钟，开发环境1000次/分钟
  message: {
    error: 'Too Many Requests',
    message: '请求频率过高，请稍后重试',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // 在开发环境跳过某些路径的限制
    if (process.env.NODE_ENV !== 'production') {
      const skipPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/me'];
      return skipPaths.some(path => req.path === path);
    }
    return false;
  },
});

// 只在生产环境应用严格的速率限制
if (process.env.NODE_ENV === 'production') {
  app.use('/api', limiter);
} else {
  // 开发环境使用更宽松的限制，仅针对密集操作
  const devLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1分钟
    max: 500, // 开发环境每分钟500次请求
    message: {
      error: 'Too Many Requests',
      message: '请求频率过高，请稍后重试',
    },
  });
  app.use('/api', devLimiter);
}

// Passport 中间件
app.use(passport.initialize());

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/ai-tasks', aiTaskRoutes);

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: '请求的资源不存在',
    path: req.originalUrl,
  });
});

// 全局错误处理中间件
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('全局错误处理:', error);

  // Prisma 错误处理
  if (error.code === 'P2002') {
    return res.status(409).json({
      error: 'Conflict',
      message: '数据已存在，违反唯一性约束',
    });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({
      error: 'Not Found',
      message: '请求的资源不存在',
    });
  }

  // 验证错误
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: '数据验证失败',
      details: error.errors,
    });
  }

  // JWT 错误
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: '无效的认证令牌',
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: '认证令牌已过期',
    });
  }

  // 默认服务器错误
  res.status(500).json({
    error: 'Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
});

// 优雅关闭处理
async function gracefulShutdown(signal: string) {
  console.log(`收到 ${signal} 信号，开始优雅关闭...`);
  
  try {
    // 断开 Prisma 连接
    await prisma.$disconnect();
    console.log('Prisma 连接已断开');
    
    process.exit(0);
  } catch (error) {
    console.error('优雅关闭失败:', error);
    process.exit(1);
  }
}

// 监听退出信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason, 'at:', promise);
  gracefulShutdown('unhandledRejection');
});

// 启动服务器
async function startServer() {
  try {
    // 测试数据库连接
    await prisma.$connect();
    console.log('✅ 数据库连接成功');

    app.listen(PORT, () => {
      console.log(`🚀 LearnFlow 服务器运行在端口 ${PORT}`);
      console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📱 客户端地址: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
      console.log(`🔑 JWT 配置: ${process.env.JWT_SECRET ? '已配置' : '未配置'}`);
      console.log(`🤖 AI 服务: ${process.env.OPENROUTER_API_KEY ? '已配置' : '未配置'}`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();
