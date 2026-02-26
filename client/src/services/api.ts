import axios from 'axios';
import type {
  User,
  Goal,
  Plan,
  Task,
  Checkin,
  Review,
  AuthResponse,
  LoginCredentials,
  RegisterCredentials,
  GeneratePlanRequest,
  GoalFormData,
  TaskFormData,
  CheckinFormData,
  GoalStats,
  CheckinStats,
  ApiError,
} from '../types';

// 创建 axios 实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证令牌
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response: any) => {
    return response;
  },
  (error: any) => {
    // 处理认证错误
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // 格式化错误信息
    const apiError: ApiError = {
      error: error.response?.data?.error || 'Unknown Error',
      message: error.response?.data?.message || '请求失败',
      details: error.response?.data?.details,
      status: error.response?.status,
    };

    return Promise.reject(apiError);
  }
);

// 认证 API
export const authApi = {
  // 登录
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  // 注册
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', credentials);
    return response.data;
  },

  // 获取当前用户信息
  me: async (): Promise<{ user: User }> => {
    const response = await api.get<{ user: User }>('/auth/me');
    return response.data;
  },

  // 登出
  logout: async (): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/logout');
    return response.data;
  },

  // Google OAuth
  googleLogin: (): void => {
    window.location.href = `${api.defaults.baseURL}/auth/google`;
  },

  // GitHub OAuth
  githubLogin: (): void => {
    window.location.href = `${api.defaults.baseURL}/auth/github`;
  },

  // 更新用户资料
  updateProfile: async (data: { name?: string; avatar?: string }): Promise<{ user: User; message: string }> => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  // 修改密码
  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> => {
    const response = await api.put('/auth/password', data);
    return response.data;
  },
};

// 目标 API
export const goalApi = {
  // 获取目标列表
  getGoals: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    goals: Goal[];
    pagination: any;
  }> => {
    const response = await api.get('/goals', { params });
    return response.data;
  },

  // 获取目标详情
  getGoal: async (id: string): Promise<{ goal: Goal }> => {
    const response = await api.get(`/goals/${id}`);
    return response.data;
  },

  // 创建目标
  createGoal: async (data: GoalFormData): Promise<{ goal: Goal; message: string }> => {
    const response = await api.post('/goals', data);
    return response.data;
  },

  // 更新目标
  updateGoal: async (
    id: string,
    data: Partial<GoalFormData> & { status?: string; progress?: number }
  ): Promise<{ goal: Goal; message: string }> => {
    const response = await api.put(`/goals/${id}`, data);
    return response.data;
  },

  // 删除目标
  deleteGoal: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/goals/${id}`);
    return response.data;
  },

  // 获取目标统计
  getGoalStats: async (id: string): Promise<{ stats: GoalStats }> => {
    const response = await api.get(`/goals/${id}/stats`);
    return response.data;
  },
};

// 计划 API
export const planApi = {
  // 获取计划列表
  getPlans: async (goalId?: string): Promise<{ plans: Plan[] }> => {
    const params = goalId ? { goalId } : undefined;
    const response = await api.get('/plans', { params });
    return response.data;
  },

  // 获取计划详情
  getPlan: async (id: string): Promise<{ plan: Plan }> => {
    const response = await api.get(`/plans/${id}`);
    return response.data;
  },

  // 生成 AI 计划
  generatePlan: async (data: GeneratePlanRequest): Promise<{ plan: Plan; message: string }> => {
    const response = await api.post('/plans/generate', data);
    return response.data;
  },

  // 更新计划
  updatePlan: async (
    id: string,
    data: { title?: string; mermaidCode?: string }
  ): Promise<{ plan: Plan; message: string }> => {
    const response = await api.put(`/plans/${id}`, data);
    return response.data;
  },

  // 删除计划
  deletePlan: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/plans/${id}`);
    return response.data;
  },
};

