import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from './notificationStore';

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.getState().clearAll();
  });

  it('should initialize with empty notifications', () => {
    const store = useNotificationStore.getState();
    expect(store.notifications).toEqual([]);
    expect(store.unreadCount).toBe(0);
  });

  it('should add notification', () => {
    const { addNotification } = useNotificationStore.getState();
    
    addNotification({
      id: '1',
      title: 'Test',
      message: 'Test message',
      read: false,
      type: 'info',
      createdAt: '2024-01-01',
    });
    
    const store = useNotificationStore.getState();
    expect(store.notifications.length).toBe(1);
    expect(store.notifications[0].title).toBe('Test');
  });

  it('should increment unread count for unread notification', () => {
    const { addNotification } = useNotificationStore.getState();
    
    addNotification({
      id: '1',
      title: 'Test',
      message: 'Test message',
      read: false,
      type: 'info',
      createdAt: '2024-01-01',
    });
    
    const store = useNotificationStore.getState();
    expect(store.unreadCount).toBe(1);
  });

  it('should not increment unread count for read notification', () => {
    const { addNotification } = useNotificationStore.getState();
    
    addNotification({
      id: '1',
      title: 'Test',
      message: 'Test message',
      read: true,
      type: 'info',
      createdAt: '2024-01-01',
    });
    
    const store = useNotificationStore.getState();
    expect(store.unreadCount).toBe(0);
  });

  it('should mark notification as read', () => {
    const { addNotification, markAsRead } = useNotificationStore.getState();
    
    addNotification({
      id: '1',
      title: 'Test',
      message: 'Test message',
      read: false,
      type: 'info',
      createdAt: '2024-01-01',
    });
    
    markAsRead('1');
    
    const store = useNotificationStore.getState();
    expect(store.notifications[0].read).toBe(true);
    expect(store.unreadCount).toBe(0);
  });

  it('should mark all as read', () => {
    const { addNotification, markAllAsRead } = useNotificationStore.getState();
    
    addNotification({
      id: '1',
      title: 'Test 1',
      message: 'Test message 1',
      read: false,
      type: 'info',
      createdAt: '2024-01-01',
    });
    
    addNotification({
      id: '2',
      title: 'Test 2',
      message: 'Test message 2',
      read: false,
      type: 'success',
      createdAt: '2024-01-02',
    });
    
    markAllAsRead();
    
    const store = useNotificationStore.getState();
    expect(store.notifications.every(n => n.read)).toBe(true);
    expect(store.unreadCount).toBe(0);
  });

  it('should remove notification', () => {
    const { addNotification, removeNotification } = useNotificationStore.getState();
    
    addNotification({
      id: '1',
      title: 'Test',
      message: 'Test message',
      read: false,
      type: 'info',
      createdAt: '2024-01-01',
    });
    
    removeNotification('1');
    
    const store = useNotificationStore.getState();
    expect(store.notifications.length).toBe(0);
  });

  it('should clear all notifications', () => {
    const { addNotification, clearAll } = useNotificationStore.getState();
    
    addNotification({
      id: '1',
      title: 'Test',
      message: 'Test message',
      read: false,
      type: 'info',
      createdAt: '2024-01-01',
    });
    
    addNotification({
      id: '2',
      title: 'Test 2',
      message: 'Test message 2',
      read: false,
      type: 'success',
      createdAt: '2024-01-02',
    });
    
    clearAll();
    
    const store = useNotificationStore.getState();
    expect(store.notifications).toEqual([]);
    expect(store.unreadCount).toBe(0);
  });
});