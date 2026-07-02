import { Chip } from '@mui/material';
import React from 'react';

const colorMap: Record<string, { bg: string; color: string }> = {
  'bg-red-100': { bg: 'error.lighter', color: 'error.dark' },
  'bg-yellow-100': { bg: 'warning.100', color: '#ca8a04' },
  'bg-green-100': { bg: 'success.lighter', color: 'success.dark' },
  'bg-gray-100': { bg: 'grey.100', color: 'text.secondary' },
  'bg-blue-100': { bg: 'primary.100', color: 'primary.dark' },
  'bg-orange-100': { bg: '#ffedd5', color: 'warning.600' },
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

const hazardStatusConfig: Record<string, { color: string; label: string }> = {
  active: { color: 'bg-red-100 text-red-700 border-red-200', label: '活动中' },
  活动中: { color: 'bg-red-100 text-red-700 border-red-200', label: '活动中' },
  controlled: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    label: '已控制',
  },
  已控制: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    label: '已控制',
  },
  eliminated: {
    color: 'bg-green-100 text-green-700 border-green-200',
    label: '已消除',
  },
  已消除: {
    color: 'bg-green-100 text-green-700 border-green-200',
    label: '已消除',
  },
  archived: {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    label: '已归档',
  },
  已归档: {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    label: '已归档',
  },
};

const incidentStatusConfig: Record<string, { color: string; label: string }> = {
  pending: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    label: '待处理',
  },
  待处理: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    label: '待处理',
  },
  investigating: {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    label: '调查中',
  },
  调查中: {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    label: '调查中',
  },
  resolved: {
    color: 'bg-green-100 text-green-700 border-green-200',
    label: '已解决',
  },
  已解决: {
    color: 'bg-green-100 text-green-700 border-green-200',
    label: '已解决',
  },
  closed: {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    label: '已关闭',
  },
  已关闭: {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    label: '已关闭',
  },
};

const controlStatusConfig: Record<string, { color: string; label: string }> = {
  pending: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    label: '待处理',
  },
  待处理: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    label: '待处理',
  },
  in_progress: {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    label: '进行中',
  },
  进行中: {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    label: '进行中',
  },
  completed: {
    color: 'bg-green-100 text-green-700 border-green-200',
    label: '已完成',
  },
  已完成: {
    color: 'bg-green-100 text-green-700 border-green-200',
    label: '已完成',
  },
  verified: {
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    label: '已验证',
  },
  已验证: {
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    label: '已验证',
  },
};

export const EHSStatusBadge: React.FC<EHSStatusBadgeProps> = ({
  status,
  type = 'hazard',
  className = '',
}) => {
  const getConfig = () => {
    if (type === 'incident') return incidentStatusConfig;
    if (type === 'control') return controlStatusConfig;
    return hazardStatusConfig;
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

export type SeverityLevel =
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

interface EHSSeverityBadgeProps {
  severity: SeverityLevel | string;
  className?: string;
}

const severityConfig: Record<string, { color: string; label: string }> = {
  high: { color: 'bg-red-100 text-red-700 border-red-200', label: '高' },
  高: { color: 'bg-red-100 text-red-700 border-red-200', label: '高' },
  fatal: { color: 'bg-red-100 text-red-700 border-red-200', label: '致命' },
  致命: { color: 'bg-red-100 text-red-700 border-red-200', label: '致命' },
  serious: {
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    label: '严重',
  },
  严重: {
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    label: '严重',
  },
  medium: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    label: '中',
  },
  中: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: '中' },
  minor: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    label: '轻微',
  },
  轻微: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    label: '轻微',
  },
  low: { color: 'bg-green-100 text-green-700 border-green-200', label: '低' },
  低: { color: 'bg-green-100 text-green-700 border-green-200', label: '低' },
  near_miss: {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    label: '未遂',
  },
  未遂: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: '未遂' },
};

export const EHSSeverityBadge: React.FC<EHSSeverityBadgeProps> = ({ severity, className = '' }) => {
  const item = severityConfig[severity] || {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    label: severity,
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

// ============ Risk Level Badge ============

export type RiskLevel = 'high' | 'medium' | 'low' | '高' | '中' | '低';

interface EHSRiskLevelBadgeProps {
  level: RiskLevel | string;
  showLabel?: boolean;
  className?: string;
}

const riskLevelConfig: Record<string, { color: string; label: string }> = {
  high: { color: 'bg-red-100 text-red-700 border-red-200', label: '高风险' },
  高: { color: 'bg-red-100 text-red-700 border-red-200', label: '高风险' },
  medium: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    label: '中风险',
  },
  中: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    label: '中风险',
  },
  low: {
    color: 'bg-green-100 text-green-700 border-green-200',
    label: '低风险',
  },
  低: {
    color: 'bg-green-100 text-green-700 border-green-200',
    label: '低风险',
  },
};

export const EHSRiskLevelBadge: React.FC<EHSRiskLevelBadgeProps> = ({
  level,
  showLabel = true,
  className = '',
}) => {
  const item = riskLevelConfig[level] || {
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    label: level,
  };

  const colors = colorMap[item.color.split(' ')[0]] || {
    bg: 'grey.100',
    color: 'text.secondary',
  };

  return (
    <Chip
      label={showLabel ? item.label : level}
      size='small'
      sx={{ backgroundColor: colors.bg, color: colors.color, border: 'none' }}
    />
  );
};

// ============ Measure Type Badge ============

export type MeasureType =
  'engineering' | 'administrative' | 'ppe' | '工程控制' | '管理控制' | '个人防护';

interface EHSMeasureTypeBadgeProps {
  type: MeasureType | string;
  className?: string;
}

const measureTypeConfig: Record<string, { color: string; label: string }> = {
  engineering: {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    label: '工程控制',
  },
  工程控制: {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    label: '工程控制',
  },
  administrative: {
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    label: '管理控制',
  },
  管理控制: {
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    label: '管理控制',
  },
  ppe: {
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    label: '个人防护',
  },
  个人防护: {
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    label: '个人防护',
  },
};

export const EHSMeasureTypeBadge: React.FC<EHSMeasureTypeBadgeProps> = ({
  type,
  className = '',
}) => {
  const item = measureTypeConfig[type] || {
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

export type IncidentType =
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

interface EHSIncidentTypeBadgeProps {
  type: IncidentType | string;
  className?: string;
}

const incidentTypeConfig: Record<string, { color: string; label: string }> = {
  near_miss: {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    label: '未遂事件',
  },
  未遂事件: {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    label: '未遂事件',
  },
  accident: { color: 'bg-red-100 text-red-700 border-red-200', label: '事故' },
  事故: { color: 'bg-red-100 text-red-700 border-red-200', label: '事故' },
  injury: {
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    label: '人员伤害',
  },
  人员伤害: {
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    label: '人员伤害',
  },
  environmental: {
    color: 'bg-green-100 text-green-700 border-green-200',
    label: '环境事件',
  },
  环境事件: {
    color: 'bg-green-100 text-green-700 border-green-200',
    label: '环境事件',
  },
  equipment: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    label: '设备故障',
  },
  设备故障: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    label: '设备故障',
  },
};

export const EHSIncidentTypeBadge: React.FC<EHSIncidentTypeBadgeProps> = ({
  type,
  className = '',
}) => {
  const item = incidentTypeConfig[type] || {
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
