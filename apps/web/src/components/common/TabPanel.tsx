import React from 'react';
import { Box, Typography, Skeleton } from '@mui/material';

export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  loading?: boolean;
  emptyMessage?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  children,
  value,
  index,
  loading,
  emptyMessage,
}) => {
  if (value !== index) return null;

  return (
    <Box
      role='tabpanel'
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      sx={{ pt: 3 }}
    >
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 4 }}>
          <Skeleton
            variant='rectangular'
            height={40}
            width='60%'
          />
          <Skeleton
            variant='rectangular'
            height={200}
          />
          <Skeleton
            variant='rectangular'
            height={40}
            width='40%'
          />
          <Skeleton
            variant='rectangular'
            height={200}
          />
        </Box>
      ) : (
        children ||
        (emptyMessage ? (
          <Typography
            color='text.secondary'
            sx={{ py: 4, textAlign: 'center' }}
          >
            {emptyMessage}
          </Typography>
        ) : null)
      )}
    </Box>
  );
};

export default TabPanel;
