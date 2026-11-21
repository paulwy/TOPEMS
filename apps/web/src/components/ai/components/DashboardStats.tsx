import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { StatCard } from './StatCard';
import type { StatCardData } from '../hooks/UseAiDashboard';

export const DashboardStats: React.FC<{ stats: StatCardData[]; isMobile: boolean }> = ({
  stats,
  isMobile,
}) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant='h6'
        sx={{ fontWeight: 600, mb: 3 }}
      >
        {t('ai.dashboard.section.usage_stats')}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 2,
        }}
      >
        {stats.map((stat) => (
          <StatCard
            key={stat.id}
            {...stat}
          />
        ))}
      </Box>
    </Box>
  );
};
