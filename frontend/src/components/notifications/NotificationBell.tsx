import React, { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import NotificationPanel from './NotificationPanel';
import { useNotificationWebSocket } from '../../hooks/useNotificationWebSocket';
import { useNotificationState } from '../../hooks/useNotificationState';
import { Notification } from '../../api/notification';

interface NotificationBellProps {
  onNotificationClick?: () => void;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onNotificationClick }) => {
  const [showPanel, setShowPanel] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false); // Disable by default

  const {
    notifications,
    unreadCount,
    loading,
    error,
    addNotification,
    updateNotification,
    removeNotification,
    fetchNotifications,
    fetchUnreadCount,
  } = useNotificationState();

  const handleNewNotification = useCallback(
    (notification: Notification) => {
      addNotification(notification);
      setHasNewNotification(true);
      setTimeout(() => setHasNewNotification(false), 3000);
    },
    [addNotification]
  );

  // Always initialize the hook, but connection is disabled internally
  const {
    isConnected,
    error: wsError,
    reconnect,
  } = useNotificationWebSocket({
    userId: 'user_001',
    onNotification: handleNewNotification,
    onUnreadCountChange: fetchUnreadCount,
    maxReconnectAttempts: 0, // No auto-reconnect
  });

  // Disable auto-reconnect
  // useEffect(() => {
  //   if (!isConnected && !wsError) {
  //     const reconnectTimer = setTimeout(() => {
  //       reconnect();
  //     }, 5000);
  //     return () => clearTimeout(reconnectTimer);
  //   }
  // }, [isConnected, wsError, reconnect]);

  const handleBellClick = () => {
    setShowPanel(!showPanel);
    if (onNotificationClick) {
      onNotificationClick();
    }
    if (!showPanel) {
      fetchNotifications();
      fetchUnreadCount();
    }
  };

  const handleClose = () => {
    setShowPanel(false);
  };

  const handleUnreadCountChange = (count: number) => {
    fetchUnreadCount();
  };

  return (
    <div className='relative'>
      <button
        onClick={handleBellClick}
        className='relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200'
        aria-label='通知'
      >
        <Bell className='w-6 h-6' />
        {unreadCount > 0 && (
          <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5'>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {hasNewNotification && (
          <span className='absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping' />
        )}
        {isConnected && <span className='absolute bottom-1 right-1 w-2 h-2 bg-green-500 rounded-full' title='已连接' />}
      </button>

      {showPanel && (
        <>
          <div className='fixed inset-0 z-40' onClick={handleClose} />
          <NotificationPanel onClose={handleClose} onUnreadCountChange={handleUnreadCountChange} />
        </>
      )}
    </div>
  );
};

export default NotificationBell;
