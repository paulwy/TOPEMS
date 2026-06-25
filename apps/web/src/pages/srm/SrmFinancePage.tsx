import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Typography,
} from '@mui/material';
import { Button } from '@mui/material';
import { Plus, DollarSign, Search, CreditCard, Receipt, TrendingUp, RefreshCw } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { MetricCard } from '@/components/MetricCard';
import { StatsChart } from '@/components/StatsChart';
import type { ColumnDef } from '@tanstack/react-table';
import { srmApi } from '@/api/srm';
import type {
  SupplierContract,
  PurchaseOrder,
  CreatePurchaseOrderRequest,
  CreateSupplierContractRequest,
} from '@/api/srm';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';

interface FinanceRecord {
  id: string;
  record_no: string;
  supplier_name: string;
  type: string;
  amount: number;
  status: string;
  date: string;
  description: string;
}

const SrmFinancePage: React.FC = () => {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<{
    record_no: string;
    supplier_id: string;
    supplier_name: string;
    type: 'order' | 'contract';
    amount: string;
    status: string;
    date: string;
    description: string;
  }>({
    record_no: '',
    supplier_id: '',
    supplier_name: '',
    type: 'order',
    amount: '',
    status: 'pending',
    date: '',
    description: '',
  });
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const [contractsRes, ordersRes] = await Promise.all([
        srmApi.listContracts(),
        srmApi.listPurchaseOrders(),
      ]);

      const paymentRecords: FinanceRecord[] = [];
      const invoiceRecords: FinanceRecord[] = [];

      if (contractsRes.success && contractsRes.data) {
        const data = contractsRes.data as any;
        const items = Array.isArray(data) ? data : data.contracts || [];
        invoiceRecords.push(
          ...items.map((item: { [key: string]: unknown }) => ({
            ...item,
            record_no: item.contract_no || item.record_no || '',
            supplier_name: item.supplier_name || '',
            type: 'contract',
            amount: item.total_amount || 0,
            status:
              item.status === 'active'
                ? '有效'
                : item.status === 'expired'
                  ? '已过期'
                  : item.status === 'draft'
                    ? '草稿'
                    : item.status === 'terminated'
                      ? '已终止'
                      : item.status,
            date: item.sign_date || item.start_date || item.created_at,
            description: item.remarks || '',
          }))
        );
      } else {
        addNotification({ title: '警告', message: '获取合同数据失败', type: 'warning' });
      }

      if (ordersRes.success && ordersRes.data) {
        const data = ordersRes.data as any;
        const items = Array.isArray(data) ? data : data.orders || [];
        paymentRecords.push(
          ...items.map((item: { [key: string]: unknown }) => ({
            ...item,
            record_no: item.po_no || item.record_no || '',
            supplier_name: '',
            type: 'order',
            amount: item.total_amount || 0,
            status:
              item.status === 'pending'
                ? '待处理'
                : item.status === 'processing'
                  ? '处理中'
                  : item.status === 'delivered'
                    ? '已交付'
                    : item.status === 'completed'
                      ? '已完成'
                      : item.status === 'cancelled'
                        ? '已取消'
                        : item.status,
            date: item.order_date || item.created_at,
            description: item.remarks || '',
          }))
        );
      } else {
        addNotification({ title: '警告', message: '获取订单数据失败', type: 'warning' });
      }

      setRecords([...paymentRecords, ...invoiceRecords]);
    } catch (err: unknown) {
      apiLogger.error('加载财务数据失败:', err);
      addNotification({ title: '错误', message: '加载财务数据失败', type: 'error' });
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { bg: string; color: string; label: string }> = {
      order: { bg: '#dbeafe', color: 'primary.dark', label: '订单' },
      contract: { bg: 'success.lighter', color: '#15803d', label: '合同' },
    };
    const style = typeMap[type] || {
      bg: 'grey.100',
      color: '#475569',
      label: type,
    };
    return (
      <Chip
        label={style.label}
        size='small'
        sx={{ bgcolor: style.bg, color: style.color, fontWeight: 500 }}
      />
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; color: string }> = {
      待处理: { bg: 'warning.light', color: '#b45309' },
      处理中: { bg: '#dbeafe', color: 'primary.dark' },
      已交付: { bg: 'success.lighter', color: '#15803d' },
      已完成: { bg: 'secondary.light', color: 'primary.light' },
      已取消: { bg: 'grey.100', color: 'grey.600' },
      有效: { bg: 'success.lighter', color: '#15803d' },
      已过期: { bg: 'error.lighter', color: 'error.darker' },
      草稿: { bg: 'grey.100', color: 'grey.600' },
      已终止: { bg: 'warning.light', color: '#92400e' },
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: '#475569' };
    return (
      <Chip
        label={status}
        size='small'
        sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<FinanceRecord>[] = [
    { accessorKey: 'record_no', header: '单据编号' },
    {
      id: 'type',
      header: '类型',
      cell: ({ row }) => getTypeBadge(row.original.type),
    },
    { accessorKey: 'supplier_name', header: '供应商' },
    {
      accessorKey: 'amount',
      header: '金额',
      cell: ({ row }) => (
        <Typography sx={{ fontWeight: 600, color: 'grey.800' }}>
          ¥{row.original.amount.toLocaleString()}
        </Typography>
      ),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: 'date',
      header: '日期',
      cell: ({ row }) => {
        const date = row.original.date;
        return date ? new Date(date).toLocaleDateString('zh-CN') : '';
      },
    },
    { accessorKey: 'description', header: '备注', maxSize: 100 },
  ];

  const filteredRecords = records.filter((r) => {
    return (
      r.record_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleCreate = () => {
    setFormData({
      record_no: '',
      supplier_id: '',
      supplier_name: '',
      type: 'order',
      amount: '',
      status: 'pending',
      date: '',
      description: '',
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    try {
      if (formData.type === 'order') {
        await srmApi.createPurchaseOrder({
          po_no: formData.record_no,
          supplier_id: formData.supplier_id,
          total_amount: parseFloat(formData.amount),
          status: formData.status,
          currency: 'CNY',
          remarks: formData.description,
        });
      } else {
        await srmApi.createContract({
          contract_no: formData.record_no,
          supplier_id: formData.supplier_id,
          supplier_name: formData.supplier_name,
          title: formData.record_no,
          contract_type: 'purchase',
          total_amount: parseFloat(formData.amount),
          currency: 'CNY',
          status: formData.status,
          remarks: formData.description,
        });
      }
      addNotification({
        title: '成功',
        message: `${formData.type === 'order' ? '订单' : '合同'}创建成功`,
        type: 'success',
      });
      setShowCreateModal(false);
      loadRecords();
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
      apiLogger.error('创建财务记录失败:', err);
    }
  };

  const stats = {
    totalRecords: records.length,
    totalAmount: records.reduce((sum, r) => sum + r.amount, 0),
    orders: records.filter((r) => r.type === 'order').length,
    contracts: records.filter((r) => r.type === 'contract').length,
    pendingAmount: records
      .filter((r) => r.status === '待处理' || r.status === '处理中' || r.status === '有效')
      .reduce((sum, r) => sum + r.amount, 0),
    completedAmount: records
      .filter((r) => r.status === '已完成' || r.status === '已交付')
      .reduce((sum, r) => sum + r.amount, 0),
  };

  const typeDistribution = [
    { name: '订单', value: stats.orders, color: 'primary.main' },
    { name: '合同', value: stats.contracts, color: 'success.main' },
  ];

  const statusDistribution = [
    {
      name: '待处理',
      value: records.filter((r) => r.status === '待处理').length,
    },
    {
      name: '处理中',
      value: records.filter((r) => r.status === '处理中').length,
    },
    {
      name: '已完成',
      value: records.filter((r) => r.status === '已完成').length,
    },
    {
      name: '已交付',
      value: records.filter((r) => r.status === '已交付').length,
    },
    {
      name: '已取消',
      value: records.filter((r) => r.status === '已取消').length,
    },
    { name: '有效', value: records.filter((r) => r.status === '有效').length },
    {
      name: '已过期',
      value: records.filter((r) => r.status === '已过期').length,
    },
  ];

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, success.light 0%, #f8fafc 100%)',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              border: 4,
              borderColor: 'success.main',
              borderTopColor: 'success.dark',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              mx: 'auto',
              mb: 2,
            }}
          />
          <Typography sx={{ color: 'slate.600' }}>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, success.light 0%, #f8fafc 100%)',
      }}
    >
      <Box
        component='header'
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 1,
          borderBottom: 1,
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 } }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: 64,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  background: 'linear-gradient(135deg, success.main 0%, success.dark 100%)',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DollarSign sx={{ width: 24, height: 24, color: 'white' }} />
              </Box>
              <Box>
                <Typography
                  variant='h6'
                  sx={{
                    fontWeight: 700,
                    color: 'slate.900',
                    fontSize: '1.25rem',
                  }}
                >
                  财务管理
                </Typography>
                <Typography
                  variant='caption'
                  sx={{ color: 'slate.500', fontSize: '0.75rem' }}
                >
                  Financial Management
                </Typography>
              </Box>
            </Box>
            <Button
              variant='contained'
              startIcon={<Plus style={{ width: 18, height: 18 }} />}
              onClick={handleCreate}
              sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
            >
              新增单据
            </Button>
          </Box>
        </Box>
      </Box>

      <Box
        component='main'
        sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 4 }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              md: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
              xl: 'repeat(6, 1fr)',
            },
            gap: 2,
            mb: 4,
          }}
        >
          <MetricCard
            title='单据总数'
            value={stats.totalRecords}
            icon={<Receipt sx={{ width: 24, height: 24 }} />}
            gradient={['success.main', 'success.dark']}
            subtitle={`${stats.orders}个订单, ${stats.contracts}份合同`}
            trend='neutral'
          />
          <MetricCard
            title='订单数量'
            value={stats.orders}
            icon={<CreditCard sx={{ width: 24, height: 24 }} />}
            gradient={['primary.main', '#1D4ED8']}
            subtitle='已记录订单'
            trend='neutral'
          />
          <MetricCard
            title='合同数量'
            value={stats.contracts}
            icon={<Receipt sx={{ width: 24, height: 24 }} />}
            gradient={['#14B8A6', '#0D9488']}
            subtitle='已记录合同'
            trend='neutral'
          />
          <MetricCard
            title='总金额'
            value={`¥${stats.totalAmount.toLocaleString()}`}
            icon={<DollarSign sx={{ width: 24, height: 24 }} />}
            gradient={['#8B5CF6', '#7C3AED']}
            subtitle='所有单据合计'
            trend='neutral'
          />
          <MetricCard
            title='待结算'
            value={`¥${stats.pendingAmount.toLocaleString()}`}
            icon={<TrendingUp sx={{ width: 24, height: 24 }} />}
            gradient={['warning.main', '#D97706']}
            subtitle='待处理/处理中/有效'
            trend='neutral'
          />
          <MetricCard
            title='已完成'
            value={`¥${stats.completedAmount.toLocaleString()}`}
            icon={<DollarSign sx={{ width: 24, height: 24 }} />}
            gradient={['success.main', 'success.dark']}
            subtitle='已完成/已交付'
            trend='neutral'
          />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(1, 1fr)', lg: 'repeat(2, 1fr)' },
            gap: 4,
            mb: 4,
          }}
        >
          <Card>
            <CardContent>
              <StatsChart
                title='单据类型分布'
                type='pie'
                data={typeDistribution}
                yKey='value'
                xKey='name'
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <StatsChart
                title='状态分布'
                type='pie'
                data={statusDistribution}
                yKey='value'
                xKey='name'
              />
            </CardContent>
          </Card>
        </Box>

        <Card>
          <CardHeader
            sx={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              pb: 0,
            }}
          >
            <Typography
              variant='h6'
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <DollarSign style={{ width: 20, height: 20, color: 'success.main' }} />
              财务记录
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              <TextField
                size='small'
                placeholder='搜索单据编号、供应商或备注...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: 250 }}
                slotProps={{
                  input: {
                    startAdornment: <Search style={{ width: 18, height: 18, marginRight: 8 }} />,
                  },
                }}
              />
            </Box>
            <DataTable
              columns={columns}
              data={filteredRecords}
              enablePagination
            />
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增财务单据</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                select
                label='单据类型'
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as 'order' | 'contract' })
                }
              >
                <option value='order'>订单</option>
                <option value='contract'>合同</option>
              </TextField>
              <TextField
                fullWidth
                label='单据编号 *'
                value={formData.record_no}
                onChange={(e) => setFormData({ ...formData, record_no: e.target.value })}
                placeholder='请输入单据编号'
              />
              <TextField
                fullWidth
                label='供应商名称'
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                placeholder='请输入供应商名称'
              />
              <TextField
                fullWidth
                label='供应商ID'
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                placeholder='请输入供应商ID'
              />
              <TextField
                fullWidth
                label='金额'
                type='number'
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder='请输入金额'
              />
              <TextField
                fullWidth
                label='日期'
                type='date'
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </Box>
            <TextField
              fullWidth
              select
              label='状态'
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value='pending'>待处理</option>
              <option value='processing'>处理中</option>
              <option value='completed'>已完成</option>
              <option value='active'>有效</option>
              <option value='cancelled'>已取消</option>
            </TextField>
            <TextField
              fullWidth
              label='备注'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder='请输入备注'
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
            sx={{ bgcolor: 'success.main' }}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SrmFinancePage;
