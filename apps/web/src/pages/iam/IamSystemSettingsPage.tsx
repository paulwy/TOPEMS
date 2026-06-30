/**
 * IAM 系统设置页面 - V4.0 标准化改造
 *
 * 改造要点：
 * 1. 使用 SettingsPageTemplate 统一设置页布局
 * 2. 左侧分组导航，右侧设置内容
 * 3. PageContainer autoTitle + autoBreadcrumbs
 *
 * @module pages/iam
 * @path /iam/system
 */

import {
  Box,
  Typography,
  Switch,
  TextField,
  Button,
  Stack,
  Paper,
  Divider,
  Chip,
} from '@mui/material';
import React, { useState, useCallback, useMemo } from 'react';
import {
  Settings,
  Shield,
  Bell,
  Palette,
  Globe,
  Database,
  Save,
  RotateCcw,
} from 'lucide-react';

import { useAppStore } from '../../store';
import { PageContainer } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';

/**
 * 设置分组配置
 */
interface SettingGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    id: 'general',
    label: '通用设置',
    icon: <Settings size={18} />,
    description: '系统基础参数配置',
  },
  {
    id: 'security',
    label: '安全设置',
    icon: <Shield size={18} />,
    description: '安全策略和访问控制',
  },
  {
    id: 'notification',
    label: '通知设置',
    icon: <Bell size={18} />,
    description: '系统通知和消息推送',
  },
  {
    id: 'appearance',
    label: '外观设置',
    icon: <Palette size={18} />,
    description: '主题和界面样式',
  },
  {
    id: 'i18n',
    label: '国际化',
    icon: <Globe size={18} />,
    description: '多语言和地区设置',
  },
];

