import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Bot, GitBranch, LogOut } from 'lucide-react';
import { authApi } from '../api/iam';
import type { User } from '../api/iam';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    authApi.getCurrentUser()
      .then((response) => {
        if (response.success) {
          setUser(response.data);
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-slate-600">加载中...</div>
      </div>
    );
  }

  const menuItems = [
    {
      title: '文档管理',
      icon: FileText,
      description: '文件上传、下载、版本管理',
      path: '/documents',
      color: 'bg-blue-500',
    },
    {
      title: 'AI 知识库',
      icon: Bot,
      description: '智能问答、知识检索',
      path: '/ai',
      color: 'bg-purple-500',
    },
    {
      title: '工作流',
      icon: GitBranch,
      description: '流程审批、任务管理',
      path: '/workflows',
      color: 'bg-green-500',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">TOPEMS</h1>
              <span className="ml-3 text-sm text-slate-600">企业数字化平台</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <span className="text-slate-600">欢迎，</span>
                <span className="font-medium text-slate-900">{user?.username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>退出</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            欢迎回来，{user?.username}！
          </h2>
          <p className="text-slate-600">
            选择您需要使用的功能模块，开始您的工作。
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">用户角色</p>
                <p className="text-2xl font-bold text-slate-900 capitalize">
                  {user?.role || 'user'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <div
              key={item.title}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(item.path)}
            >
              <div className={`w-12 h-12 ${item.color} rounded-lg flex items-center justify-center mb-4`}>
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {item.title}
              </h3>
              <p className="text-slate-600 text-sm">
                {item.description}
              </p>
              <div className="mt-4 text-blue-600 text-sm font-medium">
                点击进入 →
              </div>
            </div>
          ))}
        </div>

        {/* Service Status */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">服务状态</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'IAM', port: 8002, key: 'iam' },
              { name: 'DOC', port: 8001, key: 'doc' },
              { name: 'AI', port: 8003, key: 'ai' },
              { name: 'FLOW', port: 8004, key: 'flow' },
            ].map((service) => (
              <ServiceStatusCard
                key={service.key}
                name={service.name}
                port={service.port}
                apiKey={service.key as any}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

interface ServiceStatusCardProps {
  name: string;
  port: number;
  apiKey: 'iam' | 'doc' | 'ai' | 'flow';
}

const ServiceStatusCard: React.FC<ServiceStatusCardProps> = ({ name, port, apiKey }) => {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const apis: any = { iam: authApi, doc: null, ai: null, flow: null };
        if (apis[apiKey]) {
          await apis[apiKey].health();
          setStatus('online');
        }
      } catch {
        setStatus('offline');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [apiKey]);

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-slate-900">{name}</p>
          <p className="text-xs text-slate-500">Port: {port}</p>
        </div>
        <div
          className={`w-3 h-3 rounded-full ${
            status === 'checking'
              ? 'bg-yellow-500 animate-pulse'
              : status === 'online'
              ? 'bg-green-500'
              : 'bg-red-500'
          }`}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
