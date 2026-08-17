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
import i18n from '@/i18n';
import {
  Settings,
  Palette,
  Shield,
  Users,
  Building2,
  Save,
  Bell,
  Clock,
  UserPlus,
  Trash2,
  Upload,
} from 'lucide-react';
import { PageContainer, Grid } from '@/components/common';
import { tenantApi } from '@/api/tenant';
import { logger } from '@/utils/logger';
import type { Tenant, TenantUser, TenantRole } from '@/api/tenant/types';

import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';

const roleLabels: Record<TenantRole, string> = {
  owner: i18n.t('pages.tenant_settings_page.k0'),
  superadmin: i18n.t('pages.tenant_settings_page.k1'),
  admin: i18n.t('pages.tenant_settings_page.k2'),
  member: i18n.t('pages.tenant_settings_page.k3'),
  guest: i18n.t('pages.tenant_settings_page.k4'),
};

const TenantSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: tenant, isPending: loading } = useQuery<Tenant | null>({
    queryKey: QUERY_KEYS.TENANT.CURRENT,
    queryFn: async () => {
      const contextRes = await tenantApi.getCurrentTenantContext();
      if (!contextRes.success || !contextRes.data) {
        throw new Error(contextRes.message || i18n.t('pages.tenant_settings_page.k5'));
      }
      const tenantRes = await tenantApi.getTenant(contextRes.data.tenant_id);
      if (!tenantRes.success || !tenantRes.data) {
        throw new Error(tenantRes.message || i18n.t('pages.tenant_settings_page.k6'));
      }
      return tenantRes.data;
    },

    staleTime: CACHE_DURATIONS.LONG,
  });

  const { data: members = [] } = useQuery<TenantUser[]>({
    queryKey: QUERY_KEYS.TENANT.USERS,
    queryFn: async () => {
      if (!tenant) return [];
      const res = await tenantApi.getTenantUsers(tenant.id, { pageSize: 50 });
      if (!res.success || !res.data) {
        throw new Error(res.message || i18n.t('pages.tenant_settings_page.k7'));
      }
      return res.data.items;
    },
    enabled: !!tenant,

    staleTime: CACHE_DURATIONS.LONG,
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
        allowed_ip_ranges: tenant.settings.security.allowed_ip_ranges ?? [],
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TENANT.CURRENT,
        exact: false,
        refetchType: 'active',
      });
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
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TENANT.CURRENT,
        exact: false,
        refetchType: 'active',
      });
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
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.TENANT.USERS,
          exact: false,
          refetchType: 'active',
        });
      }
    } catch (error) {
      logger.error('Failed to invite member:', error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!tenant) return;
    try {
      await tenantApi.removeMember(tenant.id, userId);
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.TENANT.USERS,
        exact: false,
        refetchType: 'active',
      });
    } catch (error) {
      logger.error('Failed to remove member:', error);
    }
  };

  const sections = [
    { id: 'general', label: i18n.t('pages.tenant_settings_page.k8'), icon: <Settings size={18} /> },
    { id: 'branding', label: i18n.t('pages.tenant_settings_page.k9'), icon: <Palette size={18} /> },
    { id: 'security', label: i18n.t('pages.tenant_settings_page.k10'), icon: <Shield size={18} /> },
    { id: 'members', label: i18n.t('pages.tenant_settings_page.k11'), icon: <Users size={18} /> },
    {
      id: 'notifications',
      label: i18n.t('pages.tenant_settings_page.k12'),
      icon: <Bell size={18} />,
    },
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
                    {i18n.t('pages.tenant_settings_page.k0')}
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
                      label={i18n.t('pages.tenant_settings_page.k13')}
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
                      label={i18n.t('pages.tenant_settings_page.slug_14')}
                      value={tenant.slug}
                      disabled
                      helperText={i18n.t('pages.tenant_settings_page.k15')}
                    />
                  </Grid>
                  <Grid
                    item
                    xs={12}
                    md={6}
                  >
                    <TextField
                      fullWidth
                      label={i18n.t('pages.tenant_settings_page.k16')}
                      value={
                        (
                          {
                            free: i18n.t('pages.tenant_settings_page.k17'),
                            basic: i18n.t('pages.tenant_settings_page.k18'),
                            professional: i18n.t('pages.tenant_settings_page.k19'),
                            enterprise: i18n.t('pages.tenant_settings_page.k20'),
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
                      label={i18n.t('pages.tenant_settings_page.k21')}
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
                    {i18n.t('pages.tenant_settings_page.k1')}
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
                    {i18n.t('pages.tenant_settings_page.k2')}
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
                        {i18n.t('pages.tenant_settings_page.logo_3')}
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
                        {i18n.t('pages.tenant_settings_page.k4')}
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
                        {i18n.t('pages.tenant_settings_page.k5')}
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
                      label={i18n.t('pages.tenant_settings_page.k22')}
                      placeholder={i18n.t('pages.tenant_settings_page.k6')}
                      value={formData.custom_domain}
                      onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
                      helperText={i18n.t('pages.tenant_settings_page.k23')}
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
                    {i18n.t('pages.tenant_settings_page.k7')}
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
                    {i18n.t('pages.tenant_settings_page.k8')}
                  </Typography>
                </Box>

                <List disablePadding>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary={i18n.t('pages.tenant_settings_page.sso_9')}
                      secondary={i18n.t('pages.tenant_settings_page.k24')}
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
                      primary={i18n.t('pages.tenant_settings_page.k25')}
                      secondary={i18n.t('pages.tenant_settings_page.k26')}
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
                      primary={i18n.t('pages.tenant_settings_page.ip_10')}
                      secondary={i18n.t('pages.tenant_settings_page.ip_27')}
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
                          {i18n.t('pages.tenant_settings_page.k11')}
                        </Box>
                      }
                      secondary={i18n.t('pages.tenant_settings_page.k28')}
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
                        <MenuItem value={15}>{i18n.t('admin:tenant_settings_page.15_6')}</MenuItem>
                        <MenuItem value={30}>{i18n.t('admin:tenant_settings_page.30_5')}</MenuItem>
                        <MenuItem value={60}>{i18n.t('admin:tenant_settings_page.k4')}</MenuItem>
                        <MenuItem value={120}>{i18n.t('admin:tenant_settings_page.k3')}</MenuItem>
                        <MenuItem value={480}>{i18n.t('admin:tenant_settings_page.k2')}</MenuItem>
                        <MenuItem value={1440}>
                          {i18n.t('admin:tenant_settings_page.24_1')}
                        </MenuItem>
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
                    {i18n.t('pages.tenant_settings_page.k12')}
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
                      {i18n.t('pages.tenant_settings_page.k13')}
                    </Typography>
                  </Box>
                  <Button
                    variant='contained'
                    startIcon={<UserPlus size={18} />}
                    onClick={() => setShowInviteDialog(true)}
                  >
                    {i18n.t('pages.tenant_settings_page.k14')}
                  </Button>
                </Box>

                <Alert
                  severity='info'
                  sx={{ mb: 2 }}
                >
                  {i18n.t('admin:tenant_settings_page.k0', {
                    v0: members.length,
                    v1: tenant.settings.max_users,
                    v2: ' ',
                    v3: i18n.t('pages.tenant_settings_page.k15'),
                  })}
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
                                    ? i18n.t('pages.tenant_settings_page.k29')
                                    : member.status === 'invited'
                                      ? i18n.t('pages.tenant_settings_page.k30')
                                      : i18n.t('pages.tenant_settings_page.k31')
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
                              aria-label={i18n.t('pages.tenant_settings_page.k32')}
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
                    {i18n.t('pages.tenant_settings_page.k16')}
                  </Typography>
                </Box>

                <List disablePadding>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary={i18n.t('pages.tenant_settings_page.k33')}
                      secondary={i18n.t('pages.tenant_settings_page.k34')}
                    />
                    <ListItemSecondaryAction>
                      <Switch defaultChecked />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider component='li' />
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary={i18n.t('pages.tenant_settings_page.k35')}
                      secondary={i18n.t('pages.tenant_settings_page.k36')}
                    />
                    <ListItemSecondaryAction>
                      <Switch defaultChecked />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider component='li' />
                  <ListItem sx={{ px: 0 }}>
                    <ListItemText
                      primary={i18n.t('pages.tenant_settings_page.k37')}
                      secondary={i18n.t('pages.tenant_settings_page.k38')}
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
        <DialogTitle>{i18n.t('pages.tenant_settings_page.k39')}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={i18n.t('pages.tenant_settings_page.k40')}
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              fullWidth
              type='email'
            />
            <FormControl fullWidth>
              <InputLabel>{i18n.t('pages.tenant_settings_page.k41')}</InputLabel>
              <Select
                value={inviteForm.role}
                label={i18n.t('pages.tenant_settings_page.k42')}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, role: e.target.value as TenantRole })
                }
              >
                <MenuItem value='admin'>{i18n.t('pages.tenant_settings_page.k43')}</MenuItem>
                <MenuItem value='member'>{i18n.t('pages.tenant_settings_page.k44')}</MenuItem>
                <MenuItem value='guest'>{i18n.t('pages.tenant_settings_page.k45')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInviteDialog(false)}>
            {i18n.t('pages.tenant_settings_page.k46')}
          </Button>
          <Button
            variant='contained'
            onClick={handleInviteMember}
          >
            {i18n.t('pages.tenant_settings_page.k17')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default TenantSettingsPage;
