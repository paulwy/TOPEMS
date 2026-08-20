/**
 * @done V79 Phase 2 split
 * Extracted from ProfilePage.tsx - centralizes all profile state, API calls, and handlers.
 *
 * Return structure：
 *   - Data:user / activities / preferences / shortcuts / notificationSettings
 *   - Loading/error:loading / error / loadingActivities
 *   - UI state:activeTab / showPasswordDialog / avatarUrl
 *   - Forms:profileForm / passwordForm
 *   - Handlers:handle* / set* / mutate*
 *   - ref：fileInputRef
 */
import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';
import { apiLogger } from '@/utils/logger';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { authApi, type User as UserType } from '@/api/iam';
import {
  useNotificationStore,
  useAuthStore,
  useShortcutsStore,
  useNotificationSettingsStore,
} from '@/store';
import { useAuth } from '../../../hooks/useAuth';
import { AUTH_PATHS } from '@/routes/auth';

export interface ActivityItem {
  id: string;
  action: string;
  resource: string;
  success: boolean;
  error_message?: string;
  created_at: string;
  ip_address?: string;
}

export interface NotificationSettings {
  email_enabled: boolean;
  system_enabled: boolean;
  workflow_enabled: boolean;
  document_enabled: boolean;
  security_enabled: boolean;
}

export interface ProfileFormData {
  full_name: string;
  email: string;
}

export interface PasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface ShortcutEntry {
  id: string;
  title: string;
  path: string;
  icon: string;
}

export type UseProfileReturn = ReturnType<typeof useProfile>;

export const useProfile = () => {
  const { t } = useTranslation();
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
      throw new Error(res.message || t('shared.profile.fetch_user_failed'));
    },
    staleTime: 5 * 60 * 1000,
  });

  const user = userProfileQuery.data ?? null;
  const loading = userProfileQuery.isLoading;
  const error = userProfileQuery.isError
    ? userProfileQuery.error instanceof Error
      ? userProfileQuery.error.message
      : t('shared.profile.fetch_user_failed')
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
          : t('shared.profile.fetch_user_failed');
      addNotification({ title: t('shared.profile.load_failed'), message: errorMsg, type: 'error' });
    }
  }, [userProfileQuery.isError, userProfileQuery.error, addNotification, t]);

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
        throw new Error(res.message || t('shared.profile.update_failed'));
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
        title: t('shared.profile.success'),
        message: t('shared.profile.profile_updated'),
        type: 'success',
      });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMsg =
        error.response?.data?.message || error.message || t('shared.profile.update_failed');
      addNotification({ title: t('shared.profile.fail'), message: errorMsg, type: 'error' });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { current_password: string; new_password: string }) => {
      const res = await authApi.changePassword(data);
      if (!res.success) {
        throw new Error(res.message || t('shared.profile.change_pwd_failed'));
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
        title: t('shared.profile.success'),
        message: t('shared.profile.pwd_changed_relogin'),
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
      const errorMsg =
        error.response?.data?.message || error.message || t('shared.profile.change_pwd_failed');
      addNotification({ title: t('shared.profile.fail'), message: errorMsg, type: 'error' });
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: async (params: { avatar_url: string }) => {
      const res = await authApi.updateAvatar(params);
      if (!res.success || !res.data) {
        throw new Error(t('shared.profile.avatar_update_failed'));
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
        title: t('shared.profile.success'),
        message: t('shared.profile.avatar_updated'),
        type: 'success',
      });
    },
    onError: () => {
      addNotification({
        title: t('shared.profile.error'),
        message: t('shared.profile.avatar_update_failed'),
        type: 'error',
      });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (params: Record<string, unknown>) => {
      await authApi.updatePreferences(params);
    },
    onError: (err: unknown) => {
      apiLogger.error(t('shared.profile.save_prefs_failed_log'), err);
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
        title: t('shared.profile.error'),
        message: t('shared.profile.select_image'),
        type: 'error',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      addNotification({
        title: t('shared.profile.error'),
        message: t('shared.profile.image_too_large'),
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
        title: t('shared.profile.error'),
        message: t('shared.profile.pwd_mismatch'),
        type: 'error',
      });
      passwordForm.setError('confirm_password', {
        message: t('shared.profile.pwd_mismatch'),
      });
      return;
    }

    if (data.new_password.length < 6) {
      addNotification({
        title: t('shared.profile.error'),
        message: t('shared.profile.pwd_min_length'),
        type: 'error',
      });
      passwordForm.setError('new_password', { message: t('shared.profile.pwd_min_length') });
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
            title: t('shared.profile.success'),
            message: t('shared.profile.notify_setting_updated', { key: String(key) }),
            type: 'success',
          });
        },
        onError: () => {
          addNotification({
            title: t('shared.profile.error'),
            message: t('shared.profile.save_notify_failed'),
            type: 'error',
          });
        },
      }
    );
  };

  const handleShortcutToggle = (shortcut: ShortcutEntry) => {
    let newShortcuts: ShortcutEntry[];
    if (shortcuts.some((s) => s.id === shortcut.id)) {
      newShortcuts = shortcuts.filter((s) => s.id !== shortcut.id);
      addNotification({
        title: t('shared.profile.hint'),
        message: t('shared.profile.shortcut_removed', { title: shortcut.title }),
        type: 'info',
      });
    } else {
      newShortcuts = [...shortcuts, shortcut];
      addNotification({
        title: t('shared.profile.hint'),
        message: t('shared.profile.shortcut_added', { title: shortcut.title }),
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

  const handleTabChange = (_: unknown, value: number) => {
    setActiveTab(value);
  };

  const openPasswordDialog = () => setShowPasswordDialog(true);
  const closePasswordDialog = () => {
    setShowPasswordDialog(false);
    passwordForm.reset();
  };

  const handleLogout = () => {
    logout();
    navigate(AUTH_PATHS.login);
  };

  return {
    // data
    user,
    activities,
    loading,
    error,
    loadingActivities,
    shortcuts,
    notificationSettings,
    // UI state
    activeTab,
    showPasswordDialog,
    avatarUrl,
    // refs
    fileInputRef,
    // forms
    profileForm,
    passwordForm,
    // mutations status
    updateProfileMutation,
    changePasswordMutation,
    updateAvatarMutation,
    updatePreferencesMutation,
    // handlers
    handleAvatarUpload,
    handleProfileUpdate,
    handlePasswordChange,
    handleNotificationSettingChange,
    handleShortcutToggle,
    handleRetryProfile,
    handleRefreshActivities,
    handleTabChange,
    openPasswordDialog,
    closePasswordDialog,
    handleLogout,
    // setters
    setActiveTab,
    setShowPasswordDialog,
    setAvatarUrl,
  };
};
