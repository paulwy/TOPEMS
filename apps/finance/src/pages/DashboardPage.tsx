import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Paper,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';

import { CreditCard, Landmark, Receipt, TrendingUp } from 'lucide-react';

import { useFinanceStore } from '../store/financeStore';

const PaymentIcon = CreditCard;
const TrendingUpIcon = TrendingUp;
const AccountBalanceIcon = Landmark;
const ReceiptIcon = Receipt;

export const DashboardPage: React.FC = () => {
  const {
    vouchersTotal,
    collections,
    payments,
    balanceSheet,
    incomeStatement,
    loading,
    error,
    loadVouchers,
    loadCollections,
    loadPayments,
  } = useFinanceStore();

  useEffect(() => {
    loadVouchers({ page: 1, page_size: 1 });
    loadCollections({ page: 1, pageSize: 10 });
    loadPayments({ page: 1, pageSize: 10 });
  }, [loadVouchers, loadCollections, loadPayments]);

  const totalCollection = collections.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalPayment = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          财务仪表盘
        </Typography>
        <Typography variant="body2" color="text.secondary">
          财务核心指标一览
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ReceiptIcon color="primary" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    凭证总数
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 600 }}>
                    {vouchersTotal}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrendingUpIcon color="success" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    收款合计
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    ¥{totalCollection.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PaymentIcon color="error" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    付款合计
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    ¥{totalPayment.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AccountBalanceIcon color="info" size={24} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    净利润
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    ¥
                    {incomeStatement
                      ? incomeStatement.net_profit.toLocaleString('zh-CN', {
                          maximumFractionDigits: 2,
                        })
                      : '-'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              资产负债概览
            </Typography>
            {balanceSheet ? (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <Typography>资产总计</Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    ¥
                    {balanceSheet.assets.total.toLocaleString('zh-CN', {
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <Typography>负债总计</Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    ¥
                    {balanceSheet.liabilities.total.toLocaleString('zh-CN', {
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <Typography>所有者权益</Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    ¥
                    {balanceSheet.equity.total.toLocaleString('zh-CN', {
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Typography color="text.secondary">暂无数据</Typography>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              利润概览
            </Typography>
            {incomeStatement ? (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <Typography>营业收入</Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    ¥
                    {incomeStatement.revenue.total.toLocaleString('zh-CN', {
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <Typography>营业利润</Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    ¥
                    {incomeStatement.operating_profit.toLocaleString('zh-CN', {
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <Typography>净利润</Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    ¥
                    {incomeStatement.net_profit.toLocaleString('zh-CN', {
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Typography color="text.secondary">暂无数据</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
