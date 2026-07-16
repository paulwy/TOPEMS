import React from 'react';
import { Box } from '@mui/material';
import { CheckCircle } from 'lucide-react';

interface NotificationToastProps {
  type: 'success' | 'error';
  message: string;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ type, message }) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 80,
        right: 16,
        zIndex: 50,
        p: 2,
        borderRadius: 3,
        boxShadow: 2,
        bgcolor: type === 'success' ? 'success.main' : 'error.main',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      {type === 'success' && <CheckCircle sx={{ width: 20, height: 20 }} />}
      <span>{message}</span>
    </Box>
  );
};

export default NotificationToast;
