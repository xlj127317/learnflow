import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../shared/prisma';
import { checkAndUnlock, seedAchievements } from '../services/achievementService';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/achievements
 * 获取所有成就及当前用户解锁状态
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    await seedAchievements();

    const all = await prisma.achievement.findMany({ orderBy: { category: 'asc' } });
    const unlocked = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true, unlockedAt: true },
    });

    const unlockedMap = new Map(unlocked.map(u => [u.achievementId, u.unlockedAt]));

    const achievements = all.map(a => ({
      ...a,
      unlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id) || null,
    }));

    res.json({ achievements, unlockedCount: unlocked.length, totalCount: all.length });
  } catch (error) {
    console.error('获取成就列表失败:', error);
    res.status(500).json({ error: 'Server Error', message: '获取成就列表失败' });
  }
});

/**
 * POST /api/achievements/check
 * 主动触发成就检测，返回新解锁的成就
 */
router.post('/check', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    await seedAchievements();
    const newlyUnlocked = await checkAndUnlock(userId);
    res.json({ newlyUnlocked });
  } catch (error) {
    console.error('成就检测失败:', error);
    res.status(500).json({ error: 'Server Error', message: '成就检测失败' });
  }
});

export default router;
