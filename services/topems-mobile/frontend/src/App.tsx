import React, { useState, useEffect } from 'react';
import { patrolApi, scanApi, taskApi } from './api/client';
import { StatsCards, PatrolCard, TaskCard, QuickAction } from './components/Widgets';
import { 
  Map, 
  ScanLine, 
  Camera, 
  Mic, 
  Video,
  Plus,
  Bell,
  User,
  Settings,
  ChevronRight
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
  const [activeTab, setActiveTab] = useState<'home' | 'patrol' | 'task'>('home');

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
    alert('扫码功能开发中...');
  };

  const handleTakePhoto = () => {
    alert('拍照功能开发中...');
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

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 glass">
        <div className="flex items-center justify-around">
          <button className="flex flex-col items-center space-y-1 text-blue-600">
            <Home size={24} />
            <span className="text-xs font-medium">首页</span>
          </button>
          <button className="flex flex-col items-center space-y-1 text-gray-500">
            <Map size={24} />
            <span className="text-xs font-medium">巡逻</span>
          </button>
          <button className="flex flex-col items-center space-y-1 text-gray-500">
            <ClipboardList size={24} />
            <span className="text-xs font-medium">任务</span>
          </button>
          <button className="flex flex-col items-center space-y-1 text-gray-500">
            <User size={24} />
            <span className="text-xs font-medium">我的</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;

// Import additional icons
const Home = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const ClipboardList = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
    <path d="M12 11h4"></path>
    <path d="M12 16h4"></path>
    <path d="M8 11h.01"></path>
    <path d="M8 16h.01"></path>
  </svg>
);

const CheckCircle = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
