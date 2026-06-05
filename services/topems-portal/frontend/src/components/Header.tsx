import React, { useState } from 'react';
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    { key: 'dashboard' as PageView, label: '仪表盘', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { key: 'monitoring' as PageView, label: '监控中心', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ];

  const userMenuItems = [
    { label: '个人资料', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { label: '系统设置', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { label: '帮助中心', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { divider: true },
    { label: '退出登录', icon: 'M17 16h-2v-4h-2m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', isLogout: true },
  ];

  return (
    <header className="bg-gradient-to-r from-primary-800 to-primary-600 text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-bold">
                <span className="text-yellow-400">TOPEMS</span>
              </div>
              <span className="text-sm text-primary-200 hidden sm:block">统一门户</span>
            </div>

            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => onViewChange(item.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeView === item.key
                      ? 'bg-white/20 text-white'
                      : 'text-primary-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                    <span>{item.label}</span>
                  </span>
                </button>
              ))}
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
                  <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <div className="hidden sm:block text-right mr-2">
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-primary-200">{user.department}</div>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 hover:bg-white/10 rounded-lg p-1 transition-colors"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full border-2 border-white shadow-md"
                  />
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 border border-gray-100">
                    {userMenuItems.map((item, index) => {
                      if (item.divider) {
                        return <div key={index} className="border-t border-gray-100 my-2" />;
                      }
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            setShowUserMenu(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-3 hover:bg-gray-50 ${
                            item.isLogout ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                          </svg>
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 rounded-lg hover:bg-white/10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {showMobileMenu && (
          <div className="md:hidden py-4 border-t border-white/10">
            <nav className="flex flex-col space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    onViewChange(item.key);
                    setShowMobileMenu(false);
                  }}
                  className={`px-4 py-3 rounded-lg text-left font-medium transition-colors ${
                    activeView === item.key
                      ? 'bg-white/20 text-white'
                      : 'text-primary-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center space-x-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                    <span>{item.label}</span>
                  </span>
                </button>
              ))}
            </nav>
            {user && (
              <div className="mt-4 pt-4 border-t border-white/10 px-4">
                <div className="flex items-center space-x-3">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full border-2 border-white"
                  />
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-primary-200">{user.department}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
