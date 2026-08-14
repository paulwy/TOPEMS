/**
 * MobileProduction filter bar component
 * @refactor-split Extracted from MobileProductionPage.tsx (V79 Phase 2)
 */
import React from 'react';
import { Box, TextField, InputAdornment, Tabs, Tab } from '@mui/material';
import { Search } from 'lucide-react';
import i18n from '@/i18n';
interface MobileProductionFiltersProps {
  activeTab: number;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  showSearch?: boolean;
}
export const MobileProductionFilters: React.FC<MobileProductionFiltersProps> = ({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  showSearch = true,
}) => {
  const tabs = [
    i18n.t('mobile.production.tabs.orders'),
    i18n.t('mobile.production.tabs.reports'),
    i18n.t('mobile.production.tabs.equipment'),
  ];
  return (
    <>
      <Tabs
        value={activeTab}
        onChange={onTabChange}
        variant='fullWidth'
        sx={{
          '& .MuiTab-root': {
            minHeight: 44,
            fontSize: '0.875rem',
          },
        }}
      >
        {tabs.map((tab, index) => (
          <Tab
            key={index}
            label={tab}
          />
        ))}
      </Tabs>
      {showSearch && activeTab === 0 && (
        <Box sx={{ px: 2, pt: 2 }}>
          <TextField
            fullWidth
            size='small'
            placeholder={i18n.t('mobile.production.search_placeholder')}
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
      )}
    </>
  );
};