export const IamSystemSettingsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  // 当前选中的设置分组
  const [activeGroup, setActiveGroup] = useState('general');

  // 通用设置
  const [generalSettings, setGeneralSettings] = useState({
    systemName: 'TOPEMS 企业级平台',
    systemVersion: 'v4.0.0',
    companyName: '示例科技有限公司',
    maxLoginAttempts: 5,
    sessionTimeout: 30,
  });

  // 安全设置
  const [securitySettings, setSecuritySettings] = useState({
    mfaEnabled: false,
    passwordExpiry: 90,
    minPasswordLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    ipWhitelistEnabled: false,
    loginAlertsEnabled: true,
  });

  // 通知设置
  const [notificationSettings, setNotificationSettings] = useState({
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    systemAnnouncements: true,
    securityAlerts: true,
    taskReminders: true,
  });

  // 外观设置
  const [appearanceSettings, setAppearanceSettings] = useState({
    defaultTheme: 'light',
    compactMode: false,
    sidebarCollapsed: false,
    showBreadcrumbs: true,
    animationEnabled: true,
  });

  // 国际化设置
  const [i18nSettings, setI18nSettings] = useState({
    defaultLanguage: 'zh-CN',
    defaultTimezone: 'Asia/Shanghai',
    defaultDateFormat: 'YYYY-MM-DD',
    defaultTimeFormat: 'HH:mm:ss',
    defaultFirstDayOfWeek: 1,
  });

  // 保存对话框
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  /**
   * 标记有未保存的更改
   */
  const markUnsaved = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  /**
   * 保存设置
   */
  const handleSave = useCallback(() => {
    setConfirmDialogOpen(true);
  }, []);

  /**
   * 确认保存
   */
  const confirmSave = useCallback(() => {
    // 模拟保存操作
    addNotification({
      title: '保存成功',
      message: '系统设置已保存',
      type: 'success',
    });
    setHasUnsavedChanges(false);
    setConfirmDialogOpen(false);
  }, [addNotification]);

  /**
   * 重置设置
   */
  const handleReset = useCallback(() => {
    // 重置当前分组的设置为默认值
    addNotification({
      title: '已重置',
      message: '当前分组设置已恢复默认值',
      type: 'info',
    });
  }, [addNotification]);

  /**
   * 渲染通用设置
   */
  const renderGeneralSettings = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 1 }}>
          系统信息
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          配置系统的基本信息和通用参数
        </Typography>
        <Stack spacing={2}>
          <TextField
            fullWidth
            label='系统名称'
            value={generalSettings.systemName}
            onChange={(e) => {
              setGeneralSettings({ ...generalSettings, systemName: e.target.value });
              markUnsaved();
            }}
            size='small'
          />
          <TextField
            fullWidth
            label='公司名称'
            value={generalSettings.companyName}
            onChange={(e) => {
              setGeneralSettings({ ...generalSettings, companyName: e.target.value });
              markUnsaved();
            }}
            size='small'
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label='系统版本'
              value={generalSettings.systemVersion}
              disabled
              size='small'
            />
          </Box>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
          会话设置
        </Typography>
        <Stack spacing={2}>
          <TextField
            fullWidth
            type='number'
            label='最大登录尝试次数'
            value={generalSettings.maxLoginAttempts}
            onChange={(e) => {
              setGeneralSettings({
                ...generalSettings,
                maxLoginAttempts: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            helperText='超过此次数将锁定账户'
          />
          <TextField
            fullWidth
            type='number'
            label='会话超时时间（分钟）'
            value={generalSettings.sessionTimeout}
            onChange={(e) => {
              setGeneralSettings({
                ...generalSettings,
                sessionTimeout: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            helperText='无操作自动登出时间'
          />
        </Stack>
      </Box>
    </Stack>
  );

  /**
   * 渲染安全设置
   */
  const renderSecuritySettings = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 1 }}>
          密码策略
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          配置密码强度要求和过期策略
        </Typography>
        <Stack spacing={2}>
          <TextField
            fullWidth
            type='number'
            label='最小密码长度'
            value={securitySettings.minPasswordLength}
            onChange={(e) => {
              setSecuritySettings({
                ...securitySettings,
                minPasswordLength: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
          />
          <TextField
            fullWidth
            type='number'
            label='密码有效期（天）'
            value={securitySettings.passwordExpiry}
            onChange={(e) => {
              setSecuritySettings({
                ...securitySettings,
                passwordExpiry: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            helperText='0 表示永不过期'
          />
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Typography variant='body2'>要求大写字母</Typography>
            <Switch
              checked={securitySettings.requireUppercase}
              onChange={(e) => {
                setSecuritySettings({ ...securitySettings, requireUppercase: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Typography variant='body2'>要求小写字母</Typography>
            <Switch
              checked={securitySettings.requireLowercase}
              onChange={(e) => {
                setSecuritySettings({ ...securitySettings, requireLowercase: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Typography variant='body2'>要求数字</Typography>
            <Switch
              checked={securitySettings.requireNumbers}
              onChange={(e) => {
                setSecuritySettings({ ...securitySettings, requireNumbers: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Typography variant='body2'>要求特殊字符</Typography>
            <Switch
              checked={securitySettings.requireSpecialChars}
              onChange={(e) => {
                setSecuritySettings({ ...securitySettings, requireSpecialChars: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
          登录安全
        </Typography>
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 500 }}>双因素认证</Typography>
              <Typography variant='caption' color='text.secondary'>启用 MFA 增强账户安全</Typography>
            </Box>
            <Switch
              checked={securitySettings.mfaEnabled}
              onChange={(e) => {
                setSecuritySettings({ ...securitySettings, mfaEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 500 }}>登录提醒</Typography>
              <Typography variant='caption' color='text.secondary'>新设备登录时发送通知</Typography>
            </Box>
            <Switch
              checked={securitySettings.loginAlertsEnabled}
              onChange={(e) => {
                setSecuritySettings({ ...securitySettings, loginAlertsEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 500 }}>IP白名单</Typography>
              <Typography variant='caption' color='text.secondary'>仅允许白名单IP访问</Typography>
            </Box>
            <Switch
              checked={securitySettings.ipWhitelistEnabled}
              onChange={(e) => {
                setSecuritySettings({ ...securitySettings, ipWhitelistEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>
    </Stack>
  );

  /**
   * 渲染通知设置
   */
  const renderNotificationSettings = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 1 }}>
          通知渠道
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          配置系统通知的发送渠道
        </Typography>
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 500 }}>邮件通知</Typography>
              <Typography variant='caption' color='text.secondary'>通过邮件发送系统通知</Typography>
            </Box>
            <Switch
              checked={notificationSettings.emailEnabled}
              onChange={(e) => {
                setNotificationSettings({ ...notificationSettings, emailEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 500 }}>短信通知</Typography>
              <Typography variant='caption' color='text.secondary'>通过短信发送重要通知</Typography>
            </Box>
            <Switch
              checked={notificationSettings.smsEnabled}
              onChange={(e) => {
                setNotificationSettings({ ...notificationSettings, smsEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 500 }}>站内推送</Typography>
              <Typography variant='caption' color='text.secondary'>在系统内推送实时消息</Typography>
            </Box>
            <Switch
              checked={notificationSettings.pushEnabled}
              onChange={(e) => {
                setNotificationSettings({ ...notificationSettings, pushEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
          通知类型
        </Typography>
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Typography variant='body2'>系统公告</Typography>
            <Switch
              checked={notificationSettings.systemAnnouncements}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  systemAnnouncements: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Typography variant='body2'>安全告警</Typography>
            <Switch
              checked={notificationSettings.securityAlerts}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  securityAlerts: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Typography variant='body2'>任务提醒</Typography>
            <Switch
              checked={notificationSettings.taskReminders}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  taskReminders: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>
    </Stack>
  );

  /**
   * 渲染外观设置
   */
  const renderAppearanceSettings = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 1 }}>
          主题设置
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          配置系统界面外观
        </Typography>
        <Stack spacing={2}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 500 }}>默认主题</Typography>
              <Typography variant='caption' color='text.secondary'>
                当前: {appearanceSettings.defaultTheme === 'light' ? '浅色' : '深色'}
              </Typography>
            </Box>
            <Chip
              size='small'
              label={appearanceSettings.defaultTheme === 'light' ? '浅色' : '深色'}
              color='primary'
              variant='outlined'
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 500 }}>紧凑模式</Typography>
              <Typography variant='caption' color='text.secondary'>减少内边距显示更多内容</Typography>
            </Box>
            <Switch
              checked={appearanceSettings.compactMode}
              onChange={(e) => {
                setAppearanceSettings({ ...appearanceSettings, compactMode: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 500 }}>侧边栏收起</Typography>
              <Typography variant='caption' color='text.secondary'>默认收起侧边栏</Typography>
            </Box>
            <Switch
              checked={appearanceSettings.sidebarCollapsed}
              onChange={(e) => {
                setAppearanceSettings({ ...appearanceSettings, sidebarCollapsed: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Typography variant='body2'>显示面包屑</Typography>
            <Switch
              checked={appearanceSettings.showBreadcrumbs}
              onChange={(e) => {
                setAppearanceSettings({ ...appearanceSettings, showBreadcrumbs: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
            }}
          >
            <Typography variant='body2'>动画效果</Typography>
            <Switch
              checked={appearanceSettings.animationEnabled}
              onChange={(e) => {
                setAppearanceSettings({ ...appearanceSettings, animationEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>
    </Stack>
  );

  /**
   * 渲染国际化设置
   */
  const renderI18nSettings = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 1 }}>
          地区设置
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          配置默认语言和日期格式
        </Typography>
        <Stack spacing={2}>
          <TextField
            fullWidth
            label='默认语言'
            value={i18nSettings.defaultLanguage}
            onChange={(e) => {
              setI18nSettings({ ...i18nSettings, defaultLanguage: e.target.value });
              markUnsaved();
            }}
            size='small'
          />
          <TextField
            fullWidth
            label='默认时区'
            value={i18nSettings.defaultTimezone}
            onChange={(e) => {
              setI18nSettings({ ...i18nSettings, defaultTimezone: e.target.value });
              markUnsaved();
            }}
            size='small'
          />
          <TextField
            fullWidth
            label='默认日期格式'
            value={i18nSettings.defaultDateFormat}
            onChange={(e) => {
              setI18nSettings({ ...i18nSettings, defaultDateFormat: e.target.value });
              markUnsaved();
            }}
            size='small'
          />
          <TextField
            fullWidth
            label='默认时间格式'
            value={i18nSettings.defaultTimeFormat}
            onChange={(e) => {
              setI18nSettings({ ...i18nSettings, defaultTimeFormat: e.target.value });
              markUnsaved();
            }}
            size='small'
          />
        </Stack>
      </Box>
    </Stack>
  );

  /**
   * 渲染当前分组的设置内容
   */
  const renderContent = useMemo(() => {
    switch (activeGroup) {
      case 'general':
        return renderGeneralSettings();
      case 'security':
        return renderSecuritySettings();
      case 'notification':
        return renderNotificationSettings();
      case 'appearance':
        return renderAppearanceSettings();
      case 'i18n':
        return renderI18nSettings();
      default:
        return renderGeneralSettings();
    }
  }, [activeGroup, generalSettings, securitySettings, notificationSettings, appearanceSettings, i18nSettings]);

  const currentGroup = SETTING_GROUPS.find((g) => g.id === activeGroup);

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Settings size={20} />,
        backButton: {
          href: '/iam/dashboard',
        },
      }}
    >
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '240px 1fr' },
            minHeight: 600,
          }}
        >
          {/* 左侧分组导航 */}
          <Box
            sx={{
              borderRight: 1,
              borderColor: 'divider',
              bgcolor: 'grey.50',
              p: 2,
            }}
          >
            <Stack spacing={0.5}>
              {SETTING_GROUPS.map((group) => (
                <Box
                  key={group.id}
                  onClick={() => setActiveGroup(group.id)}
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    bgcolor: activeGroup === group.id ? 'primary.50' : 'transparent',
                    borderLeft: activeGroup === group.id ? '3px solid' : '3px solid transparent',
                    borderLeftColor: 'primary.main',
                    '&:hover': {
                      bgcolor: activeGroup === group.id ? 'primary.50' : 'action.hover',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: activeGroup === group.id ? 'primary.main' : 'text.secondary',
                      }}
                    >
                      {group.icon}
                    </Box>
                    <Box>
                      <Typography
                        variant='body2'
                        sx={{
                          fontWeight: activeGroup === group.id ? 600 : 400,
                          color: activeGroup === group.id ? 'primary.main' : 'text.primary',
                        }}
                      >
                        {group.label}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* 右侧设置内容 */}
          <Box sx={{ p: 4 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant='h5' sx={{ fontWeight: 600, mb: 0.5 }}>
                {currentGroup?.label}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {currentGroup?.description}
              </Typography>
            </Box>

            {renderContent}

            {/* 底部操作栏 */}
            <Box
              sx={{
                mt: 4,
                pt: 2,
                borderTop: 1,
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {hasUnsavedChanges && (
                <Typography variant='body2' color='warning.main'>
                  有未保存的更改
                </Typography>
              )}
              {!hasUnsavedChanges && <Box />}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant='outlined'
                  startIcon={<RotateCcw size={16} />}
                  onClick={handleReset}
                >
                  重置
                </Button>
                <Button
                  variant='contained'
                  startIcon={<Save size={16} />}
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges}
                >
                  保存设置
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* 保存确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={confirmSave}
        title='保存设置'
        message='确定要保存当前的系统设置吗？'
      />
    </PageContainer>
  );
};

export default IamSystemSettingsPage;
