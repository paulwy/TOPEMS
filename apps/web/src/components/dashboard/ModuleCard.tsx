import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import i18n from '@/i18n';
import { ArrowRight } from 'lucide-react';
import { ModuleStatusBadge, type ModuleStatusValue } from '@topems/shared-components';
import { themeCustomShadows } from '@/theme/theme';

type IconComponent = React.ComponentType<{
  className?: string;
  style?: React.CSSProperties;
}>;

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

interface ModuleCardProps {
  item: ModuleItem;
  onClick: () => void;
  size?: 'large' | 'medium' | 'small';
}

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
      sx={[
        {
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
        },
        (theme) => ({
          '&:focus-visible': {
            outline: 'none',
            boxShadow: theme.customShadows.focus,
          },
          ...theme.applyStyles('dark', {
            '&:focus-visible': { boxShadow: themeCustomShadows.dark.focus },
          }),
        }),
      ]}
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
          {i18n.t('components.module_card.k0')}
        </Button>
      </Box>
    </Box>
  );
};
