import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';
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
import i18n from '@/i18n';
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
  Chip,
  Tabs,
  Tab,
  IconButton,
  CircularProgress,
  Button,
  useTheme,
} from '@mui/material';
import { designTokens } from '@/theme/tokens';
import { IM_PATHS } from '@/modules/im/config';
import { AUTH_PATHS } from '@/routes/auth';

import { UserCard, TabBar } from './ProfilePage/components/ProfileTabBar';
import ProfileInfoPanel from './ProfilePage/components/ProfileInfoPanel';
import ProfileSecurityPanel from './ProfilePage/components/ProfileSecurityPanel';
import ProfileApprovalPanel from './ProfilePage/components/ProfileApprovalPanel';

const ct= designTokens.colors;

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
      throw new Error(res.message || i18n.t('pages.profile_page.k0'));
    },
    staleTime: 5 * 60 * 1000,
  });

  const user = userProfileQuery.data ?? null;
  const loading = userProfileQuery.isLoading;
  const error = userProfileQuery.isError
    ? userProfileQuery.error instanceof Error
      ? userProfileQuery.error.message
      : i18n.t('pages.profile_page.k1')
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
          : i18n.t('pages.profile_page.k2');
      addNotification({ title: i18n.t('pages.profile_page.k3'), message: errorMsg, type: 'error' });
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
        throw new Error(res.message || i18n.t('pages.profile_page.k4'));
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AUTH.USER,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('pages.profile_page.k5'),
        message: i18n.t('pages.profile_page.k6'),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMsg = error.response?.data?.message || error.message || i18n.t('pages.profile_page.k7');
      addNotification({ title: i18n.t('pages.profile_page.k8'), message: errorMsg, type: 'error' });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { current_password: string; new_password: string }) => {
      const res = await authApi.changePassword(data);
      if (!res.success) {
        throw new Error(res.message || i18n.t('pages.profile_page.k9'));
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.SHARED_ATTACHMENTS_BASE,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('pages.profile_page.k10'),
        message: i18n.t('pages.profile_page.k11'),
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
      const errorMsg = error.response?.data?.message || error.message || i18n.t('pages.profile_page.k12');
      addNotification({ title: i18n.t('pages.profile_page.k13'), message: errorMsg, type: 'error' });
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: async (params: { avatar_url: string }) => {
      const res = await authApi.updateAvatar(params);
      if (!res.success || !res.data) {
        throw new Error(i18n.t('pages.profile_page.k14'));
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AUTH.USER,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('pages.profile_page.k15'),
        message: i18n.t('pages.profile_page.k16'),
        type: 'success',
      });
    },
    onError: () => {
      addNotification({
        title: i18n.t('pages.profile_page.k17'),
        message: i18n.t('pages.profile_page.k18'),
        type: 'error',
      });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (params: Record<string, unknown>) => {
      await authApi.updatePreferences(params);
    },
    onError: (err: unknown) => {
      apiLogger.error(i18n.t('pages.profile_page.k19'), err);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.SHARED_ATTACHMENTS_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
  });

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addNotification({
        title: i18n.t('pages.profile_page.k20'),
        message: i18n.t('pages.profile_page.k21'),
        type: 'error',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      addNotification({
        title: i18n.t('pages.profile_page.k22'),
        message: i18n.t('pages.profile_page.2mb_23'),
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
        title: i18n.t('pages.profile_page.k24'),
        message: i18n.t('pages.profile_page.k25'),
        type: 'error',
      });
      passwordForm.setError('confirm_password', {
        message: i18n.t('pages.profile_page.k26'),
      });
      return;
    }

    if (data.new_password.length < 6) {
      addNotification({
        title: i18n.t('pages.profile_page.k27'),
        message: i18n.t('pages.profile_page.6_28'),
        type: 'error',
      });
      passwordForm.setError('new_password', { message: i18n.t('pages.profile_page.6_29') });
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
            title: i18n.t('pages.profile_page.k30'),
            message: `${key}${i18n.t('pages.profile_page.k0')}`,
            type: 'success',
          });
        },
        onError: () => {
          addNotification({
            title: i18n.t('pages.profile_page.k31'),
            message: i18n.t('pages.profile_page.k32'),
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
        title: i18n.t('pages.profile_page.k33'),
        message: `${shortcut.title}${i18n.t('pages.profile_page.k1')}`,
        type: 'info',
      });
    } else {
      newShortcuts = [...shortcuts, shortcut];
      addNotification({
        title: i18n.t('pages.profile_page.k34'),
        message: `${shortcut.title}${i18n.t('pages.profile_page.k2')}`,
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
          <Typography color='error'>{error || i18n.t('pages.profile_page.k35')}</Typography>
          <Button
            sx={{ mt: 2 }}
            variant='contained'
            onClick={handleRetryProfile}
          >
            {i18n.t('pages.profile_page.k0')}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <PageContainer
      title={i18n.t('pages.profile_page.k36')}
      subtitle={i18n.t('pages.profile_page.k37')}
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
          <UserCard
            user={user}
            avatarUrl={avatarUrl}
            onAvatarUpload={handleAvatarUpload}
          />
        </Box>

        <Box>
          <Card>
            <CardHeader
              sx={{ pb: 0 }}
              title={
                <TabBar
                  activeTab={activeTab}
                  onTabChange={(t: number) => setActiveTab(t)}
                />
              }
            />
            <CardContent>
              {activeTab === 0 && (
                <ProfileInfoPanel
                  user={user}
                  profileForm={profileForm}
                  onSubmit={handleProfileUpdate}
                />
              )}

              {activeTab === 1 && (
                <ProfileSecurityPanel
                  user={user}
                  showPasswordDialog={showPasswordDialog}
                  passwordForm={passwordForm}
                  onOpenPasswordDialog={() => setShowPasswordDialog(true)}
                  onClosePasswordDialog={() => setShowPasswordDialog(false)}
                  onPasswordChangeSubmit={handlePasswordChange}
                  onLogout={logout}
                  navigate={navigate}
                />
              )}

              {(activeTab === 2 || activeTab === 3 || activeTab === 4) && (
                <ProfileApprovalPanel
                  activeTab={activeTab}
                  activities={activities}
                  loadingActivities={loadingActivities}
                  notificationSettings={notificationSettings}
                  shortcuts={shortcuts}
                  onRefreshActivities={handleRefreshActivities}
                  onNotificationSettingChange={handleNotificationSettingChange}
                  onShortcutToggle={handleShortcutToggle}
                />
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </PageContainer>
  );
};

export default ProfilePage;
