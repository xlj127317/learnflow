import prisma from '../shared/prisma';
import logger from '../shared/logger';

interface WeekPlan {
  tasks?: Array<unknown>;
}

/**
 * 从 plan.content (JSON) 中解析 AI 生成的任务总数
 */
export function countAiTasks(content: string | null): number {
  if (!content) return 0;
  try {
    const weeklyPlans: WeekPlan[] = JSON.parse(content);
    if (!Array.isArray(weeklyPlans)) return 0;
    return weeklyPlans.reduce((sum, wp) => {
      return sum + (Array.isArray(wp.tasks) ? wp.tasks.length : 0);
    }, 0);
  } catch {
    logger.warn('解析计划内容失败');
    return 0;
  }
}

/**
 * 重新计算某个 plan 的进度，并级联更新所属 goal 的进度
 */
export async function recalculatePlanProgress(planId: string, userId: string): Promise<void> {
  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId },
    include: { aiTaskCompletions: true },
  });
  if (!plan) return;

  const totalTasks = countAiTasks(plan.content);
  if (totalTasks === 0) return;

  const completedTasks = plan.aiTaskCompletions.filter(c => c.completed).length;
  const progress = Math.round((completedTasks / totalTasks) * 100);

  await prisma.plan.update({
    where: { id: planId },
    data: { progress },
  });

  await recalculateGoalProgress(plan.goalId, userId);
}

/**
 * 重新计算 goal 的进度（取所有 plan 平均值）
 */
export async function recalculateGoalProgress(goalId: string, userId: string): Promise<void> {
  const plans = await prisma.plan.findMany({
    where: { goalId, userId },
    include: { aiTaskCompletions: true },
  });

  let totalProgress = 0;
  let planCount = 0;

  for (const p of plans) {
    const total = countAiTasks(p.content);
    if (total === 0) continue;
    const completed = p.aiTaskCompletions.filter(c => c.completed).length;
    totalProgress += (completed / total) * 100;
    planCount++;
  }

  if (planCount === 0) return;

  const averageProgress = Math.round(totalProgress / planCount);
  const allComplete = averageProgress >= 100;

  await prisma.goal.update({
    where: { id: goalId },
    data: {
      progress: averageProgress,
      ...(allComplete && { status: 'COMPLETED' }),
    },
  });
}
