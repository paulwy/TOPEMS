import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Chip,
  Card,
  CardContent,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider,
  Switch,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Building2,
  Users,
  HardDrive,
  Activity,
  Settings,
  CreditCard,
  BarChart3,
  Shield,
  Palette,
  UserPlus,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';
import { DetailPageTemplate } from '@/components/templates';
import CrudPage from '@/components/templates/CrudPage';
import { tenantUserSchema, tenantInvoiceSchema } from '@/schemas/admin';
import { tenantApi } from '@/api/tenant';
import { logger } from '@/utils/logger';
import type {
  Tenant,
  TenantUser,
  TenantStats,
  TenantRole,
  TenantInvoice,
} from '@/api/tenant/types';
import { ADMIN_PATHS } from '@/modules/admin/config';

import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';

const statusLabels: Record<string, string> = {
  active: i18n.t('pages.tenant_detail_page.k0'),
  trial: i18n.t('pages.tenant_detail_page.k1'),
  suspended: i18n.t('pages.tenant_detail_page.k2'),
  deleted: i18n.t('pages.tenant_detail_page.k3'),
};

const planLabels: Record<string, string> = {
  free: i18n.t('pages.tenant_detail_page.k4'),
  basic: i18n.t('pages.tenant_detail_page.k5'),
  professional: i18n.t('pages.tenant_detail_page.k6'),
  enterprise: i18n.t('pages.tenant_detail_page.k7'),
};

