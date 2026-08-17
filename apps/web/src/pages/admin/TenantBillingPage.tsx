import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Alert,
} from '@mui/material';
import i18n from '@/i18n';
import {
  CreditCard,
  Check,
  X,
  Download,
  ArrowUpRight,
  Users,
  HardDrive,
  Activity,
  Zap,
  Building2,
  Crown,
} from 'lucide-react';
import { PageContainer, Grid } from '@/components/common';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter, RowAction } from '@/components/templates/CrudPage';
import { tenantApi } from '@/api/tenant';
import type { TenantInvoice, Tenant, UsageMetrics, TenantBillingInfo } from '@/api/tenant/types';
import { tenantInvoiceSchema } from '@/schemas/admin';

const plans = [
  {
    id: 'free',
    name: i18n.t('admin.tenant_billing_page.k0'),
    price: 0,
    description: i18n.t('admin.tenant_billing_page.k1'),
    features: [
      { name: i18n.t('admin.tenant_billing_page.5_2'), included: true },
      { name: i18n.t('pages.tenant_billing_page.5gb_0'), included: true },
      { name: i18n.t('pages.tenant_billing_page.1000api_1'), included: true },
      { name: i18n.t('admin.tenant_billing_page.k3'), included: true },
      { name: i18n.t('admin.tenant_billing_page.k4'), included: true },
      { name: i18n.t('admin.tenant_billing_page.k5'), included: false },
      { name: i18n.t('pages.tenant_billing_page.sso_2'), included: false },
      { name: i18n.t('admin.tenant_billing_page.k6'), included: false },
      { name: i18n.t('admin.tenant_billing_page.k7'), included: false },
    ],
    icon: Users,
    color: 'default',
  },
  {
    id: 'basic',
    name: i18n.t('admin.tenant_billing_page.k8'),
    price: 299,
    description: i18n.t('admin.tenant_billing_page.k9'),
    features: [
      { name: i18n.t('admin.tenant_billing_page.25_10'), included: true },
      { name: i18n.t('pages.tenant_billing_page.50gb_3'), included: true },
      { name: i18n.t('pages.tenant_billing_page.50000api_4'), included: true },
      { name: i18n.t('admin.tenant_billing_page.k11'), included: true },
      { name: i18n.t('admin.tenant_billing_page.k12'), included: true },
      { name: i18n.t('admin.tenant_billing_page.k13'), included: true },
      { name: i18n.t('pages.tenant_billing_page.sso_5'), included: false },
      { name: i18n.t('admin.tenant_billing_page.k14'), included: false },
      { name: i18n.t('admin.tenant_billing_page.k15'), included: false },
    ],
    icon: Building2,
    color: 'primary',
  },
  {
    id: 'professional',
    name: i18n.t('admin.tenant_billing_page.k16'),
    price: 999,
    description: i18n.t('admin.tenant_billing_page.k17'),
    popular: true,
    features: [
      { name: i18n.t('admin.tenant_billing_page.100_18'), included: true },
      { name: i18n.t('pages.tenant_billing_page.200gb_6'), included: true },
      { name: i18n.t('pages.tenant_billing_page.200000api_7'), included: true },
      { name: i18n.t('admin.tenant_billing_page.k19'), included: true },
      { name: i18n.t('admin.tenant_billing_page.k20'), included: true },
      { name: i18n.t('admin.tenant_billing_page.k21'), included: true },
      { name: i18n.t('pages.tenant_billing_page.sso_8'), included: true },
      { name: i18n.t('admin.tenant_billing_page.k22'), included: true },
      { name: i18n.t('admin.tenant_billing_page.k23'), included: false },
    ],
    icon: Zap,
    color: 'secondary',
  },
  {
    id: 'enterprise',
    name: i18n.t('admin.tenant_billing_page.k24'),
    price: i18n.t('admin.tenant_billing_page.k25'),
    description: i18n.t('admin.tenant_billing_page.k26'),
    features: [
      { name: i18n.t('admin.tenant_billing_page.k27'), included: true },
      { name: i18n.t('admin.tenant_billing_page.k28'), included: true },
      { name: i18n.t('admin.tenant_billing_page.api_29'), included: true },
      { name: i18n.t('admin.tenant_billing_page.k30'), included: true },
      { name: i18n.t('pages.tenant_billing_page.7x24_9'), included: true },
      { name: i18n.t('admin.tenant_billing_page.k31'), included: true },
      { name: i18n.t('pages.tenant_billing_page.sso_10'), included: true },
      { name: i18n.t('admin.tenant_billing_page.k32'), included: true },
      { name: i18n.t('admin.tenant_billing_page.k33'), included: true },
    ],
    icon: Crown,
    color: 'success',
  },
];
const TenantBillingPage: React.FC = () => {
  const contextQuery = useQuery({
    queryKey: QUERY_KEYS.TENANT.CURRENT,
    queryFn: async () => {
      const res = await tenantApi.getCurrentTenantContext();
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(i18n.t('admin.tenant_billing_page.k34'));
    },

    staleTime: CACHE_DURATIONS.LONG,
  });
  const tenantId = contextQuery.data?.tenant_id;
  const tenantQuery = useQuery({
    queryKey: QUERY_KEYS.TENANT.TENANT(tenantId ?? ''),
    queryFn: async () => {
      if (!tenantId) return null;
      const res = await tenantApi.getTenant(tenantId);
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(i18n.t('admin.tenant_billing_page.k35'));
    },
    enabled: !!tenantId,

    staleTime: CACHE_DURATIONS.LONG,
  });
  const billingQuery = useQuery({
    queryKey: QUERY_KEYS.TENANT.BILLING(tenantId ?? ''),
    queryFn: async () => {
      if (!tenantId) return null;
      const res = await tenantApi.getBillingInfo(tenantId);
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(i18n.t('admin.tenant_billing_page.k36'));
    },
    enabled: !!tenantId,

    staleTime: CACHE_DURATIONS.LONG,
  });
  const usageQuery = useQuery({
    queryKey: QUERY_KEYS.TENANT.USAGE(tenantId ?? ''),
    queryFn: async () => {
      if (!tenantId) return null;
      const res = await tenantApi.getUsageMetrics(tenantId);
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(i18n.t('admin.tenant_billing_page.k37'));
    },
    enabled: !!tenantId,

    staleTime: CACHE_DURATIONS.LONG,
  });
  const tenant = tenantQuery.data ?? null;
  const billingInfo = billingQuery.data ?? null;
  const usage = usageQuery.data ?? null;
  const loading = contextQuery.isLoading || tenantQuery.isLoading;
  const invoiceApiAdapter = useMemo<CrudApiAdapter<TenantInvoice> | null>(() => {
    if (!tenantId) return null;
    return {
      list: async () => {
        const res = await tenantApi.getInvoices(tenantId);
        if (!res.success) {
          throw new Error(res.message || i18n.t('admin.tenant_billing_page.k38'));
        }
        const data = res.data || [];
        return { data, total: data.length };
      },
      create: async () => {
        throw new Error(i18n.t('admin.tenant_billing_page.k39'));
      },
      update: async () => {
        throw new Error(i18n.t('admin.tenant_billing_page.k40'));
      },
      delete: async () => {
        throw new Error(i18n.t('admin.tenant_billing_page.k41'));
      },
    };
  }, [tenantId]);
  const invoiceRowActions = useMemo<RowAction[]>(
    () => [
      {
        label: i18n.t('admin.tenant_billing_page.k42'),
        icon: <Download size={16} />,
        onClick: () => {},
      },
    ],
    []
  );
  if (loading || !tenant) {
    return (
      <PageContainer loading>
        <Box />
      </PageContainer>
    );
  }
  const currentPlan = plans.find((p) => p.id === tenant.plan) || plans[0];
  return (
    <PageContainer
      title={i18n.t('admin.tenant_billing_page.k43')}
      subtitle={i18n.t('admin.tenant_billing_page.k44')}
      headerProps={{
        pageIcon: <CreditCard size={20} />,
      }}
    >
      <Alert
        severity='info'
        sx={{ mb: 3 }}
      >
        {i18n.t('pages.tenant_billing_page.strong_0')}
        {currentPlan.name}
        {i18n.t('pages.tenant_billing_page.strong_1')}
        <strong>
          {billingInfo ? new Date(billingInfo.next_billing_date).toLocaleDateString('zh-CN') : '-'}
        </strong>
      </Alert>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('pages.tenant_billing_page.k0')}
        </Typography>
        <Grid
          container
          spacing={2}
        >
          <Grid
            item
            xs={12}
            md={4}
          >
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Users
                    size={20}
                    style={{ opacity: 0.7 }}
                  />
                  <Typography
                    variant='subtitle2'
                    color='text.secondary'
                  >
                    {i18n.t('pages.tenant_billing_page.k1')}
                  </Typography>
                </Box>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700, mb: 1 }}
                >
                  {usage?.users_count || 0}
                  <Typography
                    component='span'
                    variant='body2'
                    color='text.secondary'
                  >
                    /{tenant.quota_users}
                  </Typography>
                </Typography>
                <LinearProgress
                  variant='determinate'
                  value={Math.min(((usage?.users_count || 0) / tenant.quota_users) * 100, 100)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid
            item
            xs={12}
            md={4}
          >
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <HardDrive
                    size={20}
                    style={{ opacity: 0.7 }}
                  />
                  <Typography
                    variant='subtitle2'
                    color='text.secondary'
                  >
                    {i18n.t('pages.tenant_billing_page.k2')}
                  </Typography>
                </Box>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700, mb: 1 }}
                >
                  {usage?.storage_used_gb.toFixed(1) || 0}
                  <Typography
                    component='span'
                    variant='body2'
                    color='text.secondary'
                  >
                    GB/{tenant.quota_storage_gb}GB
                  </Typography>
                </Typography>
                <LinearProgress
                  variant='determinate'
                  value={Math.min(
                    ((usage?.storage_used_gb || 0) / (tenant.quota_storage_gb || 1)) * 100,
                    100
                  )}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid
            item
            xs={12}
            md={4}
          >
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Activity
                    size={20}
                    style={{ opacity: 0.7 }}
                  />
                  <Typography
                    variant='subtitle2'
                    color='text.secondary'
                  >
                    {i18n.t('pages.tenant_billing_page.api_3')}
                  </Typography>
                </Box>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700, mb: 1 }}
                >
                  {(usage?.api_requests_today || 0).toLocaleString()}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mb: 1 }}
                >
                  {i18n.t('pages.tenant_billing_page.k2')}{' '}
                  {(tenant.quota_api_calls || 0).toLocaleString()}{' '}
                  {i18n.t('pages.tenant_billing_page.k3')}
                </Typography>
                <LinearProgress
                  variant='determinate'
                  value={Math.min(
                    ((usage?.api_requests_today || 0) / (tenant.quota_api_calls || 1)) * 100,
                    100
                  )}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
          >
            {i18n.t('pages.tenant_billing_page.k4')}
          </Typography>
        </Box>
        <Grid
          container
          spacing={2}
        >
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === tenant.plan;
            return (
              <Grid
                item
                xs={12}
                sm={6}
                md={3}
                key={plan.id}
              >
                <Card
                  variant='outlined'
                  sx={{
                    position: 'relative',
                    height: '100%',
                    borderColor: isCurrentPlan ? 'primary.main' : 'divider',
                    borderWidth: isCurrentPlan ? 2 : 1,
                  }}
                >
                  {plan.popular && (
                    <Chip
                      label={i18n.t('admin.tenant_billing_page.k45')}
                      color='secondary'
                      size='small'
                      sx={{
                        position: 'absolute',
                        top: -10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                      }}
                    />
                  )}
                  <CardContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      <plan.icon size={24} />
                      <Typography
                        variant='h6'
                        sx={{ fontWeight: 600 }}
                      >
                        {plan.name}
                      </Typography>
                    </Box>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, mb: 1 }}
                    >
                      {typeof plan.price === 'number' ? `¥${plan.price}` : plan.price}
                      {typeof plan.price === 'number' && (
                        <Typography
                          component='span'
                          variant='body2'
                          color='text.secondary'
                        >
                          {i18n.t('pages.tenant_billing_page.k5')}
                        </Typography>
                      )}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{ mb: 2 }}
                    >
                      {plan.description}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <List
                      disablePadding
                      dense
                    >
                      {plan.features.map((feature, idx) => (
                        <ListItem
                          key={idx}
                          sx={{ px: 0, py: 0.5 }}
                        >
                          {feature.included ? (
                            <Check
                              size={16}
                              color='green'
                              style={{ marginRight: 8, flexShrink: 0 }}
                            />
                          ) : (
                            <X
                              size={16}
                              color='gray'
                              style={{ marginRight: 8, flexShrink: 0, opacity: 0.5 }}
                            />
                          )}
                          <ListItemText
                            primary={feature.name}
                            sx={{
                              '& .MuiListItemText-primary': {
                                fontSize: '0.8rem',
                                color: feature.included ? 'text.primary' : 'text.disabled',
                              },
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                    <Box sx={{ mt: 2 }}>
                      {isCurrentPlan ? (
                        <Button
                          fullWidth
                          variant='outlined'
                          disabled
                        >
                          {i18n.t('pages.tenant_billing_page.k6')}
                        </Button>
                      ) : (
                        <Button
                          fullWidth
                          variant='contained'
                          endIcon={<ArrowUpRight size={16} />}
                          disabled={plan.id === 'enterprise' ? false : false}
                        >
                          {plan.id === 'enterprise'
                            ? i18n.t('admin.tenant_billing_page.k47')
                            : i18n.t('admin.tenant_billing_page.k46')}
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>
      {invoiceApiAdapter && (
        <Box sx={{ mb: 4 }}>
          <CrudPage
            schema={tenantInvoiceSchema}
            apiAdapter={invoiceApiAdapter}
            customRowActions={invoiceRowActions}
          />
        </Box>
      )}
      <Box sx={{ mt: 4 }}>
        <Card variant='outlined'>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <CreditCard size={24} />
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('pages.tenant_billing_page.k7')}
              </Typography>
            </Box>
            <Grid
              container
              spacing={2}
              sx={{ alignItems: 'center' }}
            >
              <Grid
                item
                xs={12}
                md={6}
              >
                <Box
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 3,
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <CreditCard size={32} />
                  <Box>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 500 }}
                    >
                      •••• •••• •••• 4242
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {i18n.t('pages.tenant_billing_page.122025_8')}
                    </Typography>
                  </Box>
                  <Chip
                    label={i18n.t('admin.tenant_billing_page.k48')}
                    size='small'
                    color='primary'
                    sx={{ ml: 'auto' }}
                  />
                </Box>
              </Grid>
              <Grid
                item
                xs={12}
                md={6}
                sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}
              >
                <Button variant='outlined'>{i18n.t('admin.tenant_billing_page.k49')}</Button>
                <Button variant='outlined'>{i18n.t('admin.tenant_billing_page.k50')}</Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </PageContainer>
  );
};
export default TenantBillingPage;
