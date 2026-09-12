import React, { useCallback } from 'react';
import type { SxProps, Theme } from '@mui/material';
import { Paper, Box, Typography, Stack, Chip } from '@mui/material';
import { Check } from 'lucide-react';
import { designTokens, semanticTokens } from '@topems/tokens';

export type InteractiveCardVariant = 'default' | 'outlined' | 'elevated';
export type InteractiveCardSize = 'sm' | 'md' | 'lg';

export interface InteractiveCardProps {
  /** 唯一标识 */
  id?: string;
  /** 卡片标题 */
  title?: React.ReactNode;
  /** 卡片描述 */
  description?: React.ReactNode;
  /** 左侧图标组件 */
  icon?: React.ReactNode;
  /** 图标背景色 */
  iconBgColor?: string;
  /** 图标颜色 */
  iconColor?: string;
  /** 右上角徽章 */
  badge?: string | number;
  /** 徽章颜色 */
  badgeColor?: 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'success';
  /** 是否选中 */
  selected?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 点击回调 */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** 选中状态变化回调 */
  onSelect?: (selected: boolean, id?: string) => void;
  /** 卡片尺寸 */
  size?: InteractiveCardSize;
  /** 视觉变体 */
  variant?: InteractiveCardVariant;
  /** 自定义内容 */
  children?: React.ReactNode;
  /** 自定义样式 */
  sx?: SxProps<Theme>;
  /** 附加类名 */
  className?: string;
  /** ARIA 标签 */
  ariaLabel?: string;
}

const sizeConfig: Record<InteractiveCardSize, { padding: string; gap: number; iconSize: number }> = {
  sm: { padding: semanticTokens.space.card.paddingDense, gap: 1, iconSize: 32 },
  md: { padding: semanticTokens.space.card.padding, gap: 1.5, iconSize: 40 },
  lg: { padding: semanticTokens.space.card.padding, gap: 2, iconSize: 48 },
};

const variantStyles: Record<InteractiveCardVariant, object> = {
  default: {
    border: `1px solid ${designTokens.colors.border.default}`,
    backgroundColor: designTokens.colors.background.paper,
  },
  outlined: {
    border: `1px solid ${designTokens.colors.border.default}`,
    backgroundColor: 'transparent',
  },
  elevated: {
    border: 'none',
    backgroundColor: designTokens.colors.background.paper,
    boxShadow: semanticTokens.elevation.card,
  },
};

export const InteractiveCard: React.FC<InteractiveCardProps> = ({
  id,
  title,
  description,
  icon,
  iconBgColor = designTokens.colors.action.hover,
  iconColor = designTokens.colors.primary.main,
  badge,
  badgeColor = 'default',
  selected = false,
  disabled = false,
  onClick,
  onSelect,
  size = 'md',
  variant = 'default',
  children,
  sx,
  className = '',
  ariaLabel,
}) => {
  const config = sizeConfig[size];

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (onSelect) {
        onSelect(!selected, id);
      }
      onClick?.(event);
    },
    [disabled, id, onClick, onSelect, selected]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (onSelect) {
          onSelect(!selected, id);
        }
        // 模拟点击事件
        onClick?.(event as unknown as React.MouseEvent<HTMLDivElement>);
      }
    },
    [disabled, id, onClick, onSelect, selected]
  );

  return (
    <Paper
      elevation={0}
      role={onSelect || onClick ? 'button' : undefined}
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      aria-disabled={disabled}
      aria-label={ariaLabel || (typeof title === 'string' ? title : undefined)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`interactive-card ${selected ? 'selected selected-glow' : ''} ${className}`.trim()}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: `${designTokens.borderRadius.lg}px`,
        padding: config.padding,
        cursor: disabled ? 'not-allowed' : onClick || onSelect ? 'pointer' : 'default',
        opacity: disabled ? 0.55 : 1,
        outline: 'none',
        ...variantStyles[variant],
        ...(selected && {
          borderColor: designTokens.colors.primary.main,
          backgroundColor: designTokens.colors.action.selected,
        }),
        '&:focus-visible': {
          boxShadow: `0 0 0 2px ${designTokens.colors.common.white}, 0 0 0 4px ${designTokens.colors.primary.light}`,
        },
        ...sx,
      }}
    >
      {/* 选中勾选标记 */}
      {(onSelect || selected) && (
        <Box
          className="check-badge"
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 20,
            height: 20,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: designTokens.colors.primary.main,
            color: designTokens.colors.primary.contrastText,
          }}
        >
          <Check size={14} />
        </Box>
      )}

      <Stack
        direction="row"
        spacing={config.gap}
        sx={{ alignItems: 'flex-start' }}
      >
        {icon && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: config.iconSize,
              height: config.iconSize,
              borderRadius: `${designTokens.borderRadius.md}px`,
              bgcolor: iconBgColor,
              color: iconColor,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        )}

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            {title && (
              <Typography
                variant={size === 'sm' ? 'body2' : 'subtitle1'}
                sx={{
                  fontWeight: designTokens.typography.fontWeight.semibold,
                  color: designTokens.colors.text.primary,
                }}
              >
                {title}
              </Typography>
            )}
            {badge !== undefined && (
              <Chip
                label={badge}
                size="small"
                color={badgeColor}
                sx={{
                  height: 20,
                  fontSize: designTokens.typography.fontSize.xs,
                  fontWeight: designTokens.typography.fontWeight.semibold,
                }}
              />
            )}
          </Stack>

          {description && (
            <Typography
              variant="body2"
              sx={{
                mt: 0.5,
                color: designTokens.colors.text.secondary,
                lineHeight: designTokens.typography.lineHeight.relaxed,
              }}
            >
              {description}
            </Typography>
          )}

          {children}
        </Box>
      </Stack>
    </Paper>
  );
};

export default InteractiveCard;