// 任务 API
export const taskApi = {
  // 获取任务列表
  getTasks: async (params?: {
    planId?: string;
    week?: number;
    completed?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    tasks: Task[];
    pagination: any;
  }> => {
    const response = await api.get('/tasks', { params });
    return response.data;
  },

  // 获取任务详情
  getTask: async (id: string): Promise<{ task: Task }> => {
    const response = await api.get(`/tasks/${id}`);
    return response.data;
  },

  // 创建任务
  createTask: async (data: TaskFormData): Promise<{ task: Task; message: string }> => {
    const response = await api.post('/tasks', data);
    return response.data;
  },

  // 更新任务
  updateTask: async (
    id: string,
    data: Partial<TaskFormData>
  ): Promise<{ task: Task; message: string }> => {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data;
  },

  // 标记任务完成/未完成
  toggleTask: async (
    id: string,
    completed: boolean
  ): Promise<{ task: Task; message: string }> => {
    const response = await api.put(`/tasks/${id}/complete`, { completed });
    return response.data;
  },

  // 删除任务
  deleteTask: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/tasks/${id}`);
    return response.data;
  },

  // 获取周任务
  getWeeklyTasks: async (
    week: number,
    planId?: string
  ): Promise<{
    week: number;
    tasks: Task[];
    tasksByDay: Record<number, Task[]>;
    summary: {
      totalTasks: number;
      completedTasks: number;
      completionRate: number;
    };
  }> => {
    const params = planId ? { planId } : undefined;
    const response = await api.get(`/tasks/weekly/${week}`, { params });
    return response.data;
  },
};

// 打卡 API
export const checkinApi = {
  // 获取打卡记录列表
  getCheckins: async (params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    checkins: Checkin[];
    pagination: any;
  }> => {
    const response = await api.get('/checkins', { params });
    return response.data;
  },

  // 获取今日打卡
  getTodayCheckin: async (): Promise<{
    checkin?: Checkin;
    hasCheckedIn: boolean;
  }> => {
    const response = await api.get('/checkins/today');
    return response.data;
  },

  // 创建打卡记录
  createCheckin: async (data: CheckinFormData): Promise<{ checkin: Checkin; message: string }> => {
    const response = await api.post('/checkins', data);
    return response.data;
  },

  // 更新打卡记录
  updateCheckin: async (
    id: string,
    data: Partial<CheckinFormData>
  ): Promise<{ checkin: Checkin; message: string }> => {
    const response = await api.put(`/checkins/${id}`, data);
    return response.data;
  },

  // 删除打卡记录
  deleteCheckin: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/checkins/${id}`);
    return response.data;
  },

  // 获取打卡统计
  getCheckinStats: async (period?: 'week' | 'month' | 'year'): Promise<CheckinStats> => {
    const params = period ? { period } : undefined;
    const response = await api.get('/checkins/stats', { params });
    return response.data;
  },

  // 获取日历数据
  getCalendarData: async (
    year: number,
    month: number
  ): Promise<{
    year: number;
    month: number;
    calendarData: Record<number, any>;
    summary: {
      totalDays: number;
      totalMinutes: number;
      completionRate: number;
    };
  }> => {
    const response = await api.get(`/checkins/calendar/${year}/${month}`);
    return response.data;
  },
};

// AI任务完成状态 API
export const aiTaskApi = {
  // 获取AI任务完成状态
  getCompletions: async (planId: string): Promise<{
    success: boolean;
    completions: Record<string, boolean>;
  }> => {
    const response = await api.get(`/ai-tasks/${planId}`);
    return response.data;
  },

  // 更新单个AI任务完成状态
  updateCompletion: async (
    planId: string,
    taskKey: string,
    completed: boolean
  ): Promise<{
    success: boolean;
    completion: any;
    message: string;
  }> => {
    const response = await api.put(`/ai-tasks/${planId}/${taskKey}`, { completed });
    return response.data;
  },

  // 批量更新AI任务完成状态
  batchUpdateCompletions: async (
    planId: string,
    completions: Record<string, boolean>
  ): Promise<{
    success: boolean;
    message: string;
  }> => {
    const response = await api.put(`/ai-tasks/${planId}/batch`, { completions });
    return response.data;
  },
};

// 复盘 API
export const reviewApi = {
  getReviews: async (period?: 'weekly' | 'monthly' | 'quarterly'): Promise<{ reviews: Review[] }> => {
    const params = period ? { period } : undefined;
    const response = await api.get('/reviews', { params });
    return response.data;
  },

  getReview: async (id: string): Promise<{ review: Review }> => {
    const response = await api.get(`/reviews/${id}`);
    return response.data;
  },

  createReview: async (data: { period: string; content: string }): Promise<{ review: Review; message: string }> => {
    const response = await api.post('/reviews', data);
    return response.data;
  },

  updateReview: async (id: string, data: { content?: string; period?: string }): Promise<{ review: Review; message: string }> => {
    const response = await api.put(`/reviews/${id}`, data);
    return response.data;
  },

  deleteReview: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/reviews/${id}`);
    return response.data;
  },
};

// 成就 API
export const achievementApi = {
  getAchievements: async (): Promise<{
    achievements: Array<{
      id: string; key: string; title: string; description: string;
      icon: string; condition: string; category: string;
      unlocked: boolean; unlockedAt: string | null;
    }>;
    unlockedCount: number;
    totalCount: number;
  }> => {
    const response = await api.get('/achievements');
    return response.data;
  },

  checkAchievements: async (): Promise<{
    newlyUnlocked: Array<{ key: string; title: string; icon: string }>;
  }> => {
    const response = await api.post('/achievements/check');
    return response.data;
  },
};

// 导出默认 API 实例
export default api;
