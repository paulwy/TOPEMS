import type { User, AuthState } from '@topems/shared-types';
interface AuthStore extends AuthState {
    login: (token: string, refreshToken: string, user: User) => void;
    logout: () => void;
    setUser: (user: User) => void;
    setToken: (token: string) => void;
}
export declare const useAuthStore: import("zustand").UseBoundStore<import("zustand").StoreApi<AuthStore>>;
export {};
