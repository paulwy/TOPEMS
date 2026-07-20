import React, { useMemo } from 'react';
import { useUrlListState } from '@/hooks';
import { Typography, Chip } from '@mui/material';
import { StatusBadge } from '@topems/shared-components';
import { PageContainer } from '@/components/common';
import { ListPageTemplate } from '@/components/templates';
import type { RowAction, FilterConfig, ColumnDef } from '@/components/templates';
import type { ReturnRecord, ReturnStatus, ReturnType } from '@/api/crm';
import { crmApi } from '@/api/crm';
import { useNotificationStore } from '@/store';
import { Eye, CheckCircle, XCircle, Trash2, RotateCcw } from 'lucide-react';
import { CRM_PATHS } from '@/modules/crm/config';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const statusMap: Record<ReturnStatus, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
  pending: { label: '待审核', color: 'warning' },
  approved: { label: '已审核', color: 'success' },
  rejected: { label: '已拒绝', color: 'error' },
  received: { label: '已收货', color: 'info' },
  completed: { label: '已完成', color: 'success' },
  cancelled: { label: '已取消', color: 'default' },
};

const returnTypeMap: Record<ReturnType, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
  return: { label: '退货', color: 'warning' },
  exchange: { label: '换货', color: 'info' },
};

const ReturnListPage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  // URL 同步的列表状态
  const listState = useUrlListState<{
    status: string;
    return_type: string;
  }>({
    defaultSearch: '',
    defaultPageSize: 20,
    defaultFilters: {
      status: '',
      return_type: '',
    },
    baseIndex: 1,
    historyMode: 'replace',
  });
  const {
    searchQuery,
    debouncedSearch,
    currentPage,
    pageSize,
    filters: urlFilters,
    setSearchQuery,
    setFilter,
  } = listState;

  const returnsQuery = useQuery({
    queryKey: ['crm-returns', currentPage, pageSize, debouncedSearch, urlFilters.status, urlFilters.return_type],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        page_size: pageSize,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (urlFilters.status) params.status = urlFilters.status;
      if (urlFilters.return_type) params.return_type = urlFilters.return_type;
      return crmApi.returns.list(params);
    },
    staleTime: 5 * 60 * 1000,
  });

  const returns: ReturnRecord[] =
    returnsQuery.data?.success && returnsQuery.data.data ? returnsQuery.data.data.items || [] : [];
  const total =
    returnsQuery.data?.success && returnsQuery.data.data ? returnsQuery.data.data.total || 0 : 0;
  const loading = returnsQuery.isLoading;

  const approveMutation = useMutation({
    mutationFn: (id: string) => crmApi.returns.approve(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '审核通过', message: '退货单已审核通过' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CRM.RETURNS });
    },
    onError: () => {
      addNotification({ type: 'error', title: '操作失败', message: '审核退货单失败' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => crmApi.returns.reject(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '已拒绝', message: '退货单已拒绝' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CRM.RETURNS });
    },
    onError: () => {
      addNotification({ type: 'error', title: '操作失败', message: '拒绝退货单失败' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmApi.returns.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '退货单已删除' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CRM.RETURNS });
    },
    onError: () => {
      addNotification({ type: 'error', title: '删除失败', message: '无法删除退货单' });
    },
  });

  const formatCurrency = (amount?: number) => {
    if (amount == null) return '-';
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const getStatusBadge = (status: ReturnStatus) => {
    const s = statusMap[status] || { label: status, color: 'default' as const };
    return <StatusBadge status={status} label={s.label} color={s.color} size='sm' />;
  };

  const getReturnTypeBadge = (returnType: ReturnType) => {
    const t = returnTypeMap[returnType] || { label: returnType, color: 'default' as const };
    return <StatusBadge status={returnType} label={t.label} color={t.color} size='sm' />;
  };

  const columns = useMemo<ColumnDef<ReturnRecord>[]>(
    () => [
      {
        id: 'return_no',
        label: '退货单号',
        render: (row: ReturnRecord) => (
          <Typography variant='body2' sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
            {row.return_no}
          </Typography>
        ),
      },
      {
        id: 'customer_id',
        label: '客户ID',
        render: (row: ReturnRecord) => (
          <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {row.customer_id.slice(0, 8)}...
          </Typography>
        ),
      },
      {
        id: 'return_type',
        label: '类型',
        render: (row: ReturnRecord) => getReturnTypeBadge(row.return_type),
      },
      {
        id: 'reason',
        label: '原因',
        render: (row: ReturnRecord) => (
          <Typography variant='body2' noWrap sx={{ maxWidth: 160 }}>
            {row.reason}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row: ReturnRecord) => getStatusBadge(row.status),
      },
      {
        id: 'refund_amount',
        label: '退款金额',
        render: (row: ReturnRecord) => (
          <Typography variant='body2' sx={{ fontFamily: 'monospace', color: row.refund_amount ? ct.primary.main : 'inherit' }}>
            {formatCurrency(row.refund_amount)}
          </Typography>
        ),
      },
      {
        id: 'created_at',
        label: '创建时间',
        render: (row: ReturnRecord) => formatDate(row.created_at),
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<ReturnRecord>[]>(
    () => [
      {
        label: '查看',
        icon: <Eye size={16} />,
        onClick: (row: ReturnRecord) => navigate(CRM_PATHS.returnDetail.replace(':id', row.id)),
      },
      {
        label: '审核通过',
        icon: <CheckCircle size={16} />,
        onClick: (row: ReturnRecord) => approveMutation.mutate(row.id),
        hidden: (row: ReturnRecord) => row.status !== 'pending',
      },
      {
        label: '拒绝',
        icon: <XCircle size={16} />,
        color: 'error',
        onClick: (row: ReturnRecord) => rejectMutation.mutate(row.id),
        hidden: (row: ReturnRecord) => row.status !== 'pending',
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row: ReturnRecord) => deleteMutation.mutate(row.id),
        confirm: true,
        confirmMessage: '确定要删除此退货单吗？',
        hidden: (row: ReturnRecord) => row.status !== 'pending' && row.status !== 'cancelled',
      },
    ],
    [approveMutation, rejectMutation, deleteMutation, navigate]
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'pending', label: '待审核' },
          { value: 'approved', label: '已审核' },
          { value: 'rejected', label: '已拒绝' },
          { value: 'received', label: '已收货' },
          { value: 'completed', label: '已完成' },
          { value: 'cancelled', label: '已取消' },
        ],
        value: urlFilters.status,
        onChange: (value) => {
          setFilter('status', value as string);
        },
      },
      {
        id: 'return_type',
        label: '类型',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'return', label: '退货' },
          { value: 'exchange', label: '换货' },
        ],
        value: urlFilters.return_type,
        onChange: (value) => {
          setFilter('return_type', value as string);
        },
      },
    ],
    [urlFilters.status, urlFilters.return_type, setFilter]
  );

  return (
    <PageContainer
      title='退货/售后管理'
      subtitle='管理退货和换货申请，跟踪退款与库存状态'
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <RotateCcw style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main}, ${ct.primary.dark})`,
      }}
    >
      <ListPageTemplate<ReturnRecord>
        title=''
        subtitle=''
        backButton={{ href: '/crm/dashboard' }}
        columns={columns}
        data={returns}
        loading={loading}
        searchable
        searchPlaceholder='搜索退货单号或原因...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        rowActions={rowActions}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => {
            listState.setCurrentPage(page + 1);
          },
          onPageSizeChange: (newSize) => {
            listState.setPageSize(newSize);
          },
        }}
        emptyActionButton={{
          label: '暂无退货单',
          icon: <RotateCcw size={18} />,
          onClick: () => {},
        }}
      />
    </PageContainer>
  );
};

export default ReturnListPage;
