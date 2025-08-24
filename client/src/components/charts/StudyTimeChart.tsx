import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { format, subDays, startOfDay } from 'date-fns';
import { defaultChartOptions, darkChartOptions, chartColors, createGradient } from './ChartSetup';
import type { Checkin } from '../../types';

interface StudyTimeChartProps {
  checkins: Checkin[];
  period?: 'week' | 'month' | 'year';
  isDark?: boolean;
  className?: string;
}

export default function StudyTimeChart({ 
  checkins, 
  period = 'week', 
  isDark = false,
  className = '' 
}: StudyTimeChartProps) {
  const chartData = useMemo(() => {
    const today = new Date();
    let days: number;
    let dateFormat: string;

    switch (period) {
      case 'week':
        days = 7;
        dateFormat = 'MM/dd';
        break;
      case 'month':
        days = 30;
        dateFormat = 'MM/dd';
        break;
      case 'year':
        days = 365;
        dateFormat = 'MM/dd';
        break;
      default:
        days = 7;
        dateFormat = 'MM/dd';
    }

    // 生成日期标签
    const labels = Array.from({ length: days }, (_, i) => {
      const date = subDays(today, days - 1 - i);
      return format(date, dateFormat);
    });

    // 生成数据点
    const data = Array.from({ length: days }, (_, i) => {
      const date = startOfDay(subDays(today, days - 1 - i));
      const dayCheckins = checkins.filter(checkin => {
        const checkinDate = startOfDay(new Date(checkin.date));
        return checkinDate.getTime() === date.getTime();
      });
      
      return dayCheckins.reduce((total, checkin) => total + checkin.duration, 0) / 60; // 转换为小时
    });

    return {
      labels,
      datasets: [
        {
          label: '学习时长 (小时)',
          data,
          borderColor: chartColors.primary,
          backgroundColor: (context: any) => {
            const chart = context.chart;
            const { ctx } = chart;
            return createGradient(ctx, chartColors.primary);
          },
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: chartColors.primary,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [checkins, period]);

  const options = useMemo(() => {
    const baseOptions = isDark ? darkChartOptions : defaultChartOptions;
    
    return {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        title: {
          display: true,
          text: `学习时长趋势 (${period === 'week' ? '最近7天' : period === 'month' ? '最近30天' : '最近一年'})`,
          color: isDark ? '#f9fafb' : '#1f2937',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
          padding: {
            bottom: 20,
          },
        },
        tooltip: {
          ...baseOptions.plugins.tooltip,
          callbacks: {
            label: (context: any) => {
              const value = context.parsed.y;
              const hours = Math.floor(value);
              const minutes = Math.round((value - hours) * 60);
              return `学习时长: ${hours}小时${minutes > 0 ? ` ${minutes}分钟` : ''}`;
            },
          },
        },
      },
      scales: {
        ...baseOptions.scales,
        y: {
          ...baseOptions.scales.y,
          beginAtZero: true,
          title: {
            display: true,
            text: '时长 (小时)',
            color: isDark ? '#f9fafb' : '#1f2937',
          },
          ticks: {
            ...baseOptions.scales.y.ticks,
            callback: (value: any) => `${value}h`,
          },
        },
        x: {
          ...baseOptions.scales.x,
          title: {
            display: true,
            text: '日期',
            color: isDark ? '#f9fafb' : '#1f2937',
          },
        },
      },
    };
  }, [isDark, period]);

  const totalHours = useMemo(() => {
    return chartData.datasets[0].data.reduce((sum, hours) => sum + hours, 0);
  }, [chartData]);

  const averageHours = useMemo(() => {
    const nonZeroDays = chartData.datasets[0].data.filter(hours => hours > 0).length;
    return nonZeroDays > 0 ? totalHours / nonZeroDays : 0;
  }, [chartData, totalHours]);

  const maxHours = useMemo(() => {
    return Math.max(...chartData.datasets[0].data);
  }, [chartData]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 ${className}`}>
      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {totalHours.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">总学习时长</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-success-600 dark:text-success-400">
            {averageHours.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">平均每天</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-warning-600 dark:text-warning-400">
            {maxHours.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">单日最高</div>
        </div>
      </div>

      {/* 图表 */}
      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
