import { useState, useCallback, useEffect, useRef } from "react";

export interface ServiceInfo {
  key: string;
  name: string;
  port: number;
}

const services: ServiceInfo[] = [
  { key: "unified-core", name: "统一核心", port: 8000 },
  { key: "pm", name: "项目管理", port: 8001 },
  { key: "integration", name: "系统集成", port: 8005 },
  { key: "erp", name: "企业资源", port: 8010 },
  { key: "hrm", name: "人力资源", port: 8011 },
  { key: "crm", name: "客户关系", port: 8012 },
  { key: "rs", name: "研发管理", port: 8020 },
  { key: "manufacturing", name: "制造服务", port: 8023 },
  { key: "quality-assurance", name: "质量保证", port: 8032 },
  { key: "scm", name: "供应链管理", port: 8040 },
  { key: "srm", name: "供应商管理", port: 8041 },
  { key: "wms", name: "仓储管理", port: 8042 },
  { key: "gis", name: "地理信息", port: 8053 },
  { key: "ai", name: "AI服务", port: 8062 },
  { key: "mobile", name: "移动服务", port: 8070 },
];

export const useServiceStatus = (autoRefreshInterval: number = 30000) => {
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<number | null>(null);

  const checkServiceStatus = useCallback(
    async (serviceKey: string): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`/${serviceKey}/health`, {
          signal: controller.signal,
          method: "GET",
          headers: { "Cache-Control": "no-cache" },
        });

        clearTimeout(timeoutId);
        return response.ok;
      } catch {
        return false;
      }
    },
    [],
  );

  const checkAllServicesStatus = useCallback(async () => {
    setIsLoading(true);

    const statusPromises = services.map(async (service) => {
      const status = await checkServiceStatus(service.key);
      return { [service.key]: status };
    });

    const results = await Promise.all(statusPromises);
    const newStatuses = Object.assign({}, ...results);

    setServiceStatuses(newStatuses);
    setIsLoading(false);
  }, [checkServiceStatus]);

  useEffect(() => {
    checkAllServicesStatus();

    if (autoRefreshInterval > 0) {
      intervalRef.current = window.setInterval(checkAllServicesStatus, autoRefreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkAllServicesStatus, autoRefreshInterval]);

  const getOnlineCount = () => {
    return Object.values(serviceStatuses).filter(Boolean).length;
  };

  const isServiceOnline = (serviceKey: string): boolean => {
    return serviceStatuses[serviceKey] || false;
  };

  return {
    serviceStatuses,
    isLoading,
    refresh: checkAllServicesStatus,
    getOnlineCount,
    isServiceOnline,
    services,
  };
};
