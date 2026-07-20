import React, { useMemo, useState, useCallback } from 'react';
import { Typography, Box, InputLabel, Button, Chip } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { RotateCcw, CheckCircle, XCircle, Package, CircleDot, Ban } from 'lucide-react';
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

const statusLabelMap: Record<ReturnStatus, string> = {
  pending: '待审核',
  approved: '已审核',
  rejected: '已拒绝',
  received: '已收货',
  completed: '已完成',
  cancelled: '已取消',
};

const statusColorMap: Record<ReturnStatus, 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  received: 'info',
  completed: 'success',
  cancelled: 'primary',
};

const returnTypeLabelMap: Record<ReturnType, string> = {
  return: '退货',
  exchange: '换货',
};

const timelineSteps: ReturnStatus[] = ['pending', 'approved', 'received', 'completed'];

const ReturnDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [confirmAction, setConfirmAction] = useState<{ label: string; fn: () => void } | null>(null);

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
  const financeStatus = financeQuery.data?.success && financeQuery.data.data ? financeQuery.data.data : null;
  const inventoryStatus = inventoryQuery.data?.success && inventoryQuery.data.data ? inventoryQuery.data.data : null;
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
    mutationFn: async (fn: () => Promise<unknown>) => { await fn(); },
    onSuccess: () => {
      addNotification({ type: 'success', title: '操作成功', message: '退货单状态已更新' });
      invalidate();
    },
    onError: () => {
      addNotification({ type: 'error', title: '操作失败', message: '操作退货单失败' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (returnId: string) => crmApi.returns.delete(returnId),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '退货单已删除' });
      navigate(CRM_PATHS.returns);
    },
  });

  const formatCurrency = (amount?: number) => {
    if (amount == null) return '-';
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDateTime = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-CN');
  };

  const getStatusChip = (status: ReturnStatus) => (
    <Chip size='small' color={statusColorMap[status] || 'primary'} label={statusLabelMap[status] || status} />
  );

  const basicInfoSection = useMemo(() => {
    if (!record) return null;
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>退货单号</InputLabel>
          <Typography sx={{ fontWeight: 600, fontFamily: 'monospace', mt: 0.5 }}>{record.return_no}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>客户ID</InputLabel>
          <Typography sx={{ fontFamily: 'monospace', mt: 0.5 }}>{record.customer_id}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>订单ID</InputLabel>
          <Typography sx={{ fontFamily: 'monospace', mt: 0.5 }}>{record.order_id || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>类型</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{returnTypeLabelMap[record.return_type]}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>原因</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{record.reason}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>状态</InputLabel>
          <Box sx={{ mt: 0.5 }}>{getStatusChip(record.status)}</Box>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>退款金额</InputLabel>
          <Typography sx={{ fontFamily: 'monospace', color: record.refund_amount ? ct.primary.main : 'inherit', mt: 0.5 }}>
            {formatCurrency(record.refund_amount)}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>仓库ID</InputLabel>
          <Typography sx={{ fontFamily: 'monospace', mt: 0.5 }}>{record.warehouse_id || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>工单ID</InputLabel>
          <Typography sx={{ fontFamily: 'monospace', mt: 0.5 }}>{record.ticket_id || '-'}</Typography>
        </Box>
        {record.reason_detail && (
          <Box sx={{ gridColumn: 'span 3' }}>
            <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>详细原因</InputLabel>
            <Typography sx={{ mt: 0.5, color: 'text.secondary' }}>{record.reason_detail}</Typography>
          </Box>
        )}
      </Box>
    );
  }, [record]);

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
                    color: isCompleted ? ct.success.main : isCurrent ? ct.primary.main : 'text.secondary',
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
        {isRejected && <Chip size='small' color='error' label='已拒绝' sx={{ ml: 1 }} />}
        {isCancelled && <Chip size='small' color='primary' label='已取消' sx={{ ml: 1 }} />}
      </Box>
    );
  }, [record]);

  const itemsSection = useMemo(() => {
    if (items.length === 0) {
      return <Typography color='text.secondary'>暂无退货商品</Typography>;
    }
    return (
      <Box sx={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, color: '#999' }}>商品ID</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 12, color: '#999' }}>数量</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 12, color: '#999' }}>单价</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: 12, color: '#999' }}>合计</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.85rem' }}>{item.product_id}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{item.quantity}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>{formatCurrency(item.unit_price)}</td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', color: ct.primary.main }}>
                  {formatCurrency(item.total_amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    );
  }, [items]);

  const financeSection = useMemo(() => {
    if (!financeStatus) return <Typography color='text.secondary'>暂无财务信息</Typography>;
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>退款金额</InputLabel>
          <Typography sx={{ fontFamily: 'monospace', color: ct.primary.main, mt: 0.5 }}>
            {formatCurrency(financeStatus.refund_amount)}
          </Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>退款状态</InputLabel>
          <Chip size='small' color={financeStatus.refund_status === 'completed' ? 'success' : 'warning'} label={financeStatus.refund_status} sx={{ mt: 0.5 }} />
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>退款时间</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDateTime(financeStatus.refunded_at)}</Typography>
        </Box>
      </Box>
    );
  }, [financeStatus]);

  const inventorySection = useMemo(() => {
    if (!inventoryStatus) return <Typography color='text.secondary'>暂无库存信息</Typography>;
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>是否收货</InputLabel>
          <Chip size='small' color={inventoryStatus.received ? 'success' : 'primary'} label={inventoryStatus.received ? '已收货' : '未收货'} sx={{ mt: 0.5 }} />
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>收货时间</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{formatDateTime(inventoryStatus.received_at)}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>仓库ID</InputLabel>
          <Typography sx={{ fontFamily: 'monospace', mt: 0.5 }}>{inventoryStatus.warehouse_id || '-'}</Typography>
        </Box>
        <Box>
          <InputLabel sx={{ fontSize: 12, color: 'text.secondary' }}>商品数量</InputLabel>
          <Typography sx={{ mt: 0.5 }}>{inventoryStatus.items_count}</Typography>
        </Box>
      </Box>
    );
  }, [inventoryStatus]);

  const sections: SectionConfig[] = useMemo(
    () => [
      { id: 'basic', title: '基本信息', content: basicInfoSection },
      { id: 'timeline', title: '进度', content: timelineSection },
      { id: 'items', title: '退货商品', content: itemsSection },
      { id: 'finance', title: '财务状态', content: financeSection },
      { id: 'inventory', title: '库存状态', content: inventorySection },
    ],
    [basicInfoSection, timelineSection, itemsSection, financeSection, inventorySection]
  );

  const handleAction = useCallback((label: string, fn: () => Promise<unknown>) => {
    setConfirmAction({ label, fn: () => { fn(); } });
  }, []);

  const actionButtons = useMemo(() => {
    if (!record) return null;
    const buttons: React.ReactNode[] = [];
    const btnSx = { mr: 1, mb: 1 };

    if (record.status === 'pending') {
      buttons.push(
        <Button key='approve' variant='contained' color='success' size='small' startIcon={<CheckCircle size={16} />} sx={btnSx}
          onClick={() => handleAction('审核通过', () => crmApi.returns.approve(id!))}>
          审核通过
        </Button>,
        <Button key='reject' variant='outlined' color='error' size='small' startIcon={<XCircle size={16} />} sx={btnSx}
          onClick={() => handleAction('拒绝', () => crmApi.returns.reject(id!))}>
          拒绝
        </Button>,
      );
    }
    if (record.status === 'approved') {
      buttons.push(
        <Button key='receive' variant='contained' color='info' size='small' startIcon={<Package size={16} />} sx={btnSx}
          onClick={() => handleAction('确认收货', () => crmApi.returns.receive(id!))}>
          确认收货
        </Button>,
      );
    }
    if (record.status === 'received') {
      buttons.push(
        <Button key='complete' variant='contained' color='success' size='small' startIcon={<CheckCircle size={16} />} sx={btnSx}
          onClick={() => handleAction('完成', () => crmApi.returns.complete(id!))}>
          完成
        </Button>,
      );
    }
    if (['pending', 'approved'].includes(record.status)) {
      buttons.push(
        <Button key='cancel' variant='outlined' color='primary' size='small' startIcon={<Ban size={16} />} sx={btnSx}
          onClick={() => handleAction('取消', () => crmApi.returns.cancel(id!))}>
          取消
        </Button>,
      );
    }
    if (['pending', 'cancelled'].includes(record.status)) {
      buttons.push(
        <Button key='delete' variant='outlined' color='error' size='small' sx={btnSx}
          onClick={() => setConfirmAction({ label: '删除', fn: () => deleteMutation.mutate(id!) })}>
          删除
        </Button>,
      );
    }
    return buttons.length > 0 ? <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 2 }}>{buttons}</Box> : null;
  }, [record, id, actionMutation, deleteMutation, handleAction]);

  return (
    <PageContainer
      title={record ? `退货单 ${record.return_no}` : '退货单详情'}
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
          loading={loading}
          error={returnQuery.isError ? '加载退货单信息失败' : undefined}
          sections={sections}
          headerContent={
            record ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant='h6' sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
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
          title={`确认${confirmAction?.label || '操作'}`}
          message={`确定要${confirmAction?.label || '执行此操作'}吗？`}
        />
      </>
    </PageContainer>
  );
};

export default ReturnDetailPage;
