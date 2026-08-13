import { describe, it, expect, beforeEach } from 'vitest';
import {
  useNotificationBadgeStore,
  useUnreadNotificationCount,
  useSetUnreadNotificationCount,
} from '../notificationBadgeStore';
import { renderHook, act } from '@testing-library/react';

describe('notificationBadgeStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    act(() => {
      useNotificationBadgeStore.setState({ unreadCount: 0 });
    });
  });

  describe('setUnreadCount', () => {
    it('sets a positive count', () => {
      act(() => {
        useNotificationBadgeStore.getState().setUnreadCount(5);
      });
      expect(useNotificationBadgeStore.getState().unreadCount).toBe(5);
    });

    it('clamps negative values to 0', () => {
      act(() => {
        useNotificationBadgeStore.getState().setUnreadCount(-3);
      });
      expect(useNotificationBadgeStore.getState().unreadCount).toBe(0);
    });

    it('overwrites previous value', () => {
      act(() => {
        useNotificationBadgeStore.getState().setUnreadCount(10);
        useNotificationBadgeStore.getState().setUnreadCount(2);
      });
      expect(useNotificationBadgeStore.getState().unreadCount).toBe(2);
    });
  });

  describe('increment', () => {
    it('increments by 1 by default', () => {
      act(() => {
        useNotificationBadgeStore.getState().setUnreadCount(3);
        useNotificationBadgeStore.getState().increment();
      });
      expect(useNotificationBadgeStore.getState().unreadCount).toBe(4);
    });

    it('increments by custom delta', () => {
      act(() => {
        useNotificationBadgeStore.getState().setUnreadCount(1);
        useNotificationBadgeStore.getState().increment(5);
      });
      expect(useNotificationBadgeStore.getState().unreadCount).toBe(6);
    });

    it('clamps to 0 when incrementing from 0 with negative delta', () => {
      act(() => {
        useNotificationBadgeStore.getState().increment(-5);
      });
      expect(useNotificationBadgeStore.getState().unreadCount).toBe(0);
    });
  });

  describe('decrement', () => {
    it('decrements by 1 by default', () => {
      act(() => {
        useNotificationBadgeStore.getState().setUnreadCount(5);
        useNotificationBadgeStore.getState().decrement();
      });
      expect(useNotificationBadgeStore.getState().unreadCount).toBe(4);
    });

    it('decrements by custom delta', () => {
      act(() => {
        useNotificationBadgeStore.getState().setUnreadCount(10);
        useNotificationBadgeStore.getState().decrement(3);
      });
      expect(useNotificationBadgeStore.getState().unreadCount).toBe(7);
    });

    it('clamps to 0 when decrementing below 0', () => {
      act(() => {
        useNotificationBadgeStore.getState().setUnreadCount(1);
        useNotificationBadgeStore.getState().decrement(5);
      });
      expect(useNotificationBadgeStore.getState().unreadCount).toBe(0);
    });
  });

  describe('hooks', () => {
    it('useUnreadNotificationCount returns current count', () => {
      act(() => {
        useNotificationBadgeStore.getState().setUnreadCount(7);
      });
      const { result } = renderHook(() => useUnreadNotificationCount());
      expect(result.current).toBe(7);
    });

    it('useSetUnreadNotificationCount returns setter function', () => {
      const { result } = renderHook(() => useSetUnreadNotificationCount());
      act(() => {
        result.current(42);
      });
      expect(useNotificationBadgeStore.getState().unreadCount).toBe(42);
    });
  });
});
