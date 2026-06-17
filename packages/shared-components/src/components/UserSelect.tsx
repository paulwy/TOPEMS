import React from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import type { User } from '@topems/shared-types';

interface UserSelectProps {
  users: User[];
  value?: User | null;
  onChange?: (user: User | null) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
}

export const UserSelect: React.FC<UserSelectProps> = ({
  users,
  value,
  onChange,
  placeholder = '选择用户',
  disabled,
  loading = false,
}) => {
  return (
    <Autocomplete
      value={value}
      onChange={(_, newValue) => onChange?.(newValue)}
      options={users}
      getOptionLabel={(user) => `${user.realName} (${user.username})`}
      renderOption={(_, user) => (
        <div>
          <div>{user.realName}</div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>{user.email}</div>
        </div>
      )}
      loading={loading}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          label={placeholder}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};
