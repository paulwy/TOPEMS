/**
 * @done V79 Phase 2 split
 * ProfileSecurityForm - Security settings (Tab 1).
 * Includes: Change password entry / Email verification status / Login session logout
 * Also hosts the change password Dialog (only triggered in Tab 1, hence in this component)
 */
import React from 'react';
import { Shield, Mail, Settings, Save, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useTheme,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { designTokens } from '@/theme/tokens';
import type { UseProfileReturn } from '../hooks/useProfile';

const ct = designTokens.colors;

export interface ProfileSecurityFormProps {
  profile: UseProfileReturn;
}

const ProfileSecurityForm: React.FC<ProfileSecurityFormProps> = ({ profile }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const {
    user,
    showPasswordDialog,
    passwordForm,
    openPasswordDialog,
    closePasswordDialog,
    handlePasswordChange,
    handleLogout,
  } = profile;

  if (!user) return null;

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
                {t('shared.profile.change_password')}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('shared.profile.change_password_desc')}
              </Typography>
            </Box>
          </Box>
          <Button
            variant='contained'
            onClick={openPasswordDialog}
          >
            {t('shared.profile.change_password')}
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
                {t('shared.profile.email_verification')}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {user.email} {t('shared.profile.verified')}
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
                {t('shared.profile.login_status')}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('shared.profile.session_active')}
              </Typography>
            </Box>
          </Box>
          <Button
            variant='outlined'
            onClick={handleLogout}
          >
            {t('shared.profile.logout')}
          </Button>
        </Box>
      </Box>

      <Dialog
        open={showPasswordDialog}
        onClose={closePasswordDialog}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('shared.profile.change_password')}</DialogTitle>
        <Box
          component='form'
          onSubmit={passwordForm.handleSubmit(handlePasswordChange)}
        >
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('shared.profile.pwd_dialog_desc')}
            </Typography>
            <TextField
              fullWidth
              label={t('shared.profile.field_current_pwd_required')}
              type='password'
              {...passwordForm.register('current_password', {
                required: t('shared.profile.field_current_pwd_required_err'),
              })}
              placeholder={t('shared.profile.field_current_pwd_ph')}
              error={!!passwordForm.formState.errors.current_password}
              helperText={passwordForm.formState.errors.current_password?.message}
              size='small'
            />
            <TextField
              fullWidth
              label={t('shared.profile.field_new_pwd_required')}
              type='password'
              {...passwordForm.register('new_password', {
                required: t('shared.profile.field_new_pwd_required_err'),
                minLength: { value: 6, message: t('shared.profile.pwd_min_length') },
              })}
              placeholder={t('shared.profile.field_new_pwd_ph')}
              error={!!passwordForm.formState.errors.new_password}
              helperText={passwordForm.formState.errors.new_password?.message}
              size='small'
            />
            <TextField
              fullWidth
              label={t('shared.profile.field_confirm_pwd_required')}
              type='password'
              {...passwordForm.register('confirm_password', {
                required: t('shared.profile.field_confirm_pwd_ph'),
              })}
              placeholder={t('shared.profile.field_confirm_pwd_ph')}
              error={!!passwordForm.formState.errors.confirm_password}
              helperText={passwordForm.formState.errors.confirm_password?.message}
              size='small'
            />
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={closePasswordDialog}
            >
              {t('shared.profile.cancel')}
            </Button>
            <Button
              type='submit'
              variant='contained'
              startIcon={<Save size={16} />}
            >
              {t('shared.profile.confirm_change')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </>
  );
};

export default ProfileSecurityForm;
