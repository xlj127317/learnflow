import React, { useMemo } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { defaultChartOptions, darkChartOptions, chartColors } from './ChartSetup';
import type { Goal } from '../../types';

interface ProgressChartProps {
  goals: Goal[];
  type?: 'doughnut' | 'bar';
  isDark?: boolean;
  className?: string;
}

export default function ProgressChart({ 
  goals, 
  type = 'doughnut', 
  isDark = false,
  className = '' 
}: ProgressChartProps) {
  const chartData = useMemo(() => {
    if (type === 'doughnut') {
      // 圆环图：显示目标状态分布
      const statusCounts = goals.reduce((acc, goal) => {
        acc[goal.status] = (acc[goal.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const statusLabels = {
        ACTIVE: '进行中',
        COMPLETED: '已完成',
        PAUSED: '暂停',
        CANCELLED: '已取消',
      };

      const statusColors = {
        ACTIVE: chartColors.primary,
        COMPLETED: chartColors.success,
        PAUSED: chartColors.warning,
        CANCELLED: chartColors.error,
      };

      return {
        labels: Object.keys(statusCounts).map(status => statusLabels[status as keyof typeof statusLabels]),
        datasets: [
          {
            data: Object.values(statusCounts),
            backgroundColor: Object.keys(statusCounts).map(status => statusColors[status as keyof typeof statusColors]),
            borderColor: isDark ? '#374151' : '#ffffff',
            borderWidth: 2,
            hoverBorderWidth: 3,
          },
        ],
      };
    } else {
      // 柱状图：显示目标进度
      const activeGoals = goals.filter(goal => goal.status === 'ACTIVE').slice(0, 5); // 最多显示5个
      
      return {
        labels: activeGoals.map(goal => 
          goal.title.length > 15 ? goal.title.substring(0, 15) + '...' : goal.title
        ),
        datasets: [
          {
            label: '完成进度 (%)',
            data: activeGoals.map(goal => goal.progress),
            backgroundColor: activeGoals.map((_, index) => {
              const colors = [chartColors.primary, chartColors.success, chartColors.warning, chartColors.info, chartColors.purple];
              return colors[index % colors.length] + '80'; // 添加透明度
            }),
            borderColor: activeGoals.map((_, index) => {
              const colors = [chartColors.primary, chartColors.success, chartColors.warning, chartColors.info, chartColors.purple];
              return colors[index % colors.length];
            }),
            borderWidth: 2,
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      };
    }
  }, [goals, type, isDark]);

  const doughnutOptions = useMemo(() => {
    const baseOptions = isDark ? darkChartOptions : defaultChartOptions;
    
    return {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        title: {
          display: true,
          text: '目标状态分布',
          color: isDark ? '#f9fafb' : '#1f2937',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          padding: {
            bottom: 20,
          },
        },
        legend: {
          ...baseOptions.plugins.legend,
          position: 'bottom' as const,
          labels: {
            ...baseOptions.plugins.legend.labels,
            padding: 15,
            usePointStyle: true,
          },
        },
        tooltip: {
          ...baseOptions.plugins.tooltip,
          callbacks: {
            label: (context: any) => {
              const total = context.dataset.data.reduce((sum: number, value: number) => sum + value, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            },
          },
        },
      },
      cutout: '60%',
    };
  }, [isDark]);

  const barOptions = useMemo(() => {
    const baseOptions = isDark ? darkChartOptions : defaultChartOptions;
    
    return {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        title: {
          display: true,
          text: '目标完成进度',
          color: isDark ? '#f9fafb' : '#1f2937',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          padding: {
            bottom: 20,
          },
        },
        legend: {
          display: false,
        },
        tooltip: {
          ...baseOptions.plugins.tooltip,
          callbacks: {
            label: (context: any) => {
              return `完成进度: ${context.parsed.y}%`;
            },
          },
        },
      },
      scales: {
        ...baseOptions.scales,
        y: {
          ...baseOptions.scales.y,
          beginAtZero: true,
          max: 100,
          title: {
            display: true,
            text: '完成度 (%)',
            color: isDark ? '#f9fafb' : '#1f2937',
          },
          ticks: {
            ...baseOptions.scales.y.ticks,
            callback: (value: any) => `${value}%`,
          },
        },
        x: {
          ...baseOptions.scales.x,
          title: {
            display: true,
            text: '目标',
            color: isDark ? '#f9fafb' : '#1f2937',
          },
        },
      },
    };
  }, [isDark]);

  const stats = useMemo(() => {
    const total = goals.length;
    const completed = goals.filter(goal => goal.status === 'COMPLETED').length;
    const active = goals.filter(goal => goal.status === 'ACTIVE').length;
    const averageProgress = goals.length > 0 
      ? goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length 
      : 0;

    return { total, completed, active, averageProgress };
  }, [goals]);

  if (goals.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            暂无目标数据
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            创建您的第一个学习目标开始追踪进度
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 ${className}`}>
      {/* 统计信息 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">总目标</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-success-600 dark:text-success-400">
            {stats.completed}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">已完成</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
            {stats.active}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">进行中</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-warning-600 dark:text-warning-400">
            {stats.averageProgress.toFixed(0)}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">平均进度</div>
        </div>
      </div>

      {/* 图表 */}
      <div className={type === 'doughnut' ? 'h-64' : 'h-80'}>
        {type === 'doughnut' ? (
          <Doughnut data={chartData} options={doughnutOptions} />
        ) : (
          <Bar data={chartData} options={barOptions} />
        )}
      </div>
    </div>
  );
}
