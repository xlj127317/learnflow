import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
  BookOpenIcon,
  ChartBarIcon,
  EyeIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { goalApi, planApi } from '../services/api';
import type { Goal, Plan } from '../types';

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // 状态管理
  const [goal, setGoal] = useState<Goal | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载目标详情和关联计划
  useEffect(() => {
    const loadGoalDetail = async () => {
      if (!id) {
        setError('目标ID不存在');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [goalResponse, plansResponse] = await Promise.all([
          goalApi.getGoal(id),
          planApi.getPlans(id), // 获取该目标的计划
        ]);
        
        setGoal(goalResponse.goal);
        setPlans(plansResponse.plans);
        setError(null);
      } catch (err: any) {
        console.error('加载目标详情失败:', err);
        setError(err.message || '加载目标详情失败');
      } finally {
        setLoading(false);
      }
    };

    loadGoalDetail();
  }, [id]);

  // 删除目标
  const handleDeleteGoal = async () => {
    if (!goal) return;

    const planCount = plans.length;
    const taskCount = plans.reduce((sum, plan) => sum + (plan.tasks?.length || 0), 0);

    const confirmDelete = confirm(
      `确定要删除目标"${goal.title}"吗？\n\n⚠️ 将同时删除：\n• ${planCount} 个学习计划\n• ${taskCount} 个学习任务\n\n此操作不可撤销！`
    );

    if (!confirmDelete) return;

    try {
      // 先删除关联的计划（级联删除）
      if (plans.length > 0) {
        console.log('正在删除关联的学习计划...');
        for (const plan of plans) {
          try {
            await planApi.deletePlan(plan.id);
            console.log(`已删除计划: ${plan.title}`);
          } catch (planDeleteError) {
            console.error(`删除计划失败: ${plan.title}`, planDeleteError);
            // 继续删除其他计划，不中断流程
          }
        }
      }

      // 删除目标
      await goalApi.deleteGoal(goal.id);
      navigate('/goals');
    } catch (err: any) {
      console.error('删除目标失败:', err);
      alert('删除目标失败，请重试');
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 计算目标进度（基于关联计划）
  const calculateGoalProgress = () => {
    if (plans.length === 0) return 0;
    
    const totalProgress = plans.reduce((sum, plan) => {
      if (plan.tasks) {
        const completedTasks = plan.tasks.filter(task => task.completed).length;
        const totalTasks = plan.tasks.length;
        return sum + (totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0);
      }
      return sum;
    }, 0);
    
    return totalProgress / plans.length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">加载目标详情...</p>
        </div>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">❌</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            加载失败
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <button
            onClick={() => navigate('/goals')}
            className="btn-primary"
          >
            返回目标列表
          </button>
        </div>
      </div>
    );
  }

  const progress = calculateGoalProgress();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/goals')}
              className="btn-ghost mr-4"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {goal.title}
              </h1>
              <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                <CalendarDaysIcon className="h-4 w-4 mr-1" />
                创建于 {formatDate(goal.createdAt)}
                {goal.targetDate && (
                  <>
                    <span className="mx-2">•</span>
                    <ClockIcon className="h-4 w-4 mr-1" />
                    目标日期 {formatDate(goal.targetDate)}
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Link
              to={`/goals/${goal.id}/edit`}
              className="btn-outline flex items-center"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              编辑
            </Link>
            <button
              onClick={handleDeleteGoal}
              className="btn-danger flex items-center"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              删除
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：目标信息 */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            {/* 目标描述 */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  目标描述
                </h3>
              </div>
              <div className="card-body">
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {goal.description || '暂无描述'}
                </p>
              </div>
            </div>

            {/* 学习计划列表 */}
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    关联学习计划
                  </h3>
                  <Link
                    to={`/planner?goalId=${goal.id}`}
                    className="btn-primary text-sm flex items-center"
                  >
                    <SparklesIcon className="h-4 w-4 mr-1" />
                    AI生成计划
                  </Link>
                </div>
              </div>
              <div className="card-body">
                {plans.length > 0 ? (
                  <div className="space-y-4">
                    {plans.map(plan => {
                      const planProgress = plan.tasks 
                        ? (plan.tasks.filter(task => task.completed).length / plan.tasks.length) * 100 
                        : 0;
                      
                      return (
                        <div key={plan.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {plan.title}
                              </h4>
                              <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
                                <CalendarDaysIcon className="h-4 w-4 mr-1" />
                                {plan.durationWeeks} 周计划
                                <span className="mx-2">•</span>
                                <ClockIcon className="h-4 w-4 mr-1" />
                                {formatDate(plan.createdAt)}
                              </div>
                              
                              {/* 进度条 */}
                              <div className="mt-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-gray-600 dark:text-gray-400">
                                    学习进度
                                  </span>
                                  <span className="text-xs text-gray-600 dark:text-gray-400">
                                    {planProgress.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${planProgress}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <div className="ml-4 flex flex-col space-y-2">
                              <Link
                                to={`/plans/${plan.id}`}
                                className="btn-outline btn-sm flex items-center"
                              >
                                <EyeIcon className="h-3 w-3 mr-1" />
                                查看
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      还没有学习计划
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      使用AI智能规划为这个目标生成详细的学习计划
                    </p>
                    <Link
                      to={`/planner?goalId=${goal.id}`}
                      className="btn-primary flex items-center justify-center mx-auto"
                    >
                      <SparklesIcon className="h-4 w-4 mr-2" />
                      开始AI规划
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：统计和操作 */}
        <div className="lg:col-span-1">
          <div className="space-y-6">
            {/* 目标统计 */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  目标统计
                </h3>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  {/* 总体进度 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        总体进度
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${
                          progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* 统计数据 */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {plans.length}
                      </div>
                      <div className="text-xs text-blue-500 dark:text-blue-300">
                        学习计划
                      </div>
                    </div>
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {plans.reduce((sum, plan) => sum + (plan.tasks?.length || 0), 0)}
                      </div>
                      <div className="text-xs text-green-500 dark:text-green-300">
                        学习任务
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 目标状态 */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  目标状态
                </h3>
              </div>
              <div className="card-body">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">状态</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      goal.status === 'ACTIVE' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      goal.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                      goal.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}>
                      {goal.status === 'ACTIVE' ? '进行中' :
                       goal.status === 'COMPLETED' ? '已完成' :
                       goal.status === 'PAUSED' ? '暂停' : '已取消'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">创建时间</span>
                    <span className="text-gray-900 dark:text-white">{formatDate(goal.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">更新时间</span>
                    <span className="text-gray-900 dark:text-white">{formatDate(goal.updatedAt)}</span>
                  </div>
                  {goal.targetDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">目标日期</span>
                      <span className="text-gray-900 dark:text-white">{formatDate(goal.targetDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 快速操作 */}
            <div className="card">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  快速操作
                </h3>
              </div>
              <div className="card-body">
                <div className="space-y-3">
                  <Link
                    to={`/planner?goalId=${goal.id}`}
                    className="w-full btn-primary flex items-center justify-center"
                  >
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    AI智能规划
                  </Link>
                  <Link
                    to="/checkin"
                    className="w-full btn-outline flex items-center justify-center"
                  >
                    <ChartBarIcon className="h-4 w-4 mr-2" />
                    学习打卡
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
