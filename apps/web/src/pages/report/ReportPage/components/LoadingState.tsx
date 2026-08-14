import React from 'react';
import { Box, Typography } from '@mui/material';
import { Loader2 } from 'lucide-react';
import { designTokens } from '@/theme/tokens';

const ct= designTokens.colors;

const LoadingState: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${ct.background.default} 0%, border.default 100%)`,
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <Loader2
          sx={{
            width: 48,
            height: 48,
            color: 'primary.main',
            animation: 'spin 1s linear infinite',
            mx: 'auto',
            mb: 2,
          }}
        />
        <Typography sx={{ color: 'grey.700' }}>加载中...</Typography>
      </Box>
    </Box>
  );
};

export default LoadingState;
