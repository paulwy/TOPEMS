import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Button } from '@mui/material';

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  FileText,
  Calendar,
  Building2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Briefcase,
  PiggyBank,
} from 'lucide-react';
import { StatCardGroup } from '@/components/mui';
import { financeApi } from '@/api/finance';
import type {
  BalanceSheet,
  IncomeStatement,
  CashFlowStatement,
  ReportQueryParams,
} from '@/types/finance';
import { apiLogger } from '@/utils/logger';

const REPORT_TYPE_CONFIG = {
  balance_sheet: {
    name: '资产负债表',
    icon: Building2,
    color: 'blue.main',
    bgColor: 'blue.100',
  },
  income_statement: {
    name: '利润表',
    icon: TrendingUp,
    color: 'green.main',
    bgColor: 'green.100',
  },
  cash_flow: {
    name: '现金流量表',
    icon: DollarSign,
    color: 'purple.main',
    bgColor: 'purple.100',
  },
};

type ReportType = 'balance_sheet' | 'income_statement' | 'cash_flow';

type ReportData = BalanceSheet | IncomeStatement | CashFlowStatement | null;

type ColorType = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export default function FinancialReportsPage() {
  const navigate = useNavigate();

  const [companyId, setCompanyId] = useState('');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [reportType, setReportType] = useState<ReportType>('balance_sheet');

  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheet | null>(null);
  const [incomeStatementData, setIncomeStatementData] = useState<IncomeStatement | null>(null);
  const [cashFlowStatementData, setCashFlowStatementData] = useState<CashFlowStatement | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentReport: ReportData =
    reportType === 'balance_sheet'
      ? balanceSheetData
      : reportType === 'income_statement'
        ? incomeStatementData
        : cashFlowStatementData;

  const statCards = useMemo(() => {
    if (!currentReport) return [];

    const getColor = (condition: boolean): ColorType => (condition ? 'success' : 'error');

    if (reportType === 'balance_sheet') {
      const data = currentReport as BalanceSheet;
      return [
        {
          title: '总资产',
          value: formatCurrency(data?.assets?.total),
          icon: <Wallet size={24} />,
          color: 'primary' as ColorType,
        },
        {
          title: '总负债',
          value: formatCurrency(data?.liabilities?.total),
          icon: <Briefcase size={24} />,
          color: 'warning' as ColorType,
        },
        {
          title: '所有者权益',
          value: formatCurrency(data?.equity?.total),
          icon: <PiggyBank size={24} />,
          color: 'success' as ColorType,
        },
        {
          title: '流动资产',
          value: formatCurrency(data?.assets?.current?.total),
          icon: <DollarSign size={24} />,
          color: 'info' as ColorType,
        },
      ];
    } else if (reportType === 'income_statement') {
      const data = currentReport as IncomeStatement;
      return [
        {
          title: '营业收入',
          value: formatCurrency(data?.revenue?.total),
          icon: <TrendingUp size={24} />,
          color: 'success' as ColorType,
        },
        {
          title: '营业成本',
          value: formatCurrency(data?.cost_of_sales?.total),
          icon: <TrendingDown size={24} />,
          color: 'error' as ColorType,
        },
        {
          title: '毛利润',
          value: formatCurrency(data?.gross_profit),
          icon: <Wallet size={24} />,
          color: 'primary' as ColorType,
        },
        {
          title: '净利润',
          value: formatCurrency(data?.net_profit),
          icon: <PiggyBank size={24} />,
          color: getColor(data?.net_profit >= 0),
        },
      ];
    } else {
      const data = currentReport as CashFlowStatement;
      return [
        {
          title: '经营活动净流量',
          value: formatCurrency(data?.operating?.net_flow),
          icon: <TrendingUp size={24} />,
          color: getColor(data?.operating?.net_flow >= 0),
        },
        {
          title: '投资活动净流量',
          value: formatCurrency(data?.investing?.net_flow),
          icon: <Briefcase size={24} />,
          color: getColor(data?.investing?.net_flow >= 0),
        },
        {
          title: '筹资活动净流量',
          value: formatCurrency(data?.financing?.net_flow),
          icon: <DollarSign size={24} />,
          color: getColor(data?.financing?.net_flow >= 0),
        },
        {
          title: '现金净增加额',
          value: formatCurrency(data?.cash_equivalent_change),
          icon: <Wallet size={24} />,
          color: getColor(data?.cash_equivalent_change >= 0),
        },
      ];
    }
  }, [currentReport, reportType]);

  const loadReport = async () => {
    if (!companyId) return;

    setLoading(true);
    setError(null);

    const params: ReportQueryParams = {
      company_id: companyId,
      period,
    };

    try {
      switch (reportType) {
        case 'balance_sheet': {
          const response = await financeApi.report.getBalanceSheet(params);
          if (response.success && response.data) {
            setBalanceSheetData(response.data);
          } else {
            setError(response.error?.message || '获取资产负债表失败');
          }
          break;
        }
        case 'income_statement': {
          const response = await financeApi.report.getIncomeStatement(params);
          if (response.success && response.data) {
            setIncomeStatementData(response.data);
          } else {
            setError(response.error?.message || '获取利润表失败');
          }
          break;
        }
        case 'cash_flow': {
          const response = await financeApi.report.getCashFlowStatement(params);
          if (response.success && response.data) {
            setCashFlowStatementData(response.data);
          } else {
            setError(response.error?.message || '获取现金流量表失败');
          }
          break;
        }
      }
    } catch (err: unknown) {
      apiLogger.error('Load report failed:', err);
      setError('加载报表数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    if (!companyId) return;

    const params: ReportQueryParams = {
      company_id: companyId,
      period,
    };

    try {
      let blob: Blob;
      let fileName: string;

      switch (reportType) {
        case 'balance_sheet':
          blob = await financeApi.report.exportBalanceSheet(params);
          fileName = `balance_sheet_${period}.${format}`;
          break;
        case 'income_statement':
          blob = await financeApi.report.exportIncomeStatement(params);
          fileName = `income_statement_${period}.${format}`;
          break;
        case 'cash_flow':
          blob = await financeApi.report.exportCashFlowStatement(params);
          fileName = `cash_flow_${period}.${format}`;
          break;
        default:
          return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      apiLogger.error('Export report failed:', err);
      setError('导出报表失败，请稍后重试');
    }
  };

  const handleRefresh = () => {
    loadReport();
  };

  const typeConfig = REPORT_TYPE_CONFIG[reportType];

  const handleReportTypeChange = (newType: ReportType) => {
    setReportType(newType);
    setError(null);
  };

  return (
    <Box sx={{ mx: 'auto', py: 3, px: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
        }}
      >
        <Box>
          <Typography variant='h4' sx={{ fontWeight: 'bold' }}>
            财务报表
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            查看和生成资产负债表、利润表、现金流量表
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button variant='outlined' onClick={handleRefresh} disabled={loading}>
            <RefreshCw size={16} style={{ marginRight: 8 }} />
            刷新
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {(['balance_sheet', 'income_statement', 'cash_flow'] as ReportType[]).map((type) => (
              <Button
                key={type}
                variant={reportType === type ? 'contained' : 'outlined'}
                onClick={() => handleReportTypeChange(type)}
              >
                {REPORT_TYPE_CONFIG[type].name}
              </Button>
            ))}
          </Box>
        </Box>
      </Box>

      {currentReport && (
        <Box sx={{ mb: 3 }}>
          <StatCardGroup stats={statCards} columns={4} />
        </Box>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant='body2' sx={{ mb: 0.5 }}>
                公司
              </Typography>
              <TextField
                placeholder='输入公司ID'
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                size='small'
                fullWidth
              />
            </Box>
            <Box>
              <Typography variant='body2' sx={{ mb: 0.5 }}>
                会计期间
              </Typography>
              <TextField
                type='month'
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                size='small'
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
            <Button variant='contained' onClick={loadReport} disabled={!companyId || loading}>
              <RefreshCw size={16} style={{ marginRight: 8 }} />
              {loading ? '加载中...' : '生成报表'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Alert severity='error'>{error}</Alert>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 3 }}>
        <CardHeader
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: typeConfig.bgColor,
              }}
            >
              <typeConfig.icon size={20} />
            </Box>
            <Box>
              <Typography variant='h6' sx={{ fontWeight: 600 }}>
                {typeConfig.name}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {companyId ? `公司: ${companyId}` : '请选择公司'} | 期间: {period}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button variant='outlined' size='small' onClick={() => handleExport('xlsx')}>
              <Download size={16} style={{ marginRight: 8 }} />
              导出Excel
            </Button>
            <Button variant='outlined' size='small' onClick={() => handleExport('pdf')}>
              <Download size={16} style={{ marginRight: 8 }} />
              导出PDF
            </Button>
          </Box>
        </CardHeader>

        <CardContent>
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
              }}
            >
              <CircularProgress />
            </Box>
          ) : !currentReport ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
              }}
            >
              <FileText size={48} />
              <Typography color='text.secondary' sx={{ mt: 2 }}>
                暂无报表数据
              </Typography>
              <Typography variant='body2' color='text.disabled' sx={{ mt: 0.5 }}>
                请输入公司ID和期间后点击"生成报表"
              </Typography>
            </Box>
          ) : (
            <ReportContent reportType={reportType} data={currentReport} />
          )}
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
          gap: 3,
        }}
      >
        <Card
          sx={{
            cursor: 'pointer',
            '&:hover': { boxShadow: 6 },
            transition: 'box-shadow 0.2s',
          }}
          onClick={() => navigate('/finance/reports/comparison')}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                bgcolor: 'blue.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BarChart3 size={24} />
            </Box>
            <Box>
              <Typography variant='body1' sx={{ fontWeight: 500 }}>
                报表对比
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                多期间、多公司对比分析
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{
            cursor: 'pointer',
            '&:hover': { boxShadow: 6 },
            transition: 'box-shadow 0.2s',
          }}
          onClick={() => navigate('/finance/reports/trend')}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                bgcolor: 'green.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={24} />
            </Box>
            <Box>
              <Typography variant='body1' sx={{ fontWeight: 500 }}>
                趋势分析
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                报表项目趋势变化
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card
          sx={{
            cursor: 'pointer',
            '&:hover': { boxShadow: 6 },
            transition: 'box-shadow 0.2s',
          }}
          onClick={() => navigate('/finance/reports/consolidated')}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 3 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                bgcolor: 'purple.100',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={24} />
            </Box>
            <Box>
              <Typography variant='body1' sx={{ fontWeight: 500 }}>
                合并报表
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                多公司报表合并
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

