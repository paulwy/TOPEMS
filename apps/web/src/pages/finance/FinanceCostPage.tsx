import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { FINANCE_PATHS } from '@/modules/finance/config';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  BarChart3,
  DollarSign,
  Wallet,
  Download,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DataExport, BackButton, PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { ListPageTemplate, StatCardGroup } from '@/components';
import { financeApi, accountApi } from '@/api/finance';
import type { Account, AccountBalance } from '@/types/finance';
import { apiLogger } from '@/utils/logger';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Box as MuiBox,
  Typography,
  Stack,
  Button,
} from '@mui/material';

const FinanceCostPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [filterCenter, setFilterCenter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedCost, setSelectedCost] = useState<Account | null>(null);

  const currentPeriod = new Date().toISOString().slice(0, 7);

  const accountsQuery = useQuery<Account[]>({
    queryKey: [...QUERY_KEYS.FINANCE.COST, { searchQuery, type: 'accounts' }],
    queryFn: async () => {
      const accountsRes = await financeApi.account.list({
        category: 'cost',
        keyword: searchQuery || undefined,
      });
      if (accountsRes.success && accountsRes.data) {
        return accountsRes.data.items || [];
      }
      return [];
    },
  });

  const balancesQuery = useQuery<AccountBalance[]>({
    queryKey: [...QUERY_KEYS.FINANCE.COST, { period: currentPeriod, type: 'balances' }],
    queryFn: async () => {
      const balancesRes = await financeApi.account.getBalances({
        period: currentPeriod,
      });
      if (balancesRes.success && balancesRes.data) {
        return balancesRes.data || [];
      }
      return [];
    },
  });

  const costData = accountsQuery.data || [];
  const balanceData = balancesQuery.data || [];
  const loading = accountsQuery.isLoading || balancesQuery.isLoading;
  const error = accountsQuery.error || balancesQuery.error ? t('finance.finance_cost_page.fail') : undefined;

  const getAccountBalance = (accountId: string): AccountBalance | undefined => {
    return balanceData.find((b) => b.account_id === accountId);
  };

  const filteredData = useMemo(() => {
    return costData.filter((cost) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!cost.code.toLowerCase().includes(query) && !cost.name.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [costData, filterCenter, searchQuery]);

  const totalActual = useMemo(() => {
    return balanceData
      .filter((b) => b.category === 'cost')
      .reduce((sum, b) => sum + b.debit_balance, 0);
  }, [balanceData]);

  const statCards = useMemo(() => {
    return [
      {
        title: t('finance.finance_cost_page.text_27d98b'),
        value: costData.length,
        icon: <Wallet size={24} />,
        color: 'primary' as const,
      },
      {
        title: t('finance.finance_cost_page.actual'),
        value: `¥${totalActual.toLocaleString()}`,
        icon: <DollarSign size={24} />,
        color: 'secondary' as const,
      },
      {
        title: t('finance.finance_cost_page.text_2058a6'),
        value: `¥${balanceData
          .filter((b) => b.category === 'cost')
          .reduce((sum, b) => sum + b.period_debit, 0)
          .toLocaleString()}`,
        icon: <TrendingDown size={24} />,
        color: 'success' as const,
      },
    ];
  }, [costData, balanceData, totalActual]);

  const handleAnalysis = (cost: Account) => {
    setSelectedCost(cost);
    setShowAnalysisModal(true);
  };

  const handleExport = () => {
    addNotification({
      title: t('finance.finance_cost_page.export'),
      message: t('finance.finance_cost_page.export_1'),
      type: 'success',
    });
  };

  const handleReset = () => {
    setSearchQuery('');
    setFilterCenter('');
  };

  const columns = useMemo(
    () => [
      {
        id: 'code',
        label: t('finance.finance_cost_page.code'),
        render: (row: Account) => (
          <MuiBox sx={{ fontWeight: 600, color: 'primary.main' }}>{row.code}</MuiBox>
        ),
      },
      {
        id: 'name',
        label: t('finance.finance_cost_page.text_6c5f2d'),
        render: (row: Account) => <MuiBox sx={{ fontWeight: 500 }}>{row.name}</MuiBox>,
      },
      {
        id: 'balance',
        label: t('finance.finance_cost_page.text_23a35c'),
        render: (row: Account) => {
          const balance = getAccountBalance(row.id);
          return (
            <MuiBox sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
              ¥{(balance?.debit_balance || 0).toLocaleString()}
            </MuiBox>
          );
        },
      },
      {
        id: 'period_debit',
        label: t('finance.finance_cost_page.text_2058a6'),
        render: (row: Account) => {
          const balance = getAccountBalance(row.id);
          return (
            <MuiBox sx={{ fontFamily: 'monospace', color: 'success.main' }}>
              ¥{(balance?.period_debit || 0).toLocaleString()}
            </MuiBox>
          );
        },
      },
      {
        id: 'period_credit',
        label: t('finance.finance_cost_page.text_1d91a4'),
        render: (row: Account) => {
          const balance = getAccountBalance(row.id);
          return (
            <MuiBox sx={{ fontFamily: 'monospace', color: 'error.main' }}>
              ¥{(balance?.period_credit || 0).toLocaleString()}
            </MuiBox>
          );
        },
      },
      {
        id: 'status',
        label: t('finance.finance_cost_page.status'),
        render: (row: Account) => {
          const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
            active: 'success',
            disabled: 'error',
          };
          const statusLabels: Record<string, string> = {
            active: t('finance.finance_cost_page.active'),
            disabled: t('finance.finance_cost_page.inactive'),
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
    [balanceData]
  );

  const rowActions = useMemo(
    () => [
      {
        label: t('finance.finance_cost_page.text_7f9f6f'),
        icon: <BarChart3 size={16} />,
        color: 'success' as const,
        onClick: (row: Account) => handleAnalysis(row),
      },
    ],
    []
  );

  const advancedFilters = useMemo(
    () => [
      {
        id: 'status',
        label: t('finance.finance_cost_page.status'),
        type: 'select' as const,
        options: [
          { value: 'active', label: t('finance.finance_cost_page.active') },
          { value: 'disabled', label: t('finance.finance_cost_page.inactive') },
        ],
        value: filterCenter,
        onChange: (value: unknown) => setFilterCenter(value as string),
      },
    ],
    [filterCenter]
  );

  const exportFields = useMemo(
    () => [
      { key: 'code', title: t('finance.finance_cost_page.code') },
      { key: 'name', title: t('finance.finance_cost_page.text_6c5f2d') },
      { key: 'category', title: t('finance.finance_cost_page.text_f31b4e') },
      { key: 'balance_direction', title: t('finance.finance_cost_page.text_98f933') },
      { key: 'level', title: t('finance.finance_cost_page.text_6896da') },
      { key: 'status', title: t('finance.finance_cost_page.status') },
    ],
    []
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title={t('finance.finance_cost_page.text_86194f')}
      subtitle={t('finance.finance_cost_page.text_319c67')}
      autoTitle
      autoBreadcrumbs
    >
      <MuiBox
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 'sm',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <MuiBox
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
              <MuiBox>
                <Typography
                  variant='h5'
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: 700,
                  }}
                >
                  <MuiBox
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
                    <TrendingUp size={28} />
                  </MuiBox>
                  成本管理
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  管理成本中心预算和实际成本，分析成本差异
                </Typography>
              </MuiBox>
            </Stack>
            <Stack
              direction='row'
              spacing={1}
            >
              <Button
                variant='outlined'
                startIcon={<Download size={20} />}
                onClick={handleExport}
              >
                导出报表
              </Button>
              <DataExport
                data={costData as unknown as Record<string, unknown>[]}
                fields={exportFields}
                defaultFileName={t('finance.finance_cost_page.text_50e24e')}
                buttonText={t('finance.finance_cost_page.export_2')}
              />
            </Stack>
          </Stack>
        </MuiBox>
      </MuiBox>

      <MuiBox sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}>
        <StatCardGroup
          stats={statCards}
          columns={3}
        />

        <ListPageTemplate
          columns={columns}
          data={filteredData}
          loading={loading}
          error={error}
          searchable
          searchPlaceholder={t('finance.finance_cost_page.search')}
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          filters={advancedFilters}
          filtersValue={{
            department_id: filterCenter,
          }}
          onFilterChange={(filters) => {
            if (filters.department_id !== undefined)
              setFilterCenter(filters.department_id as string);
          }}
          rowActions={rowActions}
          onRefresh={() => {
            accountsQuery.refetch();
            balancesQuery.refetch();
          }}
        />
      </MuiBox>

      <Dialog
        open={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>成本分析 - {selectedCost?.name}</DialogTitle>
        <DialogContent>
          {selectedCost && (
            <Stack
              spacing={3}
              sx={{ pt: 2 }}
            >
              <MuiBox
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <MuiBox sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
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
                    {selectedCost.code}
                  </Typography>
                </MuiBox>
                <MuiBox sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    成本项目
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedCost.name}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  借方余额
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 700 }}
                >
                  ¥{(getAccountBalance(selectedCost.id)?.debit_balance || 0).toLocaleString()}
                </Typography>
              </MuiBox>
              <MuiBox
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <MuiBox sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    本期借方发生
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 700, color: 'success.main' }}
                  >
                    ¥{(getAccountBalance(selectedCost.id)?.period_debit || 0).toLocaleString()}
                  </Typography>
                </MuiBox>
                <MuiBox sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    本期贷方发生
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 700, color: 'error.main' }}
                  >
                    ¥{(getAccountBalance(selectedCost.id)?.period_credit || 0).toLocaleString()}
                  </Typography>
                </MuiBox>
              </MuiBox>
              {selectedCost.description && (
                <MuiBox sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
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
                    {selectedCost.description}
                  </Typography>
                </MuiBox>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAnalysisModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FinanceCostPage;
