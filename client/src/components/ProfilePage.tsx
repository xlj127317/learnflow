import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UserIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  PencilIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { useToast } from './Toast';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const toast = useToast();

  // 密码修改状态
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 状态管理
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 表单状态
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 初始化表单数据
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
      });
    }
  }, [user]);

  // 表单验证
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = '用户名不能为空';
    } else if (formData.name.trim().length < 2) {
      errors.name = '用户名至少需要2个字符';
    } else if (formData.name.trim().length > 50) {
      errors.name = '用户名不能超过50个字符';
    }

    if (!formData.email.trim()) {
      errors.email = '邮箱不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '请输入有效的邮箱地址';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await authApi.updateProfile({ name: formData.name.trim() });
      updateUser(result.user);

      toast.success('个人信息更新成功');
      setIsEditing(false);

      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error: any) {
      console.error('更新用户信息失败:', error);
      setError(error.message || '更新失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 处理输入变化
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 清除对应字段的错误
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // 清除全局错误
    if (error) {
      setError(null);
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
    });
    setFormErrors({});
    setError(null);
  };

  // 处理登出
  const handleLogout = async () => {
    if (confirm('确定要退出登录吗？')) {
      try {
        await logout();
        navigate('/login');
      } catch (error) {
        console.error('登出失败:', error);
      }
    }
  };

  // 格式化注册时间
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '未知';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            个人信息
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            查看和管理您的账户信息
          </p>
        </div>

        {/* 成功提示 */}
        {success && (
          <div className="mb-6 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-md p-4">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-success-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-success-800 dark:text-success-200">
                  更新成功
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
                  更新失败
                </h3>
                <p className="mt-1 text-sm text-error-700 dark:text-error-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：头像和基本信息 */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="card-body text-center">
                {/* 头像 */}
                <div className="mb-6">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-white dark:border-gray-700 shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full mx-auto bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center border-4 border-white dark:border-gray-700 shadow-lg">
                      <UserIcon className="h-12 w-12 text-primary-600 dark:text-primary-400" />
                    </div>
                  )}
                </div>

                {/* 用户名 */}
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {user?.name}
                </h2>

                {/* 角色标签 */}
                <span className={`badge ${user?.role === 'ADMIN' ? 'badge-warning' : 'badge-primary'}`}>
                  {user?.role === 'ADMIN' ? '管理员' : '用户'}
                </span>

                {/* 注册时间 */}
                <div className="mt-4 flex items-center justify-center text-sm text-gray-600 dark:text-gray-400">
                  <CalendarDaysIcon className="h-4 w-4 mr-2" />
                  注册于 {user?.createdAt ? formatDate(user.createdAt) : '未知'}
                </div>
              </div>
            </div>

            {/* 危险操作 */}
            <div className="card mt-6">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  账户操作
                </h3>
              </div>
              <div className="card-body">
                <button
                  onClick={handleLogout}
                  className="w-full btn-error"
                >
                  退出登录
                </button>
              </div>
            </div>
          </div>

          {/* 右侧：详细信息和编辑表单 */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    账户信息
                  </h3>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn-outline text-sm"
                    >
                      <PencilIcon className="h-4 w-4 mr-2" />
                      编辑信息
                    </button>
                  )}
                </div>
              </div>

              <div className="card-body">
                {isEditing ? (
                  /* 编辑模式 */
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* 用户名 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        用户名 <span className="text-error-500">*</span>
                      </label>
                      <div className="flex items-center">
                        <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className={`input flex-1 ${formErrors.name ? 'border-error-300 focus:border-error-500 focus:ring-error-500' : ''}`}
                          placeholder="请输入用户名"
                          disabled={isLoading}
                          maxLength={50}
                        />
                      </div>
                      {formErrors.name && (
                        <p className="mt-1 text-sm text-error-600 dark:text-error-400">{formErrors.name}</p>
                      )}
                    </div>

                    {/* 邮箱 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        邮箱地址 <span className="text-error-500">*</span>
                      </label>
                      <div className="flex items-center">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className={`input flex-1 ${formErrors.email ? 'border-error-300 focus:border-error-500 focus:ring-error-500' : ''}`}
                          placeholder="请输入邮箱地址"
                          disabled={isLoading}
                        />
                      </div>
                      {formErrors.email && (
                        <p className="mt-1 text-sm text-error-600 dark:text-error-400">{formErrors.email}</p>
                      )}
                    </div>

                    {/* 按钮组 */}
                    <div className="flex space-x-4">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center">
                            <div className="spinner w-5 h-5 mr-2" />
                            更新中...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center">
                            <CheckCircleIcon className="w-5 h-5 mr-2" />
                            保存更改
                          </div>
                        )}
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isLoading}
                        className="btn-outline"
                      >
                        <XMarkIcon className="w-5 h-5 mr-2" />
                        取消
                      </button>
                    </div>
                  </form>
                ) : (
                  /* 查看模式 */
                  <div className="space-y-6">
                    {/* 用户名 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        用户名
                      </label>
                      <div className="flex items-center">
                        <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-900 dark:text-white">{user?.name}</span>
                      </div>
                    </div>

                    {/* 邮箱 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        邮箱地址
                      </label>
                      <div className="flex items-center">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-gray-900 dark:text-white">{user?.email}</span>
                      </div>
                    </div>

                    {/* 用户ID */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        用户ID
                      </label>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">{user?.id}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 账户安全 */}
            <div className="card mt-6">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  账户安全
                </h3>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        登录密码
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        上次更新：暂未实现
                      </p>
                    </div>
                    <button onClick={() => setShowPasswordModal(true)} className="btn-outline text-sm">
                      修改密码
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 修改密码弹窗 */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">修改密码</h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (passwordData.newPassword !== passwordData.confirmPassword) {
                  toast.error('两次输入的新密码不一致');
                  return;
                }
                if (passwordData.newPassword.length < 6) {
                  toast.error('新密码长度至少 6 个字符');
                  return;
                }
                try {
                  setPasswordLoading(true);
                  await authApi.changePassword({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword,
                  });
                  toast.success('密码修改成功');
                  setShowPasswordModal(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                } catch {
                  toast.error('当前密码错误');
                } finally {
                  setPasswordLoading(false);
                }
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">当前密码</label>
                  <input type="password" required className="input w-full" value={passwordData.currentPassword}
                    onChange={e => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">新密码</label>
                  <input type="password" required minLength={6} className="input w-full" value={passwordData.newPassword}
                    onChange={e => setPasswordData(p => ({ ...p, newPassword: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">确认新密码</label>
                  <input type="password" required className="input w-full" value={passwordData.confirmPassword}
                    onChange={e => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={passwordLoading} className="flex-1 btn-primary">
                    {passwordLoading ? '修改中...' : '确认修改'}
                  </button>
                  <button type="button" onClick={() => setShowPasswordModal(false)} className="btn-outline">取消</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}
