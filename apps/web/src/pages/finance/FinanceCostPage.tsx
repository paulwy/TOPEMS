import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  BarChart3,
  DollarSign,
  Wallet,
  Download,
} from 'lucide-react';
import { DataExport, BackButton, PageContainer } from '@/components/common';
import { useAppStore } from '@/store';
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
  const addNotification = useAppStore((state) => state.addNotification);

  const [costData, setCostData] = useState<Account[]>([]);
  const [balanceData, setBalanceData] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [filterCenter, setFilterCenter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [selectedCost, setSelectedCost] = useState<Account | null>(null);

  useEffect(() => {
    loadCosts();
  }, []);

  const loadCosts = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const currentPeriod = new Date().toISOString().slice(0, 7);
      const [accountsRes, balancesRes] = await Promise.all([
        financeApi.account.list({
          category: 'cost',
          keyword: searchQuery || undefined,
        }),
        financeApi.account.getBalances({
          period: currentPeriod,
        }),
      ]);

      if (accountsRes.success && accountsRes.data) {
        setCostData(accountsRes.data.items || []);
      }
      if (balancesRes.success && balancesRes.data) {
        setBalanceData(balancesRes.data || []);
      }
    } catch (err: unknown) {
      apiLogger.error('加载成本数据失败:', err);
      setError('加载成本数据失败');
      addNotification({
        title: '错误',
        message: '加载成本数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

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
        title: '成本科目数',
        value: costData.length,
        icon: <Wallet size={24} />,
        color: 'primary' as const,
      },
      {
        title: '实际总成本',
        value: `¥${totalActual.toLocaleString()}`,
        icon: <DollarSign size={24} />,
        color: 'secondary' as const,
      },
      {
        title: '本期借方发生',
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
      title: '导出成功',
      message: '成本数据已导出',
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
        label: '科目编码',
        render: (row: Account) => (
          <MuiBox sx={{ fontWeight: 600, color: 'primary.main' }}>{row.code}</MuiBox>
        ),
      },
      {
        id: 'name',
        label: '成本项目',
        render: (row: Account) => <MuiBox sx={{ fontWeight: 500 }}>{row.name}</MuiBox>,
      },
      {
        id: 'balance',
        label: '借方余额',
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
        label: '本期借方发生',
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
        label: '本期贷方发生',
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
        label: '状态',
        render: (row: Account) => {
          const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
            active: 'success',
            disabled: 'error',
          };
          const statusLabels: Record<string, string> = {
            active: '启用',
            disabled: '停用',
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
        label: '成本分析',
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
        label: '状态',
        type: 'select' as const,
        options: [
          { value: 'active', label: '启用' },
          { value: 'disabled', label: '停用' },
        ],
        value: filterCenter,
        onChange: setFilterCenter,
      },
    ],
    [filterCenter]
  );

  const exportFields = useMemo(
    () => [
      { key: 'code', title: '科目编码' },
      { key: 'name', title: '成本项目' },
      { key: 'category', title: '科目类别' },
      { key: 'balance_direction', title: '余额方向' },
      { key: 'level', title: '层级' },
      { key: 'status', title: '状态' },
    ],
    []
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title='成本管理'
      subtitle='管理成本核算和成本分析'
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
              <BackButton href='/finance/dashboard' />
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
                defaultFileName='成本数据'
                buttonText='数据导出'
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
          searchPlaceholder='搜索成本中心、项目...'
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
          onRefresh={loadCosts}
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
