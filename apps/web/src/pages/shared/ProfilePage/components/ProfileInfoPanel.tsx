import React from 'react';
import { Box, TextField, Button } from '@mui/material';
import { Save } from 'lucide-react';
import type { User as UserType } from '@/api/iam';
import type { UseFormReturn } from 'react-hook-form';
import i18n from '@/i18n';

export interface ProfileFormData {
  full_name: string;
  email: string;
}

interface ProfileInfoPanelProps {
  user: UserType;
  profileForm: UseFormReturn<ProfileFormData>;
  onSubmit: (data: ProfileFormData) => void;
}

const ProfileInfoPanel: React.FC<ProfileInfoPanelProps> = ({ user, profileForm, onSubmit }) => {
  return (
    <Box
      component='form'
      onSubmit={profileForm.handleSubmit(onSubmit)}
      sx={{ '& > :not(style)': { mb: 3 } }}
    >
      <TextField
        fullWidth
        label={i18n.t('pages.profile_info_panel.k0')}
        {...profileForm.register('full_name')}
        placeholder={i18n.t('pages.profile_info_panel.k1')}
        size='small'
      />
      <Box>
        <TextField
          fullWidth
          label={i18n.t('pages.profile_info_panel.k0')}
          type='email'
          {...profileForm.register('email', {
            required: i18n.t('pages.profile_info_panel.k2'),
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: i18n.t('pages.profile_info_panel.k3'),
            },
          })}
          placeholder={i18n.t('pages.profile_info_panel.k4')}
          error={!!profileForm.formState.errors.email}
          helperText={profileForm.formState.errors.email?.message}
          size='small'
        />
      </Box>
      <TextField
        fullWidth
        label={i18n.t('pages.profile_info_panel.k5')}
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
          {i18n.t('pages.profile_info_panel.k1')}
        </Button>
        <Button
          type='button'
          variant='outlined'
          onClick={() => profileForm.reset()}
        >
          {i18n.t('pages.profile_info_panel.k2')}
        </Button>
      </Box>
    </Box>
  );
};

export default ProfileInfoPanel;
export { ProfileInfoPanel };
