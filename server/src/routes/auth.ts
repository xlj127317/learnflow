import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { Role } from '@prisma/client';
import { generateToken, requireAuth, AuthenticatedRequest } from '../middleware/auth';
import passport from '../config/passport';
import prisma from '../shared/prisma';

const router = Router();

/**
 * POST /api/auth/register
 * 用户注册
 */
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('请提供有效的邮箱地址'),
    body('name').isLength({ min: 2, max: 50 }).withMessage('用户名长度必须在2-50个字符之间'),
    body('password').isLength({ min: 6 }).withMessage('密码长度至少6个字符'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      // 检查验证错误
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          message: '输入数据验证失败',
          details: errors.array(),
        });
        return;
      }

      const { email, name, password } = req.body;

      // 检查用户是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        res.status(409).json({
          error: 'Conflict',
          message: '该邮箱地址已被注册',
        });
        return;
      }

      // 加密密码
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 创建用户
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: Role.USER,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          createdAt: true,
        },
      });

      // 生成 token
      const token = generateToken(user.id);

      res.status(201).json({
        message: '注册成功',
        user,
        token,
      });
    } catch (error) {
      console.error('注册错误:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '服务器内部错误',
      });
    }
  }
);

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('请提供有效的邮箱地址'),
    body('password').notEmpty().withMessage('密码不能为空'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      // 检查验证错误
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          message: '输入数据验证失败',
          details: errors.array(),
        });
        return;
      }

      const { email, password } = req.body;

      // 查找用户
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: '邮箱或密码错误',
        });
        return;
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        res.status(401).json({
          error: 'Unauthorized',
          message: '邮箱或密码错误',
        });
        return;
      }

      // 生成 token
      const token = generateToken(user.id);

      res.json({
        message: '登录成功',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
        },
        token,
      });
    } catch (error) {
      console.error('登录错误:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '服务器内部错误',
      });
    }
  }
);

/**
 * GET /api/auth/google
 * Google OAuth 登录
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
  })
);

/**
 * GET /api/auth/google/callback
 * Google OAuth 回调
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user as any;
      if (!user) {
        res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
        return;
      }

      const token = generateToken(user.id);
      
      // 重定向到前端，携带 token
      res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Google OAuth 回调错误:', error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
    }
  }
);

/**
 * GET /api/auth/github
 * GitHub OAuth 登录
 */
router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['read:user'], // 只请求读取用户信息，不请求邮箱
  })
);

/**
 * GET /api/auth/github/callback
 * GitHub OAuth 回调
 */
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('=== GitHub OAuth 回调开始 ===');
      console.log('请求用户:', req.user);
      console.log('请求头:', req.headers);
      
      const user = req.user as any;
      if (!user) {
        console.log('❌ 回调中未找到用户，重定向到登录页面');
        res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
        return;
      }

      console.log('✅ 用户认证成功:', {
        id: user.id,
        email: user.email,
        name: user.name
      });

      const token = generateToken(user.id);
      console.log('JWT Token 生成成功');
      
      const redirectUrl = `${process.env.CLIENT_URL}/auth/callback?token=${token}`;
      console.log('重定向到:', redirectUrl);
      
      // 重定向到前端，携带 token
      res.redirect(redirectUrl);
      console.log('=== GitHub OAuth 回调完成 ===');
    } catch (error) {
      console.error('❌ GitHub OAuth 回调错误:', error);
      res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
    }
  }
);

/**
 * GET /api/auth/me
 * 获取当前用户信息
 */
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: '用户未认证',
      });
      return;
    }

    // 获取更详细的用户信息
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            goals: true,
            plans: true,
            checkins: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: '用户不存在',
      });
      return;
    }

    res.json({
      user,
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      error: 'Server Error',
      message: '服务器内部错误',
    });
  }
});

/**
 * POST /api/auth/logout
 * 用户登出（仅返回成功消息，实际 JWT 无法在服务端撤销）
 */
router.post('/logout', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({
    message: '登出成功',
  });
});

export default router;
