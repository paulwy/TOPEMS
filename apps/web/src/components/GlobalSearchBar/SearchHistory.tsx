import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { History, XCircle } from 'lucide-react';
import type { SearchHistoryProps } from './types';
import i18n from '@/i18n';

export const SearchHistory: React.FC<SearchHistoryProps> = ({
  history,
  onSelect,
  onRemove,
  onClear,
}) => {
  if (history.length === 0) return null;

  return (
    <Box sx={{ px: 2, pb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          {i18n.t('components.search_history.k0')}
        </Typography>
        <Typography
          variant='caption'
          color='primary'
          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
          onClick={onClear}
        >
          {i18n.t('components.search_history.k1')}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {history.map((item) => (
          <Chip
            key={item}
            label={item}
            size='small'
            variant='outlined'
            icon={<History size={12} />}
            onClick={() => onSelect(item)}
            onDelete={() => onRemove(item)}
            deleteIcon={<XCircle size={12} />}
            sx={{ cursor: 'pointer' }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default SearchHistory;
