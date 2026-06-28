import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const FinanceReportsPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>财务报表</Typography>
      <Paper sx={{ p: 3 }}>
        <Typography>财务报表功能开发中...</Typography>
      </Paper>
    </Box>
  );
};

export { FinanceReportsPage };
