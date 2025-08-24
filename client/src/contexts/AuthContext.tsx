import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthResponse, LoginCredentials, RegisterCredentials, ApiError } from '../types';
import { authApi } from '../services/api';

// 认证状态类型
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

// 认证操作类型
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

// 认证上下文类型
interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => void;
  checkAuth: () => Promise<void>;
}

// 初始状态
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

// 认证 Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      };

    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        error: action.payload,
      };

    case 'AUTH_LOGOUT':
      return {
        ...initialState,
        isLoading: false,
        token: null,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };

    default:
      return state;
  }
}

// 创建上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider 组件
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 登录函数
  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const response: AuthResponse = await authApi.login(credentials);
      
      // 保存到本地存储
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          token: response.token,
        },
      });
    } catch (error) {
      const apiError = error as ApiError;
      dispatch({
        type: 'AUTH_ERROR',
        payload: apiError.message || '登录失败',
      });
      throw error;
    }
  };

  // 注册函数
  const register = async (credentials: RegisterCredentials) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const response: AuthResponse = await authApi.register(credentials);
      
      // 保存到本地存储
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          token: response.token,
        },
      });
    } catch (error) {
      const apiError = error as ApiError;
      dispatch({
        type: 'AUTH_ERROR',
        payload: apiError.message || '注册失败',
      });
      throw error;
    }
  };

  // 登出函数
  const logout = () => {
    // 清除本地存储
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // 调用 API 登出（可选，因为 JWT 是无状态的）
    authApi.logout().catch(console.error);
    
    dispatch({ type: 'AUTH_LOGOUT' });
  };

  // 清除错误
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  // 更新用户信息
  const updateUser = (userData: Partial<User>) => {
    if (state.user) {
      const updatedUser = { ...state.user, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      dispatch({ type: 'UPDATE_USER', payload: userData });
    }
  };

  // 检查认证状态
  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token) {
      dispatch({ type: 'AUTH_LOGOUT' });
      return;
    }

    // 如果有token但没有user，尝试从API获取用户信息
    if (!userStr) {
      console.log('有token但没有user，尝试从API获取用户信息...');
    }

    try {
      // 验证令牌是否有效
      const response = await authApi.me();
      
      // 保存用户信息到localStorage
      localStorage.setItem('user', JSON.stringify(response.user));
      
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user: response.user,
          token,
        },
      });
      
      console.log('✅ 认证检查成功，用户信息已更新');
    } catch (error) {
      console.error('认证检查失败:', error);
      // 清除无效的认证信息
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  // 组件挂载时检查认证状态
  useEffect(() => {
    checkAuth();
  }, []);

  // 监听 storage 事件（多标签页同步）
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'token') {
        if (!event.newValue) {
          // 令牌被删除，登出
          dispatch({ type: 'AUTH_LOGOUT' });
        } else if (event.newValue !== state.token) {
          // 令牌发生变化，重新检查认证
          checkAuth();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [state.token]);

  // 处理 OAuth 回调
  useEffect(() => {
    const handleOAuthCallback = () => {
      console.log('=== 前端 OAuth 回调处理开始 ===');
      console.log('当前URL:', window.location.href);
      
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const error = urlParams.get('error');

      console.log('URL参数:', {
        token: token ? `${token.substring(0, 20)}...` : null,
        error
      });

      if (token) {
        // OAuth 成功，保存令牌并检查用户信息
        console.log('✅ 收到OAuth token，保存到localStorage');
        localStorage.setItem('token', token);
        
        console.log('开始检查用户认证状态...');
        checkAuth();
        
        // 清理 URL 参数
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('URL参数已清理');
      } else if (error) {
        // OAuth 失败
        console.log('❌ OAuth 失败，错误类型:', error);
        const errorMessages: Record<string, string> = {
          oauth_failed: 'OAuth 认证失败',
          server_error: '服务器错误，请稍后重试',
        };
        
        const errorMessage = errorMessages[error] || 'OAuth 认证出现未知错误';
        console.log('显示错误消息:', errorMessage);
        
        dispatch({
          type: 'AUTH_ERROR',
          payload: errorMessage,
        });
        
        // 清理 URL 参数
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('URL参数已清理');
      } else {
        console.log('⚠️ 既没有token也没有error参数');
      }
      
      console.log('=== 前端 OAuth 回调处理完成 ===');
    };

    // 检查是否是 OAuth 回调页面
    if (window.location.pathname === '/auth/callback') {
      console.log('检测到OAuth回调页面，开始处理...');
      handleOAuthCallback();
    }
  }, [checkAuth]);

  const contextValue: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    updateUser,
    checkAuth,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// 自定义 Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return context;
}

// 导出上下文（用于测试）
export { AuthContext };
