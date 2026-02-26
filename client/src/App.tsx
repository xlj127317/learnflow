import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import LoginPage from './components/LoginPage';
import Layout from './components/Layout';
import PageSkeleton from './components/Skeleton';

import './App.css';

// 路由懒加载
const Dashboard = lazy(() => import('./components/Dashboard'));
const PlannerPage = lazy(() => import('./components/PlannerPage'));
const PlanDetailPage = lazy(() => import('./components/PlanDetailPage'));
const PlanListPage = lazy(() => import('./components/PlanListPage'));
const TaskDetailPage = lazy(() => import('./components/TaskDetailPage'));
const TaskListPage = lazy(() => import('./components/TaskListPage'));
const CheckinPage = lazy(() => import('./components/CheckinPage'));
const GoalFormPage = lazy(() => import('./components/GoalFormPage'));
const GoalListPage = lazy(() => import('./components/GoalListPage'));
const GoalDetailPage = lazy(() => import('./components/GoalDetailPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));

// 受保护的路由组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// OAuth 回调页面
function AuthCallback() {
  const { isAuthenticated, isLoading, error } = useAuth();

  if (isLoading) {
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
    return <Navigate to={`/login?error=${encodeURIComponent(error)}`} replace />;
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

// 懒加载路由包装
function LazyProtected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <Suspense fallback={<PageSkeleton />}>
        {children}
      </Suspense>
    </ProtectedRoute>
  );
}

// 主应用路由
function AppRoutes() {
  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* 受保护的路由 — 懒加载 */}
      <Route path="/dashboard" element={<LazyProtected><Dashboard /></LazyProtected>} />
      <Route path="/planner" element={<LazyProtected><PlannerPage /></LazyProtected>} />
      <Route path="/plans/:id" element={<LazyProtected><PlanDetailPage /></LazyProtected>} />
      <Route path="/plans" element={<LazyProtected><PlanListPage /></LazyProtected>} />
      <Route path="/tasks" element={<LazyProtected><TaskListPage /></LazyProtected>} />
      <Route path="/tasks/:id" element={<LazyProtected><TaskDetailPage /></LazyProtected>} />
      <Route path="/checkin" element={<LazyProtected><CheckinPage /></LazyProtected>} />
      <Route path="/goals/new" element={<LazyProtected><GoalFormPage /></LazyProtected>} />
      <Route path="/goals/:id/edit" element={<LazyProtected><GoalFormPage /></LazyProtected>} />
      <Route path="/goals/:id" element={<LazyProtected><GoalDetailPage /></LazyProtected>} />
      <Route path="/goals" element={<LazyProtected><GoalListPage /></LazyProtected>} />
      <Route path="/profile" element={<LazyProtected><ProfilePage /></LazyProtected>} />

      {/* 默认重定向 */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 */}
      <Route
        path="*"
        element={
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">页面未找到</p>
              <a href="/dashboard" className="btn-primary">返回首页</a>
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
      <ToastProvider>
        <BrowserRouter>
          <Layout>
            <AppRoutes />
          </Layout>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
