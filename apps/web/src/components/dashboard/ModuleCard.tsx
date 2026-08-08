import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  LinearProgress,
  type SxProps,
  type Theme,
} from '@mui/material';
import { ArrowRight } from 'lucide-react';
import { ModuleStatusBadge, type ModuleStatusValue } from '@topems/shared-components';

type IconComponent = React.ComponentType<{
  className?: string;
  style?: React.CSSProperties;
}>;

export type ModuleCardStatus = 'active' | 'beta' | 'coming' | 'maintenance';

export interface ModuleCardQuota {
  used: number;
  total: number;
  label?: string;
}

export interface ModuleCardData {
  key: string;
  name: string;
  icon: IconComponent;
  description?: string;
  status?: ModuleCardStatus;
  quota?: ModuleCardQuota;
  path: string;
}

export interface ModuleItem {
  title: string;
  icon: IconComponent;
  description: string;
  path: string;
  color: string;
  status: ModuleStatusValue;
  permission?: string | null;
  module?: string | null;
  adminOnly?: boolean;
}

const STATUS_CONFIG: Record<
  ModuleCardStatus,
  { color: 'success' | 'info' | 'warning' | 'default'; label: string }
> = {
  active: { color: 'success', label: '运行中' },
  beta: { color: 'info', label: '测试版' },
  coming: { color: 'warning', label: '即将上线' },
  maintenance: { color: 'default', label: '维护中' },
};

const CARD_STYLE: SxProps<Theme> = {
  bgcolor: 'background.paper',
  borderRadius: 2,
  border: 1,
  borderColor: 'divider',
  cursor: 'pointer',
  transition: (theme) =>
    `border-color ${theme.transitions.duration.short}ms ${theme.transitions.easing.easeInOut}, ` +
    `box-shadow ${theme.transitions.duration.short}ms ${theme.transitions.easing.easeInOut}, ` +
    `transform ${theme.transitions.duration.short}ms ${theme.transitions.easing.easeInOut}`,
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 180,
  p: 2.5,
  '&:hover': {
    borderColor: 'primary.main',
    boxShadow: 2,
    transform: 'translateY(-1px)',
  },
  '&:focus-visible': {
    outline: 'none',
    boxShadow: (theme) => theme.customShadows.focus,
  },
};

const ICON_WRAPPER_STYLE: SxProps<Theme> = {
  width: 40,
  height: 40,
  borderRadius: (theme) => theme.shape.radii.xl,
  bgcolor: 'primary.main',
  color: 'primary.contrastText',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

interface ModuleCardProps {
  item: ModuleItem;
  onClick: () => void;
  size?: 'large' | 'medium' | 'small';
}

interface ModuleCardV2Props {
  data: ModuleCardData;
  onClick?: () => void;
}

const StatusChip: React.FC<{ status: ModuleCardStatus }> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  return (
    <Chip
      label={config.label}
      color={config.color}
      size='small'
      sx={{ height: 22, '& .MuiChip-label': { px: 1, fontSize: 11, lineHeight: 1.5 } }}
    />
  );
};

const QuotaProgress: React.FC<{ quota: ModuleCardQuota }> = ({ quota }) => {
  const pct = quota.total > 0 ? Math.min((quota.used / quota.total) * 100, 100) : 0;
  const isOverThreshold = pct > 85;

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 0.75,
        }}
      >
        <Typography
          variant='caption'
          color='text.secondary'
        >
          {quota.label || '配额使用'}
        </Typography>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          {quota.used}/{quota.total}
        </Typography>
      </Box>
      <LinearProgress
        variant='determinate'
        value={pct}
        sx={{
          height: 4,
          borderRadius: 2,
          bgcolor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            bgcolor: isOverThreshold ? 'error.main' : 'primary.main',
            borderRadius: 2,
          },
        }}
      />
    </Box>
  );
};

export const ModuleCard: React.FC<ModuleCardProps> = ({ item, onClick, size = 'medium' }) => {
  const Icon = item.icon;

  const sizeStyles = {
    large: { padding: 3, iconSize: 60, titleSize: '1.125rem', descSize: '0.875rem' },
    medium: { padding: 2.5, iconSize: 52, titleSize: '1rem', descSize: '0.8125rem' },
    small: { padding: 2, iconSize: 44, titleSize: '0.875rem', descSize: '0.75rem' },
  }[size];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Box
      role='button'
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className='dashboard-module-card'
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        cursor: 'pointer',
        transition: (theme) =>
          `border-color ${theme.transitions.duration.short}ms ${theme.transitions.easing.easeInOut}, ` +
          `box-shadow ${theme.transitions.duration.short}ms ${theme.transitions.easing.easeInOut}, ` +
          `transform ${theme.transitions.duration.short}ms ${theme.transitions.easing.easeInOut}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        p: sizeStyles.padding,
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 2,
          transform: 'translateY(-1px)',
        },
        '&:focus-visible': {
          outline: 'none',
          boxShadow: (theme) => theme.customShadows.focus,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: (theme) => theme.shape.radii.xl,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon style={{ width: 22, height: 22 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <ModuleStatusBadge status={item.status} />
        </Box>
      </Box>

      <Typography
        variant='subtitle2'
        sx={{
          fontWeight: 600,
          fontSize: sizeStyles.titleSize,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          mb: 0.5,
        }}
      >
        {item.title}
      </Typography>

      <Typography
        variant='caption'
        color='text.secondary'
        sx={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          fontSize: sizeStyles.descSize,
          lineHeight: 1.5,
          mb: 1.5,
          flex: 1,
        }}
      >
        {item.description}
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto' }}>
        <Button
          size='small'
          endIcon={<ArrowRight size={14} />}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          sx={{ fontSize: 12, py: 0.5, minHeight: 30 }}
        >
          进入
        </Button>
      </Box>
    </Box>
  );
};

export const ModuleCardV2: React.FC<ModuleCardV2Props> = ({ data, onClick }) => {
  const Icon = data.icon;

  const handleClick = () => {
    onClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <Box
      role='button'
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className='dashboard-module-card-v2'
      sx={CARD_STYLE}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
        <Box sx={ICON_WRAPPER_STYLE}>
          <Icon style={{ width: 22, height: 22 }} />
        </Box>
        {data.status && (
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <StatusChip status={data.status} />
          </Box>
        )}
      </Box>

      <Typography
        variant='subtitle2'
        sx={{
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          mb: 0.5,
        }}
      >
        {data.name}
      </Typography>

      {data.description && (
        <Typography
          variant='caption'
          color='text.secondary'
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.5,
            mb: data.quota ? 1.5 : 1.5,
            flex: 1,
          }}
        >
          {data.description}
        </Typography>
      )}

      {data.quota && (
        <Box sx={{ mt: 'auto', mb: 1.5 }}>
          <QuotaProgress quota={data.quota} />
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: data.quota ? 0 : 'auto' }}>
        <Button
          size='small'
          endIcon={<ArrowRight size={14} />}
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
          sx={{ fontSize: 12, py: 0.5, minHeight: 30 }}
        >
          进入
        </Button>
      </Box>
    </Box>
  );
};

export { CARD_STYLE, ICON_WRAPPER_STYLE };
