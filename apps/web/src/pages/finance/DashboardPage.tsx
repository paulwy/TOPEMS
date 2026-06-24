import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Stack,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  FileText,
  CreditCard,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Upload,
  Download,
  BarChart3,
  Receipt,
  PieChart,
  Building2,
} from 'lucide-react';
import {
  DashboardTemplate,
  type StatCard,
  type ChartCard,
  type QuickAction,
} from '@/components/templates';

const mockStats: StatCard[] = [
  {
    id: 'voucher-count',
    title: '本月凭证数',
    value: '156',
    change: 12.5,
    changeLabel: '较上月',
    icon: <FileText size={24} />,
    color: 'primary',
  },
  {
    id: 'receivable',
    title: '应收账款',
    value: '¥2,345,678',
    change: -5.2,
    changeLabel: '较上月',
    icon: <CreditCard size={24} />,
    color: 'warning',
  },
  {
    id: 'payable',
    title: '应付账款',
    value: '¥1,876,543',
    change: 8.3,
    changeLabel: '较上月',
    icon: <Wallet size={24} />,
    color: 'error',
  },
  {
    id: 'net-profit',
    title: '净利润',
    value: '¥4,567,890',
    change: 15.8,
    changeLabel: '较上月',
    icon: <TrendingUp size={24} />,
    color: 'success',
  },
];

const mockQuickActions: QuickAction[] = [
  {
    id: 'create-voucher',
    label: '新建凭证',
    icon: <Plus size={20} />,
    href: '/finance/vouchers/create',
    color: '#1976d2',
  },
  {
    id: 'import-voucher',
    label: '导入凭证',
    icon: <Upload size={20} />,
    href: '/finance/vouchers/import',
    color: '#388e3c',
  },
  {
    id: 'voucher-list',
    label: '凭证列表',
    icon: <FileText size={20} />,
    href: '/finance/vouchers',
    color: '#7b1fa2',
  },
  {
    id: 'financial-reports',
    label: '财务报表',
    icon: <BarChart3 size={20} />,
    href: '/finance/reports',
    color: '#f57c00',
  },
];

const mockRecentVouchers = [
  {
    id: '1',
    title: '记-2024-001',
    subtitle: '支付办公费用',
    time: '2024-01-15 10:30',
    type: 'voucher' as const,
  },
  {
    id: '2',
    title: '记-2024-002',
    subtitle: '收到客户货款',
    time: '2024-01-15 11:20',
    type: 'voucher' as const,
  },
  {
    id: '3',
    title: 'INV-2024-001',
    subtitle: '销售发票 #001',
    time: '2024-01-15 14:00',
    type: 'invoice' as const,
  },
  {
    id: '4',
    title: 'PAY-2024-001',
    subtitle: '供应商付款',
    time: '2024-01-15 15:30',
    type: 'payment' as const,
  },
];

const mockCharts: ChartCard[] = [
  {
    id: 'income-expense',
    title: '收入支出对比',
    height: 300,
    chart: (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                收入
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600, color: 'success.main' }}
              >
                ¥5,234,567
              </Typography>
            </Box>
            <LinearProgress
              variant='determinate'
              value={65}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'success.light',
                '& .MuiLinearProgress-bar': {
                  bgcolor: 'success.main',
                  borderRadius: 4,
                },
              }}
            />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                支出
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600, color: 'error.main' }}
              >
                ¥3,876,543
              </Typography>
            </Box>
            <LinearProgress
              variant='determinate'
              value={48}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'error.light',
                '& .MuiLinearProgress-bar': {
                  bgcolor: 'error.main',
                  borderRadius: 4,
                },
              }}
            />
          </Box>
        </Box>
      </Box>
    ),
  },
  {
    id: 'balance-distribution',
    title: '账户余额分布',
    height: 300,
    chart: (
      <Stack
        direction='row'
        spacing={3}
        sx={{ mt: 2 }}
      >
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <PieChart
            size={80}
            style={{ color: '#1976d2' }}
          />
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mt: 1 }}
          >
            ¥8,765,432
          </Typography>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            银行存款
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <BarChart3
            size={80}
            style={{ color: '#388e3c' }}
          />
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mt: 1 }}
          >
            ¥2,345,678
          </Typography>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            应收账款
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <Building2
            size={80}
            style={{ color: '#f57c00' }}
          />
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mt: 1 }}
          >
            ¥1,234,567
          </Typography>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            固定资产
          </Typography>
        </Box>
      </Stack>
    ),
  },
];

const FinanceDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const recentItems = mockRecentVouchers.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.subtitle,
    time: item.time,
    avatar: (
      <Avatar
        sx={{
          bgcolor:
            item.type === 'voucher'
              ? 'primary.light'
              : item.type === 'invoice'
                ? 'success.light'
                : 'warning.light',
          color:
            item.type === 'voucher'
              ? 'primary.main'
              : item.type === 'invoice'
                ? 'success.main'
                : 'warning.main',
        }}
      >
        {item.type === 'voucher' ? (
          <FileText size={20} />
        ) : item.type === 'invoice' ? (
          <Receipt size={20} />
        ) : (
          <Wallet size={20} />
        )}
      </Avatar>
    ),
    onClick: () => navigate(`/finance/vouchers/${item.id}`),
  }));

  return (
    <DashboardTemplate
      title='财务概览'
      breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '财务' }]}
      stats={mockStats}
      charts={mockCharts}
      recentItems={recentItems}
      recentTitle='最近凭证'
      quickActions={mockQuickActions}
      quickActionsTitle='快捷操作'
    />
  );
};

export default FinanceDashboardPage;
