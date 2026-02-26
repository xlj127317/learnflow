import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  BookOpenIcon,
  SparklesIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import UserMenu from './UserMenu';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';

export default function Navbar() {
  const location = useLocation();
  const { user } = useAuth();
  const { isDark, toggle } = useTheme();

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
    {
      name: '复盘',
      href: '/reviews',
      icon: ClipboardDocumentCheckIcon,
    },
    {
      name: '成就',
      href: '/achievements',
      icon: TrophyIcon,
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

          {/* 右侧：主题切换 + 用户菜单 */}
          <div className="flex items-center space-x-2">
            <button
              onClick={toggle}
              className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
            >
              {isDark ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>
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
