/**
 * ApprovalFilter - Search box and tab switching component
 * @refactor-split Extracted from MobileApprovalPage.tsx
 */
import React from 'react';
import { Box, Tabs, Tab, TextField, InputAdornment, Chip } from '@mui/material';
import { Search } from 'lucide-react';
import i18n from '@/i18n';

interface ApprovalFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeTab: number;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  tabs: string[];
  pendingCount: number;
}
const ApprovalFilter: React.FC<ApprovalFilterProps> = ({
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  tabs,
  pendingCount,
}) => {
  return (
    <>
      <Box sx={{ px: 2, pt: 2 }}>
        <TextField
          fullWidth
          size='small'
          placeholder={i18n.t('mobile.approval.action.search')}
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
      <Tabs
        value={activeTab}
        onChange={onTabChange}
        variant='fullWidth'
        sx={{
          px: 2,
          mb: 1,
          '& .MuiTab-root': {
            minHeight: 44,
            fontSize: '0.875rem',
          },
        }}
      >
        {tabs.map((tab, index) => (
          <Tab
            key={index}
            label={
              index === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tab}
                  <Chip
                    label={pendingCount}
                    size='small'
                    color='error'
                    sx={{ height: 18, fontSize: '0.65rem', minWidth: 18 }}
                  />
                </Box>
              ) : (
                tab
              )
            }
          />
        ))}
      </Tabs>
    </>
  );
};
