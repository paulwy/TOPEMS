import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme, useMediaQuery } from '@mui/material';
import {
  MessageSquare,
  FileText,
  Code,
  Zap,
  Clock,
  Sparkles,
  BookOpen,
  Lightbulb,
} from 'lucide-react';

import { AI_PATHS } from '@/modules/ai/config';
import { useNotificationStore } from '@/store';

export interface StatCardData {
  id: string;
  title: string;
  value: string;
  icon: React.ReactNode;
  change: number;
  changeLabel: string;
  color: 'primary' | 'info' | 'success' | 'warning' | 'secondary';
  onClick?: () => void;
}

export interface QuickActionData {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: 'primary' | 'info' | 'success' | 'warning' | 'secondary';
  onClick: () => void;
  description?: string;
}

export interface RecentItemData {
  id: string;
  title: string;
  description: string;
  status: 'success' | 'warning' | 'error' | 'info';
  type: 'chat' | 'code' | 'document' | 'summary';
  onClick: () => void;
}

export interface FeatureCardData {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  stats?: { label: string; value: string }[];
  action?: { label: string; onClick: () => void };
}
