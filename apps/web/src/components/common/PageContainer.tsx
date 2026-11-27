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
  autoBreadcrumbs: _autoBreadcrumbs, // G1: 面包屑统一由 AppShell 自动面包屑渲染
  backButton,
}) => {
  const location = useLocation();
  const { t } = useTranslation();
  const currentNavItem = useCurrentNavItem();
  const navHierarchy = useNavHierarchy();

  const computedTitle = useMemo(() => {
    if (!autoTitle) return;
    if (currentNavItem) {
      // 渲染期响应式翻译：i18n 资源异步注入后 useTranslation 触发重渲染，
      // 避免 currentNavItem.label 停留在 ns 注入前的旧翻译。
      return currentNavItem.labelKey ? t(currentNavItem.labelKey) : currentNavItem.label;
    }
    const route = findRouteByPathSync(location.pathname);
    // route.title 可能来自模块 config 顶层求值固化值（i18n ns 注入竞态），
    // 若存在 titleKey 则渲染期运行时翻译，避免显示原始 i18n 键。
    if (route?.titleKey) {
      try {
        return t(route.titleKey);
      } catch {
        /* noop */
      }
    }
    return route?.title;
  }, [autoTitle, currentNavItem, location.pathname, t]);

  const title = propTitle || computedTitle || '';

  const backButtonConfig = useMemo(() => {
    if (backButton === false || !backButton) return;
    if (backButton === true) {
      const parentItem = navHierarchy[navHierarchy.length - 2];
      return {
        href: parentItem?.path,
        visible: true,
      };
    }
    return {
      ...backButton,
      visible: true,
    };
  }, [backButton, navHierarchy]);

  const headerTitle = (headerProps as unknown as PageHeaderProps)?.title;
  const mergedHeaderProps: PageHeaderProps = {
    title: headerTitle || title || '',
    ...(headerProps as unknown as Record<string, unknown>),
    ...(headerActions && { customToolbar: headerActions }),
    ...(headerContent && { children: headerContent }),
    ...(actions && { actions }),
    ...(backButtonConfig && { backButton: backButtonConfig }),
  };

  const hasMeaningfulHeaderProp = Object.keys(mergedHeaderProps).some(
    (k) => k !== 'title' && (mergedHeaderProps as unknown as Record<string, unknown>)[k] !== undefined
  );
  const hasHeader = Boolean(title || headerTitle || hasMeaningfulHeaderProp);

  const ContentWrapper = paper ? Paper : Box;
  const contentWrapperProps = paper
    ? {
        elevation: 0,
        sx: {
          borderRadius: 3,
          ...contentSx,
        },
      }
    : {
        sx: contentSx,
      };

  return (
    <Box
      className={className}
      sx={{
        width: '100%',
        minHeight: '100%',
        bgcolor: bgcolor || 'background.default',
        ...sx,
      }}
    >
      {hasHeader && (
        <PageHeader
          subtitle={subtitle}
          description={description}
          loading={loading}
          {...mergedHeaderProps}
        />
      )}

      <Box
        sx={{
          ...(maxWidth && { maxWidth }),
          mx: 'auto',
          px: padding ? { xs: 2, sm: 3 } : 0,
          pb: padding ? 4 : 0,
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton
              variant='rectangular'
              height={200}
              sx={{ borderRadius: 1 }}
            />
            <Skeleton
              variant='rectangular'
              height={300}
              sx={{ borderRadius: 1 }}
            />
          </Box>
        ) : (
          <ContentWrapper {...contentWrapperProps}>{children}</ContentWrapper>
        )}
      </Box>
    </Box>
  );
};

export default PageContainer;
