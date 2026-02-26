import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../shared/prisma';

// 扩展 Request 类型以包含用户信息
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
}

/**
 * JWT 认证中间件
 * 验证请求头中的 Authorization token，并将用户信息添加到 request 对象中
 */
export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 从请求头获取 token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        error: 'Unauthorized', 
        message: '请提供有效的认证令牌' 
      });
      return;
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前缀
    
    if (!process.env.JWT_SECRET) {
      res.status(500).json({ 
        error: 'Server Error', 
        message: 'JWT密钥未配置' 
      });
      return;
    }

    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    // 从数据库获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      res.status(401).json({ 
        error: 'Unauthorized', 
        message: '用户不存在' 
      });
      return;
    }

    // 将用户信息添加到请求对象中
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ 
        error: 'Unauthorized', 
        message: '无效的认证令牌' 
      });
      return;
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ 
        error: 'Unauthorized', 
        message: '认证令牌已过期' 
      });
      return;
    }

    console.error('认证中间件错误:', error);
    res.status(500).json({ 
      error: 'Server Error', 
      message: '服务器内部错误' 
    });
  }
};

/**
 * RBAC 权限控制中间件
 * 检查用户是否具有指定的角色权限
 * @param roles 允许访问的角色数组
 */
export const requireRole = (roles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'Unauthorized', 
        message: '用户未认证' 
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'Forbidden', 
        message: '权限不足，无法访问此资源' 
      });
      return;
    }

    next();
  };
};

/**
 * 管理员权限中间件
 * 要求用户必须是管理员角色
 */
export const requireAdmin = requireRole([Role.ADMIN]);

/**
 * 用户权限中间件（管理员或普通用户）
 * 允许所有已认证的用户访问
 */
export const requireUser = requireRole([Role.USER, Role.ADMIN]);

/**
 * 生成 JWT token
 * @param userId 用户ID
 * @returns JWT token 字符串
 */
export const generateToken = (userId: string): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT密钥未配置');
  }

  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: 'learnflow',
      audience: 'learnflow-users'
    }
  );
};

/**
 * 验证 JWT token 但不要求认证
 * 用于可选认证的路由
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 没有提供 token，继续处理但不设置用户信息
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      next();
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    // 忽略认证错误，允许请求继续处理
    next();
  }
};
