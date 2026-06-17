import type { LoginRequest, LoginResponse, User } from '@topems/shared-types';
export declare const authApi: {
    login: (data: LoginRequest) => Promise<LoginResponse>;
    logout: () => Promise<void>;
    refresh: (refreshToken: string) => Promise<LoginResponse>;
    getCurrentUser: () => Promise<User>;
};
