import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ClockIcon,
  CalendarDaysIcon,
  StarIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { checkinApi, goalApi, planApi } from '../services/api';
import type { Checkin, CheckinFormData, Goal, Plan } from '../types';

export default function CheckinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // 状态管理
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingCheckin, setExistingCheckin] = useState<Checkin | null>(null);

  // 表单状态
  const [formData, setFormData] = useState<CheckinFormData>({
    duration: 60, // 默认1小时
    notes: '',
    rating: 0,
    date: searchParams.get('date') || format(new Date(), 'yyyy-MM-dd'),
    relatedTaskId: undefined,
    relatedPlanId: undefined,
  });

  // 关联数据状态
  const [goals, setGoals] = useState<Goal[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [planTasks, setPlanTasks] = useState<Record<string, any[]>>({});

  // 加载今日打卡记录和相关数据
  useEffect(() => {
    loadTodayCheckin();
    loadGoalsAndPlans();
  }, []);

  const loadTodayCheckin = async () => {
    try {
      setIsLoading(true);
      const response = await checkinApi.getTodayCheckin();
      
      if (response.checkin) {
        setExistingCheckin(response.checkin);
        setFormData({
          duration: response.checkin.duration,
          notes: response.checkin.notes || '',
          rating: response.checkin.rating || 0,
          date: format(new Date(response.checkin.date), 'yyyy-MM-dd'),
          relatedTaskId: (response.checkin as any).relatedTaskId,
          relatedPlanId: (response.checkin as any).relatedPlanId,
        });
      }
    } catch (error) {
      console.error('加载今日打卡失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGoalsAndPlans = async () => {
    try {
      // 并行加载目标和计划
      const [goalsResponse, plansResponse] = await Promise.all([
        goalApi.getGoals({ limit: 50 }),
        planApi.getPlans()
      ]);
      
      setGoals(goalsResponse.goals);
      setPlans(plansResponse.plans);
      
      // 为每个计划准备任务信息
      const tasksMap: Record<string, any[]> = {};
      plansResponse.plans.forEach(plan => {
        if (plan.weeklyPlans && plan.weeklyPlans.length > 0) {
          const allTasks: any[] = [];
          plan.weeklyPlans.forEach(week => {
            if (week.tasks) {
              week.tasks.forEach((task, index) => {
                allTasks.push({
                  id: `week-${week.week}-day-${task.day}-${index}`,
                  title: task.title,
                  week: week.week,
                  day: task.day,
                  description: task.description
                });
              });
            }
          });
          tasksMap[plan.id] = allTasks;
        }
      });
      setPlanTasks(tasksMap);
    } catch (error) {
      console.error('加载目标和计划失败:', error);
    }
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.duration < 1) {
      setError('学习时长必须大于0分钟');
      return;
    }

    if (!formData.rating || formData.rating < 1 || formData.rating > 5) {
      setError('请选择1-5星的评分');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      if (existingCheckin) {
        // 更新现有打卡
        await checkinApi.updateCheckin(existingCheckin.id, {
          duration: formData.duration,
          notes: formData.notes,
          rating: formData.rating,
        });
        setSuccess('打卡记录更新成功！');
      } else {
        // 创建新打卡
        await checkinApi.createCheckin(formData);
        setSuccess('打卡成功！继续保持学习的好习惯 🎉');
      }

      // 3秒后返回仪表板
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } catch (error: any) {
      console.error('打卡失败:', error);
      setError(error.message || '打卡失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 处理输入变化
  const handleInputChange = (field: keyof CheckinFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除错误信息
    if (error) {
      setError(null);
    }
  };

  // 处理评分点击
  const handleRatingClick = (rating: number) => {
    handleInputChange('rating', rating);
  };

  // 快速时长选择
  const quickDurations = [30, 60, 90, 120, 180, 240]; // 分钟

  const handleQuickDuration = (duration: number) => {
    handleInputChange('duration', duration);
  };

  // 格式化时长显示
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}分钟`;
    } else if (mins === 0) {
      return `${hours}小时`;
    } else {
      return `${hours}小时${mins}分钟`;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面头部 */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            返回仪表板
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {existingCheckin ? '更新今日打卡' : '今日学习打卡'}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            记录您的学习时光，追踪成长轨迹
          </p>
        </div>

        {/* 成功提示 */}
        {success && (
          <div className="mb-6 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-md p-4">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-success-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-success-800 dark:text-success-200">
                  打卡成功
                </h3>
                <p className="mt-1 text-sm text-success-700 dark:text-success-300">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-error-800 dark:text-error-200">
                  打卡失败
                </h3>
                <p className="mt-1 text-sm text-error-700 dark:text-error-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 打卡表单 */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              学习记录
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="card-body space-y-6">
            {/* 日期选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                学习日期
              </label>
              <div className="flex items-center">
                <CalendarDaysIcon className="h-5 w-5 text-gray-400 mr-2" />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  className="input"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* 学习时长 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                学习时长
              </label>
              
              {/* 快速选择 */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {quickDurations.map(duration => (
                  <button
                    key={duration}
                    type="button"
                    onClick={() => handleQuickDuration(duration)}
                    className={`btn-outline text-sm py-2 ${
                      formData.duration === duration 
                        ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700' 
                        : ''
                    }`}
                    disabled={isSubmitting}
                  >
                    {formatDuration(duration)}
                  </button>
                ))}
              </div>

              {/* 自定义输入 */}
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                  className="input flex-1"
                  placeholder="输入分钟数"
                  disabled={isSubmitting}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  分钟 ({formatDuration(formData.duration)})
                </span>
              </div>
            </div>

            {/* 关联学习目标（可选） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                关联学习目标（可选）
              </label>
              <div className="space-y-3">
                {/* 目标选择 */}
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    选择学习目标
                  </label>
                  <select
                    value={selectedGoal}
                    onChange={(e) => {
                      setSelectedGoal(e.target.value);
                      setSelectedPlan(''); // 重置计划选择
                      handleInputChange('relatedTaskId', undefined); // 重置任务ID
                      handleInputChange('relatedPlanId', undefined);
                    }}
                    className="input"
                    disabled={isSubmitting}
                  >
                    <option value="">不关联目标</option>
                    {goals.map(goal => (
                      <option key={goal.id} value={goal.id}>
                        {goal.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 计划选择 */}
                {selectedGoal && (
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      选择学习计划（可选）
                    </label>
                    <select
                      value={selectedPlan}
                      onChange={(e) => {
                        setSelectedPlan(e.target.value);
                        handleInputChange('relatedPlanId', e.target.value || undefined);
                        handleInputChange('relatedTaskId', undefined); // 重置任务选择
                      }}
                      className="input"
                      disabled={isSubmitting}
                    >
                      <option value="">不关联计划</option>
                      {plans
                        .filter(plan => plan.goalId === selectedGoal || plan.goal?.id === selectedGoal)
                        .map(plan => (
                          <option key={plan.id} value={plan.id}>
                            {plan.title}
                          </option>
                        ))}
                    </select>
                    {/* 调试信息 */}
                    <div className="text-xs text-gray-500 mt-1">
                      找到 {plans.filter(plan => plan.goalId === selectedGoal || plan.goal?.id === selectedGoal).length} 个计划
                    </div>
                  </div>
                )}

                {/* 任务选择 */}
                {selectedPlan && planTasks[selectedPlan] && (
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      选择学习任务（可选）
                    </label>
                    <select
                      value={formData.relatedTaskId || ''}
                      onChange={(e) => {
                        handleInputChange('relatedTaskId', e.target.value || undefined);
                      }}
                      className="input"
                      disabled={isSubmitting}
                    >
                      <option value="">不关联任务</option>
                      {planTasks[selectedPlan].map(task => (
                        <option key={task.id} value={task.id}>
                          第{task.week}周第{task.day}天: {task.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                关联学习目标可以帮助您更好地追踪学习进度和效果
              </p>
            </div>

            {/* 学习评分 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                学习效果评分
              </label>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingClick(star)}
                    className="p-1 hover:scale-110 transition-transform duration-200"
                    disabled={isSubmitting}
                  >
                    {star <= (formData.rating || 0) ? (
                      <StarIconSolid className="h-8 w-8 text-warning-400" />
                    ) : (
                      <StarIcon className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                    )}
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  {(formData.rating || 0) > 0 ? `${formData.rating} 星` : '请选择评分'}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                1星：效果一般 → 5星：效果很好
              </p>
            </div>

            {/* 学习笔记 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                学习笔记（可选）
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                className="input"
                placeholder="记录今天的学习收获、遇到的问题或感想..."
                disabled={isSubmitting}
              />
            </div>

            {/* 提交按钮 */}
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={isSubmitting || formData.rating === 0}
                className="flex-1 btn-primary py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner w-5 h-5 mr-2" />
                    {existingCheckin ? '更新中...' : '打卡中...'}
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                    {existingCheckin ? '更新打卡' : '完成打卡'}
                  </div>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                disabled={isSubmitting}
                className="btn-outline py-3 px-6"
              >
                取消
              </button>
            </div>
          </form>
        </div>

        {/* 打卡提示 */}
        {!existingCheckin && (
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  💡 打卡小提示
                </h3>
                <div className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                  <ul className="list-disc list-inside space-y-1">
                    <li>每日坚持打卡，形成良好的学习习惯</li>
                    <li>如实记录学习时长，帮助分析学习效率</li>
                    <li>评分有助于了解不同学习方法的效果</li>
                    <li>学习笔记可以记录重要的收获和感悟</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
