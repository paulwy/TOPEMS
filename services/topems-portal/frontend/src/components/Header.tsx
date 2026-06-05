import React from 'react';
import { UserInfo } from '../api/portal';

type PageView = 'dashboard' | 'monitoring';

interface HeaderProps {
  user: UserInfo | null;
  onNotificationClick: () => void;
  unreadCount: number;
  activeView: PageView;
  onViewChange: (view: PageView) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  user, 
  onNotificationClick, 
  unreadCount,
  activeView,
  onViewChange 
}) => {
  return (
    <header className="bg-gradient-to-r from-primary-800 to-primary-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-bold">
                <span className="text-yellow-400">TOPEMS</span>
              </div>
              <span className="text-sm text-primary-200">统一门户</span>
            </div>

            <nav className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => onViewChange('dashboard')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeView === 'dashboard'
                    ? 'bg-white/20 text-white'
                    : 'text-primary-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>仪表盘</span>
                </span>
              </button>
              <button
                onClick={() => onViewChange('monitoring')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeView === 'monitoring'
                    ? 'bg-white/20 text-white'
                    : 'text-primary-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>监控中心</span>
                </span>
              </button>
            </nav>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <button
                onClick={onNotificationClick}
                className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <div className="text-right hidden sm:block">
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-primary-200">{user.department}</div>
              </div>
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full border-2 border-white shadow-md"
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;