import React from 'react';
import { Box } from '@mui/material';
import { AIOpsPanel } from '@/microfrontend';

const AIOpsPanelWrapper: React.FC<{ onClose: () => void }> = ({ onClose }) => (
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
        width: '98%',
        maxWidth: 1600,
        height: '95vh',
        bgcolor: 'background.paper',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 20px 60px alpha(common.black, 0.3)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <AIOpsPanel onClose={onClose} />
    </Box>
  </Box>
);

export default AIOpsPanelWrapper;
