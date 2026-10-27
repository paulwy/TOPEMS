import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Loader2 } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';
const LoadingState: React.FC = () => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, border.default 100%)`,
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
        <Typography sx={{ color: 'grey.700' }}>{i18n.t('pages.loading_state.k0')}</Typography>
      </Box>
    </Box>
  );
};

export default LoadingState;
