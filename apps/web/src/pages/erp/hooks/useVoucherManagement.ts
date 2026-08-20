import { useState, useMemo } from 'react';
import type { SyntheticEvent } from 'react';
import { voucherApi, accountingSubjectApi } from '@/api/erp';
import type {
  FinancialVoucher,
  VoucherItem,
  VoucherItemRequest,
  AccountingSubject,
} from '@/api/erp/types';
import i18n from '@/i18n';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

export interface NewVoucherState {
  voucher_number: string;
  voucher_date: string;
  period: string;
  voucher_type: string;
  attachment_count: number;
  summary: string;
  description: string;
  items: VoucherItemRequest[];
}
type StatusBadgeColor =
  'success' | 'warning' | 'default' | 'secondary' | 'error' | 'info' | 'primary';
export type ChipColor = StatusBadgeColor;
export const useVoucherManagement = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentVoucher, setCurrentVoucher] = useState<FinancialVoucher | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newVoucher, setNewVoucher] = useState<NewVoucherState>({
    voucher_number: '',
    voucher_date: new Date().toISOString().split('T')[0],
    period: '',
    voucher_type: i18n.t('erp.voucher_mgmt.voucher_type_short.accounting'),
    attachment_count: 0,
    summary: '',
    description: '',
    items: [] as VoucherItemRequest[],
  });
  // React Query - voucher list
  const vouchersQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.AD_HOC.ERP_VOUCHERS_BASE,
      page,
      rowsPerPage,
      statusFilter,
      periodFilter,
      voucherTypeFilter,
      searchQuery,
    ],
    queryFn: async () => {
      return voucherApi.list({
        page: page + 1,
        pagesize: rowsPerPage,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        period: periodFilter || undefined,
      });
    },
    staleTime: 5 * 60 * 1000,
  });
  const vouchers =
    vouchersQuery.data?.success && vouchersQuery.data.data
      ? vouchersQuery.data.data.items || []
      : [];
  const totalCount =
    vouchersQuery.data?.success && vouchersQuery.data.data ? vouchersQuery.data.data.total || 0 : 0;
  const loading = vouchersQuery.isLoading;
  // React Query - accounting subject list
  const subjectsQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.ERP_SUBJECTS_BASE,
    queryFn: () => accountingSubjectApi.list(),
    staleTime: 30 * 60 * 1000,
  });
  const subjects: AccountingSubject[] =
    subjectsQuery.data?.success && subjectsQuery.data.data
      ? subjectsQuery.data.data.items || []
      : [];
  // React Query - voucher items
  const voucherItemsQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.ERP_VOUCHER_ITEMS_BASE, currentVoucher?.id],
    queryFn: async () => {
      if (!currentVoucher?.id) throw new Error('No voucher ID');
      return voucherApi.getItems(currentVoucher.id);
    },
    enabled: !!currentVoucher?.id,
    staleTime: 5 * 60 * 1000,
  });
  const voucherItems: VoucherItem[] =
    voucherItemsQuery.data?.success && voucherItemsQuery.data.data
      ? voucherItemsQuery.data.data
      : [];
  // React Query - Mutations
  const createMutation = useMutation({
    mutationFn: (data: unknown) =>
      voucherApi.create(data as Parameters<typeof voucherApi.create>[0]),
    onSuccess: () => {
      addNotification({
        title: i18n.t('erp.voucher_mgmt.message.success'),
        message: i18n.t('erp.voucher_mgmt.message.voucher_created'),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ERP_VOUCHERS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: () => {
      addNotification({
        title: i18n.t('erp.voucher_mgmt.message.error'),
        message: i18n.t('erp.voucher_mgmt.message.operation_failed'),
        type: 'error',
      });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      voucherApi.update(id, data as Parameters<typeof voucherApi.update>[1]),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ERP_VOUCHERS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: () => {
      addNotification({
        title: i18n.t('erp.voucher_mgmt.message.error'),
        message: i18n.t('erp.voucher_mgmt.message.operation_failed'),
        type: 'error',
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => voucherApi.delete(id),
    onSuccess: () => {
      addNotification({
        title: i18n.t('erp.voucher_mgmt.message.success'),
        message: i18n.t('erp.voucher_mgmt.message.delete_success'),
        type: 'success',
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ERP_VOUCHERS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: () => {
      addNotification({
        title: i18n.t('erp.voucher_mgmt.message.error'),
        message: i18n.t('erp.voucher_mgmt.message.operation_failed'),
        type: 'error',
      });
    },
  });
  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  const getStatusBadgeConfig = (status: string): { color: StatusBadgeColor; label: string } => {
    const badges: Record<string, { color: StatusBadgeColor; label: string }> = {
      draft: { color: 'default', label: i18n.t('erp.voucher_mgmt.status.draft') },
      pending: { color: 'warning', label: i18n.t('erp.voucher_mgmt.status.pending') },
      approved: { color: 'primary', label: i18n.t('erp.voucher_mgmt.status.approved') },
      posted: { color: 'success', label: i18n.t('erp.voucher_mgmt.status.posted') },
      closed: { color: 'secondary', label: i18n.t('erp.voucher_mgmt.status.closed') },
      imported: { color: 'info', label: i18n.t('erp.voucher_mgmt.status.imported') },
    };
    return badges[status] || { color: 'default', label: status };
  };
  const getVoucherTypeConfig = (type: string): { color: ChipColor; label: string } => {
    const typeMap: Record<string, { color: ChipColor; label: string }> = {
      [i18n.t('erp.voucher_mgmt.voucher_type_short.receipt')]: {
        color: 'success',
        label: i18n.t('erp.voucher_mgmt.voucher_type.receipt'),
      },
      [i18n.t('erp.voucher_mgmt.voucher_type_short.payment')]: {
        color: 'error',
        label: i18n.t('erp.voucher_mgmt.voucher_type.payment'),
      },
      [i18n.t('erp.voucher_mgmt.voucher_type_short.transfer')]: {
        color: 'primary',
        label: i18n.t('erp.voucher_mgmt.voucher_type.transfer'),
      },
      [i18n.t('erp.voucher_mgmt.voucher_type_short.accounting')]: {
        color: 'default',
        label: i18n.t('erp.voucher_mgmt.voucher_type.accounting'),
      },
    };
    return typeMap[type] || { color: 'default', label: type };
  };
  const stats = useMemo(() => {
    return {
      total: totalCount,
      draft: vouchers.filter((v) => v.status === 'draft').length,
      pending: vouchers.filter((v) => v.status === 'pending').length,
      approved: vouchers.filter((v) => v.status === 'approved').length,
      posted: vouchers.filter((v) => v.status === 'posted').length,
    };
  }, [vouchers, totalCount]);
  const handleCreate = async () => {
    if (!newVoucher.voucher_number || !newVoucher.voucher_date || !newVoucher.period) {
      addNotification({
        title: i18n.t('erp.voucher_mgmt.message.tip'),
        message: i18n.t('erp.voucher_mgmt.message.fill_required_fields'),
        type: 'warning',
      });
      return;
    }
    const totalDebit = newVoucher.items.reduce((sum, item) => sum + item.debit_amount, 0);
    const totalCredit = newVoucher.items.reduce((sum, item) => sum + item.credit_amount, 0);
    if (totalDebit !== totalCredit || totalDebit === 0) {
      addNotification({
        title: i18n.t('erp.voucher_mgmt.message.error'),
        message:
          totalDebit === 0
            ? i18n.t('erp.voucher_mgmt.message.add_voucher_items')
            : i18n.t('erp.voucher_mgmt.message.unbalanced_voucher'),
        type: 'error',
      });
      return;
    }
    try {
      const result = await createMutation.mutateAsync({
        voucher_number: `${newVoucher.voucher_type}-${newVoucher.voucher_number}`,
        voucher_date: newVoucher.voucher_date,
        period: newVoucher.period,
        attachment_count: newVoucher.attachment_count,
        summary: newVoucher.summary,
        description: newVoucher.description,
        items: newVoucher.items,
      });
      if (result.success) {
        setShowCreateModal(false);
        resetForm();
      } else {
        addNotification({
          title: i18n.t('erp.voucher_mgmt.message.failure'),
          message: result.message || i18n.t('erp.voucher_mgmt.message.create_failed'),
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('Create voucher failed:', err);
    }
  };
  const handleAudit = async (voucher: FinancialVoucher) => {
    try {
      const result = await updateMutation.mutateAsync({
        id: voucher.id,
        data: { status: 'approved' },
      });
      if (result.success) {
        addNotification({
          title: i18n.t('erp.voucher_mgmt.message.success'),
          message: i18n.t('erp.voucher_mgmt.message.voucher_audited'),
          type: 'success',
        });
      } else {
        addNotification({
          title: i18n.t('erp.voucher_mgmt.message.failure'),
          message: result.message || i18n.t('erp.voucher_mgmt.message.audit_failed'),
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('Audit voucher failed:', err);
    }
  };
  const handlePost = async (voucher: FinancialVoucher) => {
    try {
      const result = await updateMutation.mutateAsync({
        id: voucher.id,
        data: { status: 'posted' },
      });
      if (result.success) {
        addNotification({
          title: i18n.t('erp.voucher_mgmt.message.success'),
          message: i18n.t('erp.voucher_mgmt.message.voucher_posted'),
          type: 'success',
        });
      } else {
        addNotification({
          title: i18n.t('erp.voucher_mgmt.message.failure'),
          message: result.message || i18n.t('erp.voucher_mgmt.message.post_failed'),
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('Post voucher failed:', err);
    }
  };
  const handleDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };
  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      const result = await deleteMutation.mutateAsync(deletingId);
      if (!result.success) {
        addNotification({
          title: i18n.t('erp.voucher_mgmt.message.failure'),
          message: result.message || i18n.t('erp.voucher_mgmt.message.delete_failed'),
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('Delete voucher failed:', err);
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };
  const resetForm = () => {
    setNewVoucher({
      voucher_number: '',
      voucher_date: new Date().toISOString().split('T')[0],
      period: '',
      voucher_type: i18n.t('erp.voucher_mgmt.voucher_type_short.accounting'),
      attachment_count: 0,
      summary: '',
      description: '',
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
  const updateVoucherItem = (index: number, field: string, value: string | number) => {
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
  const totalDebit = newVoucher.items.reduce((sum, item) => sum + item.debit_amount, 0);
  const totalCredit = newVoucher.items.reduce((sum, item) => sum + item.credit_amount, 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;
  const handleViewDetail = (voucher: FinancialVoucher) => {
    setCurrentVoucher(voucher);
    voucherItemsQuery.refetch();
    setShowDetailModal(true);
  };
  const tabs = [
    { label: i18n.t('erp.voucher_mgmt.status.all'), value: 'all', count: stats.total },
    { label: i18n.t('erp.voucher_mgmt.status.draft'), value: 'draft', count: stats.draft },
    { label: i18n.t('erp.voucher_mgmt.status.pending'), value: 'pending', count: stats.pending },
    { label: i18n.t('erp.voucher_mgmt.status.approved'), value: 'approved', count: stats.approved },
    { label: i18n.t('erp.voucher_mgmt.status.posted'), value: 'posted', count: stats.posted },
  ];
  const handleTabChange = (_: SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
    if (newValue === 'all') {
      setStatusFilter('');
    } else {
      setStatusFilter(newValue);
    }
    setPage(0);
  };
  const handleExport = () => {
    addNotification({
      title: i18n.t('erp.voucher_mgmt.message.export_success'),
      message: i18n.t('erp.voucher_mgmt.message.voucher_data_exported'),
      type: 'success',
    });
  };
  const handleClosePeriod = () => {
    addNotification({
      title: i18n.t('erp.voucher_mgmt.message.close_period_success'),
      message: i18n.t('erp.voucher_mgmt.message.period_closed'),
      type: 'success',
    });
  };
  return {
    // state
    activeTab,
    searchQuery,
    statusFilter,
    voucherTypeFilter,
    periodFilter,
    page,
    rowsPerPage,
    showCreateModal,
    showDetailModal,
    currentVoucher,
    deleteDialogOpen,
    deletingId,
    newVoucher,
    // derived data
    vouchers,
    totalCount,
    loading,
    subjects,
    voucherItems,
    stats,
    tabs,
    totalDebit,
    totalCredit,
    isBalanced,
    // queries (for refetch)
    vouchersQuery,
    // setters
    setActiveTab,
    setSearchQuery,
    setStatusFilter,
    setVoucherTypeFilter,
    setPeriodFilter,
    setPage,
    setRowsPerPage,
    setShowCreateModal,
    setShowDetailModal,
    setDeleteDialogOpen,
    setDeletingId,
    setNewVoucher,
    // handlers
    handleCreate,
    handleAudit,
    handlePost,
    handleDelete,
    confirmDelete,
    resetForm,
    addVoucherItem,
    updateVoucherItem,
    removeVoucherItem,
    handleViewDetail,
    handleTabChange,
    handleExport,
    handleClosePeriod,
    // helpers
    formatCurrency,
    getStatusBadgeConfig,
    getVoucherTypeConfig,
  };
};
export type VoucherManagementReturn = ReturnType<typeof useVoucherManagement>;
