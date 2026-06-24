import React from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Box, Typography } from '@mui/material';
import { Button } from '@/components/ui/Button';

const ErrorPage: React.FC = () => {
  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/dashboard';
    }
  };

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
        <Button
          variant='contained'
          onClick={handleGoBack}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            px: 3,
            py: 1,
            bgcolor: 'primary.main',
            color: 'white',
            borderRadius: 2,
            '&:hover': { bgcolor: 'primary.dark' },
            transition: 'background-color 0.2s',
          }}
          startIcon={<ArrowLeft sx={{ width: 16, height: 16, mr: 1 }} />}
        >
          返回上一页
        </Button>
      </Box>
    </Box>
  );
};

export default ErrorPage;
