import React from 'react';
import { PageHeader, type PageHeaderProps } from '../layout';
import { Tabs, type TabItem } from '../primitives';

export interface DetailSection {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}

export interface DetailPageTemplateProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'title' | 'onRefresh'
> {
  header: PageHeaderProps;
  sections?: DetailSection[];
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  sidebarWidth?: string;
  loading?: boolean;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
  /** 刷新回调（仅供页内使用，不传递给 DOM 元素） */
  onRefresh?: () => void;
}

export const DetailPageTemplate: React.FC<DetailPageTemplateProps> = ({
  header,
  sections,
  tabs,
  activeTab,
  onTabChange,
  children,
  sidebar,
  sidebarWidth = '320px',
  loading = false,
  className,
  style,
