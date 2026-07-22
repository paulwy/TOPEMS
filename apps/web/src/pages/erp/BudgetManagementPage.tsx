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
import type { Budget, Expense, PaginationParams } from '@/api/erp';
import { budgetApi, expenseApi } from '@/api/erp';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Edit, Trash2, Eye, Save, Wallet, Receipt } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const BudgetManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Budget | Expense | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<{
    [key: string]: unknown;
    budget_type: string;
    department_id: string;
    total_budget: number;
    used_amount: number;
    status: string;
    fiscal_year: string;
    expense_type: string;
    amount: number;
    description: string;
  }>({
    budget_type: 'annual',
    department_id: '',
    total_budget: 0,
    used_amount: 0,
    status: 'active',
    fiscal_year: '',
    expense_type: '',
    amount: 0,
    description: '',
  });

  const params: PaginationParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data: budgetsData, isLoading: budgetsLoading } = useQuery({
    queryKey: [...QUERY_KEYS.ERP.BUDGET, params],
    queryFn: async () => {
      const response = await budgetApi.list(params);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 0,
  });

  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: [...QUERY_KEYS.ERP.EXPENSES, params],
    queryFn: async () => {
      const response = await expenseApi.list(params);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 1,
  });

  const budgets = budgetsData?.items || [];
  const expenses = expensesData?.items || [];
  const data = activeTab === 0 ? budgets : expenses;
  const total = activeTab === 0 ? (budgetsData?.total || 0) : (expensesData?.total || 0);
  const loading = activeTab === 0 ? budgetsLoading : expensesLoading;

  const invalidateData = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.BUDGET });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.EXPENSES });
  };

  const createMutation = useMutation({
    mutationFn: (data: unknown) =>
      (activeTab === 0
        ? budgetApi.create(data as Partial<Budget>)
        : expenseApi.create(data as Partial<Expense>)) as Promise<unknown>,
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '记录已添加' });
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
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      (activeTab === 0
        ? budgetApi.update(id, data as Partial<Budget>)
        : expenseApi.update(id, data as Partial<Expense>)) as Promise<unknown>,
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
    mutationFn: (id: string) =>
      (activeTab === 0 ? budgetApi.delete(id) : expenseApi.delete(id)) as Promise<unknown>,
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
      active: '进行中',
      completed: '已完成',
      exceeded: '超支',
      cancelled: '已取消',
      pending: '待审批',
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
      active: { label: '进行中', bg: 'success.lighter', color: 'success.700' },
      completed: { label: '已完成', bg: 'secondary[100]', color: 'secondary.700' },
      exceeded: { label: '超支', bg: 'error.lighter', color: 'error.dark' },
      cancelled: { label: '已取消', bg: 'grey.100', color: 'text.secondary' },
      pending: { label: '待审批', bg: 'warning.light', color: 'warning.700' },
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

  const handleEdit = (item: Budget | Expense) => {
    setSelectedItem(item);
    setFormData({
      budget_type: (item as Budget).budget_type || 'annual',
      department_id: (item as Budget).department_id || '',
      total_budget: (item as Budget).total_budget || 0,
      used_amount: (item as Budget).used_amount || 0,
      status: item.status || 'active',
      fiscal_year: (item as Budget).fiscal_year || '',
      expense_type: (item as Expense).expense_type || '',
      amount: (item as Expense).amount || 0,
      description: (item as Expense).description || '',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (item: Budget | Expense) => {
    setSelectedItem(item);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedItem(null);
    setFormData({
      budget_type: 'annual',
      department_id: '',
      total_budget: 0,
      used_amount: 0,
      status: 'active',
      fiscal_year: '',
      expense_type: '',
      amount: 0,
      description: '',
    });
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const columns: ColumnDef<Budget | Expense>[] = useMemo(
    () => [
      {
        id: 'name',
        label: activeTab === 0 ? '预算名称' : '费用名称',
        sortable: true,
        render: (row) =>
          activeTab === 0
            ? `${(row as Budget).budget_type || ''} ${(row as Budget).fiscal_year || ''}`
            : (row as Expense).expense_number || '-',
      },
      {
        id: 'category',
        label: '类别',
        render: (row) => (activeTab === 0 ? (row as Budget).budget_type : (row as Expense).expense_type) || '-',
      },
      {
        id: 'department',
        label: '所属部门',
        render: (row) => (row as Budget).department_id || '-',
      },
      {
        id: 'amount',
        label: activeTab === 0 ? '预算金额' : '费用金额',
        render: (row) =>
          `¥${((activeTab === 0 ? (row as Budget).total_budget : (row as Expense).amount) || 0).toFixed(2)}`,
        sortable: true,
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
          { label: '进行中', value: 'active' },
          { label: '已完成', value: 'completed' },
          { label: '超支', value: 'exceeded' },
          { label: '待审批', value: 'pending' },
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

  const rowActions: RowAction<Budget | Expense>[] = useMemo(
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

  const totalAmount = data.reduce((sum, item) => sum + ((item as Expense).amount || (item as Budget).total_budget || 0), 0);
  const spentAmount = budgets.reduce((sum, item) => sum + (item.used_amount || 0), 0);

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
            <Wallet size={18} sx={{ color: 'secondary.700' }} />
          ) : (
            <Receipt size={18} sx={{ color: 'secondary.700' }} />
          )}
          <Box component='span' sx={{ color: 'text.secondary', fontSize: 14 }}>
            记录总数
          </Box>
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'secondary.700' }}>{data.length}</Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>
          {activeTab === 0 ? '总预算' : '总费用'}
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>
          ¥{totalAmount.toFixed(2)}
        </Box>
      </Box>
      {activeTab === 0 && (
        <>
          <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>已使用</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>
              ¥{spentAmount.toFixed(2)}
            </Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>超支预算</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'error.dark' }}>
              {budgets.filter((b) => (b.used_amount || 0) > (b.total_budget || 0)).length}
            </Box>
          </Box>
        </>
      )}
      {activeTab === 1 && (
        <>
          <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>待审批</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>
              {expenses.filter((e) => e.status === 'pending').length}
            </Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>已完成</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'error.dark' }}>
              {expenses.filter((e) => e.status === 'completed').length}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: activeTab === 0 ? <Wallet style={{ width: 20, height: 20 }} /> : <Receipt style={{ width: 20, height: 20 }} />,
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
        <Tab label='预算管理' icon={<Wallet size={16} />} />
        <Tab label='费用报销' icon={<Receipt size={16} />} />
      </Tabs>

      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={data}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={activeTab === 0 ? '搜索预算名称...' : '搜索费用名称...'}
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
            label: `新增${activeTab === 0 ? '预算' : '费用'}`,
            icon: <Save size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage={`暂无${activeTab === 0 ? '预算' : '费用'}数据`}
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedItem ? '编辑记录' : `新增${activeTab === 0 ? '预算' : '费用'}`}</DialogTitle>
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
              {activeTab === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='expense_type'>费用类型 *</InputLabel>
                  <TextField
                    id='expense_type'
                    required
                    size='small'
                    value={formData.expense_type}
                    onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}
                  />
                </Box>
              )}
              {activeTab === 0 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='department_id'>所属部门</InputLabel>
                  <TextField
                    id='department_id'
                    size='small'
                    value={formData.department_id || ''}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  />
                </Box>
              )}
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
              {activeTab === 0 && (
                <>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='budget_type'>预算类型</InputLabel>
                    <FormControl fullWidth size='small'>
                      <Select
                        id='budget_type'
                        value={formData.budget_type || 'annual'}
                        onChange={(e) => setFormData({ ...formData, budget_type: e.target.value })}
                      >
                        <MenuItem value='annual'>年度预算</MenuItem>
                        <MenuItem value='quarterly'>季度预算</MenuItem>
                        <MenuItem value='monthly'>月度预算</MenuItem>
                        <MenuItem value='project'>项目预算</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='fiscal_year'>预算周期</InputLabel>
                    <TextField
                      id='fiscal_year'
                      size='small'
                      type='month'
                      value={formData.fiscal_year || ''}
                      onChange={(e) => setFormData({ ...formData, fiscal_year: e.target.value })}
                    />
                  </Box>
                </>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='status'>状态</InputLabel>
                <FormControl fullWidth size='small'>
                  <Select
                    id='status'
                    value={formData.status || 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value='active'>进行中</MenuItem>
                    <MenuItem value='completed'>已完成</MenuItem>
                    <MenuItem value='exceeded'>超支</MenuItem>
                    <MenuItem value='pending'>待审批</MenuItem>
                    <MenuItem value='cancelled'>已取消</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='description'>备注</InputLabel>
                <TextField
                  id='description'
                  size='small'
                  multiline
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
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
        <DialogTitle>{activeTab === 0 ? '预算' : '费用'}详情</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>名称</InputLabel>
                  <Box sx={{ fontWeight: 500 }}>{(selectedItem as any).name || (selectedItem as Expense).expense_number || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>类别</InputLabel>
                  <Box component='span'>{(selectedItem as any).category || (selectedItem as Budget).budget_type || '-'}</Box>
                </Box>
                {activeTab === 0 && (
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>所属部门</InputLabel>
                    <Box component='span'>{(selectedItem as Budget).department_id || '-'}</Box>
                  </Box>
                )}
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>金额</InputLabel>
                  <Box component='span'>¥{((selectedItem as any).amount || (selectedItem as Budget).total_budget || 0).toFixed(2)}</Box>
                </Box>
                {activeTab === 0 && (
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>已使用</InputLabel>
                    <Box component='span'>
                      ¥{(selectedItem as Budget).used_amount?.toFixed(2) || '0.00'}
                    </Box>
                  </Box>
                )}
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedItem.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>备注</InputLabel>
                  <Box component='span'>{((selectedItem as any).description) || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>{new Date(selectedItem.created_at).toLocaleString('zh-CN')}</Box>
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

export default BudgetManagementPage;