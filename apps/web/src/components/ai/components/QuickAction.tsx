import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { QuickActionData } from '../hooks/UseAiDashboard';

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
          bgcolor: alpha(colorMap[color as keyof typeof colorMap], 0.14),
          color:
            theme.palette.mode === 'dark'
              ? theme.palette[color as 'primary'].light
              : colorMap[color as keyof typeof colorMap],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
        }}
      >
        {icon as React.ReactNode}
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
