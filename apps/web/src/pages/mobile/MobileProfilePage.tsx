import React, { useState } from 'react';
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
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [darkMode, setDarkMode] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);

  const settingGroups: SettingGroup[] = [
    {
      title: '通用设置',
      items: [
        {
          id: 'notifications',
          icon: <Bell style={{ width: 20, height: 20 }} />,
          label: '通知设置',
          subtitle: '推送、声音、振动',
          type: 'navigate',
          path: MOBILE_PATHS.notifications,
        },
        {
          id: 'scan',
          icon: <ScanLine style={{ width: 20, height: 20 }} />,
          label: '扫码设置',
          subtitle: '条码格式、扫描模式',
          type: 'navigate',
          path: MOBILE_PATHS.scan,
        },
        {
          id: 'offline',
          icon: <Database style={{ width: 20, height: 20 }} />,
          label: '离线同步',
          subtitle: '缓存、同步策略',
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
          label: '应用设置',
          subtitle: '更新、版本管理',
          type: 'navigate',
          path: MOBILE_PATHS.settingsApp,
        },
      ],
    },
    {
      title: '偏好设置',
      items: [
        {
          id: 'dark-mode',
          icon: <Moon style={{ width: 20, height: 20 }} />,
          label: '深色模式',
          type: 'switch',
          value: darkMode,
          onToggle: (value) => setDarkMode(value),
        },
        {
          id: 'push',
          icon: <Bell style={{ width: 20, height: 20 }} />,
          label: '推送通知',
          subtitle: '接收应用推送消息',
          type: 'switch',
          value: pushEnabled,
          onToggle: (value) => setPushEnabled(value),
        },
        {
          id: 'language',
          icon: <Globe style={{ width: 20, height: 20 }} />,
          label: '语言',
          subtitle: '简体中文',
          type: 'navigate',
          path: MOBILE_PATHS.settings,
        },
      ],
    },
    {
      title: '账号与安全',
      items: [
        {
          id: 'security',
          icon: <Shield style={{ width: 20, height: 20 }} />,
          label: '账号安全',
          subtitle: '密码、指纹、面容',
          type: 'navigate',
          path: MOBILE_PATHS.settings,
        },
        {
          id: 'privacy',
          icon: <Shield style={{ width: 20, height: 20 }} />,
          label: '隐私设置',
          type: 'navigate',
          path: MOBILE_PATHS.settings,
        },
      ],
    },
    {
      title: '其他',
      items: [
        {
          id: 'help',
          icon: <HelpCircle style={{ width: 20, height: 20 }} />,
          label: '帮助中心',
          type: 'navigate',
          path: '/help',
        },
        {
          id: 'about',
          icon: <Info style={{ width: 20, height: 20 }} />,
          label: '关于 TOPEMS',
          subtitle: '版本 2.1.0',
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
    { id: 'home', label: '首页', icon: <Home style={{ width: 22, height: 22 }} /> },
    { id: 'tasks', label: '任务', icon: <ListTodo style={{ width: 22, height: 22 }} /> },
    { id: 'scan', label: '扫码', icon: <ScanLine style={{ width: 22, height: 22 }} /> },
    {
      id: 'approval',
      label: '审批',
      icon: <CheckSquare style={{ width: 22, height: 22 }} />,
      badge: 3,
    },
    { id: 'profile', label: '我的', icon: <User style={{ width: 22, height: 22 }} /> },
  ];

  const handleNavigate = (path?: string) => {
    if (path) {
      navigate(path);
    }
  };

  return (
    <MobileLayout
      title='我的'
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
                {user?.fullName || user?.username || '用户'}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 0.5 }}
              >
                {user?.email || 'user@example.com'}
              </Typography>
              <Chip
                label={user?.role || '管理员'}
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
