import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  FormControlLabel,
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
  Trash2,
  Download,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageContainer } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import {
  DetailPageTemplate,
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
} from '@/components/templates';
import { tenantApi } from '@/api/tenant';
import type {
  Tenant,
  TenantUser,
  TenantStats,
  TenantRole,
  UserStatus,
  TenantInvoice,
} from '@/api/tenant/types';

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
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [invoices, setInvoices] = useState<TenantInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' as TenantRole });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  useEffect(() => {
    if (tenantId) {
      loadTenantData();
    }
  }, [tenantId]);

  const loadTenantData = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [tenantRes, statsRes] = await Promise.all([
        tenantApi.getTenant(tenantId),
        tenantApi.getTenantStats(tenantId),
      ]);
      if (tenantRes.success && tenantRes.data) {
        setTenant(tenantRes.data);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (error) {
      console.error('Failed to load tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = useCallback(async () => {
    if (!tenantId) return;
    setUsersLoading(true);
    try {
      const res = await tenantApi.getTenantUsers(tenantId, { pageSize: 100 });
      if (res.success && res.data) {
        setUsers(res.data.items);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setUsersLoading(false);
    }
  }, [tenantId]);

  const loadInvoices = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await tenantApi.getInvoices(tenantId);
      if (res.success && res.data) {
        setInvoices(res.data);
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
    }
  }, [tenantId]);

  const handleInviteMember = async () => {
    if (!tenantId) return;
    try {
      const res = await tenantApi.inviteMember(tenantId, inviteForm);
      if (res.success) {
        setShowInviteDialog(false);
        setInviteForm({ email: '', role: 'member' });
        loadUsers();
      }
    } catch (error) {
      console.error('Failed to invite member:', error);
    }
  };

  const handleRemoveMember = useCallback(
    (user: TenantUser) => {
      setConfirmConfig({
        title: '确认移除成员',
        message: `确定要移除成员"${user.email}"吗？`,
        danger: true,
        onConfirm: async () => {
          if (!tenantId) return;
          try {
            await tenantApi.removeMember(tenantId, user.id);
            setConfirmDialogOpen(false);
            loadUsers();
          } catch (error) {
            console.error('Failed to remove member:', error);
          }
        },
      });
      setConfirmDialogOpen(true);
    },
    [tenantId, loadUsers]
  );

  const handleUpdateMemberRole = async (userId: string, role: TenantRole) => {
    if (!tenantId) return;
    try {
      await tenantApi.updateMemberRole(tenantId, userId, { role });
      loadUsers();
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  };

  const userColumns: ColumnDef<TenantUser>[] = useMemo(
    () => [
      {
        id: 'email',
        label: '成员',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 36, height: 36, fontSize: 14 }}>
              {row.email.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {row.email}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {row.role}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        id: 'role',
        label: '角色',
        render: (row) => (
          <FormControl
            size='small'
            sx={{ minWidth: 100 }}
          >
            <Select
              value={row.role}
              size='small'
              onChange={(e) => handleUpdateMemberRole(row.id, e.target.value as TenantRole)}
            >
              <MenuItem value='owner'>所有者</MenuItem>
              <MenuItem value='admin'>管理员</MenuItem>
              <MenuItem value='member'>成员</MenuItem>
              <MenuItem value='guest'>访客</MenuItem>
            </Select>
          </FormControl>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => (
          <Chip
            label={userStatusLabels[row.status as UserStatus]}
            color={userStatusColors[row.status as UserStatus]}
            size='small'
          />
        ),
      },
      {
        id: 'created_at',
        label: '加入时间',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.created_at ? new Date(row.created_at).toLocaleDateString('zh-CN') : '-'}
          </Typography>
        ),
      },
      {
        id: 'last_login',
        label: '最近登录',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.last_login ? new Date(row.last_login).toLocaleDateString('zh-CN') : '从未登录'}
          </Typography>
        ),
      },
    ],
    []
  );

  const userRowActions: RowAction<TenantUser>[] = useMemo(
    () => [
      {
        label: '移除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleRemoveMember(row),
        confirm: true,
        confirmMessage: '确定要移除该成员吗？',
      },
    ],
    [handleRemoveMember]
  );

  const invoiceColumns: ColumnDef<TenantInvoice>[] = useMemo(
    () => [
      {
        id: 'id',
        label: '账单编号',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {row.id}
          </Typography>
        ),
      },
      {
        id: 'period',
        label: '账单周期',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.period_start ? new Date(row.period_start).toLocaleDateString('zh-CN') : '-'} -{' '}
            {row.period_end ? new Date(row.period_end).toLocaleDateString('zh-CN') : '-'}
          </Typography>
        ),
      },
      {
        id: 'amount',
        label: '金额',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 600 }}
          >
            ¥{row.amount?.toLocaleString() || 0}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => {
          const statusMap: Record<
            string,
            { label: string; color: 'success' | 'warning' | 'error' | 'default' }
          > = {
            paid: { label: '已支付', color: 'success' },
            pending: { label: '待支付', color: 'warning' },
            failed: { label: '支付失败', color: 'error' },
            draft: { label: '草稿', color: 'default' },
          };
          const status = statusMap[row.status || 'draft'];
          return (
            <Chip
              label={status.label}
              color={status.color}
              size='small'
            />
          );
        },
      },
      {
        id: 'paid_at',
        label: '支付时间',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.paid_at ? new Date(row.paid_at).toLocaleDateString('zh-CN') : '-'}
          </Typography>
        ),
      },
    ],
    []
  );

  const invoiceRowActions: RowAction<TenantInvoice>[] = useMemo(
    () => [
      {
        label: '下载',
        icon: <Download size={16} />,
        onClick: () => {},
      },
    ],
    []
  );

  const handleTabChange = useCallback(
    (tabId: string) => {
      if (tabId === 'members' && users.length === 0) {
        loadUsers();
      }
      if (tabId === 'billing' && invoices.length === 0) {
        loadInvoices();
      }
    },
    [users.length, invoices.length, loadUsers, loadInvoices]
  );

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
      <ListPageTemplate
        columns={userColumns}
        data={users}
        loading={usersLoading}
        rowActions={userRowActions}
        actions={[
          {
            label: '邀请成员',
            icon: <UserPlus size={20} />,
            onClick: () => setShowInviteDialog(true),
          },
        ]}
        onRefresh={loadUsers}
      />
    ),
    [userColumns, users, usersLoading, userRowActions, loadUsers]
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

        <ListPageTemplate
          columns={invoiceColumns}
          data={invoices}
          rowActions={invoiceRowActions}
          title='账单历史'
        />
      </Box>
    );
  }, [tenant, invoices, invoiceColumns, invoiceRowActions]);

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
        backHref='/admin/tenants'
        infoCard={infoCard}
        tabs={tabs}
        defaultTab='overview'
        onRefresh={loadTenantData}
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
          onClose={() => setConfirmDialogOpen(false)}
        />
      )}
    </PageContainer>
  );
};

export default TenantDetailPage;
