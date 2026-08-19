import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { PLUGIN_TIMEOUT } from '@topems/shared-constants';
import i18n from '@/i18n';

export interface ServiceInfo {
  key: string;
  name: string;
  port: number;
}

// 服务元数据配置（使用 i18n key 而非模块级 t() 调用）
// —— 模块加载期 i18n 资源尚未注入，此时调用 i18n.t 只会得到未翻译的原始 key，
//    且语言切换时无法响应更新。改为运行时按当前语言翻译并通过 i18n.language 做 memo。
const SERVICE_CONFIGS: ReadonlyArray<Omit<ServiceInfo, 'name'> & { nameKey: string }> = [
  { key: 'unified-core', nameKey: 'shared.use_service_status.k0', port: 8000 },
  { key: 'pm', nameKey: 'shared.use_service_status.k1', port: 8023 },
  { key: 'integration', nameKey: 'shared.use_service_status.k2', port: 8072 },
  { key: 'erp', nameKey: 'shared.use_service_status.k3', port: 8010 },
  { key: 'hrm', nameKey: 'shared.use_service_status.k4', port: 8020 },
  { key: 'crm', nameKey: 'shared.use_service_status.k5', port: 8029 },
  { key: 'rd', nameKey: 'shared.use_service_status.k6', port: 8053 },
  { key: 'mes', nameKey: 'shared.use_service_status.k7', port: 8030 },
  { key: 'pdm', nameKey: 'shared.use_service_status.k8', port: 8031 },
  { key: 'qms', nameKey: 'shared.use_service_status.k9', port: 8050 },
  { key: 'lims', nameKey: 'shared.use_service_status.k10', port: 8051 },
  { key: 'ehs', nameKey: 'shared.use_service_status.k11', port: 8052 },
  { key: 'scm', nameKey: 'shared.use_service_status.k12', port: 8040 },
  { key: 'srm', nameKey: 'shared.use_service_status.k13', port: 8042 },
  { key: 'wms', nameKey: 'shared.use_service_status.k14', port: 8041 },
  { key: 'bi', nameKey: 'shared.use_service_status.k15', port: 8060 },
  { key: 'portal', nameKey: 'shared.use_service_status.k16', port: 8063 },
  { key: 'gis', nameKey: 'shared.use_service_status.k17', port: 8071 },
  { key: 'mobile', nameKey: 'shared.use_service_status.k18', port: 8070 },
  { key: 'finance', nameKey: 'shared.use_service_status.k19', port: 8011 },
  { key: 'ai', nameKey: 'shared.use_service_status.k20', port: 8013 },
  { key: 'communication', nameKey: 'shared.use_service_status.k21', port: 8084 },
  { key: 'monitor', nameKey: 'shared.use_service_status.k22', port: 8095 },
];

// 连续失败多少次后进入冷却阶段。开发环境多数后端服务未启动时，
// 避免每 ~30s 重复打 20 个 health 请求（每次都产生 ERR_ABORTED 控制台噪音）。
const FAIL_COOLDOWN_THRESHOLD = 3;
// 冷却持续时间（毫秒）：10 分钟内只重试一次，验证是否回归在线
const FAIL_COOLDOWN_MS = 10 * 60 * 1000;
// health 检查的超时更短（默认超时过长会放大 ERR_ABORTED 数量）
const HEALTH_TIMEOUT_MS = 3000;

export const useServiceStatus = (autoRefreshInterval: number = PLUGIN_TIMEOUT.DEFAULT) => {
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<number | null>(null);

  // 连续失败次数 & 冷却截止时间戳（组件生命周期内持久化，不触发 rerender）
  const consecutiveFailsRef = useRef<Record<string, number>>({});
  const cooldownUntilRef = useRef<Record<string, number>>({});

  // 运行时按当前语言翻译服务名称，语言变化时重新计算
  const services: ServiceInfo[] = useMemo(
    () =>
      SERVICE_CONFIGS.map((cfg) => ({
        key: cfg.key,
        port: cfg.port,
        name: i18n.t(cfg.nameKey),
      })),
    [i18n.language]
  );

  const checkServiceStatus = useCallback(async (serviceKey: string): Promise<boolean> => {
    // 冷却期：跳过实际 HTTP 请求，直接返回已知的离线状态，避免 ERR_ABORTED 刷屏
    const cooldownUntil = cooldownUntilRef.current[serviceKey] || 0;
    if (cooldownUntil > Date.now()) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

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
      const ok = response.ok;
      // 成功：清零失败计数，移除冷却
      if (ok) {
        consecutiveFailsRef.current[serviceKey] = 0;
        delete cooldownUntilRef.current[serviceKey];
      }
      return ok;
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === 'AbortError';
      const errorType = (error as { type?: string })?.type;
      const isNetErr = isAbort || errorType === 'fetch' || errorType === 'network';

      // 失败（尤其是 AbortError / network 类，表示服务未启动）：
      // 累加计数，达到阈值后进入冷却，大幅降低请求频率
      if (isNetErr || !isAbort) {
        const next = (consecutiveFailsRef.current[serviceKey] || 0) + 1;
        consecutiveFailsRef.current[serviceKey] = next;
        if (next >= FAIL_COOLDOWN_THRESHOLD) {
          cooldownUntilRef.current[serviceKey] = Date.now() + FAIL_COOLDOWN_MS;
        }
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
  }, [checkServiceStatus, services]);

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

  const getOnlineCount = useCallback(() => {
    return Object.values(serviceStatuses).filter(Boolean).length;
  }, [serviceStatuses]);

  const isServiceOnline = useCallback((serviceKey: string): boolean => {
    return serviceStatuses[serviceKey] || false;
  }, [serviceStatuses]);

  return useMemo(
    () => ({
      serviceStatuses,
      isLoading,
      refresh: checkAllServicesStatus,
      getOnlineCount,
      isServiceOnline,
      services,
    }),
    [serviceStatuses, isLoading, checkAllServicesStatus, getOnlineCount, isServiceOnline, services]
  );
};
