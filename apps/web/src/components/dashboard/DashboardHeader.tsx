import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import i18n from '@/i18n';
import { Clock, LogOut, Zap, AlertTriangle } from 'lucide-react';
import { NotificationBell } from '../notification';
import { ModeToggle } from '../theme/ModeToggle';
import { useAuth } from '../../hooks/useAuth';
import { useRole } from '../../hooks/useRole';
import { designTokens } from '@topems/tokens';

interface DashboardHeaderProps {
  onLogout?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onLogout }) => {
  const { user } = useAuth();
  const { getRoleName } = useRole();
  const [currentTime, setCurrentTime] = React.useState(new Date());
  const [logoutConfirmOpen, setLogoutConfirmOpen] = React.useState(false);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogoutRequest = () => {
    setLogoutConfirmOpen(true);
  };

  const handleLogoutConfirm = () => {
    setLogoutConfirmOpen(false);
    onLogout?.();
  };

  const handleLogoutCancel = () => {
    setLogoutConfirmOpen(false);
  };

  return (
    <Box
      component='header'
      sx={{
        bgcolor: 'background.paper',
        backdropFilter: 'blur(20px)',
        borderBottom: 1,
        borderColor: 'divider',
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
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 3,
                }}
              >
                <Zap
                  style={{
                    width: 20,
                    height: 20,
                    color: 'common.white',
                  }}
                />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: designTokens.typography.fontSize.scale['1.25rem'],
                    fontWeight: 700,
                    background: `linear-gradient(90deg, ${designTokens.colors.primary['400']} 0%, secondary.light 100%)`,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  TOPEMS
                </Typography>
                <Typography
                  sx={{
                    fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                    color: 'grey.400',
                    display: { xs: 'none', md: 'inline' },
                  }}
                >
                  {i18n.t('components.dashboard_header.k0')}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2, md: 3 } }}>
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                gap: 1,
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                bgcolor: 'action.hover',
              }}
            >
              <Clock
                style={{ width: 16, height: 16 }}
                color='currentColor'
              />
              <Typography
                component='span'
                sx={{
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                  color: 'text.secondary',
                  fontWeight: 500,
                }}
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
                gap: { xs: 0.5, sm: 1.5, md: 2 },
                pl: { xs: 0, md: 2.5 },
                ml: { xs: 0, md: 0.5 },
                borderLeft: { xs: 0, md: 1 },
                borderColor: 'divider',
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
                  color: 'common.white',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                  fontWeight: 600,
                  boxShadow: `0 2px 8px ${designTokens.colors.action.selected}`,
                }}
              >
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </Box>
              <Box sx={{ display: { xs: 'none', sm: 'none', md: 'block' }, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    fontWeight: 600,
                    color: 'text.primary',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.full_name || user?.username}
                </Typography>
                <Typography
                  sx={{
                    fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                    color: 'text.secondary',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {getRoleName()}
                </Typography>
              </Box>
            </Box>

            <IconButton
              onClick={handleLogoutRequest}
              sx={{
                p: 2,
                borderRadius: 2,
                color: 'text.secondary',
                transition: 'all 0.2s',
                '&:hover': {
                  bgcolor: 'error.50',
                  color: 'error.main',
                },
              }}
              aria-label={i18n.t('shared.dashboard_header.k0')}
              title={i18n.t('shared.dashboard_header.k1')}
            >
              <LogOut style={{ width: 20, height: 20 }} />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* 退出登录确认对话框 */}
      <Dialog
        open={logoutConfirmOpen}
        onClose={handleLogoutCancel}
        aria-labelledby='dashboard-logout-dialog-title'
        aria-describedby='dashboard-logout-dialog-description'
        sx={{
          '& .MuiDialog-paper': {
            borderRadius: 3,
            minWidth: 360,
            bgcolor: 'background.paper',
          },
        }}
      >
        <DialogTitle
          id='dashboard-logout-dialog-title'
          sx={{
            pb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: 'warning.50',
              color: 'warning.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle style={{ width: 22, height: 22 }} />
          </Box>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
          >
            {i18n.t('components.dashboard_header.k1')}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            id='dashboard-logout-dialog-description'
            sx={{ color: 'text.secondary', pl: 9 }}
          >
            {i18n.t('components.dashboard_header.k2')}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'flex-end', gap: 1 }}>
          <Button
            onClick={handleLogoutCancel}
            variant='outlined'
            color='inherit'
            sx={{
              textTransform: 'none',
              borderRadius: 1.5,
              px: 2.5,
            }}
          >
            {i18n.t('components.dashboard_header.k3')}
          </Button>
          <Button
            onClick={handleLogoutConfirm}
            variant='contained'
            color='error'
            autoFocus
            startIcon={<LogOut style={{ width: 18, height: 18 }} />}
            sx={{
              textTransform: 'none',
              borderRadius: 1.5,
              px: 3,
              boxShadow: (theme) => `0 4px 12px ${alpha(theme.palette.error.main, 0.3)}`,
              '&:hover': {
                boxShadow: `0 6px 16px ${designTokens.colors.error[400]}`,
              },
            }}
          >
            {i18n.t('components.dashboard_header.k4')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
