import React from 'react';
import { Box, Button } from '@mui/material';
import { FileText, LayoutTemplate } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

interface TabSwitcherProps {
  activeTab: 'reports' | 'templates';
  onTabChange: (tab: 'reports' | 'templates') => void;
  templatesCount: number;
}

const TabSwitcher: React.FC<TabSwitcherProps> = ({ activeTab, onTabChange, templatesCount }) => {
  const queryClient = useQueryClient();

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'inline-flex',
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 1,
          p: 1,
        }}
      >
        <Button
          variant={activeTab === 'reports' ? 'contained' : 'text'}
          onClick={() => onTabChange('reports')}
          sx={{ borderRadius: 1.5, textTransform: 'none' }}
        >
          <FileText sx={{ width: 16, height: 16, mr: 1 }} />
          {i18n.t('pages.tab_switcher.k0')}
        </Button>
        <Button
          variant={activeTab === 'templates' ? 'contained' : 'text'}
          onClick={() => {
            onTabChange('templates');
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.REPORT.TEMPLATES ,
  exact: false,
  refetchType: 'active',
});
          }}
          sx={{ borderRadius: 1.5, textTransform: 'none' }}
        >
          <LayoutTemplate sx={{ width: 16, height: 16, mr: 1 }} />
          {i18n.t('pages.tab_switcher.k1')} ({templatesCount})
        </Button>
      </Box>
    </Box>
  );
};

export default TabSwitcher;
