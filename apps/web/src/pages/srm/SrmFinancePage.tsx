import React, { useState, useEffect } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { Plus, DollarSign, CreditCard, Receipt, TrendingUp } from 'lucide-react';
import { srmApi } from '@/api/srm';
import type { SupplierContract, PurchaseOrder } from '@/api/srm';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common/PageContainerV2';
import { MetricCard } from '@/components/bi/MetricCard';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

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

interface FinanceFormData {
  record_no: string;
  supplier_id: string;
  supplier_name: string;
  type: 'order' | 'contract';
  amount: string;
  status: string;
  date: string;
  description: string;
}

const SrmFinancePage: React.FC = () => {
  const queryClient = useQueryClient();
  const recordsQuery = useQuery<FinanceRecord[]>({
    queryKey: QUERY_KEYS.SRM.FINANCE,
    queryFn: async () => {
      const [contractsRes, ordersRes] = await Promise.all([
        srmApi.listContracts(),
        srmApi.listPurchaseOrders(),
      ]);

      const paymentRecords: FinanceRecord[] = [];
      const invoiceRecords: FinanceRecord[] = [];

      if (contractsRes.success && contractsRes.data) {
        const data = contractsRes.data as unknown as SupplierContract[] | { contracts: SupplierContract[] };
        const items = Array.isArray(data) ? data : (data as { contracts: SupplierContract[] }).contracts || [];
        invoiceRecords.push(
          ...items.map((item: SupplierContract) => ({
            ...item,
            record_no: item.contract_no || '',
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
      }

      if (ordersRes.success && ordersRes.data) {
        const data = ordersRes.data as unknown as PurchaseOrder[] | { orders: PurchaseOrder[] };
        const items = Array.isArray(data) ? data : (data as { orders: PurchaseOrder[] }).orders || [];
        paymentRecords.push(
          ...items.map((item: PurchaseOrder) => ({
            ...item,
            record_no: item.po_no || '',
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
      }

      return [...paymentRecords, ...invoiceRecords];
    },
    staleTime: 5 * 60 * 1000,
  });

  const records = recordsQuery.data ?? [];
  const loading = recordsQuery.isLoading;
  const total = records.length;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<FinanceFormData>({
    record_no: '',
    supplier_id: '',
    supplier_name: '',
    type: 'order',
    amount: '',
    status: 'pending',
    date: '',
    description: '',
  });
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    if (recordsQuery.isError) {
      apiLogger.error('加载财务数据失败:', recordsQuery.error);
      addNotification({ title: '错误', message: '加载财务数据失败', type: 'error' });
    }
  }, [recordsQuery.isError, recordsQuery.error, addNotification]);

  const createMutation = useMutation({
    mutationFn: async (data: FinanceFormData) => {
      if (data.type === 'order') {
        return srmApi.createPurchaseOrder({
          po_no: data.record_no,
          supplier_id: data.supplier_id,
          total_amount: parseFloat(data.amount),
          status: data.status,
          currency: 'CNY',
          remarks: data.description,
        });
      } else {
        return srmApi.createContract({
          contract_no: data.record_no,
          supplier_id: data.supplier_id,
          supplier_name: data.supplier_name,
          title: data.record_no,
          contract_type: 'purchase',
          total_amount: parseFloat(data.amount),
          currency: 'CNY',
          status: data.status,
          remarks: data.description,
        });
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SRM.FINANCE });
      addNotification({
        title: '成功',
        message: `${vars.type === 'order' ? '订单' : '合同'}创建成功`,
        type: 'success',
      });
      setShowCreateModal(false);
    },
    onError: (err: unknown) => {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
      apiLogger.error('创建财务记录失败:', err);
    },
  });

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { bg: string; color: string; label: string }> = {
      order: { bg: 'primary.100', color: 'primary.dark', label: '订单' },
      contract: { bg: 'success.lighter', color: 'success.700', label: '合同' },
    };
    const style = typeMap[type] || {
      bg: 'grey.100',
      color: 'grey.600',
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
      待处理: { bg: 'warning.light', color: 'warning.700' },
      处理中: { bg: 'primary.100', color: 'primary.dark' },
      已交付: { bg: 'success.lighter', color: 'success.700' },
      已完成: { bg: 'secondary.light', color: 'primary.light' },
      已取消: { bg: 'grey.100', color: 'grey.600' },
      有效: { bg: 'success.lighter', color: 'success.700' },
      已过期: { bg: 'error.lighter', color: 'error.darker' },
      草稿: { bg: 'grey.100', color: 'grey.600' },
      已终止: { bg: 'warning.light', color: ct.warning[800] },
    };
    const colors = statusMap[status] || { bg: 'grey.100', color: ct.text.secondary };
    return (
      <Chip
        label={status}
        size='small'
        sx={{ bgcolor: colors.bg, color: colors.color, fontWeight: 500 }}
      />
    );
  };

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

  const handleSave = () => {
    createMutation.mutate(formData);
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

  const columns: ColumnDef<FinanceRecord>[] = [
    {
      id: 'record_no',
      label: '单据编号',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.record_no}</Box>,
    },
    {
      id: 'type',
      label: '类型',
      render: (row) => getTypeBadge(row.type),
    },
    { id: 'supplier_name', label: '供应商' },
    {
      id: 'amount',
      label: '金额',
      align: 'right',
      render: (row) => (
        <Typography sx={{ fontWeight: 600, color: 'grey.800' }}>
          ¥{row.amount.toLocaleString()}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => getStatusBadge(row.status),
    },
    {
      id: 'date',
      label: '日期',
      render: (row) => {
        const date = row.date;
        return date ? new Date(date).toLocaleDateString('zh-CN') : '';
      },
    },
    { id: 'description', label: '备注' },
  ];

  const StatCards = () => (
    <Box sx={{ mb: 3 }}>
      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <MetricCard
            title='单据总数'
            value={stats.totalRecords}
            icon={<Receipt style={{ width: 24, height: 24 }} />}
            gradient={['success.main', 'success.dark']}
            subtitle={`${stats.orders}个订单, ${stats.contracts}份合同`}
            trend='neutral'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <MetricCard
            title='订单数量'
            value={stats.orders}
            icon={<CreditCard style={{ width: 24, height: 24 }} />}
            gradient={['primary.main', ct.primary.dark]}
            subtitle='已记录订单'
            trend='neutral'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <MetricCard
            title='合同数量'
            value={stats.contracts}
            icon={<Receipt style={{ width: 24, height: 24 }} />}
            gradient={[ct.teal.main, ct.teal.dark]}
            subtitle='已记录合同'
            trend='neutral'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <MetricCard
            title='总金额'
            value={`¥${stats.totalAmount.toLocaleString()}`}
            icon={<DollarSign style={{ width: 24, height: 24 }} />}
            gradient={[ct.secondary.main, ct.secondary.dark]}
            subtitle='所有单据合计'
            trend='neutral'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <MetricCard
            title='待结算'
            value={`¥${stats.pendingAmount.toLocaleString()}`}
            icon={<TrendingUp style={{ width: 24, height: 24 }} />}
            gradient={['warning.main', ct.warning.dark]}
            subtitle='待处理/处理中/有效'
            trend='neutral'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <MetricCard
            title='已完成'
            value={`¥${stats.completedAmount.toLocaleString()}`}
            icon={<DollarSign style={{ width: 24, height: 24 }} />}
            gradient={['success.main', 'success.dark']}
            subtitle='已完成/已交付'
            trend='neutral'
          />
        </Grid>
      </Grid>
    </Box>
  );

  return (
    <PageContainer>
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={records}
        loading={loading}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          },
        }}
        actions={[
          {
            label: '新增单据',
            onClick: handleCreate,
            variant: 'contained' as const,
            icon: <Plus style={{ width: 18, height: 18 }} />,
          },
        ]}
        headerContent={<StatCards />}
      />

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
    </PageContainer>
  );
};

export default SrmFinancePage;
