import React, { useMemo, useState, useCallback } from 'react';
import { Typography, Box, InputLabel, Button, Chip } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { RotateCcw, CheckCircle, XCircle, Package, CircleDot, Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { crmApi } from '@/api/crm';
import type { ReturnRecord, ReturnStatus, ReturnType, ReturnItem } from '@/api/crm';
import { PageContainer } from '@/components/common';
import { DetailPageTemplate, type SectionConfig } from '@/components/templates';
import { ConfirmDialog } from '@topems/shared-components';
import { CRM_PATHS } from '@/modules/crm/config';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useNotificationStore } from '@/store';

const ct = designTokens.colors;

const ReturnDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [confirmAction, setConfirmAction] = useState<{ label: string; fn: () => void } | null>(
    null
  );

  const statusLabelMap: Record<ReturnStatus, string> = {
    pending: t('crm.returnDetail.status_pending'),
    approved: t('crm.returnDetail.status_approved'),
    rejected: t('crm.returnDetail.status_rejected'),
    received: t('crm.returnDetail.status_received'),
    completed: t('crm.returnDetail.status_completed'),
    cancelled: t('crm.returnDetail.status_cancelled'),
  };

  const statusColorMap: Record<
    ReturnStatus,
    'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
  > = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error',
    received: 'info',
    completed: 'success',
    cancelled: 'primary',
  };

  const returnTypeLabelMap: Record<ReturnType, string> = {
    return: t('crm.returnDetail.type_return'),
    exchange: t('crm.returnDetail.type_exchange'),
  };

  const timelineSteps: ReturnStatus[] = ['pending', 'approved', 'received', 'completed'];

  const returnQuery = useQuery({
    queryKey: QUERY_KEYS.CRM.RETURN(id || ''),
    queryFn: () => crmApi.returns.get(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const itemsQuery = useQuery({
    queryKey: QUERY_KEYS.CRM.RETURN_ITEMS(id || ''),
    queryFn: () => crmApi.returns.listItems(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const financeQuery = useQuery({
    queryKey: QUERY_KEYS.CRM.RETURN_FINANCE_STATUS(id || ''),
    queryFn: () => crmApi.returns.getFinanceStatus(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const inventoryQuery = useQuery({
    queryKey: QUERY_KEYS.CRM.RETURN_INVENTORY_STATUS(id || ''),
    queryFn: () => crmApi.returns.getInventoryStatus(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  const record: ReturnRecord | null =
    returnQuery.data?.success && returnQuery.data.data ? returnQuery.data.data : null;
  const items: ReturnItem[] =
    itemsQuery.data?.success && itemsQuery.data.data ? itemsQuery.data.data : [];
  const financeStatus =
    financeQuery.data?.success && financeQuery.data.data ? financeQuery.data.data : null;
  const inventoryStatus =
    inventoryQuery.data?.success && inventoryQuery.data.data ? inventoryQuery.data.data : null;
  const loading = returnQuery.isLoading;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CRM.RETURNS });
    if (id) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CRM.RETURN(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CRM.RETURN_ITEMS(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CRM.RETURN_FINANCE_STATUS(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CRM.RETURN_INVENTORY_STATUS(id) });
    }
  };

  const actionMutation = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => {
      await fn();
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('crm.common.operation_success'),
        message: t('crm.returnDetail.msg_status_updated'),
      });
      invalidate();
    },
    onError: () => {
      addNotification({
        type: 'error',
        title: t('crm.common.operation_fail'),
        message: t('crm.returnDetail.msg_action_fail'),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (returnId: string) => crmApi.returns.delete(returnId),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('crm.common.delete_success'),
        message: t('crm.returnDetail.msg_deleted'),
      });
      navigate(CRM_PATHS.returns);
    },
  });

  const formatCurrency = (amount?: number) => {
    if (amount == null) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateTime = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };

  const getStatusChip = (status: ReturnStatus) => (
    <Chip
      size='small'
      color={statusColorMap[status] || 'primary'}
      label={statusLabelMap[status] || status}
    />
  );

  const basicInfoSection = useMemo(() => {
    if (!record) return null;
    return (
      <Box
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.returnDetail.field_return_no')}
          </InputLabel>
          <Typography sx={{ fontWeight: 600, fontFamily: 'monospace', mt: 0.5 }}>
            {record.return_no}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.returnDetail.field_customer_id')}
          </InputLabel>
          <Typography sx={{ fontFamily: 'monospace', mt: 0.5 }}>{record.customer_id}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.returnDetail.field_order_id')}
          </InputLabel>
          <Typography sx={{ fontFamily: 'monospace', mt: 0.5 }}>
            {record.order_id || '-'}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.returnDetail.field_type')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{returnTypeLabelMap[record.return_type]}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.returnDetail.field_reason')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{record.reason}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.returnDetail.field_status')}
          </InputLabel>
          <Box sx={{ mt: 0.5 }}>{getStatusChip(record.status)}</Box>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.returnDetail.field_refund_amount')}
          </InputLabel>
          <Typography
            sx={{
              fontFamily: 'monospace',
              color: record.refund_amount ? ct.primary.main : 'inherit',
              mt: 0.5,
            }}
          >
            {formatCurrency(record.refund_amount)}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.returnDetail.field_warehouse_id')}
          </InputLabel>
          <Typography sx={{ fontFamily: 'monospace', mt: 0.5 }}>
            {record.warehouse_id || '-'}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.returnDetail.field_ticket_id')}
          </InputLabel>
          <Typography sx={{ fontFamily: 'monospace', mt: 0.5 }}>
            {record.ticket_id || '-'}
          </Typography>
        </Box>
        {record.reason_detail && (
          <Box sx={{ gridColumn: 'span 3' }}>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
              {t('crm.returnDetail.field_reason_detail')}
            </InputLabel>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>
              {record.reason_detail}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }, [record, t]);

  const timelineSection = useMemo(() => {
    if (!record) return null;
    const currentIdx = timelineSteps.indexOf(record.status as ReturnStatus);
    const isRejected = record.status === 'rejected';
    const isCancelled = record.status === 'cancelled';

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', py: 1 }}>
        {timelineSteps.map((step, idx) => {
          const isCompleted = !isRejected && !isCancelled && idx <= currentIdx;
          const isCurrent = !isRejected && !isCancelled && idx === currentIdx;
          return (
            <React.Fragment key={step}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CircleDot
                  size={16}
                  style={{
                    color: isCompleted ? ct.success.main : isCurrent ? ct.primary.main : '#aaa',
                  }}
                />
                <Typography
                  variant='body2'
                  sx={{
                    fontWeight: isCurrent ? 600 : 400,
                    color: isCompleted
                      ? ct.success.main
                      : isCurrent
                        ? ct.primary.main
                        : 'text.secondary',
                  }}
                >
                  {statusLabelMap[step]}
                </Typography>
              </Box>
              {idx < timelineSteps.length - 1 && (
                <Box
                  sx={{
                    width: 32,
                    height: 2,
                    bgcolor: isCompleted ? ct.success.main : 'divider',
                    borderRadius: 1,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
        {isRejected && (
          <Chip
            size='small'
            color='error'
            label={t('crm.returnDetail.status_rejected')}
            sx={{ ml: 1 }}
          />
        )}
        {isCancelled && (
          <Chip
            size='small'
            color='primary'
            label={t('crm.returnDetail.status_cancelled')}
            sx={{ ml: 1 }}
          />
        )}
      </Box>
    );
  }, [record, t]);

  const itemsSection = useMemo(() => {
    if (items.length === 0) {
      return <Typography color='text.secondary'>{t('crm.returnDetail.items_empty')}</Typography>;
    }
    return (
      <Box sx={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <th
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  fontSize: 12,
                  color: 'surface.400',
                }}
              >
                {t('crm.returnDetail.col_product_id')}
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '8px 12px',
                  fontSize: 12,
                  color: 'surface.400',
                }}
              >
                {t('crm.returnDetail.col_quantity')}
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '8px 12px',
                  fontSize: 12,
                  color: 'surface.400',
                }}
              >
                {t('crm.returnDetail.col_unit_price')}
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '8px 12px',
                  fontSize: 12,
                  color: 'surface.400',
                }}
              >
                {t('crm.returnDetail.col_total')}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                style={{ borderBottom: '1px solid #eee' }}
              >
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {item.product_id}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                  {item.quantity}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                  {formatCurrency(item.unit_price)}
                </td>
                <td
                  style={{
                    padding: '8px 12px',
                    textAlign: 'right',
                    fontFamily: 'monospace',
                    color: ct.primary.main,
                  }}
                >
                  {formatCurrency(item.total_amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    );
  }, [items, t]);

  const financeSection = useMemo(() => {
    if (!financeStatus)
      return <Typography color='text.secondary'>{t('crm.returnDetail.finance_empty')}</Typography>;
    return (
      <Box
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.returnDetail.field_refund_amount')}
          </InputLabel>
          <Typography sx={{ fontFamily: 'monospace', color: ct.primary.main, mt: 0.5 }}>
            {formatCurrency(financeStatus.refund_amount)}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.returnDetail.field_refund_status')}
          </InputLabel>
          <Chip
            size='small'
            color={financeStatus.refund_status === 'completed' ? 'success' : 'warning'}
            label={financeStatus.refund_status}
            sx={{ mt: 0.5 }}
          />
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.returnDetail.field_refund_time')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDateTime(financeStatus.refunded_at)}</Typography>
        </Box>
      </Box>
    );
  }, [financeStatus, t]);

  const inventorySection = useMemo(() => {
    if (!inventoryStatus)
      return (
        <Typography color='text.secondary'>{t('crm.returnDetail.inventory_empty')}</Typography>
      );
    return (
      <Box
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}
      >
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.returnDetail.field_received')}
          </InputLabel>
          <Chip
            size='small'
            color={inventoryStatus.received ? 'success' : 'primary'}
            label={
              inventoryStatus.received
                ? t('crm.returnDetail.status_received')
                : t('crm.returnDetail.status_not_received')
            }
            sx={{ mt: 0.5 }}
          />
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.returnDetail.field_received_time')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDateTime(inventoryStatus.received_at)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.returnDetail.field_warehouse_id')}
          </InputLabel>
          <Typography sx={{ fontFamily: 'monospace', mt: 0.5 }}>
            {inventoryStatus.warehouse_id || '-'}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>
            {t('crm.returnDetail.field_items_count')}
          </InputLabel>
          <Typography sx={{ mt: 0.5 }}>{inventoryStatus.items_count}</Typography>
        </Box>
      </Box>
    );
  }, [inventoryStatus, t]);

  const sections: SectionConfig[] = useMemo(
    () => [
      { id: 'basic', title: t('crm.returnDetail.section_basic'), content: basicInfoSection },
      { id: 'timeline', title: t('crm.returnDetail.section_timeline'), content: timelineSection },
      { id: 'items', title: t('crm.returnDetail.section_items'), content: itemsSection },
      { id: 'finance', title: t('crm.returnDetail.section_finance'), content: financeSection },
      {
        id: 'inventory',
        title: t('crm.returnDetail.section_inventory'),
        content: inventorySection,
      },
    ],
    [basicInfoSection, timelineSection, itemsSection, financeSection, inventorySection, t]
  );

  const handleAction = useCallback((label: string, fn: () => Promise<unknown>) => {
    setConfirmAction({
      label,
      fn: () => {
        fn();
      },
    });
  }, []);

  const actionButtons = useMemo(() => {
    if (!record) return null;
    const buttons: React.ReactNode[] = [];
    const btnSx = { mr: 1, mb: 1 };

    if (record.status === 'pending') {
      buttons.push(
        <Button
          key='approve'
          variant='contained'
          color='success'
          size='small'
          startIcon={<CheckCircle size={16} />}
          sx={btnSx}
          onClick={() =>
            handleAction(t('crm.returnDetail.action_approve'), () => crmApi.returns.approve(id!))
          }
        >
          {t('crm.returnDetail.action_approve')}
        </Button>,
        <Button
          key='reject'
          variant='outlined'
          color='error'
          size='small'
          startIcon={<XCircle size={16} />}
          sx={btnSx}
          onClick={() =>
            handleAction(t('crm.returnDetail.action_reject'), () => crmApi.returns.reject(id!))
          }
        >
          {t('crm.returnDetail.action_reject')}
        </Button>
      );
    }
    if (record.status === 'approved') {
      buttons.push(
        <Button
          key='receive'
          variant='contained'
          color='info'
          size='small'
          startIcon={<Package size={16} />}
          sx={btnSx}
          onClick={() =>
            handleAction(t('crm.returnDetail.action_receive'), () => crmApi.returns.receive(id!))
          }
        >
          {t('crm.returnDetail.action_receive')}
        </Button>
      );
    }
    if (record.status === 'received') {
      buttons.push(
        <Button
          key='complete'
          variant='contained'
          color='success'
          size='small'
          startIcon={<CheckCircle size={16} />}
          sx={btnSx}
          onClick={() =>
            handleAction(t('crm.returnDetail.action_complete'), () => crmApi.returns.complete(id!))
          }
        >
          {t('crm.returnDetail.action_complete')}
        </Button>
      );
    }
    if (['pending', 'approved'].includes(record.status)) {
      buttons.push(
        <Button
          key='cancel'
          variant='outlined'
          color='primary'
          size='small'
          startIcon={<Ban size={16} />}
          sx={btnSx}
          onClick={() =>
            handleAction(t('crm.returnDetail.action_cancel'), () => crmApi.returns.cancel(id!))
          }
        >
          {t('crm.returnDetail.action_cancel')}
        </Button>
      );
    }
    if (['pending', 'cancelled'].includes(record.status)) {
      buttons.push(
        <Button
          key='delete'
          variant='outlined'
          color='error'
          size='small'
          sx={btnSx}
          onClick={() =>
            setConfirmAction({
              label: t('crm.returnDetail.action_delete'),
              fn: () => deleteMutation.mutate(id!),
            })
          }
        >
          {t('crm.returnDetail.action_delete')}
        </Button>
      );
    }
    return buttons.length > 0 ? (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 2 }}>{buttons}</Box>
    ) : null;
  }, [record, id, actionMutation, deleteMutation, handleAction, t]);

  return (
    <PageContainer
      title={
        record
          ? t('crm.returnDetail.title_with_no', { no: record.return_no })
          : t('crm.returnDetail.title_default')
      }
      subtitle={record ? statusLabelMap[record.status] : ''}
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <RotateCcw style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main}, ${ct.primary.dark})`,
      }}
    >
      <>
        {actionButtons}

        <DetailPageTemplate
          title={record?.return_no || ''}
          detailItemName={record?.return_no || record?.id || '退货详情'}
          backHref={CRM_PATHS.returns}
          loading={loading}
          error={returnQuery.isError ? t('crm.returnDetail.error_load') : undefined}
          sections={sections}
          headerContent={
            record ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography
                  variant='h6'
                  sx={{ fontFamily: 'monospace', fontWeight: 700 }}
                >
                  {record.return_no}
                </Typography>
                {getStatusChip(record.status)}
              </Box>
            ) : undefined
          }
        />

        <ConfirmDialog
          isOpen={!!confirmAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => {
            confirmAction?.fn();
            setConfirmAction(null);
          }}
          title={t('crm.returnDetail.dialog_confirm_title', {
            label: confirmAction?.label || t('crm.returnDetail.dialog_confirm_default_label'),
          })}
          message={t('crm.returnDetail.dialog_confirm_message', {
            label:
              confirmAction?.label || t('crm.returnDetail.dialog_confirm_default_message_label'),
          })}
        />
      </>
    </PageContainer>
  );
};

export default ReturnDetailPage;
