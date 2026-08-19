import React from 'react';
import { Paper, Box, Typography, Chip } from '@mui/material';
import type { StatCardData } from '../hooks/useAiDashboard';

export const StatCard: React.FC<StatCardData> = ({
  title,
  value,
  icon,
  change,
  changeLabel,
  color,
  onClick,
}) => {
  const isPositive = change >= 0;

  const colorMap = {
    primary: { bg: 'primary.light', text: 'primary.main', border: 'primary.main' },
    info: { bg: 'info.light', text: 'info.main', border: 'info.main' },
    success: { bg: 'success.light', text: 'success.main', border: 'success.main' },
    warning: { bg: 'warning.light', text: 'warning.main', border: 'warning.main' },
    secondary: { bg: 'secondary.light', text: 'secondary.main', border: 'secondary.main' },
  };

  const colors = colorMap[color];

  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 2,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        '&:hover': onClick ? { boxShadow: 2, borderColor: colors.border } : {},
        border: 1,
        borderColor: 'divider',
      }}
      onClick={onClick}
    >
      <Box
        sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1.5,
            bgcolor: colors.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.text,
          }}
        >
          {icon as any}
        </Box>
        <Chip
          label={`${isPositive ? '+' : ''}${change}%`}
          size='small'
          color={isPositive ? 'success' : 'error'}
          sx={{ fontSize: 11 }}
        />
      </Box>
      <Typography
        variant='h4'
        sx={{ fontWeight: 700, mb: 0.5 }}
      >
        {value}
      </Typography>
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {title}
      </Typography>
      <Typography
        variant='caption'
        color='text.disabled'
        sx={{ mt: 0.5, display: 'block' }}
      >
        {changeLabel}
      </Typography>
    </Paper>
  );
};
