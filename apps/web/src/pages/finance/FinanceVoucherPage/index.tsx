import { Typography, Tabs, Tab, Box } from '@mui/material';
import { designTokens } from '@/theme/tokens';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCrudOperations, type CrudOperations } from '@/hooks/useCrudQueries';
import { FINANCE_PATHS } from '@/modules/finance/config';
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  Upload,
  ChevronLeft,
  Check,
  RefreshCw,
  Wallet,
  DollarSign,
  FileCheck,
  Clock,
  Building2,
} from 'lucide-react';
import {
  ActionButton,
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
import { useNotificationStore } from '@/store';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction, FilterConfig } from '@/components/templates';
import { StatCardGroup } from '@/components';
import { apiLogger } from '@/utils/logger';

import VoucherListPanel from './components/VoucherListPanel';
import SubjectListPanel from './components/SubjectListPanel';
import VoucherFormModal from './components/VoucherFormModal';
import VoucherImportModal from './components/VoucherImportModal';
import VoucherDetailModal from './components/VoucherDetailModal';
import ConfirmDialogs from './components/ConfirmDialogs';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const FinanceVoucherPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>('vouchers');
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [voucherItems, setVoucherItems] = useState<VoucherItem[]>([]);

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

  const {
    data: vouchers,
    loading: vouchersLoading,
    create: createVoucher,
    update: updateVoucher,
    delete: deleteVoucher,
    fetch: fetchVouchers,
  } = useCrudOperations<FinancialVoucher>({
    api: voucherApi as unknown as CrudOperations<FinancialVoucher>,
    queryKey: 'finance-vouchers',
    defaultPageSize: 50,
  });

  const subjectsQuery = useQuery({
    queryKey: ['finance-accounting-subjects'],
    queryFn: async () => {
      const response = await accountingSubjectApi.list();
      if (!response.success || !response.data) {
        throw new Error(response.message || t('finance.finance_voucher_page_index.fail'));
      }
      return response.data.items || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const subjects = subjectsQuery.data || [];
  const loading = vouchersLoading || subjectsQuery.isLoading;

  const loadVoucherItems = async (voucherId: string) => {
    try {
      const result = await voucherApi.getItems(voucherId);
      if (result.success && result.data) {
        setVoucherItems(result.data);
      }
    } catch (err: unknown) {
      apiLogger.error(t('finance.finance_voucher_page_index.fail_1'), err);
    }
  };

  const handleCreate = async () => {
    if (!newVoucher.voucher_number || !newVoucher.voucher_date || !newVoucher.period) {
      addNotification({
        title: t('finance.finance_voucher_page_index.hint'),
        message: t('finance.finance_voucher_page_index.please_fill'),
        type: 'warning',
      });
      return;
    }

    const totalDebit = newVoucher.items.reduce((sum, item) => sum + item.debit_amount, 0);
    const totalCredit = newVoucher.items.reduce((sum, item) => sum + item.credit_amount, 0);

    if (totalDebit !== totalCredit) {
      addNotification({
        title: t('finance.finance_voucher_page_index.error'),
        message: t('finance.finance_voucher_page_index.create'),
        type: 'error',
      });
      return;
    }

    try {
      const result = await createVoucher({
        ...newVoucher,
        items: newVoucher.items,
      } as unknown as Record<string, unknown>);

      if (result) {
        setShowCreateModal(false);
        resetForm();
      }
    } catch (err: unknown) {
      // 错误已在 mutation 中处理
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteVoucher(deletingId);
    } catch (err: unknown) {
      // 错误已在 mutation 中处理
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
      const promises = selectedIds.map((id) => deleteVoucher(id));
      const results = await Promise.allSettled(promises);
      const successCount = results.filter((r) => r.status === 'fulfilled').length;

      if (successCount === selectedIds.length) {
        addNotification({
          title: t('finance.finance_voucher_page_index.success'),
          message: `批量删除成功，共 ${successCount} 条记录`,
          type: 'success',
        });
      } else {
        addNotification({
          title: t('finance.finance_voucher_page_index.success_1'),
          message: `成功删除 ${successCount} 条，失败 ${selectedIds.length - successCount} 条`,
          type: 'warning',
        });
      }

      setSelectedIds([]);
    } catch (err: unknown) {
      addNotification({
        title: t('finance.finance_voucher_page_index.error'),
        message: (err as { message?: string }).message || t('finance.finance_voucher_page_index.batch_delete_1'),
        type: 'error',
      });
    } finally {
      setBatchDeleteDialogOpen(false);
    }
  };

  const handleBatchAudit = async () => {
    if (selectedIds.length === 0) return;

    try {
      const promises = selectedIds.map((id) => updateVoucher(id, { status: 'approved' } as unknown as Record<string, unknown>));
      const results = await Promise.allSettled(promises);
      const successCount = results.filter((r) => r.status === 'fulfilled').length;

      if (successCount === selectedIds.length) {
        addNotification({
          title: t('finance.finance_voucher_page_index.success'),
          message: `批量审核成功，共 ${successCount} 条记录`,
          type: 'success',
        });
      } else {
        addNotification({
          title: t('finance.finance_voucher_page_index.success_1'),
          message: `成功审核 ${successCount} 条，失败 ${selectedIds.length - successCount} 条`,
          type: 'warning',
        });
      }

      setSelectedIds([]);
    } catch (err: unknown) {
      addNotification({
        title: t('finance.finance_voucher_page_index.error'),
        message: (err as { message?: string }).message || t('finance.finance_voucher_page_index.fail_2'),
        type: 'error',
      });
    }
  };

  const importMutation = useMutation({
    mutationFn: async (fileContent: string) => {
      const result = await voucherApi.importU8({
        file_name: 'u8_vouchers.json',
        file_content: fileContent,
        import_mode: 'insert',
      });
      if (!result.success) {
        throw new Error(result.message || t('finance.finance_voucher_page_index.import'));
      }
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['finance-vouchers'] });
      const {
        success_count: successCount,
        failed_count: failedCount,
        errors,
      } = data || ({} as { success_count?: number; failed_count?: number; errors?: unknown[] });
      if (failedCount === 0) {
        addNotification({
          title: t('finance.finance_voucher_page_index.success'),
          message: `成功导入${successCount}张凭证`,
          type: 'success',
        });
      } else {
        addNotification({
          title: t('finance.finance_voucher_page_index.success_1'),
          message: `成功导入${successCount}张，失败${failedCount}张`,
          type: 'warning',
        });
        errors?.forEach((err: string) => apiLogger.warn(t('finance.finance_voucher_page_index.import_3'), err));
      }
      setShowImportModal(false);
    },
    onError: (err: unknown) => {
      apiLogger.error(t('finance.finance_voucher_page_index.import_4'), err);
      addNotification({
        title: t('finance.finance_voucher_page_index.error'),
        message: (err as Error).message || t('finance.finance_voucher_page_index.import'),
        type: 'error',
      });
    },
  });

  const handleImport = async (fileContent: string) => {
    await importMutation.mutateAsync(fileContent);
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

  const updateVoucherItem = (
    index: number,
    field: keyof VoucherItemRequest,
    value: VoucherItemRequest[keyof VoucherItemRequest]
  ) => {
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
      draft: { color: 'default', label: t('finance.finance_voucher_page_index.text_22b433') },
      pending: { color: 'warning', label: t('finance.finance_voucher_page_index.pending_review') },
      approved: { color: 'success', label: t('finance.finance_voucher_page_index.approved') },
      posted: { color: 'success', label: t('finance.finance_voucher_page_index.text_4ab08f') },
      imported: { color: 'secondary', label: t('finance.finance_voucher_page_index.import_5') },
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

  const voucherStatCards = useMemo(
    () => [
      {
        id: 'total',
        title: t('finance.finance_voucher_page_index.text_551f4c'),
        value: vouchers.length,
        icon: <FileText size={24} />,
        color: 'primary' as const,
      },
      {
        id: 'approved',
        title: t('finance.finance_voucher_page_index.approved'),
        value: vouchers.filter((v) => v.status === 'approved' || v.status === 'posted').length,
        icon: <FileCheck size={24} />,
        color: 'success' as const,
      },
      {
        id: 'pending',
        title: t('finance.finance_voucher_page_index.pending_review'),
        value: vouchers.filter((v) => v.status === 'pending').length,
        icon: <Clock size={24} />,
        color: 'warning' as const,
      },
      {
        id: 'total_amount',
        title: t('finance.finance_voucher_page_index.amount'),
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
        title: t('finance.finance_voucher_page_index.text_3eb8d3'),
        value: subjects.length,
        icon: <Building2 size={24} />,
        color: 'primary' as const,
      },
      {
        id: 'active',
        title: t('finance.finance_voucher_page_index.active'),
        value: subjects.filter((s) => s.status === 'active').length,
        icon: <FileCheck size={24} />,
        color: 'success' as const,
      },
      {
        id: 'level1',
        title: t('finance.finance_voucher_page_index.text_6772b0'),
        value: subjects.filter((s) => s.level === 1).length,
        icon: <DollarSign size={24} />,
        color: 'warning' as const,
      },
      {
        id: 'cash_flow',
        title: t('finance.finance_voucher_page_index.text_07d5bc'),
        value: subjects.filter((s) => s.is_cash_flow).length,
        icon: <Clock size={24} />,
        color: 'info' as const,
      },
    ],
    [subjects]
  );

  const voucherColumns = useMemo(
    () => [
      {
        id: 'voucher_number',
        label: t('finance.finance_voucher_page_index.text_846d88'),
        render: (row: FinancialVoucher) => (
          <Typography sx={{ fontWeight: 500, color: 'primary.main' }}>
            {row.voucher_number}
          </Typography>
        ),
      },
      {
        id: 'voucher_date',
        label: t('finance.finance_voucher_page_index.date'),
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
        label: t('finance.finance_voucher_page_index.text_2f4339'),
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
        label: t('finance.finance_voucher_page_index.amount_1'),
        render: (row: FinancialVoucher) => (
          <Typography sx={{ fontWeight: 'bold', color: 'error.main' }}>
            {formatCurrency(row.total_debit)}
          </Typography>
        ),
      },
      {
        id: 'total_credit',
        label: t('finance.finance_voucher_page_index.amount_2'),
        render: (row: FinancialVoucher) => (
          <Typography sx={{ fontWeight: 'bold', color: 'success.main' }}>
            {formatCurrency(row.total_credit)}
          </Typography>
        ),
      },
      {
        id: 'maker_name',
        label: t('finance.finance_voucher_page_index.document_maker'),
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
        label: t('finance.finance_voucher_page_index.status'),
        render: (row: FinancialVoucher) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const voucherRowActions = useMemo(
    () => [
      {
        label: t('finance.finance_voucher_page_index.view_detail'),
        icon: <Eye size={16} />,
        onClick: (row: FinancialVoucher) => {
          setCurrentVoucher(row);
          loadVoucherItems(row.id);
          setShowDetailModal(true);
        },
      },
      {
        label: t('finance.finance_voucher_page_index.edit'),
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
        label: t('finance.finance_voucher_page_index.delete_1'),
        icon: <Trash2 size={16} />,
        color: 'error' as const,
        onClick: (row: FinancialVoucher) => handleDelete(row.id),
      },
    ],

    []
  );

  const voucherFilters = useMemo(
    () => [
      {
        id: 'status',
        label: t('finance.finance_voucher_page_index.status'),
        type: 'select' as const,
        options: [
          { value: '', label: t('finance.finance_voucher_page_index.status_1') },
          { value: 'draft', label: t('finance.finance_voucher_page_index.text_22b433') },
          { value: 'pending', label: t('finance.finance_voucher_page_index.pending_review') },
          { value: 'approved', label: t('finance.finance_voucher_page_index.approved') },
          { value: 'posted', label: t('finance.finance_voucher_page_index.text_4ab08f') },
          { value: 'imported', label: t('finance.finance_voucher_page_index.import_5') },
        ],
      },
      {
        id: 'period',
        label: t('finance.finance_voucher_page_index.text_2f4339'),
        type: 'select' as const,
        options: [
          { value: '', label: t('finance.finance_voucher_page_index.all') },
          { value: '2024-01', label: t('finance.finance_voucher_page_index.text_a5afc4') },
          { value: '2024-02', label: t('finance.finance_voucher_page_index.text_b5dbfd') },
          { value: '2024-03', label: t('finance.finance_voucher_page_index.text_29a209') },
          { value: '2024-04', label: t('finance.finance_voucher_page_index.text_839676') },
          { value: '2024-05', label: t('finance.finance_voucher_page_index.text_69ccfd') },
          { value: '2024-06', label: t('finance.finance_voucher_page_index.text_c62e26') },
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
      title={t('finance.finance_voucher_page_index.text_6b6598')}
      subtitle={t('finance.finance_voucher_page_index.import_6')}
      headerProps={{
        pageIcon: <Wallet style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
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
                label={t('finance.finance_voucher_page_index.back')}
                icon={<ChevronLeft size={20} />}
                variant='text'
                onClick={() => navigate(FINANCE_PATHS.dashboard)}
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
                label={t('finance.finance_voucher_page_index.import_7')}
                icon={<Upload size={16} />}
                variant='primary'
                onClick={() => setShowImportModal(true)}
              />
              <ActionButton
                label={t('finance.finance_voucher_page_index.add')}
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
          onChange={(_: React.SyntheticEvent, newValue: string) => setActiveTab(newValue)}
          sx={{ mb: 2 }}
        >
          <Tab
            value='vouchers'
            label={t('finance.finance_voucher_page_index.text_755348')}
            icon={<FileText sx={{ width: 16, height: 16 }} />}
            iconPosition='start'
          />
          <Tab
            value='subjects'
            label={t('finance.finance_voucher_page_index.text_d64865')}
            icon={<Building2 sx={{ width: 16, height: 16 }} />}
            iconPosition='start'
          />
        </Tabs>

        <Box sx={{ display: activeTab === 'vouchers' ? 'block' : 'none' }}>
          <VoucherListPanel
            voucherStatCards={voucherStatCards}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onBatchAudit={handleBatchAudit}
            onBatchDelete={handleBatchDelete}
            voucherColumns={voucherColumns as ColumnDef<FinancialVoucher>[]}
            filteredVouchers={filteredVouchers}
            loading={loading}
            voucherFilters={voucherFilters as FilterConfig[]}
            filtersValue={{
              status: statusFilter,
              period: periodFilter,
            }}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            onReset={handleReset}
            voucherRowActions={voucherRowActions as RowAction<FinancialVoucher>[]}
          />
        </Box>

        <Box sx={{ display: activeTab === 'subjects' ? 'block' : 'none' }}>
          <SubjectListPanel
            subjects={subjects}
            subjectStatCards={subjectStatCards}
          />
        </Box>
      </Box>

      <VoucherFormModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title={newVoucher.voucher_number ? t('finance.finance_voucher_page_index.edit_1') : t('finance.finance_voucher_page_index.add_1')}
        newVoucher={newVoucher}
        setNewVoucher={setNewVoucher}
        onSubmit={handleCreate}
        addVoucherItem={addVoucherItem}
        updateVoucherItem={updateVoucherItem}
        removeVoucherItem={removeVoucherItem}
        subjects={subjects}
        formatCurrency={formatCurrency}
      />

      <VoucherImportModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />

      <VoucherDetailModal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        currentVoucher={currentVoucher}
        voucherItems={voucherItems}
        getStatusBadge={getStatusBadge}
        formatCurrency={formatCurrency}
      />

      <ConfirmDialogs
        deleteDialogOpen={deleteDialogOpen}
        onCloseDelete={() => {
          setDeleteDialogOpen(false);
          setDeletingId(null);
        }}
        onConfirmDelete={confirmDelete}
        batchDeleteDialogOpen={batchDeleteDialogOpen}
        onCloseBatchDelete={() => setBatchDeleteDialogOpen(false)}
        onConfirmBatchDelete={confirmBatchDelete}
        selectedIds={selectedIds}
      />
    </PageContainer>
  );
};

export default FinanceVoucherPage;
