import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import { tenantUserSchema, tenantInvoiceSchema } from '@/schemas/admin';
import { tenantApi } from '@/api/tenant';
import { logger } from '@/utils/logger';
import type {
  Tenant,
  TenantUser,
  TenantStats,
  TenantRole,
  UserStatus,
  TenantInvoice,
} from '@/api/tenant/types';
import { ADMIN_PATHS } from '@/modules/admin/config';

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  trial: 'warning',
  suspended: 'error',
  deleted: 'default',
};

const statusLabels: Record<string, string> = {
  active: '已激活',
  trial: '试用中',
  suspended: '已停用',
  deleted: '已删除',
};

const planLabels: Record<string, string> = {
  free: '免费版',
  basic: '基础版',
  professional: '专业版',
  enterprise: '企业版',
};

const roleLabels: Record<TenantRole, string> = {
  owner: '所有者',
  admin: '管理员',
  member: '成员',
  guest: '访客',
};

const userStatusLabels: Record<UserStatus, string> = {
  active: '活跃',
  invited: '已邀请',
  suspended: '已停用',
};

const userStatusColors: Record<UserStatus, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  invited: 'warning',
  suspended: 'error',
};

const TenantDetailPage: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const queryClient = useQueryClient();

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' as TenantRole });
  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  const tenantQuery = useQuery<Tenant | null>({
    queryKey: ['admin-tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const res = await tenantApi.getTenant(tenantId);
      return res.success && res.data ? res.data : null;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const statsQuery = useQuery<TenantStats | null>({
    queryKey: ['admin-tenant-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const res = await tenantApi.getTenantStats(tenantId);
      return res.success && res.data ? res.data : null;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const usersQuery = useQuery<{ items: TenantUser[] }>({
    queryKey: ['admin-tenant-users', tenantId],
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
    queryKey: ['admin-tenant-invoices', tenantId],
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
  const users = usersQuery.data?.items ?? [];
  const invoices = invoicesQuery.data ?? [];
  const loading = tenantQuery.isLoading;
  const usersLoading = usersQuery.isLoading;

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

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['admin-tenant-users'] });

  const inviteMemberMutation = useMutation({
    mutationFn: (params: { tenantId: string; data: { email: string; role: TenantRole } }) =>
      tenantApi.inviteMember(params.tenantId, params.data),
    onSuccess: () => {
      invalidateUsers();
      setShowInviteDialog(false);
      setInviteForm({ email: '', role: 'member' });
    },
    onError: (error: unknown) => {
      logger.error('Failed to invite member:', error);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (params: { tenantId: string; userId: string }) =>
      tenantApi.removeMember(params.tenantId, params.userId),
    onSuccess: () => {
      invalidateUsers();
      setConfirmDialogClosed();
    },
    onError: (error: unknown) => {
      logger.error('Failed to remove member:', error);
    },
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: (params: { tenantId: string; userId: string; role: TenantRole }) =>
      tenantApi.updateMemberRole(params.tenantId, params.userId, { role: params.role }),
    onSuccess: () => {
      invalidateUsers();
    },
    onError: (error: unknown) => {
      logger.error('Failed to update member role:', error);
    },
  });

  const handleInviteMember = () => {
    if (!tenantId) return;
    inviteMemberMutation.mutate({ tenantId, data: inviteForm });
  };

  const handleRemoveMember = useCallback(
    (user: TenantUser) => {
      openConfirmDialog({
        title: '确认移除成员',
        message: `确定要移除成员"${user.email}"吗？`,
        danger: true,
        onConfirm: () => {
          if (!tenantId) return;
          removeMemberMutation.mutate({ tenantId, userId: user.id });
        },
      });
    },
    [tenantId, removeMemberMutation, openConfirmDialog]
  );

  const handleUpdateMemberRole = (userId: string, role: TenantRole) => {
    if (!tenantId) return;
    updateMemberRoleMutation.mutate({ tenantId, userId, role });
  };

  const overviewContent = useMemo(() => {
    if (!stats || !tenant) return null;

    const statCards = [
      { label: '总用户数', value: stats.total_users, icon: Users, color: 'primary' },
      { label: '活跃用户', value: stats.active_users, icon: Activity, color: 'success' },
      {
        label: '存储使用',
        value: `${stats.storage_used_gb}/${tenant.settings.max_storage_gb}GB`,
        icon: HardDrive,
        color: 'warning',
      },
      { label: '近30天登录', value: stats.last_30d_logins, icon: BarChart3, color: 'secondary' },
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
              套餐配额
            </Typography>
            <List disablePadding>
              <ListItem sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main10' }}>
                    <Users size={20} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary='用户配额'
                  secondary={`当前 ${stats.total_users} / 上限 ${tenant.settings.max_users}`}
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
                  primary='存储空间'
                  secondary={`已用 ${stats.storage_used_gb}GB / 上限 ${tenant.settings.max_storage_gb}GB`}
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
                  primary='API 请求'
                  secondary={`今日 ${stats.api_requests_today.toLocaleString()} / 上限 ${tenant.settings.max_api_requests_per_day.toLocaleString()}`}
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
            <Typography variant='h6'>成员管理</Typography>
            <Button
              variant='contained'
              startIcon={<UserPlus size={18} />}
              onClick={() => setShowInviteDialog(true)}
            >
              邀请成员
            </Button>
          </Box>
        }
      />
    ),
    [users, usersLoading, tenantId]
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
                品牌设置
              </Typography>
            </Box>
            <List disablePadding>
              <ListItem sx={{ px: 0 }}>
                <ListItemText
                  primary='主色调'
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
                  primary='辅助色'
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
                  primary='自定义域名'
                  secondary={tenant.settings.branding.custom_domain || '未设置'}
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
                安全设置
              </Typography>
            </Box>
            <List disablePadding>
              <ListItem sx={{ px: 0 }}>
                <ListItemText primary='SSO 单点登录' />
                <Switch
                  checked={tenant.settings.security.sso_enabled}
                  disabled
                />
              </ListItem>
              <Divider component='li' />
              <ListItem sx={{ px: 0 }}>
                <ListItemText primary='强制双因素认证' />
                <Switch
                  checked={tenant.settings.security.two_factor_required}
                  disabled
                />
              </ListItem>
              <Divider component='li' />
              <ListItem sx={{ px: 0 }}>
                <ListItemText primary='IP 白名单' />
                <Switch
                  checked={tenant.settings.security.ip_whitelist_enabled}
                  disabled
                />
              </ListItem>
              <Divider component='li' />
              <ListItem sx={{ px: 0 }}>
                <ListItemText
                  primary='会话超时时间'
                  secondary={`${tenant.settings.security.session_timeout_minutes} 分钟`}
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
                  功能开关
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
                当前订阅
              </Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  套餐
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
                  下次计费
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
                  状态
                </Typography>
                <Chip
                  label='正常'
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
          headerContent={<Typography variant='h6'>账单历史</Typography>}
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
        label: '概览',
        icon: <BarChart3 size={18} />,
        content: overviewContent,
      },
      {
        id: 'members',
        label: '成员',
        icon: <Users size={18} />,
        content: membersContent,
      },
      {
        id: 'settings',
        label: '配置',
        icon: <Settings size={18} />,
        content: settingsContent,
      },
      {
        id: 'billing',
        label: '计费',
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
        <DialogTitle>邀请成员</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label='邮箱地址'
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              fullWidth
              type='email'
            />
            <FormControl fullWidth>
              <InputLabel>角色</InputLabel>
              <Select
                value={inviteForm.role}
                label='角色'
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, role: e.target.value as TenantRole })
                }
              >
                <MenuItem value='owner'>所有者</MenuItem>
                <MenuItem value='admin'>管理员</MenuItem>
                <MenuItem value='member'>成员</MenuItem>
                <MenuItem value='guest'>访客</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInviteDialog(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleInviteMember}
          >
            发送邀请
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
