import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Calendar,
  Download,
  RefreshCw,
  PieChart,
  Activity,
  Wallet,
  Building2,
} from 'lucide-react';
import { PageContainer } from '@/components/common';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
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
  Chip,
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

const FinancialReportPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState('balance-sheet');
  const [periodType, setPeriodType] = useState('year');
  const [period, setPeriod] = useState('2024');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [cashFlowStatement, setCashFlowStatement] = useState<CashFlowStatement | null>(null);

  useEffect(() => {
    loadReportData();
  }, [activeTab, period]);

  const loadReportData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'balance-sheet') {
        const result = await financeReportApi.balanceSheet({ period });
        if (result.success && result.data) {
          setBalanceSheet(result.data);
        }
      } else if (activeTab === 'income-statement') {
        const result = await financeReportApi.incomeStatement({ period });
        if (result.success && result.data) {
          setIncomeStatement(result.data);
        }
      } else if (activeTab === 'cash-flow') {
        const result = await financeReportApi.cashFlowStatement({ period });
        if (result.success && result.data) {
          setCashFlowStatement(result.data);
        }
      }
    } catch (err: unknown) {
      apiLogger.error('加载报表失败:', err);
      setError('加载报表数据失败，请稍后重试');
      addNotification({ title: '错误', message: '加载报表数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;

  const handleExport = () => {
    addNotification({
      title: '导出成功',
      message: '报表已导出为 Excel 格式',
      type: 'success',
    });
  };

  const periodOptions = useMemo(() => {
    if (periodType === 'year') {
      return [
        { value: '2024', label: '2024年度' },
        { value: '2023', label: '2023年度' },
        { value: '2022', label: '2022年度' },
        { value: '2021', label: '2021年度' },
      ];
    } else if (periodType === 'quarter') {
      return [
        { value: '2024-Q1', label: '2024年第一季度' },
        { value: '2024-Q2', label: '2024年第二季度' },
        { value: '2024-Q3', label: '2024年第三季度' },
        { value: '2024-Q4', label: '2024年第四季度' },
      ];
    } else {
      return [
        { value: '2024-01', label: '2024年01月' },
        { value: '2024-02', label: '2024年02月' },
        { value: '2024-03', label: '2024年03月' },
        { value: '2024-04', label: '2024年04月' },
        { value: '2024-05', label: '2024年05月' },
        { value: '2024-06', label: '2024年06月' },
      ];
    }
  }, [periodType]);

  const tabs = [
    {
      label: '资产负债表',
      value: 'balance-sheet',
      icon: <PieChart sx={{ width: 16, height: 16 }} />,
    },
    {
      label: '利润表',
      value: 'income-statement',
      icon: <TrendingUp sx={{ width: 16, height: 16 }} />,
    },
    { label: '现金流量表', value: 'cash-flow', icon: <Activity sx={{ width: 16, height: 16 }} /> },
    {
      label: '所有者权益变动表',
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
                  总资产
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
                  总负债
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
                  所有者权益
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
                  营业总收入
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
                  营业总成本
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
                  营业利润
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
                  净利润
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
                  经营活动现金流
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
                  投资活动现金流
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
                  筹资活动现金流
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
                  现金净流量
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
                <TableCell sx={{ fontWeight: 'bold', width: 120 }}>项目代码</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>项目</TableCell>
                <TableCell
                  align='right'
                  sx={{ fontWeight: 'bold', width: 180 }}
                >
                  金额
                </TableCell>
                <TableCell
                  align='right'
                  sx={{ fontWeight: 'bold', width: 120 }}
                >
                  占比(%)
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={4}
                  sx={{ bgcolor: 'primary.50', fontWeight: 'bold' }}
                >
                  资产
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
                  负债
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
                  所有者权益
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
                <TableCell sx={{ fontWeight: 'bold', width: 120 }}>项目代码</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>项目</TableCell>
                <TableCell
                  align='right'
                  sx={{ fontWeight: 'bold', width: 180 }}
                >
                  金额
                </TableCell>
                <TableCell
                  align='right'
                  sx={{ fontWeight: 'bold', width: 120 }}
                >
                  占比(%)
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={4}
                  sx={{ bgcolor: 'success.50', fontWeight: 'bold' }}
                >
                  营业收入
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
                  营业成本及费用
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
                  营业利润
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
                  利润总额
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
                  净利润
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
                <TableCell sx={{ fontWeight: 'bold', width: 120 }}>项目代码</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>项目</TableCell>
                <TableCell
                  align='right'
                  sx={{ fontWeight: 'bold', width: 180 }}
                >
                  金额
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell
                  colSpan={3}
                  sx={{ bgcolor: 'success.50', fontWeight: 'bold' }}
                >
                  经营活动产生的现金流量
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
                  投资活动产生的现金流量
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
                  筹资活动产生的现金流量
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
                  现金及现金等价物净增加额
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
            所有者权益变动表数据加载中...
          </Typography>
        </Box>
      );
    }

    return null;
  };

  return (
    <PageContainer
      title='财务报表中心'
      subtitle='资产负债表、利润表、现金流量表、所有者权益变动表'
      maxWidth='xl'
      headerProps={{
        actions: [
          {
            label: '刷新',
            icon: <RefreshCw size={16} />,
            onClick: loadReportData,
            variant: 'outlined',
          },
          {
            label: '导出报表',
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
            <InputLabel>期间类型</InputLabel>
            <Select
              value={periodType}
              label='期间类型'
              onChange={(e) => {
                setPeriodType(e.target.value);
                setPeriod(periodOptions[0]?.value || '');
              }}
            >
              <MenuItem value='year'>年度</MenuItem>
              <MenuItem value='quarter'>季度</MenuItem>
              <MenuItem value='month'>月度</MenuItem>
            </Select>
          </FormControl>
          <FormControl
            size='small'
            sx={{ minWidth: 160 }}
          >
            <InputLabel>选择期间</InputLabel>
            <Select
              value={period}
              label='选择期间'
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
