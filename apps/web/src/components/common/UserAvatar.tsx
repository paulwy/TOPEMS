import React from 'react';
import { Avatar as MuiAvatar, Tooltip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { User } from 'lucide-react';

export type UserAvatarSize = 24 | 32 | 40 | 48 | number;

export interface UserAvatarProps {
  name?: string;
  email?: string;
  src?: string;
  size?: UserAvatarSize;
  alt?: string;
  showTooltip?: boolean;
  sx?: SxProps<Theme>;
}

const getFontSize = (size: number): string => {
  if (size <= 24) return '0.625rem';
  if (size <= 32) return '0.75rem';
  if (size <= 40) return '0.875rem';
  if (size <= 48) return '1rem';
  if (size <= 64) return '1.25rem';
  return `${Math.round(size / 2.5)}px`;
};

const getInitialsFromName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return '';
  if (/[\u4E00-\u9FA5]/.test(trimmed)) {
    return trimmed.slice(0, 1).toUpperCase();
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
};

const getInitialsFromEmail = (email: string): string => {
  const trimmed = email.trim();
  if (!trimmed) return '';
  const localPart = trimmed.split('@')[0] || '';
  if (!localPart) return '';
  if (/[._-]/.test(localPart)) {
    const parts = localPart.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
  }
  return localPart.slice(0, 2).toUpperCase();
};

const fallbackColors = [
  { bg: '#E3F2FD', fg: '#1565C0' },
  { bg: '#F3E5F5', fg: '#7B1FA2' },
  { bg: '#E8F5E9', fg: '#2E7D32' },
  { bg: '#FFF3E0', fg: '#E65100' },
  { bg: '#FCE4EC', fg: '#C2185B' },
  { bg: '#E0F7FA', fg: '#00838F' },
  { bg: '#FFF8E1', fg: '#F57F17' },
  { bg: '#F1F8E9', fg: '#558B2F' },
];

const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

const getColorForKey = (key: string) => {
  const idx = hashString(key) % fallbackColors.length;
  return fallbackColors[idx];
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  email,
  src,
  size = 32,
  alt,
  showTooltip = true,
  sx,
}) => {
  const displaySrc = src && src.trim() !== '' ? src : undefined;

  let initials = '';
  let colorKey = '';

  if (name && name.trim() !== '') {
    initials = getInitialsFromName(name);
    colorKey = name.trim();
  } else if (email && email.trim() !== '') {
    initials = getInitialsFromEmail(email);
    colorKey = email.trim().toLowerCase();
  }

  const palette = colorKey ? getColorForKey(colorKey) : { bg: '#E0E0E0', fg: '#757575' };
  const tooltipText = alt || name || email || '';
  const fontSize = getFontSize(size);

  const avatar = (
    <MuiAvatar
      src={displaySrc}
      alt={alt || name || email || 'user'}
      sx={{
        width: size,
        height: size,
        fontSize,
        fontWeight: 600,
        bgcolor: displaySrc ? undefined : palette.bg,
        color: displaySrc ? undefined : palette.fg,
        ...sx,
      }}
    >
      {!displaySrc &&
        (initials ? (
          <span>{initials}</span>
        ) : (
          <User
            size={Math.round(size * 0.55)}
            color={palette.fg}
          />
        ))}
    </MuiAvatar>
  );

  if (showTooltip && tooltipText) {
    return <Tooltip title={tooltipText}>{avatar}</Tooltip>;
  }

  return avatar;
};

export default UserAvatar;
