import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 所有路由都需要认证
router.use(requireAuth);

/**
 * GET /api/checkins
 * 获取用户的打卡记录列表
 */
router.get(
  '/',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
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
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const where = {
        userId,
        ...(startDate && endDate && {
          date: {
            gte: startDate,
            lte: endDate,
          },
        }),
      };

      const [checkins, total] = await Promise.all([
        prisma.checkin.findMany({
          where,
          orderBy: {
            date: 'desc',
          },
          skip: offset,
          take: limit,
        }),
        prisma.checkin.count({ where }),
      ]);

      res.json({
        checkins,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('获取打卡记录失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '获取打卡记录失败',
      });
    }
  }
);

/**
 * GET /api/checkins/today
 * 获取今天的打卡记录
 */
router.get(
  '/today',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const checkin = await prisma.checkin.findFirst({
        where: {
          userId,
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      res.json({
        checkin,
        hasCheckedIn: !!checkin,
      });
    } catch (error) {
      console.error('获取今日打卡记录失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '获取今日打卡记录失败',
      });
    }
  }
);

/**
 * POST /api/checkins
 * 创建打卡记录
 */
router.post(
  '/',
  [
    body('duration').isInt({ min: 1 }).withMessage('学习时长必须是正整数（分钟）'),
    body('notes').optional().isLength({ max: 1000 }).withMessage('学习笔记不能超过1000个字符'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('评分必须在1-5之间'),
    body('date').optional().isISO8601().withMessage('日期格式不正确'),
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
      const { duration, notes, rating, date } = req.body;
      
      const checkinDate = date ? new Date(date) : new Date();
      
      // 检查今天是否已经打卡
      const today = new Date(checkinDate);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingCheckin = await prisma.checkin.findFirst({
        where: {
          userId,
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (existingCheckin) {
        res.status(409).json({
          error: 'Conflict',
          message: '今天已经打卡了，可以更新现有记录',
          existingCheckin,
        });
        return;
      }

      const checkin = await prisma.checkin.create({
        data: {
          userId,
          date: checkinDate,
          duration,
          notes,
          rating,
        },
      });

      res.status(201).json({
        message: '打卡成功',
        checkin,
      });
    } catch (error) {
      console.error('创建打卡记录失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '打卡失败',
      });
    }
  }
);

/**
 * PUT /api/checkins/:id
 * 更新打卡记录
 */
router.put(
  '/:id',
  [
    param('id').isString().notEmpty(),
    body('duration').optional().isInt({ min: 1 }),
    body('notes').optional().isLength({ max: 1000 }),
    body('rating').optional().isInt({ min: 1, max: 5 }),
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
      const checkinId = req.params.id;
      const { duration, notes, rating } = req.body;

      // 检查打卡记录是否存在且属于当前用户
      const existingCheckin = await prisma.checkin.findFirst({
        where: {
          id: checkinId,
          userId,
        },
      });

      if (!existingCheckin) {
        res.status(404).json({
          error: 'Not Found',
          message: '打卡记录不存在',
        });
        return;
      }

      const checkin = await prisma.checkin.update({
        where: { id: checkinId },
        data: {
          ...(duration && { duration }),
          ...(notes !== undefined && { notes }),
          ...(rating && { rating }),
        },
      });

      res.json({
        message: '打卡记录更新成功',
        checkin,
      });
    } catch (error) {
      console.error('更新打卡记录失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '更新打卡记录失败',
      });
    }
  }
);

/**
 * DELETE /api/checkins/:id
 * 删除打卡记录
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
      const checkinId = req.params.id;

      // 检查打卡记录是否存在且属于当前用户
      const existingCheckin = await prisma.checkin.findFirst({
        where: {
          id: checkinId,
          userId,
        },
      });

      if (!existingCheckin) {
        res.status(404).json({
          error: 'Not Found',
          message: '打卡记录不存在',
        });
        return;
      }

      await prisma.checkin.delete({
        where: { id: checkinId },
      });

      res.json({
        message: '打卡记录删除成功',
      });
    } catch (error) {
      console.error('删除打卡记录失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '删除打卡记录失败',
      });
    }
  }
);

/**
 * GET /api/checkins/stats
 * 获取打卡统计信息
 */
