import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from 'chart.js';

// 注册 Chart.js 组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

// 图表默认配置
export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          size: 12,
        },
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#ffffff',
      bodyColor: '#ffffff',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        font: {
          size: 11,
        },
      },
    },
    y: {
      grid: {
        color: 'rgba(0, 0, 0, 0.1)',
      },
      ticks: {
        font: {
          size: 11,
        },
      },
    },
  },
};

// 深色主题配置
export const darkChartOptions = {
  ...defaultChartOptions,
  plugins: {
    ...defaultChartOptions.plugins,
    legend: {
      ...defaultChartOptions.plugins.legend,
      labels: {
        ...defaultChartOptions.plugins.legend.labels,
        color: '#f9fafb',
      },
    },
  },
  scales: {
    x: {
      ...defaultChartOptions.scales.x,
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
      ticks: {
        ...defaultChartOptions.scales.x.ticks,
        color: '#f9fafb',
      },
    },
    y: {
      ...defaultChartOptions.scales.y,
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
      },
      ticks: {
        ...defaultChartOptions.scales.y.ticks,
        color: '#f9fafb',
      },
    },
  },
};

// 颜色主题
export const chartColors = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1',
  gray: '#6b7280',
};

// 渐变色生成函数
export const createGradient = (
  ctx: CanvasRenderingContext2D,
  color: string,
  direction: 'vertical' | 'horizontal' = 'vertical'
) => {
  const gradient = direction === 'vertical' 
    ? ctx.createLinearGradient(0, 0, 0, 400)
    : ctx.createLinearGradient(0, 0, 400, 0);
  
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, color + '20'); // 添加透明度
  
  return gradient;
};

export default ChartJS;
