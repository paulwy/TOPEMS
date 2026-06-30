import {
  Box,
  Typography,
  Switch,
  TextField,
  Button,
  Stack,
  Paper,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Chip,
} from '@mui/material';
import React, { useState, useCallback, useMemo } from 'react';
import {
  Settings,
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Users,
  RotateCcw,
  Save,
  Clock,
  Zap,
  Webhook,
  Bookmark,
  AlertCircle,
  Layers,
} from 'lucide-react';

import { useAppStore } from '../../store';
import { PageContainer } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { extractErrorMessage } from '@/utils/errors';

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
    description: '通知总开关、免打扰时段',
  },
  {
    id: 'channel',
    label: '渠道设置',
    icon: <Bell size={18} />,
    description: '站内信、邮件、短信、推送、企业微信',
  },
  {
    id: 'message',
    label: '消息设置',
    icon: <MessageSquare size={18} />,
    description: '消息分类、重要性等级、自动已读',
  },
  {
    id: 'subscription',
    label: '订阅设置',
    icon: <Bookmark size={18} />,
    description: '订阅管理、通知偏好',
  },
  {
    id: 'advanced',
    label: '高级设置',
    icon: <Zap size={18} />,
    description: '重试策略、限速配置、Webhook',
  },
];

export const NotificationSettingsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeGroup, setActiveGroup] = useState('general');

  const [generalSettings, setGeneralSettings] = useState({
    notificationEnabled: true,
    doNotDisturbEnabled: false,
    doNotDisturbStart: '22:00',
    doNotDisturbEnd: '08:00',
    soundEnabled: true,
    vibrationEnabled: false,
    badgeEnabled: true,
  });

  const [channelSettings, setChannelSettings] = useState({
    inAppEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    wechatEnabled: false,
    emailAddress: 'user@example.com',
    smsPhone: '138****8888',
    wechatCorpId: '',
  });

  const [messageSettings, setMessageSettings] = useState({
    enableCategory: true,
    defaultImportance: 'normal',
    autoReadEnabled: false,
    autoReadDelay: 5,
    markAsReadOnOpen: true,
    showSenderAvatar: true,
    maxDisplayCount: 100,
    groupByType: true,
  });

  const [subscriptionSettings, setSubscriptionSettings] = useState({
    systemAnnouncement: true,
    workflowNotification: true,
    taskReminder: true,
    messageReply: true,
    securityAlert: true,
    weeklyReport: false,
    productUpdate: false,
    marketingMessage: false,
  });

  const [advancedSettings, setAdvancedSettings] = useState({
    retryEnabled: true,
    maxRetryCount: 3,
    retryInterval: 5,
    rateLimitEnabled: true,
    maxPerMinute: 60,
    maxPerHour: 1000,
    webhookEnabled: false,
    webhookUrl: '',
    webhookSecret: '',
  });

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const markUnsaved = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    setConfirmDialogOpen(true);
  }, []);

  const confirmSave = useCallback(async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      addNotification({
        title: '保存成功',
        message: '通知设置已保存',
        type: 'success',
      });
      setHasUnsavedChanges(false);
      setConfirmDialogOpen(false);
    } catch (_err: unknown) {
      const errorMsg = extractErrorMessage(_err, '保存失败');
      addNotification({ title: '失败', message: errorMsg, type: 'error' });
    }
  }, [addNotification]);

  const handleReset = useCallback(() => {
    addNotification({
      title: '已重置',
      message: '当前分组设置已恢复默认值',
      type: 'info',
    });
  }, [addNotification]);

  const renderGeneralSettings = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 1 }}>
          通知开关
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          配置通知总开关和基础行为
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
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                总通知开关
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                关闭后将不再接收任何通知
              </Typography>
            </Box>
            <Switch
              checked={generalSettings.notificationEnabled}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, notificationEnabled: e.target.checked });
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
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                声音提醒
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                收到通知时播放提示音
              </Typography>
            </Box>
            <Switch
              checked={generalSettings.soundEnabled}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, soundEnabled: e.target.checked });
                markUnsaved();
              }}
              disabled={!generalSettings.notificationEnabled}
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
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                震动提醒
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                收到通知时设备震动
              </Typography>
            </Box>
            <Switch
              checked={generalSettings.vibrationEnabled}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, vibrationEnabled: e.target.checked });
                markUnsaved();
              }}
              disabled={!generalSettings.notificationEnabled}
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
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                角标显示
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                在应用图标上显示未读数量
              </Typography>
            </Box>
            <Switch
              checked={generalSettings.badgeEnabled}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, badgeEnabled: e.target.checked });
                markUnsaved();
              }}
              disabled={!generalSettings.notificationEnabled}
            />
          </Box>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
          免打扰时段
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
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                启用免打扰
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                在指定时段内静默通知
              </Typography>
            </Box>
            <Switch
              checked={generalSettings.doNotDisturbEnabled}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, doNotDisturbEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='开始时间'
                type='time'
                value={generalSettings.doNotDisturbStart}
                onChange={(e) => {
                  setGeneralSettings({ ...generalSettings, doNotDisturbStart: e.target.value });
                  markUnsaved();
                }}
                size='small'
                disabled={!generalSettings.doNotDisturbEnabled}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label='结束时间'
                type='time'
                value={generalSettings.doNotDisturbEnd}
                onChange={(e) => {
                  setGeneralSettings({ ...generalSettings, doNotDisturbEnd: e.target.value });
                  markUnsaved();
                }}
                size='small'
                disabled={!generalSettings.doNotDisturbEnabled}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Stack>
      </Box>
    </Stack>
  );

  const renderChannelSettings = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 1 }}>
          通知渠道
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          配置通知发送渠道和相关参数
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: 'primary.light',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MessageSquare size={18} color='#1976d2' />
              </Box>
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  站内信
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  系统内消息通知
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={channelSettings.inAppEnabled}
              onChange={(e) => {
                setChannelSettings({ ...channelSettings, inAppEnabled: e.target.checked });
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: 'success.light',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Mail size={18} color='#2e7d32' />
              </Box>
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  邮件通知
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  通过邮件发送通知
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={channelSettings.emailEnabled}
              onChange={(e) => {
                setChannelSettings({ ...channelSettings, emailEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            label='通知邮箱'
            type='email'
            value={channelSettings.emailAddress}
            onChange={(e) => {
              setChannelSettings({ ...channelSettings, emailAddress: e.target.value });
              markUnsaved();
            }}
            size='small'
            disabled={!channelSettings.emailEnabled}
            placeholder='请输入接收通知的邮箱'
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: 'warning.light',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Smartphone size={18} color='#ed6c02' />
              </Box>
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  短信通知
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  通过短信发送紧急通知
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={channelSettings.smsEnabled}
              onChange={(e) => {
                setChannelSettings({ ...channelSettings, smsEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            label='接收手机号'
            type='tel'
            value={channelSettings.smsPhone}
            onChange={(e) => {
              setChannelSettings({ ...channelSettings, smsPhone: e.target.value });
              markUnsaved();
            }}
            size='small'
            disabled={!channelSettings.smsEnabled}
            placeholder='请输入接收短信的手机号'
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: 'secondary.light',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bell size={18} color='#9c27b0' />
              </Box>
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  推送通知
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  浏览器/APP 推送通知
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={channelSettings.pushEnabled}
              onChange={(e) => {
                setChannelSettings({ ...channelSettings, pushEnabled: e.target.checked });
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: 'info.light',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={18} color='#0288d1' />
              </Box>
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  企业微信
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  通过企业微信发送通知
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={channelSettings.wechatEnabled}
              onChange={(e) => {
                setChannelSettings({ ...channelSettings, wechatEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            label='企业微信 CorpID'
            value={channelSettings.wechatCorpId}
            onChange={(e) => {
              setChannelSettings({ ...channelSettings, wechatCorpId: e.target.value });
              markUnsaved();
            }}
            size='small'
            disabled={!channelSettings.wechatEnabled}
            placeholder='请输入企业微信 CorpID'
          />
        </Stack>
      </Box>
    </Stack>
  );

  const renderMessageSettings = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 1 }}>
          消息分类
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          配置消息展示和分类方式
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
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                启用消息分类
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                按类型分组显示消息
              </Typography>
            </Box>
            <Switch
              checked={messageSettings.enableCategory}
              onChange={(e) => {
                setMessageSettings({ ...messageSettings, enableCategory: e.target.checked });
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
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                按类型分组
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                消息列表按类型分组展示
              </Typography>
            </Box>
            <Switch
              checked={messageSettings.groupByType}
              onChange={(e) => {
                setMessageSettings({ ...messageSettings, groupByType: e.target.checked });
                markUnsaved();
              }}
              disabled={!messageSettings.enableCategory}
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
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                显示发送者头像
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                在消息列表中显示头像
              </Typography>
            </Box>
            <Switch
              checked={messageSettings.showSenderAvatar}
              onChange={(e) => {
                setMessageSettings({ ...messageSettings, showSenderAvatar: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
          重要性等级
        </Typography>
        <FormControl fullWidth size='small'>
          <InputLabel>默认重要性等级</InputLabel>
          <Select
            value={messageSettings.defaultImportance}
            label='默认重要性等级'
            onChange={(e) => {
              setMessageSettings({ ...messageSettings, defaultImportance: e.target.value });
              markUnsaved();
            }}
          >
            <MenuItem value='low'>低</MenuItem>
            <MenuItem value='normal'>普通</MenuItem>
            <MenuItem value='high'>高</MenuItem>
            <MenuItem value='urgent'>紧急</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Divider />

      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
          自动已读
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
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                自动标记已读
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                查看一段时间后自动标记已读
              </Typography>
            </Box>
            <Switch
              checked={messageSettings.autoReadEnabled}
              onChange={(e) => {
                setMessageSettings({ ...messageSettings, autoReadEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label='自动已读延迟（秒）'
            value={messageSettings.autoReadDelay}
            onChange={(e) => {
              setMessageSettings({
                ...messageSettings,
                autoReadDelay: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!messageSettings.autoReadEnabled}
            helperText='消息显示多少秒后自动标记为已读'
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
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                打开即已读
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                打开消息详情时自动标记已读
              </Typography>
            </Box>
            <Switch
              checked={messageSettings.markAsReadOnOpen}
              onChange={(e) => {
                setMessageSettings({ ...messageSettings, markAsReadOnOpen: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label='最大显示数量'
            value={messageSettings.maxDisplayCount}
            onChange={(e) => {
              setMessageSettings({
                ...messageSettings,
                maxDisplayCount: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            helperText='消息列表最多显示的消息数量'
          />
        </Stack>
      </Box>
    </Stack>
  );

  const renderSubscriptionSettings = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 1 }}>
          订阅管理
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          选择您想要接收的通知类型
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AlertCircle size={18} color='#d32f2f' />
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  安全告警
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  账户安全相关的重要通知
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={subscriptionSettings.securityAlert}
              onChange={(e) => {
                setSubscriptionSettings({
                  ...subscriptionSettings,
                  securityAlert: e.target.checked,
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Layers size={18} color='#1976d2' />
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  系统公告
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  系统维护、升级等重要公告
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={subscriptionSettings.systemAnnouncement}
              onChange={(e) => {
                setSubscriptionSettings({
                  ...subscriptionSettings,
                  systemAnnouncement: e.target.checked,
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Clock size={18} color='#9c27b0' />
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  工作流通知
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  审批流程相关的通知
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={subscriptionSettings.workflowNotification}
              onChange={(e) => {
                setSubscriptionSettings({
                  ...subscriptionSettings,
                  workflowNotification: e.target.checked,
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Bell size={18} color='#ed6c02' />
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  任务提醒
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  任务分配、截止提醒等
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={subscriptionSettings.taskReminder}
              onChange={(e) => {
                setSubscriptionSettings({
                  ...subscriptionSettings,
                  taskReminder: e.target.checked,
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <MessageSquare size={18} color='#2e7d32' />
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  消息回复
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  收到新消息回复时通知
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={subscriptionSettings.messageReply}
              onChange={(e) => {
                setSubscriptionSettings({
                  ...subscriptionSettings,
                  messageReply: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
          通知偏好
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
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                周报订阅
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                每周接收工作周报
              </Typography>
            </Box>
            <Switch
              checked={subscriptionSettings.weeklyReport}
              onChange={(e) => {
                setSubscriptionSettings({
                  ...subscriptionSettings,
                  weeklyReport: e.target.checked,
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
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                产品更新
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                新功能上线、版本更新通知
              </Typography>
            </Box>
            <Switch
              checked={subscriptionSettings.productUpdate}
              onChange={(e) => {
                setSubscriptionSettings({
                  ...subscriptionSettings,
                  productUpdate: e.target.checked,
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
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                营销消息
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                活动推广、优惠信息等
              </Typography>
            </Box>
            <Switch
              checked={subscriptionSettings.marketingMessage}
              onChange={(e) => {
                setSubscriptionSettings({
                  ...subscriptionSettings,
                  marketingMessage: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>
    </Stack>
  );

  const renderAdvancedSettings = () => (
    <Stack spacing={3}>
      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 1 }}>
          重试策略
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
          配置通知发送失败后的重试策略
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
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                启用重试
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                发送失败时自动重试
              </Typography>
            </Box>
            <Switch
              checked={advancedSettings.retryEnabled}
              onChange={(e) => {
                setAdvancedSettings({ ...advancedSettings, retryEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label='最大重试次数'
            value={advancedSettings.maxRetryCount}
            onChange={(e) => {
              setAdvancedSettings({
                ...advancedSettings,
                maxRetryCount: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!advancedSettings.retryEnabled}
            helperText='最多重试次数，0 表示不限制'
          />
          <TextField
            fullWidth
            type='number'
            label='重试间隔（分钟）'
            value={advancedSettings.retryInterval}
            onChange={(e) => {
              setAdvancedSettings({
                ...advancedSettings,
                retryInterval: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!advancedSettings.retryEnabled}
            helperText='每次重试之间的间隔时间'
          />
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
          限速配置
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
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                启用限速
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                限制通知发送频率
              </Typography>
            </Box>
            <Switch
              checked={advancedSettings.rateLimitEnabled}
              onChange={(e) => {
                setAdvancedSettings({ ...advancedSettings, rateLimitEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type='number'
                label='每分钟上限'
                value={advancedSettings.maxPerMinute}
                onChange={(e) => {
                  setAdvancedSettings({
                    ...advancedSettings,
                    maxPerMinute: parseInt(e.target.value) || 0,
                  });
                  markUnsaved();
                }}
                size='small'
                disabled={!advancedSettings.rateLimitEnabled}
                helperText='每分钟最多发送条数'
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type='number'
                label='每小时上限'
                value={advancedSettings.maxPerHour}
                onChange={(e) => {
                  setAdvancedSettings({
                    ...advancedSettings,
                    maxPerHour: parseInt(e.target.value) || 0,
                  });
                  markUnsaved();
                }}
                size='small'
                disabled={!advancedSettings.rateLimitEnabled}
                helperText='每小时最多发送条数'
              />
            </Grid>
          </Grid>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography variant='h6' sx={{ fontWeight: 600, mb: 2 }}>
          Webhook 配置
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Webhook size={18} color='#1976d2' />
              <Box>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  启用 Webhook
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  将通知推送到外部系统
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={advancedSettings.webhookEnabled}
              onChange={(e) => {
                setAdvancedSettings({ ...advancedSettings, webhookEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            label='Webhook 地址'
            value={advancedSettings.webhookUrl}
            onChange={(e) => {
              setAdvancedSettings({ ...advancedSettings, webhookUrl: e.target.value });
              markUnsaved();
            }}
            size='small'
            disabled={!advancedSettings.webhookEnabled}
            placeholder='https://example.com/webhook'
          />
          <TextField
            fullWidth
            label='Webhook 密钥'
            type='password'
            value={advancedSettings.webhookSecret}
            onChange={(e) => {
              setAdvancedSettings({ ...advancedSettings, webhookSecret: e.target.value });
              markUnsaved();
            }}
            size='small'
            disabled={!advancedSettings.webhookEnabled}
            placeholder='用于签名验证的密钥'
          />
        </Stack>
      </Box>
    </Stack>
  );

  const renderContent = useMemo(() => {
    switch (activeGroup) {
      case 'general':
        return renderGeneralSettings();
      case 'channel':
        return renderChannelSettings();
      case 'message':
        return renderMessageSettings();
      case 'subscription':
        return renderSubscriptionSettings();
      case 'advanced':
        return renderAdvancedSettings();
      default:
        return renderGeneralSettings();
    }
  }, [
    activeGroup,
    generalSettings,
    channelSettings,
    messageSettings,
    subscriptionSettings,
    advancedSettings,
  ]);

  const currentGroup = SETTING_GROUPS.find((g) => g.id === activeGroup);

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Settings size={20} />,
      }}
      backButton={{
        href: '/notification/dashboard',
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
                      <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                        {group.description}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>

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
                <Button variant='outlined' startIcon={<RotateCcw size={16} />} onClick={handleReset}>
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

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={confirmSave}
        title='保存设置'
        message='确定要保存当前的通知设置吗？'
        confirmLabel='保存'
      />
    </PageContainer>
  );
};

export default NotificationSettingsPage;
