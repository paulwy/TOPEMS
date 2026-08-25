import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { X as XIcon, FileCheck } from 'lucide-react';
import i18n from '@/i18n';

const V56ReviewPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <Box sx={{ p: 3, minWidth: 480 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileCheck size={20} />
          <Typography variant='h6'>{i18n.t('ai.v56-review-panel.title')}</Typography>
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
        {i18n.t('ai.v56-review-panel.disabled')}
      </Typography>
    </Box>
  );
};

export { V56ReviewPanel };
export default V56ReviewPanel;
