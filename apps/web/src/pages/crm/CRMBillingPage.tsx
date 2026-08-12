import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Stack,
  Paper,
  useTheme,
  alpha,
  Chip,
  LinearProgress,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/common';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { crmApi, useCrmMock, type BillingAnalyticsData, type Period } from '@/api/crm';
import type { BillingRecord } from '@/api/crm';
import { billingSchema } from '@/schemas/crm';

const statusColorMap: Record<string, { main: string; light: string }> = {
  paid: { main: 'success.main', light: 'success.light' },
  pending: { main: 'warning.main', light: 'warning.light' },
  overdue: { main: 'error.main', light: 'error.light' },
};

const CRMBillingPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [period] = useState<Period>('MTD');
  const { data: mockBilling, mockEnabled } = useCrmMock<BillingAnalyticsData>({ period });

  const { data: stats, isLoading: statsLoading } = useQuery<BillingAnalyticsData['summary']>({
    queryKey: ['crm', 'billing', 'stats'],
    queryFn: async () => {
      const response = await crmApi.billing.list();
      const items = response.data?.items || [];
      return {
        totalAmount: items.reduce((sum, r) => sum + (r.amount || 0), 0),
        paidAmount: items.filter((r) => r.status === 'paid').reduce((sum, r) => sum + (r.amount || 0), 0),
        pendingAmount: items
          .filter((r) => r.status === 'pending')
          .reduce((sum, r) => sum + (r.amount || 0), 0),
        overdueAmount: items
          .filter((r) => r.status === 'overdue')
          .reduce((sum, r) => sum + (r.amount || 0), 0),
        totalCount: items.length,
        paidCount: items.filter((r) => r.status === 'paid').length,
        pendingCount: items.filter((r) => r.status === 'pending').length,
        overdueCount: items.filter((r) => r.status === 'overdue').length,
      };
    },
    initialData: mockEnabled ? mockBilling.summary : undefined,
    enabled: !mockEnabled,
  });

  const displayStats = mockEnabled ? mockBilling.summary : stats;
  const loading = !mockEnabled && statsLoading;

  const cards = useMemo(
    () => [
      { label: t('crm.billing.stat_total'), value: displayStats?.totalCount ?? 0, color: 'primary.main', amount: displayStats?.totalAmount ?? 0 },
      { label: t('crm.billing.stat_paid'), value: displayStats?.paidCount ?? 0, color: 'success.main', amount: displayStats?.paidAmount ?? 0 },
      {
        label: t('crm.billing.stat_pending'),
        value: displayStats?.pendingCount ?? 0,
        color: 'warning.main',
        amount: displayStats?.pendingAmount ?? 0,
      },
      { label: t('crm.billing.stat_overdue'), value: displayStats?.overdueCount ?? 0, color: 'error.main', amount: displayStats?.overdueAmount ?? 0 },
    ],
    [t, displayStats]
  );

  const top10 = mockBilling.top10;
  const statusPie = mockBilling.statusPie;
  const agingBuckets = mockBilling.agingBuckets;
  const totalPieAmount = statusPie.reduce((s, x) => s + x.amount, 0) || 1;
  const maxAgingAmount = Math.max(...agingBuckets.map((b) => b.amount), 1);

  const apiAdapter = useMemo<CrudApiAdapter<BillingRecord>>(
    () => ({
      list: async (params) => {
        const response = await crmApi.billing.list(params);
        if (!response.success) {
          throw new Error(response.message || t('crm.billing.error_load_list'));
        }
        const data = response.data as any;
        const items = data?.items || data || [];
        const total = data?.total || items.length;
        return { data: items, total };
      },
      create: async () => {
        throw new Error('Billing records are read-only');
      },
      update: async () => {
        throw new Error('Billing records are read-only');
      },
      delete: async () => {
        throw new Error('Billing records are read-only');
      },
    }),
    [t]
  );

  const billingContent = (
    <CrudPage
      schema={{
        ...billingSchema,
        actions: (billingSchema.actions || []).filter((a) => a === 'detail'),
      }}
      apiAdapter={apiAdapter}
      breadcrumbs={[{ label: t('crm.common.crm') }, { label: t('crm.billing.breadcrumb') }]}
    />
  );

  return (
    <PageContainer
      title={t('crm.billing.title')}
      subtitle={t('crm.billing.subtitle')}
      headerActions={
        mockEnabled ? (
          <Chip
            label={t('crm.common.mock_demo_badge') || 'Mock 演示'}
            color='warning'
            size='small'
            variant='outlined'
            sx={{ fontWeight: 600 }}
          />
        ) : null
      }
    >
      <Stack spacing={3}>
        <Stack direction='row' spacing={2} sx={{ flexWrap: 'wrap' }}>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Paper key={i} sx={{ p: 2, flex: '1 1 200px', minWidth: 200 }}>
                  <LinearProgress />
                </Paper>
              ))
            : cards.map((card) => (
                <Paper key={card.label} sx={{ p: 2, flex: '1 1 200px', minWidth: 200 }}>
                  <Typography variant='caption' color='text.secondary'>
                    {card.label}
                  </Typography>
                  <Typography variant='h6' sx={{ color: card.color, fontWeight: 700 }}>
                    {card.value}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    ¥{Number(card.amount).toLocaleString()}
                  </Typography>
                </Paper>
              ))}
        </Stack>

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
            <Stack direction='row' spacing={1}>
              <Chip
                label={t('crm.billing.tab_overview')}
                onClick={() => setActiveTab('overview')}
                color={activeTab === 'overview' ? 'primary' : 'default'}
                variant={activeTab === 'overview' ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                label={t('crm.billing.tab_invoices')}
                onClick={() => setActiveTab('invoices')}
                color={activeTab === 'invoices' ? 'primary' : 'default'}
                variant={activeTab === 'invoices' ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                label={t('crm.billing.tab_aging')}
                onClick={() => setActiveTab('aging')}
                color={activeTab === 'aging' ? 'primary' : 'default'}
                variant={activeTab === 'aging' ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
            </Stack>
          </Box>

          <Box sx={{ p: 3 }}>
            {activeTab === 'overview' && (
              <Stack spacing={3}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
                    gap: 3,
                  }}
                >
                  <Paper variant='outlined' sx={{ p: 3 }}>
                    <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 2 }}>
                      {t('crm.billing.section_status_pie') || '账单状态分布'}
                    </Typography>
                    <Stack spacing={2}>
                      {statusPie.map((s) => {
                        const pct = (s.amount / totalPieAmount) * 100;
                        const colors = statusColorMap[s.status] || statusColorMap.pending;
                        return (
                          <Box key={s.status}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant='body2' sx={{ color: colors.main, fontWeight: 600 }}>
                                {t(`crm.billing.status_${s.status}`) || s.status}
                              </Typography>
                              <Typography variant='caption' color='text.secondary'>
                                ¥{s.amount.toLocaleString()} ({pct.toFixed(1)}%)
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant='determinate'
                              value={pct}
                              sx={{
                                height: 10,
                                borderRadius: 5,
                                bgcolor: theme.palette.grey[200],
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: colors.main,
                                  borderRadius: 5,
                                },
                              }}
                            />
                            <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block' }}>
                              {s.count} {t('crm.billing.unit_invoice') || '笔'}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Paper>

                  <Paper variant='outlined' sx={{ p: 3 }}>
                    <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 2 }}>
                      {t('crm.billing.section_aging') || '账龄分析'}
                    </Typography>
                    <Stack spacing={2}>
                      {agingBuckets.map((b) => (
                        <Box key={b.bucket}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant='body2' sx={{ fontWeight: 500 }}>
                              {b.bucket}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {b.count} 笔 · ¥{b.amount.toLocaleString()}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant='determinate'
                            value={(b.amount / maxAgingAmount) * 100}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                </Box>

                <Paper variant='outlined' sx={{ p: 3 }}>
                  <Typography variant='subtitle2' sx={{ fontWeight: 600, mb: 2 }}>
                    {t('crm.billing.section_top10') || 'TOP10 客户应收'}
                  </Typography>
                  <Stack spacing={1.5}>
                    {top10.map((item, idx) => {
                      const c = statusColorMap[item.status] || statusColorMap.pending;
                      const maxTop = top10[0]?.amount || 1;
                      return (
                        <Box key={item.customerName} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant='caption' sx={{ width: 24, color: 'text.secondary', fontWeight: 600 }}>
                            {idx + 1}.
                          </Typography>
                          <Typography variant='body2' sx={{ flex: 1, minWidth: 160 }}>
                            {item.customerName}
                          </Typography>
                          <Box sx={{ flex: 1, minWidth: 120 }}>
                            <LinearProgress
                              variant='determinate'
                              value={(item.amount / maxTop) * 100}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: theme.palette.grey[200],
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: c.main,
                                  borderRadius: 3,
                                },
                              }}
                            />
                          </Box>
                          <Chip
                            label={t(`crm.billing.status_${item.status}`) || item.status}
                            size='small'
                            sx={{
                              bgcolor: c.light,
                              color: c.main,
                              fontWeight: 600,
                              minWidth: 56,
                            }}
                          />
                          <Typography variant='body2' sx={{ fontWeight: 700, width: 140, textAlign: 'right' }}>
                            ¥{item.amount.toLocaleString()}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                </Paper>
              </Stack>
            )}
            {activeTab === 'invoices' && billingContent}
            {activeTab === 'aging' && (
              <Stack spacing={2}>
                {agingBuckets.map((b) => (
                  <Paper key={b.bucket} variant='outlined' sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant='h6' sx={{ fontWeight: 700 }}>
                        {b.bucket}
                      </Typography>
                      <Typography variant='body1' color='text.secondary'>
                        {b.count} 笔 · ¥{b.amount.toLocaleString()}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant='determinate'
                      value={(b.amount / maxAgingAmount) * 100}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>
        </Paper>
      </Stack>
    </PageContainer>
  );
};

export default CRMBillingPage;
