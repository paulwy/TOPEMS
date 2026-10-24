import { Chip } from '@mui/material';
import React from 'react';
import i18n from '@/i18n';

const colorMap: Record<string, { bg: string; color: string }> = {
  'bg-red-100': { bg: 'error.lighter', color: 'error.dark' },
  'bg-yellow-100': { bg: 'warning.100', color: 'yellow.600' },
  'bg-green-100': { bg: 'success.lighter', color: 'success.dark' },
  'bg-gray-100': { bg: 'grey.100', color: 'text.secondary' },
  'bg-blue-100': { bg: 'primary.100', color: 'primary.dark' },
  'bg-orange-100': { bg: 'orange.100', color: 'warning.600' },
  'bg-purple-100': { bg: 'secondary.100', color: 'secondary.dark' },
  'bg-emerald-100': { bg: 'success.lighter', color: 'success.dark' },
};

// EHS Hazard Status Types
export type HazardStatus =
  'active' | 'controlled' | 'eliminated' | 'archived' | '活动中' | '已控制' | '已消除' | '已归档';

// EHS Incident Status Types
export type IncidentStatus =
  'pending' | 'investigating' | 'resolved' | 'closed' | '待处理' | '调查中' | '已解决' | '已关闭';

// EHS Control Measure Status Types
export type ControlStatus =
  'pending' | 'in_progress' | 'completed' | 'verified' | '待处理' | '进行中' | '已完成' | '已验证';

interface EHSStatusBadgeProps {
  status: HazardStatus | IncidentStatus | ControlStatus | string;
  type?: 'hazard' | 'incident' | 'control';
  className?: string;
}

function getHazardStatusConfig(): Record<string, { color: string; label: string }> {
  return {
    active: {
      color: 'bg-red-100 text-red-700 border-red-200',
      label: i18n.t('components.ehs_badges.k12'),
    },
    [i18n.t('components.ehs_badges.k21')]: {
      color: 'bg-red-100 text-red-700 border-red-200',
      label: i18n.t('components.ehs_badges.k13'),
    },
    controlled: {
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      label: i18n.t('components.ehs_badges.k14'),
    },
    [i18n.t('components.ehs_badges.k22')]: {
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      label: i18n.t('components.ehs_badges.k15'),
    },
    eliminated: {
      color: 'bg-green-100 text-green-700 border-green-200',
      label: i18n.t('components.ehs_badges.k16'),
    },
    [i18n.t('components.ehs_badges.k23')]: {
      color: 'bg-green-100 text-green-700 border-green-200',
      label: i18n.t('components.ehs_badges.k17'),
    },
    archived: {
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      label: i18n.t('components.ehs_badges.k18'),
    },
    [i18n.t('components.ehs_badges.k24')]: {
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      label: i18n.t('components.ehs_badges.k19'),
    },
  };
}

function getIncidentStatusConfig(): Record<string, { color: string; label: string }> {
  return {
    pending: {
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      label: i18n.t('components.ehs_badges.k20'),
    },
    [i18n.t('components.ehs_badges.k25')]: {
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      label: i18n.t('components.ehs_badges.k21'),
    },
    investigating: {
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      label: i18n.t('components.ehs_badges.k22'),
    },
    [i18n.t('components.ehs_badges.k26')]: {
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      label: i18n.t('components.ehs_badges.k23'),
    },
    resolved: {
      color: 'bg-green-100 text-green-700 border-green-200',
      label: i18n.t('components.ehs_badges.k24'),
    },
    [i18n.t('components.ehs_badges.k27')]: {
      color: 'bg-green-100 text-green-700 border-green-200',
      label: i18n.t('components.ehs_badges.k25'),
    },
    closed: {
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      label: i18n.t('components.ehs_badges.k26'),
    },
    [i18n.t('components.ehs_badges.k28')]: {
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      label: i18n.t('components.ehs_badges.k27'),
    },
  };
}

