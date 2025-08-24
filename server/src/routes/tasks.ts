import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 所有路由都需要认证
router.use(requireAuth);

/**
 * GET /api/tasks
 * 获取用户的任务列表
 */
router.get(
  '/',
  [
    query('planId').optional().isString(),
    query('week').optional().isInt({ min: 1 }),
    query('completed').optional().isBoolean(),
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
      const planId = req.query.planId as string;
      const week = req.query.week ? parseInt(req.query.week as string) : undefined;
      const completed = req.query.completed === 'true' ? true : req.query.completed === 'false' ? false : undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const where = {
        userId,
        ...(planId && { planId }),
        ...(week && { week }),
        ...(completed !== undefined && { completed }),
      };

      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where,
          include: {
            plan: {
              select: {
                id: true,
                title: true,
                goal: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
          orderBy: [
            { week: 'asc' },
            { day: 'asc' },
            { createdAt: 'asc' },
          ],
          skip: offset,
          take: limit,
        }),
        prisma.task.count({ where }),
      ]);

      res.json({
        tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('获取任务列表失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '获取任务列表失败',
      });
    }
  }
);

/**
 * GET /api/tasks/:id
 * 获取指定任务详情
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
      const taskId = req.params.id;

      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          userId,
        },
        include: {
          plan: {
            select: {
              id: true,
              title: true,
              goal: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                },
              },
            },
          },
        },
      });

      if (!task) {
        res.status(404).json({
          error: 'Not Found',
          message: '任务不存在',
        });
        return;
      }

      res.json({ task });
    } catch (error) {
      console.error('获取任务详情失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '获取任务详情失败',
      });
    }
  }
);

/**
 * PUT /api/tasks/:id/complete
 * 标记任务为完成/未完成
 */
router.put(
  '/:id/complete',
  [
    param('id').isString().notEmpty(),
    body('completed').isBoolean().withMessage('completed 必须是布尔值'),
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
      const taskId = req.params.id;
      const { completed } = req.body;

      // 检查任务是否存在且属于当前用户
      const existingTask = await prisma.task.findFirst({
        where: {
          id: taskId,
          userId,
        },
        include: {
          plan: {
            include: {
              goal: true,
            },
          },
        },
      });

      if (!existingTask) {
        res.status(404).json({
          error: 'Not Found',
          message: '任务不存在',
        });
        return;
      }

      // 更新任务状态
      const task = await prisma.task.update({
        where: { id: taskId },
        data: { completed },
        include: {
          plan: {
            select: {
              id: true,
              title: true,
              goalId: true,
            },
          },
        },
      });

      // 如果任务被标记为完成，更新目标进度
      if (completed && existingTask.plan.goal) {
        // 计算该目标下所有任务的完成情况
        const goalTasks = await prisma.task.findMany({
          where: {
            plan: {
              goalId: existingTask.plan.goalId,
            },
            userId,
          },
        });

        const completedCount = goalTasks.filter(t => t.completed || t.id === taskId).length;
        const progress = Math.round((completedCount / goalTasks.length) * 100);

        // 更新目标进度
        await prisma.goal.update({
          where: { id: existingTask.plan.goalId },
          data: { progress },
        });
      }

      res.json({
        message: completed ? '任务已完成' : '任务标记为未完成',
        task,
      });
    } catch (error) {
      console.error('更新任务状态失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '更新任务状态失败',
      });
    }
  }
);

/**
 * POST /api/tasks
 * 创建新任务
 */
router.post(
  '/',
  [
    body('planId').isString().notEmpty().withMessage('计划ID不能为空'),
    body('title').isLength({ min: 1, max: 200 }).withMessage('任务标题长度必须在1-200个字符之间'),
    body('week').isInt({ min: 1 }).withMessage('周次必须是正整数'),
    body('day').isInt({ min: 1, max: 7 }).withMessage('天数必须在1-7之间'),
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
      const { planId, title, week, day } = req.body;

      // 验证计划是否存在且属于当前用户
      const existingPlan = await prisma.plan.findFirst({
        where: {
          id: planId,
          userId,
        },
      });

      if (!existingPlan) {
        res.status(404).json({
          error: 'Not Found',
          message: '计划不存在',
        });
        return;
      }

      const task = await prisma.task.create({
        data: {
          planId,
          userId,
          title,
          week,
          day,
          completed: false,
        },
        include: {
          plan: {
            select: {
              id: true,
              title: true,
              goal: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      });

      res.status(201).json({
        message: '任务创建成功',
        task,
      });
    } catch (error) {
      console.error('创建任务失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '创建任务失败',
      });
    }
  }
);

/**
 * PUT /api/tasks/:id
 * 更新任务
 */
router.put(
  '/:id',
  [
    param('id').isString().notEmpty(),
    body('title').optional().isLength({ min: 1, max: 200 }),
    body('week').optional().isInt({ min: 1 }),
    body('day').optional().isInt({ min: 1, max: 7 }),
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
      const taskId = req.params.id;
      const { title, week, day } = req.body;

      // 检查任务是否存在且属于当前用户
      const existingTask = await prisma.task.findFirst({
        where: {
          id: taskId,
          userId,
        },
      });

      if (!existingTask) {
        res.status(404).json({
          error: 'Not Found',
          message: '任务不存在',
        });
        return;
      }

      const task = await prisma.task.update({
        where: { id: taskId },
        data: {
          ...(title && { title }),
          ...(week && { week }),
          ...(day && { day }),
        },
        include: {
          plan: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      res.json({
        message: '任务更新成功',
        task,
      });
    } catch (error) {
      console.error('更新任务失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '更新任务失败',
      });
    }
  }
);

/**
 * DELETE /api/tasks/:id
 * 删除任务
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
      const taskId = req.params.id;

      // 检查任务是否存在且属于当前用户
      const existingTask = await prisma.task.findFirst({
        where: {
          id: taskId,
          userId,
        },
      });

      if (!existingTask) {
        res.status(404).json({
          error: 'Not Found',
          message: '任务不存在',
        });
        return;
      }

      await prisma.task.delete({
        where: { id: taskId },
      });

      res.json({
        message: '任务删除成功',
      });
    } catch (error) {
      console.error('删除任务失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '删除任务失败',
      });
    }
  }
);

/**
 * GET /api/tasks/weekly/:week
 * 获取指定周的任务
 */
router.get(
  '/weekly/:week',
  [
    param('week').isInt({ min: 1 }),
    query('planId').optional().isString(),
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
      const week = parseInt(req.params.week);
      const planId = req.query.planId as string;

      const where = {
        userId,
        week,
        ...(planId && { planId }),
      };

      const tasks = await prisma.task.findMany({
        where,
        include: {
          plan: {
            select: {
              id: true,
              title: true,
              goal: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
        orderBy: [
          { day: 'asc' },
          { createdAt: 'asc' },
        ],
      });

      // 按天分组任务
      const tasksByDay = tasks.reduce((acc, task) => {
        const day = task.day;
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(task);
        return acc;
      }, {} as Record<number, typeof tasks>);

      res.json({
        week,
        tasks,
        tasksByDay,
        summary: {
          totalTasks: tasks.length,
          completedTasks: tasks.filter(task => task.completed).length,
          completionRate: tasks.length > 0 ? (tasks.filter(task => task.completed).length / tasks.length) * 100 : 0,
        },
      });
    } catch (error) {
      console.error('获取周任务失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '获取周任务失败',
      });
    }
  }
);

export default router;
