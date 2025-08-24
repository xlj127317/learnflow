import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { aiService, GeneratePlanRequest } from '../services/aiService';

const router = Router();
const prisma = new PrismaClient();

// 所有路由都需要认证
router.use(requireAuth);

/**
 * POST /api/plans/generate
 * 使用 AI 生成学习计划
 */
router.post(
  '/generate',
  [
    body('goalId').isString().notEmpty().withMessage('目标ID不能为空'),
    body('goal').isLength({ min: 1, max: 500 }).withMessage('学习目标长度必须在1-500个字符之间'),
    body('currentLevel').isIn(['beginner', 'intermediate', 'advanced']).withMessage('请选择有效的当前水平'),
    body('hoursPerWeek').isInt({ min: 1, max: 168 }).withMessage('每周学习时间必须在1-168小时之间'),
    body('durationWeeks').isInt({ min: 1, max: 52 }).withMessage('计划持续时间必须在1-52周之间'),
    body('preferredStyle').optional().isIn(['practical', 'theoretical', 'mixed']),
    body('specificRequirements').optional().isLength({ max: 1000 }),
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
      const { goalId, goal, currentLevel, hoursPerWeek, durationWeeks, preferredStyle, specificRequirements } = req.body;

      // 验证目标是否存在且属于当前用户
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

      // 构建 AI 请求
      const planRequest: GeneratePlanRequest = {
        goal,
        currentLevel,
        hoursPerWeek,
        durationWeeks,
        preferredStyle,
        specificRequirements,
      };

      // 调用 AI 服务生成计划
      const generatedPlan = await aiService.generateLearningPlan(planRequest);

      // 保存生成的计划
      const plan = await prisma.plan.create({
        data: {
          goalId,
          userId,
          title: generatedPlan.title,
          durationWeeks: generatedPlan.durationWeeks,
          mermaidCode: generatedPlan.mermaidCode,
          content: JSON.stringify(generatedPlan.weeklyPlans),
        },
      });

      // 创建任务
      const tasks = [];
      for (const weekPlan of generatedPlan.weeklyPlans) {
        for (const task of weekPlan.tasks) {
          tasks.push({
            planId: plan.id,
            userId,
            title: task.title,
            week: weekPlan.week,
            day: task.day,
            completed: false,
          });
        }
      }

      if (tasks.length > 0) {
        await prisma.task.createMany({
          data: tasks,
        });
      }

      // 获取完整的计划信息返回
      const fullPlan = await prisma.plan.findUnique({
        where: { id: plan.id },
        include: {
          tasks: {
            orderBy: [
              { week: 'asc' },
              { day: 'asc' },
            ],
          },
          goal: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      res.status(201).json({
        message: '学习计划生成成功',
        plan: {
          ...fullPlan,
          weeklyPlans: generatedPlan.weeklyPlans,
        },
      });
    } catch (error) {
      console.error('生成学习计划失败:', error);
      
      if (error instanceof Error) {
        res.status(400).json({
          error: 'AI Service Error',
          message: error.message,
        });
      } else {
        res.status(500).json({
          error: 'Server Error',
          message: '生成学习计划失败',
        });
      }
    }
  }
);

/**
 * GET /api/plans
 * 获取用户的计划列表
 */
router.get(
  '/',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const goalId = req.query.goalId as string;

      const where = {
        userId,
        ...(goalId && { goalId }),
      };

      const plans = await prisma.plan.findMany({
        where,
        include: {
          goal: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
          tasks: {
            select: {
              id: true,
              completed: true,
            },
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
      });

      // 计算每个计划的完成情况，优先使用数据库中的progress字段
      const plansWithStats = plans.map(plan => {
        let completedTasks = 0;
        let totalTasks = 0;
        let completionRate = 0;

        // 优先使用数据库中的progress字段
        if (plan.progress !== undefined && plan.progress !== null) {
          completionRate = plan.progress;
          
          // 从content字段解析任务信息
          if (plan.content) {
            try {
              const weeklyPlans = JSON.parse(plan.content);
              if (Array.isArray(weeklyPlans)) {
                weeklyPlans.forEach((weekPlan: any) => {
                  if (weekPlan.tasks && Array.isArray(weekPlan.tasks)) {
                    totalTasks += weekPlan.tasks.length;
                  }
                });
              }
            } catch (e) {
              console.error('解析计划内容失败:', e);
            }
          }
          
          // 如果没有解析到任务，回退到数据库任务
          if (totalTasks === 0) {
            totalTasks = plan.tasks.length;
          }
          
          completedTasks = Math.round((completionRate / 100) * totalTasks);
        } else {
          // 回退到数据库任务计算
          completedTasks = plan.tasks.filter(task => task.completed).length;
          totalTasks = plan.tasks.length;
          completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        }

        return {
          id: plan.id,
          title: plan.title,
          durationWeeks: plan.durationWeeks,
          createdAt: plan.createdAt,
          goal: plan.goal,
          progress: completionRate,
          weeklyPlans: plan.content ? JSON.parse(plan.content) : null,
          stats: {
            totalTasks,
            completedTasks,
            completionRate: Math.round(completionRate * 100) / 100,
          },
        };
      });

      res.json({
        plans: plansWithStats,
      });
    } catch (error) {
      console.error('获取计划列表失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '获取计划列表失败',
      });
    }
  }
);

/**
 * GET /api/plans/:id
 * 获取指定计划详情
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
      const planId = req.params.id;

      const plan = await prisma.plan.findFirst({
        where: {
          id: planId,
          userId,
        },
        include: {
          goal: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
            },
          },
          tasks: {
            orderBy: [
              { week: 'asc' },
              { day: 'asc' },
            ],
          },
        },
      });

      if (!plan) {
        res.status(404).json({
          error: 'Not Found',
          message: '计划不存在',
        });
        return;
      }

      // 解析周计划内容
      let weeklyPlans = [];
      try {
        if (plan.content) {
          weeklyPlans = JSON.parse(plan.content);
        }
      } catch (error) {
        console.error('解析计划内容失败:', error);
      }

      res.json({
        plan: {
          ...plan,
          weeklyPlans,
        },
      });
    } catch (error) {
      console.error('获取计划详情失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '获取计划详情失败',
      });
    }
  }
);

/**
 * PUT /api/plans/:id
 * 更新计划
 */
router.put(
  '/:id',
  [
    param('id').isString().notEmpty(),
    body('title').optional().isLength({ min: 1, max: 200 }),
    body('mermaidCode').optional().isString(),
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
      const planId = req.params.id;
      const { title, mermaidCode } = req.body;

      // 检查计划是否存在且属于当前用户
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

      const plan = await prisma.plan.update({
        where: { id: planId },
        data: {
          ...(title && { title }),
          ...(mermaidCode && { mermaidCode }),
        },
        include: {
          goal: {
            select: {
              id: true,
              title: true,
            },
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
      });

      res.json({
        message: '计划更新成功',
        plan,
      });
    } catch (error) {
      console.error('更新计划失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '更新计划失败',
      });
    }
  }
);

/**
 * DELETE /api/plans/:id
 * 删除计划
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
      const planId = req.params.id;

      // 检查计划是否存在且属于当前用户
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

      await prisma.plan.delete({
        where: { id: planId },
      });

      res.json({
        message: '计划删除成功',
      });
    } catch (error) {
      console.error('删除计划失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '删除计划失败',
      });
    }
  }
);

export default router;
