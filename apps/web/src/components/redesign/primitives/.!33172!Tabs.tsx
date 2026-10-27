import React, { useState } from 'react';
import clsx from 'clsx';

export interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
  disabled?: boolean;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  tabs: TabItem[];
  activeTab?: string;
  onChange?: (id: string) => void;
  variant?: 'default' | 'pills';
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab: controlledActive,
  onChange,
  variant = 'default',
  className,
  style,
