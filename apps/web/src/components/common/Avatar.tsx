import React from 'react';
import {
  Avatar as MuiAvatar,
  AvatarGroup as MuiAvatarGroup,
  Box,
  Typography,
  Badge,
  Tooltip,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarStatus = 'online' | 'offline' | 'busy' | 'away';

interface CustomAvatarProps {
  src?: string;
  name?: string;
  label?: string;
  size?: AvatarSize;
  variant?: 'circular' | 'rounded' | 'square';
  color?: string;
  bgColor?: string;
  status?: AvatarStatus;
  statusColor?: string;
  badge?: number | string;
  badgeColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info';
  onClick?: () => void;
  disabled?: boolean;
  sx?: SxProps<Theme>;
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
  xs: '0.625rem',
  sm: '0.75rem',
  md: '0.875rem',
  lg: '1.25rem',
  xl: '1.5rem',
};

const statusColorMap: Record<AvatarStatus, string> = {
  online: 'success.main',
  offline: 'grey.400',
  busy: 'error.main',
  away: 'warning.main',
};

const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const Avatar: React.FC<CustomAvatarProps> = ({
  src,
  name,
  label,
  size = 'md',
  variant = 'circular',
  color,
  bgColor,
  status,
  statusColor,
  badge,
  badgeColor = 'error',
  onClick,
  disabled = false,
  sx,
  children,
}) => {
  const dimension = sizeMap[size];
  const displayText = label || (name ? getInitials(name) : undefined);

  const avatar = (
    <MuiAvatar
      src={src}
      alt={name || label}
      sx={{
        width: dimension,
        height: dimension,
        fontSize: fontSizeMap[size],
        bgcolor: bgColor || (src ? undefined : `${color || 'primary'}.light`),
        color: color || src ? undefined : `${color || 'primary'}.dark`,
        borderRadius: variant === 'square' ? 2 : variant === 'rounded' ? 2 : '50%',
        cursor: disabled ? 'not-allowed' : onClick ? 'pointer' : 'default',
        opacity: disabled ? 0.5 : 1,
        ...(!disabled && onClick
          ? { '&:hover': { opacity: 0.85, transform: 'scale(1.05)' }, transition: 'all 0.2s' }
          : {}),
        ...sx,
      }}
      onClick={!disabled && onClick ? onClick : undefined}
    >
      {children ||
        (displayText && (
          <Typography
            variant='inherit'
            sx={{ fontWeight: 600 }}
          >
            {displayText}
          </Typography>
        ))}
    </MuiAvatar>
  );

  const withStatus = status ? (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      {avatar}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: dimension * 0.28,
          height: dimension * 0.28,
          borderRadius: '50%',
          bgcolor: statusColor || statusColorMap[status],
          border: '2px solid',
          borderColor: 'background.paper',
        }}
      />
    </Box>
  ) : (
    avatar
  );

  if (badge !== undefined) {
    return (
      <Badge
        badgeContent={badge}
        color={badgeColor}
        sx={{ '& .MuiBadge-badge': { fontSize: '0.625rem', minWidth: 16, height: 16 } }}
      >
        {withStatus}
      </Badge>
    );
  }

  return withStatus;
};

interface AvatarGroupProps {
  avatars: Array<Omit<CustomAvatarProps, 'size'>>;
  max?: number;
  size?: AvatarSize;
  spacing?: number;
  sx?: SxProps<Theme>;
}

const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  max = 5,
  size = 'md',
  spacing = -8,
  sx,
}) => {
  const displayAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  const gap = -spacing;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', ...sx }}>
      {displayAvatars.map((avatarProps, index) => (
        <Box
          key={index}
          sx={{
            marginLeft: index > 0 ? gap : 0,
            position: 'relative',
            zIndex: displayAvatars.length - index,
          }}
        >
          <Tooltip title={avatarProps.name || ''}>
            <Avatar
              size={size}
              {...avatarProps}
            />
          </Tooltip>
        </Box>
      ))}
      {remainingCount > 0 && (
        <Box
          sx={{
            marginLeft: gap,
            position: 'relative',
            zIndex: 0,
          }}
        >
          <Avatar
            size={size}
            label={`+${remainingCount}`}
          />
        </Box>
      )}
    </Box>
  );
};

export default Avatar;
