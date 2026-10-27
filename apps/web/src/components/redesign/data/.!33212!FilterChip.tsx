import React from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';

export interface FilterChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  onRemove?: () => void;
  active?: boolean;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  onRemove,
  active = false,
  className,
  style,
