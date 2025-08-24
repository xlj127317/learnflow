import React, { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import type { Checkin } from '../../types';

interface CheckinCalendarProps {
  checkins: Checkin[];
  onDateClick?: (date: Date) => void;
  className?: string;
}

export default function CheckinCalendar({ 
  checkins, 
  onDateClick, 
  className = '' 
}: CheckinCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // 处理日期导航
  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 生成日历数据
  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);
    
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    return days.map(day => {
      const dayCheckins = checkins.filter(checkin => {
        const checkinDate = new Date(checkin.date);
        return format(checkinDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });
      
      const totalDuration = dayCheckins.reduce((sum, checkin) => sum + checkin.duration, 0);
      const averageRating = dayCheckins.length > 0
        ? dayCheckins.reduce((sum, checkin) => sum + (checkin.rating || 0), 0) / dayCheckins.length
        : 0;
      
      return {
        date: day,
        checkins: dayCheckins,
        totalDuration,
        averageRating,
        hasCheckin: dayCheckins.length > 0,
        isCurrentMonth: isSameMonth(day, currentDate),
        isToday: isToday(day),
      };
    });
  }, [checkins, currentDate]);

  // 获取强度等级（基于学习时长）
  const getIntensityLevel = (duration: number): number => {
    if (duration === 0) return 0;
    if (duration < 60) return 1;    // < 1小时
    if (duration < 120) return 2;   // 1-2小时
    if (duration < 240) return 3;   // 2-4小时
    return 4;                       // > 4小时
  };

  // 获取日期样式
  const getDayClasses = (dayData: any): string => {
    const baseClasses = 'relative w-full h-12 flex items-center justify-center text-sm cursor-pointer transition-all duration-200 hover:scale-105';
    
    let classes = baseClasses;
    
    // 当前月份样式
    if (!dayData.isCurrentMonth) {
      classes += ' text-gray-300 dark:text-gray-600';
    } else {
      classes += ' text-gray-900 dark:text-gray-100';
    }
    
    // 今天的样式
    if (dayData.isToday) {
      classes += ' ring-2 ring-primary-500 ring-offset-1 rounded-md font-bold';
    }
    
    // 打卡强度样式
    if (dayData.hasCheckin) {
      const intensity = getIntensityLevel(dayData.totalDuration);
      switch (intensity) {
        case 1:
          classes += ' bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-200';
          break;
        case 2:
          classes += ' bg-success-200 dark:bg-success-800/50 text-success-900 dark:text-success-100';
          break;
        case 3:
          classes += ' bg-success-400 dark:bg-success-700/70 text-white';
          break;
        case 4:
          classes += ' bg-success-600 dark:bg-success-600 text-white font-bold';
          break;
      }
      classes += ' rounded-md';
    } else if (dayData.isCurrentMonth) {
      classes += ' hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md';
    }
    
    return classes;
  };

  // 获取评分颜色
  const getRatingColor = (rating: number): string => {
    if (rating >= 4.5) return 'text-success-500';
    if (rating >= 3.5) return 'text-warning-500';
    if (rating >= 2.5) return 'text-orange-500';
    return 'text-error-500';
  };

  // 计算月度统计
  const monthStats = useMemo(() => {
    const monthDays = calendarData.filter(day => day.isCurrentMonth);
    const checkinDays = monthDays.filter(day => day.hasCheckin);
    const totalDuration = monthDays.reduce((sum, day) => sum + day.totalDuration, 0);
    const averageRating = checkinDays.length > 0
      ? checkinDays.reduce((sum, day) => sum + day.averageRating, 0) / checkinDays.length
      : 0;
    
    return {
      totalDays: monthDays.length,
      checkinDays: checkinDays.length,
      completionRate: Math.round((checkinDays.length / monthDays.length) * 100),
      totalHours: Math.round(totalDuration / 60 * 10) / 10,
      averageRating: Math.round(averageRating * 10) / 10,
    };
  }, [calendarData]);

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            学习打卡日历
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {format(currentDate, 'yyyy年MM月')}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-md hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
          >
            今天
          </button>
          
          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 月度统计 */}
      <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
            {monthStats.checkinDays}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">打卡天数</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-success-600 dark:text-success-400">
            {monthStats.completionRate}%
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">完成率</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-warning-600 dark:text-warning-400">
            {monthStats.totalHours}h
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">总时长</div>
        </div>
        <div className="text-center">
          <div className={`text-lg font-bold ${getRatingColor(monthStats.averageRating)}`}>
            {monthStats.averageRating || '-'}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">平均评分</div>
        </div>
      </div>

      {/* 日历网格 */}
      <div className="space-y-2">
        {/* 星期头部 */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map(weekday => (
            <div 
              key={weekday}
              className="h-8 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              {weekday}
            </div>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-1">
          {calendarData.map((dayData, index) => (
            <div
              key={index}
              className={getDayClasses(dayData)}
              onClick={() => onDateClick?.(dayData.date)}
              title={
                dayData.hasCheckin
                  ? `${format(dayData.date, 'MM月dd日')}\n学习时长: ${Math.round(dayData.totalDuration / 60 * 10) / 10}小时\n${dayData.averageRating > 0 ? `评分: ${dayData.averageRating.toFixed(1)}分` : ''}`
                  : format(dayData.date, 'MM月dd日')
              }
            >
              <span className="relative z-10">
                {format(dayData.date, 'd')}
              </span>
              
              {/* 打卡标记 */}
              {dayData.hasCheckin && (
                <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 bg-white rounded-full opacity-80" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 图例 */}
      <div className="mt-6 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <span className="text-gray-600 dark:text-gray-400">强度:</span>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-200 dark:bg-gray-600 rounded-sm" />
            <span className="text-gray-500">无</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-success-100 dark:bg-success-900/30 rounded-sm" />
            <span className="text-gray-500">&lt;1h</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-success-200 dark:bg-success-800/50 rounded-sm" />
            <span className="text-gray-500">1-2h</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-success-400 dark:bg-success-700/70 rounded-sm" />
            <span className="text-gray-500">2-4h</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-success-600 rounded-sm" />
            <span className="text-gray-500">&gt;4h</span>
          </div>
        </div>
        
        <div className="text-gray-500 dark:text-gray-400">
          点击日期查看详情
        </div>
      </div>
    </div>
  );
}
