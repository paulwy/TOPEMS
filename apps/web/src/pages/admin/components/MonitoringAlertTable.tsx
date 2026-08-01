/**
 * @done V79 Phase 2 split - Monitoring Alert Table Component
 */
import React, { useMemo } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Clock, AlertCircle, AlertTriangle, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ListPageTemplate, {
  type ColumnDef,
  type RowAction,
} from '@/components/templates/ListPageTemplate';
import type { Alert } from '@/api/admin/monitoring';

export interface MonitoringAlertTableProps {
  alerts: Alert[];
  loading: boolean;
  total: number;
  currentPage: number;
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
  onEscalate: (alertId: string) => void;
  onRefresh: () => void;
  onPageChange: (page: number) => void;
  filterContent: React.ReactNode;
  headerContent: React.ReactNode;
}

const PER_PAGE = 20;

const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}>
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='20'
      height='20'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <circle
        cx='12'
        cy='12'
        r='10'
      ></circle>
      <line
        x1='12'
        y1='16'
        x2='12'
        y2='12'
      ></line>
      <line
        x1='12'
        y1='8'
        x2='12.01'
        y2='8'
      ></line>
    </svg>
  </div>
);

export const MonitoringAlertTable: React.FC<MonitoringAlertTableProps> = ({
  alerts,
  loading,
  total,
  currentPage,
  onAcknowledge,
  onResolve,
  onEscalate,
  onRefresh,
  onPageChange,
  filterContent,
  headerContent,
}) => {
  const { t } = useTranslation();

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertCircle className='w-5 h-5 text-red-600' />;
      case 'warning':
        return <AlertTriangle className='w-5 h-5 text-yellow-600' />;
      case 'info':
        return <InfoIcon className='w-5 h-5 text-blue-600' />;
      default:
        return <Bell className='w-5 h-5 text-gray-600' />;
    }
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      critical: t('admin.monitoring_alert.critical'),
      warning: t('admin.monitoring_alert.warning'),
      info: t('admin.monitoring_alert.info'),
      error: t('admin.monitoring_alert.error'),
    };
    return labels[level] || level;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: t('admin.monitoring_alert.pending'),
      acknowledged: t('admin.monitoring_alert.acknowledged'),
      resolved: t('admin.monitoring_alert.resolved'),
      escalated: t('admin.monitoring_alert.escalated'),
      dismissed: t('admin.monitoring_alert.dismissed'),
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'acknowledged':
        return 'info';
      case 'resolved':
        return 'success';
      case 'escalated':
        return 'error';
      case 'dismissed':
        return 'default';
      default:
        return 'default';
    }
  };

  const alertColumns: ColumnDef<Alert>[] = useMemo(
    () => [
      {
        id: 'level',
        label: t('admin.monitoring_alert.level'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getLevelIcon(row.level)}
            <Chip
              label={getLevelLabel(row.level)}
              size='small'
              color={getLevelColor(row.level) as any}
            />
          </Box>
        ),
      },
      {
        id: 'title',
        label: t('admin.monitoring_alert.title'),
        render: (row) => <Typography sx={{ fontWeight: 'medium' }}>{row.title}</Typography>,
      },
      {
        id: 'message',
        label: t('admin.monitoring_alert.content'),
        render: (row) => (
          <Typography
            variant='body2'
            sx={{
              maxWidth: 300,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={row.message}
          >
            {row.message}
          </Typography>
        ),
      },
      {
        id: 'source',
        label: t('admin.monitoring_alert.source'),
        render: (row) => (
          <Chip
            label={row.source}
            size='small'
          />
        ),
      },
      {
        id: 'created_at',
        label: t('admin.monitoring_alert.time'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Clock className='w-4 h-4' />
            <Typography variant='body2'>
              {new Date(row.created_at).toLocaleString('zh-CN')}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'status',
        label: t('admin.monitoring_alert.status'),
        render: (row) => (
          <Chip
            label={getStatusLabel(row.status)}
            size='small'
            color={getStatusColor(row.status) as any}
          />
        ),
      },
    ],
    [t]
  );

  const alertRowActions: RowAction<Alert>[] = useMemo(
    () => [
      {
        key: 'acknowledge',
        label: t('admin.monitoring_alert_page.text_e83a25'),
        onClick: (row) => onAcknowledge(row.id),
        show: (row) => row.status === 'pending',
      },
      {
        key: 'resolve',
        label: t('admin.monitoring_alert_page.text_4b8621'),
        onClick: (row) => onResolve(row.id),
        show: (row) => row.status === 'acknowledged',
      },
      {
        key: 'escalate',
        label: t('admin.monitoring_alert_page.text_e643c7'),
        color: 'error',
        onClick: (row) => onEscalate(row.id),
        show: (row) => row.status !== 'escalated' && row.status !== 'resolved',
      },
    ],
    [t, onAcknowledge, onResolve, onEscalate]
  );

  return (
    <ListPageTemplate<Alert>
      title={undefined}
      columns={alertColumns}
      data={loading ? [] : alerts}
      loading={loading}
      getRowId={(row) => row.id}
      actions={[]}
      rowActions={alertRowActions}
      pagination={{
        page: currentPage - 1,
        pageSize: PER_PAGE,
        total,
        onPageChange: (newPage0) => onPageChange(newPage0 + 1),
        onPageSizeChange: () => {},
      }}
      headerContent={headerContent}
      filterContent={filterContent}
      emptyMessage={t('admin.monitoring_alert_page.text_b2397d')}
      onRefresh={onRefresh}
      showRowNumber={false}
      exportable={false}
    />
  );
};

export default MonitoringAlertTable;
