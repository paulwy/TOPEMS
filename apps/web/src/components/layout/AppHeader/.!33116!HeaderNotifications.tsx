import { designTokens } from '@topems/tokens';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Divider,
  Avatar,
  CircularProgress,
} from '@mui/material';
import i18n from '@/i18n';
import { Bell, CheckCheck, Trash2, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NOTIFICATION_PATHS } from '@/modules/notification/config';
import {
  getNotifications,
  markAllAsRead,
  markAsRead,
  deleteNotification,
} from '@/api/notification';
import type { Notification, NotificationTypeEnum } from '@/api/notification';
import { formatRelativeTime } from '@/utils/format';
import { useUnreadNotificationCount, useNotificationBadgeStore } from '@/store';

export const HeaderNotifications: React.FC = () => {
  const navigate = useNavigate();

  const [notificationAnchorEl, setNotificationAnchorEl] = useState<HTMLElement | null>(null);
  const notificationOpen = Boolean(notificationAnchorEl);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = useUnreadNotificationCount();
  const decrementBadge = useNotificationBadgeStore((s) => s.decrement);
  const setBadgeToZero = useNotificationBadgeStore((s) => s.setUnreadCount);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const fetchNotificationsData = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const res = await getNotifications(1, 20);
      if (res.success && res.data) {
        setNotifications(res.data.notifications ?? []);
