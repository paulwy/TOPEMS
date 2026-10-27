import React, { useMemo } from 'react';
import { Box, Paper, Skeleton } from '@mui/material';
import { PageHeader } from '../templates/PageHeader';
import type { PageHeaderProps, PageAction } from '../templates/PageHeader';
import { useNavHierarchy, useCurrentNavItem } from '@/lib/navigation/hooks';
import { findRouteByPathSync } from '@/routes/v2';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  description?: string;
  headerProps?: Omit<PageHeaderProps, 'title' | 'subtitle' | 'description'>;
  headerActions?: React.ReactNode;
  headerContent?: React.ReactNode;
  actions?: PageAction[];
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  padding?: boolean;
  paper?: boolean;
  loading?: boolean;
  bgcolor?: string;
  className?: string;
  sx?: React.ComponentProps<typeof Box>['sx'];
  contentSx?: React.ComponentProps<typeof Box>['sx'];
  autoTitle?: boolean;
  autoBreadcrumbs?: boolean;
  backButton?: boolean | { href?: string; onClick?: () => void };
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title: propTitle,
  subtitle,
  description,
  headerProps,
  headerActions,
  headerContent,
  actions,
  maxWidth = 'xl',
  padding = true,
  paper = false,
  loading = false,
  bgcolor,
  className,
  sx,
  contentSx,
  autoTitle = true,
