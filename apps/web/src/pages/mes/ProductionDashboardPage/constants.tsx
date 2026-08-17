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
import i18n from '@/i18n';
import { designTokens } from '@/theme/tokens';
import type { RealtimeAlarm } from './types';

export const ct = designTokens.colors;
export const REFRESH_INTERVAL_MS = 10_000;
export const TREND_HOURS = 12;
export const EQUIPMENT_STATUS_META: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  running: {
    label: i18n.t('mes.constants.k0'),
    color: 'success.main',
    icon: <PlayCircle size={14} />,
  },
  in_use: {
    label: i18n.t('mes.constants.k1'),
    color: 'success.main',
    icon: <PlayCircle size={14} />,
  },
  normal: {
    label: i18n.t('mes.constants.k2'),
    color: 'success.main',
    icon: <CheckCircle2 size={14} />,
  },
  idle: {
    label: i18n.t('mes.constants.k3'),
    color: 'primary.main',
    icon: <PauseCircle size={14} />,
  },
  maintenance: {
    label: i18n.t('mes.constants.k4'),
    color: 'warning.main',
    icon: <Wrench size={14} />,
  },
  fault: {
    label: i18n.t('mes.constants.k5'),
    color: 'error.main',
    icon: <AlertTriangle size={14} />,
  },
  error: { label: i18n.t('mes.constants.k6'), color: 'error.main', icon: <XCircle size={14} /> },
  scrapped: { label: i18n.t('mes.constants.k7'), color: 'grey.400', icon: <PowerOff size={14} /> },
  offline: { label: i18n.t('mes.constants.k8'), color: 'grey.400', icon: <PowerOff size={14} /> },
};
export const ALARM_LEVEL_META: Record<
  RealtimeAlarm['level'],
  { label: string; color: string; bg: string }
> = {
  critical: { label: i18n.t('mes.constants.k9'), color: ct.background.paper, bg: 'error.main' },
  warning: { label: i18n.t('mes.constants.k10'), color: ct.background.paper, bg: 'warning.main' },
  info: { label: i18n.t('mes.constants.k11'), color: ct.background.paper, bg: 'primary.main' },
};
export const SCHEDULE_STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: i18n.t('mes.constants.k12'), color: 'grey.400' },
  in_progress: { label: i18n.t('mes.constants.k13'), color: 'primary.main' },
  processing: { label: i18n.t('mes.constants.k14'), color: 'primary.main' },
  completed: { label: i18n.t('mes.constants.k15'), color: 'success.main' },
  paused: { label: i18n.t('mes.constants.k16'), color: 'warning.main' },
  delayed: { label: i18n.t('mes.constants.k17'), color: 'error.main' },
};
