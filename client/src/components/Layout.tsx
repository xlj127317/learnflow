import React from 'react';
import Navbar from './Navbar';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 导航栏 */}
      {user && <Navbar />}
      
      {/* 主要内容 */}
      <main className={user ? 'pb-16 md:pb-0' : ''}>
        {children}
      </main>
    </div>
  );
}
