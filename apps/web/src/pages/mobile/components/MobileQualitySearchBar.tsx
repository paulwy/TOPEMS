/**
 * MobileQuality search bar component
 * @refactor-split Extracted from MobileQualityPage.tsx
 */
import React from 'react';
import { Box, TextField, InputAdornment } from '@mui/material';
import { Search } from 'lucide-react';
import i18n from '@/i18n';

interface MobileQualitySearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}
const MobileQualitySearchBar: React.FC<MobileQualitySearchBarProps> = ({
  searchQuery,
  onSearchChange,
}) => {
  return (
    <Box sx={{ px: 2, pt: 2 }}>
      <TextField
        fullWidth
        size='small'
        placeholder={i18n.t('mobile.quality.search_placeholder')}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            minHeight: 44,
          },
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position='start'>
                <Search style={{ width: 20, height: 20 }} />
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  );
};
