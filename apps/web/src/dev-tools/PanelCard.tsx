import React from 'react';
import { Box, Typography } from '@mui/material';

const PanelCard: React.FC<{
  title: string;
  subtitle: string;
  status: string;
  span?: boolean;
}> = ({ title, subtitle, status, span }) => (
  <Box
    sx={{
      p: 2,
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      gridColumn: span ? 'span 2' : undefined,
    }}
  >
    <Typography
      variant='subtitle2'
      sx={{ fontWeight: 600, mb: 1 }}
    >
      {title}
    </Typography>
    <Typography
      variant='body2'
      sx={{ color: 'text.secondary', mb: 1 }}
    >
      {subtitle}
    </Typography>
    <Typography
      variant='body2'
      sx={{ color: 'text.secondary' }}
    >
      {status}
    </Typography>
  </Box>
);

export default PanelCard;
