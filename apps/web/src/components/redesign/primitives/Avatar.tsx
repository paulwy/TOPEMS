import React, { useId } from 'react';
import clsx from 'clsx';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';
export type AvatarVariant = 'circular' | 'rounded' | 'square';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 头像图片地址 */
  src?: string;
  /** 用户名（用于生成首字母头像） */
  name?: string;
  /** 替代文本 */
  alt?: string;
  /** 尺寸 */
  size?: AvatarSize;
  /** 形状 */
  variant?: AvatarVariant;
  /** 背景色（覆盖默认） */
  bgColor?: string;
  /** 文字颜色 */
  textColor?: string;
  /** 在线状态 */
  status?: AvatarStatus;
  /** 状态指示器颜色（覆盖默认） */
  statusColor?: string;
  /** 角标数字或文字 */
  badge?: number | string;
  /** 角标颜色 */
  badgeColor?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  /** 是否可点击 */
  onClick?: () => void;
  /** 自定义内容 */
  children?: React.ReactNode;
}

const sizeMap: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
};

const fontSizeMap: Record<AvatarSize, string> = {
  xs: '10px',
  sm: '12px',
  md: '14px',
  lg: '20px',
  xl: '24px',
};

const statusSizeMap: Record<AvatarSize, number> = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
};

const statusColorMap: Record<AvatarStatus, string> = {
  online: 'var(--success-500)',
  offline: 'var(--text-tertiary)',
  busy: 'var(--error-500)',
  away: 'var(--warning-500)',
};

const badgeColorMap: Record<string, string> = {
  primary: 'var(--accent-primary)',
  success: 'var(--success-500)',
  warning: 'var(--warning-500)',
  error: 'var(--error-500)',
  info: 'var(--info-500)',
};

const variantRadiusMap: Record<AvatarVariant, string> = {
  circular: '50%',
  rounded: 'var(--radius-sm)',
  square: '0',
};

/** 从用户名生成首字母 */
const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

/** 根据用户名生成一致的背景色 */
const getColorFromName = (name: string): string => {
  const colors = [
    'var(--accent-primary)',
    'var(--success-500)',
    'var(--warning-500)',
    'var(--error-500)',
    'var(--info-500)',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      name,
      alt,
      size = 'md',
      variant = 'circular',
      bgColor,
      textColor = 'var(--text-inverse)',
      status,
      statusColor,
      badge,
      badgeColor = 'error',
      onClick,
      className,
      style,
      children,
      ...rest
    },
    ref
  ) => {
    const autoId = useId();
    const avatarId = rest.id || autoId;
    const dimension = sizeMap[size];
    const radius = variantRadiusMap[variant];
    const initials = name ? getInitials(name) : '?';
    const avatarBg = bgColor || (name ? getColorFromName(name) : 'var(--surface-3)');

    return (
      <div
        ref={ref}
        id={avatarId}
        className={clsx('redesign-avatar', className)}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: dimension,
          height: dimension,
          borderRadius: radius,
          backgroundColor: avatarBg,
          color: textColor,
          fontSize: fontSizeMap[size],
          fontWeight: 'var(--font-semibold)',
          fontFamily: 'var(--font-ui)',
          overflow: 'hidden',
          flexShrink: 0,
          cursor: onClick ? 'pointer' : 'default',
          userSelect: 'none',
          transition: 'transform var(--duration-fast) var(--ease-out)',
          ...style,
        }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}

        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        {...rest}
      >
        {src ? (
          <img
            src={src}
            alt={alt || name || 'avatar'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: radius,
            }}
          />
        ) : children ? (
          children
        ) : (
          <span aria-hidden='true'>{initials}</span>
        )}

        {/* 在线状态指示器 */}
        {status && (
          <span
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: statusSizeMap[size],
              height: statusSizeMap[size],
              borderRadius: '50%',
              backgroundColor: statusColor || statusColorMap[status],
              border: `2px solid var(--bg-primary)`,
              boxShadow: '0 0 0 1px var(--border-default)',
            }}
          />
        )}

        {/* 角标 */}
        {badge !== undefined && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 9,
              backgroundColor: badgeColorMap[badgeColor] || badgeColorMap.error,
              color: 'var(--text-inverse)',
              fontSize: '11px',
              fontWeight: 'var(--font-bold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--bg-primary)',
              lineHeight: 1,
            }}
          >
            {typeof badge === 'number' && badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'RedesignAvatar';
