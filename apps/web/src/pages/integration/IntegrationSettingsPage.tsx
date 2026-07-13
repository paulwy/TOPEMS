/**
 * 集成平台设置页面
 *
 * @module pages/integration
 * @path /integration/settings
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  InputAdornment,
  Chip,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Save,
  RefreshCw,
  Plus,
  Trash2,
  TestTube,
  Bell,
  Clock,
  Database,
  Key,
  Globe,
  Lock,
} from 'lucide-react';

import { PageContainer, ConfirmDialog } from '@/components/common';
import { SettingsPageTemplate, type SettingSection } from '@/components/templates';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';

interface IntegrationConfig {
  id: string;
  name: string;
  enabled: boolean;
  endpoint: string;
  authType: 'apikey' | 'oauth2' | 'basic';
  retryCount: number;
  timeout: number;
}

const MOCK_CONFIGS: IntegrationConfig[] = [
  {
    id: 'config-001',
    name: 'ERP系统',
    enabled: true,
    endpoint: 'https://erp.example.com/api/v1',
    authType: 'oauth2',
    retryCount: 3,
    timeout: 30000,
  },
  {
    id: 'config-002',
    name: 'CRM系统',
    enabled: true,
    endpoint: 'https://crm.example.com/api',
    authType: 'apikey',
    retryCount: 5,
    timeout: 15000,
  },
  {
    id: 'config-003',
    name: 'WMS系统',
    enabled: false,
    endpoint: 'https://wms.example.com/api',
    authType: 'basic',
    retryCount: 3,
    timeout: 20000,
  },
];

export const IntegrationSettingsPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [configs, setConfigs] = useState<IntegrationConfig[]>(MOCK_CONFIGS);
  const [loading, setLoading] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<IntegrationConfig | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const [globalSettings, setGlobalSettings] = useState({
    autoSync: true,
    syncInterval: 15,
    maxConcurrentSyncs: 5,
    enableRetry: true,
    defaultTimeout: 30000,
    enableLogging: true,
    logRetentionDays: 30,
    enableNotifications: true,
    notifyOnError: true,
    notifyOnSuccess: false,
  });

  const handleTestConnection = useCallback(
    async (config: IntegrationConfig) => {
      setSelectedConfig(config);
      setTestDialogOpen(true);
      setTestLoading(true);

      try {
        // Simulate test
        await new Promise((resolve) => setTimeout(resolve, 2000));

        addNotification({
          title: '连接测试成功',
          message: `成功连接到「${config.name}」系统`,
          type: 'success',
        });
      } catch (_err: unknown) {
        addNotification({
          title: '连接测试失败',
          message: extractErrorMessage(_err, '无法连接到目标系统'),
          type: 'error',
        });
      } finally {
        setTestLoading(false);
        setTestDialogOpen(false);
      }
    },
    [addNotification]
  );

  const handleToggleConfig = useCallback(
    (config: IntegrationConfig) => {
      setConfigs((prev) =>
        prev.map((c) => (c.id === config.id ? { ...c, enabled: !c.enabled } : c))
      );
      addNotification({
        title: '配置更新',
        message: `「${config.name}」已${config.enabled ? '停用' : '启用'}`,
        type: 'success',
      });
    },
    [addNotification]
  );

  const handleSaveGlobalSettings = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      addNotification({
        title: '保存成功',
        message: '全局设置已保存',
        type: 'success',
      });
    } catch (_err: unknown) {
      addNotification({
        title: '保存失败',
        message: extractErrorMessage(_err, '保存设置失败'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const generalSection = {
    title: '全局同步设置',
    icon: <RefreshCw size={20} />,
    children: (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={globalSettings.autoSync}
                onChange={(e) =>
                  setGlobalSettings((prev) => ({ ...prev, autoSync: e.target.checked }))
                }
              />
            }
            label='启用自动同步'
          />
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ ml: 6 }}
          >
            开启后系统将按设定间隔自动执行数据同步任务
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            label='同步间隔'
            type='number'
            size='small'
            value={globalSettings.syncInterval}
            onChange={(e) =>
              setGlobalSettings((prev) => ({
                ...prev,
                syncInterval: parseInt(e.target.value) || 15,
              }))
            }
            slotProps={{
              input: { endAdornment: <Typography color='text.secondary'>分钟</Typography> },
            }}
            sx={{ width: 150 }}
          />
          <TextField
            label='最大并发数'
            type='number'
            size='small'
            value={globalSettings.maxConcurrentSyncs}
            onChange={(e) =>
              setGlobalSettings((prev) => ({
                ...prev,
                maxConcurrentSyncs: parseInt(e.target.value) || 5,
              }))
            }
            sx={{ width: 150 }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            label='默认超时时间'
            type='number'
            size='small'
            value={globalSettings.defaultTimeout / 1000}
            onChange={(e) =>
              setGlobalSettings((prev) => ({
                ...prev,
                defaultTimeout: (parseInt(e.target.value) || 30) * 1000,
              }))
            }
            slotProps={{
              input: { endAdornment: <Typography color='text.secondary'>秒</Typography> },
            }}
            sx={{ width: 150 }}
          />
          <TextField
            label='日志保留天数'
            type='number'
            size='small'
            value={globalSettings.logRetentionDays}
            onChange={(e) =>
              setGlobalSettings((prev) => ({
                ...prev,
                logRetentionDays: parseInt(e.target.value) || 30,
              }))
            }
            slotProps={{
              input: { endAdornment: <Typography color='text.secondary'>天</Typography> },
            }}
            sx={{ width: 150 }}
          />
        </Box>

        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={globalSettings.enableRetry}
                onChange={(e) =>
                  setGlobalSettings((prev) => ({ ...prev, enableRetry: e.target.checked }))
                }
              />
            }
            label='启用失败重试'
          />
        </Box>

        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={globalSettings.enableLogging}
                onChange={(e) =>
                  setGlobalSettings((prev) => ({ ...prev, enableLogging: e.target.checked }))
                }
              />
            }
            label='启用详细日志'
          />
        </Box>

        <Divider />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button
            variant='outlined'
            onClick={() => setGlobalSettings(MOCK_CONFIGS[0] && globalSettings)}
          >
            重置
          </Button>
          <Button
            variant='contained'
            startIcon={<Save size={16} />}
            onClick={handleSaveGlobalSettings}
            disabled={loading}
          >
            保存设置
          </Button>
        </Box>
      </Box>
    ),
  };

  const notificationSection = {
    title: '通知设置',
    icon: <Bell size={20} />,
    children: (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={globalSettings.enableNotifications}
                onChange={(e) =>
                  setGlobalSettings((prev) => ({
                    ...prev,
                    enableNotifications: e.target.checked,
                  }))
                }
              />
            }
            label='启用同步通知'
          />
        </Box>

        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={globalSettings.notifyOnError}
                onChange={(e) =>
                  setGlobalSettings((prev) => ({ ...prev, notifyOnError: e.target.checked }))
                }
              />
            }
            label='同步失败时通知'
          />
        </Box>

        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={globalSettings.notifyOnSuccess}
                onChange={(e) =>
                  setGlobalSettings((prev) => ({ ...prev, notifyOnSuccess: e.target.checked }))
                }
              />
            }
            label='同步成功时通知'
          />
        </Box>

        <Divider />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant='contained'
            startIcon={<Save size={16} />}
            onClick={handleSaveGlobalSettings}
            disabled={loading}
          >
            保存设置
          </Button>
        </Box>
      </Box>
    ),
  };

  const connectionsSection = {
    title: '系统连接配置',
    icon: <Globe size={20} />,
    children: (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {configs.map((config) => (
          <Card
            key={config.id}
            variant='outlined'
          >
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 500 }}
                  >
                    {config.name}
                  </Typography>
                  <Chip
                    size='small'
                    label={config.enabled ? '启用' : '停用'}
                    color={config.enabled ? 'success' : 'default'}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size='small'
                    variant='outlined'
                    startIcon={<TestTube size={14} />}
                    onClick={() => handleTestConnection(config)}
                  >
                    测试
                  </Button>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.enabled}
                        onChange={() => handleToggleConfig(config)}
                        size='small'
                      />
                    }
                    label=''
                  />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}>
                  <TextField
                    fullWidth
                    size='small'
                    label='API端点'
                    value={config.endpoint}
                    disabled
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Globe size={14} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(50% - 8px)' } }}>
                  <TextField
                    fullWidth
                    size='small'
                    label='认证方式'
                    value={
                      config.authType === 'apikey'
                        ? 'API Key'
                        : config.authType === 'oauth2'
                          ? 'OAuth 2.0'
                          : 'Basic Auth'
                    }
                    disabled
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Key size={14} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: { xs: '50%', md: 'calc(25% - 12px)' } }}>
                  <TextField
                    fullWidth
                    size='small'
                    label='重试次数'
                    value={config.retryCount}
                    disabled
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position='start'>
                            <RefreshCw size={14} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: { xs: '50%', md: 'calc(25% - 12px)' } }}>
                  <TextField
                    fullWidth
                    size='small'
                    label='超时时间'
                    value={`${config.timeout / 1000}s`}
                    disabled
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position='start'>
                            <Clock size={14} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}

        <Button
          variant='outlined'
          startIcon={<Plus size={16} />}
          onClick={() =>
            addNotification({
              title: '添加连接',
              message: '添加新的系统连接配置',
              type: 'info',
            })
          }
          sx={{ mt: 1 }}
        >
          添加连接
        </Button>
      </Box>
    ),
  };

  return (
    <PageContainer
      title='集成设置'
      subtitle='配置集成平台全局设置和系统连接'
    >
      <Alert
        severity='info'
        sx={{ mb: 3 }}
      >
        集成平台负责管理系统间的数据同步和API集成。请确保各子系统连接配置正确，并定期检查同步任务的执行状态。
      </Alert>

      <Card
        variant='outlined'
        sx={{ mb: 3 }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <RefreshCw size={20} />
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              全局同步设置
            </Typography>
          </Box>
          {generalSection.children}
        </CardContent>
      </Card>

      <Card
        variant='outlined'
        sx={{ mb: 3 }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Bell size={20} />
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              通知设置
            </Typography>
          </Box>
          {notificationSection.children}
        </CardContent>
      </Card>

      <Card variant='outlined'>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Globe size={20} />
            <Typography
              variant='subtitle1'
              sx={{ fontWeight: 600 }}
            >
              系统连接配置
            </Typography>
          </Box>
          {connectionsSection.children}
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default IntegrationSettingsPage;
