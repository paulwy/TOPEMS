/**
 * @done V80 split
 * Shared metric card used by AI assistant result visualizations.
 */
import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface MetricCardProps {
  label: string;
  value: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, unit, trend }) => {
  const trendIcon =
    trend === 'up' ? (
      <TrendingUp
        size={16}
        color='green'
      />
    ) : trend === 'down' ? (
      <TrendingDown
        size={16}
        color='red'
      />
    ) : (
      <Minus size={16} />
    );

  return (
    <Paper sx={{ p: 2, textAlign: 'center' }}>
      <Typography
        variant='caption'
        color='text.secondary'
      >
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.5 }}>
        <Typography
          variant='h4'
          sx={{ fontWeight: 700 }}
        >
          {value}
        </Typography>
        {unit && (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {unit}
          </Typography>
        )}
      </Box>
      {trend && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.5 }}>
          {trendIcon}
        </Box>
      )}
    </Paper>
  );
};

export default MetricCard;
