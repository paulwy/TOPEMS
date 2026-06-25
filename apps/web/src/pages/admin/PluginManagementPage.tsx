import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
} from '@mui/material';
import { Button } from '@mui/material';
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
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { useAppStore } from '@/store';
import {
  type Plugin,
  fetchAllPluginInfo,
  PLUGIN_REGISTRY,
} from '@/api/plugin';
import { usePluginStore } from '@/store/pluginStore';
import { extractErrorMessage } from '@/utils/errors';

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

const PluginManagementPage: React.FC = () => {
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

  const addNotification = useAppStore((state) => state.addNotification);

  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
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
    } catch (err: unknown) {
      console.error('Failed to load plugins:', err);
    }
  }, [fetchInstalledPlugins, fetchHealthStatus]);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  const handleEnable = async (pluginCode: string) => {
    const success = await enablePlugin(pluginCode);
    if (success) {
      addNotification({
        title: '启用成功',
        message: `${pluginCode} 插件已启用`,
        type: 'success',
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
          addNotification({
            title: '禁用成功',
            message: `${pluginCode} 插件已禁用`,
            type: 'success',
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
          addNotification({
            title: '卸载成功',
            message: `${pluginCode} 插件已卸载`,
            type: 'success',
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
      } catch (err: unknown) {
        setInstallError(extractErrorMessage(err, '安装失败'));
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
          label='运行中'
          color='success'
          size='small'
        />
      ) : (
        <Chip
          icon={<XCircle size={14} />}
          label='不健康'
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
            label='运行中'
            color='success'
            size='small'
          />
        );
      case 'stopped':
        return (
          <Chip
            icon={<XCircle size={14} />}
            label='已停止'
            color='error'
            size='small'
          />
        );
      default:
        return (
          <Chip
            icon={<AlertCircle size={14} />}
            label='未知'
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
    ...installedPlugins.map((p) => p.plugin_id),
  ];

  const filteredPlugins = useMemo(() => {
    return plugins.filter((plugin) => {
      const matchesSearch =
        plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (plugin.description && plugin.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === 'all' || plugin.plugin_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [plugins, searchQuery, typeFilter]);

  const columns: ColumnDef<Plugin>[] = useMemo(
    () => [
      {
        id: 'name',
        label: '名称',
        width: 250,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Package size={18} />
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {row.name}
              </Typography>
              {row.description && (
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
                  {row.description}
                </Typography>
              )}
            </Box>
          </Box>
        ),
      },
      {
        id: 'code',
        label: '代码',
        width: 120,
        render: (row) => <code style={{ fontSize: 12 }}>{row.code}</code>,
      },
      {
        id: 'version',
        label: '版本',
        width: 100,
      },
      {
        id: 'plugin_type',
        label: '类型',
        width: 100,
        render: (row) => (
          <Chip
            label={row.plugin_type}
            size='small'
            variant='outlined'
          />
        ),
      },
      {
        id: 'runtime_status',
        label: '状态',
        width: 120,
        render: (row) => getStatusChip(row.runtime_status, row.code),
      },
      {
        id: 'runtime_url',
        label: '运行地址',
        width: 200,
        render: (row) => (
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ fontFamily: 'monospace' }}
          >
            {row.runtime_url || '-'}
          </Typography>
        ),
      },
    ],
    []
  );

  const rowActions: RowAction<Plugin>[] = [
    {
      label: '启用',
      icon: <Play size={16} />,
      onClick: (row) => handleEnable(row.code),
      color: 'success',
      show: (row) => row.runtime_status !== 'running',
    },
    {
      label: '禁用',
      icon: <Square size={16} />,
      onClick: (row) => handleDisable(row.code),
      color: 'warning',
      show: (row) => row.runtime_status === 'running',
    },
    {
      label: '卸载',
      icon: <Trash2 size={16} />,
      onClick: (row) => handleUninstall(row.code),
      color: 'error',
      divider: true,
    },
  ];

  const filters = useMemo(
    () => [
      {
        id: 'plugin_type',
        label: '插件类型',
        type: 'select' as const,
        value: typeFilter,
        options: [
          { label: '全部类型', value: 'all' },
          { label: '核心插件', value: 'core' },
          { label: '业务插件', value: 'business' },
        ],
        onChange: (value: string) => setTypeFilter(value),
      },
    ],
    [typeFilter]
  );

  return (
    <Box>
      {error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
          onClose={() => {}}
        >
          {error}
        </Alert>
      )}

      <ListPageTemplate
        title='插件管理'
        subtitle='管理系统插件，启用、禁用或卸载插件'
        breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '系统管理' }, { label: '插件管理' }]}
        columns={columns}
        data={filteredPlugins}
        loading={loading}
        searchable
        searchPlaceholder='搜索插件名称或代码...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        filtersValue={{ plugin_type: typeFilter }}
        onFilterChange={(f) => {
          if (f.plugin_type !== undefined) setTypeFilter(f.plugin_type);
        }}
        actions={[
          {
            label: '浏览市场',
            icon: <Store size={16} />,
            onClick: handleOpenMarketplace,
            variant: 'outlined',
          },
        ]}
        rowActions={rowActions}
        onRefresh={loadPlugins}
        showRowNumber
        columnConfigurable
        persistColumnConfig
        columnConfigStorageKey='admin-plugins-columns'
      />

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
            取消
          </Button>
          <Button
            onClick={confirmDialog.action}
            variant='contained'
            color='error'
          >
            确认
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
            插件市场
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
                  <StepLabel>确认</StepLabel>
                </Step>
                <Step>
                  <StepLabel>安装</StepLabel>
                </Step>
                <Step>
                  <StepLabel>完成</StepLabel>
                </Step>
              </Stepper>

              {installStep === 0 && (
                <Box>
                  <Typography
                    variant='h6'
                    gutterBottom
                  >
                    确认安装
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ mb: 2 }}
                  >
                    您即将安装以下插件：
                  </Typography>
                  <Box
                    sx={{ p: 2, mb: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}
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
                          版本: {installingPlugin.latest_version}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Download size={14} />
                        <Typography variant='caption'>
                          下载量: {installingPlugin.downloads}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mb: 2 }}
                  >
                    此插件将请求以下权限：
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
                      <Typography>正在安装 {installingPlugin?.name}...</Typography>
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
                    安装完成！
                  </Typography>
                  <Typography color='text.secondary'>
                    {installingPlugin?.name} 已成功安装。
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
                    上一步
                  </Button>
                )}
                {installStep < 2 ? (
                  <Button
                    variant='contained'
                    onClick={handleInstallNext}
                    disabled={installLoading}
                  >
                    {installStep === 0 ? '下一步' : '安装'}
                  </Button>
                ) : (
                  <Button
                    variant='contained'
                    onClick={handleInstallNext}
                  >
                    完成
                  </Button>
                )}
              </Stack>
            </Box>
          ) : (
            <Box>
              <TextField
                fullWidth
                placeholder='搜索插件...'
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
                <Tab label='全部插件' />
                <Tab label='业务插件' />
                <Tab label='分析插件' />
                <Tab label='系统插件' />
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
                              label='已安装'
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
                              安装
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
          <Button onClick={handleCloseMarketplace}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PluginManagementPage;
