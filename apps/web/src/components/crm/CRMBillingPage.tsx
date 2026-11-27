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
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/common';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { crmApi, crmAnalyticsApi } from '@/api/crm';
import type { BillingRecord, Period } from '@/api/crm';
import { billingSchema } from '@/schemas/crm';

const statusColorMap: Record<string, { main: string; light: string }> = {
  paid: { main: 'success.main', light: 'success.light' },
  pending: { main: 'warning.main', light: 'warning.light' },
  overdue: { main: 'error.main', light: 'error.light' },
};
const neutralColor = { main: 'text.secondary', light: 'grey.200' };

const CRMBillingPage: React.FC = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [period] = useState<Period>('MTD');

  // 真实聚合：GET /api/crm/analytics/billing → { status_pie:[{status,count,amount}], top_customers:[{name,value}], aging:[{name,value(=count)}] }
  const billingAnalyticsQuery = useQuery({
    queryKey: ['crm-analytics-billing', period],
    queryFn: () => crmAnalyticsApi.getBilling(period),
    staleTime: 5 * 60 * 1000,
  });
  const analytics = billingAnalyticsQuery.data?.data;

  // 状态饼与汇总（后端 status_pie 形状 {status,count,amount} 与前端一致，直接消费）
  const statusPie = analytics?.status_pie ?? [];
  const summary = useMemo(() => {
    const findAmount = (s: string) => statusPie.find((x) => x.status === s)?.amount ?? 0;
    const findCount = (s: string) => statusPie.find((x) => x.status === s)?.count ?? 0;
    return {
      totalAmount: statusPie.reduce((sum, x) => sum + x.amount, 0),
      paidAmount: findAmount('paid'),
      pendingAmount: findAmount('pending'),
      overdueAmount: findAmount('overdue'),
      totalCount: statusPie.reduce((sum, x) => sum + x.count, 0),
      paidCount: findCount('paid'),
      pendingCount: findCount('pending'),
      overdueCount: findCount('overdue'),
    };
  }, [statusPie]);

  // Top10：后端只给 {name,value}，无单笔状态 → status 留空走中性色（诚实降级）
  const top10 = useMemo(
    () =>
      (analytics?.top_customers ?? []).map((x) => ({
        customerName: x.name,
        amount: x.value,
        status: undefined as 'paid' | 'pending' | 'overdue' | undefined,
      })),
    [analytics]
  );
  // 账龄桶：后端只聚合 count，无金额 → amount 置 0，进度条按 count 绘制（诚实降级）
  const agingBuckets = useMemo(
    () =>
      (analytics?.aging ?? []).map((x) => ({
        bucket: x.name,
        count: x.value,
        amount: 0,
      })),
    [analytics]
  );
  const displayStats = summary;
  const loading = billingAnalyticsQuery.isLoading || billingAnalyticsQuery.isFetching;

  const cards = useMemo(
    () => [
      {
        label: t('crm.billing.stat_total'),
        value: displayStats?.totalCount ?? 0,
        color: 'primary.main',
        amount: displayStats?.totalAmount ?? 0,
      },
      {
        label: t('crm.billing.stat_paid'),
        value: displayStats?.paidCount ?? 0,
        color: 'success.700',
        amount: displayStats?.paidAmount ?? 0,
      },
      {
        label: t('crm.billing.stat_pending'),
        value: displayStats?.pendingCount ?? 0,
        color: 'warning.700',
        amount: displayStats?.pendingAmount ?? 0,
      },
      {
        label: t('crm.billing.stat_overdue'),
        value: displayStats?.overdueCount ?? 0,
        color: 'error.main',
        amount: displayStats?.overdueAmount ?? 0,
      },
    ],
    [t, displayStats]
  );

  const totalPieAmount = statusPie.reduce((s, x) => s + x.amount, 0) || 1;
  // 账龄桶后端只聚合 count：进度条按 count 相对最大值绘制（amount 恒 0，见上方注释）
  const maxAgingCount = Math.max(...agingBuckets.map((b) => b.count), 1);

  const apiAdapter = useMemo<CrudApiAdapter<BillingRecord>>(
    () => ({
      list: async (params) => {
        const response = await crmApi.billing.list(params);
        if (!response.success) {
          throw new Error(response.message || t('crm.billing.error_load_list'));
        }
        const raw = response.data as unknown;
        const items = Array.isArray(raw) ? raw : ((raw as { items?: BillingRecord[] }).items ?? []);
        const total = Array.isArray(raw)
          ? items.length
          : ((raw as { total?: number }).total ?? items.length);
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
    >
      <Stack spacing={3}>
        <Stack
          direction='row'
          spacing={2}
          sx={{ flexWrap: 'wrap' }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Paper
                  key={i}
                  sx={{ p: 2, flex: '1 1 200px', minWidth: 200 }}
                >
                  <LinearProgress />
                </Paper>
              ))
            : cards.map((card) => (
                <Paper
                  key={card.label}
                  sx={{ p: 2, flex: '1 1 200px', minWidth: 200 }}
                >
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {card.label}
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ color: card.color, fontWeight: 700 }}
                  >
                    {card.value}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
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
            <Stack
              direction='row'
              spacing={1}
            >
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
                  <Paper
                    variant='outlined'
                    sx={{ p: 3 }}
                  >
                    <Typography
                      variant='subtitle2'
                      sx={{ fontWeight: 600, mb: 2 }}
                    >
                      {t('crm.billing.section_status_pie') || i18n.t('pages.crm_billing_page.k1')}
                    </Typography>
                    <Stack spacing={2}>
                      {statusPie.map((s) => {
                        const pct = (s.amount / totalPieAmount) * 100;
                        const colors = statusColorMap[s.status] || statusColorMap.pending;
                        return (
                          <Box key={s.status}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography
                                variant='body2'
                                sx={{ color: colors.main, fontWeight: 600 }}
                              >
                                {t(`crm.billing.status_${s.status}`) || s.status}
                              </Typography>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
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
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{ mt: 0.5, display: 'block' }}
                            >
                              {s.count}{' '}
                              {t('crm.billing.unit_invoice') || i18n.t('pages.crm_billing_page.k2')}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Paper>

                  <Paper
                    variant='outlined'
                    sx={{ p: 3 }}
                  >
                    <Typography
                      variant='subtitle2'
                      sx={{ fontWeight: 600, mb: 2 }}
                    >
                      {t('crm.billing.section_aging') || i18n.t('pages.crm_billing_page.k3')}
                    </Typography>
                    <Stack spacing={2}>
                      {agingBuckets.map((b) => (
                        <Box key={b.bucket}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 500 }}
                            >
                              {b.bucket}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {b.count} {i18n.t('pages.crm_billing_page.k0')} ¥
                              {b.amount.toLocaleString()}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant='determinate'
                            value={(b.count / maxAgingCount) * 100}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                </Box>

                <Paper
                  variant='outlined'
                  sx={{ p: 3 }}
                >
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600, mb: 2 }}
                  >
                    {t('crm.billing.section_top10') || i18n.t('pages.crm_billing_page.top10_4')}
                  </Typography>
                  <Stack spacing={1.5}>
                    {top10.map((item, idx) => {
                      // 后端 top_customers 无状态字段：无 status 时走中性灰
                      const c = statusColorMap[item.status ?? ''] || neutralColor;
                      const maxTop = top10[0]?.amount || 1;
                      return (
                        <Box
                          key={item.customerName}
                          sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                        >
                          <Typography
                            variant='caption'
                            sx={{ width: 24, color: 'text.secondary', fontWeight: 600 }}
                          >
                            {idx + 1}.
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{ flex: 1, minWidth: 160 }}
                          >
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
                            label={
                              item.status
                                ? t(`crm.billing.status_${item.status}`) || item.status
                                : '—'
                            }
                            size='small'
                            sx={{
                              bgcolor: c.light,
                              color: c.main,
                              fontWeight: 600,
                              minWidth: 56,
                            }}
                          />
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 700, width: 140, textAlign: 'right' }}
                          >
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
                  <Paper
                    key={b.bucket}
                    variant='outlined'
                    sx={{ p: 3 }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 700 }}
                      >
                        {b.bucket}
                      </Typography>
                      <Typography
                        variant='body1'
                        color='text.secondary'
                      >
                        {b.count} {i18n.t('pages.crm_billing_page.k1')} ¥{b.amount.toLocaleString()}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant='determinate'
                      value={(b.count / maxAgingCount) * 100}
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
