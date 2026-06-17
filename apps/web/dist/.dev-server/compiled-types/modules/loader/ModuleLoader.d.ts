/**
 * ModuleLoader - Lazy loading component for modules
 */
import React from 'react';
interface ModuleLoaderProps {
    /** Component to load */
    component: () => Promise<any>;
    /** Loading fallback */
    fallback?: React.ReactNode;
    /** Error fallback */
    errorFallback?: React.ReactNode;
}
/**
 * Loading Fallback Component
 */
export declare const ModuleLoadingFallback: React.FC;
/**
 * Error Fallback Component
 */
export declare const ModuleErrorFallback: React.FC<{
    error?: Error;
}>;
/**
 * Lazy Module Loader Component
 */
export declare const ModuleLoader: React.FC<ModuleLoaderProps>;
/**
 * Dynamic Module Loader with retry support
 */
export declare class DynamicModuleLoader {
    private cache;
    private retryCount;
    private maxRetries;
    loadModule(component: () => Promise<any>, moduleId?: string): Promise<any>;
    clearCache(moduleId?: string): void;
}
export declare const moduleLoader: DynamicModuleLoader;
export interface ModuleRouteWrapperProps {
    routePath: string;
    component: () => Promise<any>;
    moduleId?: string;
    fallback?: React.ReactNode;
}
/**
 * Route Wrapper with automatic module loading
 */
export declare const ModuleRouteWrapper: React.FC<ModuleRouteWrapperProps>;
export {};
