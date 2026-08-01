import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export interface StatsCardItem {
  key: string;
  label: string;
  value?: number | string;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'default';
  icon?: React.ReactNode;
}

export interface StatsCardsProps {
  cards: StatsCardItem[];
}

/**
 * 统计卡片渲染组件
 * 从 ListPageTemplate 中抽离的统计卡片渲染逻辑
 */
export const StatsCards: React.FC<StatsCardsProps> = ({ cards }) => {
  if (!cards || cards.length === 0) return null;

  return (
    <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2, pb: 1 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: `repeat(${Math.min(cards.length, 4)}, 1fr)`,
            md: `repeat(${Math.min(cards.length, 6)}, 1fr)`,
          },
          gap: 2,
        }}
      >
        {cards.map((card) => (
          <Paper
            key={card.key}
            elevation={0}
            sx={{
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
            }}
          >
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary' }}
            >
              {card.label}
            </Typography>
            <Typography
              variant='h5'
              sx={{
                fontWeight: 600,
                color:
                  card.color === 'primary'
                    ? 'primary.main'
                    : card.color === 'success'
                      ? 'success.main'
                      : card.color === 'warning'
                        ? 'warning.main'
                        : card.color === 'error'
                          ? 'error.main'
                          : card.color === 'info'
                            ? 'info.main'
                            : 'text.primary',
              }}
            >
              {card.value}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};
