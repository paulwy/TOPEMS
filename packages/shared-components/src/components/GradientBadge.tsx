import React from 'react';
import type { SxProps, Theme } from '@mui/material';
import { Chip } from '@mui/material';
import { designTokens } from '@topems/tokens';

export interface GradientBadgeProps {
  /** 显示文本 */
  label: React.ReactNode;
  /** 尺寸 */
  size?: 'small' | 'medium';
  /** 自定义样式 */
  sx?: SxProps<Theme>;
  /** 附加类名 */
  className?: string;
}

export const GradientBadge: React.FC<GradientBadgeProps> = ({
  label,
  size = 'small',
  sx,
  className = '',
}) => {
  return (
    <Chip
      label={label}
      size={size}
      className={`gradient-badge ${className}`.trim()}
      sx={{
        height: size === 'small' ? 22 : 26,
        px: 1,
        borderRadius: `${designTokens.borderRadius.sm}px`,
        fontSize: size === 'small' ? designTokens.typography.fontSize.xs : designTokens.typography.fontSize.sm,
        fontWeight: designTokens.typography.fontWeight.semibold,
        color: designTokens.colors.primary[700],
        background: `linear-gradient(135deg, ${designTokens.colors.primary[50]}, color-mix(in srgb, ${designTokens.colors.primary[100]} 70%, transparent))`,
        border: `1px solid color-mix(in srgb, ${designTokens.colors.primary[200]} 60%, transparent)`,
        '.MuiChip-label': {
          px: 1,
        },
        ...sx,
      }}
    />
  );
};

export default GradientBadge;
