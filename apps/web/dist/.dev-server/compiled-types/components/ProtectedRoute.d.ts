import type { ReactNode } from "react";
import React from "react";
interface ProtectedRouteProps {
    children: ReactNode;
    requiredPermissions?: string[];
    requiredRoles?: string[];
    requireAllPermissions?: boolean;
    fallbackPath?: string;
}
export declare const ProtectedRoute: React.FC<ProtectedRouteProps>;
interface PermissionRouteProps {
    children: ReactNode;
    module: string;
    action?: "read" | "write" | "delete" | "admin";
    fallbackComponent?: ReactNode;
}
export declare const PermissionRoute: React.FC<PermissionRouteProps>;
interface GuestRouteProps {
    children: ReactNode;
}
export declare const GuestRoute: React.FC<GuestRouteProps>;
export default ProtectedRoute;
