import React from 'react';
import { Box, TextField, Button } from '@mui/material';
import { Save } from 'lucide-react';
import type { User as UserType } from '@/api/iam';
import { UseFormReturn } from 'react-hook-form';

export interface ProfileFormData {
  full_name: string;
  email: string;
}

interface ProfileInfoPanelProps {
  user: UserType;
  profileForm: UseFormReturn<ProfileFormData>;
  onSubmit: (data: ProfileFormData) => void;
}

const ProfileInfoPanel: React.FC<ProfileInfoPanelProps> = ({
  user,
  profileForm,
  onSubmit,
}) => {
  return (
    <Box
      component='form'
      onSubmit={profileForm.handleSubmit(onSubmit)}
      sx={{ '& > :not(style)': { mb: 3 } }}
    >
      <TextField
        fullWidth
        label='姓名'
        {...profileForm.register('full_name')}
        placeholder='请输入姓名'
        size='small'
      />
      <Box>
        <TextField
          fullWidth
          label='邮箱 *'
          type='email'
          {...profileForm.register('email', {
            required: '邮箱是必填项',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: '请输入有效的邮箱地址',
            },
          })}
          placeholder='请输入邮箱'
          error={!!profileForm.formState.errors.email}
          helperText={profileForm.formState.errors.email?.message}
          size='small'
        />
      </Box>
      <TextField
        fullWidth
        label='用户名'
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
          保存更改
        </Button>
        <Button
          type='button'
          variant='outlined'
          onClick={() => profileForm.reset()}
        >
          重置
        </Button>
      </Box>
    </Box>
  );
};

export default ProfileInfoPanel;
export { ProfileInfoPanel };
