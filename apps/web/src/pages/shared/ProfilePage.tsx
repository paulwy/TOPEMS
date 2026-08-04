import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { apiLogger } from '@/utils/logger';
import {
  User,
  Mail,
  Shield,
  Settings,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Bell,
  Clock,
  Star,
  Camera,
  Activity,
  MessageSquare,
  FileText,
  GitBranch,
  Bot,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { authApi, type User as UserType, type AccessLog } from '@/api/iam';
import {
  useNotificationStore,
  useAuthStore,
  useShortcutsStore,
  useNotificationSettingsStore,
} from '@/store';
import { useAuth } from '../../hooks/useAuth';
import { PageContainer } from '@/components/common';

import {
  Box,
  TextField,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Switch,
  FormControlLabel,
  Chip,
  Tabs,
  Tab,
  IconButton,
  CircularProgress,
  Divider,
  Button,
  useTheme,
} from '@mui/material';
import { designTokens } from '@/theme/tokens';
import { IM_PATHS } from '@/modules/im/config';
import { AUTH_PATHS } from '@/routes/auth';

const ct = designTokens.colors;

interface ActivityItem {
  id: string;
  action: string;
  resource: string;
  success: boolean;
  error_message?: string;
  created_at: string;
  ip_address?: string;
}

interface NotificationSettings {
  email_enabled: boolean;
  system_enabled: boolean;
  workflow_enabled: boolean;
  document_enabled: boolean;
  security_enabled: boolean;
}

interface ProfileFormData {
  full_name: string;
  email: string;
}

interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const ProfilePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const setUser = useAuthStore((state) => state.setUser);
  const shortcuts = useShortcutsStore((state) => state.shortcuts);
  const setShortcuts = useShortcutsStore((state) => state.setShortcuts);
  const notificationSettings = useNotificationSettingsStore((state) => state.notificationSettings);
  const setNotificationSettings = useNotificationSettingsStore(
    (state) => state.setNotificationSettings
  );
  const { logout } = useAuth();

  const [activeTab, setActiveTab] = useState(0);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<ProfileFormData>({
    defaultValues: {
      full_name: '',
      email: '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const userProfileQuery = useQuery<UserType | null>({
    queryKey: QUERY_KEYS.AUTH.USER,
    queryFn: async () => {
      const res = await authApi.getCurrentUser();
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.message || '获取用户信息失败');
    },
    staleTime: 5 * 60 * 1000,
  });

  const user = userProfileQuery.data ?? null;
  const loading = userProfileQuery.isLoading;
  const error = userProfileQuery.isError
    ? userProfileQuery.error instanceof Error
      ? userProfileQuery.error.message
      : '获取用户信息失败'
    : null;

  const activitiesQuery = useQuery<ActivityItem[]>({
    queryKey: QUERY_KEYS.AUTH.USER_ACCESS_LOGS(user?.id || 'none'),
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await authApi.getUserAccessLogs(user.id, 10, 0);
      return res.success && res.data ? res.data : [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const activities = activitiesQuery.data ?? [];
  const loadingActivities = activitiesQuery.isLoading;

  const preferencesQuery = useQuery({
    queryKey: QUERY_KEYS.AUTH.USER_PREFERENCES,
    queryFn: async () => {
      const res = await authApi.getPreferences();
      return res.success && res.data ? res.data : null;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (userProfileQuery.data) {
      const userData = userProfileQuery.data;
      profileForm.reset({
        full_name: userData.full_name || '',
        email: userData.email,
      });
      if (setUser) {
        setUser({
          id: userData.id,
          username: userData.username,
          email: userData.email,
          fullName: userData.full_name,
          role: userData.role,
          roles: userData.roles,
          permissions: userData.permissions,
          isActive: userData.isactive,
          isSuperuser: userData.is_superuser,
        });
      }
    }
  }, [userProfileQuery.data, profileForm, setUser]);

  useEffect(() => {
    if (userProfileQuery.isError) {
      const errorMsg =
        userProfileQuery.error instanceof Error
          ? userProfileQuery.error.message
          : '获取用户信息失败';
      addNotification({ title: '加载失败', message: errorMsg, type: 'error' });
    }
  }, [userProfileQuery.isError, userProfileQuery.error, addNotification]);

  useEffect(() => {
    if (preferencesQuery.data) {
      const data = preferencesQuery.data;
      if (data.shortcuts && setShortcuts) {
        setShortcuts(
          data.shortcuts.map((s) => ({
            id: s.id,
            title: s.title,
            path: s.path,
            icon: s.icon || 'Circle',
          }))
        );
      }
      if (data.notification_settings && setNotificationSettings) {
        setNotificationSettings(data.notification_settings);
      }
    }
  }, [preferencesQuery.data, setShortcuts, setNotificationSettings]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await authApi.updateCurrentUser({
        full_name: data.full_name || undefined,
        email: data.email,
      });
      if (!res.success || !res.data) {
        throw new Error(res.message || '更新失败');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTH.USER });
      addNotification({
        title: '成功',
        message: '个人信息更新成功',
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMsg = error.response?.data?.message || error.message || '更新失败';
      addNotification({ title: '失败', message: errorMsg, type: 'error' });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { current_password: string; new_password: string }) => {
      const res = await authApi.changePassword(data);
      if (!res.success) {
        throw new Error(res.message || '修改密码失败');
      }
      return res;
    },
    onSuccess: () => {
      addNotification({
        title: '成功',
        message: '密码修改成功，请重新登录',
        type: 'success',
      });
      setShowPasswordDialog(false);
      passwordForm.reset();
      setTimeout(() => {
        logout();
        navigate(AUTH_PATHS.login);
      }, 2000);
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMsg = error.response?.data?.message || error.message || '修改密码失败';
      addNotification({ title: '失败', message: errorMsg, type: 'error' });
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: async (params: { avatar_url: string }) => {
      const res = await authApi.updateAvatar(params);
      if (!res.success || !res.data) {
        throw new Error('头像更新失败');
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTH.USER });
      addNotification({
        title: '成功',
        message: '头像已更新',
        type: 'success',
      });
    },
    onError: () => {
      addNotification({
        title: '错误',
        message: '头像更新失败',
        type: 'error',
      });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (params: Record<string, unknown>) => {
      await authApi.updatePreferences(params);
    },
    onError: (err: unknown) => {
      apiLogger.error('保存偏好设置失败', err);
    },
  });

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addNotification({
        title: '错误',
        message: '请选择图片文件',
        type: 'error',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      addNotification({
        title: '错误',
        message: '图片大小不能超过2MB',
        type: 'error',
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setAvatarUrl(result);
      updateAvatarMutation.mutate({ avatar_url: result });
    };
    reader.readAsDataURL(file);
  };

  const handleProfileUpdate = (data: ProfileFormData) => {
    if (!user) return;
    updateProfileMutation.mutate(data);
  };

  const handlePasswordChange = (data: PasswordFormData) => {
    if (data.new_password !== data.confirm_password) {
      addNotification({
        title: '错误',
        message: '两次输入的密码不一致',
        type: 'error',
      });
      passwordForm.setError('confirm_password', {
        message: '两次输入的密码不一致',
      });
      return;
    }

    if (data.new_password.length < 6) {
      addNotification({
        title: '错误',
        message: '密码长度至少为6位',
        type: 'error',
      });
      passwordForm.setError('new_password', { message: '密码长度至少为6位' });
      return;
    }

    changePasswordMutation.mutate({
      current_password: data.current_password,
      new_password: data.new_password,
    });
  };

  const handleNotificationSettingChange = (key: keyof NotificationSettings) => {
    const newSettings = {
      ...notificationSettings,
      [key]: !notificationSettings[key],
    };
    setNotificationSettings(newSettings);
    updatePreferencesMutation.mutate(
      { notification_settings: newSettings },
      {
        onSuccess: () => {
          addNotification({
            title: '成功',
            message: `${key}通知设置已更新`,
            type: 'success',
          });
        },
        onError: () => {
          addNotification({
            title: '错误',
            message: '保存通知设置失败',
            type: 'error',
          });
        },
      }
    );
  };

  const handleShortcutToggle = (shortcut: {
    id: string;
    title: string;
    path: string;
    icon: string;
  }) => {
    let newShortcuts: {
      id: string;
      title: string;
      path: string;
      icon: string;
    }[];
    if (shortcuts.some((s) => s.id === shortcut.id)) {
      newShortcuts = shortcuts.filter((s) => s.id !== shortcut.id);
      addNotification({
        title: '提示',
        message: `${shortcut.title}已从快捷方式移除`,
        type: 'info',
      });
    } else {
      newShortcuts = [...shortcuts, shortcut];
      addNotification({
        title: '提示',
        message: `${shortcut.title}已添加到快捷方式`,
        type: 'success',
      });
    }
    setShortcuts(newShortcuts);
    updatePreferencesMutation.mutate({ shortcuts: newShortcuts });
  };

  const handleRetryProfile = () => {
    userProfileQuery.refetch();
  };

  const handleRefreshActivities = () => {
    activitiesQuery.refetch();
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'grey.50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error || !user) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'grey.50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <AlertCircle
            size={48}
            style={{ color: theme.palette.error.main, marginBottom: 12 }}
          />
          <Typography color='error'>{error || '无法获取用户信息'}</Typography>
          <Button
            sx={{ mt: 2 }}
            variant='contained'
            onClick={handleRetryProfile}
          >
            重试
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <PageContainer
      title='个人中心'
      subtitle='管理您的个人信息和账户安全'
      maxWidth='lg'
      headerProps={{
        backButton: { href: '/dashboard', visible: true },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' },
          gap: 3,
        }}
      >
        <Box>
          <Card sx={{ position: 'sticky', top: 64 }}>
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    src={avatarUrl || undefined}
                    sx={{
                      width: 96,
                      height: 96,
                      mb: 2,
                      bgcolor: 'primary.main',
                      fontSize: 36,
                    }}
                  >
                    {user.full_name?.charAt(0).toUpperCase() ||
                      user.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <IconButton
                    onClick={() => fileInputRef.current?.click()}
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      right: 0,
                      bgcolor: 'primary.main',
                      color: 'common.white',
                      '&:hover': { bgcolor: 'primary.dark' },
                      width: 32,
                      height: 32,
                    }}
                    size='small'
                  >
                    <Camera size={16} />
                  </IconButton>
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='image/*'
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                  />
                </Box>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  {user.full_name || user.username}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mt: 0.5 }}
                >
                  {user.email}
                </Typography>
                <Box sx={{ mt: 2, width: '100%' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <User size={16} />
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      用户名: {user.username}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Shield size={16} />
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      角色: {user.role || '普通用户'}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 1,
                    }}
                  >
                    <RefreshCw size={16} />
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      创建于: {new Date(user.created_at).toLocaleDateString('zh-CN')}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box>
          <Card>
            <CardHeader
              sx={{ pb: 0 }}
              title={
                <Tabs
                  value={activeTab}
                  onChange={(_, v) => setActiveTab(v)}
                >
                  <Tab
                    icon={<User size={16} />}
                    iconPosition='start'
                    label='个人信息'
                  />
                  <Tab
                    icon={<Shield size={16} />}
                    iconPosition='start'
                    label='账户安全'
                  />
                  <Tab
                    icon={<Activity size={16} />}
                    iconPosition='start'
                    label='最近活动'
                  />
                  <Tab
                    icon={<Bell size={16} />}
                    iconPosition='start'
                    label='通知设置'
                  />
                  <Tab
                    icon={<Star size={16} />}
                    iconPosition='start'
                    label='快捷方式'
                  />
                </Tabs>
              }
            />
            <CardContent>
              {activeTab === 0 && (
                <Box
                  component='form'
                  onSubmit={profileForm.handleSubmit(handleProfileUpdate)}
                  sx={{ '& > :not(style)': { mb: 3 } }}
                >
                  <TextField
                    fullWidth
                    label='姓名'
                    {...profileForm.register('full_name')}
                    placeholder='请输入姓名'
                    size='small'
                  />
                  <Box>
                    <TextField
                      fullWidth
                      label='邮箱 *'
                      type='email'
                      {...profileForm.register('email', {
                        required: '邮箱是必填项',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: '请输入有效的邮箱地址',
                        },
                      })}
                      placeholder='请输入邮箱'
                      error={!!profileForm.formState.errors.email}
                      helperText={profileForm.formState.errors.email?.message}
                      size='small'
                    />
                  </Box>
                  <TextField
                    fullWidth
                    label='用户名'
                    value={user.username}
                    disabled
                    size='small'
                  />
                  <Box sx={{ display: 'flex', gap: 1.5, pt: 2 }}>
                    <Button
                      type='submit'
                      variant='contained'
                      startIcon={<Save size={16} />}
                    >
                      保存更改
                    </Button>
                    <Button
                      type='button'
                      variant='outlined'
                      onClick={() => profileForm.reset()}
                    >
                      重置
                    </Button>
                  </Box>
                </Box>
              )}

              {activeTab === 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Shield
                        size={20}
                        style={{ color: theme.palette.primary.dark }}
                      />
                      <Box>
                        <Typography
                          variant='subtitle1'
                          sx={{ fontWeight: 500 }}
                        >
                          修改密码
                        </Typography>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          定期更新密码以保护账户安全
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      variant='contained'
                      onClick={() => setShowPasswordDialog(true)}
                    >
                      修改密码
                    </Button>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Mail
                        size={20}
                        style={{ color: theme.palette.success.dark }}
                      />
                      <Box>
                        <Typography
                          variant='subtitle1'
                          sx={{ fontWeight: 500 }}
                        >
                          邮箱验证
                        </Typography>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          {user.email} 已验证
                        </Typography>
                      </Box>
                    </Box>
                    <CheckCircle2
                      size={20}
                      style={{ color: theme.palette.success.dark }}
                    />
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Settings
                        size={20}
                        style={{ color: ct.purple[600] }}
                      />
                      <Box>
                        <Typography
                          variant='subtitle1'
                          sx={{ fontWeight: 500 }}
                        >
                          登录状态
                        </Typography>
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          当前会话活跃中
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      variant='outlined'
                      onClick={() => {
                        logout();
                        navigate(AUTH_PATHS.login);
                      }}
                    >
                      退出登录
                    </Button>
                  </Box>
                </Box>
              )}

              {activeTab === 2 && (
                <Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 2,
                    }}
                  >
                    <Typography
                      variant='subtitle1'
                      sx={{ fontWeight: 500 }}
                    >
                      最近活动记录
                    </Typography>
                    <Button
                      variant='text'
                      size='small'
                      startIcon={<RefreshCw size={16} />}
                      onClick={handleRefreshActivities}
                    >
                      刷新
                    </Button>
                  </Box>
                  {loadingActivities ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <CircularProgress size={32} />
                      <Typography
                        variant='body2'
                        color='text.secondary'
                        sx={{ mt: 1 }}
                      >
                        加载中...
                      </Typography>
                    </Box>
                  ) : activities.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Clock
                        size={48}
                        style={{ color: theme.palette.text.disabled, marginBottom: 12 }}
                      />
                      <Typography color='text.secondary'>暂无活动记录</Typography>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.5,
                      }}
                    >
                      {activities.map((activity) => (
                        <Box
                          key={activity.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1.5,
                            p: 1.5,
                            bgcolor: 'grey.100',
                            borderRadius: 1,
                          }}
                        >
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: activity.success ? 'success.main' : 'error.main',
                              mt: 1,
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <Typography
                                variant='body2'
                                sx={{ fontWeight: 500 }}
                              >
                                {activity.action}
                              </Typography>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                {new Date(activity.created_at).toLocaleString('zh-CN')}
                              </Typography>
                            </Box>
                            <Typography
                              variant='body2'
                              color='text.secondary'
                            >
                              {activity.resource}
                              {activity.ip_address && ` · ${activity.ip_address}`}
                            </Typography>
                            {activity.error_message && (
                              <Typography
                                variant='caption'
                                color='error'
                              >
                                {activity.error_message}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              {activeTab === 3 && (
                <Box>
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 500, mb: 2 }}
                  >
                    通知偏好设置
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {[
                      {
                        key: 'email_enabled' as const,
                        icon: Mail,
                        label: '邮件通知',
                        desc: '接收重要信息的邮件通知',
                        color: 'primary.dark',
                      },
                      {
                        key: 'system_enabled' as const,
                        icon: Bell,
                        label: '系统通知',
                        desc: '接收系统消息和公告',
                        color: ct.yellow[600],
                      },
                      {
                        key: 'workflow_enabled' as const,
                        icon: Activity,
                        label: '工作流通知',
                        desc: '接收工作流审批和任务提醒',
                        color: 'success.dark',
                      },
                      {
                        key: 'document_enabled' as const,
                        icon: FileText,
                        label: '文档通知',
                        desc: '接收文档更新和评论提醒',
                        color: ct.purple[600],
                      },
                      {
                        key: 'security_enabled' as const,
                        icon: Shield,
                        label: '安全通知',
                        desc: '接收登录和账户安全提醒',
                        color: 'error.dark',
                      },
                    ].map(({ key, icon: Icon, label, desc, color }) => (
                      <Box
                        key={key}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 2,
                          bgcolor: 'grey.100',
                          borderRadius: 1,
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                          }}
                        >
                          <Icon
                            size={20}
                            style={{ color }}
                          />
                          <Box>
                            <Typography
                              variant='subtitle1'
                              sx={{ fontWeight: 500 }}
                            >
                              {label}
                            </Typography>
                            <Typography
                              variant='body2'
                              color='text.secondary'
                            >
                              {desc}
                            </Typography>
                          </Box>
                        </Box>
                        <Switch
                          checked={notificationSettings[key]}
                          onChange={() => handleNotificationSettingChange(key)}
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {activeTab === 4 && (
                <Box>
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 500, mb: 2 }}
                  >
                    我的快捷方式
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 2 }}
                  >
                    选择您常用的功能添加到快捷方式
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: 'repeat(2, 1fr)',
                        md: 'repeat(3, 1fr)',
                      },
                      gap: 2,
                    }}
                  >
                    {[
                      {
                        id: '1',
                        title: '仪表盘',
                        icon: Activity,
                        iconName: 'Activity',
                        path: '/dashboard',
                        color: 'primary.main',
                      },
                      {
                        id: '2',
                        title: '文档中心',
                        icon: FileText,
                        iconName: 'FileText',
                        path: '/documents',
                        color: 'success.dark',
                      },
                      {
                        id: '3',
                        title: '工作流',
                        icon: GitBranch,
                        iconName: 'GitBranch',
                        path: '/flow/definitions',
                        color: ct.purple[500],
                      },
                      {
                        id: '4',
                        title: '通知中心',
                        icon: Bell,
                        iconName: 'Bell',
                        path: '/notifications',
                        color: 'warning.main',
                      },
                      {
                        id: '5',
                        title: 'AI助手',
                        icon: Bot,
                        iconName: 'Bot',
                        path: '/ai',
                        color: ct.pink[500],
                      },
                      {
                        id: '6',
                        title: '消息中心',
                        icon: MessageSquare,
                        iconName: 'MessageSquare',
                        path: IM_PATHS.root,
                        color: 'primary.light',
                      },
                    ].map((item) => {
                      const isSelected = shortcuts.some((s) => s.id === item.id);
                      const Icon = item.icon;
                      return (
                        <Box
                          key={item.id}
                          onClick={() =>
                            handleShortcutToggle({
                              id: item.id,
                              title: item.title,
                              icon: item.iconName,
                              path: item.path,
                            })
                          }
                          sx={{
                            p: 2,
                            borderRadius: 1,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            border: 2,
                            borderColor: isSelected ? 'primary.main' : 'transparent',
                            bgcolor: isSelected ? 'primary.50' : 'grey.100',
                            '&:hover': {
                              borderColor: isSelected ? 'primary.main' : 'primary.light',
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                            }}
                          >
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: 1.5,
                                bgcolor: item.color,
                              }}
                            >
                              <Icon
                                size={24}
                                style={{ color: 'common.white' }}
                              />
                            </Box>
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 500 }}
                            >
                              {item.title}
                            </Typography>
                            {isSelected && (
                              <Chip
                                label='已添加'
                                size='small'
                                sx={{ mt: 1 }}
                              />
                            )}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>

                  {shortcuts.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography
                        variant='subtitle1'
                        sx={{ fontWeight: 500, mb: 2 }}
                      >
                        当前快捷方式
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {shortcuts.map((shortcut) => (
                          <Chip
                            key={shortcut.id}
                            label={`${shortcut.title} ×`}
                            variant='outlined'
                            onClick={() => handleShortcutToggle(shortcut)}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Dialog
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>修改密码</DialogTitle>
        <Box
          component='form'
          onSubmit={passwordForm.handleSubmit(handlePasswordChange)}
        >
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              请输入当前密码和新密码来完成密码修改
            </Typography>
            <TextField
              fullWidth
              label='当前密码 *'
              type='password'
              {...passwordForm.register('current_password', {
                required: '当前密码是必填项',
              })}
              placeholder='请输入当前密码'
              error={!!passwordForm.formState.errors.current_password}
              helperText={passwordForm.formState.errors.current_password?.message}
              size='small'
            />
            <TextField
              fullWidth
              label='新密码 *'
              type='password'
              {...passwordForm.register('new_password', {
                required: '新密码是必填项',
                minLength: { value: 6, message: '密码长度至少为6位' },
              })}
              placeholder='请输入新密码（至少6位）'
              error={!!passwordForm.formState.errors.new_password}
              helperText={passwordForm.formState.errors.new_password?.message}
              size='small'
            />
            <TextField
              fullWidth
              label='确认新密码 *'
              type='password'
              {...passwordForm.register('confirm_password', {
                required: '请再次输入新密码',
              })}
              placeholder='请再次输入新密码'
              error={!!passwordForm.formState.errors.confirm_password}
              helperText={passwordForm.formState.errors.confirm_password?.message}
              size='small'
            />
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={() => {
                setShowPasswordDialog(false);
                passwordForm.reset();
              }}
            >
              取消
            </Button>
            <Button
              type='submit'
              variant='contained'
              startIcon={<Save size={16} />}
            >
              确认修改
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </PageContainer>
  );
};

export default ProfilePage;
