import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { systemAuditApi } from '@/api/system';
import { extractErrorMessage } from '@/utils/errors';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';

export interface AuditLogFilters {
  keyword: string;
  operator: string;
  type: string;
  module: string;
  status: string;
  start_date: string;
  end_date: string;
}

export const useAuditLog = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);

  // Filter states (key names aligned with ListPageTemplate filter ids)
  const [filters, setFilters] = useState<AuditLogFilters>({
    keyword: '',
    operator: '',
    type: '',
    module: '',
    status: '',
    start_date: '',
    end_date: '',
  });

  // Pagination states
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Query
  const {
    data: logsData,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      QUERY_KEYS.SYSTEM.AUDIT,
      page + 1,
      pageSize,
      filters.keyword,
      filters.operator,
      filters.type,
      filters.module,
      filters.status,
      filters.start_date,
      filters.end_date,
    ],
    queryFn: async () => {
      const params = {
        page: page + 1,
        pagesize: pageSize,
        search: filters.keyword || undefined,
        user_name: filters.operator || undefined,
        action: filters.type || undefined,
        entity_type: filters.module || undefined,
        status: filters.status || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
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

  const logs = useMemo(() => logsData?.items || [], [logsData]);
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

  // Client-side filtering as backup for search/or/and consistency
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        !filters.keyword ||
        log.user_name?.toLowerCase().includes(filters.keyword.toLowerCase()) ||
        log.action?.toLowerCase().includes(filters.keyword.toLowerCase()) ||
        log.entity_type?.toLowerCase().includes(filters.keyword.toLowerCase()) ||
        log.ip_address?.includes(filters.keyword);
      const matchesUser = !filters.operator || log.user_name === filters.operator;
      const matchesAction = !filters.type || log.action === filters.type;
      const matchesEntityType = !filters.module || log.entity_type === filters.module;
      const matchesStatus = !filters.status || log.status === filters.status;
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
  const updateFilter = (values: Record<string, string>) => {
    setFilters((prev) => ({ ...prev, ...values }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({
      keyword: '',
      operator: '',
      type: '',
      module: '',
      status: '',
      start_date: '',
      end_date: '',
    });
    setPage(0);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  };

  const handleExport = async () => {
    try {
      const params = {
        search: filters.keyword || undefined,
        user_name: filters.operator || undefined,
        action: filters.type || undefined,
        entity_type: filters.module || undefined,
        status: filters.status || undefined,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
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
    isPending,

    // Filters
    filters,
    updateFilter,
    clearFilters,
    uniqueUsers,
    uniqueActions,
    uniqueEntityTypes,

    // Pagination
    page,
    pageSize,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange,

    // Stats
    stats,

    // Actions
    refetch,
    handleExport,
  };
};
