import React from 'react';
import type { User } from '@topems/shared-types';
interface UserSelectProps {
    value?: User | null;
    onChange?: (user: User | null) => void;
    placeholder?: string;
    disabled?: boolean;
}
export declare const UserSelect: React.FC<UserSelectProps>;
export {};
