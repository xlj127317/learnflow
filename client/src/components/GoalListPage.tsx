import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  PlusIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  SparklesIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { goalApi, planApi } from '../services/api';
import type { Goal } from '../types';

export default function GoalListPage() {
  const navigate = useNavigate();
  const { } = useAuth();

  // 状态管理
  const [goals, setGoals] = useState<Goal[]>([]);
  const [filteredGoals, setFilteredGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'PAUSED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 加载目标列表
  useEffect(() => {
    loadGoals();
  }, []);

  // 过滤和搜索目标
  useEffect(() => {
    let filtered = goals;
    
    // 状态过滤
    if (filter !== 'ALL') {
      filtered = filtered.filter(goal => goal.status === filter);
    }
    
    // 文本搜索
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(goal => 
        goal.title.toLowerCase().includes(query) ||
        (goal.description && goal.description.toLowerCase().includes(query))
      );
    }
    
    setFilteredGoals(filtered);
  }, [goals, filter, searchQuery]);

  const loadGoals = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await goalApi.getGoals();
      setGoals(response.goals);
    } catch (error: any) {
      console.error('加载目标失败:', error);
      setError('加载目标失败：' + (error.message || '请检查网络连接'));
    } finally {
      setIsLoading(false);
    }
  };

  // 更新目标状态
  const handleUpdateGoalStatus = async (goalId: string, newStatus: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED') => {
    try {
      const response = await goalApi.updateGoal(goalId, { status: newStatus });
      
      // 更新本地状态
      setGoals(prev => prev.map(goal => 
        goal.id === goalId 
          ? { ...goal, status: newStatus }
          : goal
      ));
      
      console.log('目标状态更新成功:', response.message);
    } catch (error: any) {
      console.error('更新目标状态失败:', error);
      alert('更新目标状态失败：' + (error.message || '请重试'));
    }
  };

  // 删除目标
  const handleDeleteGoal = async (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const planCount = goal._count?.plans || 0;
    
    const confirmMessage = planCount > 0 
      ? `确定要删除目标"${goal.title}"吗？\n\n⚠️ 将同时删除 ${planCount} 个关联的学习计划和所有任务。\n\n此操作不可撤销！`
      : `确定要删除目标"${goal.title}"吗？\n\n此操作不可撤销！`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // 先删除关联的计划（级联删除）
      if (planCount > 0) {
        console.log('正在删除关联的学习计划...');
        try {
          const plansResponse = await planApi.getPlans(goalId);
          for (const plan of plansResponse.plans) {
            try {
              await planApi.deletePlan(plan.id);
              console.log(`已删除计划: ${plan.title}`);
            } catch (planDeleteError) {
              console.error(`删除计划失败: ${plan.title}`, planDeleteError);
              // 继续删除其他计划，不中断流程
            }
          }
        } catch (error) {
          console.warn('获取关联计划失败，但继续删除目标:', error);
        }
      }

      // 删除目标
      await goalApi.deleteGoal(goalId);
      setGoals(prev => prev.filter(goal => goal.id !== goalId));
    } catch (error: any) {
      console.error('删除目标失败:', error);
      alert('删除失败：' + (error.message || '请重试'));
    }
  };

  // 状态标签样式
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'badge-success';
      case 'COMPLETED':
        return 'badge-primary';
      case 'PAUSED':
        return 'badge-warning';
      case 'CANCELLED':
        return 'badge-error';
      default:
        return 'badge-primary';
    }
  };

  // 状态中文显示
  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '进行中';
      case 'COMPLETED':
        return '已完成';
      case 'PAUSED':
        return '暂停';
      case 'CANCELLED':
        return '已取消';
      default:
        return status;
    }
  };

  // 过滤器计数
  const getFilterCount = (filterType: typeof filter) => {
    if (filterType === 'ALL') return goals.length;
    return goals.filter(goal => goal.status === filterType).length;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">正在加载目标列表...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            返回仪表板
          </button>
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                学习目标
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                管理您的学习目标，追踪学习进度
              </p>
            </div>
            
            <Link to="/goals/new" className="btn-primary">
              <PlusIcon className="h-5 w-5 mr-2" />
              创建目标
            </Link>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-error-800 dark:text-error-200">
                  加载失败
                </h3>
                <p className="mt-1 text-sm text-error-700 dark:text-error-300">{error}</p>
                <button
                  onClick={loadGoals}
                  className="mt-2 btn-outline btn text-sm"
                >
                  重试
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 搜索框 */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="搜索目标标题或描述..."
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

        {/* 过滤器 */}
        <div className="mb-6">
          <div className="flex space-x-2">
            {(['ALL', 'ACTIVE', 'COMPLETED', 'PAUSED'] as const).map(filterType => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === filterType
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-700'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {filterType === 'ALL' ? '全部' : getStatusText(filterType)} ({getFilterCount(filterType)})
              </button>
            ))}
          </div>
        </div>

        {/* 目标列表 */}
        {filteredGoals.length === 0 ? (
          <div className="text-center py-12">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {filter === 'ALL' ? '暂无学习目标' : `暂无${getStatusText(filter)}的目标`}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filter === 'ALL' ? '创建您的第一个学习目标，开始您的学习之旅' : '切换到其他状态查看目标'}
            </p>
            {filter === 'ALL' && (
              <div className="mt-6">
                <Link to="/goals/new" className="btn-primary">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  创建目标
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGoals.map((goal) => (
              <div key={goal.id} className="card hover:shadow-md transition-shadow duration-200 cursor-pointer">
                <Link to={`/goals/${goal.id}`} className="block">
                  <div className="card-body">
                  {/* 目标头部 */}
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white line-clamp-2">
                      {goal.title}
                    </h3>
                    <span className={`badge ${getStatusBadge(goal.status)} ml-2 flex-shrink-0`}>
                      {getStatusText(goal.status)}
                    </span>
                  </div>

                  {/* 目标描述 */}
                  {goal.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                      {goal.description}
                    </p>
                  )}

                  {/* 进度条 */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        完成进度
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {goal.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* 目标信息 */}
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center">
                      <CalendarDaysIcon className="h-4 w-4 mr-1" />
                      {goal.targetDate 
                        ? format(new Date(goal.targetDate), 'yyyy/MM/dd')
                        : '无截止日期'
                      }
                    </div>
                    <div className="flex items-center">
                      <ChartBarIcon className="h-4 w-4 mr-1" />
                      {goal._count?.plans || 0} 个计划
                    </div>
                  </div>

                  </div>
                </Link>
                
                {/* 操作按钮 - 阻止冒泡 */}
                <div className="flex space-x-2 p-4 pt-0">
                  <Link
                    to={`/planner?goalId=${goal.id}&from=/goals`}
                    className="flex-1 btn-primary text-sm py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <SparklesIcon className="h-4 w-4 mr-1" />
                    AI规划
                  </Link>
                  
                  {/* 状态更新按钮 */}
                  {goal.status === 'ACTIVE' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateGoalStatus(goal.id, 'COMPLETED');
                      }}
                      className="btn-outline text-sm py-2 px-3 text-success-600 hover:text-success-700 hover:border-success-300"
                      title="标记为已完成"
                    >
                      ✓
                    </button>
                  )}
                  
                  {goal.status === 'COMPLETED' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateGoalStatus(goal.id, 'ACTIVE');
                      }}
                      className="btn-outline text-sm py-2 px-3 text-blue-600 hover:text-blue-700 hover:border-blue-300"
                      title="重新激活"
                    >
                      ↻
                    </button>
                  )}
                  
                  <Link
                    to={`/goals/${goal.id}/edit`}
                    className="btn-outline text-sm py-2 px-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGoal(goal.id);
                    }}
                    className="btn-outline text-sm py-2 px-3 text-error-600 hover:text-error-700 hover:border-error-300"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}
