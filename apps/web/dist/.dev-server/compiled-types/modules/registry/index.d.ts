/**
 * TOPEMS Module Registry
 *
 * Manages all available modules/plugins in the system.
 * Supports both static (bundled) and dynamic (remote) modules.
 */
export interface ModuleConfig {
    /** Unique module identifier */
    id: string;
    /** Display name */
    name: string;
    /** Module description */
    description?: string;
    /** Module category */
    category: 'core' | 'business' | 'plugin';
    /** Version */
    version: string;
    /** Entry point for the module */
    entry: string;
    /** Remote URL for dynamic loading (optional) */
    remoteEntry?: string;
    /** Routes provided by this module */
    routes: ModuleRoute[];
    /** Permissions required */
    permissions?: string[];
    /** Dependencies on other modules */
    dependencies?: string[];
    /** Whether this module is enabled by default */
    isDefault?: boolean;
    /** Icon for the module */
    icon?: string;
}
export interface ModuleRoute {
    /** Route path */
    path: string;
    /** Route name */
    name: string;
    /** Component to load */
    component: () => Promise<any>;
    /** Icon for the route */
    icon?: string;
    /** Required permissions */
    permissions?: string[];
    /** Child routes */
    children?: ModuleRoute[];
}
export declare const CORE_MODULES: ModuleConfig[];
export declare const BUSINESS_MODULES: ModuleConfig[];
export declare const PLUGIN_MODULES: ModuleConfig[];
export declare class ModuleRegistry {
    private static instance;
    private modules;
    private enabledModules;
    private constructor();
    static getInstance(): ModuleRegistry;
    private registerModules;
    getModule(id: string): ModuleConfig | undefined;
    getAllModules(): ModuleConfig[];
    getModulesByCategory(category: 'core' | 'business' | 'plugin'): ModuleConfig[];
    getEnabledModules(): ModuleConfig[];
    enableModule(id: string): void;
    disableModule(id: string): void;
    isModuleEnabled(id: string): boolean;
    getAllRoutes(): ModuleRoute[];
    /**
     * Load a remote module dynamically
     */
    loadRemoteModule(moduleId: string): Promise<any>;
}
export declare const moduleRegistry: ModuleRegistry;
export declare function useModules(): {
    registry: ModuleRegistry;
    allModules: ModuleConfig[];
    enabledModules: ModuleConfig[];
    coreModules: ModuleConfig[];
    businessModules: ModuleConfig[];
    pluginModules: ModuleConfig[];
};
export declare function useModuleRoutes(): ModuleRoute[];
