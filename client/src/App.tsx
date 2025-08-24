import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import PlannerPage from './components/PlannerPage';
import PlanDetailPage from './components/PlanDetailPage';
import PlanListPage from './components/PlanListPage';
import TaskDetailPage from './components/TaskDetailPage';
import TaskListPage from './components/TaskListPage';
import CheckinPage from './components/CheckinPage';
import GoalFormPage from './components/GoalFormPage';
import GoalListPage from './components/GoalListPage';
import GoalDetailPage from './components/GoalDetailPage';
import ProfilePage from './components/ProfilePage';
import Layout from './components/Layout';

import './App.css';

// 受保护的路由组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// OAuth 回调页面
function AuthCallback() {
  const { isAuthenticated, isLoading, error } = useAuth();
  
  console.log('AuthCallback 组件状态:', {
    isAuthenticated,
    isLoading,
    error,
    pathname: window.location.pathname,
    search: window.location.search
  });

  if (isLoading) {
    console.log('显示加载状态...');
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">正在处理认证...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('显示错误状态，重定向到登录页面...');
    return <Navigate to={`/login?error=${encodeURIComponent(error)}`} replace />;
  }

  if (isAuthenticated) {
    console.log('用户已认证，重定向到仪表板...');
    return <Navigate to="/dashboard" replace />;
  } else {
    console.log('用户未认证，重定向到登录页面...');
    return <Navigate to="/login" replace />;
  }
}

// 主应用路由
function AppRoutes() {
  return (
    <Routes>
            
      {/* 公开路由 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* 受保护的路由 */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/planner" 
        element={
          <ProtectedRoute>
            <PlannerPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/plans/:id" 
        element={
          <ProtectedRoute>
            <PlanDetailPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/plans" 
        element={
          <ProtectedRoute>
            <PlanListPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/tasks" 
        element={
          <ProtectedRoute>
            <TaskListPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/tasks/:id" 
        element={
          <ProtectedRoute>
            <TaskDetailPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/checkin" 
        element={
          <ProtectedRoute>
            <CheckinPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/goals/new" 
        element={
          <ProtectedRoute>
            <GoalFormPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/goals/:id/edit" 
        element={
          <ProtectedRoute>
            <GoalFormPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/goals/:id" 
        element={
          <ProtectedRoute>
            <GoalDetailPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/goals" 
        element={
          <ProtectedRoute>
            <GoalListPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        } 
      />
      
              {/* 默认重定向 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* 404 页面 */}
      <Route 
        path="*" 
        element={
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">页面未找到</p>
              <a href="/dashboard" className="btn-primary">
                返回首页
              </a>
            </div>
          </div>
        } 
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <AppRoutes />
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
