import React, { useCallback } from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBackNavigation } from '@/hooks';

export interface BackButtonProps {
  /** 智能返回的 fallback 路径 */
  fallback?: string;
  /** 自定义 onClick 处理器 */
  onClick?: () => void;
  /** 强制跳转的固定路径（优先级最高） */
  href?: string;
  /** 显示文本 */
  label?: string;
  /** 变体：button 带文字 vs icon only */
  variant?: 'icon' | 'text' | 'outlined';
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 颜色 */
  color?: 'inherit' | 'primary' | 'secondary' | 'default';
  /** 自定义样式 */
  sx?: SxProps<Theme>;
  /** tooltip */
  tooltip?: string;
}

const muiSizeMap = { sm: 'small' as const, md: 'medium' as const, lg: 'large' as const };

/**
 * 统一返回按钮组件
 * - 智能返回：优先使用来源页 → fallback → 浏览器后退
 * - 三种样式：图标、文字按钮、边框按钮
 */
const BackButton: React.FC<BackButtonProps> = ({
  fallback,
  onClick,
  href,
  label = '返回',
  variant = 'icon',
  size = 'md',
  color = 'inherit',
  sx,
  tooltip,
}) => {
  const navigate = useNavigate();
  const { goBack, hasFrom } = useBackNavigation();

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
      return;
    }
    if (href) {
      navigate(href);
      return;
    }
    goBack(fallback);
  }, [onClick, href, navigate, goBack, fallback]);

  if (variant === 'icon') {
    return (
      <Tooltip
        title={tooltip || (hasFrom ? '返回来源页' : label)}
        arrow
      >
        <IconButton
          onClick={handleClick}
          size={muiSizeMap[size]}
          color={color}
          sx={sx}
          aria-label='返回'
        >
          <ArrowLeft size={size === 'sm' ? 18 : 22} />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Button
      variant={variant === 'outlined' ? 'outlined' : 'text'}
      onClick={handleClick}
      size={muiSizeMap[size]}
      color={color === 'default' ? 'inherit' : color}
      startIcon={<ArrowLeft size={size === 'sm' ? 16 : 18} />}
      sx={sx}
    >
      {label}
    </Button>
  );
};

export default BackButton;
export { BackButton };
