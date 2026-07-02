import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import { Plus, Edit2, Trash2, Eye, DollarSign, TrendingDown, PieChart } from 'lucide-react';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { useAppStore } from '@/store';

interface Budget {
  id: string;
  budget_code: string;
  name: string;
  department: string;
  year: number;
  total_amount: number;
  used_amount: number;
  remaining: number;
  status: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: '执行中', bg: 'success.lighter', color: 'success.700' },
  pending: { label: '待审批', bg: 'warning.light', color: 'warning.700' },
  completed: { label: '已完成', bg: 'primary.100', color: 'primary.700' },
  frozen: { label: '冻结', bg: 'grey.200', color: 'grey.600' },
};

const mockBudgets: Budget[] = [
  {
    id: '1',
    budget_code: 'BG-2025-001',
    name: '行政办公费用',
    department: '行政部',
    year: 2025,
    total_amount: 500000,
    used_amount: 320000,
    remaining: 180000,
    status: 'active',
  },
  {
    id: '2',
    budget_code: 'BG-2025-002',
    name: '市场营销费用',
    department: '市场部',
    year: 2025,
    total_amount: 800000,
    used_amount: 650000,
    remaining: 150000,
    status: 'active',
  },
  {
    id: '3',
    budget_code: 'BG-2025-003',
    name: 'IT运维费用',
    department: 'IT部',
    year: 2025,
    total_amount: 300000,
    used_amount: 280000,
    remaining: 20000,
    status: 'active',
  },
  {
    id: '4',
    budget_code: 'BG-2025-004',
    name: '人力资源费用',
    department: '人力资源部',
    year: 2025,
    total_amount: 200000,
    used_amount: 180000,
    remaining: 20000,
    status: 'active',
  },
  {
    id: '5',
    budget_code: 'BG-2025-005',
    name: '差旅费',
    department: '销售部',
    year: 2025,
    total_amount: 600000,
    used_amount: 600000,
    remaining: 0,
    status: 'completed',
  },
  {
    id: '6',
    budget_code: 'BG-2025-006',
    name: '培训费用',
    department: '人力资源部',
    year: 2025,
    total_amount: 150000,
    used_amount: 80000,
    remaining: 70000,
    status: 'pending',
  },
  {
    id: '7',
    budget_code: 'BG-2025-007',
    name: '研发费用',
    department: '研发部',
    year: 2025,
    total_amount: 1200000,
    used_amount: 950000,
    remaining: 250000,
    status: 'active',
  },
  {
    id: '8',
    budget_code: 'BG-2024-001',
    name: '行政办公费用',
    department: '行政部',
    year: 2024,
    total_amount: 450000,
    used_amount: 450000,
    remaining: 0,
    status: 'completed',
  },
];

interface BudgetFormData {
  budget_code: string;
  name: string;
  department: string;
  year: number;
  total_amount: number;
  used_amount: number;
  remaining: number;
  status: string;
}

const defaultFormData: BudgetFormData = {
  budget_code: '',
  name: '',
  department: '',
  year: 2025,
  total_amount: 0,
  used_amount: 0,
  remaining: 0,
  status: 'pending',
};

