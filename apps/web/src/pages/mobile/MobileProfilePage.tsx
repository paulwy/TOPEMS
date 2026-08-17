import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mobileApi } from '@/api/mobile';
import { Box, Typography, Avatar, useTheme, Switch, Chip, Paper } from '@mui/material';
import {
  Home,
  ListTodo,
  ScanLine,
  CheckSquare,
  User,
  Bell,
  Smartphone,
  Database,
  Shield,
  HelpCircle,
  Info,
  ChevronRight,
  Moon,
  Globe,
} from 'lucide-react';
import i18n from '@/i18n';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, MobileCard } from '@/components/mobile';
import { useAuthStore } from '@/store';
import { MOBILE_PATHS } from '@/modules/mobile/config';
import { AUTH_PATHS } from '@/routes/auth';
import { PageContainer } from '@/components/common';
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
  const { data: backendData } = useQuery({
    queryKey: ['mobile-profile-page'],
    queryFn: async () => {
      try {
        return await mobileApi.user.getProfile() ?? {};
      } catch (e) {
        return {};
      }
    },
  });
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [darkMode, setDarkMode] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const settingGroups: SettingGroup[] = [
    {
      title: i18n.t('mobile.mobile_profile_page.k0'),
      items: [
        {
          id: 'notifications',
          icon: <Bell style={{ width: 20, height: 20 }} />,
          label: i18n.t('mobile.mobile_profile_page.k1'),
          subtitle: i18n.t('mobile.mobile_profile_page.k2'),
          type: 'navigate',
          path: MOBILE_PATHS.notifications,
        },
        {
          id: 'scan',
          icon: <ScanLine style={{ width: 20, height: 20 }} />,
          label: i18n.t('mobile.mobile_profile_page.k3'),
          subtitle: i18n.t('mobile.mobile_profile_page.k4'),
          type: 'navigate',
          path: MOBILE_PATHS.scan,
        },
        {
          id: 'offline',
          icon: <Database style={{ width: 20, height: 20 }} />,
          label: i18n.t('mobile.mobile_profile_page.k5'),
          subtitle: i18n.t('mobile.mobile_profile_page.k6'),
          type: 'navigate',
          path: MOBILE_PATHS.offlineSync,
          badge: (
            <Chip
              label='2.3 GB'
              size='small'
              variant='outlined'
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          ),
        },
        {
          id: 'app-settings',
          icon: <Smartphone style={{ width: 20, height: 20 }} />,
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
          icon: <Moon style={{ width: 20, height: 20 }} />,
          label: i18n.t('mobile.mobile_profile_page.k10'),
          type: 'switch',
          value: darkMode,
          onToggle: (value) => setDarkMode(value),
        },
        {
          id: 'push',
          icon: <Bell style={{ width: 20, height: 20 }} />,
          label: i18n.t('mobile.mobile_profile_page.k11'),
          subtitle: i18n.t('mobile.mobile_profile_page.k12'),
          type: 'switch',
          value: pushEnabled,
          onToggle: (value) => setPushEnabled(value),
        },
        {
          id: 'language',
          icon: <Globe style={{ width: 20, height: 20 }} />,
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
          icon: <Shield style={{ width: 20, height: 20 }} />,
          label: i18n.t('mobile.mobile_profile_page.k16'),
          subtitle: i18n.t('mobile.mobile_profile_page.k17'),
          type: 'navigate',
          path: MOBILE_PATHS.settings,
        },
        {
          id: 'privacy',
          icon: <Shield style={{ width: 20, height: 20 }} />,
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
          icon: <HelpCircle style={{ width: 20, height: 20 }} />,
          label: i18n.t('mobile.mobile_profile_page.k20'),
          type: 'navigate',
          path: '/help',
        },
        {
          id: 'about',
          icon: <Info style={{ width: 20, height: 20 }} />,
          label: i18n.t('mobile.mobile_profile_page.topems_21'),
          subtitle: i18n.t('pages.mobile_profile_page.210_0'),
          type: 'navigate',
          path: MOBILE_PATHS.settings,
        },
      ],
    },
  ];
  const handleLogout = () => {
    setUser(null);
    navigate(AUTH_PATHS.login);
  };
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
    { id: 'home', label: i18n.t('mobile.mobile_profile_page.k22'), icon: <Home style={{ width: 22, height: 22 }} /> },
    { id: 'tasks', label: i18n.t('mobile.mobile_profile_page.k23'), icon: <ListTodo style={{ width: 22, height: 22 }} /> },
    { id: 'scan', label: i18n.t('mobile.mobile_profile_page.k24'), icon: <ScanLine style={{ width: 22, height: 22 }} /> },
    {
      id: 'approval',
      label: i18n.t('mobile.mobile_profile_page.k25'),
      icon: <CheckSquare style={{ width: 22, height: 22 }} />,
      badge: 3,
    },
    { id: 'profile', label: i18n.t('mobile.mobile_profile_page.k26'), icon: <User style={{ width: 22, height: 22 }} /> },
  ];
  const handleNavigate = (path?: string) => {
    if (path) {
      navigate(path);
    }
  };
  return (
    <MobileLayout
      title={i18n.t('mobile.mobile_profile_page.k27')}
      showBack={false}
      showMenu={false}
      showNotifications
      notificationCount={5}
      showTabBar
      tabs={bottomTabs}
      activeTab='profile'
      onTabChange={handleBottomTabChange}
    >
      <PageContainer
        autoTitle={false}
        autoBreadcrumbs={false}
        padding={false}
        maxWidth={false}
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
                fontSize: '1.5rem',
                bgcolor: 'primary.main',
              }}
            >
              {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, mb: 0.5 }}
              >
                {user?.fullName || user?.username || i18n.t('mobile.mobile_profile_page.k28')}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 0.5 }}
              >
                {user?.email || 'user@example.com'}
              </Typography>
              <Chip
                label={user?.role || i18n.t('mobile.mobile_profile_page.k29')}
                size='small'
                color='primary'
                variant='outlined'
                sx={{ height: 22, fontSize: '0.75rem' }}
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
      </PageContainer>
    </MobileLayout>
  );
};
export default MobileSettingsPage;