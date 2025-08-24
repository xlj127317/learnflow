import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  PlayIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { taskApi } from '../services/api';
import type { Task } from '../types';

export default function TaskListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 状态管理
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL');

  // 加载任务列表
  useEffect(() => {
    loadTasks();
  }, []);

  // 搜索和过滤
  useEffect(() => {
    let filtered = tasks;
    
    // 状态过滤
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(task => 
        statusFilter === 'COMPLETED' ? task.completed : !task.completed
      );
    }
    
    // 文本搜索
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        (task.plan?.title && task.plan.title.toLowerCase().includes(query)) ||
        (task.plan?.goal?.title && task.plan.goal.title.toLowerCase().includes(query))
      );
    }
    
    setFilteredTasks(filtered);
  }, [tasks, statusFilter, searchQuery]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await taskApi.getTasks();
      setTasks(response.tasks);
    } catch (err: any) {
      console.error('加载任务列表失败:', err);
      setError(err.message || '加载任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 切换任务完成状态
  const toggleTaskComplete = async (task: Task) => {
    try {
      const newCompleted = !task.completed;
      await taskApi.updateTask(task.id, { completed: newCompleted });
      
      // 更新本地状态
      setTasks(prev => prev.map(t => 
        t.id === task.id ? { ...t, completed: newCompleted } : t
      ));
    } catch (err: any) {
      console.error('更新任务状态失败:', err);
      alert('更新任务状态失败，请重试');
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
  };

  // 获取状态文本
  const getStatusText = (completed: boolean) => {
    return completed ? '已完成' : '进行中';
  };

  // 获取状态样式
  const getStatusStyle = (completed: boolean) => {
    return completed 
      ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
      : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">加载任务列表...</p>
        </div>
      </div>
    );
  }

  if (error) {
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
            onClick={loadTasks}
            className="btn-primary"
          >
            重新加载
          </button>
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
              我的学习任务
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              管理和跟踪您的所有学习任务
            </p>
          </div>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="mb-6 space-y-4">
        {/* 搜索框 */}
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="搜索任务标题、计划或目标..."
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

        {/* 状态过滤器 */}
        <div className="flex space-x-2">
          {(['ALL', 'PENDING', 'COMPLETED'] as const).map(filterType => (
            <button
              key={filterType}
              onClick={() => setStatusFilter(filterType)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === filterType
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-700'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {filterType === 'ALL' ? '全部' : 
               filterType === 'COMPLETED' ? '已完成' : '进行中'}
              {filterType === 'ALL' ? ` (${tasks.length})` :
               filterType === 'COMPLETED' ? ` (${tasks.filter(t => t.completed).length})` :
               ` (${tasks.filter(t => !t.completed).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* 任务列表 */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16">
          <PlayIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchQuery.trim() || statusFilter !== 'ALL' ? '没有找到匹配的任务' : '暂无学习任务'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
            {searchQuery.trim() || statusFilter !== 'ALL' 
              ? '尝试调整搜索条件或状态筛选'
              : '创建学习目标并生成AI学习计划，系统将自动创建学习任务'
            }
          </p>
          {(searchQuery.trim() || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="btn-outline"
            >
              清除筛选条件
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`card hover:shadow-lg transition-all duration-200 ${
                task.completed ? 'ring-2 ring-green-200 dark:ring-green-800' : ''
              }`}
            >
              <div className="card-body">
                {/* 任务头部 */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white line-clamp-2 flex-1">
                    {task.title}
                  </h3>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(task.completed)}`}>
                    {getStatusText(task.completed)}
                  </span>
                </div>

                {/* 任务信息 */}
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center">
                    <CalendarDaysIcon className="h-4 w-4 mr-1" />
                    第 {task.week} 周 第 {task.day} 天
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {formatDate(task.createdAt)}
                  </div>
                </div>

                {/* 关联计划 */}
                {task.plan && (
                  <div className="mb-4 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                    <div className="text-gray-600 dark:text-gray-400">关联计划:</div>
                    <div className="text-gray-900 dark:text-white font-medium">
                      {task.plan.title}
                    </div>
                    {task.plan.goal && (
                      <div className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                        目标：{task.plan.goal.title}
                      </div>
                    )}
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleTaskComplete(task)}
                    className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                      task.completed
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30'
                        : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/30'
                    }`}
                  >
                    {task.completed ? (
                      <CheckCircleIconSolid className="h-4 w-4 mr-1" />
                    ) : (
                      <PlayIcon className="h-4 w-4 mr-1" />
                    )}
                    {task.completed ? '标记为未完成' : '标记为已完成'}
                  </button>
                  
                  {task.plan && (
                    <Link
                      to={`/plans/${task.plan.id}`}
                      className="btn-outline text-sm py-2 px-3"
                    >
                      查看计划
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 底部提示 */}
      {filteredTasks.length > 0 && (
        <div className="mt-12 text-center">
          <div className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-lg">
            <PlayIcon className="h-4 w-4 mr-2" />
            <span>
              {searchQuery.trim() 
                ? `找到 ${filteredTasks.length} 个匹配的任务`
                : `共 ${filteredTasks.length} 个学习任务`
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
