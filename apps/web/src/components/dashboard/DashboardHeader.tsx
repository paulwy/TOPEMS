import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { Button } from '@mui/material';
import { Clock, LogOut, Zap } from 'lucide-react';
import { NotificationBell } from '../notifications';
import { ModeToggle } from '../theme/ModeToggle';
import { useAuth } from '../../hooks/useAuth';
import { useRole } from '../../hooks/useRole';

interface DashboardHeaderProps {
  onLogout?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const { getRoleName } = useRole();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box
      component='header'
      sx={{
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <Box
        sx={{
          maxWidth: 1280,
          mx: 'auto',
          px: { xs: 2, sm: 3, lg: 4 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: 64,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  background: 'linear-gradient(135deg, primary.main 0%, secondary.main 100%)',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 3,
                }}
              >
                <Zap style={{ width: 20, height: 20, color: 'white' }} />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    background: 'linear-gradient(90deg, #60a5fa 0%, secondary.light 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  TOPEMS
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    color: '#94a3b8',
                    display: { xs: 'none', md: 'inline' },
                  }}
                >
                  化工新材料数字化平台
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                gap: 2,
                fontSize: '0.875rem',
                color: '#94a3b8',
              }}
            >
              <Clock style={{ width: 16, height: 16 }} />
              <Typography
                component='span'
                sx={{ fontSize: '0.875rem', color: '#94a3b8' }}
              >
                {currentTime.toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Typography>
            </Box>

            <NotificationBell />
            <ModeToggle />

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                pl: 4,
                borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  background: 'linear-gradient(135deg, primary.main 0%, secondary.main 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  boxShadow: 3,
                }}
              >
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </Box>
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'white' }}>
                  {user?.full_name || user?.username}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {getRoleName()}
                </Typography>
              </Box>
            </Box>

            <IconButton
              onClick={onLogout}
              sx={{
                p: 2.5,
                borderRadius: 2,
                color: 'grey.400',
                transition: 'all',
                '&:hover': {
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: 'error.light',
                },
              }}
              title='退出登录'
            >
              <LogOut style={{ width: 20, height: 20 }} />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
