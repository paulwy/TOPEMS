/**
 * DesignerTemplate - 设计器页面模板
 *
 * 面向画布/编辑器类页面（表单设计、页面设计、工作流设计、自动化设计等），
 * 封装 PageContainer 的设计器专用配置，统一加载/错误状态展示，
 * 支持标准模式（带 padding）和全屏画布模式（三栏布局）。
 *
 * 使用 designTokens 控制间距和尺寸，不硬编码 px/rem。
 */
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { designTokens } from '@topems/tokens';
import { PageContainer } from '@/components/common';

export type DesignerMode = 'standard' | 'fullscreen';

export interface DesignerTemplateProps {
  /** 页面标题 */
  title: string;
  /** 页面副标题 */
  subtitle?: string;
  /**
   * 布局模式：
   * - 'standard'：标准模式，带 padding，适合简单编辑器（如 JSON 编辑）
   * - 'fullscreen'：全屏模式，无 padding，flex 填满，适合画布类设计器
   */
  mode?: DesignerMode;
  /** 顶部工具栏/标题栏插槽（标题 + 操作按钮等） */
  toolbar?: React.ReactNode;
  /** 左侧面板插槽（节点库、组件列表等，仅 fullscreen 模式生效） */
  leftPanel?: React.ReactNode;
  /** 右侧面板插槽（属性面板、配置面板等，仅 fullscreen 模式生效） */
  rightPanel?: React.ReactNode;
  /** 左侧面板宽度（仅 fullscreen 模式生效，默认 240px） */
  leftPanelWidth?: number | string;
  /** 右侧面板宽度（仅 fullscreen 模式生效，默认 320px） */
  rightPanelWidth?: number | string;
  /** 是否加载中 */
  loading?: boolean;
  /** 错误提示信息 */
  error?: string | null;
  /** 主内容区（standard 模式为编辑区，fullscreen 模式为中间画布） */
  children: React.ReactNode;
  /** 整体高度（默认 auto for standard, calc(100vh - 140px) for fullscreen） */
  height?: string;
}

const DEFAULT_LEFT_PANEL_WIDTH = 240;
const DEFAULT_RIGHT_PANEL_WIDTH = 320;

export const DesignerTemplate: React.FC<DesignerTemplateProps> = ({
  title,
  subtitle,
  mode = 'standard',
  toolbar,
  leftPanel,
  rightPanel,
  leftPanelWidth = DEFAULT_LEFT_PANEL_WIDTH,
  rightPanelWidth = DEFAULT_RIGHT_PANEL_WIDTH,
  loading = false,
  error = null,
  children,
  height,
}) => {
  const isFullscreen = mode === 'fullscreen';
  const hasLeftPanel = isFullscreen && !!leftPanel;
  const hasRightPanel = isFullscreen && !!rightPanel;

  const defaultHeight = isFullscreen
    ? 'calc(100vh - 140px)'
    : 'auto';

  const contentHeight = height ?? defaultHeight;

  // 加载状态
  if (loading) {
    return (
      <PageContainer title={title} subtitle={subtitle}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: designTokens.spacing['3xl'],
          }}
        >
          <CircularProgress />
        </Box>
      </PageContainer>
    );
  }

  const content = (
    <>
      {/* 错误提示 */}
      {error && (
        <Typography
          color='error'
          variant='body2'
          sx={{ mb: designTokens.spacing.sm }}
        >
          {error}
        </Typography>
      )}

      {/* 顶部工具栏 */}
      {toolbar && (
        <Box sx={{ mb: isFullscreen ? 0 : designTokens.spacing.md }}>
          {toolbar}
        </Box>
      )}

      {/* 主体内容区 */}
      {isFullscreen ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'row',
            minHeight: 0,
            gap: designTokens.spacing.md,
          }}
        >
          {/* 左侧面板 */}
          {hasLeftPanel && (
            <Box
              sx={{
                width: leftPanelWidth,
                flexShrink: 0,
                overflow: 'auto',
                borderRight: '1px solid',
                borderColor: 'divider',
                pr: designTokens.spacing.md,
              }}
            >
              {leftPanel}
            </Box>
          )}

          {/* 中间画布/编辑区 */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {children}
          </Box>

          {/* 右侧面板 */}
          {hasRightPanel && (
            <Box
              sx={{
                width: rightPanelWidth,
                flexShrink: 0,
                overflow: 'auto',
                borderLeft: '1px solid',
                borderColor: 'divider',
                pl: designTokens.spacing.md,
              }}
            >
              {rightPanel}
            </Box>
          )}
        </Box>
      ) : (
        <Box>{children}</Box>
      )}
    </>
  );

  if (isFullscreen) {
    return (
      <PageContainer
        title={title}
        subtitle={subtitle}
        maxWidth={false}
        padding={false}
        autoTitle={false}
        autoBreadcrumbs={false}
        sx={{
          height: contentHeight,
          display: 'flex',
          flexDirection: 'column',
        }}
        contentSx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: designTokens.spacing.md,
          minHeight: 0,
        }}
      >
        {content}
      </PageContainer>
    );
  }

  return (
    <PageContainer title={title} subtitle={subtitle}>
      <Box sx={{ p: designTokens.spacing.md }}>{content}</Box>
    </PageContainer>
  );
};

export default DesignerTemplate;
