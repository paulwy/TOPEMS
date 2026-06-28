import React, { useState, useEffect } from 'react';
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
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Alert,
} from '@mui/material';
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
import { PageContainer, DataTable, Grid } from '@/components/common';
import { tenantApi } from '@/api/tenant';
import type { TenantInvoice, Tenant, UsageMetrics, TenantBillingInfo } from '@/api/tenant/types';
import type { ColumnDef } from '@tanstack/react-table';

const plans = [
  {
    id: 'free',
    name: '免费版',
    price: 0,
    description: '适合个人和小团队试用',
    features: [
      { name: '最多 5 个用户', included: true },
      { name: '5 GB 存储空间', included: true },
      { name: '1000 次 API 调用/天', included: true },
      { name: '基础功能模块', included: true },
      { name: '社区支持', included: true },
      { name: '高级报表', included: false },
      { name: 'SSO 单点登录', included: false },
      { name: '自定义品牌', included: false },
      { name: '专属客户经理', included: false },
    ],
    icon: Users,
    color: 'default',
  },
  {
    id: 'basic',
    name: '基础版',
    price: 299,
    description: '适合小型企业使用',
    features: [
      { name: '最多 25 个用户', included: true },
      { name: '50 GB 存储空间', included: true },
      { name: '50,000 次 API 调用/天', included: true },
      { name: '全部功能模块', included: true },
      { name: '邮件支持', included: true },
      { name: '高级报表', included: true },
      { name: 'SSO 单点登录', included: false },
      { name: '自定义品牌', included: false },
      { name: '专属客户经理', included: false },
    ],
    icon: Building2,
    color: 'primary',
  },
  {
    id: 'professional',
    name: '专业版',
    price: 999,
    description: '适合中型企业使用',
    popular: true,
    features: [
      { name: '最多 100 个用户', included: true },
      { name: '200 GB 存储空间', included: true },
      { name: '200,000 次 API 调用/天', included: true },
      { name: '全部功能模块', included: true },
      { name: '优先技术支持', included: true },
      { name: '高级报表', included: true },
      { name: 'SSO 单点登录', included: true },
      { name: '自定义品牌', included: true },
      { name: '专属客户经理', included: false },
    ],
    icon: Zap,
    color: 'secondary',
  },
  {
    id: 'enterprise',
    name: '企业版',
    price: '定制',
    description: '适合大型企业定制',
    features: [
      { name: '无限用户数', included: true },
      { name: '无限存储空间', included: true },
      { name: '无限 API 调用', included: true },
      { name: '全部功能模块', included: true },
      { name: '7x24 专属支持', included: true },
      { name: '高级报表', included: true },
      { name: 'SSO 单点登录', included: true },
      { name: '自定义品牌', included: true },
      { name: '专属客户经理', included: true },
    ],
    icon: Crown,
    color: 'success',
  },
];

