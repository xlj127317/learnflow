import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient, GoalStatus } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 所有路由都需要认证
router.use(requireAuth);

/**
 * GET /api/goals
 * 获取用户的目标列表
 */
router.get(
  '/',
  [
    query('status').optional().isIn(['ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          details: errors.array(),
        });
        return;
      }

      const userId = req.user!.id;
      const status = req.query.status as GoalStatus | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      const where = {
        userId,
        ...(status && { status }),
      };

      const [goals, total] = await Promise.all([
        prisma.goal.findMany({
          where,
          include: {
            plans: {
              select: {
                id: true,
                title: true,
                createdAt: true,
              },
            },
            _count: {
              select: {
                plans: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: offset,
          take: limit,
        }),
        prisma.goal.count({ where }),
      ]);

      res.json({
        goals,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('获取目标列表失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '获取目标列表失败',
      });
    }
  }
);

/**
 * GET /api/goals/:id
 * 获取指定目标详情
 */
router.get(
  '/:id',
  [param('id').isString().notEmpty()],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          details: errors.array(),
        });
        return;
      }

      const userId = req.user!.id;
      const goalId = req.params.id;

      const goal = await prisma.goal.findFirst({
        where: {
          id: goalId,
          userId,
        },
        include: {
          plans: {
            include: {
              tasks: {
                orderBy: [
                  { week: 'asc' },
                  { day: 'asc' },
                ],
              },
              _count: {
                select: {
                  tasks: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          _count: {
            select: {
              plans: true,
            },
          },
        },
      });

      if (!goal) {
        res.status(404).json({
          error: 'Not Found',
          message: '目标不存在',
        });
        return;
      }

      res.json({ goal });
    } catch (error) {
      console.error('获取目标详情失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '获取目标详情失败',
      });
    }
  }
);

/**
 * POST /api/goals
 * 创建新目标
 */
router.post(
  '/',
  [
    body('title').isLength({ min: 1, max: 200 }).withMessage('目标标题长度必须在1-200个字符之间'),
    body('description').optional().isLength({ max: 1000 }).withMessage('目标描述不能超过1000个字符'),
    body('targetDate').optional().isISO8601().withMessage('目标日期格式不正确'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          details: errors.array(),
        });
        return;
      }

      const userId = req.user!.id;
      const { title, description, targetDate } = req.body;

      const goal = await prisma.goal.create({
        data: {
          title,
          description,
          targetDate: targetDate ? new Date(targetDate) : null,
          userId,
          status: GoalStatus.ACTIVE,
          progress: 0,
        },
        include: {
          _count: {
            select: {
              plans: true,
            },
          },
        },
      });

      res.status(201).json({
        message: '目标创建成功',
        goal,
      });
    } catch (error) {
      console.error('创建目标失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '创建目标失败',
      });
    }
  }
);

/**
 * PUT /api/goals/:id
 * 更新目标
 */
router.put(
  '/:id',
  [
    param('id').isString().notEmpty(),
    body('title').optional().isLength({ min: 1, max: 200 }),
    body('description').optional().isLength({ max: 1000 }),
    body('targetDate').optional().isISO8601(),
    body('status').optional().isIn(['ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED']),
    body('progress').optional().isInt({ min: 0, max: 100 }),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          details: errors.array(),
        });
        return;
      }

      const userId = req.user!.id;
      const goalId = req.params.id;
      const { title, description, targetDate, status, progress } = req.body;

      // 检查目标是否存在且属于当前用户
      const existingGoal = await prisma.goal.findFirst({
        where: {
          id: goalId,
          userId,
        },
      });

      if (!existingGoal) {
        res.status(404).json({
          error: 'Not Found',
          message: '目标不存在',
        });
        return;
      }

      const goal = await prisma.goal.update({
        where: { id: goalId },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(targetDate && { targetDate: new Date(targetDate) }),
          ...(status && { status: status as GoalStatus }),
          ...(progress !== undefined && { progress }),
        },
        include: {
          _count: {
            select: {
              plans: true,
            },
          },
        },
      });

      res.json({
        message: '目标更新成功',
        goal,
      });
    } catch (error) {
      console.error('更新目标失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '更新目标失败',
      });
    }
  }
);

/**
 * DELETE /api/goals/:id
 * 删除目标
 */
router.delete(
  '/:id',
  [param('id').isString().notEmpty()],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          details: errors.array(),
        });
        return;
      }

      const userId = req.user!.id;
      const goalId = req.params.id;

      // 检查目标是否存在且属于当前用户
      const existingGoal = await prisma.goal.findFirst({
        where: {
          id: goalId,
          userId,
        },
      });

      if (!existingGoal) {
        res.status(404).json({
          error: 'Not Found',
          message: '目标不存在',
        });
        return;
      }

      await prisma.goal.delete({
        where: { id: goalId },
      });

      res.json({
        message: '目标删除成功',
      });
    } catch (error) {
      console.error('删除目标失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '删除目标失败',
      });
    }
  }
);

/**
 * GET /api/goals/:id/stats
 * 获取目标统计信息
 */
router.get(
  '/:id/stats',
  [param('id').isString().notEmpty()],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation Error',
          details: errors.array(),
        });
        return;
      }

      const userId = req.user!.id;
      const goalId = req.params.id;

      // 检查目标是否存在且属于当前用户
      const goal = await prisma.goal.findFirst({
        where: {
          id: goalId,
          userId,
        },
      });

      if (!goal) {
        res.status(404).json({
          error: 'Not Found',
          message: '目标不存在',
        });
        return;
      }

      // 获取统计信息
      const [planCount, taskStats, recentCheckins] = await Promise.all([
        prisma.plan.count({
          where: { goalId, userId },
        }),
        prisma.task.aggregate({
          where: { 
            plan: { goalId, userId },
            userId,
          },
          _count: {
            id: true,
          },
          _sum: {
            completed: true,
          },
        }),
        prisma.checkin.findMany({
          where: { userId },
          orderBy: { date: 'desc' },
          take: 7,
          select: {
            id: true,
            date: true,
            duration: true,
            rating: true,
          },
        }),
      ]);

      const completedTasks = taskStats._sum.completed || 0;
      const totalTasks = taskStats._count.id || 0;
      const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      const totalStudyTime = recentCheckins.reduce((sum, checkin) => sum + checkin.duration, 0);
      const averageRating = recentCheckins.length > 0 
        ? recentCheckins.reduce((sum, checkin) => sum + (checkin.rating || 0), 0) / recentCheckins.length
        : 0;

      res.json({
        stats: {
          planCount,
          totalTasks,
          completedTasks,
          taskCompletionRate: Math.round(taskCompletionRate * 100) / 100,
          totalStudyTime, // 分钟
          averageRating: Math.round(averageRating * 100) / 100,
          recentActivity: recentCheckins,
        },
      });
    } catch (error) {
      console.error('获取目标统计失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '获取目标统计失败',
      });
    }
  }
);

export default router;
