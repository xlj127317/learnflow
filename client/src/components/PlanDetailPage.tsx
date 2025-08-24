import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  ChartBarIcon,
  DocumentTextIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { planApi, taskApi, aiTaskApi } from '../services/api';
import MermaidRenderer from './MermaidRenderer';
import type { Plan, WeeklyPlan, Task } from '../types';

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // 状态管理
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [aiTaskStatus, setAiTaskStatus] = useState<Map<string, boolean>>(new Map());
  const [forceUpdate, setForceUpdate] = useState(0); // 强制重新渲染

  // 加载计划详情
  useEffect(() => {
    const loadPlanDetail = async () => {
      if (!id) {
        setError('计划ID不存在');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await planApi.getPlan(id);
        setPlan(response.plan);
        
        // 加载已完成的任务
        if (response.plan.tasks) {
          const completedTaskIds = response.plan.tasks
            .filter((task: Task) => task.completed)
            .map((task: Task) => task.id);
          setCompletedTasks(new Set(completedTaskIds));
        }

        // 加载AI任务完成状态
        try {
          const aiResponse = await aiTaskApi.getCompletions(id);
          if (aiResponse.success) {
            const aiStatusMap = new Map(Object.entries(aiResponse.completions));
            setAiTaskStatus(aiStatusMap);
          }
        } catch (err) {
          console.error('加载AI任务状态失败:', err);
          // 不影响主要功能，继续使用本地状态
        }
        
        setError(null);
      } catch (err: any) {
        console.error('加载计划详情失败:', err);
        setError(err.message || '加载计划详情失败');
      } finally {
        setLoading(false);
      }
    };

    loadPlanDetail();
  }, [id, forceUpdate]); // 添加forceUpdate依赖，确保任务状态变化后重新计算进度

  // 切换任务完成状态
  const toggleTaskComplete = async (taskId: string) => {
    if (!taskId || !id) {
      console.error('无效的任务ID或计划ID');
      return;
    }

    try {
      // 检查是否是AI生成的任务（虚拟ID）
      if (taskId.startsWith('week-')) {
        // AI任务：更新本地状态并保存到数据库
        const newCompleted = !aiTaskStatus.get(taskId);
        setAiTaskStatus(prev => new Map(prev).set(taskId, newCompleted));
        
        // 保存到数据库
        try {
          await aiTaskApi.updateCompletion(id, taskId, newCompleted);
        } catch (err) {
          console.error('保存AI任务状态失败:', err);
          // 如果保存失败，回滚本地状态
          setAiTaskStatus(prev => new Map(prev).set(taskId, !newCompleted));
          alert('保存任务状态失败，请重试');
          return;
        }
        
        // 强制重新渲染以更新进度条和任务列表
        setForceUpdate(prev => prev + 1);
        return;
      }
      
      // 真实任务：更新数据库
      const isCompleted = completedTasks.has(taskId);
      
      if (isCompleted) {
        await taskApi.updateTask(taskId, { completed: false });
        setCompletedTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
      } else {
        await taskApi.updateTask(taskId, { completed: true });
        setCompletedTasks(prev => new Set(prev).add(taskId));
      }
      
      // 强制重新渲染以更新进度条
      setForceUpdate(prev => prev + 1);
    } catch (err: any) {
      console.error('更新任务状态失败:', err);
      alert('更新任务状态失败，请重试');
    }
  };

  // 计算进度 - 优先使用数据库中的进度，回退到本地计算
  const calculateProgress = () => {
    // 优先使用数据库中的进度字段
    if (plan?.progress !== undefined && plan.progress !== null) {
      // 从数据库获取任务总数
      let totalTasks = 0;
      try {
        if (plan?.weeklyPlans && Array.isArray(plan.weeklyPlans)) {
          plan.weeklyPlans.forEach(weekPlan => {
            if (weekPlan && weekPlan.tasks && Array.isArray(weekPlan.tasks)) {
              totalTasks += weekPlan.tasks.length;
            }
          });
        } else if (plan?.tasks && Array.isArray(plan.tasks)) {
          totalTasks = plan.tasks.length;
        }
      } catch (error) {
        console.error('获取任务总数时出错:', error);
      }
      
      const completedTasksCount = totalTasks > 0 ? Math.round((plan.progress / 100) * totalTasks) : 0;
      return { 
        completed: completedTasksCount, 
        total: totalTasks, 
        percentage: plan.progress 
      };
    }
    
    // 回退到本地计算
    let totalTasks = 0;
    let completedTasksCount = 0;
    
    try {
      if (plan?.weeklyPlans && Array.isArray(plan.weeklyPlans)) {
        plan.weeklyPlans.forEach(weekPlan => {
          if (weekPlan && weekPlan.tasks && Array.isArray(weekPlan.tasks)) {
            totalTasks += weekPlan.tasks.length;
            weekPlan.tasks.forEach((task, index) => {
              if (task && typeof task.day === 'number') {
                const taskId = `week-${weekPlan.week}-day-${task.day}-${index}`;
                if (aiTaskStatus.get(taskId) === true) { // 明确检查是否为true
                  completedTasksCount++;
                }
              }
            });
          }
        });
      } else if (plan?.tasks && Array.isArray(plan.tasks)) {
        totalTasks = plan.tasks.length;
        completedTasksCount = plan.tasks.filter(task => task && completedTasks.has(task.id)).length;
      }
    } catch (error) {
      console.error('计算进度时出错:', error);
      return { completed: 0, total: 0, percentage: 0 };
    }
    
    const percentage = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;
    
    return { completed: completedTasksCount, total: totalTasks, percentage };
  };

  // 获取当前周的任务 - 优先使用weeklyPlans中的任务，回退到数据库tasks
  const getCurrentWeekTasks = () => {
    try {
      const currentWeekPlan = getCurrentWeekPlan();
      if (currentWeekPlan?.tasks && Array.isArray(currentWeekPlan.tasks) && currentWeekPlan.tasks.length > 0) {
        // 使用AI生成的周计划任务，添加必要的ID和完成状态
        return currentWeekPlan.tasks
          .filter(task => task && typeof task.day === 'number') // 过滤无效任务
          .map((task, index) => {
            const taskId = `week-${selectedWeek}-day-${task.day}-${index}`;
            return {
              id: taskId,
              planId: plan?.id || '',
              title: task.title || '未命名任务',
              week: selectedWeek,
              day: task.day,
              completed: aiTaskStatus.get(taskId) || false, // 从本地状态获取完成状态
              description: task.description || '',
              estimatedTime: task.estimatedTime || 0,
              userId: plan?.userId || '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
          });
      }
      
      // 回退到数据库中的任务
      if (!plan?.tasks || !Array.isArray(plan.tasks)) return [];
      return plan.tasks.filter(task => task && task.week === selectedWeek);
    } catch (error) {
      console.error('获取当前周任务时出错:', error);
      return [];
    }
  };

  // 获取当前周的计划信息
  const getCurrentWeekPlan = (): WeeklyPlan | null => {
    try {
      if (!plan?.weeklyPlans || !Array.isArray(plan.weeklyPlans)) return null;
      return plan.weeklyPlans.find(week => week && typeof week.week === 'number' && week.week === selectedWeek) || null;
    } catch (error) {
      console.error('获取当前周计划时出错:', error);
      return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">加载计划详情...</p>
        </div>
      </div>
    );
  }

  if (error || !plan) {
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

  const progress = calculateProgress();
  const currentWeekTasks = getCurrentWeekTasks();
  const currentWeekPlan = getCurrentWeekPlan();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="btn-ghost mr-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {plan.title}
            </h1>
            <div className="flex items-center mt-2 text-sm text-gray-600 dark:text-gray-400">
              <CalendarDaysIcon className="h-4 w-4 mr-1" />
              {plan.durationWeeks} 周学习计划
              <span className="mx-2">•</span>
              <ClockIcon className="h-4 w-4 mr-1" />
              {plan.goal?.title}
            </div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center text-sm font-medium text-gray-900 dark:text-white">
              <ChartBarIcon className="h-4 w-4 mr-2" />
              学习进度
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {progress.completed} / {progress.total} 完成
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {progress.percentage.toFixed(1)}% 完成
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 左侧：周导航 */}
        <div className="lg:col-span-1">
          <div className="card sticky top-8">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                学习周次
              </h3>
            </div>
            <div className="card-body p-0">
              <div className="space-y-1">
                {Array.from({ length: plan.durationWeeks }, (_, i) => i + 1).map(week => {
                  const weekTasks = plan.tasks?.filter(task => task.week === week) || [];
                  const completedCount = weekTasks.filter(task => completedTasks.has(task.id)).length;
                  const totalCount = weekTasks.length;
                  const isCompleted = totalCount > 0 && completedCount === totalCount;
                  const isActive = selectedWeek === week;

                  return (
                    <button
                      key={week}
                      onClick={() => setSelectedWeek(week)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/20 border-r-2 border-primary-500'
                          : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {isCompleted ? (
                            <CheckCircleIconSolid className="h-5 w-5 text-green-500 mr-3" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-gray-300 dark:border-gray-600 rounded-full mr-3" />
                          )}
                          <div>
                            <div className={`font-medium ${
                              isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'
                            }`}>
                              第 {week} 周
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {completedCount}/{totalCount} 任务
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：详细内容 */}
        <div className="lg:col-span-3">
          <div className="space-y-6">
            {/* 当前周概览 */}
            {currentWeekPlan && (
              <div className="card">
                <div className="card-header">
                  <div className="flex items-center">
                    <CalendarDaysIcon className="h-5 w-5 mr-2 text-primary-500" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      第 {selectedWeek} 周：{currentWeekPlan.title}
                    </h3>
                  </div>
                </div>
                <div className="card-body">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {currentWeekPlan.description}
                  </p>
                  
                  {/* 本周目标 */}
                  {currentWeekPlan.goals && currentWeekPlan.goals.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        🎯 本周学习目标
                      </h4>
                      <ul className="space-y-1">
                        {currentWeekPlan.goals.map((goal, index) => (
                          <li key={index} className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                            <CheckCircleIcon className="h-4 w-4 mt-0.5 mr-2 text-green-500 flex-shrink-0" />
                            {goal}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 任务列表 */}
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    📋 本周任务
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {currentWeekTasks.filter(task => {
                      // 检查AI任务和数据库任务的完成状态
                      if (task.id.startsWith('week-')) {
                        return aiTaskStatus.get(task.id) || false;
                      }
                      return completedTasks.has(task.id);
                    }).length} / {currentWeekTasks.length} 完成
                  </span>
                </div>
              </div>
              <div className="card-body">
                {currentWeekTasks.length > 0 ? (
                  <div className="space-y-3">
                    {currentWeekTasks.map(task => {
                      const isCompleted = task.id.startsWith('week-') 
                        ? (aiTaskStatus.get(task.id) || false)
                        : completedTasks.has(task.id);
                      
                      return (
                        <div
                          key={task.id}
                          className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg ${
                            isCompleted ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-white dark:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <div className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/20 px-2 py-1 rounded">
                                  第 {task.day} 天
                                </div>
                                {task.estimatedTime && (
                                  <div className="ml-3 flex items-center text-xs text-gray-500">
                                    <ClockIcon className="h-3 w-3 mr-1" />
                                    预计 {task.estimatedTime} 分钟
                                  </div>
                                )}
                              </div>
                              <h4 className={`font-medium mb-1 ${
                                isCompleted ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'
                              }`}>
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className={`text-sm mt-1 ${
                                  isCompleted ? 'text-gray-400 line-through' : 'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {task.description}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => toggleTaskComplete(task.id)}
                              className={`ml-4 flex-shrink-0 p-2 rounded-full transition-colors ${
                                isCompleted
                                  ? 'text-green-600 hover:text-green-700 bg-green-100 dark:bg-green-900/20'
                                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircleIconSolid className="h-6 w-6" />
                              ) : (
                                <PlayIcon className="h-6 w-6" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      本周暂无任务
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      选择其他周次查看相应的学习任务
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 学习流程图 */}
            {plan.mermaidCode && (
              <div className="card">
                <div className="card-header">
                  <div className="flex items-center">
                    <SparklesIcon className="h-5 w-5 mr-2 text-primary-500" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      学习路径图
                    </h3>
                  </div>
                </div>
                <div className="card-body">
                  <MermaidRenderer 
                    code={plan.mermaidCode?.replace(/\\n/g, '\n') || ''}
                    theme="default"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
