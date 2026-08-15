import React, { Suspense, lazy, useEffect, useState, useCallback } from 'react';
import { CircularProgress, Box, Typography, Alert, AlertTitle } from '@mui/material';
import { LOADER_TIMEOUT } from '@topems/shared-constants';
import { EventEmitter } from 'eventemitter3';
import i18n from '@/i18n';
export interface PluginManifest {
    pluginCode: string;
    version: string;
    name: string;
    description: string;
    icon: string;
    routes: PluginRoute[];
    menus: PluginMenu[];
    permissions: string[];
    dependencies: string[];
    frontend: {
        type: 'systemjs' | 'module-federation' | 'umd';
        entry: string;
        fallback?: string;
        shared?: string[];
    };
}
export interface PluginRoute {
    path: string;
    component: string;
    exact?: boolean;
}
export interface PluginMenu {
    id: string;
    title: string;
    icon: string;
    path: string;
    parent?: string;
    pluginCode: string;
}
export interface PluginInfo {
    code: string;
    name: string;
    version: string;
    status: 'installing' | 'installed' | 'running' | 'error' | 'disabled' | 'uninstalling';
    manifest?: PluginManifest;
    error?: string;
    loadedAt?: Date;
    lastErrorAt?: Date;
    retryCount?: number;
}
export interface PluginLoaderOptions {
    maxSizeBytes?: number;
    timeout?: number;
    maxRetries?: number;
}
const DEFAULT_MAX_SIZE = 1 * 1024 * 1024;
const DEFAULT_TIMEOUT = LOADER_TIMEOUT.PLUGIN;
const DEFAULT_MAX_RETRIES = 3;
export const ModuleLoadingFallback: React.FC = () => (<Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: 200,
        gap: 2,
    }}>
    <CircularProgress size={40}/>
    <Typography variant='body2' color='text.secondary'>
      {i18n.t('lib.plugin_loader.k0')}
    </Typography>
  </Box>);
export const ModuleErrorFallback: React.FC<{
    error?: Error;
}> = ({ error }) => (<Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: 200,
        gap: 2,
        p: 3,
    }}>
    <Typography variant='h6' color='error'>
      {i18n.t('lib.plugin_loader.k1')}
    </Typography>
    {error && (<Typography variant='body2' color='text.secondary'>
        {error.message}
      </Typography>)}
  </Box>);
