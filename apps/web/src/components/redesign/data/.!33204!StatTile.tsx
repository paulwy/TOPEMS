import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';

export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: LucideIcon;
  accent?: 'amber' | 'cyan' | 'success' | 'warning' | 'error';
  loading?: boolean;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const StatTile = React.forwardRef<HTMLDivElement, StatTileProps>(
  (
    {
      label,
      value,
      unit,
      trend,
      trendValue,
      icon: Icon,
      accent = 'amber',
      loading = false,
      className,
      style,
