import { useState, useCallback, useEffect, useRef } from "react";

export interface ServiceInfo {
  key: string;
  name: string;
  port: number;
}

const services: ServiceInfo[] = [
  { key: "iam", name: "身份认证", port: 8000 },
  { key: "doc", name: "文档管理", port: 8001 },
  { key: "pm", name: "项目管理", port: 8002 },
  { key: "notification", name: "通知服务", port: 8003 },
  { key: "integration", name: "系统集成", port: 8004 },
  { key: "portal", name: "统一门户", port: 8005 },
  { key: "flow", name: "流程引擎", port: 8006 },
  { key: "erp", name: "企业资源", port: 8010 },
  { key: "hrm", name: "人力资源", port: 8011 },
  { key: "crm", name: "客户关系", port: 8012 },
  { key: "ai", name: "AI服务", port: 8013 },
  { key: "rs", name: "研发管理", port: 8020 },
  { key: "lims", name: "实验室管理", port: 8022 },
  { key: "pdm", name: "产品数据管理", port: 8023 },
  { key: "mes", name: "制造执行", port: 8030 },
  { key: "qms", name: "质量管理", port: 8031 },
  { key: "ehs", name: "环境安全", port: 8032 },
  { key: "scm", name: "供应链管理", port: 8040 },
  { key: "srm", name: "供应商管理", port: 8041 },
  { key: "wms", name: "仓库管理", port: 8042 },
  { key: "gis", name: "地理信息", port: 8050 },
  { key: "im", name: "即时通讯", port: 8051 },
  { key: "bi", name: "数据分析", port: 8052 },
  { key: "report", name: "报表服务", port: 8053 },
  { key: "mail", name: "邮件服务", port: 8054 },
  { key: "mobile", name: "移动服务", port: 8055 },
];

export const useServiceStatus = (autoRefreshInterval: number = 30000) => {
  const [serviceStatuses, setServiceStatuses] = useState<
    Record<string, boolean>
  >({});
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
      intervalRef.current = window.setInterval(
        checkAllServicesStatus,
        autoRefreshInterval,
      );
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
