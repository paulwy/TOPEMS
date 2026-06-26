/**
 * 统一 ActionButton 组件
 * 封装 MUI Button，提供统一的样式和交互体验
 */
import React from 'react';
import { Button, ButtonProps, CircularProgress, Tooltip } from '@mui/material';

export type ActionButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'text';
export type ActionButtonSize = 'small' | 'medium' | 'large';

export interface ActionButtonProps {
  /** 按钮文字 */
  label: string;
  /** 点击回调 */
  onClick?: () => void;
  /** 按钮图标 */
  icon?: React.ReactNode;
  /** 图标位置 */
  iconPosition?: 'start' | 'end';
  /** 按钮类型 */
  variant?: ActionButtonVariant;
  /** 按钮尺寸 */
  size?: ActionButtonSize;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 是否全宽 */
  fullWidth?: boolean;
  /** 工具提示 */
  tooltip?: string;
  /** 自定义样式 */
  sx?: ButtonProps['sx'];
  /** 原生 type 属性 */
  type?: 'button' | 'submit' | 'reset';
}

/**
 * 按钮变体到 MUI 变体的映射
 */
const variantMap: Record<ActionButtonVariant, ButtonProps['variant']> = {
  primary: 'contained',
  secondary: 'outlined',
  success: 'contained',
  warning: 'contained',
  danger: 'contained',
  text: 'text',
};

/**
 * 按钮变体到颜色的映射
 */
const colorMap: Record<ActionButtonVariant, ButtonProps['color']> = {
  primary: 'primary',
  secondary: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'error',
  text: 'primary',
};

export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onClick,
  icon,
  iconPosition = 'start',
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  tooltip,
  sx,
  type = 'button',
}) => {
  const button = (
    <Button
      type={type}
      variant={variantMap[variant]}
      color={colorMap[variant]}
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      startIcon={loading ? undefined : iconPosition === 'start' ? icon : undefined}
      endIcon={loading ? undefined : iconPosition === 'end' ? icon : undefined}
      sx={{
        whiteSpace: 'nowrap',
        textTransform: 'none',
        ...sx,
      }}
    >
      {loading ? (
        <CircularProgress
          size={16}
          color='inherit'
        />
      ) : (
        label
      )}
    </Button>
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip}>
        {button}
      </Tooltip>
    );
  }

  return button;
};

export default ActionButton;
