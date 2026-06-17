import type { ReactNode } from "react";
import React from "react";
interface PermissionGateProps {
    children: ReactNode;
    permission?: string | string[];
    requireAll?: boolean;
    fallback?: ReactNode;
    showDisabled?: boolean;
    loading?: boolean;
}
export declare const PermissionGate: React.FC<PermissionGateProps>;
interface RoleGateProps {
    children: ReactNode;
    role?: string | string[];
    requireAll?: boolean;
    fallback?: ReactNode;
    showDisabled?: boolean;
    loading?: boolean;
}
export declare const RoleGate: React.FC<RoleGateProps>;
interface ModuleGateProps {
    children: ReactNode;
    module: string;
    action?: "read" | "write" | "delete" | "admin";
    fallback?: ReactNode;
    showDisabled?: boolean;
    loading?: boolean;
}
export declare const ModuleGate: React.FC<ModuleGateProps>;
interface AdminGateProps {
    children: ReactNode;
    fallback?: ReactNode;
    showDisabled?: boolean;
    loading?: boolean;
}
export declare const AdminGate: React.FC<AdminGateProps>;
interface SuperuserGateProps {
    children: ReactNode;
    fallback?: ReactNode;
    showDisabled?: boolean;
    loading?: boolean;
}
export declare const SuperuserGate: React.FC<SuperuserGateProps>;
interface RoleBadgeProps {
    role: string;
    size?: "sm" | "md" | "lg";
    showIcon?: boolean;
}
export declare const RoleBadge: React.FC<RoleBadgeProps>;
interface PermissionBadgeProps {
    permission: string;
    size?: "sm" | "md";
}
export declare const PermissionBadge: React.FC<PermissionBadgeProps>;
export {};