const TenantBillingPage: React.FC = () => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [billingInfo, setBillingInfo] = useState<TenantBillingInfo | null>(null);
  const [invoices, setInvoices] = useState<TenantInvoice[]>([]);
  const [usage, setUsage] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      const contextRes = await tenantApi.getCurrentTenantContext();
      if (contextRes.success && contextRes.data) {
        const [tenantRes, billingRes, invoicesRes, usageRes] = await Promise.all([
          tenantApi.getTenant(contextRes.data.tenant_id),
          tenantApi.getBillingInfo(contextRes.data.tenant_id),
          tenantApi.getInvoices(contextRes.data.tenant_id),
          tenantApi.getUsageMetrics(contextRes.data.tenant_id),
        ]);

        if (tenantRes.success && tenantRes.data) {
          setTenant(tenantRes.data);
        }
        if (billingRes.success && billingRes.data) {
          setBillingInfo(billingRes.data);
        }
        if (invoicesRes.success && invoicesRes.data) {
          setInvoices(invoicesRes.data);
        }
        if (usageRes.success && usageRes.data) {
          setUsage(usageRes.data);
        }
      }
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const invoiceColumns: ColumnDef<TenantInvoice>[] = [
    {
      accessorKey: 'id',
      header: '账单编号',
      cell: ({ row }) => (
        <Typography variant='body2' sx={{ fontWeight: 500 }}>
          {row.original.id}
        </Typography>
      ),
    },
    {
      accessorKey: 'period_start',
      header: '账单周期',
      cell: ({ row }) => (
        <Typography variant='body2' color='text.secondary'>
          {new Date(row.original.period_start).toLocaleDateString('zh-CN')} -{' '}
          {new Date(row.original.period_end).toLocaleDateString('zh-CN')}
        </Typography>
      ),
    },
    {
      accessorKey: 'amount',
      header: '金额',
      cell: ({ row }) => (
        <Typography variant='body2' sx={{ fontWeight: 600 }}>
          ¥{row.original.amount.toLocaleString()}
        </Typography>
      ),
    },
    {
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <Chip
          label={
            row.original.status === 'paid'
              ? '已支付'
              : row.original.status === 'pending'
              ? '待支付'
              : row.original.status === 'failed'
              ? '支付失败'
              : '草稿'
          }
          color={
            row.original.status === 'paid'
              ? 'success'
              : row.original.status === 'pending'
              ? 'warning'
              : row.original.status === 'failed'
              ? 'error'
              : 'default'
          }
          size='small'
        />
      ),
    },
    {
      accessorKey: 'paid_at',
      header: '支付时间',
      cell: ({ row }) => (
        <Typography variant='body2' color='text.secondary'>
          {row.original.paid_at
            ? new Date(row.original.paid_at).toLocaleDateString('zh-CN')
            : '-'}
        </Typography>
      ),
    },
    {
      accessorKey: 'actions',
      header: '操作',
      cell: () => (
        <IconButton size='small' title='下载发票'>
          <Download size={16} />
        </IconButton>
      ),
    },
  ];

  if (loading || !tenant) {
    return (
      <PageContainer title='订阅与计费' loading>
        <Box />
      </PageContainer>
    );
  }

  const currentPlan = plans.find((p) => p.id === tenant.plan) || plans[0];

  return (
    <PageContainer title='订阅与计费' subtitle='管理您的订阅套餐和账单'>
      <Alert severity='info' sx={{ mb: 3 }}>
        当前套餐：<strong>{currentPlan.name}</strong> - 下次计费日期：
        <strong>{billingInfo ? new Date(billingInfo.next_billing_date).toLocaleDateString('zh-CN') : '-'}</strong>
      </Alert>

      <Box sx={{ mb: 4 }}>
        <Typography variant='h6' sx={{ fontWeight: 600,  mb: 2 }}>
          使用情况
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Users size={20} style={{ opacity: 0.7 }} />
                  <Typography variant='subtitle2' color='text.secondary'>
                    用户数
                  </Typography>
                </Box>
                <Typography variant='h4' sx={{ fontWeight: 700,  mb: 1 }}>
                  {usage?.users_count || 0}
                  <Typography component='span' variant='body2' color='text.secondary'>
                    /{tenant.settings.max_users}
                  </Typography>
                </Typography>
                <LinearProgress
                  variant='determinate'
                  value={Math.min(((usage?.users_count || 0) / tenant.settings.max_users) * 100, 100)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <HardDrive size={20} style={{ opacity: 0.7 }} />
                  <Typography variant='subtitle2' color='text.secondary'>
                    存储空间
                  </Typography>
                </Box>
                <Typography variant='h4' sx={{ fontWeight: 700,  mb: 1 }}>
                  {usage?.storage_used_gb.toFixed(1) || 0}
                  <Typography component='span' variant='body2' color='text.secondary'>
                    GB/{tenant.settings.max_storage_gb}GB
                  </Typography>
                </Typography>
                <LinearProgress
                  variant='determinate'
                  value={Math.min(((usage?.storage_used_gb || 0) / tenant.settings.max_storage_gb) * 100, 100)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Activity size={20} style={{ opacity: 0.7 }} />
                  <Typography variant='subtitle2' color='text.secondary'>
                    API 调用（今日）
                  </Typography>
                </Box>
                <Typography variant='h4' sx={{ fontWeight: 700,  mb: 1 }}>
                  {(usage?.api_requests_today || 0).toLocaleString()}
                </Typography>
                <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
                  上限 {tenant.settings.max_api_requests_per_day.toLocaleString()} 次/天
                </Typography>
                <LinearProgress
                  variant='determinate'
                  value={Math.min(
                    ((usage?.api_requests_today || 0) / tenant.settings.max_api_requests_per_day) * 100,
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
          <Typography variant='h6' sx={{ fontWeight: 600 }}>
            套餐选择
          </Typography>
        </Box>
        <Grid container spacing={2}>
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === tenant.plan;
            return (
              <Grid item xs={12} sm={6} md={3} key={plan.id}>
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
                      label='最受欢迎'
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
                      <Typography variant='h6' sx={{ fontWeight: 600 }}>
                        {plan.name}
                      </Typography>
                    </Box>
                    <Typography variant='h4' sx={{ fontWeight: 700,  mb: 1 }}>
                      {typeof plan.price === 'number' ? `¥${plan.price}` : plan.price}
                      {typeof plan.price === 'number' && (
                        <Typography component='span' variant='body2' color='text.secondary'>
                          /月
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                      {plan.description}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <List disablePadding dense>
                      {plan.features.map((feature, idx) => (
                        <ListItem key={idx} sx={{ px: 0, py: 0.5 }}>
                          {feature.included ? (
                            <Check size={16} color='green' style={{ marginRight: 8, flexShrink: 0 }} />
                          ) : (
                            <X size={16} color='gray' style={{ marginRight: 8, flexShrink: 0, opacity: 0.5 }} />
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
                        <Button fullWidth variant='outlined' disabled>
                          当前套餐
                        </Button>
                      ) : (
                        <Button
                          fullWidth
                          variant='contained'
                          endIcon={<ArrowUpRight size={16} />}
                          disabled={plan.id === 'enterprise' ? false : false}
                        >
                          {plan.id === 'enterprise' ? '联系销售' : '升级套餐'}
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

      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600,  mb: 2 }}>
          账单历史
        </Typography>
        <Card variant='outlined'>
          <CardContent sx={{ p: 0 }}>
            <DataTable<TenantInvoice, unknown>
              columns={invoiceColumns}
              data={invoices}
              showSearch={false}
              showFilters={false}
              enablePagination
              totalItems={invoices.length}
              pageSize={10}
              currentPage={1}
              onPageChange={() => {}}
              onPageSizeChange={() => {}}
            />
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Card variant='outlined'>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <CreditCard size={24} />
              <Typography variant='h6' sx={{ fontWeight: 600 }}>
                支付方式
              </Typography>
            </Box>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <CreditCard size={32} />
                  <Box>
                    <Typography variant='body2' sx={{ fontWeight: 500 }}>
                      •••• •••• •••• 4242
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      到期 12/2025
                    </Typography>
                  </Box>
                  <Chip label='默认' size='small' color='primary' sx={{ ml: 'auto' }} />
                </Box>
              </Grid>
              <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button variant='outlined'>更换支付方式</Button>
                <Button variant='outlined'>添加支付方式</Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </PageContainer>
  );
};

export default TenantBillingPage;
