import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  LocalShipping as LocalShippingIcon,
  Business as BusinessIcon,
  Inventory2 as InventoryIcon,
  Store as StoreIcon,
  RequestQuote as RequestQuoteIcon,
  Warning as WarningIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useScmStore } from '../store/scmStore';

interface StatItem {
  id: string;
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'info' | 'error';
  change?: string;
}

export const DashboardPage: React.FC = () => {
  const { loading, error, setLoading, setError } = useScmStore();
  const [stats, setStats] = useState<StatItem[]>([]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setStats([
        {
          id: 'suppliers',
          title: '供应商总数',
          value: 128,
          icon: <BusinessIcon fontSize="large" />,
          color: 'primary',
          change: '本月新增 6 家',
        },
        {
          id: 'purchase-orders',
          title: '采购订单',
          value: 56,
          icon: <AssignmentIcon fontSize="large" />,
          color: 'info',
          change: '待审核 12 单',
        },
        {
          id: 'receipts',
          title: '入库单据',
          value: 42,
          icon: <LocalShippingIcon fontSize="large" />,
          color: 'success',
          change: '本周完成 18 单',
        },
        {
          id: 'inventory',
          title: '库存 SKU',
          value: 1834,
          icon: <InventoryIcon fontSize="large" />,
          color: 'warning',
          change: '总价值 ¥2.3M',
        },
        {
          id: 'warehouses',
          title: '仓库数量',
          value: 8,
          icon: <StoreIcon fontSize="large" />,
          color: 'primary',
          change: '覆盖 6 大区',
        },
        {
          id: 'alerts',
          title: '库存预警',
          value: 14,
          icon: <WarningIcon fontSize="large" />,
          color: 'error',
          change: '需补货 9 项',
        },
        {
          id: 'inquiries',
          title: '询价单',
          value: 23,
          icon: <RequestQuoteIcon fontSize="large" />,
          color: 'info',
          change: '进行中 11 单',
        },
        {
          id: 'reports',
          title: '本月报表',
          value: 9,
          icon: <AssessmentIcon fontSize="large" />,
          color: 'success',
          change: '已生成 7 份',
        },
      ]);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [setLoading, setError]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          SCM 仪表盘
        </Typography>
        <Typography variant="body1" color="text.secondary">
          供应链/供应商协同/仓储管理综合数据概览
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {stats.map((stat) => (
              <Grid item xs={12} sm={6} md={3} key={stat.id}>
                <Card
                  sx={{
                    height: '100%',
                    borderTop: 3,
                    borderColor: `${stat.color}.main`,
                  }}
                >
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box sx={{ color: `${stat.color}.main` }}>{stat.icon}</Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {stat.title}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 600, mt: 0.5 }}>
                          {stat.value}
                        </Typography>
                        {stat.change && (
                          <Typography variant="caption" color="text.secondary">
                            {stat.change}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, height: 360 }}>
                <Typography variant="h6" gutterBottom>
                  采购金额月度趋势
                </Typography>
                <Box
                  sx={{
                    height: 280,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                  }}
                >
                  图表占位 - 采购金额月度趋势
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, height: 360 }}>
                <Typography variant="h6" gutterBottom>
                  库存预警分布
                </Typography>
                <Box
                  sx={{
                    height: 280,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                  }}
                >
                  图表占位 - 库存预警饼图
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
};

export default DashboardPage;
