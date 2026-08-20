import React from 'react';
import { Box, Typography, Paper, Chip, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { MiniChart } from './MiniChart';

const DashboardTrend: React.FC<{ usageData: number[] }> = ({ usageData }) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const days = [
    t('ai.dashboard.day.mon'),
    t('ai.dashboard.day.tue'),
    t('ai.dashboard.day.wed'),
    t('ai.dashboard.day.thu'),
    t('ai.dashboard.day.fri'),
    t('ai.dashboard.day.sat'),
    t('ai.dashboard.day.sun'),
  ];

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant='h6'
        sx={{ fontWeight: 600, mb: 3 }}
      >
        {t('ai.dashboard.section.usage_trend')}
      </Typography>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 500 }}
          >
            {t('ai.dashboard.trend.7_days_chat_count')}
          </Typography>
          <Chip
            label={t('ai.dashboard.trend.good')}
            color='success'
            size='small'
          />
        </Box>
        <MiniChart
          data={usageData}
          color={theme.palette.primary.main}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          {days.map((day) => (
            <Typography
              key={day}
              variant='caption'
              color='text.secondary'
            >
              {day}
            </Typography>
          ))}
        </Box>
      </Paper>
    </Box>
  );
};
