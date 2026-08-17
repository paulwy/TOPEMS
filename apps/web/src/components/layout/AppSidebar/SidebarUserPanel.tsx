import React from 'react';
import { Box, Typography, Button, Tooltip, IconButton, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Settings } from 'lucide-react';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { ADMIN_PATHS } from '@/modules/admin/config';
import i18n from '@/i18n';

export interface SidebarUserPanelProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  displayName: string | null;
  avatarUrl: string | null;
  userRole: string | null;
  initials: string;
}

export const SidebarUserPanel: React.FC<SidebarUserPanelProps> = ({
  collapsed,
  onToggleCollapse,
  displayName,
  avatarUrl,
  userRole,
  initials,
}) => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      {!collapsed ? (
        <Box
          sx={{
            px: 1.5,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Avatar
            src={avatarUrl || undefined}
            sx={{
              width: 40,
              height: 40,
              fontSize: 16,
              fontWeight: 600,
              background: 'linear-gradient(135deg, primary.main, secondary.main)',
            }}
          >
            {initials || 'U'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'text.primary',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayName || i18n.t('shared.sidebar_user_panel.k0')}
            </Typography>
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: 'text.secondary',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {userRole || i18n.t('shared.sidebar_user_panel.k1')}
            </Typography>
          </Box>
          <Tooltip title={i18n.t('shared.sidebar_user_panel.k2')}>
            <IconButton
              size='small'
              onClick={() => navigate(ADMIN_PATHS.systemSettings)}
              sx={{ width: 32, height: 32 }}
              aria-label={i18n.t('shared.sidebar_user_panel.k3')}
            >
              <Settings style={{ width: 16, height: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Box
          sx={{
            p: 1.5,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Tooltip
            title={
              [displayName, userRole].filter(Boolean).join(' - ') ||
              i18n.t('shared.sidebar_user_panel.k4')
            }
            placement='right'
          >
            <Avatar
              src={avatarUrl || undefined}
              sx={{
                width: 36,
                height: 36,
                fontSize: 14,
                fontWeight: 600,
                background: 'linear-gradient(135deg, primary.main, secondary.main)',
                cursor: 'pointer',
              }}
              onClick={() => navigate(DASHBOARD_PATHS.profile)}
            >
              {initials || 'U'}
            </Avatar>
          </Tooltip>
        </Box>
      )}

      <Box sx={{ px: 1, pb: 1, pt: 0 }}>
        <Button
          onClick={onToggleCollapse}
          sx={{
            width: '100%',
            px: collapsed ? 0 : 1.5,
            py: 0.75,
            borderRadius: 1,
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 1,
            color: 'text.secondary',
            textTransform: 'none',
            fontSize: '0.8125rem',
            '&:hover': {
              bgcolor: 'action.hover',
            },
          }}
        >
          <ChevronLeft
            style={{
              width: 14,
              height: 14,
              transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 300ms ease',
            }}
          />
          {!collapsed && (
            <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
              {i18n.t('shared.sidebar_user_panel.k5')}
            </Typography>
          )}
        </Button>
      </Box>
    </Box>
  );
};

export default SidebarUserPanel;
