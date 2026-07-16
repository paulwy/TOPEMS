import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { designTokens } from '@/theme/tokens';
import { DASHBOARD_PATHS } from '@/routes/dashboard';

const ct = designTokens.colors;

const ServiceDownState: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${ct.background.default} 0%, border.default 100%)`,
      }}
    >
      <Box
        sx={{
          textAlign: 'center',
          maxWidth: 448,
          mx: 'auto',
          p: 4,
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 2,
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            bgcolor: 'primary.light',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <FileText sx={{ width: 32, height: 32, color: 'primary.main' }} />
        </Box>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, mb: 2, color: 'grey.900' }}
        >
          报表服务未启动
        </Typography>
        <Typography sx={{ mb: 3, color: 'grey.700' }}>
          Report服务正在启动中，请稍后刷新页面，或者联系管理员启动服务。
        </Typography>
        <Button
          onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
          variant='contained'
          sx={{ px: 3, py: 1, borderRadius: 3 }}
        >
          返回首页
        </Button>
      </Box>
    </Box>
  );
};

export default ServiceDownState;
