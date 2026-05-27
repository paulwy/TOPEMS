import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ServiceCard from './components/ServiceCard';
import TodoList from './components/TodoList';
import HealthDashboard from './components/HealthDashboard';
import { Service, Todo, UserInfo, portalApi } from './api/portal';

const App: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [servicesData, todosData, userData] = await Promise.all([
        portalApi.getServices(),
        portalApi.getTodos(),
        portalApi.getUserInfo(),
      ]);
      setServices(servicesData);
      setTodos(todosData);
      setUser(userData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header user={user} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">欢迎回来，{user?.name}</h1>
          <p className="text-gray-600">以下是您的系统概览和待办事项</p>
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
