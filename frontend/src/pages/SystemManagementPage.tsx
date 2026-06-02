import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, ChevronLeft, Book, Database, Users, Shield,
  Key, FileText, AlertCircle, X, ChevronRight
} from 'lucide-react';
import MobileHeader from '../components/MobileHeader';
import MobileNav from '../components/MobileNav';

interface SystemManagementPageProps {
  onNavigate?: (page: string) => void;
}

type TabType = 'dictionary' | 'database' | 'users' | 'roles' | 'permissions' | 'audit';

const SystemManagementPage: React.FC<SystemManagementPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dictionary');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs = [
    { id: 'dictionary' as TabType, label: '字典管理', icon: Book, description: '系统字典、业务字典管理' },
    { id: 'database' as TabType, label: '数据库管理', icon: Database, description: '表结构、字段管理' },
    { id: 'users' as TabType, label: '用户管理', icon: Users, description: '用户账户管理' },
    { id: 'roles' as TabType, label: '角色管理', icon: Shield, description: '角色定义管理' },
    { id: 'permissions' as TabType, label: '权限管理', icon: Key, description: '权限配置管理' },
    { id: 'audit' as TabType, label: '审计日志', icon: FileText, description: '操作审计记录' },
  ];

  const handleTabChange = (tab: TabType) => {
    if (tab === 'users') {
      navigate('/users');
    } else if (tab === 'roles') {
      navigate('/roles');
    } else if (tab === 'permissions') {
      navigate('/permissions');
    } else if (tab === 'audit') {
      navigate('/audit');
    } else {
      setActiveTab(tab);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dictionary':
        return <DictionarySection />;
      case 'database':
        return <DatabaseSection />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <MobileHeader 
        title="系统管理" 
        onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      />
      
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 mobile-only" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute top-14 left-0 right-0 bg-white max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">菜单</h2>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-2">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        handleTabChange(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                        isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Icon size={20} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-10 desktop-only">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">系统管理</h1>
                  <p className="text-xs text-slate-500">系统配置、字典管理、数据库结构管理</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 desktop-only">
        <div className="mobile-content mobile-only">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">{tabs.find(t => t.id === activeTab)?.label}</h2>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-slate-100">
            <nav className="flex space-x-1 px-2 py-2 flex-wrap">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isNavigable = ['users', 'roles', 'permissions', 'audit'].includes(tab.id);
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md'
                        : isNavigable
                        ? 'text-blue-600 hover:bg-blue-50'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {isNavigable && !isActive && (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="p-6">
            {renderContent()}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SystemCard
            title="系统配置"
            description="基础参数、运行时配置管理"
            icon={Settings}
            color="bg-indigo-500"
            onClick={() => navigate('/config-debug')}
          />
          <SystemCard
            title="字典管理"
            description="系统字典、业务字典维护"
            icon={Book}
            color="bg-blue-500"
            onClick={() => navigate('/dictionary')}
          />
          <SystemCard
            title="数据库结构"
            description="表结构、字段定义管理"
            icon={Database}
            color="bg-emerald-500"
            onClick={() => navigate('/database')}
          />
        </div>
      </main>

      <MobileNav currentPage="system" onNavigate={navigate} />
    </div>
  );
};

const DictionarySection: React.FC = () => {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Book className="w-10 h-10 text-blue-600" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-2">字典管理</h3>
      <p className="text-slate-500 mb-6">管理系统字典和业务字典数据</p>
      <button
        onClick={() => window.location.href = '/dictionary'}
        className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm mx-auto"
      >
        <Book className="w-5 h-5" />
        <span>进入字典管理</span>
      </button>
    </div>
  );
};

const DatabaseSection: React.FC = () => {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Database className="w-10 h-10 text-emerald-600" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-2">数据库结构管理</h3>
      <p className="text-slate-500 mb-6">管理数据库表结构和字段定义</p>
      <button
        onClick={() => window.location.href = '/database'}
        className="flex items-center space-x-2 bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors font-medium shadow-sm mx-auto"
      >
        <Database className="w-5 h-5" />
        <span>进入数据库管理</span>
      </button>
    </div>
  );
};

interface SystemCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  onClick: () => void;
}

const SystemCard: React.FC<SystemCardProps> = ({ title, description, icon: Icon, color, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
      </div>
      <h4 className="text-lg font-semibold text-slate-900 mb-1">{title}</h4>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  );
};

export default SystemManagementPage;