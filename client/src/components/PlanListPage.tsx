import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  CalendarDaysIcon,
  ClockIcon,
  EyeIcon,
  SparklesIcon,
  BookOpenIcon,
  ChartBarIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { planApi } from '../services/api';
import { useToast } from './Toast';
import { TrashIcon } from '@heroicons/react/24/outline';
import type { Plan } from '../types';

export default function PlanListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const handleDeletePlan = async (planId: string, title: string) => {
    if (!confirm(`确定要删除计划"${title}"吗？此操作不可撤销。`)) return;
    try {
      await planApi.deletePlan(planId);
      setPlans(prev => prev.filter(p => p.id !== planId));
      toast.success('计划已删除');
    } catch {
      toast.error('删除计划失败');
    }
  };

  // 状态管理
  const [plans, setPlans] = useState<Plan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 加载计划列表
  useEffect(() => {
    loadPlans();
  }, []);

  // 搜索过滤
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPlans(plans);
    } else {
      const query = searchQuery.toLowerCase().trim();
      setFilteredPlans(
        plans.filter(plan =>
          plan.title.toLowerCase().includes(query) ||
          (plan.goal?.title && plan.goal.title.toLowerCase().includes(query))
        )
      );
    }
  }, [plans, searchQuery]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await planApi.getPlans();
      setPlans(response.plans);
    } catch (err: any) {
      console.error('加载计划列表失败:', err);
      setError(err.message || '加载计划列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 计算计划进度 - 优先使用API返回的stats字段
  const calculatePlanProgress = (plan: Plan) => {
    // 优先使用API返回的stats字段
    if (plan.stats) {
      return {
        completed: plan.stats.completedTasks,
        total: plan.stats.totalTasks,
        percentage: plan.stats.completionRate
      };
    }
    
    // 回退到progress字段
    if (plan.progress !== undefined && plan.progress !== null) {
      let totalTasks = 0;
      
      // 计算总任务数
      if (plan.weeklyPlans && plan.weeklyPlans.length > 0) {
        plan.weeklyPlans.forEach(week => {
          if (week.tasks) {
            totalTasks += week.tasks.length;
          }
        });
      }
      
      if (totalTasks > 0) {
        const completedTasks = Math.round((plan.progress / 100) * totalTasks);
        return { completed: completedTasks, total: totalTasks, percentage: plan.progress };
      }
    }
    
    // 最后回退到本地计算
    let totalTasks = 0;
    let completedTasks = 0;
    
    if (plan.weeklyPlans && plan.weeklyPlans.length > 0) {
      plan.weeklyPlans.forEach(week => {
        if (week.tasks) {
          totalTasks += week.tasks.length;
        }
      });
    }
    
    if (plan.tasks) {
      completedTasks = plan.tasks.filter(task => task.completed).length;
    }
    
    const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    return { completed: completedTasks, total: totalTasks, percentage };
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="spinner w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">加载计划列表...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="text-red-500 text-4xl mb-4">❌</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            加载失败
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={loadPlans}
            className="btn-primary"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              我的学习计划
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              管理和跟踪您的AI生成学习计划
            </p>
          </div>
          <Link
            to="/planner"
            className="btn-primary flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            创建新计划
          </Link>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="搜索计划标题或关联目标..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {filteredPlans.length === 0 ? (
        // 空状态
        <div className="text-center py-16">
          <SparklesIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery.trim() ? '没有找到匹配的计划' : '还没有学习计划'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {searchQuery.trim() 
              ? `没有找到包含"${searchQuery}"的计划，请尝试其他关键词`
              : '使用AI智能规划功能，为您的学习目标生成个性化的详细计划'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/planner"
              className="btn-primary flex items-center justify-center"
            >
              <SparklesIcon className="h-4 w-4 mr-2" />
              AI智能规划
            </Link>
            <Link
              to="/goals"
              className="btn-outline flex items-center justify-center"
            >
              <BookOpenIcon className="h-4 w-4 mr-2" />
              查看学习目标
            </Link>
          </div>
        </div>
      ) : (
        // 计划列表
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map(plan => {
            const progress = calculatePlanProgress(plan);
            const isCompleted = progress.percentage === 100;
            
            return (
              <div
                key={plan.id}
                className={`card hover:shadow-lg transition-all duration-200 ${
                  isCompleted ? 'ring-2 ring-green-200 dark:ring-green-800' : ''
                }`}
              >
                <div className="card-body">
                  {/* 计划标题和状态 */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white line-clamp-2">
                        {plan.title}
                      </h3>
                      <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <CalendarDaysIcon className="h-4 w-4 mr-1" />
                        {plan.durationWeeks} 周计划
                        <span className="mx-2">•</span>
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {formatDate(plan.createdAt)}
                      </div>
                    </div>
                    {isCompleted && (
                      <div className="flex-shrink-0 ml-2">
                        <div className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 text-xs px-2 py-1 rounded-full">
                          已完成
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 关联目标 */}
                  {plan.goal && (
                    <div className="mb-4 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                      <div className="text-gray-600 dark:text-gray-400">关联目标:</div>
                      <div className="text-gray-900 dark:text-white font-medium">
                        {plan.goal.title}
                      </div>
                    </div>
                  )}

                  {/* 进度条 */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        学习进度
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {progress.completed} / {progress.total} 任务
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isCompleted ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {progress.percentage.toFixed(1)}% 完成
                    </div>
                  </div>

                  {/* 快速统计 */}
                  {plan.weeklyPlans && plan.weeklyPlans.length > 0 && (
                    <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                        <div className="text-blue-600 dark:text-blue-400 font-medium">
                          {plan.weeklyPlans.length} 周
                        </div>
                        <div className="text-blue-500 dark:text-blue-300">
                          学习周期
                        </div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                        <div className="text-green-600 dark:text-green-400 font-medium">
                          {plan.weeklyPlans.reduce((total, week) => 
                            total + (week.goals ? week.goals.length : 0), 0
                          )} 个
                        </div>
                        <div className="text-green-500 dark:text-green-300">
                          学习目标
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    <Link
                      to={`/plans/${plan.id}`}
                      className="flex-1 btn-primary text-center flex items-center justify-center"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      查看详情
                    </Link>
                    {!isCompleted && (
                      <Link
                        to={`/plans/${plan.id}`}
                        className="flex-1 btn-outline text-center flex items-center justify-center"
                      >
                        <ChartBarIcon className="h-4 w-4 mr-1" />
                        继续学习
                      </Link>
                    )}
                    <button
                      onClick={() => handleDeletePlan(plan.id, plan.title)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      title="删除计划"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 底部提示 */}
      {filteredPlans.length > 0 && (
        <div className="mt-12 text-center">
          <div className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-lg">
            <SparklesIcon className="h-4 w-4 mr-2" />
            <span>
              {searchQuery.trim() 
                ? `找到 ${filteredPlans.length} 个匹配的计划`
                : '想要创建更多学习计划？'
              }
            </span>
            {!searchQuery.trim() && (
              <Link
                to="/planner"
                className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center"
              >
                使用AI智能规划
                <ArrowRightIcon className="h-3 w-3 ml-1" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
