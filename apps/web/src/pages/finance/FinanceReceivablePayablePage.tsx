import React, { useState, useEffect, useMemo } from 'react';
import { PageContainer } from '@/components/common';
import {
  Chip,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Tabs,
  Tab,
  Box,
  Button,
} from '@mui/material';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  CreditCard,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { ListPageTemplate, StatCardGroup, type ColumnDef, type RowAction } from '@/components';
import { financeApi } from '@/api/finance';
import type { SalesInvoice, PurchaseInvoice, InvoiceStatus } from '../../types/finance';
import { useAppStore } from '../../store';
import { apiLogger } from '@/utils/logger';

const FinanceReceivablePayablePage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState<string>('receivable');
  const [receivables, setReceivables] = useState<SalesInvoice[]>([]);
  const [payables, setPayables] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<SalesInvoice | PurchaseInvoice | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SalesInvoice | PurchaseInvoice | null>(null);

  const [formData, setFormData] = useState({
    invoice_no: '',
    customer_name: '',
    supplier_name: '',
    amount: '',
    tax_amount: '',
    invoice_date: '',
    due_date: '',
    invoice_type: 'normal' as 'normal' | 'special',
    status: 'draft' as InvoiceStatus,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [receivableRes, payableRes] = await Promise.all([
        financeApi.receivablePayable.listSalesInvoices(),
        financeApi.receivablePayable.listPurchaseInvoices(),
      ]);
      if (receivableRes.success && receivableRes.data) {
        setReceivables(receivableRes.data.items || []);
      }
      if (payableRes.success && payableRes.data) {
        setPayables(payableRes.data.items || []);
      }
    } catch (err: unknown) {
      apiLogger.error('加载数据失败:', err);
      addNotification({
        title: '错误',
        message: '加载数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReceivable = async () => {
    try {
      const data = {
        invoice_no: formData.invoice_no,
        customer_name: formData.customer_name,
        amount: parseFloat(formData.amount) || 0,
        tax_amount: parseFloat(formData.tax_amount) || 0,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        invoice_type: formData.invoice_type,
        status: formData.status,
      };
      const response = await financeApi.receivablePayable.createSalesInvoice(data);
      if (response.success) {
        addNotification({
          title: '成功',
          message: '销售发票创建成功',
          type: 'success',
        });
        setShowCreateDialog(false);
        resetForm();
        loadData();
      }
    } catch (err: unknown) {
      apiLogger.error('创建销售发票失败:', err);
      addNotification({
        title: '错误',
        message: '创建销售发票失败',
        type: 'error',
      });
    }
  };

  const handleCreatePayable = async () => {
    try {
      const data = {
        invoice_no: formData.invoice_no,
        supplier_name: formData.supplier_name,
        amount: parseFloat(formData.amount) || 0,
        tax_amount: parseFloat(formData.tax_amount) || 0,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        invoice_type: formData.invoice_type,
        status: formData.status,
      };
      const response = await financeApi.receivablePayable.createPurchaseInvoice(data);
      if (response.success) {
        addNotification({
          title: '成功',
          message: '采购发票创建成功',
          type: 'success',
        });
        setShowCreateDialog(false);
        resetForm();
        loadData();
      }
    } catch (err: unknown) {
      apiLogger.error('创建采购发票失败:', err);
      addNotification({
        title: '错误',
        message: '创建采购发票失败',
        type: 'error',
      });
    }
  };

  const handleUpdateReceivable = async () => {
    if (!editingItem) return;
    try {
      const data = {
        invoice_no: formData.invoice_no,
        customer_name: formData.customer_name,
        amount: parseFloat(formData.amount) || 0,
        tax_amount: parseFloat(formData.tax_amount) || 0,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        invoice_type: formData.invoice_type,
        status: formData.status,
      };
      const response = await financeApi.receivablePayable.updateSalesInvoice(editingItem.id, data);
      if (response.success) {
        addNotification({
          title: '成功',
          message: '销售发票更新成功',
          type: 'success',
        });
        setEditingItem(null);
        setShowCreateDialog(false);
        resetForm();
        loadData();
      }
    } catch (err: unknown) {
      apiLogger.error('更新销售发票失败:', err);
      addNotification({
        title: '错误',
        message: '更新销售发票失败',
        type: 'error',
      });
    }
  };

  const handleUpdatePayable = async () => {
    if (!editingItem) return;
    try {
      const data = {
        invoice_no: formData.invoice_no,
        supplier_name: formData.supplier_name,
        amount: parseFloat(formData.amount) || 0,
        tax_amount: parseFloat(formData.tax_amount) || 0,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        invoice_type: formData.invoice_type,
        status: formData.status,
      };
      const response = await financeApi.receivablePayable.updatePurchaseInvoice(
        editingItem.id,
        data
      );
      if (response.success) {
        addNotification({
          title: '成功',
          message: '采购发票更新成功',
          type: 'success',
        });
        setEditingItem(null);
        setShowCreateDialog(false);
        resetForm();
        loadData();
      }
    } catch (err: unknown) {
      apiLogger.error('更新采购发票失败:', err);
      addNotification({
        title: '错误',
        message: '更新采购发票失败',
        type: 'error',
      });
    }
  };

  const handleDeleteReceivable = async (id: string) => {
    if (!window.confirm('确定要删除此销售发票吗？')) return;
    try {
      const response = await financeApi.receivablePayable.deleteSalesInvoice(id);
      if (response.success) {
        addNotification({
          title: '成功',
          message: '销售发票删除成功',
          type: 'success',
        });
        loadData();
      }
    } catch (err: unknown) {
      apiLogger.error('删除销售发票失败:', err);
      addNotification({
        title: '错误',
        message: '删除销售发票失败',
        type: 'error',
      });
    }
  };

  const handleDeletePayable = async (id: string) => {
    if (!window.confirm('确定要删除此采购发票吗？')) return;
    try {
      const response = await financeApi.receivablePayable.deletePurchaseInvoice(id);
      if (response.success) {
        addNotification({
          title: '成功',
          message: '采购发票删除成功',
          type: 'success',
        });
        loadData();
      }
    } catch (err: unknown) {
      apiLogger.error('删除采购发票失败:', err);
      addNotification({
        title: '错误',
        message: '删除采购发票失败',
        type: 'error',
      });
    }
  };

  const openEditDialog = (item: SalesInvoice | PurchaseInvoice) => {
    setEditingItem(item);
    if ('customer_name' in item) {
      setFormData({
        invoice_no: item.invoice_no,
        customer_name: item.customer_name,
        supplier_name: '',
        amount: item.amount.toString(),
        tax_amount: item.tax_amount.toString(),
        invoice_date: item.invoice_date,
        due_date: item.due_date,
        invoice_type: item.invoice_type as 'normal' | 'special',
        status: item.status,
      });
    } else {
      setFormData({
        invoice_no: item.invoice_no,
        customer_name: '',
        supplier_name: item.supplier_name,
        amount: item.amount.toString(),
        tax_amount: item.tax_amount.toString(),
        invoice_date: item.invoice_date,
        due_date: item.due_date,
        invoice_type: item.invoice_type as 'normal' | 'special',
        status: item.status,
      });
    }
    setShowCreateDialog(true);
  };

  const openDetailDialog = (item: SalesInvoice | PurchaseInvoice) => {
    setSelectedItem(item);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setFormData({
      invoice_no: '',
      customer_name: '',
      supplier_name: '',
      amount: '',
      tax_amount: '',
      invoice_date: '',
      due_date: '',
      invoice_type: 'normal',
      status: 'draft',
    });
  };

  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

  const getStatusBadge = (status: InvoiceStatus) => {
    const colorMap: Record<
      InvoiceStatus,
      'default' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning'
    > = {
      draft: 'default',
      approved: 'info',
      invoiced: 'primary',
      partial_received: 'warning',
      received: 'success',
      overdue: 'error',
    };
    const labelMap: Record<InvoiceStatus, string> = {
      draft: '草稿',
      approved: '已审核',
      invoiced: '已开票',
      partial_received: '部分收/付',
      received: '已结清',
      overdue: '已逾期',
    };
    return (
      <Chip
        size='small'
        color={colorMap[status] || 'default'}
        label={labelMap[status] || status}
      />
    );
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const isPaid = (status: InvoiceStatus) => status === 'received';

  // 统计数据计算
  const totalReceivable = receivables.reduce((sum, r) => sum + r.total_amount, 0);
  const receivedAmount = receivables.reduce((sum, r) => sum + r.received_amount, 0);
  const pendingReceivable = receivables
    .filter((r) => !isPaid(r.status))
    .reduce((sum, r) => sum + (r.total_amount - r.received_amount), 0);
  const overdueReceivable = receivables
    .filter((r) => isOverdue(r.due_date) && !isPaid(r.status))
    .reduce((sum, r) => sum + (r.total_amount - r.received_amount), 0);

  const totalPayable = payables.reduce((sum, p) => sum + p.total_amount, 0);
  const paidAmount = payables.reduce((sum, p) => sum + p.paid_amount, 0);
  const pendingPayable = payables
    .filter((p) => !isPaid(p.status))
    .reduce((sum, p) => sum + (p.total_amount - p.paid_amount), 0);
  const overduePayable = payables
    .filter((p) => isOverdue(p.due_date) && !isPaid(p.status))
    .reduce((sum, p) => sum + (p.total_amount - p.paid_amount), 0);

  // 统计卡片配置
  const statCards = useMemo(
    () => [
      {
        title: '应收总额',
        value: formatCurrency(totalReceivable),
        icon: <ArrowUpRight size={24} />,
        color: 'primary' as const,
      },
      {
        title: '应付总额',
        value: formatCurrency(totalPayable),
        icon: <ArrowDownRight size={24} />,
        color: 'success' as const,
      },
      {
        title: '待收金额',
        value: formatCurrency(pendingReceivable),
        icon: <CreditCard size={24} />,
        color: 'warning' as const,
      },
      {
        title: '待付金额',
        value: formatCurrency(pendingPayable),
        icon: <CreditCard size={24} />,
        color: 'secondary' as const,
      },
    ],
    [totalReceivable, totalPayable, pendingReceivable, pendingPayable]
  );

  // 筛选后的应收账款数据
  const filteredReceivables = useMemo(() => {
    return receivables.filter((r) => {
      const matchesSearch =
        r.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !filterStatus || r.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [receivables, searchTerm, filterStatus]);

  // 筛选后的应付账款数据
  const filteredPayables = useMemo(() => {
    return payables.filter((p) => {
      const matchesSearch =
        p.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !filterStatus || p.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [payables, searchTerm, filterStatus]);

  // 应收账款列定义
  const receivableColumns = useMemo<ColumnDef<SalesInvoice>[]>(
    () => [
      {
        id: 'invoice_no',
        label: '发票编号',
        render: (row) => <Box sx={{ fontWeight: 'medium' }}>{row.invoice_no}</Box>,
      },
      {
        id: 'customer_name',
        label: '客户名称',
        render: (row) => row.customer_name,
      },
      {
        id: 'total_amount',
        label: '含税金额',
        align: 'right',
        render: (row) => (
          <Box sx={{ fontFamily: 'monospace' }}>{formatCurrency(row.total_amount)}</Box>
        ),
      },
      {
        id: 'received_amount',
        label: '已收',
        align: 'right',
        render: (row) => (
          <Box sx={{ fontFamily: 'monospace', color: 'success.main' }}>
            {formatCurrency(row.received_amount)}
          </Box>
        ),
      },
      {
        id: 'pending_amount',
        label: '待收',
        align: 'right',
        render: (row) => (
          <Box
            sx={{
              fontFamily: 'monospace',
              fontWeight: 'medium',
              color: isOverdue(row.due_date) && !isPaid(row.status) ? 'error.main' : 'warning.main',
            }}
          >
            {formatCurrency(row.total_amount - row.received_amount)}
          </Box>
        ),
      },
      {
        id: 'due_date',
        label: '到期日期',
        render: (row) => (
          <Box
            sx={{
              color: isOverdue(row.due_date) && !isPaid(row.status) ? 'error.main' : 'text.primary',
            }}
          >
            {row.due_date ? new Date(row.due_date).toLocaleDateString() : '-'}
          </Box>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  // 应付账款列定义
  const payableColumns = useMemo<ColumnDef<PurchaseInvoice>[]>(
    () => [
      {
        id: 'invoice_no',
        label: '发票编号',
        render: (row) => <Box sx={{ fontWeight: 'medium' }}>{row.invoice_no}</Box>,
      },
      {
        id: 'supplier_name',
        label: '供应商',
        render: (row) => row.supplier_name,
      },
      {
        id: 'total_amount',
        label: '含税金额',
        align: 'right',
        render: (row) => (
          <Box sx={{ fontFamily: 'monospace' }}>{formatCurrency(row.total_amount)}</Box>
        ),
      },
      {
        id: 'paid_amount',
        label: '已付',
        align: 'right',
        render: (row) => (
          <Box sx={{ fontFamily: 'monospace', color: 'success.main' }}>
            {formatCurrency(row.paid_amount)}
          </Box>
        ),
      },
      {
        id: 'pending_amount',
        label: '待付',
        align: 'right',
        render: (row) => (
          <Box
            sx={{
              fontFamily: 'monospace',
              fontWeight: 'medium',
              color: isOverdue(row.due_date) && !isPaid(row.status) ? 'error.main' : 'warning.main',
            }}
          >
            {formatCurrency(row.total_amount - row.paid_amount)}
          </Box>
        ),
      },
      {
        id: 'due_date',
        label: '到期日期',
        render: (row) => (
          <Box
            sx={{
              color: isOverdue(row.due_date) && !isPaid(row.status) ? 'error.main' : 'text.primary',
            }}
          >
            {row.due_date ? new Date(row.due_date).toLocaleDateString() : '-'}
          </Box>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  // 应收账款行操作
  const receivableRowActions = useMemo<RowAction<SalesInvoice>[]>(
    () => [
      {
        label: '查看',
        icon: <Eye size={16} />,
        onClick: (row) => openDetailDialog(row),
      },
      {
        label: '编辑',
        icon: <Edit2 size={16} />,
        onClick: (row) => openEditDialog(row),
        color: 'primary',
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        onClick: (row) => handleDeleteReceivable(row.id),
        color: 'error',
      },
    ],
    []
  );

  // 应付账款行操作
  const payableRowActions = useMemo<RowAction<PurchaseInvoice>[]>(
    () => [
      {
        label: '查看',
        icon: <Eye size={16} />,
        onClick: (row) => openDetailDialog(row),
      },
      {
        label: '编辑',
        icon: <Edit2 size={16} />,
        onClick: (row) => openEditDialog(row),
        color: 'primary',
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        onClick: (row) => handleDeletePayable(row.id),
        color: 'error',
      },
    ],
    []
  );

  // 筛选器配置
  const filters = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { value: '', label: '全部' },
          { value: 'draft', label: '草稿' },
          { value: 'approved', label: '已审核' },
          { value: 'invoiced', label: '已开票' },
          { value: 'partial_received', label: '部分收/付' },
          { value: 'received', label: '已结清' },
          { value: 'overdue', label: '已逾期' },
        ],
        value: filterStatus,
        onChange: setFilterStatus,
      },
    ],
    [filterStatus, activeTab]
  );

  const handleSearch = () => {
    // 搜索逻辑已通过 useMemo 实现前端筛选
  };

  const handleReset = () => {
    setSearchTerm('');
    setFilterStatus('');
  };

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title='应收应付'
      subtitle='管理应收账款和应付账款'
      autoTitle
      autoBreadcrumbs
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography
            variant='h4'
            sx={{ fontWeight: 'bold' }}
          >
            应收应付管理
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mt: 0.5 }}
          >
            管理企业应收账款和应付账款
          </Typography>
        </Box>
        <Button
          variant='contained'
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus sx={{ width: 16, height: 16, mr: 1 }} />
          <span>新增{activeTab === 'receivable' ? '应收' : '应付'}</span>
        </Button>
      </Box>

      {/* 统计卡片 */}
      <StatCardGroup
        stats={statCards}
        columns={4}
      />

      {/* Tab 切换 */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
        >
          <Tab
            value='receivable'
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ArrowUpRight sx={{ width: 16, height: 16 }} />
                <span>应收账款</span>
                {overdueReceivable > 0 && (
                  <Chip
                    size='small'
                    color='error'
                    label={`逾期 ${formatCurrency(overdueReceivable)}`}
                  />
                )}
              </Box>
            }
          />
          <Tab
            value='payable'
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ArrowDownRight sx={{ width: 16, height: 16 }} />
                <span>应付账款</span>
                {overduePayable > 0 && (
                  <Chip
                    size='small'
                    color='error'
                    label={`逾期 ${formatCurrency(overduePayable)}`}
                  />
                )}
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* 应收账款列表 */}
      {activeTab === 'receivable' && (
        <ListPageTemplate
          columns={receivableColumns}
          data={filteredReceivables}
          loading={loading}
          searchable
          searchPlaceholder='搜索单据编号、客户名称或项目...'
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          filters={filters}
          filtersValue={{ status: filterStatus }}
          onFilterChange={(filters) => {
            if (filters.status !== undefined) setFilterStatus(filters.status as string);
          }}
          rowActions={receivableRowActions}
          onRefresh={loadData}
          actions={[
            { label: '搜索', variant: 'outlined', onClick: handleSearch },
            { label: '重置', variant: 'outlined', onClick: handleReset },
          ]}
          emptyMessage='暂无应收账款数据'
        />
      )}

      {/* 应付账款列表 */}
      {activeTab === 'payable' && (
        <ListPageTemplate
          columns={payableColumns}
          data={filteredPayables}
          loading={loading}
          searchable
          searchPlaceholder='搜索单据编号、供应商或类别...'
          searchValue={searchTerm}
          onSearch={setSearchTerm}
          filters={filters}
          filtersValue={{ status: filterStatus }}
          onFilterChange={(filters) => {
            if (filters.status !== undefined) setFilterStatus(filters.status as string);
          }}
          rowActions={payableRowActions}
          onRefresh={loadData}
          actions={[
            { label: '搜索', variant: 'outlined', onClick: handleSearch },
            { label: '重置', variant: 'outlined', onClick: handleReset },
          ]}
          emptyMessage='暂无应付账款数据'
        />
      )}

      {/* 创建/编辑对话框 */}
      <Dialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingItem(null);
          resetForm();
        }}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          {editingItem ? '编辑' : '新增'}
          {activeTab === 'receivable' ? '销售发票' : '采购发票'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label='发票编号'
              value={formData.invoice_no}
              onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
              placeholder='请输入发票编号'
              fullWidth
              size='small'
            />
            {activeTab === 'receivable' ? (
              <TextField
                label='客户名称'
                value={formData.customer_name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customer_name: e.target.value,
                  })
                }
                placeholder='请输入客户名称'
                fullWidth
                size='small'
              />
            ) : (
              <TextField
                label='供应商名称'
                value={formData.supplier_name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    supplier_name: e.target.value,
                  })
                }
                placeholder='请输入供应商名称'
                fullWidth
                size='small'
              />
            )}
            <TextField
              label='不含税金额'
              type='number'
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder='请输入不含税金额'
              fullWidth
              size='small'
            />
            <TextField
              label='税额'
              type='number'
              value={formData.tax_amount}
              onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
              placeholder='请输入税额'
              fullWidth
              size='small'
            />
            <FormControl
              fullWidth
              size='small'
            >
              <InputLabel>发票类型</InputLabel>
              <Select
                value={formData.invoice_type}
                label='发票类型'
                onChange={(e) => setFormData({ ...formData, invoice_type: e.target.value })}
              >
                <MenuItem value='normal'>普通发票</MenuItem>
                <MenuItem value='special'>增值税专用发票</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label='开票日期'
                type='date'
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                size='small'
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label='到期日期'
                type='date'
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                size='small'
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
            <FormControl
              fullWidth
              size='small'
            >
              <InputLabel>状态</InputLabel>
              <Select
                value={formData.status}
                label='状态'
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as InvoiceStatus })
                }
              >
                <MenuItem value='draft'>草稿</MenuItem>
                <MenuItem value='approved'>已审核</MenuItem>
                <MenuItem value='invoiced'>已开票</MenuItem>
                <MenuItem value='partial_received'>部分收/付</MenuItem>
                <MenuItem value='received'>已结清</MenuItem>
                <MenuItem value='overdue'>已逾期</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => {
              setShowCreateDialog(false);
              setEditingItem(null);
              resetForm();
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={
              editingItem
                ? activeTab === 'receivable'
                  ? handleUpdateReceivable
                  : handleUpdatePayable
                : activeTab === 'receivable'
                  ? handleCreateReceivable
                  : handleCreatePayable
            }
          >
            {editingItem ? '更新' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          {selectedItem && 'customer_name' in selectedItem ? (
            <ArrowUpRight sx={{ width: 20, height: 20, mr: 1, color: 'indigo.600' }} />
          ) : (
            <ArrowDownRight sx={{ width: 20, height: 20, mr: 1, color: 'indigo.600' }} />
          )}
          {selectedItem && 'customer_name' in selectedItem ? '销售发票' : '采购发票'}
          详情
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
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
                    color='text.secondary'
                  >
                    发票编号
                  </Typography>
                  <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
                    {selectedItem.invoice_no}
                  </Typography>
                </Box>
                {'customer_name' in selectedItem ? (
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      客户名称
                    </Typography>
                    <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
                      {selectedItem.customer_name}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      供应商
                    </Typography>
                    <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
                      {selectedItem.supplier_name}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  发票类型
                </Typography>
                <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
                  {selectedItem.invoice_type === 'special' ? '增值税专用发票' : '普通发票'}
                </Typography>
              </Box>

              <Box
                sx={{
                  p: 3,
                  bgcolor: 'linear-gradient(135deg, primary.light 0%, #eef2ff 100%)',
                  borderRadius: 3,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    含税金额
                  </Typography>
                  <Typography
                    variant='h5'
                    sx={{ fontWeight: 'bold', color: 'primary.main' }}
                  >
                    {formatCurrency(selectedItem.total_amount)}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 2,
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      不含税金额
                    </Typography>
                    <Typography
                      variant='body1'
                      sx={{ fontWeight: 'medium' }}
                    >
                      {formatCurrency(selectedItem.amount)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      税额
                    </Typography>
                    <Typography
                      variant='body1'
                      sx={{ fontWeight: 'medium' }}
                    >
                      {formatCurrency(selectedItem.tax_amount)}
                    </Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {'received_amount' in selectedItem ? '已收' : '已付'}
                    </Typography>
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 'bold', color: 'success.main' }}
                    >
                      {formatCurrency(
                        'received_amount' in selectedItem
                          ? selectedItem.received_amount
                          : selectedItem.paid_amount
                      )}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {'received_amount' in selectedItem ? '待收' : '待付'}
                    </Typography>
                    <Typography
                      variant='h6'
                      sx={{
                        fontWeight: 'bold',
                        color:
                          isOverdue(selectedItem.due_date) && !isPaid(selectedItem.status)
                            ? 'error.main'
                            : 'warning.main',
                      }}
                    >
                      {formatCurrency(
                        selectedItem.total_amount -
                          ('received_amount' in selectedItem
                            ? selectedItem.received_amount
                            : selectedItem.paid_amount)
                      )}
                    </Typography>
                  </Box>
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
                    color='text.secondary'
                  >
                    开票日期
                  </Typography>
                  <Typography sx={{ fontWeight: 'medium', mt: 0.5 }}>
                    {selectedItem.invoice_date
                      ? new Date(selectedItem.invoice_date).toLocaleDateString()
                      : '-'}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 2,
                    bgcolor:
                      isOverdue(selectedItem.due_date) && !isPaid(selectedItem.status)
                        ? 'error.50'
                        : 'grey.50',
                    borderRadius: 1,
                  }}
                >
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    到期日期
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 'medium',
                      mt: 0.5,
                      color:
                        isOverdue(selectedItem.due_date) && !isPaid(selectedItem.status)
                          ? 'error.main'
                          : 'text.primary',
                    }}
                  >
                    {selectedItem.due_date
                      ? new Date(selectedItem.due_date).toLocaleDateString()
                      : '-'}
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                }}
              >
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  状态
                </Typography>
                {getStatusBadge(selectedItem.status)}
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  typography: 'body2',
                  color: 'text.secondary',
                }}
              >
                <span>创建时间: {new Date(selectedItem.created_at).toLocaleString()}</span>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default FinanceReceivablePayablePage;
