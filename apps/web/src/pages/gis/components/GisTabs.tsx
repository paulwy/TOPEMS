import React from 'react';
import { Box, Button } from '@mui/material';
import type { TabType } from '../hooks/useGisPage';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

interface GisTabsProps {
  tabs: TabConfig[];
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}

export const GisTabs: React.FC<GisTabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        borderBottom: 1,
        borderColor: 'grey.100',
        overflowX: 'auto',
      }}
    >
      {tabs.map((tab) => (
        <Button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 2.5,
            py: 1.5,
            fontSize: '0.875rem',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            color: activeTab === tab.id ? 'cyan.dark' : 'text.secondary',
            borderBottom: activeTab === tab.id ? 2 : 0,
            borderColor: activeTab === tab.id ? 'cyan.dark' : 'transparent',
            bgcolor: activeTab === tab.id ? 'cyan.light' : 'transparent',
            '&:hover': {
              bgcolor: activeTab === tab.id ? 'cyan.light' : 'grey.50',
            },
            textTransform: 'none',
          }}
        >
          {tab.icon}
          {tab.label}
        </Button>
      ))}
    </Box>
  );
};
