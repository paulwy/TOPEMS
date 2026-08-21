import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Monitor,
  Eye,
} from 'lucide-react';
import { Box, Typography, Chip, Card, CardContent, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import type { FilterConfig } from '@topems/shared-components';
import type { AuditLog } from '@/api/system';
import { designTokens } from '@topems/tokens';
import { useAuditLog } from './hooks/useAuditLog';
import AuditLogDetailDialog from './components/AuditLogDetailDialog';

const AuditLogPage: React.FC = () => {
  const { t } = useTranslation();

  const {
    filteredLogs,
    totalCount,
    isPending,
    filters,
    updateFilter,
    uniqueUsers,
    uniqueActions,
    uniqueEntityTypes,
    page,
    pageSize,
    onPageChange,
    onPageSizeChange,
    stats,
    refetch,
    handleExport,
  } = useAuditLog();

  // Detail dialog state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentLog, setCurrentLog] = useState<AuditLog | null>(null);

  const getStatusBadge = useCallback(
    (status: string) => {
      const badges: Record<
        string,
        {
          color: 'success' | 'error' | 'warning' | 'default';
          label: string;
          icon: React.ReactElement;
        }
      > = {
        success: {
          color: 'success',
          label: t('system.status.success'),
          icon: <CheckCircle size={14} />,
        },
        failed: { color: 'error', label: t('system.status.failed'), icon: <XCircle size={14} /> },
        error: { color: 'error', label: t('system.status.failed'), icon: <XCircle size={14} /> },
        warning: {
          color: 'warning',
          label: t('system.status.warning'),
          icon: <AlertCircle size={14} />,
        },
        partial: {
          color: 'warning',
          label: t('system.status.partial_success'),
          icon: <AlertCircle size={14} />,
        },
      };
      const config = badges[status] || {
        color: 'default',
        label: status,
        icon: <FileText size={14} />,
      };
      return (
        <Chip
          size='small'
          color={config.color}
          label={config.label}
          icon={config.icon}
        />
      );
    },
    [t]
  );

  const formatAction = useCallback(
    (action: string) => {
      const map: Record<string, string> = {
        create: t('system.action_type.create'),
        update: t('system.action_type.update'),
        delete: t('system.action_type.delete'),
        read: t('system.action_type.read'),
        batch_create: t('system.action_type.batch_create'),
        batch_delete: t('system.action_type.batch_delete'),
        export: t('system.action_type.export'),
        import: t('system.action_type.import'),
        login: t('system.action_type.login'),
        logout: t('system.action_type.logout'),
        approve: t('system.action_type.approve'),
        reject: t('system.action_type.reject'),
      };
      return map[action] || action;
    },
    [t]
  );

  const handleViewDetail = useCallback((log: AuditLog) => {
    setCurrentLog(log);
    setShowDetailModal(true);
  }, []);

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        id: 'keyword',
        label: t('system.auditPage.search_placeholder'),
        type: 'text',
        width: 280,
      },
      {
        id: 'operator',
        label: t('system.field.user'),
        type: 'select',
        options: uniqueUsers.map((value) => ({ label: value, value })),
        width: 160,
      },
      {
        id: 'module',
        label: t('system.field.entity_type'),
        type: 'select',
        options: uniqueEntityTypes.map((value) => ({ label: value, value })),
        width: 160,
      },
      {
        id: 'type',
        label: t('system.field.operation_type'),
        type: 'select',
        options: uniqueActions.map((value) => ({ label: formatAction(value), value })),
        width: 160,
      },
      {
        id: 'status',
        label: t('system.field.status'),
        type: 'select',
        options: [
          { label: t('system.status.success'), value: 'success' },
          { label: t('system.status.failed'), value: 'failed' },
          { label: t('system.status.warning'), value: 'warning' },
        ],
        width: 140,
      },
      {
        id: 'start_date',
        label: t('system.auditPage.start_date'),
        type: 'date',
        width: 180,
      },
      {
        id: 'end_date',
        label: t('system.auditPage.end_date'),
        type: 'date',
        width: 180,
      },
    ],
    [t, uniqueUsers, uniqueActions, uniqueEntityTypes, formatAction]
  );

  const columns: ColumnDef<AuditLog>[] = useMemo(
    () => [
      {
        id: 'created_at',
        label: t('system.field.time'),
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
        label: t('system.field.user'),
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
        id: 'action',
        label: t('system.field.operation_type'),
        render: (row) => (
          <Chip
            label={formatAction(row.action)}
            size='small'
            color='primary'
            variant='outlined'
          />
        ),
      },
      {
        id: 'entity_type',
        label: t('system.field.entity_type'),
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
        id: 'ip_address',
        label: t('system.field.ip_address'),
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
        label: t('system.field.status'),
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'detail',
        label: t('system.field.detail'),
        render: (row) =>
          row.error_message ? (
            <Typography
              sx={{
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'error.main',
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              {row.error_message}
            </Typography>
          ) : row.request_details ? (
            <Typography
              sx={{
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: designTokens.typography.fontSize.scale['0.875rem'],
              }}
            >
              {typeof row.request_details === 'string'
                ? row.request_details
                : JSON.stringify(row.request_details)}
            </Typography>
          ) : (
            '-'
          ),
      },
    ],
    [t, formatAction, getStatusBadge]
  );

  const rowActions: RowAction<AuditLog>[] = useMemo(
    () => [
      {
        key: 'view',
        label: t('system.action.view_detail'),
        icon: <Eye size={16} />,
        onClick: (row) => handleViewDetail(row),
        color: 'info',
      },
    ],
    [handleViewDetail, t]
  );

  const statsCards = useMemo(
    () => [
      {
        label: t('system.auditPage.total_operations'),
        value: stats.total,
        icon: <FileText size={20} />,
        color: 'primary' as const,
        bg: 'primary.100' as const,
      },
      {
        label: t('system.status.success'),
        value: stats.success,
        icon: <CheckCircle size={20} />,
        color: 'success' as const,
        bg: 'success.100' as const,
      },
      {
        label: t('system.status.failed'),
        value: stats.failed,
        icon: <XCircle size={20} />,
        color: 'error' as const,
        bg: 'error.100' as const,
      },
      {
        label: t('system.status.warning'),
        value: stats.warning,
        icon: <AlertCircle size={20} />,
        color: 'warning' as const,
        bg: 'warning.100' as const,
      },
    ],
    [stats, t]
  );

  const headerContent = useMemo(
    () => (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 2,
        }}
      >
        {statsCards.map((stat) => (
          <Card key={stat.label}>
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
                    bgcolor: stat.bg,
                    color: `${stat.color}.main`,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {stat.icon}
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {stat.label}
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 700 }}
                  >
                    {stat.value}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
    ),
    [statsCards]
  );

  const actions = useMemo(
    () => [
      {
        label: t('system.auditPage.export_logs'),
        icon: <Download size={16} />,
        onClick: handleExport,
        variant: 'outlined' as const,
      },
      {
        label: t('system.action.refresh'),
        icon: <RefreshCw size={16} />,
        onClick: () => refetch(),
        variant: 'outlined' as const,
      },
    ],
    [handleExport, refetch, t]
  );

  return (
    <>
      <ListPageTemplate<AuditLog>
        title={t('system.page.audit_log')}
        subtitle={t('system.auditPage.subtitle')}
        columns={columns}
        data={filteredLogs}
        loading={isPending}
        filters={filterConfigs}
        filtersValue={filters as unknown as Record<string, unknown>}
        onFilterChange={(values) => updateFilter(values as Record<string, string>)}
        pagination={{
          page,
          pageSize,
          total: totalCount,
          onPageChange,
          onPageSizeChange,
        }}
        actions={actions}
        rowActions={rowActions}
        headerContent={headerContent}
        emptyMessage={t('system.message.no_audit_logs')}
      />
      <AuditLogDetailDialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        currentLog={currentLog}
        getStatusBadge={getStatusBadge}
        formatAction={formatAction}
      />
    </>
  );
};

export default AuditLogPage;
