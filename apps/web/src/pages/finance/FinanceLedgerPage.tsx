import React, { useState, useMemo } from 'react';
import {
  FileText,
  ChevronLeft,
  Eye,
  Calculator,
  TrendingUp,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ListPageTemplate, StatCardGroup } from '@/components/mui';
import { DataExport } from '@/components/common';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Box,
  Typography,
  Stack,
  IconButton,
} from '@mui/material';
import { Button } from '@/components/ui/Button';

interface LedgerEntry {
  id: string;
  account_code: string;
  account_name: string;
  category: string;
  opening_balance: number;
  debit_amount: number;
  credit_amount: number;
  closing_balance: number;
}

const mockLedgerData: LedgerEntry[] = [
  {
    id: '1',
    account_code: '1001',
    account_name: '库存现金',
    category: '资产类',
    opening_balance: 5000,
    debit_amount: 8000,
    credit_amount: 6000,
    closing_balance: 7000,
  },
  {
    id: '2',
    account_code: '1002',
    account_name: '银行存款',
    category: '资产类',
    opening_balance: 500000,
    debit_amount: 300000,
    credit_amount: 200000,
    closing_balance: 600000,
  },
  {
    id: '3',
    account_code: '1122',
    account_name: '应收账款',
    category: '资产类',
    opening_balance: 80000,
    debit_amount: 50000,
    credit_amount: 30000,
    closing_balance: 100000,
  },
  {
    id: '4',
    account_code: '1405',
    account_name: '原材料',
    category: '资产类',
    opening_balance: 200000,
    debit_amount: 100000,
    credit_amount: 80000,
    closing_balance: 220000,
  },
  {
    id: '5',
    account_code: '1601',
    account_name: '固定资产',
    category: '资产类',
    opening_balance: 1000000,
    debit_amount: 0,
    credit_amount: 50000,
    closing_balance: 950000,
  },
  {
    id: '6',
    account_code: '2001',
    account_name: '短期借款',
    category: '负债类',
    opening_balance: 200000,
    debit_amount: 100000,
    credit_amount: 150000,
    closing_balance: 250000,
  },
  {
    id: '7',
    account_code: '2201',
    account_name: '应付票据',
    category: '负债类',
    opening_balance: 50000,
    debit_amount: 20000,
    credit_amount: 30000,
    closing_balance: 60000,
  },
  {
    id: '8',
    account_code: '4001',
    account_name: '实收资本',
    category: '权益类',
    opening_balance: 800000,
    debit_amount: 0,
    credit_amount: 0,
    closing_balance: 800000,
  },
  {
    id: '9',
    account_code: '5001',
    account_name: '主营业务收入',
    category: '损益类',
    opening_balance: 0,
    debit_amount: 0,
    credit_amount: 500000,
    closing_balance: 500000,
  },
  {
    id: '10',
    account_code: '6401',
    account_name: '主营业务成本',
    category: '损益类',
    opening_balance: 0,
    debit_amount: 300000,
    credit_amount: 10000,
    closing_balance: 290000,
  },
];

