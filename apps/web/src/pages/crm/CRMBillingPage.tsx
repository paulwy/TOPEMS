import React, { useCallback, useMemo, useState } from 'react';
import { Box, Typography, Stack, Paper, useTheme, Tooltip, alpha, Chip } from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  AlertTriangle,
  FileText,
  CheckCircle,
  Send,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/common';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter, RowAction } from '@/components/templates/CrudPage';
import { useNotificationStore } from '@/store/notificationStore';
import { crmApi } from '@/api/crm';
import type { BillingRecord } from '@/api/crm';
import { billingSchema, getBillingRowActions } from '@/schemas/crm';

interface BillingStats {
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  overdue_amount: number;
  total_count: number;
  paid_count: number;
  pending_count: number;
  overdue_count: number;
}

const BillingStatsCards: React.FC<{ stats?: BillingStats; loading: boolean }> = ({
  stats,
  loading,
}) => {
  if (loading) {
    return (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        加载中...
      </Typography>
    );
  }
  const cards = [
    { label: '账单总数', value: stats?.total_count ?? 0, color: 'primary.main' },
    { label: '已支付', value: stats?.paid_count ?? 0, color: 'success.main' },
    { label: '待支付', value: stats?.pending_count ?? 0, color: 'warning.main' },
    { label: '逾期', value: stats?.overdue_count ?? 0, color: 'error.main' },
  ];
  return (
    <Stack
      direction='row'
      spacing={2}
    >
      {cards.map((card) => (
        <Paper
          key={card.label}
          sx={{ p: 2, flex: 1 }}
        >
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {card.label}
          </Typography>
          <Typography
            variant='h6'
            sx={{ color: card.color }}
          >
            {card.value}
          </Typography>
        </Paper>
      ))}
    </Stack>
  );
};

const BillingAgingTable: React.FC = () => {
  return (
    <Typography
      variant='body2'
      color='text.secondary'
    >
      账龄分析
    </Typography>
  );
};

const CRMBillingPage: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [activeTab, setActiveTab] = useState('overview');

  const { data: stats, isLoading: statsLoading } = useQuery<BillingStats>({
    queryKey: ['crm', 'billing', 'stats'],
    queryFn: async () => {
      const response = await crmApi.billing.list();
      const items = response.data?.items || [];
      return {
        total_amount: items.reduce((sum, r) => sum + (r.amount || 0), 0),
        paid_amount: items
          .filter((r) => r.status === 'paid')
          .reduce((sum, r) => sum + (r.amount || 0), 0),
        pending_amount: items
          .filter((r) => r.status === 'pending')
          .reduce((sum, r) => sum + (r.amount || 0), 0),
        overdue_amount: items
          .filter((r) => r.status === 'overdue')
          .reduce((sum, r) => sum + (r.amount || 0), 0),
        total_count: items.length,
        paid_count: items.filter((r) => r.status === 'paid').length,
        pending_count: items.filter((r) => r.status === 'pending').length,
        overdue_count: items.filter((r) => r.status === 'overdue').length,
      };
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => crmApi.billing.markPaid(id),
    onSuccess: () => {
      addNotification({ type: 'success', message: '已标记为已支付' });
      queryClient.invalidateQueries({ queryKey: ['crm', 'billing'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'billing', 'stats'] });
    },
    onError: () => {
      addNotification({ type: 'error', message: '操作失败' });
    },
  });

  const sendNotificationMutation = useMutation({
    mutationFn: (id: string) => crmApi.billing.sendNotification(id),
    onSuccess: () => {
      addNotification({ type: 'success', message: '通知已发送' });
    },
    onError: () => {
      addNotification({ type: 'error', message: '发送失败' });
    },
  });

  const handleMarkPaid = useCallback(
    (id: string) => {
      markPaidMutation.mutate(id);
    },
    [markPaidMutation]
  );

  const handleSendNotification = useCallback(
    (id: string) => {
      sendNotificationMutation.mutate(id);
    },
    [sendNotificationMutation]
  );

  const apiAdapter = useMemo<CrudApiAdapter<BillingRecord>>(
    () => ({
      list: async (params) => {
        const response = await crmApi.billing.list(params);
        if (!response.success) {
          throw new Error(response.message || '获取账单列表失败');
        }
        const data = response.data as any;
        const items = data?.items || data || [];
        const total = data?.total || items.length;
        return { data: items, total };
      },
      create: async (data) => {
        const response = await crmApi.billing.create(data as any);
        if (!response.success) {
          throw new Error(response.message || '创建账单失败');
        }
        return response.data!;
      },
      update: async (id, data) => {
        const response = await crmApi.billing.update(id, data as any);
        if (!response.success) {
          throw new Error(response.message || '更新账单失败');
        }
        return response.data!;
      },
      delete: async (id) => {
        const response = await crmApi.billing.delete(id);
        if (!response.success) {
          throw new Error(response.message || '删除账单失败');
        }
      },
    }),
    []
  );

  const customRowActions = useMemo<RowAction[]>(
    () => [
      {
        label: '标记支付',
        icon: <CheckCircle size={16} />,
        color: 'success',
        onClick: (row: Record<string, unknown>) => handleMarkPaid(String(row.id)),
      },
      {
        label: '发送通知',
        icon: <Send size={16} />,
        color: 'primary',
        onClick: (row: Record<string, unknown>) => handleSendNotification(String(row.id)),
      },
    ],
    [handleMarkPaid, handleSendNotification]
  );

  const billingContent = (
    <CrudPage
      schema={billingSchema}
      apiAdapter={apiAdapter}
      customRowActions={customRowActions}
      breadcrumbs={[{ label: 'CRM' }, { label: '计费管理' }]}
    />
  );

  return (
    <PageContainer
      title='计费管理'
      subtitle='管理客户账单、收款和账龄分析'
    >
      <Stack spacing={3}>
        <BillingStatsCards
          stats={stats}
          loading={statsLoading}
        />

        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: 3,
              py: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
              backgroundColor: alpha(theme.palette.primary.main, 0.02),
            }}
          >
            <Stack
              direction='row'
              spacing={1}
              sx={{
                '& .MuiTab-root': {
                  minHeight: 40,
                  fontSize: '0.875rem',
                  textTransform: 'none',
                },
              }}
            >
              <Chip
                label='账单总览'
                onClick={() => setActiveTab('overview')}
                color={activeTab === 'overview' ? 'primary' : 'default'}
                variant={activeTab === 'overview' ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                label='账单管理'
                onClick={() => setActiveTab('invoices')}
                color={activeTab === 'invoices' ? 'primary' : 'default'}
                variant={activeTab === 'invoices' ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                label='账龄分析'
                onClick={() => setActiveTab('aging')}
                color={activeTab === 'aging' ? 'primary' : 'default'}
                variant={activeTab === 'aging' ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
            </Stack>
          </Box>

          <Box sx={{ p: 3 }}>
            {activeTab === 'overview' && (
              <Typography
                variant='body2'
                color='text.secondary'
              >
                账单总览 - 展示计费概览数据
              </Typography>
            )}
            {activeTab === 'invoices' && billingContent}
            {activeTab === 'aging' && <BillingAgingTable />}
          </Box>
        </Paper>
      </Stack>
    </PageContainer>
  );
};

export default CRMBillingPage;
