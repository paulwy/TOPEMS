import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box, Badge, useTheme } from '@mui/material';
import { Menu, ArrowLeft, Bell, Search, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import i18n from '@/i18n';

export interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
  showNotifications?: boolean;
  showSearch?: boolean;
  showMore?: boolean;
  notificationCount?: number;
  onMenuClick?: () => void;
  onBackClick?: () => void;
  onNotificationClick?: () => void;
  onSearchClick?: () => void;
  onMoreClick?: () => void;
  rightActions?: React.ReactNode;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  showBack = false,
  showMenu = true,
  showNotifications = true,
  showSearch = false,
  showMore = false,
  notificationCount = 0,
  onMenuClick,
  onBackClick,
  onNotificationClick,
  onSearchClick,
  onMoreClick,
  rightActions,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      navigate(-1);
    }
  };

  return (
    <AppBar
      position='sticky'
      elevation={1}
      sx={{
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        backgroundImage: 'none',
        zIndex: theme.zIndex.appBar,
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <Toolbar
        sx={{
          minHeight: '56px !important',
          px: 1,
        }}
      >
        {showBack ? (
          <IconButton
            size='large'
            onClick={handleBack}
            sx={{
              minWidth: 44,
              minHeight: 44,
            }}
            aria-label={i18n.t('shared.mobile_header.k0')}
          >
            <ArrowLeft style={{ width: 22, height: 22 }} />
          </IconButton>
        ) : showMenu ? (
          <IconButton
            size='large'
            onClick={onMenuClick}
            sx={{
              minWidth: 44,
              minHeight: 44,
            }}
            aria-label={i18n.t('shared.mobile_header.k1')}
          >
            <Menu style={{ width: 22, height: 22 }} />
          </IconButton>
        ) : (
          <Box sx={{ width: 44 }} />
        )}

        <Typography
          variant='h6'
          component='h1'
          sx={{
            flex: 1,
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '1rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {rightActions}

          {showSearch && (
            <IconButton
              size='large'
              onClick={onSearchClick}
              sx={{
                minWidth: 44,
                minHeight: 44,
              }}
              aria-label={i18n.t('shared.mobile_header.k2')}
            >
              <Search style={{ width: 22, height: 22 }} />
            </IconButton>
          )}

          {showNotifications && (
            <IconButton
              size='large'
              onClick={onNotificationClick}
              sx={{
                minWidth: 44,
                minHeight: 44,
              }}
              aria-label={i18n.t('shared.mobile_header.k3')}
            >
              <Badge
                badgeContent={notificationCount}
                color='error'
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.65rem',
                    height: 18,
                    minWidth: 18,
                    padding: '0 5px',
                  },
                }}
              >
                <Bell style={{ width: 22, height: 22 }} />
              </Badge>
            </IconButton>
          )}

          {showMore && (
            <IconButton
              size='large'
              onClick={onMoreClick}
              sx={{
                minWidth: 44,
                minHeight: 44,
              }}
              aria-label={i18n.t('shared.mobile_header.k4')}
            >
              <MoreVertical style={{ width: 22, height: 22 }} />
            </IconButton>
          )}

          {!showSearch && !showNotifications && !showMore && !rightActions && (
            <Box sx={{ width: 44 }} />
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default MobileHeader;
