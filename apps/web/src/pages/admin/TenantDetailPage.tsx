import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Chip,
  Tab,
  Tabs,
  Card,
  CardContent,
  Avatar,
  IconButton,
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
  ArrowLeft,
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
  Edit,
  Trash2,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Download,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageContainer, DataTable, Grid } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { tenantApi } from '@/api/tenant';
import type {
  Tenant,
  TenantUser,
  TenantStats,
  TenantRole,
  UserStatus,
  TenantInvoice,
} from '@/api/tenant/types';
import type { ColumnDef } from '@tanstack/react-table';

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
  const [activeTab, setActiveTab] = useState(0);
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

  const loadUsers = async () => {
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
  };

  const loadInvoices = async () => {
    if (!tenantId) return;
    try {
      const res = await tenantApi.getInvoices(tenantId);
      if (res.success && res.data) {
        setInvoices(res.data);
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 1 && users.length === 0) {
      loadUsers();
    }
    if (activeTab === 3 && invoices.length === 0) {
      loadInvoices();
    }
  }, [activeTab]);

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

  const handleRemoveMember = (user: TenantUser) => {
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
  };

  const handleUpdateMemberRole = async (userId: string, role: TenantRole) => {
    if (!tenantId) return;
    try {
      await tenantApi.updateMemberRole(tenantId, userId, { role });
      loadUsers();
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  };

  const userColumns: ColumnDef<TenantUser>[] = [
    {
      accessorKey: 'email',
      header: '成员',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 36, height: 36, fontSize: 14 }}>
            {row.original.email.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant='body2' sx={{ fontWeight: 500 }}>
              {row.original.email}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {row.original.role}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      accessorKey: 'role',
      header: '角色',
      cell: ({ row }) => (
        <FormControl size='small' sx={{ minWidth: 100 }}>
          <Select
            value={row.original.role}
            size='small'
            onChange={(e) =>
              handleUpdateMemberRole(row.original.id, e.target.value as TenantRole)
            }
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
      accessorKey: 'status',
      header: '状态',
      cell: ({ row }) => (
        <Chip
          label={userStatusLabels[row.original.status as UserStatus]}
          color={userStatusColors[row.original.status as UserStatus]}
          size='small'
        />
      ),
    },
    {
      accessorKey: 'created_at',
      header: '加入时间',
      cell: ({ row }) => (
        <Typography variant='body2' color='text.secondary'>
          {new Date(row.original.created_at).toLocaleDateString('zh-CN')}
        </Typography>
      ),
    },
    {
      accessorKey: 'last_login',
      header: '最近登录',
      cell: ({ row }) => (
        <Typography variant='body2' color='text.secondary'>
          {row.original.last_login
            ? new Date(row.original.last_login).toLocaleDateString('zh-CN')
            : '从未登录'}
        </Typography>
      ),
    },
    {
      accessorKey: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <IconButton
          size='small'
          color='error'
          onClick={() => handleRemoveMember(row.original)}
          title='移除'
        >
          <Trash2 size={16} />
        </IconButton>
      ),
    },
  ];

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
        <IconButton size='small' title='下载'>
          <Download size={16} />
        </IconButton>
      ),
    },
  ];

  if (loading || !tenant) {
    return (
      <PageContainer title='租户详情' loading>
        <Box />
      </PageContainer>
    );
  }

  const tabs = [
    { label: '概览', icon: <BarChart3 size={18} /> },
    { label: '成员', icon: <Users size={18} /> },
    { label: '配置', icon: <Settings size={18} /> },
    { label: '计费', icon: <CreditCard size={18} /> },
  ];

  return (
    <PageContainer
      title={tenant.name}
      subtitle={tenant.slug}
      headerProps={{
        actions: [
          {
            label: '返回列表',
            icon: <ArrowLeft size={18} />,
            onClick: () => navigate('/admin/tenants'),
            variant: 'outlined' as const,
          },
        ],
      }}
    >
      <Card variant='outlined' sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: 3,
                bgcolor: tenant.settings.branding.primary_color + '20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={36} style={{ color: tenant.settings.branding.primary_color }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant='h5' sx={{ fontWeight: 700 }}>
                  {tenant.name}
                </Typography>
                <Chip
                  label={statusLabels[tenant.status]}
                  color={statusColors[tenant.status] as any}
                  size='small'
                />
                <Chip
                  label={planLabels[tenant.plan]}
                  variant='outlined'
                  size='small'
                />
              </Box>
              <Typography variant='body2' color='text.secondary'>
                创建于 {new Date(tenant.created_at).toLocaleDateString('zh-CN')}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tab.icon}
                  {tab.label}
                </Box>
              }
            />
          ))}
        </Tabs>
      </Box>

      {activeTab === 0 && stats && (
        <Box>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant='outlined'>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: 'primary.main10',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Users size={24} color='primary' />
                    </Box>
                    <Box>
                      <Typography variant='h4' sx={{ fontWeight: 700 }}>
                        {stats.total_users}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        总用户数
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant='outlined'>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: 'success.main10',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Activity size={24} color='success' />
                    </Box>
                    <Box>
                      <Typography variant='h4' sx={{ fontWeight: 700 }}>
                        {stats.active_users}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        活跃用户
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant='outlined'>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: 'warning.main10',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <HardDrive size={24} color='warning' />
                    </Box>
                    <Box>
                      <Typography variant='h4' sx={{ fontWeight: 700 }}>
                        {stats.storage_used_gb}
                        <Typography component='span' variant='body2' color='text.secondary'>
                          /{tenant.settings.max_storage_gb}GB
                        </Typography>
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        存储使用
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant='outlined'>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: 'secondary.main10',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <BarChart3 size={24} color='secondary' />
                    </Box>
                    <Box>
                      <Typography variant='h4' sx={{ fontWeight: 700 }}>
                        {stats.last_30d_logins}
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        近30天登录
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card variant='outlined'>
            <CardContent>
              <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
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
                    <Typography variant='body2' color='text.secondary'>
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
                    <Typography variant='body2' color='text.secondary'>
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
                    <Typography variant='body2' color='text.secondary'>
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
      )}

      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant='h6' sx={{ fontWeight: 600 }}>
              租户成员
            </Typography>
            <Button
              variant='contained'
              startIcon={<UserPlus size={18} />}
              onClick={() => setShowInviteDialog(true)}
            >
              邀请成员
            </Button>
          </Box>
          <DataTable<TenantUser, unknown>
            columns={userColumns}
            data={users}
            loading={usersLoading}
            showSearch={false}
            showFilters={false}
            enablePagination
            totalItems={users.length}
            pageSize={10}
            currentPage={1}
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
          />
        </Box>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Palette size={20} />
                  <Typography variant='h6' sx={{ fontWeight: 600 }}>
                    品牌设置
                  </Typography>
                </Box>
                <List disablePadding>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText primary='主色调' secondary={tenant.settings.branding.primary_color} />
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
                    <ListItemText secondary={tenant.settings.branding.secondary_color} primary='辅助色' />
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
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Shield size={20} />
                  <Typography variant='h6' sx={{ fontWeight: 600 }}>
                    安全设置
                  </Typography>
                </Box>
                <List disablePadding>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText primary='SSO 单点登录' />
                    <Switch checked={tenant.settings.security.sso_enabled} disabled />
                  </ListItem>
                  <Divider component='li' />
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText primary='强制双因素认证' />
                    <Switch checked={tenant.settings.security.two_factor_required} disabled />
                  </ListItem>
                  <Divider component='li' />
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText primary='IP 白名单' />
                    <Switch checked={tenant.settings.security.ip_whitelist_enabled} disabled />
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
          </Grid>
          <Grid item xs={12}>
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Settings size={20} />
                  <Typography variant='h6' sx={{ fontWeight: 600 }}>
                    功能开关
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  {Object.entries(tenant.settings.features).map(([key, value]) => (
                    <Grid item xs={12} sm={6} md={4} key={key}>
                      <Card variant='outlined' sx={{ bgcolor: 'background.default' }}>
                        <CardContent sx={{ py: 1.5 }}>
                          <Box
                            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                          >
                            <Typography variant='body2'>{key}</Typography>
                            {value ? (
                              <CheckCircle size={18} color='green' />
                            ) : (
                              <XCircle size={18} color='gray' />
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Box>
          <Card variant='outlined' sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <CreditCard size={20} />
                <Typography variant='h6' sx={{ fontWeight: 600 }}>
                  当前订阅
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      套餐
                    </Typography>
                    <Typography variant='h6' sx={{ fontWeight: 600 }}>
                      {planLabels[tenant.plan]}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      下次计费
                    </Typography>
                    <Typography variant='h6' sx={{ fontWeight: 600 }}>
                      2024-01-15
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      状态
                    </Typography>
                    <Chip label='正常' color='success' size='small' />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
            账单历史
          </Typography>
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
        </Box>
      )}

      <Dialog open={showInviteDialog} onClose={() => setShowInviteDialog(false)} maxWidth='sm' fullWidth>
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
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as TenantRole })}
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
          <Button variant='contained' onClick={handleInviteMember}>
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
