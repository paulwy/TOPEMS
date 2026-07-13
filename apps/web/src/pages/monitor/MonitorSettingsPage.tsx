/**
 * 监控系统设置页面
 *
 * 功能：
 * 1. 使用 PageContainer + 设置页布局（左侧导航 + 右侧内容）
 * 2. backButton 返回 /monitor/dashboard
 * 3. pageIcon 使用 Settings 图标
 * 4. 左侧设置分组（6个分组）
 * 5. 每个分组有图标和描述
 * 6. 右侧显示当前选中分组的设置内容
 * 7. 每个设置项有保存按钮
 * 8. 使用 useNotificationStore 的 addNotification 通知保存成功
 * 9. 模拟设置数据
 *
 * @module pages/monitor
 * @path /monitor/settings
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import React, { useState, useCallback, useMemo } from 'react';
import {
  Settings,
  AlertTriangle,
  Bell,
  Database,
  Shield,
  Plug,
  Save,
  RotateCcw,
} from 'lucide-react';

import { useNotificationStore } from '@/store';
import { PageContainer } from '@/components/common';
import { MONITOR_PATHS } from '@/modules/monitor/config';
import { ConfirmDialog } from '@topems/shared-components';

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
    description: '监控开关、数据保留时间、采样率',
  },
  {
    id: 'alert',
    label: '告警设置',
    icon: <AlertTriangle size={18} />,
    description: '告警策略、升级机制、静默规则',
  },
  {
    id: 'notification',
    label: '通知设置',
    icon: <Bell size={18} />,
    description: '通知渠道、模板、联系人',
  },
  {
    id: 'datasource',
    label: '数据源',
    icon: <Database size={18} />,
    description: '连接配置',
  },
  {
    id: 'permission',
    label: '权限设置',
    icon: <Shield size={18} />,
    description: '角色权限、访问控制、管理',
  },
  {
    id: 'integration',
    label: '集成设置',
    icon: <Plug size={18} />,
    description: 'Prometheus、Grafana、Webhook',
  },
];

export const MonitorSettingsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [activeGroup, setActiveGroup] = useState('general');

  const [generalSettings, setGeneralSettings] = useState({
    monitoringEnabled: true,
    dataRetentionDays: 30,
    sampleRate: 100,
    autoDiscovery: false,
    heartbeatInterval: 60,
    maxConcurrentChecks: 100,
    enableMetrics: true,
    enableLogs: true,
    enableTraces: false,
  });

  const [alertSettings, setAlertSettings] = useState({
    defaultAlertStrategy: 'threshold',
    enableAutoRecover: true,
    autoRecoverMinutes: 5,
    escalationEnabled: true,
    escalationLevels: 3,
    escalationInterval: 30,
    enableSilenceRules: true,
    maxSilenceDuration: 24,
    enableDeduplication: true,
    dedupWindow: 5,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    wechatEnabled: true,
    phoneEnabled: false,
    criticalNotify: true,
    warningNotify: true,
    infoNotify: false,
    defaultTemplate: 'standard',
    notifyContacts: 'admin,ops',
  });

  const [datasourceSettings, setDatasourceSettings] = useState({
    primaryDatasource: 'prometheus',
    connectionTimeout: 30,
    maxRetries: 3,
    retryInterval: 10,
    enableSsl: true,
    sslVerify: true,
    batchQueryEnabled: true,
    batchSize: 100,
    cacheEnabled: true,
    cacheTTL: 300,
  });

  const [permissionSettings, setPermissionSettings] = useState({
    enableRoleBased: true,
    enableDeptBased: false,
    adminCanManageAll: true,
    allowViewAllDashboards: false,
    allowCreateAlertRules: true,
    allowExportData: true,
    monitorAdminRole: 'monitor_admin',
    viewerRole: 'monitor_viewer',
    editorRole: 'monitor_editor',
  });

  const [integrationSettings, setIntegrationSettings] = useState({
    prometheusEnabled: true,
    prometheusUrl: 'http://localhost:9090',
    grafanaEnabled: true,
    grafanaUrl: 'http://localhost:3000',
    grafanaApiKey: '',
    webhookEnabled: false,
    webhookUrl: '',
    webhookSecret: '',
    enableApiAccess: true,
    apiRateLimit: 1000,
  });

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const markUnsaved = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    setConfirmDialogOpen(true);
  }, []);

  const confirmSave = useCallback(() => {
    addNotification({
      title: '保存成功',
      message: '监控设置已保存',
      type: 'success',
    });
    setHasUnsavedChanges(false);
    setConfirmDialogOpen(false);
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
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 1 }}
        >
          基础配置
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          配置监控系统的基础参数
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                启用监控
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                开启或关闭全局监控
              </Typography>
            </Box>
            <Switch
              checked={generalSettings.monitoringEnabled}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, monitoringEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              type='number'
              label='数据保留时间（天）'
              value={generalSettings.dataRetentionDays}
              onChange={(e) => {
                setGeneralSettings({
                  ...generalSettings,
                  dataRetentionDays: parseInt(e.target.value) || 0,
                });
                markUnsaved();
              }}
              size='small'
              helperText='监控数据保留的天数'
            />
            <TextField
              fullWidth
              type='number'
              label='采样率（%）'
              value={generalSettings.sampleRate}
              onChange={(e) => {
                setGeneralSettings({
                  ...generalSettings,
                  sampleRate: parseInt(e.target.value) || 0,
                });
                markUnsaved();
              }}
              size='small'
              helperText='数据采样百分比，0-100'
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                自动发现
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                自动发现新的监控目标
              </Typography>
            </Box>
            <Switch
              checked={generalSettings.autoDiscovery}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, autoDiscovery: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          检查配置
        </Typography>
        <Stack spacing={2}>
          <TextField
            fullWidth
            type='number'
            label='心跳间隔（秒）'
            value={generalSettings.heartbeatInterval}
            onChange={(e) => {
              setGeneralSettings({
                ...generalSettings,
                heartbeatInterval: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            helperText='监控目标心跳检测间隔'
          />
          <TextField
            fullWidth
            type='number'
            label='最大并发检查数'
            value={generalSettings.maxConcurrentChecks}
            onChange={(e) => {
              setGeneralSettings({
                ...generalSettings,
                maxConcurrentChecks: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            helperText='同时执行的最大检查任务数'
          />
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          可观测性
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                指标监控
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                收集和存储指标数据
              </Typography>
            </Box>
            <Switch
              checked={generalSettings.enableMetrics}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, enableMetrics: e.target.checked });
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                日志监控
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                收集和分析日志数据
              </Typography>
            </Box>
            <Switch
              checked={generalSettings.enableLogs}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, enableLogs: e.target.checked });
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                链路追踪
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                收集和分析分布式链路
              </Typography>
            </Box>
            <Switch
              checked={generalSettings.enableTraces}
              onChange={(e) => {
                setGeneralSettings({ ...generalSettings, enableTraces: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>
    </Stack>
  );

  const renderAlertSettings = () => (
    <Stack spacing={3}>
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 1 }}
        >
          告警策略
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          配置默认告警策略和规则
        </Typography>
        <Stack spacing={2}>
          <FormControl
            fullWidth
            size='small'
          >
            <InputLabel>默认告警策略</InputLabel>
            <Select
              value={alertSettings.defaultAlertStrategy}
              label='默认告警策略'
              onChange={(e) => {
                setAlertSettings({ ...alertSettings, defaultAlertStrategy: e.target.value });
                markUnsaved();
              }}
            >
              <MenuItem value='threshold'>阈值告警</MenuItem>
              <MenuItem value='anomaly'>异常检测</MenuItem>
              <MenuItem value='forecast'>预测告警</MenuItem>
              <MenuItem value='composite'>复合告警</MenuItem>
            </Select>
          </FormControl>
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                自动恢复
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                指标恢复正常后自动解除告警
              </Typography>
            </Box>
            <Switch
              checked={alertSettings.enableAutoRecover}
              onChange={(e) => {
                setAlertSettings({ ...alertSettings, enableAutoRecover: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label='自动恢复等待（分钟）'
            value={alertSettings.autoRecoverMinutes}
            onChange={(e) => {
              setAlertSettings({
                ...alertSettings,
                autoRecoverMinutes: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!alertSettings.enableAutoRecover}
            helperText='指标持续正常多久后自动恢复'
          />
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          升级机制
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
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              启用告警升级
            </Typography>
            <Switch
              checked={alertSettings.escalationEnabled}
              onChange={(e) => {
                setAlertSettings({ ...alertSettings, escalationEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label='最大升级层级'
            value={alertSettings.escalationLevels}
            onChange={(e) => {
              setAlertSettings({
                ...alertSettings,
                escalationLevels: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!alertSettings.escalationEnabled}
          />
          <TextField
            fullWidth
            type='number'
            label='升级间隔（分钟）'
            value={alertSettings.escalationInterval}
            onChange={(e) => {
              setAlertSettings({
                ...alertSettings,
                escalationInterval: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!alertSettings.escalationEnabled}
            helperText='告警未处理多久后升级到下一级'
          />
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          静默规则
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                启用静默规则
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                允许在特定时间段静默告警
              </Typography>
            </Box>
            <Switch
              checked={alertSettings.enableSilenceRules}
              onChange={(e) => {
                setAlertSettings({ ...alertSettings, enableSilenceRules: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label='最大静默时长（小时）'
            value={alertSettings.maxSilenceDuration}
            onChange={(e) => {
              setAlertSettings({
                ...alertSettings,
                maxSilenceDuration: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!alertSettings.enableSilenceRules}
            helperText='单次静默的最大持续时间'
          />
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          去重设置
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                告警去重
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                合并相同告警避免通知轰炸
              </Typography>
            </Box>
            <Switch
              checked={alertSettings.enableDeduplication}
              onChange={(e) => {
                setAlertSettings({ ...alertSettings, enableDeduplication: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label='去重窗口（分钟）'
            value={alertSettings.dedupWindow}
            onChange={(e) => {
              setAlertSettings({
                ...alertSettings,
                dedupWindow: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!alertSettings.enableDeduplication}
            helperText='在此时间窗口内相同告警只通知一次'
          />
        </Stack>
      </Box>
    </Stack>
  );

  const renderNotificationSettings = () => (
    <Stack spacing={3}>
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 1 }}
        >
          通知渠道
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          配置告警通知的发送渠道
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                邮件通知
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                通过邮件发送告警通知
              </Typography>
            </Box>
            <Switch
              checked={notificationSettings.emailEnabled}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  emailEnabled: e.target.checked,
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                短信通知
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                通过短信发送紧急告警
              </Typography>
            </Box>
            <Switch
              checked={notificationSettings.smsEnabled}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  smsEnabled: e.target.checked,
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                站内推送
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                在系统内推送实时告警
              </Typography>
            </Box>
            <Switch
              checked={notificationSettings.pushEnabled}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  pushEnabled: e.target.checked,
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                企业微信
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                通过企业微信发送告警
              </Typography>
            </Box>
            <Switch
              checked={notificationSettings.wechatEnabled}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  wechatEnabled: e.target.checked,
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                电话通知
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                通过电话语音发送严重告警
              </Typography>
            </Box>
            <Switch
              checked={notificationSettings.phoneEnabled}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  phoneEnabled: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          告警级别
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
            <Typography variant='body2'>严重告警通知</Typography>
            <Switch
              checked={notificationSettings.criticalNotify}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  criticalNotify: e.target.checked,
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
            <Typography variant='body2'>警告通知</Typography>
            <Switch
              checked={notificationSettings.warningNotify}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  warningNotify: e.target.checked,
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
            <Typography variant='body2'>信息通知</Typography>
            <Switch
              checked={notificationSettings.infoNotify}
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  infoNotify: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          通知配置
        </Typography>
        <Stack spacing={2}>
          <FormControl
            fullWidth
            size='small'
          >
            <InputLabel>默认通知模板</InputLabel>
            <Select
              value={notificationSettings.defaultTemplate}
              label='默认通知模板'
              onChange={(e) => {
                setNotificationSettings({
                  ...notificationSettings,
                  defaultTemplate: e.target.value,
                });
                markUnsaved();
              }}
            >
              <MenuItem value='standard'>标准模板</MenuItem>
              <MenuItem value='concise'>简洁模板</MenuItem>
              <MenuItem value='detailed'>详细模板</MenuItem>
              <MenuItem value='custom'>自定义模板</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label='默认通知联系人'
            value={notificationSettings.notifyContacts}
            onChange={(e) => {
              setNotificationSettings({
                ...notificationSettings,
                notifyContacts: e.target.value,
              });
              markUnsaved();
            }}
            size='small'
            helperText='多个联系人用逗号分隔'
          />
        </Stack>
      </Box>
    </Stack>
  );

  const renderDatasourceSettings = () => (
    <Stack spacing={3}>
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 1 }}
        >
          数据源配置
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          配置监控数据源连接
        </Typography>
        <Stack spacing={2}>
          <FormControl
            fullWidth
            size='small'
          >
            <InputLabel>主数据源类型</InputLabel>
            <Select
              value={datasourceSettings.primaryDatasource}
              label='主数据源类型'
              onChange={(e) => {
                setDatasourceSettings({ ...datasourceSettings, primaryDatasource: e.target.value });
                markUnsaved();
              }}
            >
              <MenuItem value='prometheus'>Prometheus</MenuItem>
              <MenuItem value='influxdb'>InfluxDB</MenuItem>
              <MenuItem value='elasticsearch'>Elasticsearch</MenuItem>
              <MenuItem value='mysql'>MySQL</MenuItem>
              <MenuItem value='postgresql'>PostgreSQL</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              type='number'
              label='连接超时（秒）'
              value={datasourceSettings.connectionTimeout}
              onChange={(e) => {
                setDatasourceSettings({
                  ...datasourceSettings,
                  connectionTimeout: parseInt(e.target.value) || 0,
                });
                markUnsaved();
              }}
              size='small'
            />
            <TextField
              fullWidth
              type='number'
              label='最大重试次数'
              value={datasourceSettings.maxRetries}
              onChange={(e) => {
                setDatasourceSettings({
                  ...datasourceSettings,
                  maxRetries: parseInt(e.target.value) || 0,
                });
                markUnsaved();
              }}
              size='small'
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label='重试间隔（秒）'
            value={datasourceSettings.retryInterval}
            onChange={(e) => {
              setDatasourceSettings({
                ...datasourceSettings,
                retryInterval: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
          />
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          SSL 配置
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                启用 SSL
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                使用 SSL/TLS 加密连接
              </Typography>
            </Box>
            <Switch
              checked={datasourceSettings.enableSsl}
              onChange={(e) => {
                setDatasourceSettings({ ...datasourceSettings, enableSsl: e.target.checked });
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                SSL 证书验证
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                验证服务端 SSL 证书
              </Typography>
            </Box>
            <Switch
              checked={datasourceSettings.sslVerify}
              onChange={(e) => {
                setDatasourceSettings({ ...datasourceSettings, sslVerify: e.target.checked });
                markUnsaved();
              }}
              disabled={!datasourceSettings.enableSsl}
            />
          </Box>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          查询优化
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                批量查询
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                合并多个查询减少请求次数
              </Typography>
            </Box>
            <Switch
              checked={datasourceSettings.batchQueryEnabled}
              onChange={(e) => {
                setDatasourceSettings({
                  ...datasourceSettings,
                  batchQueryEnabled: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label='批量大小'
            value={datasourceSettings.batchSize}
            onChange={(e) => {
              setDatasourceSettings({
                ...datasourceSettings,
                batchSize: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!datasourceSettings.batchQueryEnabled}
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                查询缓存
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                缓存查询结果提升性能
              </Typography>
            </Box>
            <Switch
              checked={datasourceSettings.cacheEnabled}
              onChange={(e) => {
                setDatasourceSettings({ ...datasourceSettings, cacheEnabled: e.target.checked });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label='缓存过期时间（秒）'
            value={datasourceSettings.cacheTTL}
            onChange={(e) => {
              setDatasourceSettings({
                ...datasourceSettings,
                cacheTTL: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!datasourceSettings.cacheEnabled}
          />
        </Stack>
      </Box>
    </Stack>
  );

  const renderPermissionSettings = () => (
    <Stack spacing={3}>
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 1 }}
        >
          权限控制
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          配置监控系统权限控制方式
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                基于角色的权限
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                使用系统角色控制监控访问
              </Typography>
            </Box>
            <Switch
              checked={permissionSettings.enableRoleBased}
              onChange={(e) => {
                setPermissionSettings({
                  ...permissionSettings,
                  enableRoleBased: e.target.checked,
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                基于部门的权限
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                使用组织架构控制监控访问
              </Typography>
            </Box>
            <Switch
              checked={permissionSettings.enableDeptBased}
              onChange={(e) => {
                setPermissionSettings({
                  ...permissionSettings,
                  enableDeptBased: e.target.checked,
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                管理员管理全部
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                管理员可管理所有监控配置
              </Typography>
            </Box>
            <Switch
              checked={permissionSettings.adminCanManageAll}
              onChange={(e) => {
                setPermissionSettings({
                  ...permissionSettings,
                  adminCanManageAll: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          访问控制
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                查看所有仪表盘
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                用户可查看所有监控仪表盘
              </Typography>
            </Box>
            <Switch
              checked={permissionSettings.allowViewAllDashboards}
              onChange={(e) => {
                setPermissionSettings({
                  ...permissionSettings,
                  allowViewAllDashboards: e.target.checked,
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                创建告警规则
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                允许用户创建自定义告警规则
              </Typography>
            </Box>
            <Switch
              checked={permissionSettings.allowCreateAlertRules}
              onChange={(e) => {
                setPermissionSettings({
                  ...permissionSettings,
                  allowCreateAlertRules: e.target.checked,
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                导出数据
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                允许导出监控数据
              </Typography>
            </Box>
            <Switch
              checked={permissionSettings.allowExportData}
              onChange={(e) => {
                setPermissionSettings({
                  ...permissionSettings,
                  allowExportData: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          角色配置
        </Typography>
        <Stack spacing={2}>
          <TextField
            fullWidth
            label='监控管理员角色'
            value={permissionSettings.monitorAdminRole}
            onChange={(e) => {
              setPermissionSettings({
                ...permissionSettings,
                monitorAdminRole: e.target.value,
              });
              markUnsaved();
            }}
            size='small'
            helperText='拥有此角色的用户为监控系统管理员'
          />
          <TextField
            fullWidth
            label='监控编辑者角色'
            value={permissionSettings.editorRole}
            onChange={(e) => {
              setPermissionSettings({
                ...permissionSettings,
                editorRole: e.target.value,
              });
              markUnsaved();
            }}
            size='small'
            helperText='可编辑监控配置但不可管理权限'
          />
          <TextField
            fullWidth
            label='监控查看者角色'
            value={permissionSettings.viewerRole}
            onChange={(e) => {
              setPermissionSettings({
                ...permissionSettings,
                viewerRole: e.target.value,
              });
              markUnsaved();
            }}
            size='small'
            helperText='仅可查看监控数据'
          />
        </Stack>
      </Box>
    </Stack>
  );

  const renderIntegrationSettings = () => (
    <Stack spacing={3}>
      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 1 }}
        >
          Prometheus
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 3 }}
        >
          配置 Prometheus 集成
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                启用 Prometheus
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                集成 Prometheus 监控系统
              </Typography>
            </Box>
            <Switch
              checked={integrationSettings.prometheusEnabled}
              onChange={(e) => {
                setIntegrationSettings({
                  ...integrationSettings,
                  prometheusEnabled: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            label='Prometheus 地址'
            value={integrationSettings.prometheusUrl}
            onChange={(e) => {
              setIntegrationSettings({
                ...integrationSettings,
                prometheusUrl: e.target.value,
              });
              markUnsaved();
            }}
            size='small'
            placeholder='http://localhost:9090'
            disabled={!integrationSettings.prometheusEnabled}
          />
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          Grafana
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                启用 Grafana
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                集成 Grafana 可视化面板
              </Typography>
            </Box>
            <Switch
              checked={integrationSettings.grafanaEnabled}
              onChange={(e) => {
                setIntegrationSettings({
                  ...integrationSettings,
                  grafanaEnabled: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            label='Grafana 地址'
            value={integrationSettings.grafanaUrl}
            onChange={(e) => {
              setIntegrationSettings({
                ...integrationSettings,
                grafanaUrl: e.target.value,
              });
              markUnsaved();
            }}
            size='small'
            placeholder='http://localhost:3000'
            disabled={!integrationSettings.grafanaEnabled}
          />
          <TextField
            fullWidth
            label='Grafana API Key'
            value={integrationSettings.grafanaApiKey}
            onChange={(e) => {
              setIntegrationSettings({
                ...integrationSettings,
                grafanaApiKey: e.target.value,
              });
              markUnsaved();
            }}
            size='small'
            type='password'
            placeholder='用于访问 Grafana API'
            disabled={!integrationSettings.grafanaEnabled}
          />
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          Webhook
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                启用 Webhook
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                通过 Webhook 推送告警事件
              </Typography>
            </Box>
            <Switch
              checked={integrationSettings.webhookEnabled}
              onChange={(e) => {
                setIntegrationSettings({
                  ...integrationSettings,
                  webhookEnabled: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            label='Webhook 地址'
            value={integrationSettings.webhookUrl}
            onChange={(e) => {
              setIntegrationSettings({
                ...integrationSettings,
                webhookUrl: e.target.value,
              });
              markUnsaved();
            }}
            size='small'
            placeholder='https://example.com/webhook'
            disabled={!integrationSettings.webhookEnabled}
          />
          <TextField
            fullWidth
            label='Webhook 密钥'
            value={integrationSettings.webhookSecret}
            onChange={(e) => {
              setIntegrationSettings({
                ...integrationSettings,
                webhookSecret: e.target.value,
              });
              markUnsaved();
            }}
            size='small'
            type='password'
            placeholder='用于签名验证的密钥'
            disabled={!integrationSettings.webhookEnabled}
          />
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          API 访问
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
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                启用 API 访问
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                允许通过 API 操作监控
              </Typography>
            </Box>
            <Switch
              checked={integrationSettings.enableApiAccess}
              onChange={(e) => {
                setIntegrationSettings({
                  ...integrationSettings,
                  enableApiAccess: e.target.checked,
                });
                markUnsaved();
              }}
            />
          </Box>
          <TextField
            fullWidth
            type='number'
            label='API 调用频率限制（次/分钟）'
            value={integrationSettings.apiRateLimit}
            onChange={(e) => {
              setIntegrationSettings({
                ...integrationSettings,
                apiRateLimit: parseInt(e.target.value) || 0,
              });
              markUnsaved();
            }}
            size='small'
            disabled={!integrationSettings.enableApiAccess}
            helperText='0 表示不限制'
          />
        </Stack>
      </Box>
    </Stack>
  );

  const renderContent = useMemo(() => {
    switch (activeGroup) {
      case 'general':
        return renderGeneralSettings();
      case 'alert':
        return renderAlertSettings();
      case 'notification':
        return renderNotificationSettings();
      case 'datasource':
        return renderDatasourceSettings();
      case 'permission':
        return renderPermissionSettings();
      case 'integration':
        return renderIntegrationSettings();
      default:
        return renderGeneralSettings();
    }
  }, [
    activeGroup,
    generalSettings,
    alertSettings,
    notificationSettings,
    datasourceSettings,
    permissionSettings,
    integrationSettings,
  ]);

  const currentGroup = SETTING_GROUPS.find((g) => g.id === activeGroup);

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Settings size={20} />,
        backButton: {
          href: MONITOR_PATHS.dashboard,
        },
      }}
    >
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
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
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ display: 'block' }}
                      >
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
              <Typography
                variant='h5'
                sx={{ fontWeight: 600, mb: 0.5 }}
              >
                {currentGroup?.label}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
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
                <Typography
                  variant='body2'
                  color='warning.main'
                >
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

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={confirmSave}
        title='保存设置'
        message='确定要保存当前的监控设置吗？'
      />
    </PageContainer>
  );
};

export default MonitorSettingsPage;
