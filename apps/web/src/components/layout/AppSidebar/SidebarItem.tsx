import React, { useCallback } from 'react';
import { Box } from '@mui/material';
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { designTokens } from '@topems/tokens';

export interface SidebarItemProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onClick' | 'onKeyDown' | 'sx'
> {
  /** 选中态：品牌色文字 + 10% 品牌色底 + 左侧指示条滑入 */
  active?: boolean;
  /** 折叠态：居中显示图标，隐藏文字 */
  collapsed?: boolean;
  icon?: React.ReactNode;
  label?: React.ReactNode;
  /** 徽标（未读数等） */
  badge?: React.ReactNode;
  /** aria-current 值 */
  ariaCurrent?: 'page' | undefined;
  /** ARIA role（默认不设置，使用原生 button 语义；仅在确实位于 menu/menubar 容器内时传入 menuitem） */
  role?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  sx?: SxProps<Theme>;
}

/**
 * Design demo `interactive-item` 的 React 实现（侧边栏 / 列表项）
 *
 * - hover：`--brand-muted` 背景过渡
 * - active：品牌色文字 + 10% 品牌色底
 * - 选中指示条：`::before` 绝对定位 3px 竖向品牌渐变条，`scaleY` 滑入动画
 * - 焦点环：复用全局 `.focus-ring`（键盘可访问性）
 *
 * 与旧 `navItemSx` 的区别：指示条由 `borderLeft` 静态边框升级为
 * 可动画的伪元素（scaleY 滑入 + 品牌渐变 + 光晕），视觉更接近 design demo。
 */
export const SidebarItem: React.FC<SidebarItemProps> = ({
  active = false,
  collapsed = false,
  disabled = false,
  icon,
  label,
  badge,
  ariaCurrent,
  role,
  onClick,
  onKeyDown,
  children,
  sx,
  ...rest
}) => {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const transition = designTokens.motion.transition;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      onClick?.(e);
    },
    [disabled, onClick]
  );

  // 合并调用方 sx（对象 / 函数 / 数组），返回函数式 sx
  const mergedSx: SxProps<Theme> = (itemTheme) => {
    const styles = {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: collapsed ? 'center' : 'flex-start',
      gap: 1.5,
      width: '100%',
      px: collapsed ? 0 : 1.5,
      py: 1.25,
      borderRadius: 1,
      border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      background: 'transparent',
      backgroundColor: active ? alpha(primary, 0.1) : 'transparent',
      color: active ? 'primary.main' : 'text.secondary',
      fontFamily: 'inherit',
      fontSize: '0.875rem',
      fontWeight: active ? 600 : 500,
      textAlign: 'left',
      opacity: disabled ? 0.45 : 1,
      pointerEvents: disabled ? 'none' : 'auto',
      transition: `color ${transition.fast}, background-color ${transition.fast}, padding-left ${transition.fast}`,
      // 左侧选中指示条（可动画伪元素，design demo `interactive-item` 升级）
      '&::before': {
        content: '""',
        position: 'absolute',
        left: 0,
        top: '50%',
        transform: active ? 'translateY(-50%) scaleY(1)' : 'translateY(-50%) scaleY(0)',
        width: 3,
        height: '60%',
        borderRadius: '0 2px 2px 0',
        background: `linear-gradient(180deg, ${alpha(primary, 0.6)}, ${alpha(primary, 0.95)})`,
        boxShadow: `0 0 8px ${alpha(primary, 0.35)}`,
        opacity: active ? 1 : 0,
        transition: `transform ${transition.slow}, opacity ${transition.fast}`,
        pointerEvents: 'none',
      },
      '&:hover': {
        backgroundColor: active ? alpha(primary, 0.1) : alpha(itemTheme.palette.text.primary, 0.05),
        color: active ? 'primary.main' : 'text.primary',
      },
      '&:active': {
        transform: 'translateY(0) scale(0.99)',
      },
    };
    const extra = typeof sx === 'function' ? sx(itemTheme) : sx;
    const out = { ...styles };
    if (Array.isArray(extra)) {
      extra.forEach((entry) => {
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
          Object.assign(out, entry);
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
      component='button'
      type='button'
      role={role}
      tabIndex={0}
      disabled={disabled}
      aria-current={ariaCurrent}
      aria-disabled={disabled || undefined}
      className='focus-ring'
      onClick={handleClick}
      onKeyDown={onKeyDown}
      sx={mergedSx}
    >
      <Box
        component='span'
        className='icon-hover'
        sx={{ flexShrink: 0 }}
      >
        {icon}
      </Box>
      {!collapsed && (
        <>
          {label}
          {badge}
        </>
      )}
      {children}
    </Box>
  );
};

export default SidebarItem;
