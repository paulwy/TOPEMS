import type { User, LoginRequest } from '@topems/shared-types';
export declare const useAuth: () => {
    login: (credentials: LoginRequest) => Promise<import("@topems/shared-types").LoginResponse>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<void>;
    setUser: (user: User) => void;
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
};
