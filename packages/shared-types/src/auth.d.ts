export interface User {
    id: string;
    username: string;
    email: string;
    realName: string;
    avatar?: string;
    phone?: string;
    departmentId: string;
    positionId: string;
    status: 'active' | 'inactive' | 'locked';
    permissions: string[];
    createdAt: string;
    updatedAt: string;
}
export interface Role {
    id: string;
    name: string;
    code: string;
    description?: string;
    permissions: string[];
    status: 'active' | 'inactive';
}
export interface Permission {
    id: string;
    code: string;
    name: string;
    type: 'menu' | 'button' | 'api';
    resource?: string;
    action?: string;
}
export interface LoginRequest {
    username: string;
    password: string;
}
export interface LoginResponse {
    token: string;
    refreshToken: string;
    expiresIn: number;
    user: User;
}
export interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    loading: boolean;
}
