import React from 'react';
import { Box, Paper, useTheme, useMediaQuery, Skeleton } from '@mui/material';
import { PageHeader } from '../templates/PageHeader';
import type { PageHeaderProps } from '../templates/PageHeader';

/**
 * 页面容器组件
 *
 * 作为页面最外层容器，提供统一的页面布局、背景色、最大宽度和内边距。
 *
 * ## 使用规范
 *
 * ### 推荐用法
 * - 内容页（列表页、详情页、表单页）：使用默认 `padding={true}`
 * - 仪表盘页（Dashboard）：设置 `padding={false}`，由内部卡片组件控制间距
 * - 全屏内容（地图、编辑器）：设置 `padding={false}` 和 `maxWidth={false}`
 *
 * ### 与模板组件配合
 * - ListPageTemplate / DetailPageTemplate / FormPageTemplate：
 *   推荐用 PageContainer 包裹，由 PageContainer 提供页面级 padding
 * - DashboardTemplate：
 *   推荐设置 `padding={false}`，DashboardTemplate 内部已处理布局
 *
 * @example
 * ```tsx
 * // 列表页（推荐）
 * <PageContainer title="用户管理">
 *   <ListPageTemplate ... />
 * </PageContainer>
 *
 * // 仪表盘页
 * <PageContainer title="数据概览" padding={false} maxWidth={false}>
 *   <DashboardTemplate ... />
 * </PageContainer>
 * ```
 */
export interface PageContainerProps {
  /** 页面内容 */
  children: React.ReactNode;
  /** 页面标题（传递给 PageHeader） */
  title?: string;
  /** 页面副标题（传递给 PageHeader） */
  subtitle?: string;
  /** 页面描述（传递给 PageHeader） */
  description?: string;
  /** 透传给 PageHeader 的其他属性 */
  headerProps?: Omit<PageHeaderProps, 'title' | 'subtitle' | 'description'>;
  /**
   * 内容区域最大宽度
   * @default 'xl'
   */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  /**
   * 是否显示页面内边距
   * - true: 内容区域有水平内边距（xs: 16px, sm+: 24px）和底部内边距（32px）
   * - false: 内容区域无边距，内容撑满整个宽度
   * @default true
   */
  padding?: boolean;
  /**
   * 是否用 Paper 组件包裹内容
   * @default false
   */
  paper?: boolean;
  /** 是否显示加载骨架屏 */
  loading?: boolean;
  /** 自定义背景色 */
  bgcolor?: string;
  /** 自定义 className */
  className?: string;
  /** 自定义根容器样式 */
  sx?: React.ComponentProps<typeof Box>['sx'];
  /** 自定义内容区域样式 */
  contentSx?: React.ComponentProps<typeof Box>['sx'];
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  subtitle,
  description,
  headerProps,
  maxWidth = 'xl',
  padding = true,
  paper = false,
  loading = false,
  bgcolor,
  className,
  sx,
  contentSx,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const hasHeader = Boolean(title || headerProps);

  const ContentWrapper = paper ? Paper : Box;
  const contentWrapperProps = paper
    ? {
        elevation: 0,
        sx: {
          borderRadius: 2,
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
          title={title || ''}
          subtitle={subtitle}
          description={description}
          loading={loading}
          {...headerProps}
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
