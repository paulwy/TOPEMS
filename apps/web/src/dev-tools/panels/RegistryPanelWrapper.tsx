import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { X as XIcon } from 'lucide-react';
import { RegistryPanel } from '@/microfrontend';

const RegistryPanelWrapper: React.FC<{ onClose: () => void }> = ({ onClose }) => (
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
        width: '90%',
        maxWidth: 1200,
        maxHeight: '90vh',
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
          bgcolor: 'secondary.dark',
          color: 'common.white',
        }}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600 }}
        >
          模块注册中心
        </Typography>
        <IconButton
          size='small'
          onClick={onClose}
          sx={{ color: 'common.white' }}
        >
          <XIcon size={20} />
        </IconButton>
      </Box>
      <Box sx={{ overflow: 'auto', maxHeight: 'calc(90vh - 56px)' }}>
        <RegistryPanel />
      </Box>
    </Box>
  </Box>
);

export default RegistryPanelWrapper;
