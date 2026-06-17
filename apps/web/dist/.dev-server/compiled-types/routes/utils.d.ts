import type { ComponentType, LazyExoticComponent, ReactElement } from "react";
export declare const lazyWithRetry: <T extends ComponentType<any>>(factory: () => Promise<{
    default: T;
}>) => LazyExoticComponent<T>;
export interface RouteConfig {
    path: string;
    element: ReactElement | LazyExoticComponent<ComponentType<any>>;
    requiredPermissions?: string[];
    module?: string;
    action?: "read" | "write" | "delete" | "admin";
}