export class PluginLoader {
    private cache: Map<string, any> = new Map();
    private retryCount: Map<string, number> = new Map();
    private loadedPlugins: Map<string, PluginInfo> = new Map();
    private options: PluginLoaderOptions;
    private systemJS?: {
        import: (modulePath: string) => Promise<any>;
    };
    private maxRetries = 3;
    public readonly emitter: EventEmitter = new EventEmitter();
    constructor(options: PluginLoaderOptions = {}) {
        this.options = {
            maxSizeBytes: options.maxSizeBytes || DEFAULT_MAX_SIZE,
            timeout: options.timeout || DEFAULT_TIMEOUT,
            maxRetries: options.maxRetries || DEFAULT_MAX_RETRIES,
        };
    }
    async initSystemJS(): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        if (typeof window !== 'undefined' && (window as unknown as {
            System?: unknown;
        }).System) {
            this.systemJS = // eslint-disable-next-line @typescript-eslint/naming-convention
                (window as unknown as {
                    System: {
                        import: (modulePath: string) => Promise<any>;
                    };
                }).System;
        }
        else {
            await this.loadSystemJS();
        }
    }
    private async loadSystemJS(): Promise<void> {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/systemjs@6.14.0/dist/system.min.js';
            script.onload = () => {
                this.systemJS = (window as unknown as Record<string, {
                    import: (modulePath: string) => Promise<any>;
                }>).System;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    async loadPlugin(pluginCode: string, manifest: PluginManifest): Promise<PluginInfo> {
        const existing = this.loadedPlugins.get(pluginCode);
        if (existing && existing.status === 'running') {
            return existing;
        }
        const pluginInfo: PluginInfo = {
            code: pluginCode,
            name: manifest.name,
            version: manifest.version,
            status: 'installing',
            manifest,
            retryCount: existing?.retryCount || 0,
        };
        this.loadedPlugins.set(pluginCode, pluginInfo);
        this.emitter.emit('pluginInstalling', pluginCode, pluginInfo);
        try {
            await this.validateManifest(manifest);
            await this.checkDependencies(manifest);
            pluginInfo.status = 'installed';
            this.emitter.emit('pluginInstalled', pluginCode, pluginInfo);
            if (manifest.frontend) {
                await this.loadFrontendBundle(pluginCode, manifest.frontend);
            }
            pluginInfo.status = 'running';
            pluginInfo.loadedAt = new Date();
            pluginInfo.lastErrorAt = undefined;
            pluginInfo.retryCount = 0;
            this.loadedPlugins.set(pluginCode, pluginInfo);
            this.emitter.emit('pluginRunning', pluginCode, pluginInfo);
            return pluginInfo;
        }
        catch (error: unknown) {
            const errorMessage = error instanceof Error ? (error as {
                message?: string;
            }).message : 'Unknown error';
            pluginInfo.status = 'error';
            pluginInfo.error = errorMessage;
            pluginInfo.lastErrorAt = new Date();
            pluginInfo.retryCount = (pluginInfo.retryCount || 0) + 1;
            this.loadedPlugins.set(pluginCode, pluginInfo);
            this.emitter.emit('pluginError', pluginCode, pluginInfo);
            throw error;
        }
    }
    private async validateManifest(manifest: PluginManifest): Promise<void> {
        if (!manifest.pluginCode || !manifest.version) {
            throw new Error('Invalid plugin manifest: missing pluginCode or version');
        }
    }
    private async checkDependencies(manifest: PluginManifest): Promise<void> {
        const missingDeps: string[] = [];
        for (const dep of manifest.dependencies) {
            if (!this.loadedPlugins.has(dep) || this.loadedPlugins.get(dep)?.status !== 'running') {
                missingDeps.push(dep);
            }
        }
        if (missingDeps.length > 0) {
            throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
        }
    }
    private async loadFrontendBundle(pluginCode: string, frontend: PluginManifest['frontend']): Promise<void> {
        const cacheKey = `${pluginCode}-${frontend.entry}`;
        if (this.cache.has(cacheKey)) {
            return;
        }
        const retries = this.retryCount.get(cacheKey) || 0;
        try {
            const module = await this.loadBundle(frontend);
            this.cache.set(cacheKey, module);
            this.retryCount.delete(cacheKey);
        }
        catch (error: unknown) {
            if (retries < (this.options.maxRetries || DEFAULT_MAX_RETRIES)) {
                this.retryCount.set(cacheKey, retries + 1);
                await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000));
                return this.loadFrontendBundle(pluginCode, frontend);
            }
            throw error;
        }
    }
    public async loadBundle(frontend: PluginManifest['frontend']): Promise<any> {
        switch (frontend.type) {
            case 'systemjs':
                if (!this.systemJS) {
                    await this.initSystemJS();
                }
                return this.systemJS!.import(frontend.entry);
            case 'module-federation':
                return import(/* @vite-ignore */ frontend.entry);
            case 'umd':
                return this.loadUMDBundle(frontend.entry);
            default:
                throw new Error(`Unsupported frontend type: ${frontend.type}`);
        }
    }
    private async loadUMDBundle(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.type = 'text/javascript';
            script.onload = () => {
                const globalVar = url.split('/').pop()?.replace('.js', '');
                if (globalVar && (window as unknown as Record<string, unknown>)[globalVar]) {
                    resolve((window as unknown as Record<string, unknown>)[globalVar]);
                }
                else {
                    reject(new Error('UMD module not found in global scope'));
                }
            };
            script.onerror = () => reject(new Error(`Failed to load UMD bundle: ${url}`));
            document.head.appendChild(script);
        });
    }
    async loadModule(component: () => Promise<any>, moduleId?: string): Promise<any> {
        const cacheKey = moduleId || component.toString();
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        const retryKey = moduleId || cacheKey;
        const retries = this.retryCount.get(retryKey) || 0;
        try {
            const module = await component();
            this.cache.set(cacheKey, module);
            this.retryCount.delete(retryKey);
            return module;
        }
        catch (error: unknown) {
            if (retries < this.maxRetries) {
                this.retryCount.set(retryKey, retries + 1);
                await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retries) * 1000));
                return this.loadModule(component, moduleId);
            }
            throw error;
        }
    }
    getPluginInfo(pluginCode: string): PluginInfo | undefined {
        return this.loadedPlugins.get(pluginCode);
    }
    getAllPlugins(): PluginInfo[] {
        return Array.from(this.loadedPlugins.values());
    }
    unloadPlugin(pluginCode: string): void {
        const existing = this.loadedPlugins.get(pluginCode);
        if (existing) {
            existing.status = 'uninstalling';
            this.emitter.emit('pluginUninstalling', pluginCode, existing);
        }
        this.loadedPlugins.delete(pluginCode);
        this.cache.forEach((_, key) => {
            if (key.startsWith(pluginCode)) {
                this.cache.delete(key);
            }
        });
        this.emitter.emit('pluginUninstalled', pluginCode);
    }
    async loadAllPlugins(manifests: PluginManifest[]): Promise<PluginInfo[]> {
        const results: PluginInfo[] = [];
        for (const manifest of manifests) {
            try {
                const pluginInfo = await this.loadPlugin(manifest.pluginCode, manifest);
                results.push(pluginInfo);
            }
            catch {
                continue;
            }
        }
        return results;
    }
    async reloadPlugin(pluginCode: string): Promise<PluginInfo> {
        const existing = this.loadedPlugins.get(pluginCode);
        if (!existing || !existing.manifest) {
            throw new Error(`Plugin ${pluginCode} not found or has no manifest`);
        }
        this.unloadPlugin(pluginCode);
        return this.loadPlugin(pluginCode, existing.manifest);
    }
    getLoadingStatus(): Record<string, PluginInfo> {
        const status: Record<string, PluginInfo> = {};
        this.loadedPlugins.forEach((info, code) => {
            status[code] = info;
        });
        return status;
    }
    clearCache(): void {
        this.cache.clear();
    }
    async loadManifest(url: string): Promise<PluginManifest> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) {
                throw new Error(`Failed to load manifest: ${response.status}`);
            }
            return response.json();
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
}
export const pluginLoader = new PluginLoader();
export interface ModuleLoaderProps {
    component: () => Promise<any>;
    fallback?: React.ReactNode;
    errorFallback?: React.ReactNode;
    moduleId?: string;
}
export const ModuleLoader: React.FC<ModuleLoaderProps> = ({ component, fallback = <ModuleLoadingFallback />, errorFallback = <ModuleErrorFallback />, moduleId, }) => {
    const LazyComponent = lazy(component);
    return (<Suspense fallback={fallback}>
      <LazyComponent />
    </Suspense>);
};
export interface PluginRouteWrapperProps {
    routePath: string;
    component: () => Promise<any>;
    moduleId?: string;
    fallback?: React.ReactNode;
}
export const PluginRouteWrapper: React.FC<PluginRouteWrapperProps> = ({ routePath, component, moduleId, fallback, }) => {
    const [moduleComponent, setModuleComponent] = useState<any>(null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let mounted = true;
        const loadComponent = async () => {
            try {
                setLoading(true);
                const mod = await pluginLoader.loadModule(component, moduleId);
                if (mounted) {
                    setModuleComponent(() => mod.default || mod);
                    setError(null);
                }
            }
            catch (err: unknown) {
                if (mounted) {
                    setError(err as Error);
                }
            }
            finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };
        loadComponent();
        return () => {
            mounted = false;
        };
    }, [routePath, component, moduleId]);
    if (loading) {
        return fallback || <ModuleLoadingFallback />;
    }
    if (error) {
        return <ModuleErrorFallback error={error}/>;
    }
    if (moduleComponent) {
        const Component = moduleComponent;
        return <Component />;
    }
    return null;
};
export interface PluginLoaderProviderProps {
    children: React.ReactNode;
    plugins?: PluginManifest[];
}
export const PluginLoaderProvider: React.FC<PluginLoaderProviderProps> = ({ children, plugins = [], }) => {
    const [loadingPlugins, setLoadingPlugins] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [, setLoadedPlugins] = useState<PluginInfo[]>([]);
    const loadPlugins = useCallback(async () => {
        setLoadingPlugins(plugins.map((p) => p.pluginCode));
        setErrors({});
        const results: PluginInfo[] = [];
        for (const manifest of plugins) {
            try {
                const pluginInfo = await pluginLoader.loadPlugin(manifest.pluginCode, manifest);
                results.push(pluginInfo);
            }
            catch (error: unknown) {
                const msg = error instanceof Error ? error.message : 'Unknown error';
                setErrors((prev) => ({
                    ...prev,
                    [manifest.pluginCode]: msg,
                }));
            }
        }
        setLoadedPlugins(results);
        setLoadingPlugins([]);
    }, [plugins]);
    useEffect(() => {
        if (plugins.length > 0) {
            loadPlugins();
        }
    }, [plugins, loadPlugins]);
    if (loadingPlugins.length > 0) {
        return (<Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                gap: 2,
            }}>
        <CircularProgress size={48}/>
        <Typography variant='h6'>{i18n.t("lib.pluginLoader.k20")} {loadingPlugins.join(', ')}</Typography>
      </Box>);
    }
    if (Object.keys(errors).length > 0) {
        return (<Box sx={{ padding: 3 }}>
        <Alert severity='error'>
          <AlertTitle>{i18n.t('lib.plugin_loader.k3')}</AlertTitle>
          {Object.entries(errors).map(([code, message]) => (<div key={code}>
              {code}: {message}
            </div>))}
        </Alert>
        {children}
      </Box>);
    }
    return <>{children}</>;
};
export default pluginLoader;
