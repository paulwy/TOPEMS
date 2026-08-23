/**
 * ReportViewerTemplate - 报表查看/报表中心页面模板
 *
 * 面向报表类查看与中心页面（报表中心仪表盘、报表查看器、报表列表等），
 * 封装 PageContainer 的报表专用配置，统一加载/错误状态展示，
 * 支持两种使用模式：
 * - 'center'：报表中心仪表盘模式（统计头 + 选项卡 + 搜索过滤栏 + 内容区）
 * - 'viewer'：报表查看器模式（操作工具栏 + 参数过滤区 + 渲染内容区 + 底部分页）
 * - 也提供 children 透传模式，当页面结构特殊时仅用外壳 PageContainer。
 *
 * 全部使用 designTokens，不硬编码 px/rem。
 */
import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Button,
} from '@mui/material';
import { designTokens } from '@topems/tokens';
import { PageContainer } from '@/components/common';

export type ReportViewerMode = 'center' | 'viewer';

export interface ReportViewerTemplateProps {
  /** 页面标题 */
  title?: string;
  /** 页面副标题 */
  subtitle?: string;
  /**
   * 布局模式：
   * - 'center'：报表中心仪表盘（统计头 + tabs + 搜索过滤 + 内容列表）
   * - 'viewer'：报表查看器（操作工具栏 + 参数过滤器 + 渲染区 + 分页）
   */
  mode?: ReportViewerMode;
  /** 统计头插槽（center 模式）：统计卡片/指标展示 */
  statsHeader?: React.ReactNode;
  /** 选项卡插槽（center 模式）：Tabs 切换 */
  tabs?: React.ReactNode;
  /** 操作工具栏插槽（viewer 模式）：标题 + 返回/下载/打印/分享按钮 */
  toolbar?: React.ReactNode;
  /** 搜索/过滤栏插槽（两种模式均支持，center 模式通常在 tabs 之后） */
  filterBar?: React.ReactNode;
  /** 主内容区插槽：列表 / 数据表格 / 报表渲染结果 */
  content?: React.ReactNode;
  /** 底部分页/状态栏插槽（viewer 模式常用） */
  pagination?: React.ReactNode;
  /** 是否加载中 */
  loading?: boolean;
  /** 加载状态下的提示文案 */
  loadingText?: string;
  /** 错误提示信息 */
  error?: string | null;
  /** 错误时的重试按钮（viewer/center 返回或重试） */
  errorAction?: React.ReactNode;
  /** children 透传模式：页面结构特殊时使用，仅保留外壳 + 加载错误统一处理 */
  children?: React.ReactNode;
  /** PageContainer 额外属性透传 */
  pageContainerProps?: Partial<Omit<React.ComponentProps<typeof PageContainer>, 'children'>>;
}

export const ReportViewerTemplate: React.FC<ReportViewerTemplateProps> = ({
  title,
  subtitle,
  mode = 'center',
  statsHeader,
  tabs,
  toolbar,
  filterBar,
  content,
  pagination,
  loading = false,
  loadingText,
  error = null,
  errorAction,
  children,
  pageContainerProps,
}) => {
  // 加载状态
  if (loading) {
    return (
      <PageContainer title={title} subtitle={subtitle} {...pageContainerProps}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            py: designTokens.spacing['3xl'],
            gap: designTokens.spacing.md,
          }}
        >
          <CircularProgress />
          {loadingText && (
            <Typography variant='body2' color='text.secondary'>
              {loadingText}
            </Typography>
          )}
        </Box>
      </PageContainer>
    );
  }

  // 错误状态
  if (error) {
    return (
      <PageContainer title={title} subtitle={subtitle} {...pageContainerProps}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            py: designTokens.spacing['3xl'],
            gap: designTokens.spacing.md,
            textAlign: 'center',
          }}
        >
          <Typography color='error' variant='body1'>
            {error}
          </Typography>
          {errorAction || (
            <Button variant='outlined' size='small'>
              ←
            </Button>
          )}
        </Box>
      </PageContainer>
    );
  }

  // children 透传模式
  if (children) {
    return (
      <PageContainer title={title} subtitle={subtitle} {...pageContainerProps}>
        {children}
      </PageContainer>
    );
  }

  // 结构化模式（center 或 viewer）
  return (
    <PageContainer title={title} subtitle={subtitle} {...pageContainerProps}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: designTokens.spacing.lg,
        }}
      >
        {/* mode=viewer: 顶部操作工具栏（返回 + 标题 + 下载/打印） */}
        {mode === 'viewer' && toolbar && (
          <Box>{toolbar}</Box>
        )}

        {/* mode=center: 顶部统计卡片头 */}
        {mode === 'center' && statsHeader && (
          <Box>{statsHeader}</Box>
        )}

        {/* 搜索/过滤栏（center 模式通常位于 tabs 之前） */}
        {filterBar && (
          <Box>{filterBar}</Box>
        )}

        {/* Tabs 切换（center 模式常见） */}
        {tabs && (
          <Box>{tabs}</Box>
        )}

        {/* 主内容区 */}
        {content && (
          <Box>{content}</Box>
        )}

        {/* 分页 / 底部状态栏（viewer 模式常见） */}
        {mode === 'viewer' && pagination && (
          <Box>{pagination}</Box>
        )}
      </Box>
    </PageContainer>
  );
};

export default ReportViewerTemplate;
