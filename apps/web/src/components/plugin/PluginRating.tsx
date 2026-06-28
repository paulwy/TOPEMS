import React from 'react';
import { Box, Rating, Typography } from '@mui/material';

interface PluginRatingProps {
  value: number;
  count?: number;
  size?: 'small' | 'medium' | 'large';
  showValue?: boolean;
  showCount?: boolean;
}

export const PluginRating: React.FC<PluginRatingProps> = ({
  value,
  count = 0,
  size = 'small',
  showValue = true,
  showCount = true,
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Rating
        value={value}
        readOnly
        size={size}
        precision={0.5}
      />
      {showValue && (
        <Typography
          variant={size === 'small' ? 'body2' : 'body1'}
          sx={{ fontWeight: 'medium' }}
        >
          {value.toFixed(1)}
        </Typography>
      )}
      {showCount && count > 0 && (
        <Typography
          variant='body2'
          color='textSecondary'
        >
          ({count.toLocaleString()})
        </Typography>
      )}
    </Box>
  );
};

export default PluginRating;
