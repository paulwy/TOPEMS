import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import i18n from '@/i18n';

interface HotSearchesProps {
  onSelect: (text: string) => void;
}

export const HotSearches: React.FC<HotSearchesProps> = ({ onSelect }) => {
  const hotSearches = [
    { rank: 1, text: i18n.t('components.hot_searches.k0'), hot: true },
    { rank: 2, text: i18n.t('components.hot_searches.k1') },
    { rank: 3, text: i18n.t('components.hot_searches.k2') },
    { rank: 4, text: i18n.t('components.hot_searches.k3') },
    { rank: 5, text: i18n.t('components.hot_searches.k4') },
    { rank: 6, text: i18n.t('components.hot_searches.k5') },
  ];

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'error.main';
    if (rank === 2) return 'warning.main';
    if (rank === 3) return 'info.main';
    return 'text.secondary';
  };

  return (
    <Box sx={{ px: 2, py: 1 }}>
      <Typography
        variant='caption'
        color='text.secondary'
        sx={{ mb: 1, display: 'block' }}
      >
        {i18n.t('components.hot_searches.k0')}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, rowGap: 0.5 }}>
        {hotSearches.map((item) => (
          <Chip
            key={item.text}
            label={
              <Box
                component='span'
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <Box
                  component='span'
                  sx={{
                    fontWeight: 700,
                    fontSize: 10,
                    color: getRankColor(item.rank),
                    minWidth: 14,
                    textAlign: 'center',
                  }}
                >
                  {item.rank}
                </Box>
                <span>{item.text}</span>
                {item.hot && (
                  <Box
                    component='span'
                    sx={{
                      fontSize: 9,
                      color: 'error.main',
                      fontWeight: 600,
                    }}
                  >
                    HOT
                  </Box>
                )}
              </Box>
            }
            size='small'
            variant='outlined'
            onClick={() => onSelect(item.text)}
            sx={{ cursor: 'pointer', height: 26 }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default HotSearches;
