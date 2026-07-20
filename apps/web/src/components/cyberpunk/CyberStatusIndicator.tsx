import React from 'react';
import { Box, Tooltip, type SxProps, type Theme } from '@mui/material';

export type CyberStatusType = 'online' | 'offline' | 'warning' | 'error' | 'idle';

export interface CyberStatusIndicatorProps {
  status: CyberStatusType;
  label?: string;
  size?: number;
  pulse?: boolean;
  tooltip?: string;
  sx?: SxProps<Theme>;
}

const statusConfig: Record<CyberStatusType, { color: string; glow: string; label: string }> = {
  online: {
    color: '#00FF88',
    glow: 'rgba(0, 255, 136, 0.60)',
    label: '在线',
  },
  offline: {
    color: '#FF4444',
    glow: 'rgba(255, 68, 68, 0.60)',
    label: '离线',
  },
  warning: {
    color: '#FFD700',
    glow: 'rgba(255, 215, 0, 0.60)',
    label: '警告',
  },
  error: {
    color: '#FF00FF',
    glow: 'rgba(255, 0, 255, 0.60)',
    label: '错误',
  },
  idle: {
    color: '#8892B0',
    glow: 'rgba(136, 146, 176, 0.40)',
    label: '空闲',
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
          boxShadow: `0 0 ${size}px ${config.glow}, 0 0 ${size * 2}px ${config.glow}`,
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
            fontSize: '0.75rem',
            fontWeight: 500,
            color: config.color,
            textShadow: `0 0 6px ${config.glow}`,
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
