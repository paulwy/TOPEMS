/**
 * @done V79 Phase 2 split - Monitoring Alert State Management Hook
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monitoringApi } from '@/api/admin/monitoring';
import type {
  Alert,
  AlertRule,
  SystemHealth,
  AlertStats,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
} from '@/api/admin/monitoring';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { extractErrorMessage } from '@/utils/errors';
import { useTranslation } from 'react-i18next';


import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';

export type TabType = 'alerts' | 'rules' | 'health';

export interface UseMonitoringAlertReturn {
  // State
  activeTab: TabType;
  searchQuery: string;
  filterLevel: string;
  filterStatus: string;
  currentPage: number;
  ruleDialogOpen: boolean;
  editingRule: AlertRule | null;

  // Data
  loading: boolean;
  alerts: Alert[];
  rules: AlertRule[];
  systemHealth: SystemHealth | null;
  alertStats: AlertStats | null;
  total: number;

  // Handlers
  setActiveTab: (tab: TabType) => void;
  setSearchQuery: (query: string) => void;
  setFilterLevel: (level: string) => void;
  setFilterStatus: (status: string) => void;
  setCurrentPage: (page: number) => void;
  setRuleDialogOpen: (open: boolean) => void;
  setEditingRule: (rule: AlertRule | null) => void;

  // Mutations
  handleAcknowledge: (alertId: string) => void;
  handleResolve: (alertId: string) => void;
  handleEscalate: (alertId: string) => void;
  handleToggleRule: (ruleId: string, enabled: boolean) => void;
  handleDeleteRule: (ruleId: string) => void;
  handleSaveRule: (params: {
    id?: string;
    data: CreateAlertRuleRequest | UpdateAlertRuleRequest;
  }) => void;
  handleExport: () => void;

  // Refetch
  refetchAlerts: () => void;
  refetchRules: () => void;
  refetchHealth: () => void;
}

const PER_PAGE = 20;

export function useMonitoringAlert(): UseMonitoringAlertReturn {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState<TabType>('alerts');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  // Queries
  const alertsQuery = useQuery<{ items: Alert[]; total: number }>({
    queryKey: [...QUERY_KEYS.AD_HOC.ADMIN_MONITORING_ALERTS_BASE, currentPage, searchQuery, filterLevel, filterStatus],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        per_page: PER_PAGE,
      };
      if (searchQuery) params.query = searchQuery;
      if (filterLevel !== 'all') params.level = filterLevel;
      if (filterStatus !== 'all') params.status = filterStatus;

      const response = await monitoringApi.listAlerts(params as never);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 'alerts',
    staleTime: 5 * 60 * 1000,
  });

  const rulesQuery = useQuery<{ items: AlertRule[]; total: number }>({
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_RULES_BASE,
    queryFn: async () => {
      const response = await monitoringApi.listAlertRules();
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 'rules',
    staleTime: 5 * 60 * 1000,
  });

  const healthQuery = useQuery<SystemHealth | null>({
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_HEALTH_BASE,
    queryFn: async () => {
      const response = await monitoringApi.getSystemHealth();
      return response.success && response.data ? response.data : null;
    },
    enabled: activeTab === 'health',
    staleTime: 5 * 60 * 1000,
  });

  const alertStatsQuery = useQuery<AlertStats | null>({
    queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_ALERT_STATS_BASE,
    queryFn: async () => {
      const response = await monitoringApi.getAlertStats();
      return response.success && response.data ? response.data : null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Derived data
  const loading =
    activeTab === 'alerts'
      ? alertsQuery.isLoading
      : activeTab === 'rules'
        ? rulesQuery.isLoading
        : healthQuery.isLoading;
  const alerts = alertsQuery.data?.items ?? [];
  const rules = rulesQuery.data?.items ?? [];
  const systemHealth = healthQuery.data ?? null;
  const alertStats = alertStatsQuery.data ?? null;
  const total =
    activeTab === 'alerts' ? (alertsQuery.data?.total ?? 0) : (rulesQuery.data?.total ?? 0);

  // Effects
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterLevel, filterStatus]);

  useEffect(() => {
    if (alertsQuery.isError) {
      apiLogger.error('Failed to load alerts:', alertsQuery.error);
      addNotification({
        type: 'error',
        message: t('admin.monitoring_alert_page.text_ec091b', {
          extractErrorMessage_alertsQuery_error: extractErrorMessage(alertsQuery.error),
        }),
      });
    }
  }, [alertsQuery.isError, alertsQuery.error, addNotification]);

  useEffect(() => {
    if (rulesQuery.isError) {
      apiLogger.error('Failed to load rules:', rulesQuery.error);
      addNotification({
        type: 'error',
        message: t('admin.monitoring_alert_page.text_c200ee', {
          extractErrorMessage_rulesQuery_error: extractErrorMessage(rulesQuery.error),
        }),
      });
    }
  }, [rulesQuery.isError, rulesQuery.error, addNotification]);

  useEffect(() => {
    if (healthQuery.isError) {
      apiLogger.error('Failed to load system health:', healthQuery.error);
      addNotification({
        type: 'error',
        message: t('admin.monitoring_alert_page.text_08cdb9', {
          extractErrorMessage_healthQuery_error: extractErrorMessage(healthQuery.error),
        }),
      });
    }
  }, [healthQuery.isError, healthQuery.error, addNotification]);

  useEffect(() => {
    if (alertStatsQuery.isError) {
      apiLogger.error('Failed to load alert stats:', alertStatsQuery.error);
    }
  }, [alertStatsQuery.isError, alertStatsQuery.error]);

  // Invalidation helpers
  const invalidateAlerts = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_ALERTS_BASE ,
  exact: false,
  refetchType: 'active',
});
  const invalidateRules = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_RULES_BASE ,
  exact: false,
  refetchType: 'active',
});

  // Mutations
  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: string) => monitoringApi.acknowledgeAlert(alertId),
    onSuccess: () => {
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_ALERTS_BASE,
          exact: false,
          refetchType: 'active',
        });
      invalidateAlerts();
      addNotification({ type: 'success', message: t('admin.monitoring_alert.alert_acknowledged') });
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        message: t('admin.monitoring_alert_page.text_3211ee', {
          extractErrorMessage_err: extractErrorMessage(err),
        }),
      });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (alertId: string) => monitoringApi.resolveAlert(alertId),
    onSuccess: () => {
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_ALERTS_BASE,
          exact: false,
          refetchType: 'active',
        });
      invalidateAlerts();
      addNotification({ type: 'success', message: t('admin.monitoring_alert.alert_resolved') });
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        message: t('admin.monitoring_alert_page.text_8b2e13', {
          extractErrorMessage_err: extractErrorMessage(err),
        }),
      });
    },
  });

  const escalateMutation = useMutation({
    mutationFn: (alertId: string) => monitoringApi.escalateAlert(alertId),
    onSuccess: () => {
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_ALERTS_BASE,
          exact: false,
          refetchType: 'active',
        });
      invalidateAlerts();
      addNotification({ type: 'success', message: t('admin.monitoring_alert.alert_escalated') });
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        message: t('admin.monitoring_alert_page.text_38901f', {
          extractErrorMessage_err: extractErrorMessage(err),
        }),
      });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: (params: { ruleId: string; enabled: boolean }) =>
      params.enabled
        ? monitoringApi.enableAlertRule(params.ruleId)
        : monitoringApi.disableAlertRule(params.ruleId),
    onSuccess: (_data, params) => {
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_ALERTS_BASE,
          exact: false,
          refetchType: 'active',
        });
      invalidateRules();
      addNotification({
        type: 'success',
        message: params.enabled
          ? t('admin.monitoring_alert.rule_enabled')
          : t('admin.monitoring_alert.rule_disabled'),
      });
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        message: t('admin.monitoring_alert_page.text_d14af0', {
          extractErrorMessage_err: extractErrorMessage(err),
        }),
      });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => monitoringApi.deleteAlertRule(ruleId),
    onSuccess: () => {
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_ALERTS_BASE,
          exact: false,
          refetchType: 'active',
        });
      invalidateRules();
      addNotification({ type: 'success', message: t('admin.monitoring_alert.rule_deleted') });
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        message: t('admin.monitoring_alert_page.text_8fb1eb', {
          extractErrorMessage_err: extractErrorMessage(err),
        }),
      });
    },
  });

  const saveRuleMutation = useMutation({
    mutationFn: (params: { id?: string; data: CreateAlertRuleRequest | UpdateAlertRuleRequest }) =>
      params.id
        ? monitoringApi.updateAlertRule(params.id, params.data as UpdateAlertRuleRequest)
        : monitoringApi.createAlertRule(params.data as CreateAlertRuleRequest),
    onSuccess: (_data, params) => {
      
      queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.AD_HOC.ADMIN_MONITORING_ALERTS_BASE,
          exact: false,
          refetchType: 'active',
        });
      invalidateRules();
      addNotification({
        type: 'success',
        message: params.id
          ? t('admin.monitoring_alert.rule_updated')
          : t('admin.monitoring_alert.rule_created'),
      });
      setRuleDialogOpen(false);
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        message: t('admin.monitoring_alert_page.text_c364cf', {
          extractErrorMessage_err: extractErrorMessage(err),
        }),
      });
    },
  });

  // Handlers
  const handleAcknowledge = (alertId: string) => {
    acknowledgeMutation.mutate(alertId);
  };

  const handleResolve = (alertId: string) => {
    resolveMutation.mutate(alertId);
  };

  const handleEscalate = (alertId: string) => {
    escalateMutation.mutate(alertId);
  };

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    toggleRuleMutation.mutate({ ruleId, enabled });
  };

  const handleDeleteRule = (ruleId: string) => {
    deleteRuleMutation.mutate(ruleId);
  };

  const handleSaveRule = (params: {
    id?: string;
    data: CreateAlertRuleRequest | UpdateAlertRuleRequest;
  }) => {
    saveRuleMutation.mutate(params);
  };

  const handleExport = () => {
    monitoringApi.exportAlerts({ format: 'excel' });
  };

  return {
    // State
    activeTab,
    searchQuery,
    filterLevel,
    filterStatus,
    currentPage,
    ruleDialogOpen,
    editingRule,

    // Data
    loading,
    alerts,
    rules,
    systemHealth,
    alertStats,
    total,

    // Handlers
    setActiveTab,
    setSearchQuery,
    setFilterLevel,
    setFilterStatus,
    setCurrentPage,
    setRuleDialogOpen,
    setEditingRule,

    // Mutations
    handleAcknowledge,
    handleResolve,
    handleEscalate,
    handleToggleRule,
    handleDeleteRule,
    handleSaveRule,
    handleExport,

    // Refetch
    refetchAlerts: () => alertsQuery.refetch(),
    refetchRules: () => rulesQuery.refetch(),
    refetchHealth: () => healthQuery.refetch(),
  };
}
