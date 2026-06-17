import type { ReactNode } from "react";
import React from "react";
export interface User {
    id: string;
    username: string;
    email: string;
    full_name?: string;
    role?: string;
    roles?: string[];
    permissions?: string[];
    created_at: string;
    is_active: boolean;
    is_superuser?: boolean;
}
export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    roles: string[];
    permissions: string[];
}
export interface LoginCredentials {
    username: string;
    password: string;
}
declare const AuthContext: React.Context<(AuthState & {
    login: (credentials: LoginCredentials) => Promise<any>;
    logout: () => void;
    hasPermission: (permission: string) => boolean;
    hasRole: (role: string) => boolean;
    hasAnyPermission: (permissions: string[]) => boolean;
    hasAllPermissions: (permissions: string[]) => boolean;
    refreshPermissions: () => Promise<void>;
    refreshToken: () => Promise<boolean>;
    isSessionExpiringSoon: () => boolean;
    getTimeUntilExpiry: () => number;
}) | null>;
export declare const useAuth: () => AuthState & {
    login: (credentials: LoginCredentials) => Promise<any>;
    logout: () => void;
    hasPermission: (permission: string) => boolean;
    hasRole: (role: string) => boolean;
    hasAnyPermission: (permissions: string[]) => boolean;
    hasAllPermissions: (permissions: string[]) => boolean;
    refreshPermissions: () => Promise<void>;
    refreshToken: () => Promise<boolean>;
    isSessionExpiringSoon: () => boolean;
    getTimeUntilExpiry: () => number;
};
export declare const AuthProvider: React.FC<{
    children: ReactNode;
}>;
export default AuthContext;
