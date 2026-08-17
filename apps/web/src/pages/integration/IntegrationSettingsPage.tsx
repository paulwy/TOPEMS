/**
 * 集成平台设置页面
 *
 * @module pages/integration
 * @path /integration/settings
 */

import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
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
  Alert,
} from '@mui/material';
import i18n from '@/i18n';
import { Save, RefreshCw, Plus, TestTube, Bell, Clock, Key, Globe } from 'lucide-react';

import { PageContainer } from '@/components/common';
import { SettingsPageTemplate, type SettingSection } from '@/components/templates';
import { useNotificationStore } from '@/store';
import { extractErrorMessage } from '@/utils/errors';

import { queryClient, QUERY_KEYS } from '@/lib/reactQuery';
import { useTranslation } from 'react-i18next';
import { integrationApi } from '@/api/integration';

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
    name: i18n.t('integration.integration_settings_page.m1'),
    enabled: true,
    endpoint: 'https://erp.example.com/api/v1',
    authType: 'oauth2',
    retryCount: 3,
    timeout: 30000,
  },
  {
    id: 'config-002',
    name: i18n.t('integration.integration_settings_page.m2'),
    enabled: true,
    endpoint: 'https://crm.example.com/api',
    authType: 'apikey',
    retryCount: 5,
    timeout: 15000,
  },
  {
    id: 'config-003',
    name: i18n.t('integration.integration_settings_page.m3'),
    enabled: false,
    endpoint: 'https://wms.example.com/api',
    authType: 'basic',
    retryCount: 3,
    timeout: 20000,
  },
];

export const IntegrationSettingsPage: React.FC = () => {
  const { data: backendData } = useQuery({
    queryKey: ['integration', 'settings'],
    queryFn: async () => {
      try {
        return await integrationApi.conversionRules.listConversionRules();
      } catch {
        return {};
      }
    },
  });
  const { t } = useTranslation('integration');
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [configs, setConfigs] = useState<IntegrationConfig[]>(MOCK_CONFIGS);
  const [, setTestDialogOpen] = useState(false);
  const [, setSelectedConfig] = useState<IntegrationConfig | null>(null);

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

  const testConnectionMutation = useMutation({
    mutationFn: async (config: IntegrationConfig) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return config;
    },
    onSuccess: (config) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.INTEGRATION.CONNECTORS,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: t('integration.integration_settings_page.k0'),
        message: i18n.t('integration.integration_settings_page.e1', { v1: config.name }),
        type: 'success',
      });
    },
    onError: (_err: unknown) => {
      addNotification({
        title: t('integration.integration_settings_page.k1'),
        message: extractErrorMessage(_err, t('integration.integration_settings_page.k2')),
        type: 'error',
      });
    },
    onSettled: () => {
      setTestDialogOpen(false);
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.INTEGRATION.CONNECTORS,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: t('integration.integration_settings_page.k3'),
        message: t('integration.integration_settings_page.k4'),
        type: 'success',
      });
    },
    onError: (_err: unknown) => {
      addNotification({
        title: t('integration.integration_settings_page.k5'),
        message: extractErrorMessage(_err, t('integration.integration_settings_page.k6')),
        type: 'error',
      });
    },
  });

  const loading = saveSettingsMutation.isPending;

  const handleTestConnection = (config: IntegrationConfig) => {
    setSelectedConfig(config);
    setTestDialogOpen(true);
    testConnectionMutation.mutate(config);
  };

  const handleToggleConfig = (config: IntegrationConfig) => {
    setConfigs((prev) => prev.map((c) => (c.id === config.id ? { ...c, enabled: !c.enabled } : c)));
    addNotification({
      title: t('integration.integration_settings_page.k7'),
      message: i18n.t('integration.integration_settings_page.r1', {
        v1: config.name,
        v2: config.enabled
          ? t('integration.integration_settings_page.k9')
          : t('integration.integration_settings_page.k8'),
      }),
      type: 'success',
    });
  };

  const handleSaveGlobalSettings = () => {
    saveSettingsMutation.mutate();
  };

  const generalSection = {
    title: t('integration.integration_settings_page.k10'),
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
            label={t('integration.integration_settings_page.k11')}
          />
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ ml: 6 }}
          >
            {t('integration.integration_settings_page.e2')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            label={t('integration.integration_settings_page.k12')}
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
              input: {
                endAdornment: (
                  <Typography color='text.secondary'>
                    {t('integration.integration_settings_page.k13')}
                  </Typography>
                ),
              },
            }}
            sx={{ width: 150 }}
          />
          <TextField
            label={t('integration.integration_settings_page.k14')}
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
            label={t('integration.integration_settings_page.k15')}
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
              input: {
                endAdornment: (
                  <Typography color='text.secondary'>
                    {t('integration.integration_settings_page.e3')}
                  </Typography>
                ),
              },
            }}
            sx={{ width: 150 }}
          />
          <TextField
            label={t('integration.integration_settings_page.k16')}
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
              input: {
                endAdornment: (
                  <Typography color='text.secondary'>
                    {t('integration.integration_settings_page.e4')}
                  </Typography>
                ),
              },
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
            label={t('integration.integration_settings_page.k17')}
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
            label={t('integration.integration_settings_page.k18')}
          />
        </Box>

        <Divider />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button
            variant='outlined'
            onClick={() => setGlobalSettings(MOCK_CONFIGS[0] && globalSettings)}
          >
            {t('integration.integration_settings_page.e5')}
          </Button>
          <Button
            variant='contained'
            startIcon={<Save size={16} />}
            onClick={handleSaveGlobalSettings}
            disabled={loading}
          >
            {t('integration.integration_settings_page.e6')}
          </Button>
        </Box>
      </Box>
    ),
  };

  const notificationSection = {
    title: t('integration.integration_settings_page.k19'),
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
            label={t('integration.integration_settings_page.k20')}
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
            label={t('integration.integration_settings_page.k21')}
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
            label={t('integration.integration_settings_page.k22')}
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
            {t('integration.integration_settings_page.e6')}
          </Button>
        </Box>
      </Box>
    ),
  };

  const connectionsSection = {
    title: t('integration.integration_settings_page.k23'),
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
                    label={
                      config.enabled
                        ? t('integration.integration_settings_page.k25')
                        : t('integration.integration_settings_page.k24')
                    }
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
                    {t('integration.integration_settings_page.e8')}
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
                    label={t('integration.integration_settings_page.m4')}
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
                    label={t('integration.integration_settings_page.k26')}
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
                    label={t('integration.integration_settings_page.k27')}
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
                    label={t('integration.integration_settings_page.k28')}
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
              title: t('integration.integration_settings_page.k29'),
              message: t('integration.integration_settings_page.k30'),
              type: 'info',
            })
          }
          sx={{ mt: 1 }}
        >
          {t('integration.integration_settings_page.e9')}
        </Button>
      </Box>
    ),
  };

  return (
    <PageContainer
      title={t('integration.integration_settings_page.k31')}
      subtitle={t('integration.integration_settings_page.k32')}
    >
      <Alert
        severity='info'
        sx={{ mb: 3 }}
      >
        {t('integration.integration_settings_page.e10')}
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
              {t('integration.integration_settings_page.e11')}
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
              {t('integration.integration_settings_page.e12')}
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
              {t('integration.integration_settings_page.e13')}
            </Typography>
          </Box>
          {connectionsSection.children}
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default IntegrationSettingsPage;
