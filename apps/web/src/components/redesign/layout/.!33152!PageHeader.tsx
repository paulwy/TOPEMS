import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Button } from '../primitives';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  subtitle?: string;
  backButton?: { label?: string; onClick: () => void };
  primaryAction?: { label: string; onClick: () => void; icon?: React.ReactNode };
  secondaryActions?: Array<{ label: string; onClick: () => void; icon?: React.ReactNode }>;
  breadcrumbs?: Array<{ label: string; href?: string; onClick?: () => void }>;
  /** 操作区（不传递给 DOM 元素） */
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  backButton,
  primaryAction,
  secondaryActions,
