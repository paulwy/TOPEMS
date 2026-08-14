import React from 'react';
import {
  PlayCircle,
  PauseCircle,
  Wrench,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  PowerOff,
} from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import type { RealtimeAlarm } from './types';

export const ct= designTokens.colors;

export const REFRESH_INTERVAL_MS = 10_000;
export const TREND_HOURS = 12;

export const EQUIPMENT_STATUS_META: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  running: { label: '运行中', color: 'success.main', icon: <PlayCircle size={14} /> },
  in_use: { label: '使用中', color: 'success.main', icon: <PlayCircle size={14} /> },
  normal: { label: '正常', color: 'success.main', icon: <CheckCircle2 size={14} /> },
  idle: { label: '空闲', color: 'primary.main', icon: <PauseCircle size={14} /> },
  maintenance: { label: '维护中', color: 'warning.main', icon: <Wrench size={14} /> },
  fault: { label: '故障', color: 'error.main', icon: <AlertTriangle size={14} /> },
  error: { label: '故障', color: 'error.main', icon: <XCircle size={14} /> },
  scrapped: { label: '已报废', color: 'grey.400', icon: <PowerOff size={14} /> },
  offline: { label: '离线', color: 'grey.400', icon: <PowerOff size={14} /> },
};

export const ALARM_LEVEL_META: Record<
  RealtimeAlarm['level'],
  { label: string; color: string; bg: string }
> = {
  critical: { label: '严重', color: ct.background.paper, bg: 'error.main' },
  warning: { label: '警告', color: ct.background.paper, bg: 'warning.main' },
  info: { label: '提示', color: ct.background.paper, bg: 'primary.main' },
};

export const SCHEDULE_STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: '待开始', color: 'grey.400' },
  in_progress: { label: '进行中', color: 'primary.main' },
  processing: { label: '进行中', color: 'primary.main' },
  completed: { label: '已完成', color: 'success.main' },
  paused: { label: '已暂停', color: 'warning.main' },
  delayed: { label: '延期', color: 'error.main' },
};
