import React, { useState, useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Package,
  Play,
  Square,
  Trash2,
  Store,
  Search,
  Download,
  GitBranch,
  Calendar,
  Shield,
  CheckCircle,
} from 'lucide-react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';
import { useNotificationStore } from '@/store';
import { type Plugin, fetchAllPluginInfo, PLUGIN_REGISTRY } from '@/api/plugin';
import { usePluginStore } from '@/store/pluginStore';
import { extractErrorMessage } from '@/utils/errors';
import { pluginSchema } from '@/schemas/admin';

interface MarketplacePlugin {
  code: string;
  name: string;
  version: string;
  latest_version: string;
  description: string;
  author: string;
  published_at: string;
  downloads: number;
  category: string;
  plugin_type: string;
  permissions: Array<{ code: string; name: string }>;
}

const PLUGIN_DISPLAY_NAMES: Record<string, string> = {
  workflow: i18n.t('pages.plugin_management_page.k0'),
  erp: i18n.t('pages.plugin_management_page.k1'),
  hrm: i18n.t('pages.plugin_management_page.k2'),
  crm: i18n.t('pages.plugin_management_page.k3'),
  mes: i18n.t('pages.plugin_management_page.k4'),
  qa: i18n.t('pages.plugin_management_page.k5'),
  scm: i18n.t('pages.plugin_management_page.k6'),
  wms: i18n.t('pages.plugin_management_page.k7'),
  bi: i18n.t('pages.plugin_management_page.k8'),
  pm: i18n.t('pages.plugin_management_page.k9'),
  ai: i18n.t('pages.plugin_management_page.ai_0'),
  gis: i18n.t('pages.plugin_management_page.k10'),
  mobile: i18n.t('pages.plugin_management_page.k11'),
  rs: i18n.t('pages.plugin_management_page.k12'),
  srm: i18n.t('pages.plugin_management_page.k13'),
  monitor: i18n.t('pages.plugin_management_page.k14'),
  portal: i18n.t('pages.plugin_management_page.k15'),
  integration: i18n.t('pages.plugin_management_page.k16'),
};

const PLUGIN_CATEGORIES: Record<string, string> = {
  workflow: 'System',
  erp: 'Business',
  hrm: 'Business',
  crm: 'Business',
  mes: 'Manufacturing',
  qa: 'Quality',
  scm: 'Supply Chain',
  wms: 'Warehouse',
  bi: 'Analytics',
  pm: 'Project',
  ai: 'AI',
  gis: 'IoT',
  mobile: 'System',
  rs: 'R&D',
  srm: 'Business',
  monitor: 'System',
  portal: 'System',
  integration: 'System',
};

type UninstallTier = 'disable' | 'uninstall' | 'delete';

