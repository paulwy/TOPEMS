import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Eye, Calculator, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { ListPageTemplate, StatCardGroup } from '@/components';
import { useAppStore } from '@/store';
import { DataExport, BackButton, PageContainer } from '@/components/common';
import { financeApi } from '@/api/finance';
import type { Account, AccountBalance } from '@/types/finance';
import type { AccountingSubject } from '@/api/erp';
import { apiLogger } from '@/utils/logger';

import { FINANCE_PATHS } from '@/modules/finance/config';
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
  const [ledgerData, setLedgerData] = useState<Account[]>([]);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Account | null>(null);

  useEffect(() => {
    loadLedger();
  }, []);

  const loadLedger = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [accountRes, periodRes] = await Promise.all([
        financeApi.account.list({
          keyword: searchQuery || undefined,
        }),
        financeApi.period.getCurrent(),
      ]);

      if (accountRes.success && accountRes.data) {
        setLedgerData(accountRes.data.items || []);
      }

      if (periodRes.success && periodRes.data) {
        const balancesRes = await financeApi.account.getBalances({
          period: periodRes.data.period,
        });
        if (balancesRes.success && balancesRes.data) {
          setAccountBalances(balancesRes.data);
        }
      }
    } catch (err: unknown) {
      apiLogger.error('加载总账数据失败:', err);
      setError('加载总账数据失败');
    } finally {
      setLoading(false);
    }
  };

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
      asset: '资产类',
      liability: '负债类',
      equity: '权益类',
      cost: '成本类',
      expense: '费用类',
      income: '收入类',
    };
    return labels[category || ''] || '其他';
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
        title: '科目总数',
        value: totalAccounts,
        icon: <Calculator size={24} />,
        color: 'primary' as const,
      },
      {
        title: '资产类科目',
        value: assetCount,
        icon: <Wallet size={24} />,
        color: 'secondary' as const,
      },
      {
        title: '负债类科目',
        value: liabilityCount,
        icon: <TrendingUp size={24} />,
        color: 'error' as const,
      },
      {
        title: '权益类科目',
        value: equityCount,
        icon: <TrendingDown size={24} />,
        color: 'success' as const,
      },
      {
        title: '损益类科目',
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
        label: '科目编码',
        render: (row: Account) => (
          <Box sx={{ fontWeight: 600, color: 'success.main' }}>{row.code}</Box>
        ),
      },
      {
        id: 'name',
        label: '科目名称',
        render: (row: Account) => <Box sx={{ fontWeight: 500 }}>{row.name}</Box>,
      },
      {
        id: 'category',
        label: '科目类别',
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
        label: '科目级别',
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
        label: '上级科目',
        render: (row: Account) => (
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{row.parent_code || '-'}</Box>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row: Account) => {
          const statusColors: Record<string, 'success' | 'error' | 'default'> = {
            active: 'success',
            disabled: 'error',
          };
          const statusLabels: Record<string, string> = {
            active: '启用',
            disabled: '禁用',
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
        label: '查看详情',
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
        label: '会计期间',
        type: 'select' as const,
        options: [
          { value: '', label: '全部期间' },
          { value: '2024-01', label: '2024年1月' },
          { value: '2024-02', label: '2024年2月' },
          { value: '2024-03', label: '2024年3月' },
          { value: '2024-04', label: '2024年4月' },
        ],
        value: filterPeriod,
        onChange: (value: unknown) => setFilterPeriod(value as string),
      },
      {
        id: 'category',
        label: '科目类别',
        type: 'select' as const,
        options: [
          { value: '', label: '全部类别' },
          { value: 'asset', label: '资产类' },
          { value: 'liability', label: '负债类' },
          { value: 'equity', label: '权益类' },
          { value: 'expense', label: '费用类' },
          { value: 'income', label: '收入类' },
          { value: 'cost', label: '成本类' },
        ],
        value: filterCategory,
        onChange: (value: unknown) => setFilterCategory(value as string),
      },
    ],
    [filterPeriod, filterCategory]
  );

  const exportFields = useMemo(
    () => [
      { key: 'code', title: '科目编码' },
      { key: 'name', title: '科目名称' },
      { key: 'category', title: '类别' },
      { key: 'level', title: '级别' },
      { key: 'parent_code', title: '上级科目' },
      { key: 'status', title: '状态' },
    ],
    []
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title='总账管理'
      subtitle='管理会计科目和总账数据'
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
                defaultFileName='总账数据'
                buttonText='导出'
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
          searchPlaceholder='搜索科目编码、名称...'
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
          onRefresh={loadLedger}
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
                    label={selectedEntry.category || '未分类'}
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
                    {selectedEntry.is_cash_flow ? '是' : '否'}
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
