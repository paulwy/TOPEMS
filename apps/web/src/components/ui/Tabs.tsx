import React, { useCallback } from 'react';
import { Box, type BoxProps } from '@mui/material';
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { designTokens } from '@topems/tokens';

export interface TabItem {
  /** 稳定唯一 key，用于 value / onChange */
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** 徽标（如未读数），显示在 label 右侧 */
  badge?: React.ReactNode;
}

export interface TabGroupProps extends Omit<BoxProps, 'onChange'> {
  items: TabItem[];
  /** 当前选中 key */
  value: string;
  /** 选中变化回调 */
  onChange: (key: string) => void;
  /** 横向滚动（模块过多时），默认 true */
  scrollable?: boolean;
  /** 前缀节点（如首页图标） */
  startAdornment?: React.ReactNode;
  /** 后缀节点（如更多菜单按钮） */
  endAdornment?: React.ReactNode;
  /** 无障碍标签 */
  label?: string;
  /** 单个 Tab 的 sx */
  tabSx?: SxProps<Theme>;
  sx?: SxProps<Theme>;
}

/**
 * Design demo `interactive-tab` 的 React 实现（滑动下划线 Tab 组）
 *
 * - 下划线：`::after` 绝对定位 2px 品牌渐变条
 *   - hover：从中心展开 50%（悬停预览）
 *   - active：`tabUnderlineSlide` 动画从左滑入 100%
 * - 选中态：品牌色文字 + 5% 品牌色底
 * - 无障碍：`role=tablist` / `role=tab` / `aria-selected`（WCAG 4.1.2）
 */
export const TabGroup: React.FC<TabGroupProps> = ({
  items,
  value,
  onChange,
  scrollable = true,
  startAdornment,
  endAdornment,
  label = 'tabs',
  tabSx,
  sx,
  ...rest
}) => {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const transition = designTokens.motion.transition;

  const handleSelect = useCallback(
    (key: string) => {
      if (key === value) return;
      onChange(key);
    },
    [onChange, value]
  );

  // 合并调用方 sx（对象 / 函数 / 数组），返回函数式 sx
  const mergedSx: SxProps<Theme> = (theme) => {
    const styles = {
      display: 'flex',
      alignItems: 'center',
      gap: 0.5,
      minHeight: 40,
      ...(scrollable && {
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
      }),
    };
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
      role='tablist'
      aria-label={label}
      sx={mergedSx}
    >
      {startAdornment}
      {items.map((item) => {
        const active = item.key === value;
        // 单个 Tab 的 sx：对象 / 函数 / 数组均合并进函数式 sx
        const mergedTabSx: SxProps<Theme> = (tabTheme) => {
          const styles = {
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            height: 36,
            px: 1.5,
            border: 'none',
            borderRadius: 1,
            cursor: item.disabled ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.875rem',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            color: active ? 'primary.main' : 'text.secondary',
            background: active ? alpha(primary, 0.05) : 'transparent',
            opacity: item.disabled ? 0.45 : 1,
            pointerEvents: item.disabled ? 'none' : 'auto',
            transition: `color ${transition.fast}, background-color ${transition.fast}`,
            '&:hover': {
              backgroundColor: item.disabled
                ? 'transparent'
                : alpha(tabTheme.palette.text.primary, 0.05),
              color: item.disabled ? 'text.secondary' : 'text.primary',
            },
            // 滑动下划线伪元素（design demo `interactive-tab::after`）
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: 2,
              borderRadius: '2px 2px 0 0',
              background: `linear-gradient(90deg, ${alpha(primary, 0.55)}, ${alpha(primary, 0.9)})`,
              boxShadow: `0 -2px 8px ${alpha(primary, 0.3)}`,
              transform: active ? 'scaleX(1)' : 'scaleX(0)',
              transformOrigin: active ? 'left' : 'center',
              opacity: active ? 1 : 0,
              animation: active ? `tabUnderlineSlide ${transition.slow}` : 'none',
              transition: `transform ${transition.slow}, opacity ${transition.fast}`,
            },
            '&:hover::after': {
              transform: active ? 'scaleX(1)' : 'scaleX(0.5)',
              opacity: active ? 1 : 0.5,
            },
            '&:active': {
              transform: 'translateY(0) scale(0.99)',
            },
          };
          const extra = typeof tabSx === 'function' ? tabSx(tabTheme) : tabSx;
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
            key={item.key}
            component='button'
            type='button'
            role='tab'
            aria-selected={active}
            aria-disabled={item.disabled || undefined}
            disabled={item.disabled}
            onClick={() => handleSelect(item.key)}
            className='focus-ring'
            sx={mergedTabSx}
          >
            {item.icon && <span className='icon-hover'>{item.icon}</span>}
            <span>{item.label}</span>
            {item.badge}
          </Box>
        );
      })}
      {endAdornment}
    </Box>
  );
};

export default TabGroup;
