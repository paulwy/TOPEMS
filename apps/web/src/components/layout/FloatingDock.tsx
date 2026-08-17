/**
 * FloatingDock — 统一浮动按钮栈
 *
 * 取代多个 position:fixed 元素互相压盖的旧实现：
 * - AI Copilot FAB（56×56）
 * - Context Help FAB（48×48）
 *
 * 仅桌面端（md+）显示；移动端走 BottomTabBar + Command Palette
 *
 * 纵向堆叠布局（从上到下）：
 *   ┌──────────────┐
 *   │ AI Copilot   │  bottom: 24 + 56 + 16 = 96
 *   ├──────────────┤
 *   │ Context Help │  bottom: 24
 *   └──────────────┘
 *
 * PerformanceMonitor 不在此处渲染（仅 dev 模式独立显示于左下角）
 */

import React from 'react';
import { Stack } from '@mui/material';
import { FloatingAIHelper } from '../ai/FloatingAIHelper';
import { ContextHelpButton } from '../ContextHelpButton';

export interface FloatingDockProps {
  /** 是否显示 ContextHelp（默认 true） */
  showHelp?: boolean;
  /** 是否显示 AICopilot（默认 true） */
  showAI?: boolean;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({ showHelp = true, showAI = true }) => {
  if (!showAI && !showHelp) return null;

  return (
    <Stack
      direction='column'
      spacing={1.5}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: (theme) => theme.zIndex.snackbar + 1,
        display: { xs: 'none', md: 'flex' },
        alignItems: 'center',
        pointerEvents: 'none',
        '& > *': {
          pointerEvents: 'auto',
        },
      }}
    >
      {showAI && <FloatingAIHelper />}
      {showHelp && (
        <ContextHelpButton
          embedded
          showOnMobile={false}
        />
      )}
    </Stack>
  );
};

export default FloatingDock;
