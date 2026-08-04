import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { systemAuditApi, type AuditLog } from '@/api/system';
import { extractErrorMessage } from '@/utils/errors';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';

export interface AuditLogFilters {
  searchQuery: string;
  userFilter: string;
  actionFilter: string;
  entityTypeFilter: string;
  statusFilter: string;
  startDate: string;
  endDate: string;
}

export interface AuditLogPagination {
  page: number;
  rowsPerPage: number;
}

export const useAuditLog = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);

  // Filter states
  const [filters, setFilters] = useState<AuditLogFilters>({
    searchQuery: '',
    userFilter: '',
    actionFilter: '',
    entityTypeFilter: '',
    statusFilter: '',
    startDate: '',
    endDate: '',
  });

  // Pagination states
  const [pagination, setPagination] = useState<AuditLogPagination>({
    page: 0,
    rowsPerPage: 10,
  });

  // Query
  const {
    data: logsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      QUERY_KEYS.SYSTEM.AUDIT,
      pagination.page + 1,
      pagination.rowsPerPage,
      filters.searchQuery,
      filters.userFilter,
      filters.actionFilter,
      filters.entityTypeFilter,
      filters.statusFilter,
      filters.startDate,
      filters.endDate,
    ],
    queryFn: async () => {
      const params = {
        page: pagination.page + 1,
        pagesize: pagination.rowsPerPage,
        search: filters.searchQuery || undefined,
        user_name: filters.userFilter || undefined,
        action: filters.actionFilter || undefined,
        entity_type: filters.entityTypeFilter || undefined,
        status: filters.statusFilter || undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
      };
      apiLogger.debug(t('system.auditPage.load_params'), params);
      const response = await systemAuditApi.list(params);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || t('system.auditPage.load_failed'));
    },
    staleTime: 5 * 60 * 1000,
  });

  const logs = logsData?.items || [];
  const totalCount = logsData?.total || 0;

  // Error handling
  if (error) {
    apiLogger.error(t('system.auditPage.load_failed'), error);
    addNotification({
      title: t('system.status.error'),
      message: extractErrorMessage(error, t('system.auditPage.load_failed')),
      type: 'error',
    });
  }

  // Filtered logs (client-side filtering as backup)
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        !filters.searchQuery ||
        log.user_name?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        log.action?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        log.entity_type?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        log.ip_address?.includes(filters.searchQuery);
      const matchesUser = !filters.userFilter || log.user_name === filters.userFilter;
      const matchesAction = !filters.actionFilter || log.action === filters.actionFilter;
      const matchesEntityType =
        !filters.entityTypeFilter || log.entity_type === filters.entityTypeFilter;
      const matchesStatus = !filters.statusFilter || log.status === filters.statusFilter;
      return matchesSearch && matchesUser && matchesAction && matchesEntityType && matchesStatus;
    });
  }, [logs, filters]);

  // Unique values for filter dropdowns
  const uniqueUsers = useMemo(() => {
    const unique = new Set(logs.map((l) => l.user_name).filter(Boolean));
    return Array.from(unique);
  }, [logs]);

  const uniqueActions = useMemo(() => {
    const unique = new Set(logs.map((l) => l.action));
    return Array.from(unique);
  }, [logs]);

  const uniqueEntityTypes = useMemo(() => {
    const unique = new Set(logs.map((l) => l.entity_type));
    return Array.from(unique);
  }, [logs]);

  // Statistics
  const stats = useMemo(
    () => ({
      total: logs.length,
      success: logs.filter((l) => l.status === 'success').length,
      failed: logs.filter((l) => l.status === 'failed' || l.status === 'error').length,
      warning: logs.filter((l) => l.status === 'warning' || l.status === 'partial').length,
    }),
    [logs]
  );

  // Handlers
  const updateFilter = (key: keyof AuditLogFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 0 }));
  };

  const clearFilters = () => {
    setFilters({
      searchQuery: '',
      userFilter: '',
      actionFilter: '',
      entityTypeFilter: '',
      statusFilter: '',
      startDate: '',
      endDate: '',
    });
    setPagination((prev) => ({ ...prev, page: 0 }));
  };

  const handleExport = async () => {
    try {
      const params = {
        search: filters.searchQuery || undefined,
        user_name: filters.userFilter || undefined,
        action: filters.actionFilter || undefined,
        entity_type: filters.entityTypeFilter || undefined,
        status: filters.statusFilter || undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
      };
      const blob = await systemAuditApi.export(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addNotification({
        title: t('system.auditPage.export_success'),
        message: t('system.auditPage.audit_logs_exported'),
        type: 'success',
      });
    } catch (err: unknown) {
      apiLogger.error(t('system.auditPage.export_audit_logs_failed'), err);
      addNotification({
        title: t('system.auditPage.export_failed'),
        message: extractErrorMessage(err, t('system.auditPage.export_audit_logs_failed')),
        type: 'error',
      });
    }
  };

  return {
    // Data
    logs,
    filteredLogs,
    totalCount,
    isLoading,

    // Filters
    filters,
    updateFilter,
    clearFilters,
    uniqueUsers,
    uniqueActions,
    uniqueEntityTypes,

    // Pagination
    pagination,
    setPagination,

    // Stats
    stats,

    // Actions
    refetch,
    handleExport,
  };
};
