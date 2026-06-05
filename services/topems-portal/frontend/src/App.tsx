import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ServiceCard from './components/ServiceCard';
import TodoList from './components/TodoList';
import HealthDashboard from './components/HealthDashboard';
import MonitoringDashboard from './components/MonitoringDashboard';
import NotificationPanel from './components/NotificationPanel';
import { Service, Todo, UserInfo, Notification, portalApi } from './api/portal';

type PageView = 'dashboard' | 'monitoring';
type ErrorType = null | 'network' | 'auth' | 'server';

const App: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorType>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeView, setActiveView] = useState<PageView>('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorMessage('');
      
      const [servicesData, todosData, userData, notificationsData] = await Promise.all([
        portalApi.getServices(),
        portalApi.getTodos(),
        portalApi.getUserInfo(),
        portalApi.getNotifications(),
      ]);
      
      setServices(servicesData);
      setTodos(todosData);
      setUser(userData);
      setNotifications(notificationsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      if (err instanceof Error) {
        if (err.message.includes('Network Error') || err.message.includes('ETIMEDOUT')) {
          setError('network');
          setErrorMessage('网络连接失败，请检查网络设置');
        } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          setError('auth');
          setErrorMessage('登录已过期，请重新登录');
        } else {
          setError('server');
          setErrorMessage('服务器错误，请稍后重试');
        }
      } else {
        setError('server');
        setErrorMessage('未知错误，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await portalApi.markNotificationRead(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await portalApi.markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleRefresh = () => {
    fetchData();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="flex flex-col items-center text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              error === 'network' ? 'bg-red-100' : error === 'auth' ? 'bg-yellow-100' : 'bg-blue-100'
            }`}>
              <span className="text-3xl">
                {error === 'network' ? '🔌' : error === 'auth' ? '🔐' : '🛠️'}
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {error === 'network' ? '网络连接失败' : error === 'auth' ? '登录已过期' : '服务器错误'}
            </h3>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <button
              onClick={handleRefresh}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header 
        user={user} 
        onNotificationClick={handleNotificationClick}
        unreadCount={unreadCount}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {showNotifications && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkRead={handleMarkNotificationRead}
          onMarkAllRead={handleMarkAllRead}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'dashboard' && (
          <>
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">欢迎回来，{user?.name}</h1>
                  <p className="text-gray-600">以下是您的系统概览和待办事项</p>
                </div>
                <button
                  onClick={handleRefresh}
                  className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  刷新数据
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="mb-6">
                  <div className="flex items-center">
                    <span className="text-xl mr-2">🚀</span>
                    <h2 className="text-xl font-semibold text-gray-900">系统服务</h2>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">点击卡片访问各子系统</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {services.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              </div>

              <div>
                <TodoList todos={todos} onUpdate={fetchData} />
              </div>
            </div>

            <div className="mt-8">
              <HealthDashboard services={services} />
            </div>

            <div className="mt-8 bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <div className="flex items-center mb-4">
                <span className="text-xl mr-2">📊</span>
                <h2 className="text-xl font-semibold text-gray-900">系统状态概览</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {services.filter((s) => s.status === 'running').length}
                  </div>
                  <div className="text-sm text-green-600">运行中</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-600">
                    {services.filter((s) => s.status === 'starting').length}
                  </div>
                  <div className="text-sm text-yellow-600">启动中</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {services.filter((s) => s.status === 'stopped').length}
                  </div>
                  <div className="text-sm text-red-600">已停止</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{services.length}</div>
                  <div className="text-sm text-blue-600">总系统数</div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeView === 'monitoring' && (
          <MonitoringDashboard />
        )}
      </main>

      <footer className="bg-white border-t border-gray-100 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="text-sm text-gray-500">
              © 2026 TOPEMS - 企业级研发管理平台
            </div>
            <div className="text-sm text-gray-400 mt-2 sm:mt-0">
              版本 2.0.0 | 技术支持: topems@support.com
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