function getControlStatusConfig(): Record<string, { color: string; label: string }> {
  return {
    pending: {
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      label: i18n.t('components.ehs_badges.k28'),
    },
    [i18n.t('components.ehs_badges.k29')]: {
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      label: i18n.t('components.ehs_badges.k29'),
    },
    in_progress: {
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      label: i18n.t('components.ehs_badges.k30'),
    },
    [i18n.t('components.ehs_badges.k30')]: {
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      label: i18n.t('components.ehs_badges.k31'),
    },
    completed: {
      color: 'bg-green-100 text-green-700 border-green-200',
      label: i18n.t('components.ehs_badges.k32'),
    },
    [i18n.t('components.ehs_badges.k31')]: {
      color: 'bg-green-100 text-green-700 border-green-200',
      label: i18n.t('components.ehs_badges.k33'),
    },
    verified: {
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      label: i18n.t('components.ehs_badges.k34'),
    },
    [i18n.t('components.ehs_badges.k32')]: {
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      label: i18n.t('components.ehs_badges.k35'),
    },
  };
}

export const EHSStatusBadge: React.FC<EHSStatusBadgeProps> = ({ status, type = 'hazard' }) => {
  const getConfig = () => {
    if (type === 'incident') return getIncidentStatusConfig();
    if (type === 'control') return getControlStatusConfig();
    return getHazardStatusConfig();
  };

  const config = getConfig();
  const item = config[status] || {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    label: status,
  };

  const colors = colorMap[item.color.split(' ')[0]] || {
    bg: 'grey.100',
    color: 'text.secondary',
  };

  return (
    <Chip
      label={item.label}
      size='small'
      sx={{ backgroundColor: colors.bg, color: colors.color, border: 'none' }}
    />
  );
};

// ============ Severity Badge ============

type SeverityLevel =
  | 'high'
  | 'medium'
  | 'low'
  | 'fatal'
  | 'serious'
  | 'minor'
  | 'near_miss'
  | '高'
  | '中'
  | '低'
  | '致命'
  | '严重'
  | '轻微'
  | '未遂';

// ============ Risk Level Badge ============

export type RiskLevel = 'high' | 'medium' | 'low' | '高' | '中' | '低';

// ============ Measure Type Badge ============

export type MeasureType =
  'engineering' | 'administrative' | 'ppe' | '工程控制' | '管理控制' | '个人防护';

interface EHSMeasureTypeBadgeProps {
  type: MeasureType | string;
  className?: string;
}

function getMeasureTypeConfig(): Record<string, { color: string; label: string }> {
  return {
    engineering: {
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      label: i18n.t('components.ehs_badges.k66'),
    },
    [i18n.t('components.ehs_badges.k58')]: {
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      label: i18n.t('components.ehs_badges.k67'),
    },
    administrative: {
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      label: i18n.t('components.ehs_badges.k68'),
    },
    [i18n.t('components.ehs_badges.k59')]: {
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      label: i18n.t('components.ehs_badges.k69'),
    },
    ppe: {
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      label: i18n.t('components.ehs_badges.k70'),
    },
    [i18n.t('components.ehs_badges.k60')]: {
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      label: i18n.t('components.ehs_badges.k71'),
    },
  };
}

export const EHSMeasureTypeBadge: React.FC<EHSMeasureTypeBadgeProps> = ({ type }) => {
  const item = getMeasureTypeConfig()[type] || {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    label: type,
  };

  const colors = colorMap[item.color.split(' ')[0]] || {
    bg: 'grey.100',
    color: 'text.secondary',
  };

  return (
    <Chip
      label={item.label}
      size='small'
      sx={{ backgroundColor: colors.bg, color: colors.color, border: 'none' }}
    />
  );
};

// ============ Incident Type Badge ============

type IncidentType =
  | 'near_miss'
  | 'accident'
  | 'injury'
  | 'environmental'
  | 'equipment'
  | '未遂事件'
  | '事故'
  | '人员伤害'
  | '环境事件'
  | '设备故障';
