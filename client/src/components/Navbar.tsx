import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  BookOpenIcon,
  SparklesIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import UserMenu from './UserMenu';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const { user } = useAuth();

  // 导航链接配置
  const navigationLinks = [
    {
      name: '仪表板',
      href: '/dashboard',
      icon: HomeIcon,
    },
    {
      name: '学习目标',
      href: '/goals',
      icon: BookOpenIcon,
    },
    {
      name: 'AI 规划',
      href: '/planner',
      icon: SparklesIcon,
    },
    {
      name: '学习计划',
      href: '/plans',
      icon: DocumentTextIcon,
    },
    {
      name: '学习打卡',
      href: '/checkin',
      icon: CalendarDaysIcon,
    },
  ];

  // 判断当前路由是否激活
  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  // 如果用户未登录，不显示导航栏
  if (!user) return null;

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* 左侧：Logo 和导航链接 */}
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">LF</span>
              </div>
              <span className="hidden sm:block text-xl font-bold text-gray-900 dark:text-white">
                LearnFlow
              </span>
            </Link>

            {/* 导航链接 */}
            <div className="hidden md:flex space-x-1">
              {navigationLinks.map((link) => {
                const Icon = link.icon;
                const isActive = isActiveRoute(link.href);
                
                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 右侧：用户菜单 */}
          <div className="flex items-center">
            <UserMenu />
          </div>
        </div>
      </div>

      {/* 移动端导航（底部固定） */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-40">
        <div className="grid grid-cols-4 gap-1">
          {navigationLinks.map((link) => {
            const Icon = link.icon;
            const isActive = isActiveRoute(link.href);
            
            return (
              <Link
                key={link.name}
                to={link.href}
                className={`flex flex-col items-center py-2 px-1 text-xs transition-colors duration-200 ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="truncate">{link.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