function ReportContent({ reportType, data }: { reportType: string; data: any }) {
  if (reportType === 'balance_sheet') {
    return <BalanceSheetContent data={data} />;
  } else if (reportType === 'income_statement') {
    return <IncomeStatementContent data={data} />;
  } else {
    return <CashFlowContent data={data} />;
  }
}

function BalanceSheetContent({ data }: { data: BalanceSheet }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography
          variant='h6'
          sx={{
            fontWeight: 500,
            fontSize: '1.125rem',
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <ArrowUpRight size={20} color='primary.dark' />
          资产
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography component='span'>流动资产</Typography>
            <Typography component='span' sx={{ fontWeight: 500 }}>
              {formatCurrency(data?.assets?.current?.total)}
            </Typography>
          </Box>
          {data?.assets?.current?.items?.map((item) => (
            <Box
              key={item.account_code}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                py: 1,
                borderBottom: 1,
                borderColor: 'divider',
                pl: 2,
              }}
            >
              <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
                {item.account_name}
              </Typography>
              <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
                {formatCurrency(item.amount)}
              </Typography>
            </Box>
          ))}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography component='span' sx={{ fontWeight: 500 }}>
              非流动资产
            </Typography>
            <Typography component='span' sx={{ fontWeight: 500 }}>
              {formatCurrency(data?.assets?.non_current?.total)}
            </Typography>
          </Box>
          {data?.assets?.non_current?.items?.map((item) => (
            <Box
              key={item.account_code}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                py: 1,
                borderBottom: 1,
                borderColor: 'divider',
                pl: 2,
              }}
            >
              <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
                {item.account_name}
              </Typography>
              <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
                {formatCurrency(item.amount)}
              </Typography>
            </Box>
          ))}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              fontWeight: 700,
              fontSize: '1.125rem',
              bgcolor: 'grey.50',
              px: 2,
              borderRadius: 1,
            }}
          >
            <Typography component='span' sx={{ fontWeight: 700 }}>
              资产合计
            </Typography>
            <Typography component='span' sx={{ fontWeight: 700 }}>
              {formatCurrency(data?.assets?.total)}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box>
        <Typography
          variant='h6'
          sx={{
            fontWeight: 500,
            fontSize: '1.125rem',
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <ArrowDownRight size={20} color='error.dark' />
          负债
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography component='span'>流动负债</Typography>
            <Typography component='span' sx={{ fontWeight: 500 }}>
              {formatCurrency(data?.liabilities?.current?.total)}
            </Typography>
          </Box>
          {data?.liabilities?.current?.items?.map((item) => (
            <Box
              key={item.account_code}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                py: 1,
                borderBottom: 1,
                borderColor: 'divider',
                pl: 2,
              }}
            >
              <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
                {item.account_name}
              </Typography>
              <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
                {formatCurrency(item.amount)}
              </Typography>
            </Box>
          ))}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography component='span' sx={{ fontWeight: 500 }}>
              非流动负债
            </Typography>
            <Typography component='span' sx={{ fontWeight: 500 }}>
              {formatCurrency(data?.liabilities?.non_current?.total)}
            </Typography>
          </Box>
          {data?.liabilities?.non_current?.items?.map((item) => (
            <Box
              key={item.account_code}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                py: 1,
                borderBottom: 1,
                borderColor: 'divider',
                pl: 2,
              }}
            >
              <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
                {item.account_name}
              </Typography>
              <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
                {formatCurrency(item.amount)}
              </Typography>
            </Box>
          ))}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              fontWeight: 700,
              fontSize: '1.125rem',
              bgcolor: 'grey.50',
              px: 2,
              borderRadius: 1,
            }}
          >
            <Typography component='span' sx={{ fontWeight: 700 }}>
              负债合计
            </Typography>
            <Typography component='span' sx={{ fontWeight: 700 }}>
              {formatCurrency(data?.liabilities?.total)}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box>
        <Typography
          variant='h6'
          sx={{
            fontWeight: 500,
            fontSize: '1.125rem',
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <DollarSign size={20} color='success.dark' />
          所有者权益
        </Typography>
        {data?.equity?.paid_in?.items?.map((item) => (
          <Box
            key={item.account_code}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography component='span'>{item.account_name}</Typography>
            <Typography component='span'>{formatCurrency(item.amount)}</Typography>
          </Box>
        ))}
        {data?.equity?.reserves?.items?.map((item) => (
          <Box
            key={item.account_code}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography component='span'>{item.account_name}</Typography>
            <Typography component='span'>{formatCurrency(item.amount)}</Typography>
          </Box>
        ))}
        {data?.equity?.retained_earnings?.items?.map((item) => (
          <Box
            key={item.account_code}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography component='span'>{item.account_name}</Typography>
            <Typography component='span'>{formatCurrency(item.amount)}</Typography>
          </Box>
        ))}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 1,
            fontWeight: 700,
            fontSize: '1.125rem',
            bgcolor: 'grey.50',
            px: 2,
            borderRadius: 1,
          }}
        >
          <Typography component='span' sx={{ fontWeight: 700 }}>
            所有者权益合计
          </Typography>
          <Typography component='span' sx={{ fontWeight: 700 }}>
            {formatCurrency(data?.equity?.total)}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          p: 2,
          borderRadius: 1,
          bgcolor: data?.balance_check ? 'success.light' : 'error.light',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography component='span' sx={{ fontWeight: 500 }}>
            {data?.balance_check ? '✓ 资产负债表平衡' : '✗ 资产负债表不平衡'}
          </Typography>
          <Typography component='span' sx={{ fontFamily: 'monospace' }}>
            资产: {formatCurrency(data?.assets?.total)} = 负债+权益:{' '}
            {formatCurrency(data?.total_liabilities_equity)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function IncomeStatementContent({ data }: { data: IncomeStatement }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography component='span' sx={{ fontWeight: 500 }}>
            营业收入
          </Typography>
          <Typography component='span' sx={{ fontWeight: 500 }}>
            {formatCurrency(data?.revenue?.total)}
          </Typography>
        </Box>
        {data?.revenue?.main_revenue?.items?.map((item) => (
          <Box
            key={item.account_code}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              pl: 2,
            }}
          >
            <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
              {item.account_name}
            </Typography>
            <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
              {formatCurrency(item.amount)}
            </Typography>
          </Box>
        ))}
        {data?.revenue?.other_revenue?.items?.map((item) => (
          <Box
            key={item.account_code}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              pl: 2,
            }}
          >
            <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
              {item.account_name}
            </Typography>
            <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
              {formatCurrency(item.amount)}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography component='span' sx={{ fontWeight: 500 }}>
            营业成本
          </Typography>
          <Typography component='span' sx={{ fontWeight: 500, color: 'error.main' }}>
            -{formatCurrency(data?.cost_of_sales?.total)}
          </Typography>
        </Box>
        {data?.cost_of_sales?.main_cost?.items?.map((item) => (
          <Box
            key={item.account_code}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              pl: 2,
            }}
          >
            <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
              {item.account_name}
            </Typography>
            <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
              -{formatCurrency(item.amount)}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          py: 1.5,
          fontWeight: 700,
          fontSize: '1.125rem',
          bgcolor: 'blue.50',
          px: 2,
          borderRadius: 1,
        }}
      >
        <Typography component='span' sx={{ fontWeight: 700 }}>
          毛利润
        </Typography>
        <Typography
          component='span'
          sx={{
            fontWeight: 700,
            color: data?.gross_profit >= 0 ? 'success.main' : 'error.main',
          }}
        >
          {formatCurrency(data?.gross_profit)} ({data?.gross_margin?.toFixed(2)}%)
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography component='span' sx={{ fontWeight: 500 }}>
            期间费用
          </Typography>
          <Typography component='span' sx={{ fontWeight: 500, color: 'error.main' }}>
            -{formatCurrency(data?.operating_expenses?.total)}
          </Typography>
        </Box>
        {data?.operating_expenses?.selling_expense?.items?.map((item) => (
          <Box
            key={item.account_code}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              pl: 2,
            }}
          >
            <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
              {item.account_name}
            </Typography>
            <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
              {formatCurrency(item.amount)}
            </Typography>
          </Box>
        ))}
        {data?.operating_expenses?.administrative_expense?.items?.map((item) => (
          <Box
            key={item.account_code}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              pl: 2,
            }}
          >
            <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
              {item.account_name}
            </Typography>
            <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
              {formatCurrency(item.amount)}
            </Typography>
          </Box>
        ))}
        {data?.operating_expenses?.rd_expense?.items?.map((item) => (
          <Box
            key={item.account_code}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              pl: 2,
            }}
          >
            <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
              {item.account_name}
            </Typography>
            <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
              {formatCurrency(item.amount)}
            </Typography>
          </Box>
        ))}
        {data?.operating_expenses?.financial_expense?.items?.map((item) => (
          <Box
            key={item.account_code}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
              pl: 2,
            }}
          >
            <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
              {item.account_name}
            </Typography>
            <Typography component='span' variant='body2' sx={{ color: 'grey.600' }}>
              {formatCurrency(item.amount)}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          py: 1.5,
          fontWeight: 700,
          fontSize: '1.125rem',
          bgcolor: 'green.50',
          px: 2,
          borderRadius: 1,
        }}
      >
        <Typography component='span' sx={{ fontWeight: 700 }}>
          净利润
        </Typography>
        <Typography
          component='span'
          sx={{
            fontWeight: 700,
            color: data?.net_profit >= 0 ? 'success.main' : 'error.main',
          }}
        >
          {formatCurrency(data?.net_profit)} ({data?.net_margin?.toFixed(2)}%)
        </Typography>
      </Box>
    </Box>
  );
}

