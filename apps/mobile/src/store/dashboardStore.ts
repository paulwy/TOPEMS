import { create } from 'zustand';
import type { DashboardStats, Task, Event } from '@/types';

interface DashboardStore {
  stats: DashboardStats;
  tasks: Task[];
  events: Event[];
  isLoading: boolean;

  fetchStats: () => void;
  fetchTasks: () => void;
  fetchEvents: () => void;
}

const mockStats: DashboardStats = {
  totalTasks: 15,
  completedTasks: 8,
  pendingTasks: 7,
  upcomingEvents: 3,
};

const mockTasks: Task[] = [
  {
    id: '1',
    title: '完成月度报告',
    description: '准备本月的销售报告',
    status: 'in_progress',
    priority: 'high',
    dueDate: '2024-01-15',
    createdAt: '2024-01-10',
  },
  {
    id: '2',
    title: '团队会议',
    description: '组织团队周会',
    status: 'pending',
    priority: 'medium',
    dueDate: '2024-01-16',
    createdAt: '2024-01-11',
  },
  {
    id: '3',
    title: '更新文档',
    description: '更新产品文档',
    status: 'completed',
    priority: 'low',
    dueDate: '2024-01-12',
    createdAt: '2024-01-08',
  },
];

const mockEvents: Event[] = [
  {
    id: '1',
    title: '产品发布会',
    date: '2024-01-18',
    time: '10:00',
    location: '会议室A',
  },
  {
    id: '2',
    title: '客户回访',
    date: '2024-01-19',
    time: '14:00',
    location: '线上会议',
  },
];

export const useDashboardStore = create<DashboardStore>((set) => ({
  stats: mockStats,
  tasks: mockTasks,
  events: mockEvents,
  isLoading: false,

  fetchStats: () => {
    set({ isLoading: true });
    setTimeout(() => {
      set({ stats: mockStats, isLoading: false });
    }, 500);
  },

  fetchTasks: () => {
    set({ isLoading: true });
    setTimeout(() => {
      set({ tasks: mockTasks, isLoading: false });
    }, 500);
  },

  fetchEvents: () => {
    set({ isLoading: true });
    setTimeout(() => {
      set({ events: mockEvents, isLoading: false });
    }, 500);
  },
}));
