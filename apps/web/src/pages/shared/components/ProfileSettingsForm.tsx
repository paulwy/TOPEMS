/**
 * @done V79 Phase 2 split
 * ProfileSettingsForm - Basic settings form (Tab 0).
 * Fields: Name / Email / Username (read-only) + Save/Reset buttons
 */
import React from 'react';
import { Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Box, TextField, Button } from '@mui/material';
import type { UseProfileReturn } from '../hooks/useProfile';

export interface ProfileSettingsFormProps {
  profile: UseProfileReturn;
}

export const ProfileSettingsForm: React.FC<ProfileSettingsFormProps> = ({ profile }) => {
  const { t } = useTranslation();
  const { user, profileForm, handleProfileUpdate } = profile;

  if (!user) return null;

  return (
    <Box
      component='form'
      onSubmit={profileForm.handleSubmit(handleProfileUpdate)}
      sx={{ '& > :not(style)': { mb: 3 } }}
    >
      <TextField
        fullWidth
        label={t('shared.profile.field_name')}
        {...profileForm.register('full_name')}
        placeholder={t('shared.profile.field_name_ph')}
        size='small'
      />
      <Box>
        <TextField
          fullWidth
          label={t('shared.profile.field_email_required')}
          type='email'
          {...profileForm.register('email', {
            required: t('shared.profile.field_email_required_err'),
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\\\.[A-Z]{2,}$/i,
              message: t('shared.profile.field_email_invalid'),
            },
          })}
          placeholder={t('shared.profile.field_email_ph')}
          error={!!profileForm.formState.errors.email}
          helperText={profileForm.formState.errors.email?.message}
          size='small'
        />
      </Box>
      <TextField
        fullWidth
        label={t('shared.profile.field_username')}
        value={user.username}
        disabled
        size='small'
      />
      <Box sx={{ display: 'flex', gap: 1.5, pt: 2 }}>
        <Button
          type='submit'
          variant='contained'
          startIcon={<Save size={16} />}
        >
          {t('shared.profile.save_changes')}
        </Button>
        <Button
          type='button'
          variant='outlined'
          onClick={() => profileForm.reset()}
        >
          {t('shared.profile.reset')}
        </Button>
      </Box>
    </Box>
  );
};

export default ProfileSettingsForm;
