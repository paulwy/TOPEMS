import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import i18n from '@/i18n';

interface SearchShortcutsProps {
  onSelect: (text: string) => void;
}

export const SearchShortcuts: React.FC<SearchShortcutsProps> = ({ onSelect }) => {
  const shortcuts = [
    {
      text: i18n.t('components.search_shortcuts.k1'),
      hint: i18n.t('components.search_shortcuts.k0'),
    },
    {
      text: i18n.t('components.search_shortcuts.k3'),
      hint: i18n.t('components.search_shortcuts.k2'),
    },
    {
      text: i18n.t('components.search_shortcuts.k5'),
      hint: i18n.t('components.search_shortcuts.k4'),
    },
    {
      text: i18n.t('components.search_shortcuts.k7'),
      hint: i18n.t('components.search_shortcuts.k6'),
    },
  ];

  return (
    <Box sx={{ p: 2, pb: 1 }}>
      <Typography
        variant='caption'
        color='text.secondary'
        sx={{ mb: 1, display: 'block' }}
      >
        {i18n.t('components.search_shortcuts.k0')}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {shortcuts.map((s) => (
          <Chip
            key={s.text}
            label={s.text}
            size='small'
            variant='outlined'
            onClick={() => onSelect(s.text)}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default SearchShortcuts;
