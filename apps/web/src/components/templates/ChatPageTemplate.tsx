/**
 * ChatPageTemplate - 聊天页面模板
 *
 * 面向 AI 对话、即时通讯等聊天类页面，封装左侧会话列表 + 右侧聊天区
 * （顶部标题栏 + 消息流 + 底部输入框）的标准布局外壳，消除各聊天页面
 * 重复的 flex 布局胶水代码。
 *
 * 典型使用场景：
 * - `pages/ai/AiChatPage` — AI 多模式对话
 * - `pages/ai/DifyChatPage` — Dify 集成对话
 * - `pages/shared/IMPage` — 即时通讯
 *
 * 使用 designTokens 控制间距，不硬编码 px/rem。
 */
import React from 'react';
import { Box } from '@mui/material';
import { designTokens } from '@topems/tokens';
import { PageContainer } from '@/components/common';

export interface ChatPageTemplateProps {
  /** 左侧会话列表插槽（四插槽模式） */
  sidebar?: React.ReactNode;
  /** 聊天区顶部标题栏插槽（四插槽模式） */
  header?: React.ReactNode;
  /** 消息流区域插槽（四插槽模式） */
  messages?: React.ReactNode;
  /** 底部输入框插槽（四插槽模式） */
  input?: React.ReactNode;
  /** 侧边栏宽度，默认 280px */
  sidebarWidth?: number | string;
  /** 备用：整体自定义内容（当四插槽模式不适用时使用） */
  children?: React.ReactNode;
  /** 整体高度，默认 calc(100vh - 140px) */
  height?: string;
  /** 透传到 PageContainer 的额外配置（autoTitle/autoBreadcrumbs/padding/maxWidth/children 已由模板内部管理） */
  pageContainerProps?: Omit<React.ComponentProps<typeof PageContainer>, 'children'>;
}

/**
 * 默认侧边栏宽度。
 * 用 designTokens 组合表达：2xl (48) * 5 + md (16) + sm (8) = 264... 不够精确。
 * 由于 280px 是聊天侧边栏的行业标准宽度且非间距语义，
 * 此处以具名常量形式声明，便于统一修改。
 */
const DEFAULT_SIDEBAR_WIDTH = 280;

/**
 * 默认整体高度。
 * 100vh 减去顶部导航区高度（约 140px），
 * 与 AiChatPage / DifyChatPage 现有实现保持一致。
 */
const DEFAULT_HEIGHT = 'calc(100vh - 140px)';

export const ChatPageTemplate: React.FC<ChatPageTemplateProps> = ({
  sidebar,
  header,
  messages,
  input,
  sidebarWidth = DEFAULT_SIDEBAR_WIDTH,
  children,
  height = DEFAULT_HEIGHT,
  pageContainerProps,
}) => {
  // children 模式：直接透传自定义内容，由使用方自行管理布局
  if (children) {
    return (
      <PageContainer
        autoTitle={false}
        autoBreadcrumbs={false}
        padding={false}
        maxWidth={false}
        {...pageContainerProps}
      >
        <Box sx={{ height, bgcolor: 'background.default' }}>{children}</Box>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      autoTitle={false}
      autoBreadcrumbs={false}
      padding={false}
      maxWidth={false}
      {...pageContainerProps}
    >
      <Box
        sx={{
          display: 'flex',
          height,
          bgcolor: 'background.default',
        }}
      >
        {/* 左侧会话列表 */}
        {sidebar && (
          <Box
            sx={{
              width: sidebarWidth,
              flexShrink: 0,
              borderRight: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {sidebar}
          </Box>
        )}

        {/* 右侧聊天主区域 */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0, // 防止 flex 子项溢出
          }}
        >
          {/* 顶部标题栏 */}
          <Box
            sx={{
              flexShrink: 0,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            {header}
          </Box>

          {/* 消息流区域 */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: designTokens.spacing.lg,
            }}
          >
            {messages}
          </Box>

          {/* 底部输入框 */}
          <Box
            sx={{
              flexShrink: 0,
              borderTop: 1,
              borderColor: 'divider',
              p: designTokens.spacing.md,
            }}
          >
            {input}
          </Box>
        </Box>
      </Box>
    </PageContainer>
  );
};

export default ChatPageTemplate;