router.get(
  '/stats',
  [
    query('period').optional().isIn(['week', 'month', 'year']),
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
      const period = req.query.period as string || 'month';

      // 计算时间范围
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'year':
          startDate = new Date(now);
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        default: // month
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
      }

      const [checkins, totalStats] = await Promise.all([
        prisma.checkin.findMany({
          where: {
            userId,
            date: {
              gte: startDate,
              lte: now,
            },
          },
          orderBy: {
            date: 'asc',
          },
        }),
        prisma.checkin.aggregate({
          where: { userId },
          _count: { id: true },
          _sum: { duration: true },
          _avg: { rating: true, duration: true },
        }),
      ]);

      // 计算当前周期统计
      const periodStats = {
        totalDays: checkins.length,
        totalMinutes: checkins.reduce((sum, checkin) => sum + checkin.duration, 0),
        averageRating: checkins.length > 0 
          ? checkins.reduce((sum, checkin) => sum + (checkin.rating || 0), 0) / checkins.length
          : 0,
        averageDuration: checkins.length > 0
          ? checkins.reduce((sum, checkin) => sum + checkin.duration, 0) / checkins.length
          : 0,
      };

      // 计算连续打卡天数
      let currentStreak = 0;
      let maxStreak = 0;
      let tempStreak = 0;
      
      const sortedCheckins = [...checkins].reverse(); // 从最新开始
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 检查是否有今天的打卡
      const hasToday = sortedCheckins.some(checkin => {
        const checkinDate = new Date(checkin.date);
        checkinDate.setHours(0, 0, 0, 0);
        return checkinDate.getTime() === today.getTime();
      });

      if (hasToday) {
        currentStreak = 1;
        tempStreak = 1;
        
        // 从昨天开始计算连续天数
        for (let i = 1; i < 365; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() - i);
          
          const hasThisDay = sortedCheckins.some(checkin => {
            const checkinDate = new Date(checkin.date);
            checkinDate.setHours(0, 0, 0, 0);
            return checkinDate.getTime() === checkDate.getTime();
          });
          
          if (hasThisDay) {
            currentStreak++;
            tempStreak++;
          } else {
            break;
          }
        }
      }

      // 计算历史最长连续天数
      // 这里简化处理，实际可以更精确地计算
      maxStreak = Math.max(currentStreak, tempStreak);

      res.json({
        period,
        periodStats: {
          ...periodStats,
          totalHours: Math.round(periodStats.totalMinutes / 60 * 10) / 10,
          averageRating: Math.round(periodStats.averageRating * 100) / 100,
          averageHours: Math.round(periodStats.averageDuration / 60 * 10) / 10,
        },
        overallStats: {
          totalCheckins: totalStats._count.id || 0,
          totalMinutes: totalStats._sum.duration || 0,
          totalHours: Math.round((totalStats._sum.duration || 0) / 60 * 10) / 10,
          averageRating: Math.round((totalStats._avg.rating || 0) * 100) / 100,
          averageDuration: Math.round((totalStats._avg.duration || 0) * 10) / 10,
        },
        streaks: {
          current: currentStreak,
          max: maxStreak,
        },
        checkins: checkins.map(checkin => ({
          date: checkin.date,
          duration: checkin.duration,
          rating: checkin.rating,
        })),
      });
    } catch (error) {
      console.error('获取打卡统计失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '获取打卡统计失败',
      });
    }
  }
);

/**
 * GET /api/checkins/calendar/:year/:month
 * 获取指定月份的打卡日历数据
 */
router.get(
  '/calendar/:year/:month',
  [
    param('year').isInt({ min: 2020, max: 2030 }),
    param('month').isInt({ min: 1, max: 12 }),
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
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const checkins = await prisma.checkin.findMany({
        where: {
          userId,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          date: 'asc',
        },
      });

      // 生成日历数据
      const calendarData: Record<number, any> = {};
      checkins.forEach(checkin => {
        const day = checkin.date.getDate();
        calendarData[day] = {
          hasCheckin: true,
          duration: checkin.duration,
          rating: checkin.rating,
          notes: checkin.notes,
        };
      });

      // 填充没有打卡的天数
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        if (!calendarData[day]) {
          calendarData[day] = {
            hasCheckin: false,
            duration: 0,
            rating: null,
            notes: null,
          };
        }
      }

      res.json({
        year,
        month,
        calendarData,
        summary: {
          totalDays: checkins.length,
          totalMinutes: checkins.reduce((sum, checkin) => sum + checkin.duration, 0),
          completionRate: Math.round((checkins.length / daysInMonth) * 100),
        },
      });
    } catch (error) {
      console.error('获取日历数据失败:', error);
      res.status(500).json({
        error: 'Server Error',
        message: '获取日历数据失败',
      });
    }
  }
);

export default router;
