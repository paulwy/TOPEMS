import React from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import i18n from 'i18next';
import type { User } from '@topems/shared-types';

export interface UserSelectProps {
  users: User[];
  value?: User | null;
  onChange?: (user: User | null) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

// MUI v6+ 不再支持 InputProps，需要使用 slotProps
// 为了兼容性，使用 any 类型绕过类型检查
export const UserSelect: React.FC<UserSelectProps> = ({
  users,
  value,
  onChange,
  placeholder = i18n.t('shared.user_select.placeholder') || 'Select user',
  disabled,
  loading = false,
}) => {
  return (
    <Autocomplete<User>
      value={value}
      onChange={(_, newValue: User | null) => onChange?.(newValue)}
      options={users}
      getOptionLabel={(user: User) => `${user.realName} (${user.username})`}
      renderOption={(props: React.HTMLAttributes<HTMLLIElement>, user: User) => (
        <li {...props} key={user.id}>
          <div>
            <div>{user.realName}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--mui-palette-text-secondary)' }}>{user.email}</div>
          </div>
        </li>
      )}
      loading={loading}
      disabled={disabled}
      renderInput={(params) => {
        // 使用 any 绕过 MUI 版本差异的类型检查
        const anyParams = params as any;
        return (
          <TextField
            {...anyParams}
            label={placeholder}
            slotProps={{
              input: {
                ...anyParams.slotProps?.input,
                endAdornment: (
                  <>
                    {loading ? <CircularProgress color="inherit" size={20} /> : null}
                    {anyParams.slotProps?.input?.endAdornment}
                  </>
                ),
              },
            }}
          />
        );
      }}
    />
  );
};
