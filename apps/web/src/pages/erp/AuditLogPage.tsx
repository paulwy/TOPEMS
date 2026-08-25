import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileText,
  Info,
  Monitor,
  RefreshCw,
  User,
  XCircle,
} from 'lucide-react';
import i18n from '@/i18n';
import { ListPageTemplate } from '@/components/templates/ListPageTemplate';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import type { FilterConfig } from '@topems/shared-components';
import { StatusBadge } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { extractErrorMessage } from '@/utils/errors';
import { useNavigate } from 'react-router-dom';
import { ERP_PATHS } from '@/modules/erp/config';
import { auditApi, type AuditLog } from '@/api/erp/audit';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

interface AuditLogStatsProps {
  stats: {
    total: number;
    success: number;
    failed: number;
    warning: number;
  };
}

const AuditLogStats: React.FC<AuditLogStatsProps> = ({ stats }) => {
  const statCards = [
    {
      label: i18n.t('pages.audit_log_page.k11'),
      value: stats.total,
      color: 'primary.dark' as const,
      bgColor: 'primary.light' as const,
      icon: (
        <FileText
          size={20}
          color={ct.primary.main}
        />
      ),
    },
    {
      label: i18n.t('pages.audit_log_page.k12'),
      value: stats.success,
      color: 'success.dark' as const,
      bgColor: 'success.light' as const,
      icon: (
        <CheckCircle
          size={20}
          color={ct.success.main}
        />
      ),
    },
    {
      label: i18n.t('pages.audit_log_page.k13'),
      value: stats.failed,
      color: 'error.dark' as const,
      bgColor: 'error.light' as const,
      icon: (
        <XCircle
          size={20}
          color={ct.error.main}
        />
      ),
    },
    {
      label: i18n.t('pages.audit_log_page.k14'),
      value: stats.warning,
      color: 'warning.dark' as const,
      bgColor: 'warning.light' as const,
      icon: (
        <AlertCircle
          size={20}
          color={ct.warning.main}
        />
      ),
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
      }}
    >
      {statCards.map((card) => (
        <Card key={card.label}>
          <CardContent sx={{ p: 2 }}>
            <Stack
              direction='row'
              spacing={1.5}
              sx={{ alignItems: 'center' }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: card.bgColor,
                  borderRadius: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {card.icon}
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {card.label}
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700 }}
                >
                  {card.value}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

const AuditLogPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filtersValue, setFiltersValue] = useState<Record<string, string>>({
    keyword: '',
    operator: '',
    module: '',
    type: '',
    status: '',
    start_date: '',
    end_date: '',
  });
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentLog, setCurrentLog] = useState<AuditLog | null>(null);

  const apiParams = useMemo(
    () => ({
      page: page + 1,
      page_size: rowsPerPage,
      action: filtersValue.type || undefined,
      entity_type: filtersValue.module || undefined,
      user_id: filtersValue.operator || undefined,
      status: filtersValue.status || undefined,
      start_date: filtersValue.start_date || undefined,
      end_date: filtersValue.end_date || undefined,
    }),
    [page, rowsPerPage, filtersValue]
  );

  const logsQuery = useQuery<{
    items: AuditLog[];
    total: number;
  }>({
    queryKey: [...QUERY_KEYS.AD_HOC.ERP_AUDIT_LOGS_BASE, apiParams],
    queryFn: async () => {
      const res = await auditApi.list(apiParams);
      if (res.success && res.data) {
        return { items: res.data.audit_logs || [], total: res.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (logsQuery.isError) {
      apiLogger.error(i18n.t('pages.audit_log_page.k0'), logsQuery.error);
      addNotification({
        title: i18n.t('pages.audit_log_page.k0'),
        message: extractErrorMessage(logsQuery.error, i18n.t('pages.audit_log_page.k1')),
        type: 'error',
      });
    }
  }, [logsQuery.isError, logsQuery.error, addNotification]);

  const logs = useMemo(() => logsQuery.data?.items ?? [], [logsQuery.data]);
  const total = logsQuery.data?.total ?? 0;

  const displayedLogs = useMemo(() => {
    const keyword = filtersValue.keyword;
    if (!keyword) return logs;
    const lower = keyword.toLowerCase();
    return logs.filter((log) => {
      const matchesSearch =
        (log.user_name?.toLowerCase().includes(lower) ?? false) ||
        (log.action?.toLowerCase().includes(lower) ?? false) ||
        (log.entity_type?.toLowerCase().includes(lower) ?? false) ||
        (log.ip_address?.includes(keyword) ?? false);
      const matchesOperator = !filtersValue.operator || log.user_name === filtersValue.operator;
      const matchesModule = !filtersValue.module || log.entity_type === filtersValue.module;
      const matchesType = !filtersValue.type || log.action === filtersValue.type;
      const matchesStatus = !filtersValue.status || log.status === filtersValue.status;
      return matchesSearch && matchesOperator && matchesModule && matchesType && matchesStatus;
    });
  }, [logs, filtersValue]);

  const stats = useMemo(
    () => ({
      total: logs.length,
      success: logs.filter((l) => l.status === 'success').length,
      failed: logs.filter((l) => l.status === 'failed').length,
      warning: logs.filter((l) => l.status === 'warning').length,
    }),
    [logs]
  );

  const operators = useMemo(() => {
    const unique = new Set(logs.map((l) => l.user_name).filter(Boolean));
    return Array.from(unique) as string[];
  }, [logs]);

  const modules = useMemo(() => {
    const unique = new Set(logs.map((l) => l.entity_type));
    return Array.from(unique) as string[];
  }, [logs]);

  const operationTypes = useMemo(() => {
    const unique = new Set(logs.map((l) => l.action));
    return Array.from(unique) as string[];
  }, [logs]);

  const getStatusBadge = (status: string) => {
    const badges: Record<
      string,
      {
        color: 'success' | 'error' | 'warning' | 'default';
        label: string;
        icon: React.ReactNode;
      }
    > = {
      success: {
        color: 'success',
        label: i18n.t('pages.audit_log_page.k2'),
        icon: <CheckCircle size={14} />,
      },
      failed: {
        color: 'error',
        label: i18n.t('pages.audit_log_page.k3'),
        icon: <XCircle size={14} />,
      },
      warning: {
        color: 'warning',
        label: i18n.t('pages.audit_log_page.k4'),
        icon: <AlertCircle size={14} />,
      },
    };
    const config = badges[status] || { color: 'default', label: status, icon: <Info size={14} /> };
    return (
      <StatusBadge
        status={status}
        label={config.label}
        color={config.color}
        icon={config.icon}
      />
    );
  };

  const getTypeChip = (type: string) => {
    const colorMap: Record<
      string,
      'primary' | 'warning' | 'error' | 'info' | 'success' | 'secondary' | 'default'
    > = {
      [i18n.t('pages.audit_log_page.k1')]: 'primary',
      [i18n.t('pages.audit_log_page.k2')]: 'warning',
      [i18n.t('pages.audit_log_page.k3')]: 'error',
      [i18n.t('pages.audit_log_page.k4')]: 'info',
      [i18n.t('pages.audit_log_page.k5')]: 'success',
      [i18n.t('pages.audit_log_page.k6')]: 'secondary',
      [i18n.t('pages.audit_log_page.k7')]: 'default',
      [i18n.t('pages.audit_log_page.k8')]: 'warning',
    };
    return (
      <Chip
        label={type}
        size='small'
        color={colorMap[type] || 'default'}
        variant='outlined'
      />
    );
  };

  const handleViewDetail = useCallback((log: AuditLog) => {
    setCurrentLog(log);
    setShowDetailModal(true);
  }, []);

  const handleExport = useCallback(() => {
    addNotification({
      title: i18n.t('pages.audit_log_page.k5'),
      message: i18n.t('pages.audit_log_page.k6'),
      type: 'success',
    });
  }, [addNotification]);

  const handleFilterChange = useCallback((values: Record<string, unknown>) => {
    setFiltersValue((prev) => ({ ...prev, ...(values as Record<string, string>) }));
    setPage(0);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setRowsPerPage(size);
    setPage(0);
  }, []);

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'keyword',
        label: i18n.t('pages.audit_log_page.ip_9'),
        type: 'text',
        width: 280,
      },
      {
        id: 'operator',
        label: i18n.t('pages.audit_log_page.k15'),
        type: 'select',
        options: operators.map((value) => ({ label: value, value })),
        width: 130,
      },
      {
        id: 'module',
        label: i18n.t('pages.audit_log_page.k18'),
        type: 'select',
        options: modules.map((value) => ({ label: value, value })),
        width: 140,
      },
      {
        id: 'type',
        label: i18n.t('pages.audit_log_page.k21'),
        type: 'select',
        options: operationTypes.map((value) => ({ label: value, value })),
        width: 120,
      },
      {
        id: 'status',
        label: i18n.t('pages.audit_log_page.k24'),
        type: 'select',
        options: [
          { label: i18n.t('pages.audit_log_page.k27'), value: 'success' },
          { label: i18n.t('pages.audit_log_page.k28'), value: 'failed' },
          { label: i18n.t('pages.audit_log_page.k29'), value: 'warning' },
        ],
        width: 120,
      },
      {
        id: 'start_date',
        label: i18n.t('pages.audit_log_page.k30'),
        type: 'date',
        width: 180,
      },
      {
        id: 'end_date',
        label: i18n.t('pages.audit_log_page.k31'),
        type: 'date',
        width: 180,
      },
    ],
    [operators, modules, operationTypes]
  );

  const columns: ColumnDef<AuditLog>[] = useMemo(
    () => [
      {
        id: 'operator',
        label: i18n.t('pages.audit_log_page.k33'),
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
              <User size={14} />
            </Box>
            <Typography sx={{ fontWeight: 500 }}>{row.user_name || '-'}</Typography>
          </Box>
        ),
      },
      {
        id: 'module',
        label: i18n.t('pages.audit_log_page.k34'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Monitor
              size={14}
              style={{ opacity: 0.5 }}
            />
            {row.entity_type}
          </Box>
        ),
      },
      {
        id: 'type',
        label: i18n.t('pages.audit_log_page.k35'),
        render: (row) => getTypeChip(row.action),
      },
      {
        id: 'description',
        label: i18n.t('pages.audit_log_page.k36'),
        render: (row) => (
          <Typography
            sx={{
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.action} {row.entity_type}
          </Typography>
        ),
      },
      {
        id: 'ip_address',
        label: i18n.t('erp.auditLog.k0'),
        render: (row) => (
          <Typography
            sx={{
              fontFamily: 'monospace',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {row.ip_address || '-'}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: i18n.t('pages.audit_log_page.k37'),
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'created_at',
        label: i18n.t('pages.audit_log_page.k38'),
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
              {row.created_at.replace('T', ' ')}
            </Typography>
          </Box>
        ),
      },
    ],
    []
  );

  const rowActions: RowAction<AuditLog>[] = useMemo(
    () => [
      {
        key: 'view',
        label: i18n.t('pages.audit_log_page.k39'),
        icon: <Eye size={16} />,
        onClick: (row) => handleViewDetail(row),
        color: 'info',
      },
    ],
    [handleViewDetail]
  );

  const actions = useMemo(
    () => [
      {
        label: i18n.t('pages.audit_log_page.k9'),
        icon: <Download size={16} />,
        onClick: handleExport,
        variant: 'outlined' as const,
      },
      {
        label: i18n.t('pages.audit_log_page.k10'),
        icon: <RefreshCw size={16} />,
        onClick: () => logsQuery.refetch(),
        variant: 'outlined' as const,
      },
    ],
    [handleExport, logsQuery]
  );

  return (
    <ListPageTemplate<AuditLog>
      title={i18n.t('pages.audit_log_page.k7')}
      subtitle={i18n.t('pages.audit_log_page.k8')}
      backButton={{
        onClick: () => navigate(ERP_PATHS.dashboard),
      }}
      columns={columns}
      data={displayedLogs}
      loading={logsQuery.isLoading}
      error={
        logsQuery.error
          ? extractErrorMessage(logsQuery.error, i18n.t('pages.audit_log_page.k1'))
          : undefined
      }
      filters={filters}
      filtersValue={filtersValue}
      onFilterChange={handleFilterChange}
      pagination={{
        page,
        pageSize: rowsPerPage,
        total,
        onPageChange: setPage,
        onPageSizeChange: handlePageSizeChange,
      }}
      actions={actions}
      rowActions={rowActions}
      headerContent={<AuditLogStats stats={stats} />}
      emptyMessage={i18n.t('pages.audit_log_page.k10')}
    >
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Eye size={20} />
            {i18n.t('pages.audit_log_page.k11')}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {currentLog && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    {i18n.t('pages.audit_log_page.k12')}
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>{currentLog.user_name || '-'}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    {i18n.t('pages.audit_log_page.k13')}
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getStatusBadge(currentLog.status)}</Box>
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    {i18n.t('pages.audit_log_page.k14')}
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>{currentLog.entity_type}</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    {i18n.t('pages.audit_log_page.k15')}
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{getTypeChip(currentLog.action)}</Box>
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                  {i18n.t('pages.audit_log_page.k16')}
                </Typography>
                <Typography>
                  {currentLog.action} {currentLog.entity_type}
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    {i18n.t('pages.audit_log_page.ip_17')}
                  </Typography>
                  <Typography sx={{ fontFamily: 'monospace' }}>
                    {currentLog.ip_address || '-'}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    {i18n.t('pages.audit_log_page.k18')}
                  </Typography>
                  <Typography>{currentLog.created_at.replace('T', ' ')}</Typography>
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                  {i18n.t('pages.audit_log_page.k19')}
                </Typography>
                <Typography>{currentLog.user_agent || '-'}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setShowDetailModal(false)}>
            {i18n.t('pages.audit_log_page.k42')}
          </Button>
        </DialogActions>
      </Dialog>
    </ListPageTemplate>
  );
};

export default AuditLogPage;
