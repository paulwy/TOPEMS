import React, { useState, useMemo } from 'react';
import { FINANCE_PATHS } from '@/modules/finance/config';
import {
  Box,
  Plus,
  Trash2,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataExport, BackButton, PageContainer, CurrencyField } from '@/components/common';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction, FilterConfig } from '@/components/templates';
import { MuiStatCard as StatCard, StatCardGroup } from '@/components';
import { useNotification } from '@/hooks/useNotification';
import { receivablePayableApi } from '@/api/finance';
import type { SalesInvoice, InvoiceStatus, PaginatedResult } from '@/types/finance';
import { apiLogger } from '@/utils/logger';

import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Box as MuiBox,
  Typography,
  Stack,
  CircularProgress,
  IconButton,
  Button,
} from '@mui/material';

interface InvoiceListItem extends SalesInvoice {
  tax_rate: number;
}

const FinanceInvoicePage: React.FC = () => {
  const { success, error } = useNotification();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceListItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  const [newInvoice, setNewInvoice] = useState({
    customer_id: '',
    customer_name: '',
    amount: 0,
    tax_rate: 13,
    invoice_type: 'normal' as 'normal' | 'special',
  });

  const invoiceListQuery = useQuery({
    queryKey: ['finance-invoices', page, pageSize, filterStatus],
    queryFn: async () => {
      const response = await receivablePayableApi.listSalesInvoices({
        status: filterStatus || undefined,
        page,
        pagesize: pageSize,
      });
      if (!response.success || !response.data) {
        throw new Error(response.message || '获取发票列表失败');
      }
      const itemsWithTaxRate = (response.data.items || []).map((item) => ({
        ...item,
        tax_rate: item.amount > 0 ? Math.round((item.tax_amount / item.amount) * 100) : 0,
      }));
      return {
        items: itemsWithTaxRate,
        page: response.data.page || 1,
        pagesize: response.data.pagesize || 10,
        total: response.data.total || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: {
      customer_id: string;
      invoice_date: string;
      amount: number;
      tax_amount: number;
      total_amount: number;
      invoice_type: 'normal' | 'special';
    }) => {
      const response = await receivablePayableApi.createSalesInvoice(data);
      if (!response.success) {
        throw new Error((response as any).message || '开具失败');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-invoices'] });
      success('发票开具成功');
    },
    onError: (err: any) => {
      apiLogger.error('开具发票失败:', err);
      error(err.message || '开具发票失败');
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesInvoice> }) => {
      const response = await receivablePayableApi.updateSalesInvoice(id, data);
      if (!response.success) {
        throw new Error((response as any).message || '更新失败');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-invoices'] });
    },
    onError: (err: any) => {
      apiLogger.error('更新发票失败:', err);
      error(err.message || '更新发票失败');
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await receivablePayableApi.deleteSalesInvoice(id);
      if (!response.success) {
        throw new Error((response as any).message || '删除失败');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-invoices'] });
      success('发票删除成功');
    },
    onError: (err: any) => {
      apiLogger.error('删除发票失败:', err);
      error(err.message || '删除发票失败');
    },
  });

  const invoiceData = invoiceListQuery.data?.items || [];
  const total = invoiceListQuery.data?.total || 0;
  const loading = invoiceListQuery.isLoading || createInvoiceMutation.isPending || updateInvoiceMutation.isPending || deleteInvoiceMutation.isPending;

  // 统计卡片数据
  const statCards = useMemo(() => {
    const totalCount = total;
    const verifiedCount = invoiceData.filter(
      (i) => i.status === 'approved' || i.status === 'invoiced'
    ).length;
    const pendingCount = invoiceData.filter((i) => i.status === 'draft').length;
    const voidedCount = 0; // InvoiceStatus 没有 cancelled 状态
    const totalAmount = invoiceData.reduce((sum, i) => sum + i.amount, 0);
    const totalTaxAmount = invoiceData.reduce((sum, i) => sum + i.tax_amount, 0);

    return [
      {
        title: '总发票数',
        value: totalCount,
        icon: <FileText size={24} />,
        color: 'primary' as const,
      },
      {
        title: '已开票',
        value: verifiedCount,
        icon: <CheckCircle size={24} />,
        color: 'success' as const,
      },
      {
        title: '待开票',
        value: pendingCount,
        icon: <Clock size={24} />,
        color: 'warning' as const,
      },
      {
        title: '已作废',
        value: voidedCount,
        icon: <XCircle size={24} />,
        color: 'error' as const,
      },
      {
        title: '总金额',
        value: `¥${totalAmount.toLocaleString()}`,
        icon: <FileText size={24} />,
        color: 'secondary' as const,
      },
      {
        title: '总税额',
        value: `¥${totalTaxAmount.toLocaleString()}`,
        icon: <FileText size={24} />,
        color: 'info' as const,
      },
    ];
  }, [invoiceData, total]);

  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      {
        color: 'success' | 'warning' | 'error' | 'default';
        icon: React.ReactNode;
        label: string;
      }
    > = {
      draft: { color: 'warning', icon: <Clock size={12} />, label: '草稿' },
      approved: {
        color: 'success',
        icon: <CheckCircle size={12} />,
        label: '已批准',
      },
      invoiced: {
        color: 'success',
        icon: <CheckCircle size={12} />,
        label: '已开票',
      },
      partial_received: {
        color: 'warning',
        icon: <Clock size={12} />,
        label: '部分收款',
      },
      received: {
        color: 'success',
        icon: <CheckCircle size={12} />,
        label: '已收款',
      },
      overdue: { color: 'error', icon: <Clock size={12} />, label: '已逾期' },
    };
    return configs[status] || { color: 'default', icon: null, label: status };
  };

  const handleCreate = async () => {
    if (!newInvoice.customer_id || !newInvoice.amount) {
      error('请填写必填信息');
      return;
    }

    try {
      await createInvoiceMutation.mutateAsync({
        customer_id: newInvoice.customer_id,
        invoice_date: new Date().toISOString().split('T')[0],
        amount: newInvoice.amount,
        tax_amount: newInvoice.amount * (newInvoice.tax_rate / 100),
        total_amount: newInvoice.amount * (1 + newInvoice.tax_rate / 100),
        invoice_type: newInvoice.invoice_type,
      });
      setShowCreateModal(false);
      setNewInvoice({
        customer_id: '',
        customer_name: '',
        amount: 0,
        tax_rate: 13,
        invoice_type: 'normal',
      });
    } catch {
    }
  };

  const handleVerify = async (invoice: InvoiceListItem) => {
    try {
      await updateInvoiceMutation.mutateAsync({
        id: invoice.id,
        data: { status: 'invoiced' },
      });
      success('发票认证成功');
    } catch {
    }
  };

  const handleViewDetail = (invoice: InvoiceListItem) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该发票吗？')) return;
    try {
      await deleteInvoiceMutation.mutateAsync(id);
    } catch {
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage + 1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleSearch = () => {
    setPage(1);
  };

  const handleReset = () => {
    setSearchQuery('');
    setFilterStatus('');
    setFilterType('');
    setPage(1);
  };

  const columns = useMemo(
    () => [
      {
        id: 'invoice_no',
        label: '发票号码',
        render: (row: InvoiceListItem) => (
          <MuiBox sx={{ fontWeight: 600, color: 'success.main' }}>{row.invoice_no}</MuiBox>
        ),
      },
      {
        id: 'invoice_date',
        label: '开票日期',
        render: (row: InvoiceListItem) => (
          <MuiBox sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{row.invoice_date}</MuiBox>
        ),
      },
      {
        id: 'customer_name',
        label: '客户名称',
        render: (row: InvoiceListItem) => (
          <MuiBox sx={{ fontWeight: 500 }}>{row.customer_name}</MuiBox>
        ),
      },
      {
        id: 'amount',
        label: '金额',
        render: (row: InvoiceListItem) => (
          <MuiBox sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
            ¥{row.amount.toLocaleString()}
          </MuiBox>
        ),
      },
      {
        id: 'tax_rate',
        label: '税率',
        render: (row: InvoiceListItem) => (
          <Chip
            label={`${row.tax_rate}%`}
            size='small'
          />
        ),
      },
      {
        id: 'tax_amount',
        label: '税额',
        render: (row: InvoiceListItem) => (
          <MuiBox sx={{ color: 'warning.main', fontFamily: 'monospace' }}>
            ¥{row.tax_amount.toLocaleString()}
          </MuiBox>
        ),
      },
      {
        id: 'total_amount',
        label: '价税合计',
        render: (row: InvoiceListItem) => (
          <MuiBox sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
            ¥{row.total_amount.toLocaleString()}
          </MuiBox>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row: InvoiceListItem) => {
          const config = getStatusConfig(row.status);
          return (
            <Chip
              label={config.label}
              size='small'
              color={config.color}
              icon={config.icon as React.ReactElement}
            />
          );
        },
      },
    ],
    []
  );

  const rowActions = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye sx={{ width: 16, height: 16 }} />,
        onClick: (row: InvoiceListItem) => handleViewDetail(row),
      },
      {
        label: '认证抵扣',
        icon: <CheckCircle sx={{ width: 16, height: 16 }} />,
        color: 'success' as const,
        show: (row: InvoiceListItem) => row.status === 'draft',
        onClick: (row: InvoiceListItem) => handleVerify(row),
      },
      {
        label: '删除',
        icon: <Trash2 sx={{ width: 16, height: 16 }} />,
        color: 'error' as const,
        onClick: (row: InvoiceListItem) => handleDelete(row.id),
      },
    ],

    []
  );

  const advancedFilters = useMemo(
    () => [
      {
        id: 'invoice_type',
        label: '发票类型',
        type: 'select' as const,
        options: [
          { value: 'normal', label: '增值税普通发票' },
          { value: 'special', label: '增值税专用发票' },
        ],
        value: filterType,
        onChange: (value: unknown) => setFilterType(value as string),
      },
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { value: 'pending', label: '待开票' },
          { value: 'approved', label: '已批准' },
          { value: 'invoiced', label: '已开票' },
          { value: 'paid', label: '已收款' },
          { value: 'cancelled', label: '已作废' },
        ],
        value: filterStatus,
        onChange: (value: unknown) => setFilterStatus(value as string),
      },
    ],
    [filterType, filterStatus]
  );

  const exportFields = useMemo(
    () => [
      { key: 'invoice_no', title: '发票号码' },
      { key: 'invoice_date', title: '开票日期' },
      { key: 'customer_name', title: '客户名称' },
      { key: 'amount', title: '金额' },
      { key: 'tax_rate', title: '税率' },
      { key: 'tax_amount', title: '税额' },
      { key: 'total_amount', title: '价税合计' },
      { key: 'status', title: '状态' },
    ],
    []
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      <MuiBox
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 'sm',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <MuiBox
          sx={{
            maxWidth: 1280,
            mx: 'auto',
            px: { xs: 2, sm: 3, lg: 4 },
            py: 3,
          }}
        >
          <Stack
            direction='row'
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Stack
              direction='row'
              sx={{ alignItems: 'center' }}
              spacing={2}
            >
              <BackButton href={FINANCE_PATHS.dashboard} />
              <MuiBox>
                <Typography
                  variant='h5'
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: 700,
                  }}
                >
                  <MuiBox
                    component='span'
                    sx={{
                      width: 28,
                      height: 28,
                      mr: 1.5,
                      color: 'success.main',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <FileText size={28} />
                  </MuiBox>
                  发票管理
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  管理增值税发票，认证抵扣和查验
                </Typography>
              </MuiBox>
            </Stack>
            <Stack
              direction='row'
              spacing={1}
            >
              <IconButton
                onClick={() => invoiceListQuery.refetch()}
                disabled={loading}
              >
                <RefreshCw sx={{ width: 20, height: 20 }} />
              </IconButton>
              <DataExport
                data={invoiceData as unknown as Record<string, unknown>[]}
                fields={exportFields}
                defaultFileName='发票数据'
                buttonText='数据导出'
              />
              <Button
                variant='contained'
                startIcon={<Plus sx={{ width: 20, height: 20 }} />}
                onClick={() => setShowCreateModal(true)}
              >
                开具发票
              </Button>
            </Stack>
          </Stack>
        </MuiBox>
      </MuiBox>

      <MuiBox sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}>
        {/* 统计卡片 */}
        <StatCardGroup
          stats={statCards}
          columns={6}
        />

        <ListPageTemplate
          columns={columns}
          data={invoiceData}
          loading={loading}
          searchable
          searchPlaceholder='搜索发票号或客户...'
          filters={advancedFilters}
          filtersValue={{
            invoice_type: filterType,
            status: filterStatus,
          }}
          onFilterChange={(filters) => {
            if (filters.invoice_type !== undefined) setFilterType(filters.invoice_type as string);
            if (filters.status !== undefined) setFilterStatus(filters.status as string);
          }}
          onSearch={handleSearch}
          actions={[
            { label: '搜索', variant: 'outlined', onClick: handleSearch },
            { label: '重置', variant: 'outlined', onClick: handleReset },
          ]}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          rowActions={rowActions}
          pagination={{
            page: page - 1,
            pageSize,
            total,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
          }}
        />
      </MuiBox>

      {/* Create Modal */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>开具发票</DialogTitle>
        <DialogContent>
          <Stack
            spacing={3}
            sx={{ pt: 2 }}
          >
            <TextField
              label='客户ID *'
              fullWidth
              value={newInvoice.customer_id}
              onChange={(e) => setNewInvoice({ ...newInvoice, customer_id: e.target.value })}
              placeholder='请输入客户ID'
            />
            <Stack
              direction='row'
              spacing={2}
            >
              <CurrencyField
                label='金额 *'
                fullWidth
                value={newInvoice.amount || 0}
                onChange={(val) =>
                  setNewInvoice({
                    ...newInvoice,
                    amount: val,
                  })
                }
              />
              <FormControl fullWidth>
                <InputLabel>税率</InputLabel>
                <Select
                  value={newInvoice.tax_rate}
                  label='税率'
                  onChange={(e) =>
                    setNewInvoice({
                      ...newInvoice,
                      tax_rate: e.target.value as number,
                    })
                  }
                >
                  <MenuItem value={13}>13%</MenuItem>
                  <MenuItem value={9}>9%</MenuItem>
                  <MenuItem value={6}>6%</MenuItem>
                  <MenuItem value={3}>3%</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <FormControl fullWidth>
              <InputLabel>发票类型</InputLabel>
              <Select
                value={newInvoice.invoice_type}
                label='发票类型'
                onChange={(e) =>
                  setNewInvoice({
                    ...newInvoice,
                    invoice_type: e.target.value as 'normal' | 'special',
                  })
                }
              >
                <MenuItem value='normal'>增值税普通发票</MenuItem>
                <MenuItem value='special'>增值税专用发票</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleCreate}
          >
            开具
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Modal */}
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>发票详情</DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Stack
              spacing={3}
              sx={{ pt: 2 }}
            >
              <MuiBox
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <MuiBox>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    发票号码
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 600, color: 'success.main' }}
                  >
                    {selectedInvoice.invoice_no}
                  </Typography>
                </MuiBox>
                <MuiBox>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    开票日期
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedInvoice.invoice_date}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <MuiBox>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    客户名称
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedInvoice.customer_name}
                  </Typography>
                </MuiBox>
                <MuiBox>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    客户编码
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedInvoice.customer_code}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 2,
                }}
              >
                <MuiBox sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    金额
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700 }}
                  >
                    ¥{selectedInvoice.amount.toLocaleString()}
                  </Typography>
                </MuiBox>
                <MuiBox sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    税率
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700 }}
                  >
                    {selectedInvoice.tax_rate}%
                  </Typography>
                </MuiBox>
                <MuiBox sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    税额
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'warning.main' }}
                  >
                    ¥{selectedInvoice.tax_amount.toLocaleString()}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <MuiBox sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    价税合计
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'success.main' }}
                  >
                    ¥{selectedInvoice.total_amount.toLocaleString()}
                  </Typography>
                </MuiBox>
                <MuiBox>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    状态
                  </Typography>
                  <Chip
                    label={getStatusConfig(selectedInvoice.status).label}
                    size='small'
                    color={getStatusConfig(selectedInvoice.status).color}
                    sx={{ mt: 0.5 }}
                  />
                </MuiBox>
              </MuiBox>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FinanceInvoicePage;
