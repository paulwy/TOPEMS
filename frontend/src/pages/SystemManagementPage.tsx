import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, ChevronLeft, Book, Database, Users, Shield, Key, FileText, X, Activity, Layout } from 'lucide-react';
import MobileHeader from '../components/MobileHeader';
import MobileNav from '../components/MobileNav';

interface SystemManagementPageProps {
  onNavigate?: (page: string) => void;
}

const SystemManagementPage: React.FC<SystemManagementPageProps> = ({ onNavigate: _onNavigate }) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const systemFeatures = [
    {
      id: 'users',
      title: '用户管理',
      description: '管理系统用户账户',
      icon: Users,
      path: '/users',
      color: 'bg-blue-500',
    },
    {
      id: 'roles',
      title: '角色管理',
      description: '管理用户角色和权限组',
      icon: Shield,
      path: '/roles',
      color: 'bg-purple-500',
    },
    {
      id: 'permissions',
      title: '权限管理',
      description: '配置系统权限',
      icon: Key,
      path: '/permissions',
      color: 'bg-green-500',
    },
    {
      id: 'dictionaries',
      title: '字典管理',
      description: '管理系统字典和业务字典',
      icon: Book,
      path: '/dictionaries',
      color: 'bg-amber-500',
    },
    {
      id: 'database',
      title: '数据库结构',
      description: '管理数据库表结构和字段',
      icon: Database,
      path: '/database',
      color: 'bg-emerald-500',
    },
    {
      id: 'audit',
      title: '审计日志',
      description: '查看系统操作审计记录',
      icon: FileText,
      path: '/audit',
      color: 'bg-slate-500',
    },
    {
      id: 'config',
      title: '系统配置',
      description: '系统参数和运行时配置',
      icon: Settings,
      path: '/debug',
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100'>
      <MobileHeader title='系统管理' onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />

      {mobileMenuOpen && (
        <div className='fixed inset-0 bg-black/50 z-40 mobile-only' onClick={() => setMobileMenuOpen(false)}>
          <div
            className='absolute top-14 left-0 right-0 bg-white max-h-[70vh] overflow-y-auto'
            onClick={(e) => e.stopPropagation()}
          >
            <div className='p-4'>
              <div className='flex items-center justify-between mb-6'>
                <h2 className='text-lg font-semibold'>菜单</h2>
                <button onClick={() => setMobileMenuOpen(false)} className='p-2 hover:bg-slate-100 rounded-lg'>
                  <X size={20} />
                </button>
              </div>
              <div className='space-y-2'>
                {systemFeatures.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <button
                      key={feature.id}
                      onClick={() => {
                        navigate(feature.path);
                        setMobileMenuOpen(false);
                      }}
                      className='w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-100 transition-colors'
                    >
                      <Icon size={20} />
                      <span>{feature.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <header className='bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10 desktop-only'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center h-16'>
            <button
              onClick={() => navigate('/dashboard')}
              className='p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors mr-3'
            >
              <ChevronLeft className='w-5 h-5' />
            </button>
            <div className='flex items-center space-x-3'>
              <div className='w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow-lg'>
                <Settings className='w-6 h-6 text-white' />
              </div>
              <div>
                <h1 className='text-xl font-bold text-slate-900'>系统管理</h1>
                <p className='text-xs text-slate-500'>用户、角色、权限和系统配置</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 desktop-only'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {systemFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                onClick={() => navigate(feature.path)}
                className='bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group'
              >
                <div className='p-6'>
                  <div className='flex items-start justify-between mb-4'>
                    <div
                      className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}
                    >
                      <Icon className='w-6 h-6 text-white' />
                    </div>
                  </div>
                  <h4 className='text-lg font-semibold text-slate-900 mb-1'>{feature.title}</h4>
                  <p className='text-sm text-slate-600 mb-4'>{feature.description}</p>
                  <div className='flex items-center text-blue-600 text-sm font-medium group-hover:text-blue-700'>
                    进入管理 →
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <MobileNav currentPage='system' onNavigate={navigate} />
    </div>
  );
};

export default SystemManagementPage;
