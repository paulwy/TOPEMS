import React, { useState, useMemo, useCallback } from 'react';
import { Typography, Box } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import CrudPage, { type CrudTab } from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { PageContainer, StatCardGroup, ActionButton, StatusBadge } from '@/components/common';
import { voucherApi } from '@/api/finance/voucher';
import { accountingSubjectApi } from '@/api/finance/accountingSubject';
import type { FinancialVoucher, VoucherItemRequest } from '@/api/finance';
import type { VoucherEntry } from '@/types/finance';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { FINANCE_PATHS } from '@/modules/finance/config';
import { designTokens } from '@/theme/tokens';
import { voucherSchema, accountingSubjectSchema } from '@/schemas/finance';
import type { EntitySchema, BatchActionConfig } from '@/schema';
import type { RowAction } from '@/components/templates';

import VoucherFormModal from './components/VoucherFormModal';
import VoucherImportModal from './components/VoucherImportModal';
import VoucherDetailModal from './components/VoucherDetailModal';
import ConfirmDialogs from './components/ConfirmDialogs';

import { QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const ct = designTokens.colors;

// ============ 科目 Tab 面板（嵌套 CrudPage） ============

interface SubjectCrudPanelProps {
  statCards: Array<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  }>;
}

const SubjectCrudPanel: React.FC<SubjectCrudPanelProps> = ({ statCards }) => {
  const { t } = useTranslation('finance');
  const apiAdapter = useMemo(() => createCrudPageAdapter(accountingSubjectApi), []);
  const headerContent = useMemo(
    () => (
      <StatCardGroup
        stats={statCards}
        columns={4}
      />
    ),
    [statCards]
  );

  return (
    <CrudPage
      schema={accountingSubjectSchema}
      apiAdapter={apiAdapter}
      headerContent={headerContent}
      breadcrumbs={[
        { label: t('finance.index.k2') },
        { label: t('finance.index.k1') },
        { label: t('finance.index.k0') },
      ]}
    />
  );
};

// ============ 主页面 ============

const FinanceVoucherPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  // ── 弹窗状态 ──
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentVoucher, setCurrentVoucher] = useState<FinancialVoucher | null>(null);
  const [voucherItems, setVoucherItems] = useState<VoucherEntry[]>([]);
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

  // ── 凭证统计查询（用于 headerContent 统计卡片）──
  const voucherStatsQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.FINANCE_VOUCHER_STATS_BASE,
    queryFn: async () => {
      const res = await voucherApi.list({ pagesize: 999 } as Record<string, unknown>);
      if (!res.success || !res.data) {
        throw new Error(res.message || t('finance.finance_voucher_page_index.fail'));
      }
      return res.data.items || [];
    },
    staleTime: 30 * 1000,
  });
  const allVouchers = useMemo(() => voucherStatsQuery.data || [], [voucherStatsQuery.data]);

  // ── 会计科目查询（科目 Tab 统计 + 凭证表单科目下拉）──
  const subjectsQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.FINANCE_ACCOUNTING_SUBJECT_STATS_BASE,
    queryFn: async () => {
      const res = await accountingSubjectApi.list({ pagesize: 999 } as Record<string, unknown>);
      if (!res.success || !res.data) {
        throw new Error(res.message || t('finance.finance_voucher_page_index.fail_1'));
      }
      return res.data.items || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const subjects = useMemo(() => subjectsQuery.data || [], [subjectsQuery.data]);

  // ── CrudPage 适配器 ──
  const voucherAdapter = useMemo(() => createCrudPageAdapter(voucherApi), []);
  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

  const refreshVouchers = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.FINANCE_VOUCHER_BASE,
      exact: false,
      refetchType: 'active',
    });
  }, [queryClient]);

  // ── 凭证操作 ──
  const loadVoucherItems = useCallback(
    async (voucherId: string) => {
      try {
        const result = await voucherApi.getItems(voucherId);
        if (result.success && result.data) {
          setVoucherItems(result.data);
        }
      } catch (err: unknown) {
        apiLogger.error(t('finance.finance_voucher_page_index.fail_1'), err);
      }
    },
    [t]
  );

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
      const result = await voucherApi.create(newVoucher);
      if (!result.success) {
        throw new Error(result.message || t('finance.finance_voucher_page_index.create'));
      }
      addNotification({
        title: t('finance.finance_voucher_page_index.success'),
        message: t('finance.finance_voucher_page_index.create_1'),
        type: 'success',
      });
      refreshVouchers();
      setShowCreateModal(false);
      resetForm();
    } catch (err: unknown) {
      addNotification({
        title: t('finance.finance_voucher_page_index.error'),
        message: (err as Error).message,
        type: 'error',
      });
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
      if (!result.success) {
        throw new Error(result.message || t('finance.finance_voucher_page_index.delete_1'));
      }
      addNotification({
        title: t('finance.finance_voucher_page_index.success'),
        message: t('finance.finance_voucher_page_index.delete_2'),
        type: 'success',
      });
      refreshVouchers();
    } catch (err: unknown) {
      addNotification({
        title: t('finance.finance_voucher_page_index.error'),
        message: (err as Error).message,
        type: 'error',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const handleBatchDelete = (ids: string[]) => {
    if (ids.length === 0) return;
    setSelectedIds(ids);
    setBatchDeleteDialogOpen(true);
  };

  const confirmBatchDelete = async () => {
    try {
      const promises = selectedIds.map((id) => voucherApi.delete(id));
      const results = await Promise.allSettled(promises);
      const successCount = results.filter((r) => r.status === 'fulfilled').length;

      if (successCount === selectedIds.length) {
        addNotification({
          title: t('finance.finance_voucher_page_index.success'),
          message: i18n.t('finance.finance_voucher_page_index.e1', { v1: successCount }),
          type: 'success',
        });
      } else {
        addNotification({
          title: t('finance.finance_voucher_page_index.success_1'),
          message: i18n.t('finance.finance_voucher_page_index.e2', {
            v1: successCount,
            v2: selectedIds.length - successCount,
          }),
          type: 'warning',
        });
      }

      setSelectedIds([]);
      refreshVouchers();
    } catch (err: unknown) {
      addNotification({
        title: t('finance.finance_voucher_page_index.error'),
        message:
          (err as { message?: string }).message ||
          t('finance.finance_voucher_page_index.batch_delete_1'),
        type: 'error',
      });
    } finally {
      setBatchDeleteDialogOpen(false);
    }
  };

  const handleBatchAudit = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;

      try {
        const promises = ids.map((id) => voucherApi.update(id, { status: 'approved' }));
        const results = await Promise.allSettled(promises);
        const successCount = results.filter((r) => r.status === 'fulfilled').length;

        if (successCount === ids.length) {
          addNotification({
            title: t('finance.finance_voucher_page_index.success'),
            message: i18n.t('finance.finance_voucher_page_index.e3', { v1: successCount }),
            type: 'success',
          });
        } else {
          addNotification({
            title: t('finance.finance_voucher_page_index.success_1'),
            message: i18n.t('finance.finance_voucher_page_index.e4', {
              v1: successCount,
              v2: ids.length - successCount,
            }),
            type: 'warning',
          });
        }

        setSelectedIds([]);
        refreshVouchers();
      } catch (err: unknown) {
        addNotification({
          title: t('finance.finance_voucher_page_index.error'),
          message:
            (err as { message?: string }).message || t('finance.finance_voucher_page_index.fail_2'),
          type: 'error',
        });
      }
    },
    [addNotification, refreshVouchers, t]
  );

  const handleAudit = useCallback(
    async (id: string) => {
      try {
        const result = await voucherApi.update(id, { status: 'approved' });
        if (!result.success) {
          throw new Error(result.message || t('finance.finance_voucher_page_index.fail_2'));
        }
        addNotification({
          title: t('finance.finance_voucher_page_index.success'),
          message: t('finance.finance_voucher_page_index.approved'),
          type: 'success',
        });
        refreshVouchers();
      } catch (err: unknown) {
        addNotification({
          title: t('finance.finance_voucher_page_index.error'),
          message: (err as Error).message,
          type: 'error',
        });
      }
    },
    [addNotification, refreshVouchers, t]
  );

  const handleUnaudit = useCallback(
    async (id: string) => {
      try {
        const result = await voucherApi.update(id, { status: 'pending' });
        if (!result.success) {
          throw new Error(result.message || t('finance.finance_voucher_page_index.fail_2'));
        }
        addNotification({
          title: t('finance.finance_voucher_page_index.success'),
          message: t('finance.finance_voucher_page_index.pending_review'),
          type: 'success',
        });
        refreshVouchers();
      } catch (err: unknown) {
        addNotification({
          title: t('finance.finance_voucher_page_index.error'),
          message: (err as Error).message,
          type: 'error',
        });
      }
    },
    [addNotification, refreshVouchers, t]
  );

  const handleImport = async (fileContent: string) => {
    try {
      const result = await voucherApi.importU8({
        file_name: 'u8_vouchers.json',
        file_content: fileContent,
        import_mode: 'insert',
      });
      if (!result.success) {
        throw new Error(result.message || t('finance.finance_voucher_page_index.import'));
      }
      const {
        success_count: successCount,
        failed_count: failedCount,
        errors,
      } = result.data ||
      ({} as { success_count?: number; failed_count?: number; errors?: unknown[] });
      if (failedCount === 0) {
        addNotification({
          title: t('finance.finance_voucher_page_index.success'),
          message: i18n.t('finance.finance_voucher_page_index.e5', { v1: successCount }),
          type: 'success',
        });
      } else {
        addNotification({
          title: t('finance.finance_voucher_page_index.success_1'),
          message: i18n.t('finance.finance_voucher_page_index.e6', {
            v1: successCount,
            v2: failedCount,
          }),
          type: 'warning',
        });
        errors?.forEach((err: unknown) =>
          apiLogger.warn(t('finance.finance_voucher_page_index.import_3'), err)
        );
      }
      refreshVouchers();
      setShowImportModal(false);
    } catch (err: unknown) {
      apiLogger.error(t('finance.finance_voucher_page_index.import_4'), err);
      addNotification({
        title: t('finance.finance_voucher_page_index.error'),
        message: (err as Error).message || t('finance.finance_voucher_page_index.import'),
        type: 'error',
      });
    }
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

  // ── 凭证统计卡片（通过 headerContent 渲染）──
  const voucherStatCards = useMemo(
    () => [
      {
        title: i18n.t('finance.finance_voucher_page_index.text_551f4c'),
        value: allVouchers.length,
        icon: <FileText size={24} />,
        color: 'primary' as const,
      },
      {
        title: i18n.t('finance.finance_voucher_page_index.approved'),
        value: allVouchers.filter((v) => v.status === 'approved' || v.status === 'posted').length,
        icon: <FileCheck size={24} />,
        color: 'success' as const,
      },
      {
        title: i18n.t('finance.finance_voucher_page_index.pending_review'),
        value: allVouchers.filter((v) => v.status === 'submitted').length,
        icon: <Clock size={24} />,
        color: 'warning' as const,
      },
      {
        title: i18n.t('finance.finance_voucher_page_index.amount'),
        value: formatCurrency(allVouchers.reduce((sum, v) => sum + v.total_debit, 0)),
        icon: <DollarSign size={24} />,
        color: 'secondary' as const,
      },
    ],
    [allVouchers]
  );

  // ── 科目统计卡片 ──
  const subjectStatCards = useMemo(
    () => [
      {
        title: i18n.t('finance.finance_voucher_page_index.text_3eb8d3'),
        value: subjects.length,
        icon: <Building2 size={24} />,
        color: 'primary' as const,
      },
      {
        title: i18n.t('finance.finance_voucher_page_index.active'),
        value: subjects.filter((s) => s.status === 'active').length,
        icon: <FileCheck size={24} />,
        color: 'success' as const,
      },
      {
        title: i18n.t('finance.finance_voucher_page_index.text_6772b0'),
        value: subjects.filter((s) => s.level === 1).length,
        icon: <DollarSign size={24} />,
        color: 'warning' as const,
      },
      {
        title: i18n.t('finance.finance_voucher_page_index.text_07d5bc'),
        value: subjects.filter((s) => s.is_cash_flow).length,
        icon: <Clock size={24} />,
        color: 'info' as const,
      },
    ],
    [subjects]
  );

  // ── 凭证 headerContent（统计卡片）──
  const voucherHeaderContent = useMemo(
    () => (
      <StatCardGroup
        stats={voucherStatCards}
        columns={4}
      />
    ),
    [voucherStatCards]
  );

  // ── 自定义行操作（含审核/反审核）──
  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        label: i18n.t('finance.finance_voucher_page_index.view_detail'),
        icon: <Eye size={16} />,
        onClick: (row: Record<string, unknown>) => {
          const voucher = row as unknown as FinancialVoucher;
          setCurrentVoucher(voucher);
          loadVoucherItems(voucher.id);
          setShowDetailModal(true);
        },
      },
      {
        label: i18n.t('finance.finance_voucher_page_index.edit'),
        icon: <Edit size={16} />,
        color: 'primary',
        onClick: (row: Record<string, unknown>) => {
          const voucher = row as unknown as FinancialVoucher;
          setNewVoucher({
            voucher_number: voucher.voucher_number,
            voucher_date: voucher.voucher_date?.split('T')[0] || '',
            period: voucher.period,
            attachment_count: voucher.attachment_count || 0,
            summary: voucher.summary || '',
            maker_name: voucher.maker_name || '',
            items: [],
          });
          setShowCreateModal(true);
        },
      },
      {
        label: i18n.t('finance.finance_voucher_page_index.approved'),
        icon: <Check size={16} />,
        color: 'success',
        onClick: (row: Record<string, unknown>) => handleAudit(String(row.id)),
        show: (row: Record<string, unknown>) =>
          row.status !== 'approved' && row.status !== 'posted',
      },
      {
        label: i18n.t('finance.finance_voucher_page_index.pending_review'),
        icon: <RefreshCw size={16} />,
        color: 'warning',
        onClick: (row: Record<string, unknown>) => handleUnaudit(String(row.id)),
        show: (row: Record<string, unknown>) =>
          row.status === 'approved' || row.status === 'posted',
      },
      {
        label: i18n.t('finance.finance_voucher_page_index.delete_1'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row: Record<string, unknown>) => handleDelete(String(row.id)),
      },
    ],
    [handleAudit, handleUnaudit, loadVoucherItems]
  );

  // ── 批量操作（合并到 schema）──
  const voucherSchemaWithBatch = useMemo<EntitySchema>(
    () => ({
      ...voucherSchema,
      batchActions: [
        {
          key: 'batch-audit',
          label: t('finance.finance_voucher_page_index.approved'),
          icon: <Check size={16} />,
          color: 'success',
          onClick: handleBatchAudit,
          confirm: true,
        },
        {
          key: 'batch-delete',
          label: t('finance.finance_voucher_page_index.batch_delete'),
          icon: <Trash2 size={16} />,
          color: 'error',
          onClick: handleBatchDelete,
          confirm: true,
        },
      ] as BatchActionConfig[],
    }),
    [t, handleBatchAudit]
  );

  // ── Tab 配置 ──
  const tabs: CrudTab[] = useMemo(
    () => [
      {
        id: 'vouchers',
        label: i18n.t('finance.finance_voucher_page_index.text_755348'),
        icon: <FileText size={16} />,
        content: null,
      },
      {
        id: 'subjects',
        label: i18n.t('finance.finance_voucher_page_index.text_d64865'),
        icon: <Building2 size={16} />,
        content: <SubjectCrudPanel statCards={subjectStatCards} />,
      },
    ],
    [subjectStatCards]
  );

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
                  {t('finance.finance_voucher_page_index.e7')}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ mt: 0.5, color: 'text.secondary' }}
                >
                  {t('finance.finance_voucher_page_index.e8')}
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
        <CrudPage
          schema={voucherSchemaWithBatch}
          apiAdapter={voucherAdapter}
          customRowActions={customRowActions}
          headerContent={voucherHeaderContent}
          tabs={tabs}
          defaultTab='vouchers'
        />
      </Box>

      <VoucherFormModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title={
          newVoucher.voucher_number
            ? t('finance.finance_voucher_page_index.edit_1')
            : t('finance.finance_voucher_page_index.add_1')
        }
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
