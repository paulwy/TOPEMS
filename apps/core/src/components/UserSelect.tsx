import React, { useState, useEffect } from 'react';
import type { User } from '@topems/shared-types';
import { UserSelect as UserSelectUI } from '@topems/shared-components';
import { orgApi } from '../api/org';

interface UserSelectProps {
  value?: User | null;
  onChange?: (user: User | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const UserSelect: React.FC<UserSelectProps> = ({
  value,
  onChange,
  placeholder,
  disabled,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await orgApi.getUsers({ pageSize: 100 });
        setUsers(response.items);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <UserSelectUI
      users={users}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      loading={loading}
    />
  );
};
