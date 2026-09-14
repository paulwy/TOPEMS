import React from 'react';
import { Box, type BoxProps } from '@mui/material';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import { designTokens } from '@topems/tokens';

export interface InteractiveCardProps extends Omit<BoxProps, 'sx'> {
  /** 选中态：品牌色外发光 + 1px 边框（design demo `.selected-glow`） */
  selected?: boolean;
  /** 顶部光晕：hover 时卡片顶部显现径向品牌色光晕（design demo `.glow-card`） */
  glow?: boolean;
  /** 禁用态：降透明度并阻断交互 */
  disabled?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Design demo `interactive-card` 的 React 实现
 *
 * - hover：上浮 2px + 中阴影（`--brand-shadow-md`）
 * - active：按压回弹 `translateY(0) scale(0.99)`
 * - selected：品牌色外发光（浅色/暗色自适应由主题 token 驱动）
 * - glow：顶部径向光晕，hover 时淡入（`glow-card::before` 迁移）
 *
 * 过渡优先使用 CSS transform/box-shadow，避免布局抖动（性能原则）。
 */
export const InteractiveCard: React.FC<InteractiveCardProps> = ({
  selected = false,
  glow = false,
  disabled = false,
  children,
  sx,
  ...rest
}) => {
  const transition = designTokens.motion.transition;

  const mergedSx: SxProps<Theme> = (theme) => {
    const styles = {
      position: 'relative',
      overflow: 'hidden',
      transition: `transform ${transition.base}, box-shadow ${transition.base}, border-color ${transition.base}`,
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: designTokens.shadows.md,
      },
      '&:active': {
        transform: 'translateY(0) scale(0.99)',
      },
      // 选中外发光（design demo `selected-glow`）
      boxShadow: selected
        ? `0 0 0 1px ${alpha('#4f78ed', 0.25)}, 0 0 20px ${alpha('#4f78ed', 0.15)}, ${designTokens.shadows.md}`
        : 'none',
      opacity: disabled ? 0.5 : 1,
      pointerEvents: disabled ? 'none' : 'auto',
      // 顶部光晕（design demo `glow-card::before`）
      '&::before': {
        content: glow ? '""' : 'none',
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(circle at 50% 0%, ${alpha('#4f78ed', 0.08)}, transparent 60%)`,
        opacity: 0,
        transition: `opacity ${transition.slow}`,
        pointerEvents: 'none',
        zIndex: 0,
      },
      '&:hover::before': {
        opacity: glow ? 1 : 0,
      },
      '& > *': {
        position: 'relative',
        zIndex: glow ? 1 : 0,
      },
    };

    // 合并调用方 sx（支持对象 / 函数 / 数组三种形式）
    const extra = typeof sx === 'function' ? sx(theme) : sx;
    const out = { ...styles };
    if (Array.isArray(extra)) {
      extra.forEach((item) => {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          Object.assign(out, item);
        }
      });
    } else if (extra && typeof extra === 'object') {
      Object.assign(out, extra);
    }
    return out;
  };

  return (
    <Box
      {...rest}
      sx={mergedSx}
    >
      {children}
    </Box>
  );
};

export default InteractiveCard;
