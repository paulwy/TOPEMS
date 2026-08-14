import React from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  useTheme,
} from '@mui/material';
import i18n from '@/i18n';
import { Shield, Mail, Settings, CheckCircle2, Save } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import { AUTH_PATHS } from '@/routes/auth';
import type { UseFormReturn } from 'react-hook-form';
import type { User as UserType } from '@/api/iam';

export interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface ProfileSecurityPanelProps {
  user: UserType;
  showPasswordDialog: boolean;
  passwordForm: UseFormReturn<PasswordFormData>;
  onOpenPasswordDialog: () => void;
  onClosePasswordDialog: () => void;
  onPasswordChangeSubmit: (data: PasswordFormData) => void;
  onLogout: () => void;
  navigate: (path: string) => void;
}

const ct= designTokens.colors;

const ProfileSecurityPanel: React.FC<ProfileSecurityPanelProps> = ({
  user,
  showPasswordDialog,
  passwordForm,
  onOpenPasswordDialog,
  onClosePasswordDialog,
  onPasswordChangeSubmit,
  onLogout,
  navigate,
}) => {
  const theme = useTheme();

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            bgcolor: 'grey.100',
            borderRadius: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Shield
              size={20}
              style={{ color: theme.palette.primary.dark }}
            />
            <Box>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 500 }}
              >
                {i18n.t('pages.profile_security_panel.k0')}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('pages.profile_security_panel.k1')}
              </Typography>
            </Box>
          </Box>
          <Button
            variant='contained'
            onClick={onOpenPasswordDialog}
          >
            {i18n.t('pages.profile_security_panel.k2')}
          </Button>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            bgcolor: 'grey.100',
            borderRadius: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Mail
              size={20}
              style={{ color: theme.palette.success.dark }}
            />
            <Box>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 500 }}
              >
                {i18n.t('pages.profile_security_panel.k3')}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {user.email} 已验证
              </Typography>
            </Box>
          </Box>
          <CheckCircle2
            size={20}
            style={{ color: theme.palette.success.dark }}
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            bgcolor: 'grey.100',
            borderRadius: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Settings
              size={20}
              style={{ color: ct.purple[600] }}
            />
            <Box>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 500 }}
              >
                {i18n.t('pages.profile_security_panel.k4')}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {i18n.t('pages.profile_security_panel.k5')}
              </Typography>
            </Box>
          </Box>
          <Button
            variant='outlined'
            onClick={() => {
              onLogout();
              navigate(AUTH_PATHS.login);
            }}
          >
            {i18n.t('pages.profile_security_panel.k6')}
          </Button>
        </Box>
      </Box>

      <Dialog
        open={showPasswordDialog}
        onClose={onClosePasswordDialog}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{i18n.t('pages.profile_security_panel.k0')}</DialogTitle>
        <Box
          component='form'
          onSubmit={passwordForm.handleSubmit(onPasswordChangeSubmit)}
        >
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {i18n.t('pages.profile_security_panel.k7')}
            </Typography>
            <TextField
              fullWidth
              label={i18n.t('pages.profile_security_panel.k8')}
              type='password'
              {...passwordForm.register('current_password', {
                required: i18n.t('pages.profile_security_panel.k1'),
              })}
              placeholder={i18n.t('pages.profile_security_panel.k2')}
              error={!!passwordForm.formState.errors.current_password}
              helperText={passwordForm.formState.errors.current_password?.message}
              size='small'
            />
            <TextField
              fullWidth
              label={i18n.t('pages.profile_security_panel.k9')}
              type='password'
              {...passwordForm.register('new_password', {
                required: i18n.t('pages.profile_security_panel.k3'),
                minLength: { value: 6, message: i18n.t('pages.profile_security_panel.6_4') },
              })}
              placeholder={i18n.t('pages.profile_security_panel.6_5')}
              error={!!passwordForm.formState.errors.new_password}
              helperText={passwordForm.formState.errors.new_password?.message}
              size='small'
            />
            <TextField
              fullWidth
              label={i18n.t('pages.profile_security_panel.k10')}
              type='password'
              {...passwordForm.register('confirm_password', {
                required: i18n.t('pages.profile_security_panel.k6'),
              })}
              placeholder={i18n.t('pages.profile_security_panel.k7')}
              error={!!passwordForm.formState.errors.confirm_password}
              helperText={passwordForm.formState.errors.confirm_password?.message}
              size='small'
            />
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={() => {
                onClosePasswordDialog();
                passwordForm.reset();
              }}
            >
              {i18n.t('pages.profile_security_panel.k11')}
            </Button>
            <Button
              type='submit'
              variant='contained'
              startIcon={<Save size={16} />}
            >
              {i18n.t('pages.profile_security_panel.k12')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
};

export default ProfileSecurityPanel;
export { ProfileSecurityPanel };
