import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Box, Typography } from '@mui/material';
import { BackButton } from '@topems/shared-components';
import i18n from '@/i18n';
import { designTokens } from '@topems/tokens';
import { AuthPageTemplate } from '@/components/templates';

const ErrorPage: React.FC = () => {
  return (
    <AuthPageTemplate
      backgroundGradient={designTokens.colors.grey[100]}
      maxWidth={448}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 6,
          p: 8,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            bgcolor: 'error.100',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <AlertCircle sx={{ width: 40, height: 40, color: 'error.main' }} />
        </Box>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'grey.900', mb: 1 }}
        >
          {i18n.t('pages.error_page.k0')}
        </Typography>
        <Typography
          variant='body1'
          sx={{ color: 'grey.600', mb: 3 }}
        >
          {i18n.t('pages.error_page.k1')}
        </Typography>
        <BackButton
          fallback='/dashboard'
          variant='text'
          label={i18n.t('pages.error_page.k0')}
        />
      </Box>
    </AuthPageTemplate>
  );
};

export default ErrorPage;
