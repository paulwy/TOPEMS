import { designTokens } from '@topems/tokens';
import styles from './MobileProfilePage.module.css';
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userApi, type UserSettings } from '@/api/mobile/user';
import { useThemeStore } from '@/store';
import { Box, Typography, Avatar, useTheme, Switch, Chip, Paper } from '@mui/material';
import {
  Home,
  ListTodo,
  ScanLine,
  CheckSquare,
  User,
  Bell,
  Smartphone,
  Shield,
  HelpCircle,
  Info,
  ChevronRight,
  Moon,
  Globe,
} from 'lucide-react';
import i18n from '@/i18n';
import { useNavigate } from 'react-router-dom';
import { BottomTabBar, MobileCard } from '@/components/mobile';
import { MobilePageTemplate } from '@/components/templates';
import { useAuthStore } from '@/store';
import { useCurrentIamUser } from '@/hooks/useCurrentIamUser';
import { MOBILE_PATHS } from '@/module-configs/mobile/config';
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount';

interface SettingGroup {
  title: string;
  items: SettingItem[];
}
interface SettingItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  type: 'navigate' | 'switch';
  path?: string;
  value?: boolean;
  onToggle?: (value: boolean) => void;
  badge?: React.ReactNode;
}
const MobileSettingsPage: React.FC = () => {
  const unreadNotificationCount = useUnreadNotificationCount();
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const iamUser = useCurrentIamUser();
  const { data: profile } = useQuery({
    queryKey: ['mobile-profile'],
    // 移动端 profile 读的是独立的 mobile.mobile_users 记录，控制台账号（走 iam.users）通常没有该行，
    // 后端返回 404「用户不存在」。这不是错误，按「无扩展资料」处理，页面回落到 IAM 登录态信息。
    queryFn: () =>
      userApi
        .getProfile()
        .then((res) => res.data ?? null)
        .catch((e: { response?: { status?: number } }) => {
          if (e?.response?.status === 404) return null;
          throw e;
        }),
  });
  const displayName =
    profile?.full_name ||
    profile?.nickname ||
    iamUser?.full_name ||
    user?.realName ||
    user?.full_name ||
    user?.username ||
    '';
  const displayEmail = profile?.email || user?.email || '';
  const displayRole =
    profile?.position ||
    user?.role ||
    profile?.department ||
    i18n.t('mobile.mobile_profile_page.k29');
  // 深色模式与推送开关都读写真实设置：深色走全局主题 store，推送写 mobile.user_settings。
  const themeMode = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const darkMode = themeMode === 'dark';
  const [pushEnabled, setPushEnabled] = useState(true);
  const settingsQuery = useQuery({
    queryKey: ['mobile-user-settings'],
    queryFn: () => userApi.getSettings().then((res) => res.data ?? null),
  });
  useEffect(() => {
    if (settingsQuery.data && typeof settingsQuery.data.notification_enabled === 'boolean') {
      setPushEnabled(settingsQuery.data.notification_enabled);
    }
  }, [settingsQuery.data]);
  const handleToggleDarkMode = React.useCallback(
    (value: boolean) => {
      setTheme(value ? 'dark' : 'light');
      void userApi.updateSettings({ theme: value ? 'dark' : 'light' }).catch(() => undefined);
    },
    [setTheme]
  );
  const handleTogglePush = React.useCallback(
    (value: boolean) => {
      const previous = pushEnabled;
      setPushEnabled(value);
      void userApi.updateSettings({ notification_enabled: value }).catch(async () => {
        setPushEnabled(previous);
        await settingsQuery.refetch();
      });
    },
    [pushEnabled, settingsQuery]
  );
  const settingGroups: SettingGroup[] = [
    {
      title: i18n.t('mobile.mobile_profile_page.k0'),
      items: [
        {
          id: 'notifications',
          icon: <Bell className={styles.il1} />,
          label: i18n.t('mobile.mobile_profile_page.k1'),
          subtitle: i18n.t('mobile.mobile_profile_page.k2'),
          type: 'navigate',
          path: MOBILE_PATHS.notifications,
        },
        {
          id: 'scan',
          icon: <ScanLine className={styles.il2} />,
          label: i18n.t('mobile.mobile_profile_page.k3'),
          subtitle: i18n.t('mobile.mobile_profile_page.k4'),
          type: 'navigate',
          path: MOBILE_PATHS.scan,
        },
        {
          id: 'app-settings',
          icon: <Smartphone className={styles.il4} />,
          label: i18n.t('mobile.mobile_profile_page.k7'),
          subtitle: i18n.t('mobile.mobile_profile_page.k8'),
          type: 'navigate',
          path: MOBILE_PATHS.settingsApp,
        },
      ],
    },
    {
      title: i18n.t('mobile.mobile_profile_page.k9'),
      items: [
        {
          id: 'dark-mode',
          icon: <Moon className={styles.il5} />,
          label: i18n.t('mobile.mobile_profile_page.k10'),
          type: 'switch',
          value: darkMode,
          onToggle: handleToggleDarkMode,
        },
        {
          id: 'push',
          icon: <Bell className={styles.il6} />,
          label: i18n.t('mobile.mobile_profile_page.k11'),
          subtitle: i18n.t('mobile.mobile_profile_page.k12'),
          type: 'switch',
          value: pushEnabled,
          onToggle: handleTogglePush,
        },
        {
          id: 'language',
          icon: <Globe className={styles.il7} />,
          label: i18n.t('mobile.mobile_profile_page.k13'),
          subtitle: i18n.t('mobile.mobile_profile_page.k14'),
          type: 'navigate',
          path: MOBILE_PATHS.settings,
        },
      ],
    },
    {
      title: i18n.t('mobile.mobile_profile_page.k15'),
      items: [
        {
          id: 'security',
          icon: <Shield className={styles.il8} />,
          label: i18n.t('mobile.mobile_profile_page.k16'),
          subtitle: i18n.t('mobile.mobile_profile_page.k17'),
          type: 'navigate',
          path: MOBILE_PATHS.settings,
        },
        {
          id: 'privacy',
          icon: <Shield className={styles.il9} />,
          label: i18n.t('mobile.mobile_profile_page.k18'),
          type: 'navigate',
          path: MOBILE_PATHS.settings,
        },
      ],
    },
    {
      title: i18n.t('mobile.mobile_profile_page.k19'),
      items: [
        {
          id: 'help',
          icon: <HelpCircle className={styles.il10} />,
          label: i18n.t('mobile.mobile_profile_page.k20'),
          type: 'navigate',
          path: '/help',
        },
        {
          id: 'about',
          icon: <Info className={styles.il11} />,
          label: i18n.t('mobile.mobile_profile_page.topems_21'),
          subtitle: i18n.t('pages.mobile_profile_page.210_0'),
          type: 'navigate',
          path: MOBILE_PATHS.settings,
        },
      ],
    },
  ];
  const handleBottomTabChange = (tabId: string) => {
    switch (tabId) {
      case 'home':
        navigate(MOBILE_PATHS.home);
        break;
      case 'tasks':
        navigate(MOBILE_PATHS.tasks);
        break;
      case 'scan':
        navigate(MOBILE_PATHS.scanPage);
        break;
      case 'approval':
        navigate(MOBILE_PATHS.approvals);
        break;
      case 'profile':
        break;
    }
  };
  const bottomTabs = [
    {
      id: 'home',
      label: i18n.t('mobile.mobile_profile_page.k22'),
      icon: <Home className={styles.il12} />,
    },
    {
      id: 'tasks',
      label: i18n.t('mobile.mobile_profile_page.k23'),
      icon: <ListTodo className={styles.il13} />,
    },
    {
      id: 'scan',
      label: i18n.t('mobile.mobile_profile_page.k24'),
      icon: <ScanLine className={styles.il14} />,
    },
    {
      id: 'approval',
      label: i18n.t('mobile.mobile_profile_page.k25'),
      icon: <CheckSquare className={styles.il15} />,
    },
    {
      id: 'profile',
      label: i18n.t('mobile.mobile_profile_page.k26'),
      icon: <User className={styles.il16} />,
    },
  ];
  const handleNavigate = (path?: string) => {
    if (path) {
      navigate(path);
    }
  };
  return (
    <MobilePageTemplate
      title={i18n.t('mobile.mobile_profile_page.k27')}
      bottomNav={
        <BottomTabBar
          tabs={bottomTabs}
          activeTab='profile'
          onChange={handleBottomTabChange}
        />
      }
      headerProps={{
        showBack: false,
        showMenu: false,
        showNotifications: true,
        notificationCount: unreadNotificationCount,
      }}
    >
      <Box sx={{ p: 2, pb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            p: 2.5,
            mb: 3,
            borderRadius: 2,
            bgcolor: theme.palette.background.paper,
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Avatar
            sx={{
              width: 64,
              height: 64,
              fontSize: designTokens.typography.fontSize.scale['1.5rem'],
              bgcolor: 'primary.main',
            }}
          >
            {displayName.charAt(0) || 'U'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600, mb: 0.5 }}
            >
              {displayName || i18n.t('mobile.mobile_profile_page.k28')}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 0.5 }}
            >
              {displayEmail}
            </Typography>
            <Chip
              label={displayRole}
              size='small'
              color='primary'
              variant='outlined'
              sx={{ height: 22, fontSize: designTokens.typography.fontSize.scale['0.75rem'] }}
            />
          </Box>
          <ChevronRight style={{ width: 20, height: 20, color: theme.palette.text.secondary }} />
        </Box>
        {settingGroups.map((group, _groupIndex) => (
          <Box
            key={group.title}
            sx={{ mb: 3 }}
          >
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{
                display: 'block',
                mb: 1,
                px: 1,
                fontWeight: 500,
              }}
            >
              {group.title}
            </Typography>
            <Paper
              elevation={0}
              sx={{
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                overflow: 'hidden',
              }}
            >
              {group.items.map((item, index) => (
                <React.Fragment key={item.id}>
                  <MobileCard
                    leftIcon={item.icon}
                    title={item.label}
                    subtitle={item.subtitle}
                    showArrow={item.type === 'navigate'}
                    divider={index < group.items.length - 1}
                    rightContent={
                      item.type === 'switch' ? (
                        <Switch
                          checked={item.value || false}
                          onChange={(e) => item.onToggle?.(e.target.checked)}
                        />
                      ) : item.badge ? (
                        item.badge
                      ) : undefined
                    }
                    onClick={() => item.type === 'navigate' && handleNavigate(item.path)}
                    sx={{ minHeight: 52 }}
                  />
                </React.Fragment>
              ))}
            </Paper>
          </Box>
        ))}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            pt: 2,
          }}
        >
          <Typography
            variant='caption'
            color='text.secondary'
          >
            TOPEMS v2.1.0
          </Typography>
        </Box>
      </Box>
    </MobilePageTemplate>
  );
};
export default MobileSettingsPage;
