import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@topems/shared-components';

const PageLoader: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'var(--color-background)',
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        <LoadingSpinner size='lg' />
        <Typography sx={{ mt: 2, color: 'var(--color-text-secondary)' }}>
          {t('common.loading')}
        </Typography>
      </Box>
    </Box>
  );
};

export default PageLoader;
