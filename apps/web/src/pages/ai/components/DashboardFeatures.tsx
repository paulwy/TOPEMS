import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { FeatureCard } from './FeatureCard';
import type { FeatureCardData } from '../hooks/useAiDashboard';

export const DashboardFeatures: React.FC<{ features: FeatureCardData[] }> = ({ features }) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant='h6'
        sx={{ fontWeight: 600, mb: 3 }}
      >
        {t('ai.dashboard.section.core_features')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {features.map((feature) => (
          <FeatureCard
            key={feature.id}
            {...feature}
          />
        ))}
      </Box>
    </Box>
  );
};
