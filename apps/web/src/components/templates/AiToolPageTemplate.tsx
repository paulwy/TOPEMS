/**
 * AiToolPageTemplate - AI 工具页面模板
 *
 * 面向 AI 工具类页面（代码助手、文档分析、知识库问答等），封装
 * 「左侧配置/列表 + 右侧内容区（可选 Tabs）」的标准双栏布局外壳，
 * 消除各 AI 工具页面重复的 Grid + Paper 胶水代码，并提供统一的
 * loading / error 状态展示。
 *
 * 典型使用场景：
 * - `pages/ai/AiCodeAssistantPage` — AI 代码助手（children 模式，保留 Paper[Tabs+Grid] 结构）
 * - `pages/ai/AiDocumentAnalysisPage` — 文档智能分析（结构化模式：leftPanel + rightPanel + tabs）
 * - `pages/ai/AiKnowledgeBasePage` — 知识库问答（结构化模式：leftPanel + rightPanel）
 *
 * 两种使用模式：
 * 1. 结构化模式（默认）：传入 `leftPanel` / `rightPanel` / `tabs` 插槽，
 *    模板自动渲染 Grid 双栏 + Paper 包裹 + Tabs 顶部条 + loading/error 状态。
 * 2. children 透传模式：当页面结构差异较大时（如双栏在 Paper 内部），
 *    传入 `children`，模板仅提供 PageContainer 外壳 + 内边距容器。
 *
 * 使用 designTokens 控制间距/圆角，无硬编码 px/rem。
 */
import React from 'react';
import { Box, Paper, CircularProgress, Typography } from '@mui/material';
import { designTokens } from '@topems/tokens';
import { PageContainer, Grid } from '@/components/common';

export interface AiToolPageTemplateProps {
  /** 页面标题（透传到 PageContainer.title） */
  title?: string;
  /** 页面描述（透传到 PageContainer.subtitle） */
  description?: string;
  /** 左侧面板插槽（配置/列表区，结构化模式） */
  leftPanel?: React.ReactNode;
  /** 右侧面板插槽（内容/结果区，结构化模式） */
  rightPanel?: React.ReactNode;
  /** 多 Tab 切换插槽（渲染在右侧 Paper 顶部，结构化模式） */
  tabs?: React.ReactNode;
  /** 左侧面板列宽（1-11，默认 3），右侧自动占满剩余 */
  leftPanelWidth?: number;
  /** 左侧面板响应式断点，默认 'md' */
  leftPanelBreakpoint?: 'md' | 'lg';
  /** 加载状态（覆盖 rightPanel 区域，统一 CircularProgress + Typography） */
  loading?: boolean;
  /** 加载提示文案（loading=true 时显示） */
  loadingText?: string;
  /** 错误状态（覆盖 rightPanel 区域，统一 Typography 提示） */
  error?: React.ReactNode;
  /** 备用：整体自定义内容（当双栏模式不适用时使用，模板仅提供 PageContainer 外壳） */
  children?: React.ReactNode;
  /** 透传到 PageContainer 的额外配置（autoTitle/autoBreadcrumbs/padding/maxWidth/headerProps 等） */
  pageContainerProps?: Omit<
    React.ComponentProps<typeof PageContainer>,
    'title' | 'subtitle' | 'children'
  >;
}

/**
 * 默认左侧面板列宽。
 * 12 列 Grid 中左侧占 3 列、右侧占 9 列，是 AI 工具页常用的比例
 * （左侧窄列放配置/列表，右侧宽列放内容/结果）。
 */
const DEFAULT_LEFT_PANEL_WIDTH = 3;

export const AiToolPageTemplate: React.FC<AiToolPageTemplateProps> = ({
  title,
  description,
  leftPanel,
  rightPanel,
  tabs,
  leftPanelWidth = DEFAULT_LEFT_PANEL_WIDTH,
  leftPanelBreakpoint = 'md',
  loading = false,
  loadingText,
  error,
  children,
  pageContainerProps,
}) => {
  // children 透传模式：仅提供 PageContainer 外壳 + 内边距容器，由使用方自行管理布局
  if (children) {
    return (
      <PageContainer
        title={title}
        subtitle={description}
        padding={false}
        maxWidth={false}
        {...pageContainerProps}
      >
        <Box sx={{ p: designTokens.spacing.lg }}>{children}</Box>
      </PageContainer>
    );
  }

  // 结构化模式：左 Panel + 右 Paper[Tabs + 内容]
  const hasLeftPanel = Boolean(leftPanel);
  const rightColWidth = hasLeftPanel ? 12 - leftPanelWidth : 12;
  const leftGridProps =
    leftPanelBreakpoint === 'lg'
      ? { xs: 12, lg: leftPanelWidth }
      : { xs: 12, md: leftPanelWidth };
  const rightGridProps =
    leftPanelBreakpoint === 'lg'
      ? { xs: 12, lg: rightColWidth }
      : { xs: 12, md: rightColWidth };

  return (
    <PageContainer
      title={title}
      subtitle={description}
      padding={false}
      maxWidth={false}
      {...pageContainerProps}
    >
      <Box sx={{ p: designTokens.spacing.lg }}>
        <Grid container spacing={3}>
          {hasLeftPanel && (
            <Grid item {...leftGridProps}>
              {leftPanel}
            </Grid>
          )}
          <Grid item {...rightGridProps}>
            <Paper
              sx={{
                borderRadius: designTokens.borderRadius.lg,
                overflow: 'hidden',
              }}
            >
              {tabs && (
                <Box
                  sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    px: designTokens.spacing.md,
                  }}
                >
                  {tabs}
                </Box>
              )}
              {loading ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: designTokens.spacing['3xl'],
                  }}
                >
                  <CircularProgress sx={{ mb: designTokens.spacing.md }} />
                  {loadingText && (
                    <Typography variant="body1" color="text.secondary">
                      {loadingText}
                    </Typography>
                  )}
                </Box>
              ) : error ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: designTokens.spacing['3xl'],
                  }}
                >
                  <Typography
                    variant="body1"
                    color="error.main"
                    sx={{ fontWeight: 500 }}
                  >
                    {error}
                  </Typography>
                </Box>
              ) : (
                rightPanel
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default AiToolPageTemplate;