const TenantDetailPage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' as TenantRole });
  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  const tenantQuery = useQuery<Tenant | null>({
    queryKey: [...QUERY_KEYS.AD_HOC.ADMIN_TENANT_BASE, tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const res = await tenantApi.getTenant(tenantId);
      return res.success && res.data ? res.data : null;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const statsQuery = useQuery<TenantStats | null>({
    queryKey: [...QUERY_KEYS.AD_HOC.ADMIN_TENANT_STATS_BASE, tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const res = await tenantApi.getTenantStats(tenantId);
      return res.success && res.data ? res.data : null;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const usersQuery = useQuery<{ items: TenantUser[] }>({
    queryKey: [...QUERY_KEYS.AD_HOC.ADMIN_TENANT_USERS_BASE, tenantId],
    queryFn: async () => {
      if (!tenantId) return { items: [] };
      const res = await tenantApi.getTenantUsers(tenantId, { pageSize: 100 });
      if (res.success && res.data) {
        return { items: res.data.items };
      }
      return { items: [] };
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const invoicesQuery = useQuery<TenantInvoice[]>({
    queryKey: [...QUERY_KEYS.AD_HOC.ADMIN_TENANT_INVOICES_BASE, tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const res = await tenantApi.getInvoices(tenantId);
      return res.success && res.data ? res.data : [];
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const tenant = tenantQuery.data ?? null;
  const stats = statsQuery.data ?? null;
  const users = useMemo(() => usersQuery.data?.items ?? [], [usersQuery.data]);
  const invoices = useMemo(() => invoicesQuery.data ?? [], [invoicesQuery.data]);
  const loading = tenantQuery.isLoading;

  useEffect(() => {
    if (tenantQuery.isError) {
      logger.error('Failed to load tenant:', tenantQuery.error);
    }
  }, [tenantQuery.isError, tenantQuery.error]);

  useEffect(() => {
    if (statsQuery.isError) {
      logger.error('Failed to load tenant stats:', statsQuery.error);
    }
  }, [statsQuery.isError, statsQuery.error]);

  useEffect(() => {
    if (usersQuery.isError) {
      logger.error('Failed to load users:', usersQuery.error);
    }
  }, [usersQuery.isError, usersQuery.error]);

  useEffect(() => {
    if (invoicesQuery.isError) {
      logger.error('Failed to load invoices:', invoicesQuery.error);
    }
  }, [invoicesQuery.isError, invoicesQuery.error]);

  const invalidateUsers = () =>
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.ADMIN_TENANT_USERS_BASE,
      exact: false,
      refetchType: 'active',
    });

  const inviteMemberMutation = useMutation({
    mutationFn: (params: { tenantId: string; data: { email: string; role: TenantRole } }) =>
      tenantApi.inviteMember(params.tenantId, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.ADMIN_TENANT_BASE,
        exact: false,
        refetchType: 'active',
      });
      invalidateUsers();
      setShowInviteDialog(false);
      setInviteForm({ email: '', role: 'member' });
    },
    onError: (error: unknown) => {
      logger.error('Failed to invite member:', error);
    },
  });

  const handleInviteMember = () => {
    if (!tenantId) return;
    inviteMemberMutation.mutate({ tenantId, data: inviteForm });
  };

  const overviewContent = useMemo(() => {
    if (!stats || !tenant) return null;

    const statCards = [
      {
        label: i18n.t('pages.tenant_detail_page.k17'),
        value: stats.total_users,
        icon: Users,
        color: 'primary',
      },
      {
        label: i18n.t('pages.tenant_detail_page.k18'),
        value: stats.active_users,
        icon: Activity,
        color: 'success',
      },
      {
        label: i18n.t('pages.tenant_detail_page.k19'),
        value: `${stats.storage_used_gb}/${tenant.settings.max_storage_gb}GB`,
        icon: HardDrive,
        color: 'warning',
      },
      {
        label: i18n.t('pages.tenant_detail_page.30_20'),
        value: stats.last_30d_logins,
        icon: BarChart3,
        color: 'secondary',
      },
    ];

    return (
      <Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
          {statCards.map((stat, index) => (
            <Card
              variant='outlined'
              key={index}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 3,
                      bgcolor: `${stat.color}.main10`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <stat.icon size={24} />
                  </Box>
                  <Box>
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700 }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {stat.label}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Card variant='outlined'>
          <CardContent>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {i18n.t('pages.tenant_detail_page.k2')}
            </Typography>
            <List disablePadding>
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main10' }}>
                    <Users size={20} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={i18n.t('pages.tenant_detail_page.k21')}
                  secondary={`${i18n.t('pages.tenant_detail_page.k3')} ${stats.total_users} ${i18n.t('pages.tenant_detail_page.k4')} ${tenant.settings.max_users}`}
                />
                <ListItemSecondaryAction>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {Math.round((stats.total_users / tenant.settings.max_users) * 100)}%
                  </Typography>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider component='li' />
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'success.main10' }}>
                    <HardDrive size={20} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={i18n.t('pages.tenant_detail_page.k22')}
                  secondary={`${i18n.t('pages.tenant_detail_page.k5')} ${stats.storage_used_gb}${i18n.t('pages.tenant_detail_page.gb_6')} ${tenant.settings.max_storage_gb}GB`}
                />
                <ListItemSecondaryAction>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {Math.round((stats.storage_used_gb / tenant.settings.max_storage_gb) * 100)}%
                  </Typography>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider component='li' />
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'warning.main10' }}>
                    <Activity size={20} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={i18n.t('pages.tenant_detail_page.api_7')}
                  secondary={`${i18n.t('pages.tenant_detail_page.k8')} ${stats.api_requests_today.toLocaleString()} ${i18n.t('pages.tenant_detail_page.k9')} ${tenant.settings.max_api_requests_per_day.toLocaleString()}`}
                />
                <ListItemSecondaryAction>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {Math.round(
                      (stats.api_requests_today / tenant.settings.max_api_requests_per_day) * 100
                    )}
                    %
                  </Typography>
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Box>
    );
  }, [stats, tenant]);

  const membersContent = useMemo(
    () => (
      <CrudPage
        schema={tenantUserSchema}
        apiAdapter={{
          list: async () => ({ data: users, total: users.length }),
          create: async () => ({}) as TenantUser,
          update: async (id, data) => {
            if (data.role && tenantId) {
              await tenantApi.updateMemberRole(tenantId, id, { role: data.role as TenantRole });
            }
            return {} as TenantUser;
          },
          delete: async (id) => {
            if (tenantId) {
              await tenantApi.removeMember(tenantId, id);
            }
          },
        }}
        breadcrumbs={[]}
        headerContent={
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant='h6'>{i18n.t('pages.tenant_detail_page.k23')}</Typography>
            <Button
              variant='contained'
              startIcon={<UserPlus size={18} />}
              onClick={() => setShowInviteDialog(true)}
            >
              {i18n.t('pages.tenant_detail_page.k10')}
            </Button>
          </Box>
        }
      />
    ),
    [users, tenantId]
  );

  const settingsContent = useMemo(() => {
    if (!tenant) return null;

    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
        <Card variant='outlined'>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Palette size={20} />
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('pages.tenant_detail_page.k11')}
              </Typography>
            </Box>
            <List disablePadding>
              <ListItem sx={{ px: 0 }}>
                <ListItemText
                  primary={i18n.t('pages.tenant_detail_page.k24')}
                  secondary={tenant.settings.branding.primary_color}
                />
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    bgcolor: tenant.settings.branding.primary_color,
                  }}
                />
              </ListItem>
              <Divider component='li' />
              <ListItem sx={{ px: 0 }}>
                <ListItemText
                  secondary={tenant.settings.branding.secondary_color}
                  primary={i18n.t('pages.tenant_detail_page.k25')}
                />
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 1,
                    bgcolor: tenant.settings.branding.secondary_color,
                  }}
                />
              </ListItem>
              <Divider component='li' />
              <ListItem sx={{ px: 0 }}>
                <ListItemText
                  primary={i18n.t('pages.tenant_detail_page.k26')}
                  secondary={
                    tenant.settings.branding.custom_domain || i18n.t('pages.tenant_detail_page.k27')
                  }
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
        <Card variant='outlined'>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Shield size={20} />
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('pages.tenant_detail_page.k12')}
              </Typography>
            </Box>
            <List disablePadding>
              <ListItem sx={{ px: 0 }}>
                <ListItemText primary={i18n.t('pages.tenant_detail_page.sso_13')} />
                <Switch
                  checked={tenant.settings.security.sso_enabled}
                  disabled
                />
              </ListItem>
              <Divider component='li' />
              <ListItem sx={{ px: 0 }}>
                <ListItemText primary={i18n.t('pages.tenant_detail_page.k28')} />
                <Switch
                  checked={tenant.settings.security.two_factor_required}
                  disabled
                />
              </ListItem>
              <Divider component='li' />
              <ListItem sx={{ px: 0 }}>
                <ListItemText primary={i18n.t('pages.tenant_detail_page.ip_14')} />
                <Switch
                  checked={tenant.settings.security.ip_whitelist_enabled}
                  disabled
                />
              </ListItem>
              <Divider component='li' />
              <ListItem sx={{ px: 0 }}>
                <ListItemText
                  primary={i18n.t('pages.tenant_detail_page.k29')}
                  secondary={`${tenant.settings.security.session_timeout_minutes} ${i18n.t('pages.tenant_detail_page.k15')}`}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Card variant='outlined'>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Settings size={20} />
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  {i18n.t('pages.tenant_detail_page.k16')}
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                {Object.entries(tenant.settings.features).map(([key, value]) => (
                  <Card
                    variant='outlined'
                    sx={{ bgcolor: 'background.default' }}
                    key={key}
                  >
                    <CardContent sx={{ py: 1.5 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography variant='body2'>{key}</Typography>
                        {value ? (
                          <CheckCircle
                            size={18}
                            color='green'
                          />
                        ) : (
                          <XCircle
                            size={18}
                            color='gray'
                          />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    );
  }, [tenant]);

  const billingContent = useMemo(() => {
    if (!tenant) return null;

    return (
      <Box>
        <Card
          variant='outlined'
          sx={{ mb: 3 }}
        >
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <CreditCard size={20} />
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('pages.tenant_detail_page.k17')}
              </Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('pages.tenant_detail_page.k18')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  {planLabels[tenant.plan]}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('pages.tenant_detail_page.k19')}
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  2024-01-15
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('pages.tenant_detail_page.k20')}
                </Typography>
                <Chip
                  label={i18n.t('pages.tenant_detail_page.k30')}
                  color='success'
                  size='small'
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        <CrudPage
          schema={tenantInvoiceSchema}
          apiAdapter={{
            list: async () => ({ data: invoices, total: invoices.length }),
            create: async () => ({}) as TenantInvoice,
            update: async () => ({}) as TenantInvoice,
            delete: async () => {},
          }}
          breadcrumbs={[]}
          headerContent={
            <Typography variant='h6'>{i18n.t('pages.tenant_detail_page.k31')}</Typography>
          }
        />
      </Box>
    );
  }, [tenant, invoices]);

  const infoCard = useMemo(() => {
    if (!tenant) return;

    return {
      avatar: (
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: 3,
            bgcolor: `${tenant.settings.branding.primary_color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Building2
            size={36}
            style={{ color: tenant.settings.branding.primary_color }}
          />
        </Box>
      ),
      title: tenant.name,
      subtitle: tenant.slug,
      tags: [statusLabels[tenant.status], planLabels[tenant.plan]],
    };
  }, [tenant]);

  const tabs = useMemo(
    () => [
      {
        id: 'overview',
        label: i18n.t('pages.tenant_detail_page.k32'),
        icon: <BarChart3 size={18} />,
        content: overviewContent,
      },
      {
        id: 'members',
        label: i18n.t('pages.tenant_detail_page.k33'),
        icon: <Users size={18} />,
        content: membersContent,
      },
      {
        id: 'settings',
        label: i18n.t('pages.tenant_detail_page.k34'),
        icon: <Settings size={18} />,
        content: settingsContent,
      },
      {
        id: 'billing',
        label: i18n.t('pages.tenant_detail_page.k35'),
        icon: <CreditCard size={18} />,
        content: billingContent,
      },
    ],
    [overviewContent, membersContent, settingsContent, billingContent]
  );

  if (loading || !tenant) {
    return (
      <PageContainer loading>
        <Box />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Building2 size={20} />,
      }}
    >
      <DetailPageTemplate
        title={tenant.name}
        subtitle={tenant.slug}
        detailItemName={tenant?.name || tenant?.slug || i18n.t('pages.tenant_detail_page.k36')}
        loading={loading}
        backHref={ADMIN_PATHS.tenant}
        infoCard={infoCard}
        tabs={tabs}
        defaultTab='overview'
        onRefresh={() => {
          tenantQuery.refetch();
          statsQuery.refetch();
        }}
      />

      <Dialog
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{i18n.t('pages.tenant_detail_page.k37')}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={i18n.t('pages.tenant_detail_page.k38')}
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              fullWidth
              type='email'
            />
            <FormControl fullWidth>
              <InputLabel>{i18n.t('pages.tenant_detail_page.k39')}</InputLabel>
              <Select
                value={inviteForm.role}
                label={i18n.t('pages.tenant_detail_page.k40')}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, role: e.target.value as TenantRole })
                }
              >
                <MenuItem value='owner'>{i18n.t('pages.tenant_detail_page.k41')}</MenuItem>
                <MenuItem value='admin'>{i18n.t('pages.tenant_detail_page.k42')}</MenuItem>
                <MenuItem value='member'>{i18n.t('pages.tenant_detail_page.k43')}</MenuItem>
                <MenuItem value='guest'>{i18n.t('pages.tenant_detail_page.k44')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInviteDialog(false)}>
            {i18n.t('pages.tenant_detail_page.k45')}
          </Button>
          <Button
            variant='contained'
            onClick={handleInviteMember}
          >
            {i18n.t('pages.tenant_detail_page.k21')}
          </Button>
        </DialogActions>
      </Dialog>

      {confirmConfig && (
        <ConfirmDialog
          isOpen={confirmDialogOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          danger={confirmConfig.danger}
          onConfirm={confirmConfig.onConfirm}
          onClose={setConfirmDialogClosed}
        />
      )}
    </PageContainer>
  );
};

export default TenantDetailPage;
