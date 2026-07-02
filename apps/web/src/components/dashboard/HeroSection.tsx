import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Sparkles, ChevronRight, Activity } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const HeroSection: React.FC = () => {
  const { user } = useAuth();

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return '上午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <Box sx={{ mb: 8 }}>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: 3,
          p: { xs: 4, md: 8 },
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.3,
            background:
              'radial-gradient(circle at 80% 20%, rgba(96, 165, 250, 0.15) 0%, transparent 50%)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.2,
            background:
              'radial-gradient(circle at 20% 80%, rgba(167, 139, 250, 0.15) 0%, transparent 50%)',
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 10 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #60a5fa, secondary.light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles
                size={16}
                color='white'
              />
            </Box>
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: 'primary.light',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {getGreeting()}，{user?.full_name || user?.username || '用户'}
            </Typography>
          </Box>

          <Typography
            sx={{
              fontSize: { xs: '2rem', md: '3rem' },
              fontWeight: 800,
              color: 'grey.50',
              mb: 3,
              lineHeight: 1.2,
            }}
          >
            欢迎回到
            <Box
              component='span'
              sx={{
                background:
                  'linear-gradient(to right, rgb(96, 165, 250), rgb(167, 139, 250), rgb(244, 114, 182))',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {' TOPEMS '}
            </Box>
            平台
          </Typography>

          <Typography
            sx={{
              fontSize: '1.125rem',
              color: 'grey.400',
              mb: 6,
              maxWidth: '600px',
            }}
          >
            化工新材料企业数字化平台，助力企业实现数字化转型，提升运营效率，创造更大价值
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Button
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 3,
                py: 1.5,
                background: 'linear-gradient(to right, rgb(59, 130, 246), rgb(147, 51, 234))',
                color: 'white',
                fontWeight: 600,
                borderRadius: 3,
                transition: 'all 0.3s',
                '&:hover': {
                  boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.25)',
                  transform: 'scale(1.05)',
                },
              }}
            >
              <Activity size={20} />
              <span>开始工作</span>
              <ChevronRight size={18} />
            </Button>
            <Button
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 3,
                py: 1.5,
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                fontWeight: 600,
                borderRadius: 3,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                },
              }}
            >
              <span>了解更多</span>
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            position: 'absolute',
            bottom: '-5rem',
            right: '-5rem',
            width: '16rem',
            height: '16rem',
            background:
              'linear-gradient(to bottom right, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))',
            borderRadius: '50%',
            filter: 'blur(64px)',
          }}
        />
      </Box>
    </Box>
  );
};
