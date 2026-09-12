import React, { useCallback } from 'react';
import type { SxProps, Theme } from '@mui/material';
import { Box, Typography, Tooltip, Collapse, Badge } from '@mui/material';
import { ChevronRight } from 'lucide-react';
import { designTokens, semanticTokens } from '@topems/tokens';

export interface SidebarItemProps {
  /** 唯一标识 */
  id?: string;
  /** 显示标签 */
  label: React.ReactNode;
  /** 图标 */
  icon?: React.ReactNode;
  /** 是否激活 */
  active?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否折叠（仅显示图标） */
  collapsed?: boolean;
  /** 徽章内容 */
  badge?: number | string;
  /** 徽章颜色 */
  badgeColor?: 'default' | 'primary' | 'error' | 'warning' | 'success';
  /** 是否展开子菜单 */
  expanded?: boolean;
  /** 子菜单项 */
  children?: React.ReactNode;
  /** 点击回调 */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** 展开状态变化回调 */
  onExpand?: (expanded: boolean) => void;
  /** 自定义样式 */
  sx?: SxProps<Theme>;
  /** 附加类名 */
  className?: string;
  /** 层级缩进（像素） */
  depth?: number;
  /** ARIA 标签 */
  ariaLabel?: string;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  id,
  label,
  icon,
  active = false,
  disabled = false,
  collapsed = false,
  badge,
  badgeColor = 'primary',
  expanded = false,
  children,
  onClick,
  onExpand,
  sx,
  className = '',
  depth = 0,
  ariaLabel,
}) => {
  const hasChildren = React.Children.count(children) > 0;

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (hasChildren) {
        onExpand?.(!expanded);
      }
      onClick?.(event);
    },
    [disabled, expanded, hasChildren, onClick, onExpand]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (hasChildren) {
          onExpand?.(!expanded);
        }
        onClick?.(event as unknown as React.MouseEvent<HTMLDivElement>);
      }
      if (hasChildren && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
        event.preventDefault();
        onExpand?.(event.key === 'ArrowRight');
      }
    },
    [disabled, expanded, hasChildren, onClick, onExpand]
  );

  const content = (
    <Box
      role={hasChildren ? 'button' : 'menuitem'}
      tabIndex={disabled ? -1 : 0}
      aria-current={active ? 'page' : undefined}
      aria-expanded={hasChildren ? expanded : undefined}
      aria-disabled={disabled}
      aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`interactive-item ${active ? 'active' : ''} ${className}`.trim()}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        px: 2,
        py: 1,
        ml: depth * 1.5,
        borderRadius: `${designTokens.borderRadius.md}px`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        color: active ? designTokens.colors.primary.main : designTokens.colors.text.secondary,
        backgroundColor: active
          ? designTokens.colors.action.selected
          : 'transparent',
        outline: 'none',
        transition: `color ${designTokens.motion.duration.fast} ${designTokens.motion.easing.default}, background-color ${designTokens.motion.duration.fast} ${designTokens.motion.easing.default}, padding-left ${designTokens.motion.duration.fast} ${designTokens.motion.easing.default}`,
        '&:hover': {
          backgroundColor: active
            ? designTokens.colors.action.selected
            : designTokens.colors.action.hover,
          color: active ? designTokens.colors.primary.main : designTokens.colors.text.primary,
        },
        '&:focus-visible': {
          boxShadow: `0 0 0 2px ${designTokens.colors.common.white}, 0 0 0 4px ${designTokens.colors.primary.light}`,
        },
        ...sx,
      }}
    >
      {/* 左侧激活指示条 */}
      {active && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: semanticTokens.sidebar.activeIndicator.width,
            height: 18,
            borderRadius: `0 ${semanticTokens.sidebar.activeIndicator.width}px ${semanticTokens.sidebar.activeIndicator.width}px 0`,
            bgcolor: semanticTokens.sidebar.activeIndicator.color,
          }}
        />
      )}

      {icon && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            color: active ? 'inherit' : designTokens.colors.text.muted,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      )}

      {!collapsed && (
        <>
          <Typography
            variant="body2"
            sx={{
              flex: 1,
              minWidth: 0,
              fontWeight: active
                ? designTokens.typography.fontWeight.semibold
                : designTokens.typography.fontWeight.medium,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {label}
          </Typography>

          {badge !== undefined && (
            <Badge
              badgeContent={badge}
              color={badgeColor}
              sx={{
                '& .MuiBadge-badge': {
                  position: 'relative',
                  transform: 'none',
                  minWidth: 18,
                  height: 18,
                  fontSize: designTokens.typography.fontSize.xs,
                  fontWeight: designTokens.typography.fontWeight.semibold,
                },
              }}
            />
          )}

          {hasChildren && (
            <ChevronRight
              size={16}
              style={{
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: `transform ${designTokens.motion.duration.fast} ${designTokens.motion.easing.default}`,
                flexShrink: 0,
              }}
            />
          )}
        </>
      )}
    </Box>
  );

  return (
    <Box role="none">
      {collapsed && icon ? (
        <Tooltip title={label} placement="right" arrow>
          {content}
        </Tooltip>
      ) : (
        content
      )}

      {hasChildren && !collapsed && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box role="menu" sx={{ mt: 0.5 }}>
            {children}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

export default SidebarItem;
