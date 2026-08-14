import { useState, useCallback, useEffect, useRef } from 'react';
import { PLUGIN_TIMEOUT } from '@topems/shared-constants';
import i18n from '@/i18n';

export interface ServiceInfo {
  key: string;
  name: string;
  port: number;
}

const services: ServiceInfo[] = [
  { key: 'unified-core', name: i18n.t('shared.use_service_status.k0'), port: 8000 },
  { key: 'pm', name: i18n.t('shared.use_service_status.k1'), port: 8023 },
  { key: 'integration', name: i18n.t('shared.use_service_status.k2'), port: 8072 },
  { key: 'erp', name: i18n.t('shared.use_service_status.k3'), port: 8010 },
  { key: 'hrm', name: i18n.t('shared.use_service_status.k4'), port: 8020 },
  { key: 'crm', name: i18n.t('shared.use_service_status.k5'), port: 8029 },
  { key: 'rd', name: i18n.t('shared.use_service_status.k6'), port: 8053 },
  { key: 'mes', name: i18n.t('shared.use_service_status.k7'), port: 8030 },
  { key: 'pdm', name: i18n.t('shared.use_service_status.k8'), port: 8031 },
  { key: 'qms', name: i18n.t('shared.use_service_status.k9'), port: 8050 },
  { key: 'lims', name: i18n.t('shared.use_service_status.k10'), port: 8051 },
  { key: 'ehs', name: i18n.t('shared.use_service_status.k11'), port: 8052 },
  { key: 'scm', name: i18n.t('shared.use_service_status.k12'), port: 8040 },
  { key: 'srm', name: i18n.t('shared.use_service_status.k13'), port: 8042 },
  { key: 'wms', name: i18n.t('shared.use_service_status.k14'), port: 8041 },
  { key: 'bi', name: i18n.t('shared.use_service_status.k15'), port: 8060 },
  { key: 'portal', name: i18n.t('shared.use_service_status.k16'), port: 8063 },
  { key: 'gis', name: i18n.t('shared.use_service_status.k17'), port: 8071 },
  { key: 'mobile', name: i18n.t('shared.use_service_status.k18'), port: 8070 },
  { key: 'finance', name: i18n.t('shared.use_service_status.k19'), port: 8011 },
];

export const useServiceStatus = (autoRefreshInterval: number = PLUGIN_TIMEOUT.DEFAULT) => {
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<number | null>(null);

  const checkServiceStatus = useCallback(async (serviceKey: string): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PLUGIN_TIMEOUT.DEFAULT);

      const headers: Record<string, string> = { 'Cache-Control': 'no-cache' };
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/${serviceKey}/health`, {
        signal: controller.signal,
        method: 'GET',
        headers,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return false;
      }
      const errorType = (error as { type?: string })?.type;
      if (errorType === 'fetch' || errorType === 'network') {
        return false;
      }
      return false;
    }
  }, []);

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
