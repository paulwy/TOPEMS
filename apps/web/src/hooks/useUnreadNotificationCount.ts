import { useQuery } from '@tanstack/react-query';
import { getUnreadCount } from '@/api/notification';

/**
 * 当前登录用户的未读通知数（真实接口 /notifications/unread-count）。
 * 移动端各页头铃铛角标统一使用此值，禁止写死。
 */
export const useUnreadNotificationCount = (): number => {
  const { data } = useQuery<number>({
    queryKey: ['ad-hoc', 'unread_notification_count'],
    queryFn: async () => {
      const response = await getUnreadCount();
      const raw = response?.data as unknown;
      let value = 0;
      if (typeof raw === 'number') {
        value = raw;
      } else if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        const n = obj.unread_count ?? obj.unread ?? obj.count;
        if (typeof n === 'number') value = n;
      }
      return Number.isFinite(value) ? value : 0;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: false,
  });
  return data ?? 0;
};
