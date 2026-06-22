import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { pluginApi, type TenantInstalledPlugin } from "@/api/plugin";

interface PluginContextType {
  installedPlugins: TenantInstalledPlugin[];
  isPluginInstalled: (pluginCode: string) => boolean;
  refresh: () => Promise<void>;
  loading: boolean;
}

const PluginContext = createContext<PluginContextType | null>(null);

// Mock tenant ID for development
const MOCK_TENANT_ID = "00000000-0000-0000-0000-000000000001";

export const PluginProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [installedPlugins, setInstalledPlugins] = useState<TenantInstalledPlugin[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInstalledPlugins = useCallback(async () => {
    try {
      // Set default tenant ID if not set
      if (!localStorage.getItem("tenant_id")) {
        localStorage.setItem("tenant_id", MOCK_TENANT_ID);
      }
      
      const res = await pluginApi.listInstalled();
      if (res.success && res.data) {
        setInstalledPlugins(res.data);
      }
    } catch (err) {
      console.warn("加载已安装插件失败:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const isPluginInstalled = useCallback((pluginCode: string): boolean => {
    return installedPlugins.some((p) => p.plugin_code === pluginCode);
  }, [installedPlugins]);

  // Initial load
  useEffect(() => {
    loadInstalledPlugins();

    // Refresh every 30 seconds
    const interval = setInterval(loadInstalledPlugins, 30000);
    return () => clearInterval(interval);
  }, [loadInstalledPlugins]);

  return (
    <PluginContext.Provider
      value={{
        installedPlugins,
        isPluginInstalled,
        refresh: loadInstalledPlugins,
        loading,
      }}
    >
      {children}
    </PluginContext.Provider>
  );
};

export const useInstalledPlugins = (): PluginContextType => {
  const context = useContext(PluginContext);
  if (!context) {
    throw new Error("useInstalledPlugins must be used within a PluginProvider");
  }
  return context;
};
