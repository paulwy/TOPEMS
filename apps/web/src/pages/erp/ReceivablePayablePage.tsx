import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type { Receivable, Payable, PaginationParams } from '@/api/erp';
import { receivableApi, payableApi } from '@/api/erp';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Edit, Trash2, Eye, Save, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const ReceivablePayablePage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Receivable | Payable | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<{
    [key: string]: unknown;
    customer_name: string;
    supplier_name: string;
    amount: number;
    due_date: string;
    status: string;
  }>({
    customer_name: '',
    supplier_name: '',
    amount: 0,
    due_date: '',
    status: 'pending',
  });

  const params: PaginationParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data: receivablesData, isLoading: receivablesLoading } = useQuery({
    queryKey: [...QUERY_KEYS.ERP.RECEIVABLES, params],
    queryFn: async () => {
      const response = await receivableApi.list(params);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 0,
  });

  const { data: payablesData, isLoading: payablesLoading } = useQuery({
    queryKey: [...QUERY_KEYS.ERP.PAYABLES, params],
    queryFn: async () => {
      const response = await payableApi.list(params);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 1,
  });

  const receivables = receivablesData?.items || [];
  const payables = payablesData?.items || [];
  const data = activeTab === 0 ? receivables : payables;
  const total = activeTab === 0 ? (receivablesData?.total || 0) : (payablesData?.total || 0);
  const loading = activeTab === 0 ? receivablesLoading : payablesLoading;

  const invalidateData = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.RECEIVABLES });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.PAYABLES });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<Receivable & Payable>) =>
      activeTab === 0 ? receivableApi.create(data) : payableApi.create(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '应收/应付记录已添加' });
      invalidateData();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '添加记录失败' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Receivable & Payable> }) =>
      activeTab === 0 ? receivableApi.update(id, data) : payableApi.update(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '更新成功', message: '记录信息已更新' });
      invalidateData();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '更新记录失败' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => (activeTab === 0 ? receivableApi.delete(id) : payableApi.delete(id)),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '记录已删除' });
      invalidateData();
    },
    onError: (error: unknown) => {
      apiLogger.error('删除失败:', error);
      addNotification({ type: 'error', title: '删除失败', message: '无法删除记录' });
    },
  });

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待处理',
      partial: '部分收付',
      paid: '已结清',
      overdue: '逾期',
      cancelled: '已取消',
    };
    return statusMap[status] || status;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        bg: string;
        color: string;
      }
    > = {
      pending: { label: '待处理', bg: 'warning.light', color: 'warning.700' },
      partial: { label: '部分收付', bg: 'info.light', color: 'info.700' },
      paid: { label: '已结清', bg: 'success.lighter', color: 'success.700' },
      overdue: { label: '逾期', bg: 'error.lighter', color: 'error.dark' },
      cancelled: { label: '已取消', bg: 'grey.100', color: 'text.secondary' },
    };
    const s = statusMap[status] || { label: status, bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        size='small'
        label={s.label}
        sx={{ backgroundColor: s.bg, color: s.color, fontWeight: 500 }}
      />
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('确定要删除这条记录吗?')) return;
    deleteMutation.mutate(id);
  };

  const handleEdit = (item: Receivable | Payable) => {
    setSelectedItem(item);
    setFormData({
      customer_name: (item as Receivable).customer_name || '',
      supplier_name: (item as Payable).supplier_name || '',
      amount: item.amount || 0,
      due_date: item.due_date || '',
      status: item.status || 'pending',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (item: Receivable | Payable) => {
    setSelectedItem(item);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedItem(null);
    setFormData({
      customer_name: '',
      supplier_name: '',
      amount: 0,
      due_date: '',
      status: 'pending',
    });
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const columns: ColumnDef<Receivable | Payable>[] = useMemo(
    () => [
      {
        id: 'entityName',
        label: activeTab === 0 ? '客户' : '供应商',
        render: (row) =>
          activeTab === 0
            ? (row as Receivable).customer_name || '-'
            : (row as Payable).supplier_name || '-',
      },
      {
        id: 'amount',
        label: '金额',
        render: (row) => `CNY ${row.amount?.toFixed(2) || '0.00'}`,
        sortable: true,
      },
      {
        id: 'due_date',
        label: '到期日期',
        render: (row) => (row.due_date ? new Date(row.due_date).toLocaleDateString('zh-CN') : '-'),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'created_at',
        label: '创建时间',
        render: (row) => new Date(row.created_at).toLocaleDateString('zh-CN'),
      },
    ],
    [activeTab]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待处理', value: 'pending' },
          { label: '部分收付', value: 'partial' },
          { label: '已结清', value: 'paid' },
          { label: '逾期', value: 'overdue' },
          { label: '已取消', value: 'cancelled' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const rowActions: RowAction<Receivable | Payable>[] = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这条记录吗?',
      },
    ],
    []
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const totalAmount = data.reduce((sum, item) => sum + (item.amount || 0), 0);
  const pendingAmount = data
    .filter((item) => item.status === 'pending')
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {activeTab === 0 ? (
            <ArrowUpRight size={18} sx={{ color: 'secondary.700' }} />
          ) : (
            <ArrowDownRight size={18} sx={{ color: 'secondary.700' }} />
          )}
          <Box component='span' sx={{ color: 'text.secondary', fontSize: 14 }}>
            记录总数
          </Box>
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'secondary.700' }}>{data.length}</Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>总金额</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>
          {totalAmount.toFixed(2)}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>待处理金额</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>
          {pendingAmount.toFixed(2)}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>逾期数量</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'error.dark' }}>
          {data.filter((item) => item.status === 'overdue').length}
        </Box>
      </Box>
    </Box>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: activeTab === 0 ? <ArrowUpRight style={{ width: 20, height: 20 }} /> : <ArrowDownRight style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(_, v) => {
          setActiveTab(v);
          setCurrentPage(1);
        }}
        sx={{ mb: 3 }}
      >
        <Tab label='应收账款' icon={<ArrowUpRight size={16} />} />
        <Tab label='应付账款' icon={<ArrowDownRight size={16} />} />
      </Tabs>

      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={data}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={activeTab === 0 ? '搜索客户名称...' : '搜索供应商名称...'}
        searchValue={searchTerm}
        onSearch={handleSearch}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
        actions={[
          {
            label: `新增${activeTab === 0 ? '应收' : '应付'}记录`,
            icon: <Save size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage={`暂无${activeTab === 0 ? '应收' : '应付'}数据`}
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedItem ? '编辑记录' : `新增${activeTab === 0 ? '应收' : '应付'}记录`}</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='entityName'>
                  {activeTab === 0 ? '客户名称' : '供应商名称'} *
                </InputLabel>
                <TextField
                  id='entityName'
                  required
                  size='small'
                  value={activeTab === 0 ? formData.customer_name : formData.supplier_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ...(activeTab === 0
                        ? { customer_name: e.target.value }
                        : { supplier_name: e.target.value }),
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='amount'>金额 *</InputLabel>
                <TextField
                  id='amount'
                  required
                  size='small'
                  type='number'
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='due_date'>到期日期</InputLabel>
                <TextField
                  id='due_date'
                  size='small'
                  type='date'
                  value={formData.due_date || ''}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='status'>状态</InputLabel>
                <FormControl fullWidth size='small'>
                  <Select
                    id='status'
                    value={formData.status || 'pending'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value='pending'>待处理</MenuItem>
                    <MenuItem value='partial'>部分收付</MenuItem>
                    <MenuItem value='paid'>已结清</MenuItem>
                    <MenuItem value='overdue'>逾期</MenuItem>
                    <MenuItem value='cancelled'>已取消</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <DialogActions sx={{ mt: 2 }}>
              <Button type='button' variant='outlined' onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button type='submit' variant='contained' startIcon={<Save size={16} />}>
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{activeTab === 0 ? '应收' : '应付'}详情</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                    {activeTab === 0 ? '客户名称' : '供应商名称'}
                  </InputLabel>
                  <Box sx={{ fontWeight: 500 }}>
                    {activeTab === 0
                      ? (selectedItem as Receivable).customer_name || '-'
                      : (selectedItem as Payable).supplier_name || '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>金额</InputLabel>
                  <Box component='span'>
                    {'CNY ' + (selectedItem.amount?.toFixed(2) || '0.00')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>到期日期</InputLabel>
                  <Box component='span'>
                    {selectedItem.due_date
                      ? new Date(selectedItem.due_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedItem.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>备注</InputLabel>
                  <Box component='span'>{'-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>{new Date(selectedItem.created_at).toLocaleString('zh-CN')}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>更新时间</InputLabel>
                  <Box component='span'>{new Date(selectedItem.updated_at).toLocaleString('zh-CN')}</Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ReceivablePayablePage;