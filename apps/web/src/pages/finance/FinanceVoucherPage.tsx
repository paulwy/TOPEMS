import { Typography, Tabs, Tab, Box } from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  Upload,
  Download,
  ChevronLeft,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  Wallet,
  DollarSign,
  FileCheck,
  Clock,
  Building2,
} from 'lucide-react';
import {
  ActionButton,
  FormField,
  FormSelect,
  Dialog,
  ConfirmDialog,
  StatusBadge,
  PageContainer,
} from '@/components/common';
import { useNavigate } from 'react-router-dom';
import {
  voucherApi,
  accountingSubjectApi,
  type FinancialVoucher,
  type VoucherItem,
  type VoucherItemRequest,
  type AccountingSubject,
} from '@/api/erp';
import { useAppStore } from '../../store';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction, FilterConfig } from '@/components/templates';
import { StatCardGroup } from '@/components';
import { apiLogger } from '@/utils/logger';

const FinanceVoucherPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState<string>('vouchers');
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [vouchers, setVouchers] = useState<FinancialVoucher[]>([]);
  const [subjects, setSubjects] = useState<AccountingSubject[]>([]);
  const [voucherItems, setVoucherItems] = useState<VoucherItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentVoucher, setCurrentVoucher] = useState<FinancialVoucher | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  const [newVoucher, setNewVoucher] = useState({
    voucher_number: '',
    voucher_date: '',
    period: '',
    attachment_count: 0,
    summary: '',
    maker_name: '',
    items: [] as VoucherItemRequest[],
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [voucherResult, subjectResult] = await Promise.all([
        voucherApi.list(),
        accountingSubjectApi.list(),
      ]);

      if (voucherResult.success && voucherResult.data) {
        setVouchers(voucherResult.data.items || []);
      }

      if (subjectResult.success && subjectResult.data) {
        setSubjects(subjectResult.data.items || []);
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

  const loadVoucherItems = async (voucherId: string) => {
    try {
      const result = await voucherApi.getItems(voucherId);
      if (result.success && result.data) {
        setVoucherItems(result.data);
      }
    } catch (err: unknown) {
      apiLogger.error('加载凭证明细失败:', err);
    }
  };

  const handleCreate = async () => {
    if (!newVoucher.voucher_number || !newVoucher.voucher_date || !newVoucher.period) {
      addNotification({
        title: '提示',
        message: '请填写必填字段',
        type: 'warning',
      });
      return;
    }

    const totalDebit = newVoucher.items.reduce((sum, item) => sum + item.debit_amount, 0);
    const totalCredit = newVoucher.items.reduce((sum, item) => sum + item.credit_amount, 0);

    if (totalDebit !== totalCredit) {
      addNotification({
        title: '错误',
        message: '借贷不平，无法创建凭证',
        type: 'error',
      });
      return;
    }

    try {
      const result = await voucherApi.create({
        ...newVoucher,
        items: newVoucher.items,
      });

      if (result.success) {
        addNotification({
          title: '成功',
          message: '凭证创建成功',
          type: 'success',
        });
        setShowCreateModal(false);
        resetForm();
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: result.message || '创建失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      const result = await voucherApi.delete(deletingId);
      if (result.success) {
        addNotification({
          title: '成功',
          message: '删除成功',
          type: 'success',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: result.message || '删除失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    setBatchDeleteDialogOpen(true);
  };

  const confirmBatchDelete = async () => {
    try {
      const promises = selectedIds.map((id) => voucherApi.delete(id));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount === selectedIds.length) {
        addNotification({
          title: '成功',
          message: `批量删除成功，共 ${successCount} 条记录`,
          type: 'success',
        });
      } else {
        addNotification({
          title: '部分成功',
          message: `成功删除 ${successCount} 条，失败 ${selectedIds.length - successCount} 条`,
          type: 'warning',
        });
      }

      setSelectedIds([]);
      loadData();
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '批量删除失败',
        type: 'error',
      });
    } finally {
      setBatchDeleteDialogOpen(false);
    }
  };

  const handleBatchAudit = async () => {
    if (selectedIds.length === 0) return;

    try {
      const promises = selectedIds.map((id) => voucherApi.update(id, { status: 'approved' }));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount === selectedIds.length) {
        addNotification({
          title: '成功',
          message: `批量审核成功，共 ${successCount} 条记录`,
          type: 'success',
        });
      } else {
        addNotification({
          title: '部分成功',
          message: `成功审核 ${successCount} 条，失败 ${selectedIds.length - successCount} 条`,
          type: 'warning',
        });
      }

      setSelectedIds([]);
      loadData();
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '批量审核失败',
        type: 'error',
      });
    }
  };

  const handleImport = async (fileContent: string) => {
    try {
      const result = await voucherApi.importU8({
        file_name: 'u8_vouchers.json',
        file_content: fileContent,
        import_mode: 'insert',
      });

      if (result.success && result.data) {
        const { success_count, failed_count, errors } = result.data;
        if (failed_count === 0) {
          addNotification({
            title: '成功',
            message: `成功导入${success_count}张凭证`,
            type: 'success',
          });
        } else {
          addNotification({
            title: '部分成功',
            message: `成功导入${success_count}张，失败${failed_count}张`,
            type: 'warning',
          });
          errors.forEach((err) => apiLogger.warn('导入错误:', err));
        }
        setShowImportModal(false);
        loadData();
      }
    } catch (err: unknown) {
      addNotification({ title: '错误', message: '导入失败', type: 'error' });
    }
  };

  const resetForm = () => {
    setNewVoucher({
      voucher_number: '',
      voucher_date: '',
      period: '',
      attachment_count: 0,
      summary: '',
      maker_name: '',
      items: [],
    });
  };

  const addVoucherItem = () => {
    const newItem: VoucherItemRequest = {
      line_number: newVoucher.items.length + 1,
      subject_code: '',
      subject_name: '',
      summary: '',
      debit_amount: 0,
      credit_amount: 0,
    };
    setNewVoucher((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const updateVoucherItem = (index: number, field: string, value: any) => {
    const items = [...newVoucher.items];
    items[index] = { ...items[index], [field]: value };

    if (field === 'subject_code') {
      const subject = subjects.find((s) => s.code === value);
      if (subject) {
        items[index].subject_name = subject.name;
      }
    }

    setNewVoucher((prev) => ({ ...prev, items }));
  };

  const removeVoucherItem = (index: number) => {
    const items = newVoucher.items.filter((_, i) => i !== index);
    setNewVoucher((prev) => ({
      ...prev,
      items: items.map((item, i) => ({ ...item, line_number: i + 1 })),
    }));
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<
      string,
      {
        color: 'success' | 'warning' | 'default' | 'secondary';
        label: string;
      }
    > = {
      draft: { color: 'default', label: '草稿' },
      pending: { color: 'warning', label: '待审核' },
      approved: { color: 'success', label: '已审核' },
      posted: { color: 'success', label: '已记账' },
      imported: { color: 'secondary', label: '已导入' },
    };
    const config = badges[status] || {
      color: 'default' as const,
      label: status,
    };
    return (
      <StatusBadge
        status={status}
        label={config.label}
        color={config.color}
      />
    );
  };

  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

  // 统计卡片数据
  const voucherStatCards = useMemo(
    () => [
      {
        id: 'total',
        title: '凭证总数',
        value: vouchers.length,
        icon: <FileText size={24} />,
        color: 'primary' as const,
      },
      {
        id: 'approved',
        title: '已审核',
        value: vouchers.filter((v) => v.status === 'approved' || v.status === 'posted').length,
        icon: <FileCheck size={24} />,
        color: 'success' as const,
      },
      {
        id: 'pending',
        title: '待审核',
        value: vouchers.filter((v) => v.status === 'pending').length,
        icon: <Clock size={24} />,
        color: 'warning' as const,
      },
      {
        id: 'total_amount',
        title: '总金额',
        value: formatCurrency(vouchers.reduce((sum, v) => sum + v.total_debit, 0)),
        icon: <DollarSign size={24} />,
        color: 'secondary' as const,
      },
    ],
    [vouchers]
  );

  const subjectStatCards = useMemo(
    () => [
      {
        id: 'total',
        title: '科目总数',
        value: subjects.length,
        icon: <Building2 size={24} />,
        color: 'primary' as const,
      },
      {
        id: 'active',
        title: '已启用',
        value: subjects.filter((s) => s.status === 'active').length,
        icon: <FileCheck size={24} />,
        color: 'success' as const,
      },
      {
        id: 'level1',
        title: '一级科目',
        value: subjects.filter((s) => s.level === 1).length,
        icon: <DollarSign size={24} />,
        color: 'warning' as const,
      },
      {
        id: 'cash_flow',
        title: '现金流量科目',
        value: subjects.filter((s) => s.is_cash_flow).length,
        icon: <Clock size={24} />,
        color: 'info' as const,
      },
    ],
    [subjects]
  );

  // 凭证表格列定义
  const voucherColumns = useMemo(
    () => [
      {
        id: 'voucher_number',
        label: '凭证编号',
        render: (row: FinancialVoucher) => (
          <Typography sx={{ fontWeight: 500, color: 'primary.main' }}>
            {row.voucher_number}
          </Typography>
        ),
      },
      {
        id: 'voucher_date',
        label: '凭证日期',
        render: (row: FinancialVoucher) => (
          <Typography
            variant='body2'
            sx={{ color: 'text.primary' }}
          >
            {row.voucher_date?.split('T')[0] || '-'}
          </Typography>
        ),
      },
      {
        id: 'period',
        label: '期间',
        render: (row: FinancialVoucher) => (
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            {row.period}
          </Typography>
        ),
      },
      {
        id: 'total_debit',
        label: '借方金额',
        render: (row: FinancialVoucher) => (
          <Typography sx={{ fontWeight: 'bold', color: 'error.main' }}>
            {formatCurrency(row.total_debit)}
          </Typography>
        ),
      },
      {
        id: 'total_credit',
        label: '贷方金额',
        render: (row: FinancialVoucher) => (
          <Typography sx={{ fontWeight: 'bold', color: 'success.main' }}>
            {formatCurrency(row.total_credit)}
          </Typography>
        ),
      },
      {
        id: 'maker_name',
        label: '制单人',
        render: (row: FinancialVoucher) => (
          <Typography
            variant='body2'
            sx={{ color: 'text.primary' }}
          >
            {row.maker_name || '-'}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row: FinancialVoucher) => getStatusBadge(row.status),
      },
    ],
    []
  );

  // 行操作
  const voucherRowActions = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: (row: FinancialVoucher) => {
          setCurrentVoucher(row);
          loadVoucherItems(row.id);
          setShowDetailModal(true);
        },
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        color: 'primary' as const,
        onClick: (row: FinancialVoucher) => {
          setNewVoucher({
            voucher_number: row.voucher_number,
            voucher_date: row.voucher_date?.split('T')[0] || '',
            period: row.period,
            attachment_count: row.attachment_count || 0,
            summary: row.summary || '',
            maker_name: row.maker_name || '',
            items: [],
          });
          setShowCreateModal(true);
        },
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error' as const,
        onClick: (row: FinancialVoucher) => handleDelete(row.id),
      },
    ],

    []
  );

  // 筛选器配置
  const voucherFilters = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { value: '', label: '全部状态' },
          { value: 'draft', label: '草稿' },
          { value: 'pending', label: '待审核' },
          { value: 'approved', label: '已审核' },
          { value: 'posted', label: '已记账' },
          { value: 'imported', label: '已导入' },
        ],
      },
      {
        id: 'period',
        label: '期间',
        type: 'select' as const,
        options: [
          { value: '', label: '全部期间' },
          { value: '2024-01', label: '2024年01月' },
          { value: '2024-02', label: '2024年02月' },
          { value: '2024-03', label: '2024年03月' },
          { value: '2024-04', label: '2024年04月' },
          { value: '2024-05', label: '2024年05月' },
          { value: '2024-06', label: '2024年06月' },
        ],
      },
    ],
    []
  );

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((voucher) => {
      const matchesSearch =
        !searchQuery ||
        voucher.voucher_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        voucher.summary?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPeriod = !periodFilter || voucher.period === periodFilter;
      const matchesStatus = !statusFilter || voucher.status === statusFilter;
      return matchesSearch && matchesPeriod && matchesStatus;
    });
  }, [vouchers, searchQuery, periodFilter, statusFilter]);

  const handleSearch = () => {
    // 搜索逻辑已通过 filteredVouchers 实现
  };

  const handleReset = () => {
    setSearchQuery('');
    setPeriodFilter('');
    setStatusFilter('');
  };

  const handleFilterChange = (filters: Record<string, unknown>) => {
    if (filters.status !== undefined) setStatusFilter(filters.status as string);
    if (filters.period !== undefined) setPeriodFilter(filters.period as string);
  };

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title='财务凭证管理'
      subtitle='管理财务凭证、会计科目，支持用友凭证导入'
      headerProps={{
        pageIcon: <Wallet style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          dark: { bgcolor: 'slate.800' },
          boxShadow: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 2, py: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ActionButton
                label='返回'
                icon={<ChevronLeft size={20} />}
                variant='text'
                onClick={() => navigate('/dashboard')}
              />
              <Box>
                <Typography
                  variant='h5'
                  sx={{
                    fontWeight: 'bold',
                    color: 'text.primary',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <FileText sx={{ width: 28, height: 28, mr: 1.5, color: 'indigo.600' }} />
                  财务凭证管理
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ mt: 0.5, color: 'text.secondary' }}
                >
                  管理财务凭证、会计科目，支持用友凭证导入
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ActionButton
                label='导入用友凭证'
                icon={<Upload size={16} />}
                variant='primary'
                onClick={() => setShowImportModal(true)}
              />
              <ActionButton
                label='新增凭证'
                icon={<Plus size={16} />}
                variant='primary'
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: 'auto', px: 2, py: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 2 }}
        >
          <Tab
            value='vouchers'
            label='财务凭证'
            icon={<FileText sx={{ width: 16, height: 16 }} />}
            iconPosition='start'
          />
          <Tab
            value='subjects'
            label='会计科目'
            icon={<Building2 sx={{ width: 16, height: 16 }} />}
            iconPosition='start'
          />
        </Tabs>

        <Box sx={{ display: activeTab === 'vouchers' ? 'block' : 'none' }}>
          {/* 统计卡片 */}
          <StatCardGroup
            stats={voucherStatCards}
            columns={4}
          />

          {/* 批量操作提示 */}
          {selectedIds.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: 'blue.50',
                px: 2,
                py: 1.5,
                borderRadius: 1,
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'blue.700' }}
                >
                  已选择{' '}
                  <StatusBadge
                    status='selected'
                    label={selectedIds.length.toString()}
                    color='primary'
                  />
                  条记录
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ActionButton
                  label='批量审核'
                  icon={<Check size={16} />}
                  variant='secondary'
                  size='small'
                  onClick={handleBatchAudit}
                />
                <ActionButton
                  label='批量删除'
                  icon={<Trash2 size={16} />}
                  variant='secondary'
                  size='small'
                  onClick={handleBatchDelete}
                />
                <ActionButton
                  label='取消选择'
                  variant='secondary'
                  size='small'
                  onClick={() => setSelectedIds([])}
                />
              </Box>
            </Box>
          )}

          {/* 凭证列表 */}
          <ListPageTemplate
            columns={voucherColumns}
            data={filteredVouchers}
            loading={loading}
            searchable
            searchPlaceholder='搜索凭证编号或摘要...'
            filters={voucherFilters}
            filtersValue={{
              status: statusFilter,
              period: periodFilter,
            }}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            actions={[
              { label: '搜索', variant: 'outlined', onClick: handleSearch },
              { label: '重置', variant: 'outlined', onClick: handleReset },
            ]}
            selectable
            selectedIds={selectedIds}
            onSelectionChange={(ids) => setSelectedIds(ids as string[])}
            rowActions={voucherRowActions}
            emptyMessage='暂无凭证数据'
          />
        </Box>

        <Box sx={{ display: activeTab === 'subjects' ? 'block' : 'none' }}>
          {/* 科目统计卡片 */}
          <StatCardGroup
            stats={subjectStatCards}
            columns={4}
          />

          {/* 科目列表 */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: '1fr 1fr',
                lg: 'repeat(3, 1fr)',
              },
              gap: 2,
            }}
          >
            {subjects.map((subject) => (
              <Box
                key={subject.id}
                sx={{
                  bgcolor: 'background.paper',
                  '&:hover': { boxShadow: 3 },
                  transition: 'box-shadow 0.3s',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 3,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant='body1'
                      sx={{ fontWeight: 'bold', color: 'indigo.600' }}
                    >
                      {subject.code}
                    </Typography>
                    {subject.is_cash_flow && (
                      <StatusBadge
                        status='cash_flow'
                        label='现金流量'
                        color='secondary'
                      />
                    )}
                  </Box>
                  <StatusBadge
                    status={subject.status}
                    label={subject.status === 'active' ? '启用' : '禁用'}
                    color={subject.status === 'active' ? 'success' : 'default'}
                  />
                </Box>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600, color: 'text.primary' }}
                >
                  {subject.name}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    mt: 1,
                    color: 'text.secondary',
                  }}
                >
                  <Typography variant='body2'>层级: {subject.level}</Typography>
                  <Box
                    sx={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      bgcolor: 'grey.300',
                    }}
                  />
                  <Typography variant='body2'>{subject.category || '未分类'}</Typography>
                </Box>
                {subject.parent_code && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'grey.100' }}>
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.disabled' }}
                    >
                      <Typography
                        variant='caption'
                        component='span'
                        sx={{ fontWeight: 500 }}
                      >
                        上级科目:
                      </Typography>{' '}
                      {subject.parent_code}
                    </Typography>
                  </Box>
                )}
                {subject.description && (
                  <Typography
                    variant='body2'
                    sx={{
                      color: 'text.secondary',
                      mt: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {subject.description}
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* 创建凭证对话框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title={newVoucher.voucher_number ? '编辑凭证' : '新增财务凭证'}
        cancelButton={{
          label: '取消',
          onClick: () => {
            setShowCreateModal(false);
            resetForm();
          },
        }}
        confirmButton={{
          label: '保存凭证',
          onClick: handleCreate,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 2,
            }}
          >
            <FormField
              name='voucher_number'
              label='凭证编号 *'
              value={newVoucher.voucher_number}
              onChange={(e) =>
                setNewVoucher((prev) => ({
                  ...prev,
                  voucher_number: e.target.value,
                }))
              }
              placeholder='请输入凭证编号'
            />
            <FormField
              name='voucher_date'
              label='凭证日期 *'
              type='date'
              value={newVoucher.voucher_date}
              onChange={(e) =>
                setNewVoucher((prev) => ({
                  ...prev,
                  voucher_date: e.target.value,
                }))
              }
            />
            <FormField
              name='period'
              label='期间 *'
              value={newVoucher.period}
              onChange={(e) =>
                setNewVoucher((prev) => ({
                  ...prev,
                  period: e.target.value,
                }))
              }
              placeholder='如: 2024-06'
            />
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 2,
            }}
          >
            <FormField
              name='attachment_count'
              label='附件数量'
              type='number'
              value={newVoucher.attachment_count}
              onChange={(e) =>
                setNewVoucher((prev) => ({
                  ...prev,
                  attachment_count: parseInt(e.target.value) || 0,
                }))
              }
            />
            <FormField
              name='maker_name'
              label='制单人'
              value={newVoucher.maker_name}
              onChange={(e) =>
                setNewVoucher((prev) => ({
                  ...prev,
                  maker_name: e.target.value,
                }))
              }
              placeholder='制单人姓名'
            />
          </Box>
          <FormField
            name='summary'
            label='摘要'
            multiline
            rows={2}
            value={newVoucher.summary}
            onChange={(e) =>
              setNewVoucher((prev) => ({
                ...prev,
                summary: e.target.value,
              }))
            }
            placeholder='凭证摘要'
          />

          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600 }}
              >
                凭证明细
              </Typography>
              <ActionButton
                label='添加分录'
                icon={<Plus size={16} />}
                variant='secondary'
                size='small'
                onClick={addVoucherItem}
              />
            </Box>
            <Box
              sx={{
                maxHeight: 256,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              {newVoucher.items.map((item, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1.5,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                  }}
                >
                  <Typography
                    sx={{
                      width: 24,
                      textAlign: 'center',
                      color: 'text.secondary',
                      fontSize: '0.875rem',
                    }}
                  >
                    {item.line_number}
                  </Typography>
                  <FormSelect
                    name={`subject_code_${index}`}
                    label='选择科目'
                    value={item.subject_code}
                    onChange={(value) => updateVoucherItem(index, 'subject_code', value)}
                    options={subjects.map((s) => ({
                      value: s.code,
                      label: `${s.code} - ${s.name}`,
                    }))}
                  />
                  <FormField
                    name={`subject_name_${index}`}
                    label=''
                    sx={{ width: 100 }}
                    value={item.subject_name}
                    slotProps={{ input: { readOnly: true } }}
                    placeholder='科目名称'
                  />
                  <FormField
                    name={`debit_amount_${index}`}
                    label=''
                    sx={{ width: 100 }}
                    type='number'
                    value={item.debit_amount || ''}
                    onChange={(e) =>
                      updateVoucherItem(index, 'debit_amount', parseFloat(e.target.value) || 0)
                    }
                    placeholder='借方'
                  />
                  <FormField
                    name={`credit_amount_${index}`}
                    label=''
                    sx={{ width: 100 }}
                    type='number'
                    value={item.credit_amount || ''}
                    onChange={(e) =>
                      updateVoucherItem(index, 'credit_amount', parseFloat(e.target.value) || 0)
                    }
                    placeholder='贷方'
                  />
                  <ActionButton
                    label='删除'
                    icon={<X size={16} />}
                    variant='text'
                    size='small'
                    onClick={() => removeVoucherItem(index)}
                  />
                </Box>
              ))}
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 4,
                mt: 2,
              }}
            >
              <Box sx={{ textAlign: 'right' }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  借方合计
                </Typography>
                <Typography sx={{ fontWeight: 'bold', color: 'error.main' }}>
                  {formatCurrency(
                    newVoucher.items.reduce((sum, item) => sum + item.debit_amount, 0)
                  )}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  贷方合计
                </Typography>
                <Typography sx={{ fontWeight: 'bold', color: 'success.main' }}>
                  {formatCurrency(
                    newVoucher.items.reduce((sum, item) => sum + item.credit_amount, 0)
                  )}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Dialog>

      {/* 导入凭证对话框 */}
      <Dialog
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        title='导入用友财务凭证'
        cancelButton={{
          label: '取消',
          onClick: () => setShowImportModal(false),
        }}
        confirmButton={{
          label: '开始导入',
          onClick: () => {
            const content = (document.getElementById('importData') as HTMLTextAreaElement).value;
            if (!content.trim()) {
              addNotification({
                title: '提示',
                message: '请输入凭证数据',
                type: 'warning',
              });
              return;
            }
            handleImport(content);
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box sx={{ p: 2, bgcolor: 'blue.50', borderRadius: 1 }}>
            <AlertCircle sx={{ width: 20, height: 20, color: 'blue.600', mb: 1 }} />
            <Typography
              variant='body2'
              sx={{ color: 'blue.800' }}
            >
              请将用友U8系统导出的凭证数据粘贴到下方文本框中。支持JSON格式数据导入。
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              用友凭证数据 (JSON格式)
            </Typography>
            <FormField
              name='importData'
              id='importData'
              label=''
              multiline
              rows={12}
              placeholder='[{"voucher_number": "记-001", "voucher_date": "2024-01-15", "period": "2024-01", "summary": "支付办公费用", "maker": "张三", "items": [{"line_number": 1, "subject_code": "6602", "subject_name": "管理费用", "summary": "办公用品", "debit_amount": 500.00, "credit_amount": 0}]}]'
              sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ActionButton
              label='加载示例数据'
              icon={<Download size={16} />}
              variant='secondary'
              onClick={() => {
                const sampleData = JSON.stringify(
                  [
                    {
                      voucher_number: '记-001',
                      voucher_date: '2024-01-15',
                      period: '2024-01',
                      summary: '支付办公费用',
                      maker: '张三',
                      items: [
                        {
                          line_number: 1,
                          subject_code: '6602',
                          subject_name: '管理费用',
                          summary: '办公用品',
                          debit_amount: 500.0,
                          credit_amount: 0,
                        },
                        {
                          line_number: 2,
                          subject_code: '1002',
                          subject_name: '银行存款',
                          summary: '',
                          debit_amount: 0,
                          credit_amount: 500.0,
                        },
                      ],
                    },
                  ],
                  null,
                  2
                );
                (document.getElementById('importData') as HTMLTextAreaElement).value = sampleData;
              }}
            />
          </Box>
        </Box>
      </Dialog>

      {/* 凭证详情对话框 */}
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title='凭证详情'
      >
        {currentVoucher && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
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
                  sx={{ color: 'grey.500' }}
                >
                  凭证编号
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ color: 'indigo.600', fontWeight: 'bold' }}
                >
                  {currentVoucher.voucher_number}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  凭证日期
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold' }}
                >
                  {currentVoucher.voucher_date?.split('T')[0]}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  期间
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold' }}
                >
                  {currentVoucher.period}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  状态
                </Typography>
                {getStatusBadge(currentVoucher.status)}
              </Box>
            </Box>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500' }}
              >
                摘要
              </Typography>
              <Typography
                variant='body1'
                sx={{ fontWeight: 500 }}
              >
                {currentVoucher.summary || '-'}
              </Typography>
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
                  sx={{ color: 'grey.500' }}
                >
                  制单人
                </Typography>
                <Typography
                  variant='body1'
                  sx={{ fontWeight: 500 }}
                >
                  {currentVoucher.maker_name || '-'}
                </Typography>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'grey.500' }}
                >
                  审核人
                </Typography>
                <Typography
                  variant='body1'
                  sx={{ fontWeight: 500 }}
                >
                  {currentVoucher.checker_name || '-'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600 }}
              >
                凭证明细
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {voucherItems.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1.5,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography
                        sx={{
                          width: 24,
                          textAlign: 'center',
                          color: 'text.secondary',
                          fontSize: '0.875rem',
                        }}
                      >
                        {item.line_number}
                      </Typography>
                      <Typography sx={{ fontWeight: 500 }}>{item.subject_code}</Typography>
                      <Typography>{item.subject_name}</Typography>
                      <Typography
                        variant='body2'
                        sx={{ color: 'text.secondary' }}
                      >
                        {item.summary}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Typography sx={{ color: 'error.main', fontWeight: 'bold' }}>
                        {item.debit_amount > 0 ? formatCurrency(item.debit_amount) : ''}
                      </Typography>
                      <Typography sx={{ color: 'success.main', fontWeight: 'bold' }}>
                        {item.credit_amount > 0 ? formatCurrency(item.credit_amount) : ''}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  mt: 3,
                  borderTop: 1,
                  borderColor: 'divider',
                  pt: 2,
                }}
              >
                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    借方合计
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ color: 'error.main', fontWeight: 'bold' }}
                  >
                    {formatCurrency(currentVoucher.total_debit)}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    贷方合计
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ color: 'success.main', fontWeight: 'bold' }}
                  >
                    {formatCurrency(currentVoucher.total_credit)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Dialog>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeletingId(null);
        }}
        onConfirm={confirmDelete}
        title='确认删除'
        message='确定要删除该凭证吗？'
        danger
      />

      {/* 批量删除确认对话框 */}
      <ConfirmDialog
        isOpen={batchDeleteDialogOpen}
        onClose={() => setBatchDeleteDialogOpen(false)}
        onConfirm={confirmBatchDelete}
        title='确认批量删除'
        message={`确定要删除选中的 ${selectedIds.length} 张凭证吗？`}
        danger
      />
    </PageContainer>
  );
};

export default FinanceVoucherPage;
