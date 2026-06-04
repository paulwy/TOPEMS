import React, { useState, useEffect } from 'react';
import { patrolApi, taskApi } from './api/client';
import { StatsCards, PatrolCard, TaskCard, QuickAction } from './components/Widgets';
import ProfilePage from './pages/ProfilePage';
import ScanPage from './pages/ScanPage';
import MediaPage from './pages/MediaPage';
import { 
  Map, 
  ScanLine, 
  Camera, 
  Plus,
  Bell,
  User,
  Settings,
  Home,
  ClipboardList,
  CheckCircle
} from 'lucide-react';
import type { PatrolRecord, MobileTask, DashboardStats } from './types';

const App: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    todayPatrols: 0,
    todayScans: 0,
    pendingTasks: 0,
    completedTasks: 0,
  });
  const [patrols, setPatrols] = useState<PatrolRecord[]>([]);
  const [tasks, setTasks] = useState<MobileTask[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'patrol' | 'task' | 'profile'>('home');
  const [showScanPage, setShowScanPage] = useState(false);
  const [showMediaPage, setShowMediaPage] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [patrolsData, tasksData] = await Promise.all([
        patrolApi.getAll(),
        taskApi.getAll(),
      ]);
      setPatrols(patrolsData);
      setTasks(tasksData);
      
      // Calculate stats from local data
      const today = new Date().toDateString();
      const todayPatrols = patrolsData.filter(p => 
        new Date(p.created_at).toDateString() === today
      ).length;
      
      setStats({
        todayPatrols,
        todayScans: 0,
        pendingTasks: tasksData.filter(t => t.status === 'pending').length,
        completedTasks: tasksData.filter(t => t.status === 'completed').length,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleStartPatrol = async () => {
    try {
      const newPatrol = await patrolApi.create({
        title: '新巡逻',
        patrol_type: 'routine',
        status: 'pending',
        location_lat: 0,
        location_lng: 0,
        checked_by: '当前用户',
      });
      setPatrols([newPatrol, ...patrols]);
      setStats(prev => ({ ...prev, todayPatrols: prev.todayPatrols + 1 }));
      alert('巡逻已开始！');
    } catch (error) {
      console.error('Failed to start patrol:', error);
      alert('启动巡逻失败');
    }
  };

  const handleScan = () => {
    setShowScanPage(true);
  };

  const handleTakePhoto = () => {
    setShowMediaPage(true);
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const updatedTask = await taskApi.complete(taskId);
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t));
      loadData();
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 pt-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">移动工作台</h1>
            <p className="text-blue-100 text-sm mt-1">{new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="p-2 hover:bg-blue-600 rounded-full transition-colors">
              <Bell size={24} />
            </button>
            <button className="p-2 hover:bg-blue-600 rounded-full transition-colors">
              <Settings size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-4 shadow-sm">
        <div className="flex items-center justify-around">
          <QuickAction 
            icon={<Map size={28} />} 
            label="开始巡逻" 
            onClick={handleStartPatrol}
            color="bg-blue-600"
          />
          <QuickAction 
            icon={<ScanLine size={28} />} 
            label="扫码" 
            onClick={handleScan}
            color="bg-green-600"
          />
          <QuickAction 
            icon={<Camera size={28} />} 
            label="拍照" 
            onClick={handleTakePhoto}
            color="bg-purple-600"
          />
          <QuickAction 
            icon={<Plus size={28} />} 
            label="新建任务" 
            onClick={() => alert('新建任务功能开发中')}
            color="bg-orange-600"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex">
          {[
            { key: 'home', label: '首页', icon: Home },
            { key: 'patrol', label: '巡逻', icon: Map },
            { key: 'task', label: '任务', icon: ClipboardList },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-3 flex items-center justify-center space-x-2 border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fade-in">
            <StatsCards stats={stats} />
            
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">进行中的巡逻</h2>
              {patrols.filter(p => p.status === 'in_progress').length > 0 ? (
                <div className="space-y-3">
                  {patrols.filter(p => p.status === 'in_progress').map(patrol => (
                    <PatrolCard key={patrol.id} record={patrol} />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl p-8 text-center">
                  <Map className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">暂无进行中的巡逻</p>
                  <button 
                    onClick={handleStartPatrol}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    开始巡逻
                  </button>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">待办任务</h2>
              {tasks.filter(t => t.status === 'pending').length > 0 ? (
                <div className="space-y-3">
                  {tasks.filter(t => t.status === 'pending').slice(0, 3).map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onComplete={() => handleCompleteTask(task.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl p-8 text-center">
                  <CheckCircle className="mx-auto text-gray-300 mb-3" size={48} />
                  <p className="text-gray-500">暂无待办任务</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'patrol' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">巡逻记录</h2>
              <button 
                onClick={handleStartPatrol}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus size={18} />
                <span>开始巡逻</span>
              </button>
            </div>
            
            {patrols.length > 0 ? (
              <div className="space-y-3">
                {patrols.map(patrol => (
                  <PatrolCard key={patrol.id} record={patrol} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center">
                <Map className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500">暂无巡逻记录</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'task' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">我的任务</h2>
              <button 
                onClick={() => alert('新建任务功能开发中')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus size={18} />
                <span>新建任务</span>
              </button>
            </div>
            
            {tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onComplete={task.status === 'pending' ? () => handleCompleteTask(task.id) : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center">
                <ClipboardList className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500">暂无任务</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile Page */}
      {activeTab === 'profile' && <ProfilePage />}

      {showScanPage && <ScanPage onBack={() => setShowScanPage(false)} />}
      {showMediaPage && <MediaPage onBack={() => setShowMediaPage(false)} />}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 glass">
        <div className="flex items-center justify-around">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <Home size={24} />
            <span className="text-xs font-medium">首页</span>
          </button>
          <button 
            onClick={() => setActiveTab('patrol')}
            className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'patrol' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <Map size={24} />
            <span className="text-xs font-medium">巡逻</span>
          </button>
          <button 
            onClick={() => setActiveTab('task')}
            className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'task' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <ClipboardList size={24} />
            <span className="text-xs font-medium">任务</span>
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'profile' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <User size={24} />
            <span className="text-xs font-medium">我的</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
