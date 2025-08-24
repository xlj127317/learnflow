import express from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = express.Router();

// 从主文件导入Prisma客户端
let prisma: PrismaClient;

// 初始化函数，由主文件调用
export function initPrisma(prismaClient: PrismaClient) {
  prisma = prismaClient;
}

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

    // 计算计划进度并更新
    await updatePlanProgress(planId, userId);

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

    // 验证计划是否属于当前用户
    const plan = await prisma.plan.findFirst({
      where: { id: planId, userId }
    });

    if (!plan) {
      return res.status(404).json({ error: '学习计划不存在' });
    }

    // 批量更新完成状态
    const updatePromises = Object.entries(completions).map(([taskKey, completed]) => {
      return prisma.aITaskCompletion.upsert({
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
    });

    await Promise.all(updatePromises);

    // 计算计划进度并更新
    await updatePlanProgress(planId, userId);

    res.json({ 
      success: true, 
      message: '批量更新任务状态成功' 
    });
  } catch (error) {
    console.error('批量更新AI任务完成状态失败:', error);
    res.status(500).json({ error: '批量更新AI任务完成状态失败' });
  }
});

// 计算并更新计划进度
async function updatePlanProgress(planId: string, userId: string) {
  try {
    // 获取计划信息
    const plan = await prisma.plan.findFirst({
      where: { id: planId, userId },
      include: { aiTaskCompletions: true }
    });

    if (!plan) return;

    // 解析计划内容获取任务总数
    let totalTasks = 0;
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

    if (totalTasks === 0) return;

    // 计算已完成的任务数
    const completedTasks = plan.aiTaskCompletions.filter(c => c.completed).length;
    const progress = Math.round((completedTasks / totalTasks) * 100);

    // 更新计划进度
    await prisma.plan.update({
      where: { id: planId },
      data: { progress } as any
    });

    // 更新关联目标的进度
    const goal = await prisma.goal.findFirst({
      where: { id: plan.goalId, userId }
    });

    if (goal) {
      // 计算该目标下所有计划的平均进度
      const allPlans = await prisma.plan.findMany({
        where: { goalId: goal.id, userId },
        include: { aiTaskCompletions: true }
      });

      let totalGoalProgress = 0;
      let planCount = 0;

      allPlans.forEach(p => {
        if (p.content) {
          try {
            const weeklyPlans = JSON.parse(p.content);
            let planTotalTasks = 0;
            let planCompletedTasks = 0;

            if (Array.isArray(weeklyPlans)) {
              weeklyPlans.forEach((weekPlan: any) => {
                if (weekPlan.tasks && Array.isArray(weekPlan.tasks)) {
                  planTotalTasks += weekPlan.tasks.length;
                }
              });
            }

            if (planTotalTasks > 0) {
              planCompletedTasks = p.aiTaskCompletions.filter(c => c.completed).length;
              totalGoalProgress += (planCompletedTasks / planTotalTasks) * 100;
              planCount++;
            }
          } catch (e) {
            console.error('解析计划内容失败:', e);
          }
        }
      });

      if (planCount > 0) {
        const averageProgress = Math.round(totalGoalProgress / planCount);
        
        // 检查是否所有计划都已完成（进度为100%）
        const allPlansCompleted = allPlans.every(p => (p as any).progress === 100);
        
        // 如果所有计划都完成，将目标标记为已完成
        const newStatus = allPlansCompleted ? 'COMPLETED' : goal.status;
        
        await prisma.goal.update({
          where: { id: goal.id },
          data: { 
            progress: averageProgress,
            status: newStatus
          }
        });
      }
    }
  } catch (error) {
    console.error('更新计划进度失败:', error);
  }
}

export default router;
