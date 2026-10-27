import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useNotificationStore } from '@/store';
import { Box, Typography, Button } from '@mui/material';

('use client');

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  title?: string;
  message: string;
  type: NotificationType;
  duration?: number;
  removeNotification: (id: string) => void;
}

const Toast = ({ id, title, message, type, duration, removeNotification }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true);

