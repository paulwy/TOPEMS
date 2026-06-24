import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { reportApi } from '../api/finance';
import type { BalanceSheet, IncomeStatement, CashFlowStatement } from '../api/finance';

export const FinancialReportsPage: React.FC = () => {
  const [companyId, setCompanyId] = useState('');
  const [period, setPeriod] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowStatement | null>(null);

  const load = async () => {
    if (!companyId || !period) {
      setError('请填写公司和期间');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = { company_id: companyId, period };
      const [bs, is, cf] = await Promise.all([
        reportApi.getBalanceSheet(params),
        reportApi.getIncomeStatement(params),
        reportApi.getCashFlowStatement(params),
      ]);
      setBalanceSheet(bs);
      setIncomeStatement(is);
      setCashFlow(cf);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('zh-CN', { maximumFractionDigits: 2 });

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          综合财务报表
        </Typography>
        <Typography variant="body2" color="text.secondary">
          资产负债 + 利润 + 现金流 一体化视图
        </Typography>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField label="公司ID" size="small" value={companyId} onChange={(e) => setCompanyId(e.target.value)} />
          <TextField
            label="期间 (YYYY-MM)"
            size="small"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
          <Button variant="contained" startIcon={<SearchIcon />} onClick={load}>
            查询
          </Button>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">资产负债表</Typography>
                {balanceSheet ? (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography>资产总计</Typography>
                      <Typography sx={{ fontWeight: 600 }}>¥{fmt(balanceSheet.assets.total)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography>负债总计</Typography>
                      <Typography sx={{ fontWeight: 600 }}>¥{fmt(balanceSheet.liabilities.total)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography>所有者权益</Typography>
                      <Typography sx={{ fontWeight: 600 }}>¥{fmt(balanceSheet.equity.total)}</Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography color="text.secondary" sx={{ mt: 2 }}>暂无数据</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">利润表</Typography>
                {incomeStatement ? (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography>营业收入</Typography>
                      <Typography sx={{ fontWeight: 600 }}>¥{fmt(incomeStatement.revenue.total)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography>营业利润</Typography>
                      <Typography sx={{ fontWeight: 600 }}>¥{fmt(incomeStatement.operating_profit)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography>净利润</Typography>
                      <Typography sx={{ fontWeight: 600 }}>¥{fmt(incomeStatement.net_profit)}</Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography color="text.secondary" sx={{ mt: 2 }}>暂无数据</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">现金流量表</Typography>
                {cashFlow ? (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography>经营净流量</Typography>
                      <Typography sx={{ fontWeight: 600 }}>¥{fmt(cashFlow.operating.net_flow)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography>投资净流量</Typography>
                      <Typography sx={{ fontWeight: 600 }}>¥{fmt(cashFlow.investing.net_flow)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography>筹资净流量</Typography>
                      <Typography sx={{ fontWeight: 600 }}>¥{fmt(cashFlow.financing.net_flow)}</Typography>
                    </Box>
                  </Box>
                ) : (
                  <Typography color="text.secondary" sx={{ mt: 2 }}>暂无数据</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default FinancialReportsPage;
