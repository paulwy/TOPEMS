import { create } from 'zustand';

/**
 * 全局通知未读徽章计数。
 * - 唯一写入源头：GlobalLayout（每 60s 轮询 getUnreadCount）
 * - 其他消费方（HeaderNotifications、移动端 Tab 栏）只读
 * - 目的：避免多个组件同时发起 getUnreadCount，造成重复 401/404 日志
 */
interface NotificationBadgeState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  increment: (delta?: number) => void;
  decrement: (delta?: number) => void;
}

export const useNotificationBadgeStore = create<NotificationBadgeState>()((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  increment: (delta = 1) =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount + delta) })),
  decrement: (delta = 1) =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - delta) })),
}));

export const useUnreadNotificationCount = () =>
  useNotificationBadgeStore((state) => state.unreadCount);
export const useSetUnreadNotificationCount = () =>
  useNotificationBadgeStore((state) => state.setUnreadCount);
