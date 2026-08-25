/**
 * AuthPageTemplate - 认证/错误页模板
 *
 * 面向 `apps/web/src/pages/shared/*` 的认证与错误页面，封装全屏背景 +
 * 居中内容容器的标准外壳，消除登录、忘记密码、404、错误页等页面的
 * 重复布局胶水代码。
 *
 * 与其他模板的差异：
 * - 无导航栏、无 PageContainer，纯背景 + 居中内容
 * - 支持自定义背景渐变/纯色
 * - 内容区最大宽度可配置
 *
 * 使用 designTokens 控制间距，不硬编码 px/rem。
 */
import React from 'react';
import { Box } from '@mui/material';
import { designTokens } from '@topems/tokens';

export interface AuthPageTemplateProps {
  /** 页面主体内容（通常是一个 Card 或 Box） */
  children: React.ReactNode;
  /**
   * 背景渐变或纯色；默认使用紫粉渐变（与 LoginPage 保持一致）。
   * 传入纯色值（如 'grey.100'）可实现纯色背景。
   */
  backgroundGradient?: string;
  /** 内容区最大宽度；默认 420px */
  maxWidth?: number | string;
  /** 是否垂直水平居中内容；默认 true */
  centerContent?: boolean;
}

/**
 * 默认背景渐变：紫粉渐变（参考 LoginPage）。
 * 使用 designTokens 颜色值构建，避免硬编码色值。
 */
const DEFAULT_BACKGROUND_GRADIENT = `linear-gradient(135deg, ${designTokens.colors.secondary[400]} 0%, ${designTokens.colors.secondary.dark} 50%, ${designTokens.colors.pink[300]} 100%)`;

/** 默认内容区最大宽度 */
const DEFAULT_MAX_WIDTH = 420;

export const AuthPageTemplate: React.FC<AuthPageTemplateProps> = ({
  children,
  backgroundGradient = DEFAULT_BACKGROUND_GRADIENT,
  maxWidth = DEFAULT_MAX_WIDTH,
  centerContent = true,
}) => {
  return (
    <Box
      className='auth-page-template'
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: centerContent ? 'center' : 'stretch',
        justifyContent: centerContent ? 'center' : 'flex-start',
        position: 'relative',
        overflow: 'hidden',
        background: backgroundGradient,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth,
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: centerContent ? 'center' : 'stretch',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default AuthPageTemplate;
