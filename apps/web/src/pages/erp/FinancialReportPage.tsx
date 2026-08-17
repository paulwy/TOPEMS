import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Download,
  RefreshCw,
  PieChart,
  Activity,
  Wallet,
  Building2,
} from 'lucide-react';
import i18n from '@/i18n';
import { PageContainer } from '@/components/common';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import { financeReportApi } from '@/api/erp';
import type {
  BalanceSheet,
  IncomeStatement,
  CashFlowStatement,
  BalanceItem,
  IncomeItem,
  CashFlowItem,
} from '@/api/erp/types';
import { apiLogger } from '@/utils/logger';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS } from '@/lib/reactQuery';

const FinancialReportPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('balance-sheet');
  const [periodType, setPeriodType] = useState('year');
  const [period, setPeriod] = useState('2024');
  const balanceSheetQuery = useQuery<BalanceSheet | null>({
    queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.BALANCE_SHEET(period),
    queryFn: async () => {
      const res = await financeReportApi.balanceSheet({ period });
      return res.success && res.data ? res.data : null;
    },
    enabled: activeTab === 'balance-sheet',
    staleTime: 5 * 60 * 1000,
  });
  const incomeStatementQuery = useQuery<IncomeStatement | null>({
    queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.INCOME_STATEMENT(period),
    queryFn: async () => {
      const res = await financeReportApi.incomeStatement({ period });
      return res.success && res.data ? res.data : null;
    },
    enabled: activeTab === 'income-statement',
    staleTime: 5 * 60 * 1000,
  });
  const cashFlowQuery = useQuery<CashFlowStatement | null>({
    queryKey: QUERY_KEYS.ERP.FINANCIAL_REPORTS.CASH_FLOW(period),
    queryFn: async () => {
      const res = await financeReportApi.cashFlowStatement({ period });
      return res.success && res.data ? res.data : null;
    },
    enabled: activeTab === 'cash-flow',
    staleTime: 5 * 60 * 1000,
  });
  const balanceSheet = balanceSheetQuery.data ?? null;
  const incomeStatement = incomeStatementQuery.data ?? null;
  const cashFlowStatement = cashFlowQuery.data ?? null;
  const loading =
    (activeTab === 'balance-sheet' && balanceSheetQuery.isLoading) ||
    (activeTab === 'income-statement' && incomeStatementQuery.isLoading) ||
    (activeTab === 'cash-flow' && cashFlowQuery.isLoading);
  const error =
    (activeTab === 'balance-sheet' && balanceSheetQuery.isError) ||
    (activeTab === 'income-statement' && incomeStatementQuery.isError) ||
    (activeTab === 'cash-flow' && cashFlowQuery.isError)
      ? i18n.t('erp.financial_report_page.k0')
      : null;
  useEffect(() => {
    if (balanceSheetQuery.isError) {
      apiLogger.error(i18n.t('pages.financial_report_page.k0'), balanceSheetQuery.error);
      addNotification({
        title: i18n.t('erp.financial_report_page.k2'),
        message: i18n.t('erp.financial_report_page.k1'),
        type: 'error',
      });
    }
  }, [balanceSheetQuery.isError, balanceSheetQuery.error, addNotification]);
  useEffect(() => {
    if (incomeStatementQuery.isError) {
      apiLogger.error(i18n.t('pages.financial_report_page.k1'), incomeStatementQuery.error);
      addNotification({
        title: i18n.t('erp.financial_report_page.k4'),
        message: i18n.t('erp.financial_report_page.k3'),
        type: 'error',
      });
    }
  }, [incomeStatementQuery.isError, incomeStatementQuery.error, addNotification]);
  useEffect(() => {
    if (cashFlowQuery.isError) {
      apiLogger.error(i18n.t('pages.financial_report_page.k2'), cashFlowQuery.error);
      addNotification({
        title: i18n.t('erp.financial_report_page.k6'),
        message: i18n.t('erp.financial_report_page.k5'),
        type: 'error',
      });
    }
  }, [cashFlowQuery.isError, cashFlowQuery.error, addNotification]);
  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.ERP_FINANCIAL_REPORTS_BASE,
      exact: false,
      refetchType: 'active',
    });
  };
  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  const handleExport = () => {
    addNotification({
      title: i18n.t('erp.financial_report_page.k7'),
      message: i18n.t('erp.financial_report_page.excel_8'),
      type: 'success',
    });
  };
  const periodOptions = useMemo(() => {
    if (periodType === 'year') {
      return [
        { value: '2024', label: i18n.t('pages.financial_report_page.2024_3') },
        { value: '2023', label: i18n.t('pages.financial_report_page.2023_4') },
        { value: '2022', label: i18n.t('pages.financial_report_page.2022_5') },
        { value: '2021', label: i18n.t('pages.financial_report_page.2021_6') },
      ];
    } else if (periodType === 'quarter') {
      return [
        { value: '2024-Q1', label: i18n.t('pages.financial_report_page.2024_7') },
        { value: '2024-Q2', label: i18n.t('pages.financial_report_page.2024_8') },
        { value: '2024-Q3', label: i18n.t('pages.financial_report_page.2024_9') },
        { value: '2024-Q4', label: i18n.t('pages.financial_report_page.2024_10') },
      ];
    } else {
      return [
        { value: '2024-01', label: i18n.t('pages.financial_report_page.202401_11') },
        { value: '2024-02', label: i18n.t('pages.financial_report_page.202402_12') },
        { value: '2024-03', label: i18n.t('pages.financial_report_page.202403_13') },
        { value: '2024-04', label: i18n.t('pages.financial_report_page.202404_14') },
        { value: '2024-05', label: i18n.t('pages.financial_report_page.202405_15') },
        { value: '2024-06', label: i18n.t('pages.financial_report_page.202406_16') },
      ];
    }
  }, [periodType]);
  const tabs = [
    {
      label: i18n.t('erp.financial_report_page.k9'),
      value: 'balance-sheet',
      icon: <PieChart sx={{ width: 16, height: 16 }} />,
    },
    {
      label: i18n.t('erp.financial_report_page.k10'),
      value: 'income-statement',
      icon: <TrendingUp sx={{ width: 16, height: 16 }} />,
    },
    {
      label: i18n.t('erp.financial_report_page.k11'),
      value: 'cash-flow',
      icon: <Activity sx={{ width: 16, height: 16 }} />,
    },
    {
      label: i18n.t('erp.financial_report_page.k12'),
      value: 'equity-change',
      icon: <Building2 sx={{ width: 16, height: 16 }} />,
    },
  ];
  const renderSummaryCards = () => {
    if (activeTab === 'balance-sheet' && balanceSheet) {
      return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 1, md: 3 }, gap: 2, mb: 3 }}>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'primary.100' }}>
                <DollarSign sx={{ width: 24, height: 24, color: 'primary.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.financial_report_page.k0')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold' }}
                >
                  {formatCurrency(balanceSheet.total_assets)}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'warning.100' }}>
                <TrendingDown sx={{ width: 24, height: 24, color: 'warning.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.financial_report_page.k1')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold' }}
                >
                  {formatCurrency(balanceSheet.total_liabilities)}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'success.100' }}>
                <Wallet sx={{ width: 24, height: 24, color: 'success.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.financial_report_page.k2')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold' }}
                >
                  {formatCurrency(balanceSheet.total_equity)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      );
    }
    if (activeTab === 'income-statement' && incomeStatement) {
      return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 1, md: 4 }, gap: 2, mb: 3 }}>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'success.100' }}>
                <TrendingUp sx={{ width: 24, height: 24, color: 'success.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.financial_report_page.k3')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold' }}
                >
                  {formatCurrency(incomeStatement.revenues.reduce((sum, r) => sum + r.amount, 0))}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'error.100' }}>
                <TrendingDown sx={{ width: 24, height: 24, color: 'error.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.financial_report_page.k4')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold' }}
                >
                  {formatCurrency(incomeStatement.expenses.reduce((sum, e) => sum + e.amount, 0))}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'primary.100' }}>
                <BarChart3 sx={{ width: 24, height: 24, color: 'primary.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.financial_report_page.k5')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold' }}
                >
                  {formatCurrency(incomeStatement.operating_profit)}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: incomeStatement.net_profit >= 0 ? 'success.100' : 'error.100',
                }}
              >
                <DollarSign
                  sx={{
                    width: 24,
                    height: 24,
                    color: incomeStatement.net_profit >= 0 ? 'success.main' : 'error.main',
                  }}
                />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.financial_report_page.k6')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{
                    fontWeight: 'bold',
                    color: incomeStatement.net_profit >= 0 ? 'success.main' : 'error.main',
                  }}
                >
                  {formatCurrency(incomeStatement.net_profit)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      );
    }
    if (activeTab === 'cash-flow' && cashFlowStatement) {
      return (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 1, md: 4 }, gap: 2, mb: 3 }}>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'success.100' }}>
                <Activity sx={{ width: 24, height: 24, color: 'success.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.financial_report_page.k7')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold' }}
                >
                  {formatCurrency(
                    cashFlowStatement.operating_activities.reduce((sum, i) => sum + i.amount, 0)
                  )}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'warning.100' }}>
                <Building2 sx={{ width: 24, height: 24, color: 'warning.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.financial_report_page.k8')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold' }}
                >
                  {formatCurrency(
                    cashFlowStatement.investing_activities.reduce((sum, i) => sum + i.amount, 0)
                  )}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: 'primary.100' }}>
                <DollarSign sx={{ width: 24, height: 24, color: 'primary.main' }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.financial_report_page.k9')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 'bold' }}
                >
                  {formatCurrency(
                    cashFlowStatement.financing_activities.reduce((sum, i) => sum + i.amount, 0)
                  )}
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 3, boxShadow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: cashFlowStatement.net_cash_flow >= 0 ? 'success.100' : 'error.100',
                }}
              >
                <Wallet
                  sx={{
                    width: 24,
                    height: 24,
                    color: cashFlowStatement.net_cash_flow >= 0 ? 'success.main' : 'error.main',
                  }}
                />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {i18n.t('pages.financial_report_page.k10')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{
                    fontWeight: 'bold',
                    color: cashFlowStatement.net_cash_flow >= 0 ? 'success.main' : 'error.main',
                  }}
                >
                  {formatCurrency(cashFlowStatement.net_cash_flow)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      );
    }
    return null;
  };
  const renderReportTable = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      );
    }
    if (activeTab === 'balance-sheet' && balanceSheet) {
      return (
        <TableContainer
          component={Paper}
          sx={{ boxShadow: 1 }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 'bold', width: 120 }}>
                  {i18n.t('erp.financial_report_page.k13')}
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  {i18n.t('erp.financial_report_page.k14')}
                </TableCell>
                <TableCell
                  align='right'
                  sx={{ fontWeight: 'bold', width: 180 }}
                >
                  {i18n.t('pages.financial_report_page.k11')}
                </TableCell>
                <TableCell
                  align='right'
                  sx={{ fontWeight: 'bold', width: 120 }}
                >
                  {i18n.t('pages.financial_report_page.k12')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={4}
                  sx={{ bgcolor: 'primary.50', fontWeight: 'bold' }}
                >
                  {i18n.t('pages.financial_report_page.k13')}
                </TableCell>
              </TableRow>
              {balanceSheet.assets.map((item: BalanceItem) => (
                <TableRow
                  key={`asset-${item.code}`}
                  hover
                >
                  <TableCell sx={{ pl: 4 }}>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell align='right'>{formatCurrency(item.amount)}</TableCell>
                  <TableCell align='right'>{item.percentage.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell
                  colSpan={4}
                  sx={{ bgcolor: 'warning.50', fontWeight: 'bold' }}
                >
                  {i18n.t('pages.financial_report_page.k14')}
                </TableCell>
              </TableRow>
              {balanceSheet.liabilities.map((item: BalanceItem) => (
                <TableRow
                  key={`liability-${item.code}`}
                  hover
                >
                  <TableCell sx={{ pl: 4 }}>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell align='right'>{formatCurrency(item.amount)}</TableCell>
                  <TableCell align='right'>{item.percentage.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell
                  colSpan={4}
                  sx={{ bgcolor: 'success.50', fontWeight: 'bold' }}
                >
                  {i18n.t('pages.financial_report_page.k15')}
                </TableCell>
              </TableRow>
              {balanceSheet.equity.map((item: BalanceItem) => (
                <TableRow
                  key={`equity-${item.code}`}
                  hover
                >
                  <TableCell sx={{ pl: 4 }}>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell align='right'>{formatCurrency(item.amount)}</TableCell>
                  <TableCell align='right'>{item.percentage.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }
    if (activeTab === 'income-statement' && incomeStatement) {
      return (
        <TableContainer
          component={Paper}
          sx={{ boxShadow: 1 }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 'bold', width: 120 }}>
                  {i18n.t('erp.financial_report_page.k15')}
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  {i18n.t('erp.financial_report_page.k16')}
                </TableCell>
                <TableCell
                  align='right'
                  sx={{ fontWeight: 'bold', width: 180 }}
                >
                  {i18n.t('pages.financial_report_page.k16')}
                </TableCell>
                <TableCell
                  align='right'
                  sx={{ fontWeight: 'bold', width: 120 }}
                >
                  {i18n.t('pages.financial_report_page.k17')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={4}
                  sx={{ bgcolor: 'success.50', fontWeight: 'bold' }}
                >
                  {i18n.t('pages.financial_report_page.k18')}
                </TableCell>
              </TableRow>
              {incomeStatement.revenues.map((item: IncomeItem) => (
                <TableRow
                  key={`revenue-${item.code}`}
                  hover
                >
                  <TableCell sx={{ pl: 4 }}>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell
                    align='right'
                    sx={{ color: 'success.main' }}
                  >
                    {formatCurrency(item.amount)}
                  </TableCell>
                  <TableCell align='right'>{item.percentage.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell
                  colSpan={4}
                  sx={{ bgcolor: 'error.50', fontWeight: 'bold' }}
                >
                  {i18n.t('pages.financial_report_page.k19')}
                </TableCell>
              </TableRow>
              {incomeStatement.expenses.map((item: IncomeItem) => (
                <TableRow
                  key={`expense-${item.code}`}
                  hover
                >
                  <TableCell sx={{ pl: 4 }}>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell
                    align='right'
                    sx={{ color: 'error.main' }}
                  >
                    {formatCurrency(item.amount)}
                  </TableCell>
                  <TableCell align='right'>{item.percentage.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell
                  colSpan={2}
                  sx={{ fontWeight: 'bold' }}
                >
                  {i18n.t('pages.financial_report_page.k20')}
                </TableCell>
                <TableCell
                  align='right'
                  sx={{ fontWeight: 'bold' }}
                >
                  {formatCurrency(incomeStatement.operating_profit)}
                </TableCell>
                <TableCell />
              </TableRow>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell
                  colSpan={2}
                  sx={{ fontWeight: 'bold' }}
                >
                  {i18n.t('pages.financial_report_page.k21')}
                </TableCell>
                <TableCell
                  align='right'
                  sx={{ fontWeight: 'bold' }}
                >
                  {formatCurrency(incomeStatement.gross_profit)}
                </TableCell>
                <TableCell />
              </TableRow>
              <TableRow sx={{ bgcolor: 'primary.50' }}>
                <TableCell
                  colSpan={2}
                  sx={{ fontWeight: 'bold' }}
                >
                  {i18n.t('pages.financial_report_page.k22')}
                </TableCell>
                <TableCell
                  align='right'
                  sx={{
                    fontWeight: 'bold',
                    color: incomeStatement.net_profit >= 0 ? 'success.main' : 'error.main',
                  }}
                >
                  {formatCurrency(incomeStatement.net_profit)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      );
    }
    if (activeTab === 'cash-flow' && cashFlowStatement) {
      return (
        <TableContainer
          component={Paper}
          sx={{ boxShadow: 1 }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 'bold', width: 120 }}>
                  {i18n.t('erp.financial_report_page.k17')}
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  {i18n.t('erp.financial_report_page.k18')}
                </TableCell>
                <TableCell
                  align='right'
                  sx={{ fontWeight: 'bold', width: 180 }}
                >
                  {i18n.t('pages.financial_report_page.k23')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={3}
                  sx={{ bgcolor: 'success.50', fontWeight: 'bold' }}
                >
                  {i18n.t('pages.financial_report_page.k24')}
                </TableCell>
              </TableRow>
              {cashFlowStatement.operating_activities.map((item: CashFlowItem) => (
                <TableRow
                  key={`op-${item.code}`}
                  hover
                >
                  <TableCell sx={{ pl: 4 }}>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell
                    align='right'
                    sx={{ color: item.amount >= 0 ? 'success.main' : 'error.main' }}
                  >
                    {formatCurrency(item.amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell
                  colSpan={3}
                  sx={{ bgcolor: 'warning.50', fontWeight: 'bold' }}
                >
                  {i18n.t('pages.financial_report_page.k25')}
                </TableCell>
              </TableRow>
              {cashFlowStatement.investing_activities.map((item: CashFlowItem) => (
                <TableRow
                  key={`inv-${item.code}`}
                  hover
                >
                  <TableCell sx={{ pl: 4 }}>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell
                    align='right'
                    sx={{ color: item.amount >= 0 ? 'success.main' : 'error.main' }}
                  >
                    {formatCurrency(item.amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell
                  colSpan={3}
                  sx={{ bgcolor: 'primary.50', fontWeight: 'bold' }}
                >
                  {i18n.t('pages.financial_report_page.k26')}
                </TableCell>
              </TableRow>
              {cashFlowStatement.financing_activities.map((item: CashFlowItem) => (
                <TableRow
                  key={`fin-${item.code}`}
                  hover
                >
                  <TableCell sx={{ pl: 4 }}>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell
                    align='right'
                    sx={{ color: item.amount >= 0 ? 'success.main' : 'error.main' }}
                  >
                    {formatCurrency(item.amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell
                  colSpan={2}
                  sx={{ fontWeight: 'bold' }}
                >
                  {i18n.t('pages.financial_report_page.k27')}
                </TableCell>
                <TableCell
                  align='right'
                  sx={{
                    fontWeight: 'bold',
                    color: cashFlowStatement.net_cash_flow >= 0 ? 'success.main' : 'error.main',
                  }}
                >
                  {formatCurrency(cashFlowStatement.net_cash_flow)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      );
    }
    if (activeTab === 'equity-change') {
      return (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <FileText sx={{ width: 48, height: 48, color: 'text.disabled', mx: 'auto', mb: 2 }} />
          <Typography
            variant='body1'
            sx={{ color: 'text.secondary' }}
          >
            {i18n.t('pages.financial_report_page.k28')}
          </Typography>
        </Box>
      );
    }
    return null;
  };
  return (
    <PageContainer
      title={i18n.t('erp.financial_report_page.k19')}
      subtitle={i18n.t('erp.financial_report_page.k20')}
      maxWidth='xl'
      headerProps={{
        actions: [
          {
            label: i18n.t('erp.financial_report_page.k21'),
            icon: <RefreshCw size={16} />,
            onClick: handleRefresh,
            variant: 'outlined',
          },
          {
            label: i18n.t('erp.financial_report_page.k22'),
            icon: <Download size={16} />,
            onClick: handleExport,
            variant: 'contained',
          },
        ],
      }}
    >
      {error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.value}
              value={tab.value}
              label={tab.label}
              icon={tab.icon}
              iconPosition='start'
            />
          ))}
        </Tabs>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl
            size='small'
            sx={{ minWidth: 120 }}
          >
            <InputLabel>{i18n.t('erp.financial_report_page.k23')}</InputLabel>
            <Select
              value={periodType}
              label={i18n.t('erp.financial_report_page.k24')}
              onChange={(e) => {
                setPeriodType(e.target.value);
                setPeriod(periodOptions[0]?.value || '');
              }}
            >
              <MenuItem value='year'>{i18n.t('erp.financial_report_page.k25')}</MenuItem>
              <MenuItem value='quarter'>{i18n.t('erp.financial_report_page.k26')}</MenuItem>
              <MenuItem value='month'>{i18n.t('erp.financial_report_page.k27')}</MenuItem>
            </Select>
          </FormControl>
          <FormControl
            size='small'
            sx={{ minWidth: 160 }}
          >
            <InputLabel>{i18n.t('erp.financial_report_page.k28')}</InputLabel>
            <Select
              value={period}
              label={i18n.t('erp.financial_report_page.k29')}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {periodOptions.map((opt) => (
                <MenuItem
                  key={opt.value}
                  value={opt.value}
                >
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>
      {renderSummaryCards()}
      {renderReportTable()}
    </PageContainer>
  );
};
export default FinancialReportPage;