const BudgetManagementPage: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BudgetFormData>(defaultFormData);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      setBudgets(mockBudgets);
    } catch (error: any) {
      console.error('加载预算数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const active = budgets.filter((b) => b.status === 'active');
    const totalAmount = active.reduce((sum, b) => sum + b.total_amount, 0);
    const usedAmount = active.reduce((sum, b) => sum + b.used_amount, 0);
    const remaining = totalAmount - usedAmount;
    const rate = totalAmount > 0 ? (usedAmount / totalAmount) * 100 : 0;
    return { totalAmount, usedAmount, remaining, rate };
  }, [budgets]);

  const getStatusBadge = (status: string) => {
    const config = STATUS_MAP[status] || { label: status, bg: 'grey.100', color: '#475569' };
    return (
      <Chip
        label={config.label}
        size='small'
        sx={{ bgcolor: config.bg, color: config.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<Budget>[] = [
    {
      id: 'budget_code',
      label: '预算编号',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.budget_code}</Box>,
    },
    { id: 'name', label: '预算名称' },
    {
      id: 'department',
      label: '部门',
      render: (row) => (
        <Chip
          label={row.department}
          size='small'
          variant='outlined'
        />
      ),
    },
    { id: 'year', label: '年度', align: 'center' },
    {
      id: 'total_amount',
      label: '总金额',
      align: 'right',
      render: (row) => (
        <Typography
          variant='body2'
          sx={{ fontWeight: 600 }}
        >
          {row.total_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </Typography>
      ),
    },
    {
      id: 'used_amount',
      label: '已用金额',
      align: 'right',
      render: (row) => (
        <Typography variant='body2'>
          {row.used_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </Typography>
      ),
    },
    {
      id: 'remaining',
      label: '剩余',
      align: 'right',
      render: (row) => (
        <Typography
          variant='body2'
          sx={{
            color:
              row.remaining <= 0
                ? 'error.dark'
                : row.remaining < row.total_amount * 0.1
                  ? 'warning.dark'
                  : 'success.dark',
            fontWeight: 600,
          }}
        >
          {row.remaining.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </Typography>
      ),
    },
    { id: 'status', label: '状态', render: (row) => getStatusBadge(row.status) },
  ];

  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.budget_code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesYear = yearFilter === 'all' || b.year.toString() === yearFilter;
      const matchesDept = deptFilter === 'all' || b.department === deptFilter;
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      return matchesSearch && matchesYear && matchesDept && matchesStatus;
    });
  }, [budgets, searchTerm, yearFilter, deptFilter, statusFilter]);

  const paginatedData = filteredBudgets.slice(page * pageSize, page * pageSize + pageSize);

  const rowActions: RowAction<Budget>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) =>
        addNotification({ title: '查看', message: `查看预算: ${row.name}`, type: 'info' }),
    },
    {
      label: '编辑',
      icon: <Edit2 style={{ width: 16, height: 16 }} />,
      color: 'primary',
      onClick: (row) => handleEdit(row),
    },
    {
      label: '删除',
      icon: <Trash2 style={{ width: 16, height: 16 }} />,
      color: 'error',
      onClick: (row) => {
        setBudgets((prev) => prev.filter((b) => b.id !== row.id));
        addNotification({ title: '成功', message: '预算删除成功', type: 'success' });
      },
    },
  ];

  const handleCreate = () => {
    setFormData(defaultFormData);
    setShowCreateModal(true);
  };
  const handleEdit = (row: Budget) => {
    setEditingId(row.id);
    setFormData({
      budget_code: row.budget_code,
      name: row.name,
      department: row.department,
      year: row.year,
      total_amount: row.total_amount,
      used_amount: row.used_amount,
      remaining: row.remaining,
      status: row.status,
    });
    setShowEditModal(true);
  };
  const handleSaveCreate = () => {
    setBudgets((prev) => [{ id: Date.now().toString(), ...formData }, ...prev]);
    setShowCreateModal(false);
    addNotification({ title: '成功', message: '预算创建成功', type: 'success' });
  };
  const handleSaveEdit = () => {
    setBudgets((prev) => prev.map((b) => (b.id === editingId ? { ...b, ...formData } : b)));
    setShowEditModal(false);
    setEditingId(null);
    addNotification({ title: '成功', message: '预算更新成功', type: 'success' });
  };

  const renderFormFields = (
    data: BudgetFormData,
    onChange: (d: BudgetFormData) => void,
    editing: boolean
  ) => (
    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <TextField
          fullWidth
          label='预算编号 *'
          value={data.budget_code}
          onChange={(e) => onChange({ ...data, budget_code: e.target.value })}
          placeholder='请输入预算编号'
          disabled={editing}
        />
        <TextField
          fullWidth
          label='预算名称 *'
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder='请输入预算名称'
        />
        <TextField
          fullWidth
          label='部门 *'
          value={data.department}
          onChange={(e) => onChange({ ...data, department: e.target.value })}
          placeholder='请输入部门'
        />
        <FormControl fullWidth>
          <InputLabel>年度</InputLabel>
          <Select
            value={data.year}
            label='年度'
            onChange={(e) => onChange({ ...data, year: Number(e.target.value) })}
          >
            <MenuItem value={2024}>2024</MenuItem>
            <MenuItem value={2025}>2025</MenuItem>
            <MenuItem value={2026}>2026</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          type='number'
          label='总金额 *'
          value={data.total_amount}
          onChange={(e) => onChange({ ...data, total_amount: parseFloat(e.target.value) || 0 })}
          placeholder='请输入总金额'
        />
        <TextField
          fullWidth
          type='number'
          label='已用金额'
          value={data.used_amount}
          onChange={(e) => onChange({ ...data, used_amount: parseFloat(e.target.value) || 0 })}
          placeholder='已用金额'
        />
      </Box>
      <FormControl fullWidth>
        <InputLabel>状态</InputLabel>
        <Select
          value={data.status}
          label='状态'
          onChange={(e) => onChange({ ...data, status: e.target.value })}
        >
          <MenuItem value='pending'>待审批</MenuItem>
          <MenuItem value='active'>执行中</MenuItem>
          <MenuItem value='completed'>已完成</MenuItem>
          <MenuItem value='frozen'>冻结</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );

  const statsCards = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 2,
      }}
    >
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
              }}
            >
              <DollarSign style={{ width: 20, height: 20, color: '#fff' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600' }}
              >
                预算总额
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                {(stats.totalAmount / 10000).toFixed(1)}万
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
              }}
            >
              <TrendingDown style={{ width: 20, height: 20, color: '#fff' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600' }}
              >
                已使用
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                {(stats.usedAmount / 10000).toFixed(1)}万
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
              }}
            >
              <PieChart style={{ width: 20, height: 20, color: '#fff' }} />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600' }}
              >
                剩余
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                {(stats.remaining / 10000).toFixed(1)}万
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                background:
                  stats.rate > 90
                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                    : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow:
                  stats.rate > 90
                    ? '0 4px 12px rgba(239,68,68,0.3)'
                    : '0 4px 12px rgba(14,165,233,0.3)',
              }}
            >
              <DollarSign
                style={{
                  width: 20,
                  height: 20,
                  color: '#fff',
                }}
              />
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{ color: 'slate.600' }}
              >
                执行率
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: stats.rate > 90 ? 'error.dark' : 'text.primary' }}
              >
                {stats.rate.toFixed(1)}%
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <PageContainer
      title='行政预算管理'
      subtitle='Budget Management'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'OA' },
          { label: '行政预算管理' },
        ]}
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        searchable
        searchPlaceholder='搜索预算名称或编号...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        filters={[
          {
            id: 'year',
            label: '年度',
            type: 'select',
            options: [
              { label: '全部', value: 'all' },
              { label: '2025', value: '2025' },
              { label: '2024', value: '2024' },
            ],
            value: yearFilter,
            onChange: (value) => {
              setYearFilter(value);
              setPage(0);
            },
          },
          {
            id: 'department',
            label: '部门',
            type: 'select',
            options: [
              { label: '全部', value: 'all' },
              { label: '行政部', value: '行政部' },
              { label: '市场部', value: '市场部' },
              { label: 'IT部', value: 'IT部' },
              { label: '人力资源部', value: '人力资源部' },
              { label: '销售部', value: '销售部' },
              { label: '研发部', value: '研发部' },
            ],
            value: deptFilter,
            onChange: (value) => {
              setDeptFilter(value);
              setPage(0);
            },
          },
          {
            id: 'status',
            label: '状态',
            type: 'select',
            options: [
              { label: '全部', value: 'all' },
              { label: '待审批', value: 'pending' },
              { label: '执行中', value: 'active' },
              { label: '已完成', value: 'completed' },
              { label: '冻结', value: 'frozen' },
            ],
            value: statusFilter,
            onChange: (value) => {
              setStatusFilter(value);
              setPage(0);
            },
          },
        ]}
        pagination={{
          page,
          pageSize,
          total: filteredBudgets.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        actions={[
          {
            label: '新增预算',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        headerContent={statsCards}
        emptyMessage='暂无预算数据'
      />
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新增预算</DialogTitle>
        <DialogContent>{renderFormFields(formData, setFormData, false)}</DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSaveCreate}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingId(null);
        }}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>编辑预算</DialogTitle>
        <DialogContent>{renderFormFields(formData, setFormData, true)}</DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => {
              setShowEditModal(false);
              setEditingId(null);
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSaveEdit}
          >
            更新
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default BudgetManagementPage;
