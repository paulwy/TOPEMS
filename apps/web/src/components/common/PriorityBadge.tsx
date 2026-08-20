import React from 'react';
import { Chip, Box } from '@mui/material';
import type { ChipProps } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AlertOctagon, AlertTriangle, ArrowDown, ArrowUp, Minus, Flame } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PriorityLevel =
  | 'urgent'
  | 'critical'
  | 'p1'
  | 'P1'
  | 'high'
  | 'p2'
  | 'P2'
  | 'medium'
  | 'normal'
  | 'p3'
  | 'P3'
  | 'low'
  | 'p4'
  | 'P4';

export interface PriorityBadgeProps {
  priority: PriorityLevel | string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  customLabel?: string;
  customColor?: ChipProps['color'];
  mapping?: Record<
    string,
    Partial<{ color: ChipProps['color']; label: string; showIcon: boolean }>
  >;
  sx?: ChipProps['sx'];
}

interface PriorityConfig {
  color: ChipProps['color'];
  labelKey: string;
  icon: (size: number) => React.ReactNode;
}

const iconSizeMap = { sm: 12, md: 14 };

const makeIcon = (IconComp: React.ComponentType<{ size?: number }> | LucideIcon, size: number) =>
  React.createElement(IconComp as React.ComponentType<any>, { size });

const PRIORITY_CONFIG: Record<string, PriorityConfig> = {
  urgent: {
    color: 'error',
    labelKey: 'status_urgent',
    icon: (size: number) => makeIcon(Flame, size),
  },
  critical: {
    color: 'error',
    labelKey: 'status_critical',
    icon: (size: number) => makeIcon(AlertOctagon, size),
  },
  p1: {
    color: 'error',
    labelKey: 'status_p1',
    icon: (size: number) => makeIcon(Flame, size),
  },
  high: {
    color: 'warning',
    labelKey: 'status_high',
    icon: (size: number) => makeIcon(ArrowUp, size),
  },
  p2: {
    color: 'warning',
    labelKey: 'status_p2',
    icon: (size: number) => makeIcon(ArrowUp, size),
  },
  medium: {
    color: 'info',
    labelKey: 'status_medium',
    icon: (size: number) => makeIcon(Minus, size),
  },
  normal: {
    color: 'info',
    labelKey: 'status_normal',
    icon: (size: number) => makeIcon(Minus, size),
  },
  p3: {
    color: 'info',
    labelKey: 'status_p3',
    icon: (size: number) => makeIcon(Minus, size),
  },
  low: {
    color: 'success',
    labelKey: 'status_low',
    icon: (size: number) => makeIcon(ArrowDown, size),
  },
  p4: {
    color: 'success',
    labelKey: 'status_p4',
    icon: (size: number) => makeIcon(ArrowDown, size),
  },
};

const normalizeKey = (p: string): string => p.toLowerCase();

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showIcon = true,
  size = 'sm',
  customLabel,
  customColor,
  mapping,
  sx,
}) => {
  const { t } = useTranslation();
  const key = normalizeKey(String(priority || ''));
  const baseConfig = PRIORITY_CONFIG[key] || {
    color: 'secondary' as const,
    labelKey: 'status_unknown',
    icon: (s: number) => makeIcon(AlertTriangle, s),
  };
  const customOverride = mapping?.[key] || mapping?.[String(priority || '')] || {};

  const config = {
    color: (customOverride.color || customColor || baseConfig.color) as ChipProps['color'],
    label: customOverride.label || t(`common.${baseConfig.labelKey}`),
    icon: baseConfig.icon,
    showIcon: customOverride.showIcon !== undefined ? customOverride.showIcon : showIcon,
  };

  const chipSize: ChipProps['size'] = size === 'sm' ? 'small' : 'medium';
  const iconPx = iconSizeMap[size];
  const iconNode =
    typeof config.icon === 'function'
      ? (config.icon as (s: number) => React.ReactNode)(iconPx)
      : config.icon;

  const label = customLabel || config.label;
  const shouldShowIcon = config.showIcon;

  return (
    <Chip
      size={chipSize}
      color={config.color}
      label={
        shouldShowIcon ? (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            {iconNode}
            <span>{label}</span>
          </Box>
        ) : (
          label
        )
      }
      sx={{ fontWeight: 600, ...sx }}
    />
  );
};

export default PriorityBadge;
