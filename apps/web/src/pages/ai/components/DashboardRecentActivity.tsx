import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { RecentItem } from './RecentItem';
import { AI_PATHS } from '@/modules/ai/config';
import type { RecentItemData } from '../hooks/useAiDashboard';

const DashboardRecentActivity: React.FC<{ items: RecentItemData[] }> = ({ items }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box>
      <Typography
        variant='h6'
        sx={{ fontWeight: 600, mb: 3 }}
      >
        {t('ai.dashboard.section.recent_used')}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map((item) => (
          <RecentItem
            key={item.id}
            {...item}
          />
        ))}
      </Box>
      <Button
        size='small'
        sx={{ mt: 2, color: 'primary.main' }}
        onClick={() => navigate(AI_PATHS.chat)}
      >
        {t('ai.dashboard.button.view_more')}
      </Button>
    </Box>
  );
};
