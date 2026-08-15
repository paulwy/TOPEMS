import React, { useState, useMemo } from 'react';
import { Box, Avatar, IconButton, Tooltip, Menu, MenuItem, Divider, ListItemIcon, ListItemText, Typography, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button, } from '@mui/material';
import i18n from '@/i18n';
import { User, Settings, LogOut, Building2, AlertTriangle, HelpCircle } from 'lucide-react';
import type { User as UserType } from '@topems/shared-types';
import { useAuth } from '@/hooks/useAuth';
import { themeCustomShadows } from '@/theme/theme';
export const extractInitials = (name: string | null | undefined): string => {
    if (!name || typeof name !== 'string')
        return 'U';
    const trimmed = name.trim();
    if (!trimmed)
        return 'U';
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};
export interface UserMenuProps {
    user?: UserType | null;
    tenantName?: string;
    onProfileClick?: () => void;
    onAccountSettingsClick?: () => void;
    onHelpCenterClick?: () => void;
    onLogout?: () => void;
}
export const UserMenu: React.FC<UserMenuProps> = ({ user, tenantName, onProfileClick, onAccountSettingsClick, onHelpCenterClick, onLogout, }) => {
    const { logout: authLogout } = useAuth();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const menuOpen = Boolean(anchorEl);
    const initials = useMemo(() => {
        const displayName = user?.realName || user?.name || user?.full_name || user?.username;
        return extractInitials(displayName);
    }, [user]);
    const displayName = user?.realName || user?.name || user?.full_name || user?.username || i18n.t('pages.user_menu.k0');
    const displayEmail = user?.email || user?.username || '';
    const currentTenant = tenantName || localStorage.getItem('current_tenant_id') || '';
    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
    };
    const handleProfileClick = () => {
        handleMenuClose();
        if (onProfileClick) {
            onProfileClick();
        }
    };
    const handleAccountSettingsClick = () => {
        handleMenuClose();
        if (onAccountSettingsClick) {
            onAccountSettingsClick();
        }
    };
    const handleHelpCenterClick = () => {
        handleMenuClose();
        if (onHelpCenterClick) {
            onHelpCenterClick();
        }
    };
    const handleLogoutRequest = () => {
        handleMenuClose();
        setConfirmOpen(true);
    };
    const handleLogoutConfirm = () => {
        setConfirmOpen(false);
        if (onLogout) {
            onLogout();
        }
        else {
            authLogout();
        }
    };
    const handleLogoutCancel = () => {
        setConfirmOpen(false);
    };
    return (<>
      <Tooltip title={i18n.t('pages.user_menu.k1')}>
        <IconButton size='small' aria-label={i18n.t('pages.user_menu.k2')} aria-controls={menuOpen ? 'user-menu' : undefined} aria-haspopup='true' aria-expanded={menuOpen ? 'true' : undefined} onClick={handleMenuOpen} sx={{
            width: 36,
            height: 36,
            '&:hover': {
                bgcolor: 'action.hover',
            },
        }}>
          <Avatar sx={{
            width: 36,
            height: 36,
            fontSize: 14,
            background: 'linear-gradient(135deg, primary.main, secondary.main)',
            color: 'common.white',
            fontWeight: 600,
        }}>
            {initials}
          </Avatar>
        </IconButton>
      </Tooltip>

      <Menu id='user-menu' anchorEl={anchorEl} open={menuOpen} onClose={handleMenuClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} sx={{
            mt: 1.5,
            '& .MuiMenu-paper': {
                borderRadius: 2,
                minWidth: 240,
            },
        }} slotProps={{
            paper: {
                elevation: 3,
            },
        }}>
        <Box sx={{
            px: 2,
            py: 2,
            borderBottom: 1,
            borderColor: 'divider',
            mb: 0.5,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{
            width: 44,
            height: 44,
            background: 'linear-gradient(135deg, primary.main, secondary.main)',
            color: 'common.white',
            fontWeight: 600,
            fontSize: 16,
        }}>
              {initials}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant='subtitle2' sx={{
            fontWeight: 600,
            color: 'text.primary',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
        }}>
                {displayName}
              </Typography>
              <Typography variant='caption' sx={{
            color: 'text.secondary',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
        }}>
                {displayEmail}
              </Typography>
              {currentTenant && (<Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                mt: 0.5,
            }}>
                  <Building2 sx={{ width: 12, height: 12, color: 'text.secondary' }}/>
                  <Typography variant='caption' sx={{
                color: 'text.secondary',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            }}>
                    {currentTenant}
                  </Typography>
                </Box>)}
            </Box>
          </Box>
        </Box>

        <MenuItem onClick={handleProfileClick} sx={{
            py: 1.25,
        }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <User style={{ width: 18, height: 18 }}/>
          </ListItemIcon>
          <ListItemText>{i18n.t('pages.user_menu.k3')}</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleAccountSettingsClick} sx={{
            py: 1.25,
        }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Settings style={{ width: 18, height: 18 }}/>
          </ListItemIcon>
          <ListItemText>{i18n.t('pages.user_menu.k4')}</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleHelpCenterClick} sx={{
            py: 1.25,
        }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <HelpCircle style={{ width: 18, height: 18 }}/>
          </ListItemIcon>
          <ListItemText primary={<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant='body2'>{i18n.t("layouts.userMenu.k0")}</Typography>
                <Typography variant='caption' sx={{
                color: 'text.disabled',
                fontFamily: 'monospace',
                bgcolor: 'action.hover',
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                ml: 2,
            }}>
                  ⌘?
                </Typography>
              </Box>}/>
        </MenuItem>

        <Divider sx={{ my: 0.5 }}/>

        <MenuItem onClick={handleLogoutRequest} sx={{
            py: 1.25,
            color: 'error.main',
            '&:hover': {
                bgcolor: 'error.50',
                color: 'error.dark',
            },
        }}>
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
            <LogOut style={{ width: 18, height: 18 }}/>
          </ListItemIcon>
          <ListItemText sx={{
            '& .MuiListItemText-primary': {
                fontWeight: 600,
                color: 'error.main',
            },
        }}>
            {i18n.t('layouts.user_menu.k0')}
          </ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={confirmOpen} onClose={handleLogoutCancel} aria-labelledby='logout-confirm-dialog-title' aria-describedby='logout-confirm-dialog-description' sx={{
            '& .MuiDialog-paper': {
                borderRadius: 3,
                minWidth: 360,
            },
        }}>
        <DialogTitle id='logout-confirm-dialog-title' sx={{
            pb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
        }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: 'warning.50',
            color: 'warning.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
        }}>
            <AlertTriangle style={{ width: 22, height: 22 }}/>
          </Box>
          <Typography variant='h6' component='span' sx={{ fontWeight: 600 }}>
            {i18n.t('layouts.user_menu.k1')}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id='logout-confirm-dialog-description' sx={{ color: 'text.secondary', pl: 9 }}>
            {i18n.t('layouts.user_menu.k2')}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={handleLogoutCancel} variant='outlined' size='small' color='inherit' sx={{
            textTransform: 'none',
            borderRadius: 1.5,
            px: 2.5,
        }}>
            {i18n.t('layouts.user_menu.k3')}
          </Button>
          <Button onClick={handleLogoutConfirm} variant='contained' color='error' size='small' autoFocus startIcon={<LogOut style={{ width: 16, height: 16 }}/>} sx={[{
            textTransform: 'none',
            borderRadius: (theme) => theme.shape.radii.md,
            px: 3,
            boxShadow: (theme) => theme.customShadows.dangerButton,
            '&:hover': {
                boxShadow: (theme) => theme.customShadows.dangerButtonHover,
            },
          }, (theme) => ({
            ...theme.applyStyles('dark', {
              boxShadow: themeCustomShadows.dark.dangerButton,
              '&:hover': { boxShadow: themeCustomShadows.dark.dangerButtonHover },
            }),
            // data-theme="cyberpunk"
            [`[data-theme="cyberpunk"] &`]: {
              boxShadow: themeCustomShadows.cyberpunk.dangerButton,
              '&:hover': { boxShadow: themeCustomShadows.cyberpunk.dangerButtonHover },
            },
          })]}>
            {i18n.t('layouts.user_menu.k4')}
          </Button>
        </DialogActions>
      </Dialog>
    </>);
};
export default UserMenu;
