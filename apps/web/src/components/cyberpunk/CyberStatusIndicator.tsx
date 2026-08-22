import { designTokens } from '@topems/tokens';
import React from 'react';
import { Box, Tooltip, useTheme, type SxProps, type Theme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import i18n from '@/i18n';

type CyberStatusType = 'online' | 'offline' | 'warning' | 'error' | 'idle';

interface CyberStatusIndicatorProps {
  status: CyberStatusType;
  label?: string;
  size?: number;
  pulse?: boolean;
  tooltip?: string;
  sx?: SxProps<Theme>;
}

const statusConfig: Record<CyberStatusType, { color: string; glow: (theme: Theme) => string; label: string }> = {
  online: {
    color: 'success.500',
    glow: (theme) => alpha(theme.palette.success.main, 0.60),
    label: i18n.t('components.cyber_status_indicator.k0'),
  },
  offline: {
    color: 'error.500',
    glow: (theme) => alpha(theme.palette.error.main, 0.60),
    label: i18n.t('components.cyber_status_indicator.k1'),
  },
  warning: {
    color: 'yellow.400',
    glow: (theme) => alpha(theme.palette.warning.main, 0.60),
    label: i18n.t('components.cyber_status_indicator.k2'),
  },
  error: {
    color: 'purple.600',
    glow: (theme) => alpha(theme.palette.secondary.main, 0.60),
    label: i18n.t('components.cyber_status_indicator.k3'),
  },
  idle: {
    color: 'text.muted',
    glow: (theme) => alpha(theme.palette.grey[500], 0.40),
    label: i18n.t('components.cyber_status_indicator.k4'),
  },
};

export const CyberStatusIndicator: React.FC<CyberStatusIndicatorProps> = ({
  status,
  label,
  size = 10,
  pulse = true,
  tooltip,
  sx,
}) => {
  const theme = useTheme();
  const config = statusConfig[status];
  const displayLabel = label || config.label;

  const indicator = (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        ...sx,
      }}
    >
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: config.color,
          boxShadow: `0 0 ${size}px ${config.glow(theme)}, 0 0 ${size * 2}px ${config.glow(theme)}`,
          position: 'relative',
          animation: pulse ? 'cyber-status-pulse 2s ease-in-out infinite' : 'none',
          '@keyframes cyber-status-pulse': {
            '0%, 100%': {
              opacity: 1,
              transform: 'scale(1)',
            },
            '50%': {
              opacity: 0.6,
              transform: 'scale(0.85)',
            },
          },
          '&::after': pulse
            ? {
                content: '""',
                position: 'absolute',
                inset: -2,
                borderRadius: '50%',
                border: `1px solid ${config.color}`,
                opacity: 0.5,
                animation: 'cyber-status-ring 2s ease-out infinite',
              }
            : {},
          '@keyframes cyber-status-ring': {
            '0%': {
              transform: 'scale(1)',
              opacity: 0.5,
            },
            '100%': {
              transform: 'scale(2.2)',
              opacity: 0,
            },
          },
        }}
      />
      {displayLabel && (
        <Box
          component='span'
          sx={{
            fontSize: designTokens.typography.fontSize.scale['0.75rem'],
            fontWeight: 500,
            color: config.color,
            textShadow: `0 0 6px ${config.glow(theme)}`,
            letterSpacing: '0.02em',
          }}
        >
          {displayLabel}
        </Box>
      )}
    </Box>
  );

  if (tooltip) {
    return (
      <Tooltip
        title={tooltip}
        arrow
      >
        {indicator}
      </Tooltip>
    );
  }

  return indicator;
};

export default CyberStatusIndicator;
