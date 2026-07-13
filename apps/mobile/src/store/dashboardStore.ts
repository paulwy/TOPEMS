import { create } from 'zustand';
import type { DashboardStats, Task, Event } from '@/types';
import { dashboardApi } from '@/api/dashboard';
import { taskApi } from '@/api/task';

interface DashboardStore {
  stats: DashboardStats;
  tasks: Task[];
  events: Event[];
  isLoading: boolean;

  fetchStats: () => void;
  fetchTasks: () => void;
  fetchEvents: () => void;
}

const defaultStats: DashboardStats = {
  todayPatrols: 0,
  todayScans: 0,
  pendingTasks: 0,
  completedTasks: 0,
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  stats: defaultStats,
  tasks: [],
  events: [],
  isLoading: false,

  fetchStats: async () => {
    set({ isLoading: true });
    try {
      const res = await dashboardApi.getStats();
      if (res.success && res.data) {
        set({ stats: res.data });
      }
    } catch (err) {
      console.error('加载统计数据失败:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTasks: async () => {
    set({ isLoading: true });
    try {
      const res = await taskApi.getMyTasks({ page: 1, pageSize: 10 });
      if (res.success && res.data) {
        set({ tasks: res.data.items || [] });
      }
    } catch (err) {
      console.error('加载任务失败:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchEvents: async () => {
    set({ isLoading: true });
    try {
      const res = await dashboardApi.getRecentActivities({ limit: 5 });
      if (res.success && res.data) {
        const events: Event[] = res.data.map((activity) => ({
          id: activity.id,
          title: activity.title,
          description: activity.description,
          startTime: activity.time || '',
          endTime: '',
          location: '',
          eventType: activity.type,
          status: 'active',
          organizerId: '',
          createdAt: activity.time || '',
          updatedAt: activity.time || '',
        }));
        set({ events });
      }
    } catch (err) {
      console.error('加载活动失败:', err);
    } finally {
      set({ isLoading: false });
    }
  },
}));
