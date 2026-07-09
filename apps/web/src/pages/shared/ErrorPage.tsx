import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Box, Typography } from '@mui/material';
import { BackButton } from '@topems/shared-components';

const ErrorPage: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'grey.100',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 4,
      }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 6,
          p: 8,
          maxWidth: 448,
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
          页面加载失败
        </Typography>
        <Typography
          variant='body1'
          sx={{ color: 'grey.600', mb: 3 }}
        >
          抱歉，页面加载时出现错误，请返回重试
        </Typography>
        <BackButton
          fallback='/dashboard'
          variant='text'
          label='返回上一页'
        />
      </Box>
    </Box>
  );
};

export default ErrorPage;
