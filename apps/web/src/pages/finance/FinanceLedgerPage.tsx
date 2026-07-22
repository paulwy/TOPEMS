import React, { useState, useMemo } from 'react';
import { FileText, Eye, Calculator, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ListPageTemplate, StatCardGroup } from '@/components';
import { DataExport, BackButton, PageContainer } from '@/components/common';
import { financeApi } from '@/api/finance';
import type { Account, AccountBalance } from '@/types/finance';
import { apiLogger } from '@/utils/logger';

import { FINANCE_PATHS } from '@/modules/finance/config';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Box,
  Typography,
  Stack,
  Button,
} from '@mui/material';

const FinanceLedgerPage: React.FC = () => {
  const { t } = useTranslation();
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Account | null>(null);

  const currentPeriodQuery = useQuery({
    queryKey: ['finance-period-current'],
    queryFn: async () => {
      const res = await financeApi.period.getCurrent();
      if (!res.success || !res.data) {
        throw new Error(res.message || t('finance.finance_ledger_page.fail'));
      }
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const accountsQuery = useQuery({
    queryKey: ['finance-accounts-list', searchQuery],
    queryFn: async () => {
      const res = await financeApi.account.list({
        keyword: searchQuery || undefined,
      });
      if (!res.success || !res.data) {
        throw new Error(res.message || t('finance.finance_ledger_page.list'));
      }
      return res.data.items || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const balancesQuery = useQuery({
    queryKey: ['finance-account-balances', currentPeriodQuery.data?.period],
    queryFn: async () => {
      if (!currentPeriodQuery.data?.period) return [];
      const res = await financeApi.account.getBalances({
        period: currentPeriodQuery.data.period,
      });
      if (!res.success || !res.data) {
        throw new Error(res.message || t('finance.finance_ledger_page.fail_1'));
      }
      return res.data;
    },
    enabled: !!currentPeriodQuery.data?.period,
    staleTime: 5 * 60 * 1000,
  });

  const ledgerData = accountsQuery.data || [];
  const accountBalances = balancesQuery.data || [];
  const loading =
    accountsQuery.isLoading || currentPeriodQuery.isLoading || balancesQuery.isLoading;
  const error =
    accountsQuery.error?.message ||
    currentPeriodQuery.error?.message ||
    balancesQuery.error?.message;

  const filteredData = useMemo(() => {
    return ledgerData.filter((entry) => {
      if (filterCategory && entry.category !== filterCategory) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !entry.code.toLowerCase().includes(query) &&
          !entry.name.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [ledgerData, filterCategory, searchQuery]);

  const getCategoryLabel = (category?: string) => {
    const labels: Record<string, string> = {
      asset: t('finance.finance_ledger_page.text_8b786a'),
      liability: t('finance.finance_ledger_page.text_299422'),
      equity: t('finance.finance_ledger_page.text_17a475'),
      cost: t('finance.finance_ledger_page.text_5a2da5'),
      expense: t('finance.finance_ledger_page.text_239f3a'),
      income: t('finance.finance_ledger_page.text_ef2827'),
    };
    return labels[category || ''] || t('finance.finance_ledger_page.other');
  };

  const statCards = useMemo(() => {
    const totalAccounts = ledgerData.length;
    const assetCount = ledgerData.filter((e) => e.category === 'asset').length;
    const liabilityCount = ledgerData.filter((e) => e.category === 'liability').length;
    const equityCount = ledgerData.filter((e) => e.category === 'equity').length;
    const expenseCount = ledgerData.filter((e) => e.category === 'expense').length;
    const incomeCount = ledgerData.filter((e) => e.category === 'income').length;

    return [
      {
        title: t('finance.finance_ledger_page.text_3eb8d3'),
        value: totalAccounts,
        icon: <Calculator size={24} />,
        color: 'primary' as const,
      },
      {
        title: t('finance.finance_ledger_page.text_59df2a'),
        value: assetCount,
        icon: <Wallet size={24} />,
        color: 'secondary' as const,
      },
      {
        title: t('finance.finance_ledger_page.text_d21d54'),
        value: liabilityCount,
        icon: <TrendingUp size={24} />,
        color: 'error' as const,
      },
      {
        title: t('finance.finance_ledger_page.text_58a714'),
        value: equityCount,
        icon: <TrendingDown size={24} />,
        color: 'success' as const,
      },
      {
        title: t('finance.finance_ledger_page.text_d70851'),
        value: expenseCount + incomeCount,
        icon: <FileText size={24} />,
        color: 'info' as const,
      },
    ];
  }, [ledgerData]);

  const handleViewDetail = (entry: Account) => {
    setSelectedEntry(entry);
    setShowDetailModal(true);
  };

  const columns = useMemo(
    () => [
      {
        id: 'code',
        label: t('finance.finance_ledger_page.code'),
        render: (row: Account) => (
          <Box sx={{ fontWeight: 600, color: 'success.main' }}>{row.code}</Box>
        ),
      },
      {
        id: 'name',
        label: t('finance.finance_ledger_page.name'),
        render: (row: Account) => <Box sx={{ fontWeight: 500 }}>{row.name}</Box>,
      },
      {
        id: 'category',
        label: t('finance.finance_ledger_page.text_f31b4e'),
        render: (row: Account) => (
          <Chip
            label={getCategoryLabel(row.category)}
            size='small'
            color='success'
          />
        ),
      },
      {
        id: 'level',
        label: t('finance.finance_ledger_page.text_e7c0f0'),
        render: (row: Account) => (
          <Chip
            label={`第${row.level}级`}
            size='small'
            variant='outlined'
          />
        ),
      },
      {
        id: 'parent_code',
        label: t('finance.finance_ledger_page.text_e18d32'),
        render: (row: Account) => (
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{row.parent_code || '-'}</Box>
        ),
      },
      {
        id: 'status',
        label: t('finance.finance_ledger_page.status'),
        render: (row: Account) => {
          const statusColors: Record<string, 'success' | 'error' | 'default'> = {
            active: 'success',
            disabled: 'error',
          };
          const statusLabels: Record<string, string> = {
            active: t('finance.finance_ledger_page.active'),
            disabled: t('finance.finance_ledger_page.text_710ad0'),
          };
          return (
            <Chip
              label={statusLabels[row.status] || row.status}
              size='small'
              color={statusColors[row.status] || 'default'}
            />
          );
        },
      },
    ],
    []
  );

  const rowActions = useMemo(
    () => [
      {
        label: t('finance.finance_ledger_page.view_detail'),
        icon: <Eye sx={{ width: 16, height: 16 }} />,
        onClick: (row: Account) => handleViewDetail(row),
      },
    ],
    []
  );

  const advancedFilters = useMemo(
    () => [
      {
        id: 'period',
        label: t('finance.finance_ledger_page.text_6cde16'),
        type: 'select' as const,
        options: [
          { value: '', label: t('finance.finance_ledger_page.all') },
          { value: '2024-01', label: t('finance.finance_ledger_page.text_0f5e9e') },
          { value: '2024-02', label: t('finance.finance_ledger_page.text_a6320e') },
          { value: '2024-03', label: t('finance.finance_ledger_page.text_5df676') },
          { value: '2024-04', label: t('finance.finance_ledger_page.text_fb109d') },
        ],
        value: filterPeriod,
        onChange: (value: unknown) => setFilterPeriod(value as string),
      },
      {
        id: 'category',
        label: t('finance.finance_ledger_page.text_f31b4e'),
        type: 'select' as const,
        options: [
          { value: '', label: t('finance.finance_ledger_page.all_1') },
          { value: 'asset', label: t('finance.finance_ledger_page.text_8b786a') },
          { value: 'liability', label: t('finance.finance_ledger_page.text_299422') },
          { value: 'equity', label: t('finance.finance_ledger_page.text_17a475') },
          { value: 'expense', label: t('finance.finance_ledger_page.text_239f3a') },
          { value: 'income', label: t('finance.finance_ledger_page.text_ef2827') },
          { value: 'cost', label: t('finance.finance_ledger_page.text_5a2da5') },
        ],
        value: filterCategory,
        onChange: (value: unknown) => setFilterCategory(value as string),
      },
    ],
    [filterPeriod, filterCategory]
  );

  const exportFields = useMemo(
    () => [
      { key: 'code', title: t('finance.finance_ledger_page.code') },
      { key: 'name', title: t('finance.finance_ledger_page.name') },
      { key: 'category', title: t('finance.finance_ledger_page.text_383a6d') },
      { key: 'level', title: t('finance.finance_ledger_page.text_e78e4b') },
      { key: 'parent_code', title: t('finance.finance_ledger_page.text_e18d32') },
      { key: 'status', title: t('finance.finance_ledger_page.status') },
    ],
    []
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title={t('finance.finance_ledger_page.text_3c213e')}
      subtitle={t('finance.finance_ledger_page.text_294254')}
      autoTitle
      autoBreadcrumbs
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 'sm',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            maxWidth: 1280,
            mx: 'auto',
            px: { xs: 2, sm: 3, lg: 4 },
            py: 3,
          }}
        >
          <Stack
            direction='row'
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Stack
              direction='row'
              sx={{ alignItems: 'center' }}
              spacing={2}
            >
              <BackButton href={FINANCE_PATHS.dashboard} />
              <Box>
                <Typography
                  variant='h5'
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: 700,
                  }}
                >
                  <Box
                    component='span'
                    sx={{
                      width: 28,
                      height: 28,
                      mr: 1.5,
                      color: 'success.main',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <FileText size={28} />
                  </Box>
                  总账管理
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  管理会计科目总账，查看账户余额和发生额
                </Typography>
              </Box>
            </Stack>
            <Stack
              direction='row'
              spacing={1}
            >
              <DataExport
                data={filteredData as unknown as Record<string, unknown>[]}
                fields={exportFields}
                defaultFileName={t('finance.finance_ledger_page.text_3de613')}
                buttonText={t('finance.finance_ledger_page.export')}
              />
            </Stack>
          </Stack>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}>
        <StatCardGroup
          stats={statCards}
          columns={5}
        />

        <ListPageTemplate
          columns={columns}
          data={filteredData}
          loading={loading}
          error={error}
          searchable
          searchPlaceholder={t('finance.finance_ledger_page.search')}
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          filters={advancedFilters}
          filtersValue={{
            period: filterPeriod,
            category: filterCategory,
          }}
          onFilterChange={(filters) => {
            if (filters.period !== undefined) setFilterPeriod(filters.period as string);
            if (filters.category !== undefined) setFilterCategory(filters.category as string);
          }}
          rowActions={rowActions}
          onRefresh={() => {
            accountsQuery.refetch();
            currentPeriodQuery.refetch();
            balancesQuery.refetch();
          }}
        />
      </Box>

      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>科目详情 - {selectedEntry?.name}</DialogTitle>
        <DialogContent>
          {selectedEntry && (
            <Stack
              spacing={3}
              sx={{ pt: 2 }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    科目编码
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedEntry.code}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    科目名称
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedEntry.name}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    科目类别
                  </Typography>
                  <Chip
                    label={selectedEntry.category || t('finance.finance_ledger_page.text_ecf7eb')}
                    size='small'
                    color='success'
                  />
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    科目级别
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'primary.main' }}
                  >
                    第{selectedEntry.level}级
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    上级科目
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700 }}
                  >
                    {selectedEntry.parent_code || '-'}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    是否现金流量科目
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{
                      fontWeight: 700,
                      color: selectedEntry.is_cash_flow ? 'success.main' : 'text.secondary',
                    }}
                  >
                    {selectedEntry.is_cash_flow ? t('finance.finance_ledger_page.yes') : t('finance.finance_ledger_page.no')}
                  </Typography>
                </Box>
              </Box>
              {selectedEntry.description && (
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    备注
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ mt: 1 }}
                  >
                    {selectedEntry.description}
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FinanceLedgerPage;
