import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { QuickAction } from './QuickAction';
import type { QuickActionData } from '../hooks/UseAiDashboard';

export const DashboardQuickActions: React.FC<{
  actions: QuickActionData[];
  isMobile: boolean;
}> = ({ actions, isMobile }) => {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography
        variant='h6'
        sx={{ fontWeight: 600, mb: 3 }}
      >
        {t('ai.dashboard.section.quick_entry')}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : '1fr',
          gap: 2,
        }}
      >
        {actions.map((action) => (
          <QuickAction
            key={action.id}
            {...action}
          />
        ))}
      </Box>
    </Box>
  );
};
