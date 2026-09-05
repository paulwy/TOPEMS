import React from 'react';
import { Paper, Box, Typography, Button, Chip } from '@mui/material';
import { ArrowRight } from 'lucide-react';
import type { FeatureCardData } from '../hooks/UseAiDashboard';

export const FeatureCard: React.FC<FeatureCardData> = ({
  title,
  description,
  icon,
  color,
  stats,
  action,
}) => {
  return (
    <Paper
      sx={{
        p: 4,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 2,
            bgcolor: `${color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {React.cloneElement(
            icon as React.ReactElement<{ size?: number; style?: React.CSSProperties }>,
            {
              size: 28,
              style: { color },
            }
          )}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 1 }}
          >
            {title}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 2 }}
          >
            {description}
          </Typography>
          {stats && (
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              {stats.map((stat) => (
                <Chip
                  key={stat.label}
                  label={`${stat.label}: ${stat.value}`}
                  size='small'
                  variant='outlined'
                  sx={{ fontSize: 11 }}
                />
              ))}
            </Box>
          )}
          {action && (
            <Button
              size='small'
              variant='outlined'
              endIcon={<ArrowRight size={16} />}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
};
