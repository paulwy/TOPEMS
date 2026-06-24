/**
 * Plugin Management Page
 * 插件管理页面
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
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
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  Play,
  Square,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Store,
  Search,
  Download,
  GitBranch,
  Calendar,
  Shield,
} from 'lucide-react';
import {
  type Plugin,
  fetchAllPluginInfo,
  PLUGIN_REGISTRY,
  type PluginRuntimeInfo,
} from '@/api/plugin';
import { usePluginStore } from '@/store/pluginStore';

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
  workflow: '工作流引擎',
  erp: '企业资源计划',
  hrm: '人力资源管理',
  crm: '客户关系管理',
  mes: '制造执行系统',
  qa: '质量管理与安全',
  scm: '供应链管理',
  wms: '仓储管理',
  bi: '商业智能',
  pm: '项目管理',
  ai: 'AI 智能服务',
  gis: '地理信息服务',
  mobile: '移动端服务',
  rs: '研发管理',
  srm: '供应商管理',
  monitor: '监控告警',
  portal: '企业门户',
  integration: '系统集成',
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

export const PluginManagementPage: React.FC = () => {
  const {
    installedPlugins,
    healthStatus,
    loading,
    error,
    fetchInstalledPlugins,
    fetchHealthStatus,
    enablePlugin,
    disablePlugin,
    uninstallPlugin,
    installPlugin,
  } = usePluginStore();

  const { toast } = useToast();

  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [marketplaceTab, setMarketplaceTab] = useState(0);
  const [marketplaceSearch, setMarketplaceSearch] = useState('');
  const [installingPlugin, setInstallingPlugin] = useState<MarketplacePlugin | null>(null);
  const [installStep, setInstallStep] = useState(0);
  const [installLoading, setInstallLoading] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    action: () => {},
  });

  const loadPlugins = useCallback(async () => {
    try {
      await Promise.all([fetchInstalledPlugins(), fetchHealthStatus()]);

      const pluginInfoList = await fetchAllPluginInfo();

      if (pluginInfoList.length > 0) {
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
        setPlugins(runtimePlugins);
      }
    } catch (err: any) {
      console.error('Failed to load plugins:', err);
    }
  }, [fetchInstalledPlugins, fetchHealthStatus]);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  const handleEnable = async (pluginCode: string) => {
    const success = await enablePlugin(pluginCode);
    if (success) {
      toast({
        title: '启用成功',
        description: `${pluginCode} 插件已启用`,
      });
      loadPlugins();
    }
  };

  const handleDisable = async (pluginCode: string) => {
    setConfirmDialog({
      open: true,
      title: '禁用插件',
      message: `确定要禁用 "${pluginCode}" 插件吗？`,
      action: async () => {
        const success = await disablePlugin(pluginCode);
        if (success) {
          toast({
            title: '禁用成功',
            description: `${pluginCode} 插件已禁用`,
          });
          loadPlugins();
        }
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  const handleUninstall = async (pluginCode: string) => {
    setConfirmDialog({
      open: true,
      title: '卸载插件',
      message: `确定要卸载 "${pluginCode}" 插件吗？此操作无法撤销。`,
      action: async () => {
        const success = await uninstallPlugin(pluginCode);
        if (success) {
          toast({
            title: '卸载成功',
            description: `${pluginCode} 插件已卸载`,
          });
          loadPlugins();
        }
        setConfirmDialog((prev) => ({ ...prev, open: false }));
      },
    });
  };

  const handleOpenMarketplace = () => {
    setMarketplaceOpen(true);
    setMarketplaceTab(0);
    setMarketplaceSearch('');
  };

  const handleCloseMarketplace = () => {
    setMarketplaceOpen(false);
    setInstallingPlugin(null);
    setInstallStep(0);
    setInstallError(null);
  };

  const handleInstallPlugin = (plugin: MarketplacePlugin) => {
    setInstallingPlugin(plugin);
    setInstallStep(0);
    setInstallError(null);
  };

  const handleInstallNext = async () => {
    if (installStep === 0) {
      setInstallStep(1);
    } else if (installStep === 1) {
      setInstallLoading(true);
      setInstallError(null);
      try {
        const success = await installPlugin(installingPlugin!.code);
        if (success) {
          setInstallStep(2);
          loadPlugins();
        } else {
          setInstallError('安装失败');
        }
      } catch (err: any) {
        setInstallError(err.message || '安装失败');
      } finally {
        setInstallLoading(false);
      }
    } else if (installStep === 2) {
      handleCloseMarketplace();
    }
  };

  const handleInstallBack = () => {
    if (installStep > 0) {
      setInstallStep(installStep - 1);
    }
  };

  const getStatusChip = (status: string | undefined, code: string) => {
    const health = healthStatus[code];
    if (health) {
      return health.healthy ? (
        <Chip
          icon={<CheckCircle size={14} />}
          label='Running'
          color='success'
          size='small'
        />
      ) : (
        <Chip
          icon={<XCircle size={14} />}
          label='Unhealthy'
          color='error'
          size='small'
        />
      );
    }
    switch (status) {
      case 'running':
        return (
          <Chip
            icon={<CheckCircle size={14} />}
            label='Running'
            color='success'
            size='small'
          />
        );
      case 'stopped':
        return (
          <Chip
            icon={<XCircle size={14} />}
            label='Stopped'
            color='error'
            size='small'
          />
        );
      default:
        return (
          <Chip
            icon={<AlertCircle size={14} />}
            label='Unknown'
            color='warning'
            size='small'
          />
        );
    }
  };

  const allMarketplacePlugins: MarketplacePlugin[] = Object.entries(PLUGIN_REGISTRY).map(
    ([code, config]) => ({
      code,
      name: PLUGIN_DISPLAY_NAMES[code] || code.toUpperCase(),
      version: '1.0.0',
      latest_version: '1.0.0',
      description: `${PLUGIN_DISPLAY_NAMES[code] || code} 服务运行在端口 ${config.port}`,
      author: 'TOPEMS',
      published_at: '2024-01-01',
      downloads: 0,
      category: PLUGIN_CATEGORIES[code] || 'Business',
      plugin_type: code === 'workflow' ? 'core' : 'business',
      permissions: [],
    })
  );

  const filteredMarketplace = allMarketplacePlugins.filter((plugin) => {
    const searchLower = marketplaceSearch.toLowerCase();
    return (
      plugin.name.toLowerCase().includes(searchLower) ||
      plugin.code.toLowerCase().includes(searchLower) ||
      plugin.description.toLowerCase().includes(searchLower)
    );
  });

  const installedCodes = [
    ...plugins.map((p) => p.code),
    ...installedPlugins.map((p) => p.plugin_code),
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Package size={24} />
          <Typography
            variant='h5'
            component='h1'
          >
            Plugin Management
          </Typography>
        </Box>
        <Stack
          direction='row'
          spacing={2}
        >
          <Button
            variant='outlined'
            startIcon={<Store size={18} />}
            onClick={handleOpenMarketplace}
          >
            Browse Marketplace
          </Button>
          <Button
            variant='outlined'
            startIcon={<RefreshCw size={18} />}
            onClick={loadPlugins}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
          onClose={() => {}}
        >
          {error}
        </Alert>
      )}

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Runtime URL</TableCell>
                <TableCell align='right'>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plugins.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align='center'
                  >
                    <Typography
                      color='text.secondary'
                      sx={{ py: 4 }}
                    >
                      No plugins installed
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                plugins.map((plugin) => (
                  <TableRow key={plugin.code}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Package size={18} />
                        <Box>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 500 }}
                          >
                            {plugin.name}
                          </Typography>
                          {plugin.description && (
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{
                                display: 'block',
                                maxWidth: 300,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {plugin.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <code style={{ fontSize: 12 }}>{plugin.code}</code>
                    </TableCell>
                    <TableCell>{plugin.version}</TableCell>
                    <TableCell>
                      <Chip
                        label={plugin.plugin_type}
                        size='small'
                        variant='outlined'
                      />
                    </TableCell>
                    <TableCell>{getStatusChip(plugin.runtime_status, plugin.code)}</TableCell>
                    <TableCell>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {plugin.runtime_url || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align='right'>
                      <Stack
                        direction='row'
                        spacing={1}
                        sx={{ justifyContent: 'flex-end' }}
                      >
                        {plugin.runtime_status === 'running' ? (
                          <Tooltip title='Disable'>
                            <IconButton
                              size='small'
                              color='warning'
                              onClick={() => handleDisable(plugin.code)}
                            >
                              <Square size={18} />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title='Enable'>
                            <IconButton
                              size='small'
                              color='success'
                              onClick={() => handleEnable(plugin.code)}
                            >
                              <Play size={18} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title='Uninstall'>
                          <IconButton
                            size='small'
                            color='error'
                            onClick={() => handleUninstall(plugin.code)}
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>
            Cancel
          </Button>
          <Button
            onClick={confirmDialog.action}
            variant='contained'
            color='error'
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={marketplaceOpen}
        onClose={handleCloseMarketplace}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Store size={24} />
            Plugin Marketplace
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
                  <StepLabel>Confirm</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Install</StepLabel>
                </Step>
                <Step>
                  <StepLabel>Complete</StepLabel>
                </Step>
              </Stepper>

              {installStep === 0 && (
                <Box>
                  <Typography
                    variant='h6'
                    gutterBottom
                  >
                    Confirm Installation
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ mb: 2 }}
                  >
                    You are about to install the following plugin:
                  </Typography>
                  <Card
                    variant='outlined'
                    sx={{ p: 2, mb: 2 }}
                  >
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
                          Version: {installingPlugin.latest_version}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Download size={14} />
                        <Typography variant='caption'>
                          Downloads: {installingPlugin.downloads}
                        </Typography>
                      </Box>
                    </Stack>
                  </Card>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 2 }}
                  >
                    This plugin will request the following permissions:
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
                      <Typography>Installing {installingPlugin?.name}...</Typography>
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
                    Installation Complete!
                  </Typography>
                  <Typography color='text.secondary'>
                    {installingPlugin?.name} has been installed successfully.
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
                    Back
                  </Button>
                )}
                {installStep < 2 ? (
                  <Button
                    variant='contained'
                    onClick={handleInstallNext}
                    disabled={installLoading}
                  >
                    {installStep === 0 ? 'Next' : 'Install'}
                  </Button>
                ) : (
                  <Button
                    variant='contained'
                    onClick={handleInstallNext}
                  >
                    Done
                  </Button>
                )}
              </Stack>
            </Box>
          ) : (
            <Box>
              <TextField
                fullWidth
                placeholder='Search plugins...'
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
                <Tab label='All Plugins' />
                <Tab label='Business' />
                <Tab label='Analytics' />
                <Tab label='System' />
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
                              label='Installed'
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
                              Install
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
          <Button onClick={handleCloseMarketplace}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PluginManagementPage;
