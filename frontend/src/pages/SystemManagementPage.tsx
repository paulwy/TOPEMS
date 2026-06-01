import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, ChevronLeft, Book, Database, Users, Shield,
  Key, FileText, AlertCircle
} from 'lucide-react';

interface SystemManagementPageProps {
  onNavigate?: (page: string) => void;
}

type TabType = 'dictionary' | 'database' | 'users' | 'roles' | 'permissions' | 'audit';

const SystemManagementPage: React.FC<SystemManagementPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dictionary');

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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Settings className="w-7 h-7 mr-3 text-blue-600" />
                系统管理
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                系统配置、字典管理、数据库结构管理
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-1 px-4" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`px-4 py-3 flex items-center space-x-2 text-sm font-medium rounded-t-lg transition-colors ${
                      isActive
                        ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

const DictionarySection: React.FC = () => {
  return (
    <div className="text-center py-12">
      <Book className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">字典管理</h3>
      <p className="text-gray-500 mb-4">请从左侧导航进入字典管理页面</p>
      <button
        onClick={() => window.location.href = '/dictionary'}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        进入字典管理
      </button>
    </div>
  );
};

const DatabaseSection: React.FC = () => {
  return (
    <div className="text-center py-12">
      <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">数据库结构管理</h3>
      <p className="text-gray-500 mb-4">请从左侧导航进入数据库管理页面</p>
      <button
        onClick={() => window.location.href = '/database'}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        进入数据库管理
      </button>
    </div>
  );
};

export default SystemManagementPage;
