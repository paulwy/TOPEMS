import React, { useState, useEffect, useCallback } from 'react';
import { useTheme, Chip } from '@mui/material';
import { Check, Settings, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import NotificationItem from './NotificationItem';
import NotificationSettings from './NotificationSettings';
import type { Notification } from '@/api/notification';
import { getNotifications, getUnreadCount, markAllAsRead } from '@/api/notification';
import { logger } from '@/utils/logger';
import { NOTIFICATION_PATHS } from '@/modules/notification/config';
import { useNotificationWebSocket } from '@/hooks/useNotificationWebSocket';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

interface NotificationPanelProps {
  onClose: () => void;
  onUnreadCountChange: (count: number) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose, onUnreadCountChange }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

