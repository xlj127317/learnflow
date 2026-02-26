import prisma from '../shared/prisma';
import logger from '../shared/logger';

interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string;
  condition: string;
  category: string;
  check: (userId: string) => Promise<boolean>;
}

const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: 'first_goal',
    title: '初心萌芽',
    description: '创建第一个学习目标',
    icon: '🌱',
    condition: '创建 1 个目标',
    category: 'milestone',
    check: async (userId) => {
      const count = await prisma.goal.count({ where: { userId } });
      return count >= 1;
    },
  },
  {
    key: 'first_checkin',
    title: '打卡新手',
    description: '完成第一次学习打卡',
    icon: '✅',
    condition: '打卡 1 次',
    category: 'milestone',
    check: async (userId) => {
      const count = await prisma.checkin.count({ where: { userId } });
      return count >= 1;
    },
  },
  {
    key: 'streak_7',
    title: '坚持之星',
    description: '连续打卡 7 天',
    icon: '🔥',
    condition: '连续打卡 7 天',
    category: 'streak',
    check: async (userId) => {
      return await checkStreak(userId, 7);
    },
  },
  {
    key: 'streak_30',
    title: '学习大师',
    description: '连续打卡 30 天',
    icon: '🏆',
    condition: '连续打卡 30 天',
    category: 'streak',
    check: async (userId) => {
      return await checkStreak(userId, 30);
    },
  },
  {
    key: 'complete_goal',
    title: '目标达成',
    description: '完成第一个学习目标',
    icon: '🎯',
    condition: '完成 1 个目标',
    category: 'milestone',
    check: async (userId) => {
      const count = await prisma.goal.count({ where: { userId, status: 'COMPLETED' } });
      return count >= 1;
    },
  },
  {
    key: 'task_10',
    title: '执行力王',
    description: '完成 10 个学习任务',
    icon: '⚡',
    condition: '完成 10 个任务',
    category: 'milestone',
    check: async (userId) => {
      const count = await prisma.task.count({ where: { userId, completed: true } });
      return count >= 10;
    },
  },
  {
    key: 'task_50',
    title: '任务收割机',
    description: '完成 50 个学习任务',
    icon: '🚀',
    condition: '完成 50 个任务',
    category: 'milestone',
    check: async (userId) => {
      const count = await prisma.task.count({ where: { userId, completed: true } });
      return count >= 50;
    },
  },
  {
    key: 'study_10h',
    title: '十小时突破',
    description: '累计学习 10 小时',
    icon: '📚',
    condition: '累计学习 10 小时',
    category: 'effort',
    check: async (userId) => {
      const stats = await prisma.checkin.aggregate({ where: { userId }, _sum: { duration: true } });
      return (stats._sum.duration || 0) >= 600;
    },
  },
  {
    key: 'study_100h',
    title: '百小时里程碑',
    description: '累计学习 100 小时',
    icon: '💎',
    condition: '累计学习 100 小时',
    category: 'effort',
    check: async (userId) => {
      const stats = await prisma.checkin.aggregate({ where: { userId }, _sum: { duration: true } });
      return (stats._sum.duration || 0) >= 6000;
    },
  },
  {
    key: 'plan_3',
    title: '规划达人',
    description: '创建 3 个学习计划',
    icon: '📋',
    condition: '创建 3 个学习计划',
    category: 'milestone',
    check: async (userId) => {
      const count = await prisma.plan.count({ where: { userId } });
      return count >= 3;
    },
  },
];

async function checkStreak(userId: string, days: number): Promise<boolean> {
  const checkins = await prisma.checkin.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: days + 1,
    select: { date: true },
  });

  if (checkins.length < days) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);

    const found = checkins.some(c => {
      const d = new Date(c.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === expected.getTime();
    });

    if (!found) return false;
  }
  return true;
}

/**
 * 确保所有成就定义存在于数据库中
 */
export async function seedAchievements() {
  for (const def of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: def.key },
      update: { title: def.title, description: def.description, icon: def.icon, condition: def.condition, category: def.category },
      create: { key: def.key, title: def.title, description: def.description, icon: def.icon, condition: def.condition, category: def.category },
    });
  }
}

/**
 * 检查并解锁用户的新成就，返回新解锁列表
 */
export async function checkAndUnlock(userId: string) {
  const unlocked = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievement: { select: { key: true } } },
  });
  const unlockedKeys = new Set(unlocked.map(u => u.achievement.key));

  const newlyUnlocked: { key: string; title: string; icon: string }[] = [];

  for (const def of ACHIEVEMENTS) {
    if (unlockedKeys.has(def.key)) continue;

    try {
      const met = await def.check(userId);
      if (!met) continue;

      const achievement = await prisma.achievement.findUnique({ where: { key: def.key } });
      if (!achievement) continue;

      await prisma.userAchievement.create({
        data: { userId, achievementId: achievement.id },
      });

      newlyUnlocked.push({ key: def.key, title: def.title, icon: def.icon });
      logger.info(`成就解锁: ${def.title} (${userId})`);
    } catch (e) {
      logger.warn(`成就检测失败: ${def.key}`, e);
    }
  }

  return newlyUnlocked;
}
