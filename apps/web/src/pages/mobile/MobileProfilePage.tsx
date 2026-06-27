import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Avatar,
  useTheme,
  List,
  Divider,
  Switch,
  Chip,
  Paper,
} from '@mui/material';
import {
  Home,
  ListTodo,
  ScanLine,
  CheckSquare,
  User,
  Bell,
  Settings,
  Smartphone,
  Database,
  Shield,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
  Moon,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout, MobileCard } from '@/components/mobile';
import { useAppStore } from '@/store';
import { useResponsive } from '@/hooks';

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
  const { user, setUser } = useAppStore();
  const { isMobile } = useResponsive();
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
          path: '/mobile/notifications',
        },
        {
          id: 'scan',
          icon: <ScanLine style={{ width: 20, height: 20 }} />,
          label: '扫码设置',
          subtitle: '条码格式、扫描模式',
          type: 'navigate',
          path: '/mobile/scan',
        },
        {
          id: 'offline',
          icon: <Database style={{ width: 20, height: 20 }} />,
          label: '离线同步',
          subtitle: '缓存、同步策略',
          type: 'navigate',
          path: '/mobile/offline-sync',
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
          path: '/mobile/settings-app',
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
          path: '/mobile/settings',
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
          path: '/mobile/settings',
        },
        {
          id: 'privacy',
          icon: <Shield style={{ width: 20, height: 20 }} />,
          label: '隐私设置',
          type: 'navigate',
          path: '/mobile/settings',
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
          path: '/mobile/settings',
        },
      ],
    },
  ];

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  const handleBottomTabChange = (tabId: string) => {
    switch (tabId) {
      case 'home':
        navigate('/mobile/home');
        break;
      case 'tasks':
        navigate('/mobile/tasks');
        break;
      case 'scan':
        navigate('/mobile/scan-page');
        break;
      case 'approval':
        navigate('/mobile/approvals');
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
          <ChevronRight style={{ width: 20, height: 20, color: 'text.secondary' }} />
        </Box>

        {settingGroups.map((group, groupIndex) => (
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
    </MobileLayout>
  );
};

export default MobileSettingsPage;
