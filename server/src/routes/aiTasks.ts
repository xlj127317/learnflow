import express from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../shared/prisma';
import { recalculatePlanProgress } from '../services/progressService';

const router = express.Router();

// 获取AI任务完成状态
router.get('/:planId', requireAuth, async (req: any, res, next) => {
  try {
    const { planId } = req.params;
    const userId = req.user!.id;

    // 验证计划是否属于当前用户
    const plan = await prisma.plan.findFirst({
      where: { id: planId, userId }
    });

    if (!plan) {
      return res.status(404).json({ error: '学习计划不存在' });
    }

    // 获取AI任务完成状态
    const completions = await prisma.aITaskCompletion.findMany({
      where: { planId, userId }
    });

    // 转换为Map格式，方便前端使用
    const completionMap = completions.reduce((map: Record<string, boolean>, completion) => {
      map[completion.taskKey] = completion.completed;
      return map;
    }, {});

    res.json({ 
      success: true, 
      completions: completionMap
    });
  } catch (error) {
    console.error('获取AI任务完成状态失败:', error);
    res.status(500).json({ error: '获取AI任务完成状态失败' });
  }
});

// 更新AI任务完成状态
router.put('/:planId/:taskKey', requireAuth, async (req: any, res, next) => {
  try {
    const { planId, taskKey } = req.params;
    const { completed } = req.body;
    const userId = req.user!.id;

    // 验证计划是否属于当前用户
    const plan = await prisma.plan.findFirst({
      where: { id: planId, userId }
    });

    if (!plan) {
      return res.status(404).json({ error: '学习计划不存在' });
    }

    // 使用upsert来创建或更新完成状态
    const completion = await prisma.aITaskCompletion.upsert({
      where: {
        planId_taskKey_userId: {
          planId,
          taskKey,
          userId
        }
      },
      update: {
        completed: Boolean(completed),
        updatedAt: new Date()
      },
      create: {
        planId,
        taskKey,
        completed: Boolean(completed),
        userId
      }
    });

    await recalculatePlanProgress(planId, userId);

    res.json({ 
      success: true, 
      completion,
      message: '任务状态更新成功' 
    });
  } catch (error) {
    console.error('更新AI任务完成状态失败:', error);
    res.status(500).json({ error: '更新AI任务完成状态失败' });
  }
});

// 批量更新AI任务完成状态
router.put('/:planId/batch', requireAuth, async (req: any, res, next) => {
  try {
    const { planId } = req.params;
    const { completions } = req.body;
    const userId = req.user!.id;

    const plan = await prisma.plan.findFirst({
      where: { id: planId, userId }
    });

    if (!plan) {
      return res.status(404).json({ error: '学习计划不存在' });
    }

    const updatePromises = Object.entries(completions).map(([taskKey, completed]) => {
      return prisma.aITaskCompletion.upsert({
        where: {
          planId_taskKey_userId: { planId, taskKey, userId }
        },
        update: {
          completed: Boolean(completed),
          updatedAt: new Date()
        },
        create: {
          planId,
          taskKey,
          completed: Boolean(completed),
          userId
        }
      });
    });

    await Promise.all(updatePromises);
    await recalculatePlanProgress(planId, userId);

    res.json({ 
      success: true, 
      message: '批量更新任务状态成功' 
    });
  } catch (error) {
    console.error('批量更新AI任务完成状态失败:', error);
    res.status(500).json({ error: '批量更新AI任务完成状态失败' });
  }
});

export default router;
