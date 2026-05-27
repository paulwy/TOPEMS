import React from 'react';
import { patrolApi, scanApi, taskApi } from '../api/client';
import type { PatrolRecord, ScanRecord, MobileTask } from '../types';
import { 
  Activity, 
  Scan, 
  CheckCircle2, 
  Clock,
  MapPin,
  User,
  Calendar
} from 'lucide-react';

interface StatsCardsProps {
  stats: {
    todayPatrols: number;
    todayScans: number;
    pendingTasks: number;
    completedTasks: number;
  };
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    { label: '今日巡逻', value: stats.todayPatrols, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '今日扫码', value: stats.todayScans, icon: Scan, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '待办任务', value: stats.pendingTasks, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: '已完成', value: stats.completedTasks, icon: CheckCircle2, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className={`${card.bg} rounded-2xl p-4 animate-fade-in`}>
            <div className="flex items-center justify-between mb-2">
              <Icon className={`${card.color}`} size={24} />
              <span className="text-3xl font-bold text-gray-900">{card.value}</span>
            </div>
            <p className="text-sm text-gray-600 font-medium">{card.label}</p>
          </div>
        );
      })}
    </div>
  );
};

export const PatrolCard: React.FC<{ record: PatrolRecord; onClick?: () => void }> = ({ record, onClick }) => {
  const statusColors = {
    pending: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-600',
    completed: 'bg-green-100 text-green-600',
    cancelled: 'bg-red-100 text-red-600',
  };

  return (
    <div 
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer animate-slide-in"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Activity className="text-blue-600" size={20} />
          <span className="font-semibold text-gray-900">{record.patrol_type === 'routine' ? '日常巡逻' : record.patrol_type === 'emergency' ? '紧急巡逻' : '专项巡逻'}</span>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[record.status]}`}>
          {record.status === 'pending' ? '待开始' : record.status === 'in_progress' ? '进行中' : record.status === 'completed' ? '已完成' : '已取消'}
        </span>
      </div>
      
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center space-x-2">
          <User size={16} />
          <span>{record.patroller_name}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Calendar size={16} />
          <span>{new Date(record.start_time).toLocaleString('zh-CN')}</span>
        </div>
        {record.location && (
          <div className="flex items-center space-x-2">
            <MapPin size={16} />
            <span>{record.location}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const TaskCard: React.FC<{ task: MobileTask; onComplete?: () => void }> = ({ task, onComplete }) => {
  const priorityColors = {
    low: 'bg-gray-100 text-gray-600',
    medium: 'bg-blue-100 text-blue-600',
    high: 'bg-orange-100 text-orange-600',
    urgent: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-slide-in">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">{task.task_name}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
            {task.priority === 'low' ? '低' : task.priority === 'medium' ? '中' : task.priority === 'high' ? '高' : '紧急'}
          </span>
        </div>
        {task.status === 'pending' && onComplete && (
          <button
            onClick={onComplete}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            完成
          </button>
        )}
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{task.assignee_name}</span>
        {task.due_date && <span>截止: {new Date(task.due_date).toLocaleDateString('zh-CN')}</span>}
      </div>
    </div>
  );
};

export const QuickAction: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; color: string }> = ({ 
  icon, 
  label, 
  onClick,
  color 
}) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center space-y-2 p-4 hover:bg-gray-50 rounded-xl transition-colors"
    >
      <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </button>
  );
};
