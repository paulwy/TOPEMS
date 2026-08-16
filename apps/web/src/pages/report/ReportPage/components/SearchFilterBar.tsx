import React from 'react';
import { Box, TextField, Select, MenuItem } from '@mui/material';
import { Search } from 'lucide-react';
import i18n from '@/i18n';

interface SearchFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeTab: 'reports' | 'templates';
  filterModule: string;
  onFilterModuleChange: (value: string) => void;
  uniqueModules: string[];
}

const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchTerm,
  onSearchChange,
  activeTab,
  filterModule,
  onFilterModuleChange,
  uniqueModules,
}) => {
  return (
    <Box sx={{ mb: 3, display: 'flex', gap: 3 }}>
      <Box sx={{ flex: 1, position: 'relative' }}>
        <Search
          sx={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 20,
            height: 20,
            color: 'grey.400',
          }}
        />
        <TextField
          fullWidth
          size='small'
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={i18n.t('pages.search_filter_bar.k1')}
          sx={{
            pl: 5,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'background.paper',
              borderRadius: 3,
            },
          }}
        />
      </Box>
      {activeTab === 'reports' && (
        <Select
          value={filterModule}
          onChange={(e) => onFilterModuleChange(e.target.value)}
          size='small'
          sx={{ minWidth: 120, bgcolor: 'background.paper', borderRadius: 3 }}
        >
          <MenuItem value='all'>{i18n.t('pages.search_filter_bar.k0')}</MenuItem>
          {uniqueModules.map((module) => (
            <MenuItem
              key={module}
              value={module}
            >
              {module}
            </MenuItem>
          ))}
        </Select>
      )}
    </Box>
  );
};

export default SearchFilterBar;