const PluginManagementPage: React.FC = () => {
  const {
    installedPlugins,
    fetchInstalledPlugins,
    fetchHealthStatus,
    enablePlugin,
    disablePlugin,
    uninstallPlugin,
    installPlugin,
    upgradePlugin,
  } = usePluginStore();

  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [marketplaceTab, setMarketplaceTab] = useState(0);
  const [marketplaceSearch, setMarketplaceSearch] = useState('');
  const [installingPlugin, setInstallingPlugin] = useState<MarketplacePlugin | null>(null);
  const [installStep, setInstallStep] = useState(0);
  const [installLoading, setInstallLoading] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);

  const [uninstallTarget, setUninstallTarget] = useState<{
    code: string;
    tier: UninstallTier;
  } | null>(null);

  const loadPlugins = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.SYSTEM.PLUGINS,
      exact: false,
      refetchType: 'active',
    });
  }, [queryClient]);

  const apiAdapter: CrudApiAdapter = useMemo(
    () => ({
      list: async (params) => {
        await Promise.all([fetchInstalledPlugins(), fetchHealthStatus()]);
        const pluginInfoList = await fetchAllPluginInfo();

        const search = (params?.search as string) || '';
        const typeFilter = (params?.plugin_type as string) || 'all';

        const runtimePlugins: Plugin[] = pluginInfoList.map((info, index) => ({
          id: String(index + 1),
          code: info.code,
          name: PLUGIN_DISPLAY_NAMES[info.code] || info.name,
          description: info.description,
          version: info.version,
          plugin_type: info.plugin_type,
          is_published: true,
          category: info.category,
          runtime_status: 'running',
          runtime_url: PLUGIN_REGISTRY[info.code]?.url || '',
          base_path: `/api/${info.code}`,
        }));

        const filtered = runtimePlugins.filter((plugin) => {
          const matchesSearch =
            !search ||
            (plugin.name && plugin.name.toLowerCase().includes(search.toLowerCase())) ||
            (plugin.code && plugin.code.toLowerCase().includes(search.toLowerCase())) ||
            (plugin.description && plugin.description.toLowerCase().includes(search.toLowerCase()));
          const matchesType = typeFilter === 'all' || plugin.plugin_type === typeFilter;
          return matchesSearch && matchesType;
        });

        return { data: filtered as unknown as Record<string, unknown>[], total: filtered.length };
      },
      create: async () => {
        throw new Error(i18n.t('pages.plugin_management_page.k17'));
      },
      update: async () => {
        throw new Error(i18n.t('pages.plugin_management_page.k18'));
      },
      delete: async () => {
        throw new Error(i18n.t('pages.plugin_management_page.k19'));
      },
    }),
    [fetchInstalledPlugins, fetchHealthStatus]
  );

  const enableMutation = useMutation({
    mutationFn: async (pluginCode: string) => {
      const success = await enablePlugin(pluginCode);
      if (!success) throw new Error(i18n.t('pages.plugin_management_page.k20'));
      return pluginCode;
    },
    onSuccess: (pluginCode) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ADMIN.SETTINGS,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('pages.plugin_management_page.k21'),
        message: `${pluginCode} ${i18n.t('pages.plugin_management_page.k1')}`,
        type: 'success',
      });
      loadPlugins();
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('pages.plugin_management_page.k22'),
        message: (err as Error).message || i18n.t('pages.plugin_management_page.k23'),
        type: 'error',
      });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (pluginCode: string) => {
      const success = await disablePlugin(pluginCode);
      if (!success) throw new Error(i18n.t('pages.plugin_management_page.k24'));
      return pluginCode;
    },
    onSuccess: (pluginCode) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ADMIN.SETTINGS,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('pages.plugin_management_page.k25'),
        message: `${pluginCode} ${i18n.t('pages.plugin_management_page.k2')}`,
        type: 'success',
      });
      loadPlugins();
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('pages.plugin_management_page.k26'),
        message: (err as Error).message || i18n.t('pages.plugin_management_page.k27'),
        type: 'error',
      });
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: async (pluginCode: string) => {
      const success = await upgradePlugin(pluginCode);
      if (!success) throw new Error(i18n.t('pages.plugin_management_page.k28'));
      return pluginCode;
    },
    onSuccess: (pluginCode) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ADMIN.SETTINGS,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('pages.plugin_management_page.k29'),
        message: `${pluginCode} ${i18n.t('pages.plugin_management_page.k3')}`,
        type: 'success',
      });
      loadPlugins();
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('pages.plugin_management_page.k30'),
        message: (err as Error).message || i18n.t('pages.plugin_management_page.k31'),
        type: 'error',
      });
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: async ({ pluginCode, tier }: { pluginCode: string; tier: UninstallTier }) => {
      const success = await uninstallPlugin(pluginCode, tier);
      if (!success) throw new Error(i18n.t('pages.plugin_management_page.k32'));
      return { pluginCode, tier };
    },
    onSuccess: ({ pluginCode, tier }) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ADMIN.SETTINGS,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        title: i18n.t('pages.plugin_management_page.k33'),
        message:
          tier === 'delete'
            ? `${pluginCode} ${i18n.t('pages.plugin_management_page.k4')}`
            : tier === 'disable'
              ? `${pluginCode} ${i18n.t('pages.plugin_management_page.k5')}`
              : `${pluginCode} ${i18n.t('pages.plugin_management_page.k6')}`,
        type: 'success',
      });
      loadPlugins();
    },
    onError: (err: unknown) => {
      addNotification({
        title: i18n.t('pages.plugin_management_page.k34'),
        message: (err as Error).message || i18n.t('pages.plugin_management_page.k35'),
        type: 'error',
      });
    },
    onSettled: () => {
      setUninstallTarget(null);
    },
  });

  const installMutation = useMutation({
    mutationFn: async (pluginCode: string) => {
      const success = await installPlugin(pluginCode);
      if (!success) throw new Error(i18n.t('pages.plugin_management_page.k36'));
      return pluginCode;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ADMIN.SETTINGS,
        exact: false,
        refetchType: 'active',
      });
    },
  });

  const allMarketplacePlugins: MarketplacePlugin[] = useMemo(
    () =>
      Object.entries(PLUGIN_REGISTRY).map(([code, config]) => ({
        code,
        name: PLUGIN_DISPLAY_NAMES[code] || code.toUpperCase(),
        version: '1.0.0',
        latest_version: '1.0.0',
        description: `${PLUGIN_DISPLAY_NAMES[code] || code} ${i18n.t('pages.plugin_management_page.k7')} ${config.port}`,
        author: 'TOPEMS',
        published_at: '2024-01-01',
        downloads: 0,
        category: PLUGIN_CATEGORIES[code] || 'Business',
        plugin_type: code === 'workflow' ? 'core' : 'business',
        permissions: [],
      })),
    []
  );

  const filteredMarketplace = useMemo(
    () =>
      allMarketplacePlugins.filter((plugin) => {
        const searchLower = marketplaceSearch.toLowerCase();
        return (
          plugin.name.toLowerCase().includes(searchLower) ||
          plugin.code.toLowerCase().includes(searchLower) ||
          plugin.description.toLowerCase().includes(searchLower)
        );
      }),
    [allMarketplacePlugins, marketplaceSearch]
  );

  const installedCodes = useMemo(
    () => [
      ...(queryClient.getQueryData<Plugin[]>(QUERY_KEYS.SYSTEM.PLUGINS) || []).map((p) => p.code),
      ...installedPlugins.map((p) => p.plugin_id),
    ],
    [queryClient, installedPlugins]
  );

  const handleOpenMarketplace = useCallback(() => {
    setMarketplaceOpen(true);
    setMarketplaceTab(0);
    setMarketplaceSearch('');
  }, []);

  const handleCloseMarketplace = useCallback(() => {
    setMarketplaceOpen(false);
    setInstallingPlugin(null);
    setInstallStep(0);
    setInstallError(null);
  }, []);

  const handleInstallPlugin = useCallback((plugin: MarketplacePlugin) => {
    setInstallingPlugin(plugin);
    setInstallStep(0);
    setInstallError(null);
  }, []);

  const handleInstallNext = useCallback(async () => {
    if (installStep === 0) {
      setInstallStep(1);
    } else if (installStep === 1) {
      setInstallLoading(true);
      setInstallError(null);
      try {
        await installMutation.mutateAsync(installingPlugin!.code);
        setInstallStep(2);
        loadPlugins();
      } catch (err: unknown) {
        setInstallError(extractErrorMessage(err, i18n.t('pages.plugin_management_page.k37')));
      } finally {
        setInstallLoading(false);
      }
    } else if (installStep === 2) {
      handleCloseMarketplace();
    }
  }, [installStep, installMutation, installingPlugin, loadPlugins, handleCloseMarketplace]);

  const handleInstallBack = useCallback(() => {
    if (installStep > 0) {
      setInstallStep(installStep - 1);
    }
  }, [installStep]);

  const getUninstallMessage = (pluginCode: string, tier: UninstallTier) => {
    switch (tier) {
      case 'disable':
        return `${i18n.t('pages.plugin_management_page.k8')}${pluginCode}${i18n.t('pages.plugin_management_page.k9')}`;
      case 'uninstall':
        return `${i18n.t('pages.plugin_management_page.k10')}${pluginCode}${i18n.t('pages.plugin_management_page.k11')}`;
      case 'delete':
        return `${i18n.t('pages.plugin_management_page.k12')}${pluginCode}${i18n.t('pages.plugin_management_page.k13')}`;
      default:
        return `${i18n.t('pages.plugin_management_page.k14')}${pluginCode}${i18n.t('pages.plugin_management_page.k15')}`;
    }
  };

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        label: i18n.t('pages.plugin_management_page.k38'),
        icon: <Play size={16} />,
        onClick: (row) => enableMutation.mutate(String(row.code)),
        color: 'success',
        show: (row) => row.runtime_status !== 'running',
      },
      {
        label: i18n.t('pages.plugin_management_page.k39'),
        icon: <Square size={16} />,
        onClick: (row) => disableMutation.mutate(String(row.code)),
        color: 'warning',
        show: (row) => row.runtime_status === 'running',
      },
      {
        label: i18n.t('pages.plugin_management_page.k40'),
        icon: <Download size={16} />,
        onClick: (row) => upgradeMutation.mutate(String(row.code)),
        color: 'primary',
        show: (row) => {
          const marketplacePlugin = allMarketplacePlugins.find((p) => p.code === row.code);
          const currentVersion = String(row.version || '');
          return !!marketplacePlugin && marketplacePlugin.latest_version !== currentVersion;
        },
      },
      {
        label: i18n.t('pages.plugin_management_page.k41'),
        icon: <Trash2 size={16} />,
        onClick: (row) => setUninstallTarget({ code: String(row.code), tier: 'uninstall' }),
        color: 'error',
        divider: true,
      },
    ],
    [enableMutation, disableMutation, upgradeMutation, allMarketplacePlugins]
  );

  const headerContent = useCallback(
    () => (
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant='outlined'
          startIcon={<Store size={16} />}
          onClick={handleOpenMarketplace}
        >
          {i18n.t('pages.plugin_management_page.k16')}
        </Button>
      </Box>
    ),
    [handleOpenMarketplace]
  );

  return (
    <>
      <CrudPage
        schema={pluginSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        headerContent={headerContent}
        breadcrumbs={[
          { label: i18n.t('pages.plugin_management_page.k42'), href: '/dashboard' },
          { label: i18n.t('pages.plugin_management_page.k43') },
          { label: i18n.t('pages.plugin_management_page.k44') },
        ]}
      />

      {/* 卸载确认对话框（支持禁用/卸载/彻底删除三档） */}
      <Dialog
        open={!!uninstallTarget}
        onClose={() => setUninstallTarget(null)}
      >
        <DialogTitle>
          {uninstallTarget?.tier === 'delete'
            ? i18n.t('pages.plugin_management_page.k46')
            : i18n.t('pages.plugin_management_page.k45')}
        </DialogTitle>
        <DialogContent>
          {uninstallTarget && (
            <>
              <Typography sx={{ mb: 3 }}>
                {getUninstallMessage(uninstallTarget.code, uninstallTarget.tier)}
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500, mb: 1 }}
                >
                  {i18n.t('pages.plugin_management_page.k17')}
                </Typography>
                <Stack
                  direction='row'
                  spacing={2}
                >
                  <Button
                    variant={uninstallTarget.tier === 'disable' ? 'contained' : 'outlined'}
                    size='small'
                    onClick={() =>
                      setUninstallTarget((prev) => (prev ? { ...prev, tier: 'disable' } : null))
                    }
                  >
                    {i18n.t('pages.plugin_management_page.k18')}
                  </Button>
                  <Button
                    variant={uninstallTarget.tier === 'uninstall' ? 'contained' : 'outlined'}
                    size='small'
                    onClick={() =>
                      setUninstallTarget((prev) => (prev ? { ...prev, tier: 'uninstall' } : null))
                    }
                  >
                    {i18n.t('pages.plugin_management_page.k19')}
                  </Button>
                  <Button
                    variant={uninstallTarget.tier === 'delete' ? 'contained' : 'outlined'}
                    size='small'
                    color='error'
                    onClick={() =>
                      setUninstallTarget((prev) => (prev ? { ...prev, tier: 'delete' } : null))
                    }
                  >
                    {i18n.t('pages.plugin_management_page.k20')}
                  </Button>
                </Stack>
              </Box>
              <Typography
                variant='caption'
                color='textSecondary'
              >
                {uninstallTarget.tier === 'disable' && i18n.t('pages.plugin_management_page.k47')}
                {uninstallTarget.tier === 'uninstall' &&
                  i18n.t('pages.plugin_management_page.90_48')}
                {uninstallTarget.tier === 'delete' && i18n.t('pages.plugin_management_page.k49')}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUninstallTarget(null)}>
            {i18n.t('pages.plugin_management_page.k50')}
          </Button>
          <Button
            onClick={() => {
              if (uninstallTarget) {
                uninstallMutation.mutate({
                  pluginCode: uninstallTarget.code,
                  tier: uninstallTarget.tier,
                });
              }
            }}
            variant='contained'
            color={uninstallTarget?.tier === 'delete' ? 'error' : 'primary'}
            disabled={uninstallMutation.isPending}
          >
            {uninstallMutation.isPending
              ? i18n.t('pages.plugin_management_page.k21')
              : uninstallTarget?.tier === 'delete'
                ? i18n.t('pages.plugin_management_page.k51')
                : i18n.t('pages.plugin_management_page.k52')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 插件市场对话框 */}
      <Dialog
        open={marketplaceOpen}
        onClose={handleCloseMarketplace}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Store size={24} />
            {i18n.t('pages.plugin_management_page.k22')}
          </Box>
        </DialogTitle>
        <DialogContent>
          {installingPlugin ? (
            <Box>
              <Stepper
                activeStep={installStep}
                sx={{ mb: 3 }}
              >
                <Step>
                  <StepLabel>{i18n.t('pages.plugin_management_page.k53')}</StepLabel>
                </Step>
                <Step>
                  <StepLabel>{i18n.t('pages.plugin_management_page.k54')}</StepLabel>
                </Step>
                <Step>
                  <StepLabel>{i18n.t('pages.plugin_management_page.k55')}</StepLabel>
                </Step>
              </Stepper>

              {installStep === 0 && (
                <Box>
                  <Typography
                    variant='h6'
                    gutterBottom
                  >
                    {i18n.t('pages.plugin_management_page.k23')}
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ mb: 2 }}
                  >
                    {i18n.t('pages.plugin_management_page.k24')}
                  </Typography>
                  <Box sx={{ p: 2, mb: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography
                      variant='subtitle1'
                      sx={{ fontWeight: 600 }}
                    >
                      {installingPlugin.name}
                    </Typography>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {installingPlugin.description}
                    </Typography>
                    <Stack
                      direction='row'
                      spacing={2}
                      sx={{ mt: 2 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <GitBranch size={14} />
                        <Typography variant='caption'>
                          [i18n.t('pages.plugin_management_page.k25')]:{' '}
                          {installingPlugin.latest_version}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Download size={14} />
                        <Typography variant='caption'>
                          [i18n.t('pages.plugin_management_page.k26')]: {installingPlugin.downloads}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 2 }}
                  >
                    {i18n.t('pages.plugin_management_page.k27')}
                  </Typography>
                  <List dense>
                    {installingPlugin.permissions.map((perm) => (
                      <ListItem
                        key={perm.code}
                        disableGutters
                      >
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <Shield size={14} />
                        </ListItemIcon>
                        <ListItemText
                          primary={perm.name}
                          secondary={perm.code}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}

              {installStep === 1 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  {installLoading ? (
                    <>
                      <CircularProgress
                        size={48}
                        sx={{ mb: 2 }}
                      />
                      <Typography>{i18n.t('pages.plugin_management_page.k0')}</Typography>
                    </>
                  ) : installError ? (
                    <Alert
                      severity='error'
                      sx={{ mb: 2 }}
                    >
                      {installError}
                    </Alert>
                  ) : null}
                </Box>
              )}

              {installStep === 2 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircle
                    size={64}
                    color='green'
                    style={{ marginBottom: 16 }}
                  />
                  <Typography
                    variant='h6'
                    gutterBottom
                  >
                    {i18n.t('pages.plugin_management_page.k28')}
                  </Typography>
                  <Typography color='text.secondary'>
                    {installingPlugin?.name} {i18n.t('pages.plugin_management_page.k0')}
                  </Typography>
                </Box>
              )}

              <Stack
                direction='row'
                spacing={2}
                sx={{ justifyContent: 'flex-end', mt: 3 }}
              >
                {installStep > 0 && installStep < 2 && (
                  <Button
                    onClick={handleInstallBack}
                    disabled={installLoading}
                  >
                    {i18n.t('pages.plugin_management_page.k29')}
                  </Button>
                )}
                {installStep < 2 ? (
                  <Button
                    variant='contained'
                    onClick={handleInstallNext}
                    disabled={installLoading}
                  >
                    {installStep === 0
                      ? i18n.t('pages.plugin_management_page.k57')
                      : i18n.t('pages.plugin_management_page.k56')}
                  </Button>
                ) : (
                  <Button
                    variant='contained'
                    onClick={handleInstallNext}
                  >
                    {i18n.t('pages.plugin_management_page.k30')}
                  </Button>
                )}
              </Stack>
            </Box>
          ) : (
            <Box>
              <TextField
                fullWidth
                placeholder={i18n.t('pages.plugin_management_page.k31')}
                value={marketplaceSearch}
                onChange={(e) => setMarketplaceSearch(e.target.value)}
                sx={{ mb: 2 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Search size={18} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Tabs
                value={marketplaceTab}
                onChange={(_, v) => setMarketplaceTab(v)}
                sx={{ mb: 2 }}
              >
                <Tab label={i18n.t('pages.plugin_management_page.k58')} />
                <Tab label={i18n.t('pages.plugin_management_page.k59')} />
                <Tab label={i18n.t('pages.plugin_management_page.k60')} />
                <Tab label={i18n.t('pages.plugin_management_page.k61')} />
              </Tabs>
              <List>
                {filteredMarketplace
                  .filter((p) => {
                    if (marketplaceTab === 1) return p.category === 'Business';
                    if (marketplaceTab === 2) return p.category === 'Analytics';
                    if (marketplaceTab === 3) return p.category === 'System';
                    return true;
                  })
                  .map((plugin) => {
                    const isInstalled = installedCodes.includes(plugin.code);
                    return (
                      <ListItem
                        key={plugin.code}
                        sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}
                        secondaryAction={
                          isInstalled ? (
                            <Chip
                              label={i18n.t('pages.plugin_management_page.k62')}
                              color='success'
                              size='small'
                            />
                          ) : (
                            <Button
                              variant='outlined'
                              size='small'
                              startIcon={<Download size={14} />}
                              onClick={() => handleInstallPlugin(plugin)}
                            >
                              {i18n.t('pages.plugin_management_page.k32')}
                            </Button>
                          )
                        }
                      >
                        <ListItemIcon>
                          <Package size={24} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {plugin.name}
                              <Chip
                                label={`v${plugin.latest_version}`}
                                size='small'
                                variant='outlined'
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                {plugin.description}
                              </Typography>
                              <Stack
                                direction='row'
                                spacing={2}
                                sx={{ mt: 0.5 }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Download size={12} />
                                  <Typography variant='caption'>{plugin.downloads}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Calendar size={12} />
                                  <Typography variant='caption'>{plugin.published_at}</Typography>
                                </Box>
                              </Stack>
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMarketplace}>
            {i18n.t('pages.plugin_management_page.k63')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PluginManagementPage;
