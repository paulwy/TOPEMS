import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { X as XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ObservabilityDashboard } from '@/microfrontend';

const DashboardPanelWrapper: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'alpha(common.black, 0.5)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          width: '95%',
          maxWidth: 1400,
          maxHeight: '95vh',
          bgcolor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 20px 60px alpha(common.black, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'error.main',
            color: 'common.white',
          }}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
          >
            {t('devtools.panels.dashboard.title')}
          </Typography>
          <IconButton
            size='small'
            onClick={onClose}
            sx={{ color: 'common.white' }}
          >
            <XIcon size={20} />
          </IconButton>
        </Box>
        <Box sx={{ overflow: 'auto', maxHeight: 'calc(95vh - 56px)' }}>
          <ObservabilityDashboard />
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardPanelWrapper;
