import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Briefcase, Calendar, DollarSign, User, BookOpen, FileText, BarChart3, Users, Home } from 'lucide-react';

interface HrmLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showSidebar?: boolean;
}

const hrmMenuItems = [
  { path: '/hrm/positions', label: '岗位管理', icon: Briefcase },
  { path: '/hrm/employees', label: '员工管理', icon: Users },
  { path: '/hrm/attendance', label: '考勤管理', icon: Calendar },
  { path: '/hrm/leave', label: '请假管理', icon: Calendar },
  { path: '/hrm/payroll', label: '薪酬管理', icon: DollarSign },
  { path: '/hrm/performance', label: '绩效管理', icon: User },
  { path: '/hrm/recruitment', label: '招聘管理', icon: FileText },
  { path: '/hrm/training', label: '培训管理', icon: BookOpen },
  { path: '/hrm/reports', label: '报表统计', icon: BarChart3 },
];

export const HrmLayout: React.FC<HrmLayoutProps> = ({
  children,
  title = '人力资源管理',
  subtitle = '全面管理企业人力资源',
  showSidebar = true,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='bg-white shadow-sm border-b'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>{title}</h1>
              <p className='text-sm text-gray-500 mt-1'>{subtitle}</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className='flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors'
            >
              <Home className='w-4 h-4' />
              返回首页
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        {showSidebar ? (
          <div className='flex gap-6'>
            {/* Sidebar */}
            <div className='w-56 flex-shrink-0'>
              <div className='bg-white rounded-lg shadow p-4 sticky top-6'>
                <h3 className='text-sm font-semibold text-gray-700 mb-4 px-3'>HRM 模块</h3>
                <nav className='space-y-1'>
                  {hrmMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className='w-4 h-4 flex-shrink-0' />
                        <span className='truncate'>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Content Area */}
            <div className='flex-1 min-w-0'>{children}</div>
          </div>
        ) : (
          /* Content Area without Sidebar */
          <div className='min-w-0'>{children}</div>
        )}
      </div>
    </div>
  );
};

export default HrmLayout;
