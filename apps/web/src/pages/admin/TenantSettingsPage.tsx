import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
} from '@mui/material';
import {
  Settings,
  Palette,
  Shield,
  Users,
  Building2,
  Save,
  Bell,
  Globe,
  Clock,
  UserPlus,
  Trash2,
  Upload,
} from 'lucide-react';
import { PageContainer, Grid } from '@/components/common';
import { tenantApi } from '@/api/tenant';
import { logger } from '@/utils/logger';
import type { Tenant, TenantUser, TenantRole } from '@/api/tenant/types';
import { QUERY_KEYS } from '@/lib/reactQuery';

const roleLabels: Record<TenantRole, string> = {
  owner: '所有者',
  admin: '管理员',
  member: '成员',
  guest: '访客',
};

const TenantSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: tenant, isLoading: loading } = useQuery<Tenant | null>({
    queryKey: QUERY_KEYS.TENANT.CURRENT,
    queryFn: async () => {
      const contextRes = await tenantApi.getCurrentTenantContext();
      if (!contextRes.success || !contextRes.data) {
        throw new Error(contextRes.message || '获取租户上下文失败');
      }
      const tenantRes = await tenantApi.getTenant(contextRes.data.tenant_id);
      if (!tenantRes.success || !tenantRes.data) {
        throw new Error(tenantRes.message || '加载租户信息失败');
      }
      return tenantRes.data;
    },
  });

  const { data: members = [] } = useQuery<TenantUser[]>({
    queryKey: QUERY_KEYS.TENANT.USERS,
    queryFn: async () => {
      if (!tenant) return [];
      const res = await tenantApi.getTenantUsers(tenant.id, { pageSize: 50 });
      if (!res.success || !res.data) {
        throw new Error(res.message || '加载成员失败');
      }
      return res.data.items;
    },
    enabled: !!tenant,
  });

  const [activeSection, setActiveSection] = useState('general');
  const [saving, setSaving] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' as TenantRole });
  const [formData, setFormData] = useState({
    name: '',
    primary_color: 'primary.main',
    secondary_color: 'grey.500',
    custom_domain: '',
    sso_enabled: false,
    two_factor_required: false,
    ip_whitelist_enabled: false,
    session_timeout_minutes: 60,
    allowed_ip_ranges: [] as string[],
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name,
        primary_color: tenant.settings.branding.primary_color,
        secondary_color: tenant.settings.branding.secondary_color,
        custom_domain: tenant.settings.branding.custom_domain || '',
        sso_enabled: tenant.settings.security.sso_enabled,
        two_factor_required: tenant.settings.security.two_factor_required,
        ip_whitelist_enabled: tenant.settings.security.ip_whitelist_enabled,
        session_timeout_minutes: tenant.settings.security.session_timeout_minutes,
        allowed_ip_ranges: tenant.settings.security.allowed_ip_ranges,
      });
    }
  }, [tenant]);

  const handleSaveGeneral = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      await tenantApi.updateTenant(tenant.id, {
        name: formData.name,
        settings: {
          ...tenant.settings,
          branding: {
            ...tenant.settings.branding,
            primary_color: formData.primary_color,
            secondary_color: formData.secondary_color,
            custom_domain: formData.custom_domain || undefined,
          },
        },
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT.CURRENT });
    } catch (error) {
      logger.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      await tenantApi.updateTenant(tenant.id, {
        settings: {
          ...tenant.settings,
          security: {
            sso_enabled: formData.sso_enabled,
            two_factor_required: formData.two_factor_required,
            ip_whitelist_enabled: formData.ip_whitelist_enabled,
            session_timeout_minutes: formData.session_timeout_minutes,
            allowed_ip_ranges: formData.allowed_ip_ranges,
          },
        },
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT.CURRENT });
    } catch (error) {
      logger.error('Failed to save security settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = async () => {
    if (!tenant) return;
    try {
      const res = await tenantApi.inviteMember(tenant.id, inviteForm);
      if (res.success) {
        setShowInviteDialog(false);
        setInviteForm({ email: '', role: 'member' });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT.USERS });
      }
    } catch (error) {
      logger.error('Failed to invite member:', error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!tenant) return;
    try {
      await tenantApi.removeMember(tenant.id, userId);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TENANT.USERS });
    } catch (error) {
      logger.error('Failed to remove member:', error);
    }
  };

  const sections = [
    { id: 'general', label: '基本设置', icon: <Settings size={18} /> },
    { id: 'branding', label: '品牌定制', icon: <Palette size={18} /> },
    { id: 'security', label: '安全设置', icon: <Shield size={18} /> },
    { id: 'members', label: '成员管理', icon: <Users size={18} /> },
    { id: 'notifications', label: '通知设置', icon: <Bell size={18} /> },
  ];

  if (loading || !tenant) {
    return (
      <PageContainer loading>
        <Box />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Grid
        container
        spacing={3}
      >
        <Grid
          item
          xs={12}
          md={3}
        >
          <Card variant='outlined'>
            <CardContent sx={{ p: 1 }}>
              {sections.map((section) => (
                <Button
                  key={section.id}
                  fullWidth
                  variant={activeSection === section.id ? 'contained' : 'text'}
                  sx={{
                    justifyContent: 'flex-start',
                    py: 1.5,
                    px: 2,
                    mb: 0.5,
                    borderRadius: 3,
                  }}
                  onClick={() => setActiveSection(section.id)}
                  startIcon={section.icon}
                >
                  {section.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid
          item
          xs={12}
          md={9}
        >
          {activeSection === 'general' && (
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Building2 size={24} />
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 600 }}
                  >
                    基本设置
                  </Typography>
                </Box>

                <Grid
                  container
                  spacing={3}
                >
                  <Grid
                    item
                    xs={12}
                    md={6}
                  >
                    <TextField
                      fullWidth
                      label='租户名称'
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </Grid>
                  <Grid
                    item
                    xs={12}
                    md={6}
                  >
                    <TextField
                      fullWidth
                      label='租户标识 (Slug)'
                      value={tenant.slug}
                      disabled
                      helperText='租户标识创建后不可修改'
                    />
                  </Grid>
                  <Grid
                    item
                    xs={12}
                    md={6}
                  >
                    <TextField
                      fullWidth
                      label='当前套餐'
                      value={
                        (
                          {
                            free: '免费版',
                            basic: '基础版',
                            professional: '专业版',
                            enterprise: '企业版',
                          } as Record<string, string>
                        )[tenant.plan as string]
                      }
                      disabled
                    />
                  </Grid>
                  <Grid
                    item
                    xs={12}
                    md={6}
                  >
                    <TextField
                      fullWidth
                      label='创建时间'
                      value={new Date(tenant.created_at).toLocaleDateString('zh-CN')}
                      disabled
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant='contained'
                    startIcon={<Save size={18} />}
                    onClick={handleSaveGeneral}
                    disabled={saving}
                  >
                    保存更改
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {activeSection === 'branding' && (
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Palette size={24} />
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 600 }}
                  >
                    品牌定制
                  </Typography>
                </Box>

                <Grid
                  container
                  spacing={3}
                >
                  <Grid
                    item
                    xs={12}
                    md={6}
                  >
                    <Typography
                      variant='subtitle2'
                      sx={{ mb: 1 }}
                    >
                      Logo
                    </Typography>
                    <Box
                      sx={{
                        border: '2px dashed',
                        borderColor: 'divider',
                        borderRadius: 3,
                        p: 4,
                        textAlign: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'primary.main4',
                        },
                      }}
                    >
                      <Upload
                        size={32}
                        style={{ margin: '0 auto 8px', opacity: 0.5 }}
                      />
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        点击上传 Logo 图片
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid
                    item
                    xs={12}
                    md={6}
                  >
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant='subtitle2'
                        sx={{ mb: 1 }}
                      >
                        主色调
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input
                          type='color'
                          value={formData.primary_color}
                          onChange={(e) =>
                            setFormData({ ...formData, primary_color: e.target.value })
                          }
                          style={{
                            width: 48,
                            height: 48,
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: 4,
                          }}
                        />
                        <TextField
                          size='small'
                          value={formData.primary_color}
                          onChange={(e) =>
                            setFormData({ ...formData, primary_color: e.target.value })
                          }
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Typography
                        variant='subtitle2'
                        sx={{ mb: 1 }}
                      >
                        辅助色
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <input
                          type='color'
                          value={formData.secondary_color}
                          onChange={(e) =>
                            setFormData({ ...formData, secondary_color: e.target.value })
                          }
                          style={{
                            width: 48,
                            height: 48,
                            border: 'none',
                            cursor: 'pointer',
                            borderRadius: 4,
                          }}
                        />
                        <TextField
                          size='small'
                          value={formData.secondary_color}
                          onChange={(e) =>
                            setFormData({ ...formData, secondary_color: e.target.value })
                          }
                        />
                      </Box>
                    </Box>
                  </Grid>
                  <Grid
                    item
                    xs={12}
                  >
                    <TextField
                      fullWidth
                      label='自定义域名'
                      placeholder='例如：crm.yourcompany.com'
                      value={formData.custom_domain}
                      onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
                      helperText='配置自定义域名需要在 DNS 服务商添加 CNAME 记录'
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant='contained'
                    startIcon={<Save size={18} />}
                    onClick={handleSaveGeneral}
                    disabled={saving}
                  >
                    保存更改
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {activeSection === 'security' && (
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Shield size={24} />
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 600 }}
                  >
                    安全设置
                  </Typography>
                </Box>

                <List disablePadding>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary='SSO 单点登录'
                      secondary='允许用户通过企业身份提供商登录'
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={formData.sso_enabled}
                        onChange={(e) =>
                          setFormData({ ...formData, sso_enabled: e.target.checked })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider component='li' />
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary='强制双因素认证'
                      secondary='要求所有用户启用双因素认证'
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={formData.two_factor_required}
                        onChange={(e) =>
                          setFormData({ ...formData, two_factor_required: e.target.checked })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider component='li' />
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary='IP 白名单'
                      secondary='限制只能从指定 IP 范围访问'
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={formData.ip_whitelist_enabled}
                        onChange={(e) =>
                          setFormData({ ...formData, ip_whitelist_enabled: e.target.checked })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider component='li' />
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Clock size={18} />
                          会话超时时间
                        </Box>
                      }
                      secondary='用户无操作多长时间后自动登出'
                    />
                    <FormControl
                      size='small'
                      sx={{ minWidth: 150 }}
                    >
                      <Select
                        value={formData.session_timeout_minutes}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            session_timeout_minutes: Number(e.target.value),
                          })
                        }
                      >
                        <MenuItem value={15}>15 分钟</MenuItem>
                        <MenuItem value={30}>30 分钟</MenuItem>
                        <MenuItem value={60}>1 小时</MenuItem>
                        <MenuItem value={120}>2 小时</MenuItem>
                        <MenuItem value={480}>8 小时</MenuItem>
                        <MenuItem value={1440}>24 小时</MenuItem>
                      </Select>
                    </FormControl>
                  </ListItem>
                </List>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant='contained'
                    startIcon={<Save size={18} />}
                    onClick={handleSaveSecurity}
                    disabled={saving}
                  >
                    保存更改
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {activeSection === 'members' && (
            <Card variant='outlined'>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Users size={24} />
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 600 }}
                    >
                      成员管理
                    </Typography>
                  </Box>
                  <Button
                    variant='contained'
                    startIcon={<UserPlus size={18} />}
                    onClick={() => setShowInviteDialog(true)}
                  >
                    邀请成员
                  </Button>
                </Box>

                <Alert
                  severity='info'
                  sx={{ mb: 2 }}
                >
                  当前租户共有 {members.length} 名成员，最多可添加 {tenant.settings.max_users}{' '}
                  名成员
                </Alert>

                <List disablePadding>
                  {members.map((member: TenantUser) => (
                    <React.Fragment key={member.id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {member.email.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={member.email}
                          secondary={
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                              <Chip
                                label={roleLabels[member.role]}
                                size='small'
                                variant='outlined'
                              />
                              <Chip
                                label={
                                  member.status === 'active'
                                    ? '活跃'
                                    : member.status === 'invited'
                                      ? '已邀请'
                                      : '已停用'
                                }
                                size='small'
                                color={
                                  member.status === 'active'
                                    ? 'success'
                                    : member.status === 'invited'
                                      ? 'warning'
                                      : 'error'
                                }
                              />
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          {member.role !== 'owner' && (
                            <IconButton
                              edge='end'
                              color='error'
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <Trash2 size={18} />
                            </IconButton>
                          )}
                        </ListItemSecondaryAction>
                      </ListItem>
                      <Divider component='li' />
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          {activeSection === 'notifications' && (
            <Card variant='outlined'>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Bell size={24} />
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 600 }}
                  >
                    通知设置
                  </Typography>
                </Box>

                <List disablePadding>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary='邮件通知'
                      secondary='接收重要系统通知和账单信息'
                    />
                    <ListItemSecondaryAction>
                      <Switch defaultChecked />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider component='li' />
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary='产品更新'
                      secondary='接收新功能和产品更新通知'
                    />
                    <ListItemSecondaryAction>
                      <Switch defaultChecked />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider component='li' />
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary='使用报告'
                      secondary='每周接收使用情况报告'
                    />
                    <ListItemSecondaryAction>
                      <Switch />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

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
    </PageContainer>
  );
};

export default TenantSettingsPage;
