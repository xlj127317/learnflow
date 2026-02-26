import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  TrophyIcon,
  LockClosedIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { achievementApi } from '../services/api';
import { useToast } from './Toast';

interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  condition: string;
  category: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

type CategoryKey = 'milestone' | 'streak' | 'effort';

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  milestone: '里程碑',
  streak: '坚持',
  effort: '努力',
};

const CATEGORY_ORDER: CategoryKey[] = ['milestone', 'streak', 'effort'];

export default function AchievementPage() {
  const toast = useToast();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const loadAchievements = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await achievementApi.getAchievements();
      setAchievements(response.achievements);
      setUnlockedCount(response.unlockedCount);
      setTotalCount(response.totalCount);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载成就失败';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  const handleCheck = async () => {
    try {
      setIsChecking(true);
      const response = await achievementApi.checkAchievements();
      if (response.newlyUnlocked.length > 0) {
        const names = response.newlyUnlocked.map(a => `${a.icon} ${a.title}`).join('、');
        toast.success(`恭喜解锁新成就：${names}`);
        await loadAchievements();
      } else {
        toast.info('暂无新成就解锁，继续加油！');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '检查成就失败';
      toast.error(msg);
    } finally {
      setIsChecking(false);
    }
  };

  const grouped = CATEGORY_ORDER.reduce<Record<CategoryKey, Achievement[]>>((acc, cat) => {
    acc[cat] = achievements.filter(a => a.category === cat);
    return acc;
  }, { milestone: [], streak: [], effort: [] });

  const uncategorized = achievements.filter(
    a => !CATEGORY_ORDER.includes(a.category as CategoryKey)
  );

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">正在加载成就...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">我的成就</h1>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
            {unlockedCount}/{totalCount}
          </span>
        </div>
        <button
          onClick={handleCheck}
          disabled={isChecking}
          className="btn-primary self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isChecking ? (
            <span className="flex items-center">
              <span className="spinner w-4 h-4 mr-2" />
              检查中...
            </span>
          ) : (
            <>
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              检查新成就
            </>
          )}
        </button>
      </div>

      {/* Empty state */}
      {achievements.length === 0 && (
        <div className="text-center py-16">
          <TrophyIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-3 text-sm font-medium text-gray-900 dark:text-white">暂无成就</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            开始学习之旅，解锁更多成就吧！
          </p>
        </div>
      )}

      {/* Achievement categories */}
      {CATEGORY_ORDER.map(category => {
        const items = grouped[category];
        if (items.length === 0) return null;

        return (
          <section key={category} className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {CATEGORY_LABELS[category]}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(achievement => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </div>
          </section>
        );
      })}

      {/* Uncategorized achievements */}
      {uncategorized.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">其他</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {uncategorized.map(achievement => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const { unlocked, icon, title, description, condition, unlockedAt } = achievement;

  return (
    <div
      className={`relative rounded-lg border p-5 transition-shadow ${
        unlocked
          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md'
          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50'
      }`}
    >
      {/* Lock overlay for locked achievements */}
      {!unlocked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-gray-100/60 dark:bg-gray-900/40">
          <LockClosedIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
      )}

      <div className={!unlocked ? 'opacity-40' : ''}>
        <div className="text-4xl mb-3">{icon}</div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{description}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500">{condition}</p>
        {unlocked && unlockedAt && (
          <p className="mt-2 text-xs text-green-600 dark:text-green-400">
            {format(new Date(unlockedAt), 'yyyy-MM-dd')} 解锁
          </p>
        )}
      </div>
    </div>
  );
}
