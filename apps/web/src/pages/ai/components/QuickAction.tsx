import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import type { QuickActionData } from '../hooks/useAiDashboard';

export const QuickAction: React.FC<QuickActionData> = ({
  label,
  icon,
  color,
  onClick,
  description,
}) => {
  const theme = useTheme();

  const colorMap = {
    primary: theme.palette.primary.main,
    info: theme.palette.info.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    secondary: theme.palette.secondary.main,
  };

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 2,
          borderColor: colorMap[color],
          backgroundColor: 'action.hover',
        },
      }}
      onClick={onClick}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 2,
          bgcolor: `${color}.light`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
          color: colorMap[color],
        }}
      >
        {icon}
      </Box>
      <Typography
        variant='body1'
        sx={{ fontWeight: 600 }}
      >
        {label}
      </Typography>
      {description && (
        <Typography
          variant='caption'
          color='text.secondary'
          sx={{ mt: 1, display: 'block' }}
        >
          {description}
        </Typography>
      )}
    </Box>
  );
};
