import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Eye, Clock, User as UserIcon } from 'lucide-react';
import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { operationAuditApi, type OperationLog } from '@/api/admin/operationAudit';
import { extractErrorMessage } from '@/utils/errors';

import type { ColumnDef, RowAction } from '@/components/templates/ListPageTemplate';

const formatDateTimeForApi = (dateTimeString: string): string => {
  if (!dateTimeString) return '';
  try {
    const date = new Date(dateTimeString);
    return date.toISOString();
  } catch {
    return dateTimeString;
  }
};

export const useOperationAuditLog = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const MODULE_OPTIONS: Array<{ value: string; label: string }> = useMemo(
    () => [
      { value: 'iam', label: t('admin.operation_audit_log.identity_permissions') },
      { value: 'tenant', label: t('admin.operation_audit_log.tenant') },
      { value: 'workflow', label: t('admin.operation_audit_log.workflow') },
      { value: 'file', label: t('admin.operation_audit_log.file') },
      { value: 'master', label: t('admin.operation_audit_log.master_data') },
      { value: 'erp', label: 'ERP' },
      { value: 'crm', label: 'CRM' },
      { value: 'pm', label: t('admin.operation_audit_log.project_management') },
      { value: 'hrm', label: t('admin.operation_audit_log.human_resources') },
      { value: 'mes', label: t('admin.operation_audit_log.manufacturing_execution') },
      { value: 'wms', label: t('admin.operation_audit_log.warehouse') },
      { value: 'pdm', label: t('admin.operation_audit_log.product_data') },
      { value: 'qms', label: t('admin.operation_audit_log.quality_management') },
      { value: 'lims', label: t('admin.operation_audit_log.laboratory') },
      { value: 'ehs', label: t('admin.operation_audit_log.ehs') },
      { value: 'srm', label: t('admin.operation_audit_log.supplier') },
      { value: 'finance', label: t('admin.operation_audit_log.finance') },
      { value: 'ai', label: t('admin.operation_audit_log_page.label_8bec0a') },
      { value: 'core', label: t('admin.operation_audit_log.core_service') },
      { value: 'unknown', label: t('admin.operation_audit_log.unrecognized') },
    ],
    [t]
  );

  const OPERATION_OPTIONS: Array<{ value: string; label: string }> = useMemo(
    () => [
      { value: 'create', label: t('admin.operation_audit_log.create') },
      { value: 'update', label: t('admin.operation_audit_log.update') },
      { value: 'patch', label: t('admin.operation_audit_log.partial_update') },
      { value: 'delete', label: t('admin.operation_audit_log.delete') },
      { value: 'unknown', label: t('admin.operation_audit_log.unrecognized') },
    ],
    [t]
  );

  const [userFilter, setUserFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [operationFilter, setOperationFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [traceIdFilter, setTraceIdFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState<'' | 'true' | 'false'>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentLog, setCurrentLog] = useState<OperationLog | null>(null);

  const queryKey = useMemo(
    () => [
      'admin',
      'operation-audit-logs',
      page + 1,
      rowsPerPage,
      userFilter,
      moduleFilter,
      operationFilter,
      resourceTypeFilter,
      traceIdFilter,
      successFilter,
      startDate,
      endDate,
    ],
    [
      page,
      rowsPerPage,
      userFilter,
      moduleFilter,
      operationFilter,
      resourceTypeFilter,
      traceIdFilter,
      successFilter,
      startDate,
      endDate,
    ]
  );

  const {
    data: logsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = {
        page: page + 1,
        page_size: rowsPerPage,
        user_name: userFilter || undefined,
        module: moduleFilter || undefined,
        operation: operationFilter || undefined,
        resource_type: resourceTypeFilter || undefined,
        trace_id: traceIdFilter || undefined,
        success: successFilter === '' ? undefined : successFilter === 'true',
        start_time: startDate ? formatDateTimeForApi(startDate) : undefined,
        end_time: endDate ? formatDateTimeForApi(endDate) : undefined,
      };
      apiLogger.debug(
        t('admin.operation_audit_log.failed_to_load_operation_audit_log_parameters'),
        params
      );
      const response = await operationAuditApi.list(params);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(
        response.message || t('admin.operation_audit_log.failed_to_load_operation_audit_logs')
      );
    },
    staleTime: 30 * 1000,
  });

  const logs = logsData?.items || [];
  const totalCount = logsData?.total || 0;

  if (error) {
    apiLogger.error(t('admin.operation_audit_log.failed_to_load_operation_audit_logs'), error);
    addNotification({
      title: t('admin.operation_audit_log.load_failed'),
      message: extractErrorMessage(
        `${error} + t('admin.operation_audit_log.failed_to_load_operation_audit_logs') + `
      ),
      type: 'error',
    });
  }

  const getModuleLabel = useCallback(
    (code: string): string => {
      return MODULE_OPTIONS.find((m) => m.value === code)?.label || code || '-';
    },
    [MODULE_OPTIONS]
  );

  const getOperationLabel = useCallback(
    (code: string): string => {
      return OPERATION_OPTIONS.find((m) => m.value === code)?.label || code || '-';
    },
    [OPERATION_OPTIONS]
  );

  const getResponseStatusBadge = useCallback(
    (status?: number) => {
      if (status === undefined || status === null) {
        return (
          <Chip
            size='small'
            label={t('admin.operation_audit_log.not_logged')}
            variant='outlined'
          />
        );
      }
      if (status >= 200 && status < 300) {
        return (
          <Chip
            size='small'
            color='success'
            label={String(status)}
            icon={<CheckCircle size={14} />}
          />
        );
      }
      if (status >= 400 && status < 500) {
        return (
          <Chip
            size='small'
            color='warning'
            label={String(status)}
            icon={<XCircle size={14} />}
          />
        );
      }
      if (status >= 500) {
        return (
          <Chip
            size='small'
            color='error'
            label={String(status)}
            icon={<XCircle size={14} />}
          />
        );
      }
      return (
        <Chip
          size='small'
          label={String(status)}
        />
      );
    },
    [t]
  );

  const handleViewDetail = useCallback((log: OperationLog) => {
    setCurrentLog(log);
    setShowDetailModal(true);
  }, []);

  const clearFilters = useCallback(() => {
    setUserFilter('');
    setModuleFilter('');
    setOperationFilter('');
    setResourceTypeFilter('');
    setTraceIdFilter('');
    setSuccessFilter('');
    setStartDate('');
    setEndDate('');
    setPage(0);
  }, []);

  const stats = useMemo(
    () => ({
      total: totalCount,
      success: logs.filter((l) => l.response_status !== undefined && l.response_status < 400)
        .length,
      failed: logs.filter((l) => l.response_status !== undefined && l.response_status >= 400)
        .length,
      showing: logs.length,
    }),
    [logs, totalCount]
  );

  const columns: ColumnDef<OperationLog>[] = useMemo(
    () => [
      {
        id: 'action',
        label: t('admin.operation_audit_log.detail'),
        width: 80,
        render: (row) => (
          <Tooltip title={t('admin.operation_audit_log.view_details')}>
            <IconButton
              size='small'
              onClick={() => handleViewDetail(row)}
            >
              <Eye size={16} />
            </IconButton>
          </Tooltip>
        ),
      },
      {
        id: 'created_at',
        label: t('admin.operation_audit_log.time'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Clock
              size={14}
              style={{ opacity: 0.5 }}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              {new Date(row.created_at).toLocaleString('zh-CN')}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'user_name',
        label: t('admin.operation_audit_log.user'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor: 'primary.100',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserIcon size={14} />
            </Box>
            <Typography sx={{ fontWeight: 500 }}>{row.user_name || '-'}</Typography>
          </Box>
        ),
      },
      {
        id: 'module',
        label: t('admin.operation_audit_log.module'),
        render: (row) => (
          <Chip
            label={getModuleLabel(row.module)}
            size='small'
            color='primary'
            variant='outlined'
          />
        ),
      },
      {
        id: 'operation',
        label: t('admin.operation_audit_log.action'),
        render: (row) => (
          <Chip
            label={getOperationLabel(row.operation)}
            size='small'
            color='secondary'
            variant='outlined'
          />
        ),
      },
      {
        id: 'resource_type',
        label: t('admin.operation_audit_log.resource_type'),
        render: (row) => (
          <Typography sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {row.resource_type || '-'}
          </Typography>
        ),
      },
      {
        id: 'resource_id',
        label: t('admin.operation_audit_log.resource_id'),
        render: (row) => (
          <Typography
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              maxWidth: 160,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.resource_id || '-'}
          </Typography>
        ),
      },
      {
        id: 'response_status',
        label: t('admin.operation_audit_log.response_status'),
        render: (row) => getResponseStatusBadge(row.response_status),
      },
      {
        id: 'trace_id',
        label: 'Trace ID',
        render: (row) => (
          <Typography
            sx={{
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              maxWidth: 160,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.trace_id || '-'}
          </Typography>
        ),
      },
    ],

    []
  );

  const rowActions: RowAction<OperationLog>[] = useMemo(
    () => [
      {
        key: 'view-detail',
        label: t('admin.operation_audit_log.view_details'),
        icon: <Eye size={16} />,
        onClick: (row) => handleViewDetail(row),
      },
    ],
    []
  );

  return {
    // Data
    logs,
    totalCount,
    isLoading,
    error,
    refetch,
    // Table config
    columns,
    rowActions,
    stats,
    // Detail modal
    showDetailModal,
    currentLog,
    handleViewDetail,
    setShowDetailModal,
    // Filters
    userFilter,
    setUserFilter,
    moduleFilter,
    setModuleFilter,
    operationFilter,
    setOperationFilter,
    resourceTypeFilter,
    setResourceTypeFilter,
    traceIdFilter,
    setTraceIdFilter,
    successFilter,
    setSuccessFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    // Pagination
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    // Actions
    clearFilters,
    // Helpers
    getModuleLabel,
    getOperationLabel,
    getResponseStatusBadge,
    MODULE_OPTIONS,
    OPERATION_OPTIONS,
  };
};
