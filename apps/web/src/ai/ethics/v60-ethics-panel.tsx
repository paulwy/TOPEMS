import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { X as XIcon, Shield } from 'lucide-react';
import i18n from '@/i18n';

export const V60EthicsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <Box sx={{ p: 3, minWidth: 480 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Shield size={20} />
          <Typography variant='h6'>{i18n.t('ai.v60-ethics-panel.title')}</Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size='small'
        >
          <XIcon size={18} />
        </IconButton>
      </Box>
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {i18n.t('ai.v60-ethics-panel.disabled')}
      </Typography>
    </Box>
  );
};

export default V60EthicsPanel;
