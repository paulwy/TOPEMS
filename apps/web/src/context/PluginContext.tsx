import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  Plugin,
  TenantInstalledPlugin,
  PLUGIN_REGISTRY,
  checkAllPluginsHealth,
  pluginApi,
} from "@/api/plugin";

export interface PluginContextType {
  installedPlugins: TenantInstalledPlugin[];
  pluginHealth: Record<string, { healthy: boolean; status?: string; latency?: number }>;
  availablePlugins: Plugin[];
  isLoading: boolean;
  refreshPlugins: () => void;
  installPlugin: (code: string) => Promise<void>;
  uninstallPlugin: (code: string) => Promise<void>;
  enablePlugin: (code: string) => Promise<void>;
  disablePlugin: (code: string) => Promise<void>;
  isPluginInstalled: (code: string) => boolean;
  isPluginActive: (code: string) => boolean;
  isPluginHealthy: (code: string) => boolean;
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

export const usePlugins = () => {
  const context = useContext(PluginContext);
  if (!context) {
    throw new Error("usePlugins must be used within a PluginProvider");
  }
  return context;
};

interface PluginProviderProps {
  children: ReactNode;
}

export const PluginProvider: React.FC<PluginProviderProps> = ({ children }) => {
  const [installedPlugins, setInstalledPlugins] = useState<TenantInstalledPlugin[]>([]);
  const [pluginHealth, setPluginHealth] = useState<Record<string, { healthy: boolean; status?: string; latency?: number }>>({});
  const [availablePlugins, setAvailablePlugins] = useState<Plugin[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlugins = useCallback(async () => {
    setIsLoading(true);
    try {
      const [healthRes, installedRes] = await Promise.all([
        checkAllPluginsHealth(),
        pluginApi.listInstalled(),
      ]);

      setPluginHealth(healthRes);

      if (installedRes.success && installedRes.data) {
        setInstalledPlugins(installedRes.data);
      }
    } catch (error) {
      console.error("Failed to fetch plugins:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlugins();
    const interval = setInterval(fetchPlugins, 30000);
    return () => clearInterval(interval);
  }, [fetchPlugins]);

  const installPlugin = useCallback(async (code: string) => {
    await pluginApi.install(code);
    await fetchPlugins();
  }, [fetchPlugins]);

  const uninstallPlugin = useCallback(async (code: string) => {
    await pluginApi.uninstall(code);
    await fetchPlugins();
  }, [fetchPlugins]);

  const enablePlugin = useCallback(async (code: string) => {
    await pluginApi.enable(code);
    await fetchPlugins();
  }, [fetchPlugins]);

  const disablePlugin = useCallback(async (code: string) => {
    await pluginApi.disable(code);
    await fetchPlugins();
  }, [fetchPlugins]);

  const isPluginInstalled = useCallback((code: string) => {
    return installedPlugins.some((p) => p.plugin_code === code);
  }, [installedPlugins]);

  const isPluginActive = useCallback((code: string) => {
    const plugin = installedPlugins.find((p) => p.plugin_code === code);
    return plugin?.is_active ?? false;
  }, [installedPlugins]);

  const isPluginHealthy = useCallback((code: string) => {
    return pluginHealth[code]?.healthy ?? false;
  }, [pluginHealth]);

  return (
    <PluginContext.Provider
      value={{
        installedPlugins,
        pluginHealth,
        availablePlugins,
        isLoading,
        refreshPlugins: fetchPlugins,
        installPlugin,
        uninstallPlugin,
        enablePlugin,
        disablePlugin,
        isPluginInstalled,
        isPluginActive,
        isPluginHealthy,
      }}
    >
      {children}
    </PluginContext.Provider>
  );
};
