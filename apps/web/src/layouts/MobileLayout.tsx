import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  FileText,
  Settings,
  Bell,
  ChevronLeft,
  Menu,
  X,
} from 'lucide-react';
import { Badge } from '@mui/material';
import { shouldUseMobileLayout } from '@/utils/mobileDetector';
import { useAuth } from '@/hooks/useAuth';

interface MobileLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { id: 'dashboard', label: '首页', icon: Home, path: '/dashboard' },
  { id: 'workflow', label: '流程', icon: FileText, path: '/workflow' },
  { id: 'notification', label: '通知', icon: Bell, path: '/notifications' },
  { id: 'settings', label: '设置', icon: Settings, path: '/settings' },
];

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMenu, setShowMenu] = useState(false);
  const [showBackButton, setShowBackButton] = useState(false);

  useEffect(() => {
    const path = location.pathname;
    const matchedItem = navItems.find((item) => path.startsWith(item.path));
    if (matchedItem) {
      setActiveTab(matchedItem.id);
    }
    setShowBackButton(!navItems.some((item) => path === item.path));
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (!shouldUseMobileLayout()) {
        navigate('/dashboard');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [navigate]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col'>
      <header className='bg-blue-700 text-white px-4 py-3 shadow-md'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            {showBackButton && (
              <button
                onClick={handleBack}
                className='p-1 rounded-lg hover:bg-blue-600 transition-colors'
              >
                <ChevronLeft className='w-6 h-6' />
              </button>
            )}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className='p-1 rounded-lg hover:bg-blue-600 transition-colors'
            >
              {showMenu ? <X className='w-6 h-6' /> : <Menu className='w-6 h-6' />}
            </button>
          </div>
          <h1 className='text-lg font-semibold'>TOPEMS</h1>
          <div className='relative'>
            <Bell className='w-6 h-6' />
            <Badge className='absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs'>
              3
            </Badge>
          </div>
        </div>
      </header>

      {showMenu && (
        <div className='bg-white border-b shadow-sm'>
          <div className='p-4'>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center'>
                <span className='text-blue-600 font-semibold text-lg'>
                  {user?.name?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <p className='font-semibold text-gray-800'>{user?.name || '用户'}</p>
                <p className='text-sm text-gray-500'>{user?.email || ''}</p>
              </div>
            </div>
          </div>
          <div className='px-4 pb-4 space-y-2'>
            <button
              onClick={handleLogout}
              className='w-full py-2 px-4 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors'
            >
              退出登录
            </button>
          </div>
        </div>
      )}

      <main className='flex-1 overflow-auto p-4'>{children}</main>

      <nav className='bg-white border-t shadow-lg'>
        <div className='flex justify-around py-2'>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  navigate(item.path);
                }}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                  isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className='w-6 h-6' />
                <span className='text-xs font-medium'>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default MobileLayout;