function CashFlowContent({ data }: { data: CashFlowStatement }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography
          variant='h6'
          sx={{
            fontWeight: 500,
            fontSize: '1.125rem',
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <TrendingUp size={20} color='success.dark' />
          经营活动现金流量
        </Typography>
        {data?.operating?.inflows?.items?.map((item) => (
          <Box
            key={item.description}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography component='span'>{item.description}</Typography>
            <Typography component='span' sx={{ color: 'success.main' }}>
              {formatCurrency(item.amount)}
            </Typography>
          </Box>
        ))}
        {data?.operating?.outflows?.items?.map((item) => (
          <Box
            key={item.description}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography component='span'>{item.description}</Typography>
            <Typography component='span' sx={{ color: 'error.main' }}>
              -{formatCurrency(item.amount)}
            </Typography>
          </Box>
        ))}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 1,
            fontWeight: 700,
            bgcolor: 'green.50',
            px: 2,
            borderRadius: 1,
          }}
        >
          <Typography component='span' sx={{ fontWeight: 700 }}>
            经营活动净流量
          </Typography>
          <Typography
            component='span'
            sx={{
              fontWeight: 700,
              color: data?.operating?.net_flow >= 0 ? 'success.main' : 'error.main',
            }}
          >
            {formatCurrency(data?.operating?.net_flow)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography
          variant='h6'
          sx={{
            fontWeight: 500,
            fontSize: '1.125rem',
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <TrendingDown size={20} color='primary.dark' />
          投资活动现金流量
        </Typography>
        {data?.investing?.inflows?.items?.map((item) => (
          <Box
            key={item.description}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography component='span'>{item.description}</Typography>
            <Typography component='span' sx={{ color: 'success.main' }}>
              {formatCurrency(item.amount)}
            </Typography>
          </Box>
        ))}
        {data?.investing?.outflows?.items?.map((item) => (
          <Box
            key={item.description}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography component='span'>{item.description}</Typography>
            <Typography component='span' sx={{ color: 'error.main' }}>
              -{formatCurrency(item.amount)}
            </Typography>
          </Box>
        ))}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 1,
            fontWeight: 700,
            bgcolor: 'blue.50',
            px: 2,
            borderRadius: 1,
          }}
        >
          <Typography component='span' sx={{ fontWeight: 700 }}>
            投资活动净流量
          </Typography>
          <Typography
            component='span'
            sx={{
              fontWeight: 700,
              color: data?.investing?.net_flow >= 0 ? 'success.main' : 'error.main',
            }}
          >
            {formatCurrency(data?.investing?.net_flow)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography
          variant='h6'
          sx={{
            fontWeight: 500,
            fontSize: '1.125rem',
            mb: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <DollarSign size={20} color='#9333ea' />
          筹资活动现金流量
        </Typography>
        {data?.financing?.inflows?.items?.map((item) => (
          <Box
            key={item.description}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography component='span'>{item.description}</Typography>
            <Typography component='span' sx={{ color: 'success.main' }}>
              {formatCurrency(item.amount)}
            </Typography>
          </Box>
        ))}
        {data?.financing?.outflows?.items?.map((item) => (
          <Box
            key={item.description}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography component='span'>{item.description}</Typography>
            <Typography component='span' sx={{ color: 'error.main' }}>
              -{formatCurrency(item.amount)}
            </Typography>
          </Box>
        ))}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 1,
            fontWeight: 700,
            bgcolor: 'purple.50',
            px: 2,
            borderRadius: 1,
          }}
        >
          <Typography component='span' sx={{ fontWeight: 700 }}>
            筹资活动净流量
          </Typography>
          <Typography
            component='span'
            sx={{
              fontWeight: 700,
              color: data?.financing?.net_flow >= 0 ? 'success.main' : 'error.main',
            }}
          >
            {formatCurrency(data?.financing?.net_flow)}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          py: 1.5,
          fontWeight: 700,
          fontSize: '1.125rem',
          bgcolor: 'grey.100',
          px: 2,
          borderRadius: 1,
        }}
      >
        <Typography component='span' sx={{ fontWeight: 700 }}>
          现金及现金等价物净增加额
        </Typography>
        <Typography
          component='span'
          sx={{
            fontWeight: 700,
            color: data?.cash_equivalent_change >= 0 ? 'success.main' : 'error.main',
          }}
        >
          {formatCurrency(data?.cash_equivalent_change)}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, color: 'grey.600' }}>
        <Typography component='span' sx={{ color: 'grey.600' }}>
          期初现金
        </Typography>
        <Typography component='span' sx={{ color: 'grey.600' }}>
          {formatCurrency(data?.beginning_cash)}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, color: 'grey.600' }}>
        <Typography component='span' sx={{ color: 'grey.600' }}>
          期末现金
        </Typography>
        <Typography component='span' sx={{ color: 'grey.600', fontWeight: 500 }}>
          {formatCurrency(data?.ending_cash)}
        </Typography>
      </Box>
    </Box>
  );
}

function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
  }).format(amount);
}