const FinanceLedgerPage: React.FC = () => {
  const navigate = useNavigate();

  const [ledgerData] = useState<LedgerEntry[]>(mockLedgerData);
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  const filteredData = useMemo(() => {
    return ledgerData.filter((entry) => {
      if (filterCategory && entry.category !== filterCategory) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !entry.account_code.toLowerCase().includes(query) &&
          !entry.account_name.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [ledgerData, filterCategory, searchQuery]);

  // 统计卡片数据
  const statCards = useMemo(() => {
    const totalAccounts = ledgerData.length;
    const totalOpeningBalance = ledgerData.reduce((sum, entry) => sum + entry.opening_balance, 0);
    const totalDebitAmount = ledgerData.reduce((sum, entry) => sum + entry.debit_amount, 0);
    const totalCreditAmount = ledgerData.reduce((sum, entry) => sum + entry.credit_amount, 0);
    const totalClosingBalance = ledgerData.reduce((sum, entry) => sum + entry.closing_balance, 0);

    return [
      {
        title: '科目总数',
        value: totalAccounts,
        icon: <Calculator size={24} />,
        color: 'primary' as const,
      },
      {
        title: '总期初余额',
        value: `¥${totalOpeningBalance.toLocaleString()}`,
        icon: <Wallet size={24} />,
        color: 'secondary' as const,
      },
      {
        title: '总借方发生额',
        value: `¥${totalDebitAmount.toLocaleString()}`,
        icon: <TrendingUp size={24} />,
        color: 'error' as const,
      },
      {
        title: '总贷方发生额',
        value: `¥${totalCreditAmount.toLocaleString()}`,
        icon: <TrendingDown size={24} />,
        color: 'success' as const,
      },
      {
        title: '总期末余额',
        value: `¥${totalClosingBalance.toLocaleString()}`,
        icon: <FileText size={24} />,
        color: 'info' as const,
      },
    ];
  }, [ledgerData]);

  const handleViewDetail = (entry: LedgerEntry) => {
    setSelectedEntry(entry);
    setShowDetailModal(true);
  };

  const columns = useMemo(
    () => [
      {
        id: 'account_code',
        label: '科目编码',
        render: (row: LedgerEntry) => (
          <Box sx={{ fontWeight: 600, color: 'success.main' }}>{row.account_code}</Box>
        ),
      },
      {
        id: 'account_name',
        label: '科目名称',
        render: (row: LedgerEntry) => <Box sx={{ fontWeight: 500 }}>{row.account_name}</Box>,
      },
      {
        id: 'category',
        label: '科目类别',
        render: (row: LedgerEntry) => (
          <Chip
            label={row.category}
            size='small'
            color='success'
          />
        ),
      },
      {
        id: 'opening_balance',
        label: '期初余额',
        render: (row: LedgerEntry) => (
          <Box sx={{ fontFamily: 'monospace' }}>¥{row.opening_balance.toLocaleString()}</Box>
        ),
      },
      {
        id: 'debit_amount',
        label: '借方发生额',
        render: (row: LedgerEntry) => (
          <Box sx={{ color: 'error.main', fontFamily: 'monospace' }}>
            ¥{row.debit_amount.toLocaleString()}
          </Box>
        ),
      },
      {
        id: 'credit_amount',
        label: '贷方发生额',
        render: (row: LedgerEntry) => (
          <Box sx={{ color: 'success.main', fontFamily: 'monospace' }}>
            ¥{row.credit_amount.toLocaleString()}
          </Box>
        ),
      },
      {
        id: 'closing_balance',
        label: '期末余额',
        render: (row: LedgerEntry) => (
          <Box
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              fontFamily: 'monospace',
            }}
          >
            ¥{row.closing_balance.toLocaleString()}
          </Box>
        ),
      },
    ],
    []
  );

  const rowActions = useMemo(
    () => [
      {
        label: '查看明细账',
        icon: <Eye sx={{ width: 16, height: 16 }} />,
        onClick: (row: LedgerEntry) => handleViewDetail(row),
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
        onChange: setFilterPeriod,
      },
      {
        id: 'category',
        label: '科目类别',
        type: 'select' as const,
        options: [
          { value: '', label: '全部类别' },
          { value: '资产类', label: '资产类' },
          { value: '负债类', label: '负债类' },
          { value: '权益类', label: '权益类' },
          { value: '损益类', label: '损益类' },
          { value: '成本类', label: '成本类' },
        ],
        value: filterCategory,
        onChange: setFilterCategory,
      },
    ],
    [filterPeriod, filterCategory]
  );

  const exportFields = useMemo(
    () => [
      { key: 'account_code', title: '科目编码' },
      { key: 'account_name', title: '科目名称' },
      { key: 'category', title: '类别' },
      { key: 'opening_balance', title: '期初余额' },
      { key: 'debit_amount', title: '借方发生额' },
      { key: 'credit_amount', title: '贷方发生额' },
      { key: 'closing_balance', title: '期末余额' },
    ],
    []
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
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
              <IconButton onClick={() => navigate('/dashboard')}>
                <ChevronLeft sx={{ width: 20, height: 20 }} />
              </IconButton>
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
        {/* 统计卡片 */}
        <StatCardGroup
          stats={statCards}
          columns={5}
        />

        <ListPageTemplate
          columns={columns}
          data={filteredData}
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
        />
      </Box>

      {/* Detail Modal */}
      <Dialog
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>明细账 - {selectedEntry?.account_name}</DialogTitle>
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
                    {selectedEntry.account_code}
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
                    {selectedEntry.account_name}
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
                    label={selectedEntry.category}
                    size='small'
                    color='success'
                  />
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    期初余额
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'primary.main' }}
                  >
                    ¥{selectedEntry.opening_balance.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    借方发生额
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'error.main' }}
                  >
                    ¥{selectedEntry.debit_amount.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    贷方发生额
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'success.main' }}
                  >
                    ¥{selectedEntry.credit_amount.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    期末余额
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700, color: 'primary.main' }}
                  >
                    ¥{selectedEntry.closing_balance.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinanceLedgerPage;
