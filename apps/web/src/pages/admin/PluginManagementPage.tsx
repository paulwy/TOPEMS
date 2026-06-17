/**
 * Plugin Management Page
 * 插件管理页面
 */

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  Button,
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
} from "@mui/material";
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
} from "lucide-react";
import { pluginApi, type Plugin } from "@/api/plugin";

// Marketplace plugin type (available plugins)
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

// Mock marketplace data
const MOCK_MARKETPLACE: MarketplacePlugin[] = [
  {
    code: "erp",
    name: "企业资源计划",
    version: "1.0.0",
    latest_version: "1.2.0",
    description: "ERP 企业资源计划系统，包含采购、销售、库存、财务等模块",
    author: "TOPEMS",
    published_at: "2024-01-15",
    downloads: 1250,
    category: "Business",
    plugin_type: "business",
    permissions: [
      { code: "erp:purchase:read", name: "查看采购" },
      { code: "erp:sale:read", name: "查看销售" },
    ],
  },
  {
    code: "hrm",
    name: "人力资源管理",
    version: "1.0.0",
    latest_version: "1.1.0",
    description: "HRM 人力资源管理系统，包含组织架构、招聘、考勤、薪酬、绩效等模块",
    author: "TOPEMS",
    published_at: "2024-01-20",
    downloads: 980,
    category: "Business",
    plugin_type: "business",
    permissions: [
      { code: "hrm:employee:read", name: "查看员工" },
    ],
  },
  {
    code: "crm",
    name: "客户关系管理",
    version: "1.0.0",
    latest_version: "1.0.5",
    description: "CRM 客户关系管理系统，包含客户、联系人、商机、合同等模块",
    author: "TOPEMS",
    published_at: "2024-02-01",
    downloads: 756,
    category: "Business",
    plugin_type: "business",
    permissions: [
      { code: "crm:customer:read", name: "查看客户" },
    ],
  },
  {
    code: "scm",
    name: "供应链管理",
    version: "1.0.0",
    latest_version: "1.0.0",
    description: "SCM 供应链管理系统，包含供应商管理、采购订单管理等模块",
    author: "TOPEMS",
    published_at: "2024-02-10",
    downloads: 432,
    category: "Business",
    plugin_type: "business",
    permissions: [
      { code: "scm:supplier:read", name: "查看供应商" },
    ],
  },
  {
    code: "wms",
    name: "仓储管理",
    version: "1.0.0",
    latest_version: "1.0.0",
    description: "WMS 仓储管理系统，包含仓库管理、库存管理、入库出库等模块",
    author: "TOPEMS",
    published_at: "2024-02-15",
    downloads: 389,
    category: "Business",
    plugin_type: "business",
    permissions: [
      { code: "wms:warehouse:read", name: "查看仓库" },
    ],
  },
  {
    code: "mes",
    name: "制造执行系统",
    version: "1.0.0",
    latest_version: "1.0.0",
    description: "MES 制造执行系统，包含生产工单、生产工艺、设备管理等模块",
    author: "TOPEMS",
    published_at: "2024-02-20",
    downloads: 287,
    category: "Business",
    plugin_type: "business",
    permissions: [
      { code: "mes:production_order:read", name: "查看生产工单" },
    ],
  },
  {
    code: "pm",
    name: "项目管理",
    version: "1.0.0",
    latest_version: "1.0.0",
    description: "PM 项目管理系统，包含项目、任务、甘特图、预算等模块",
    author: "TOPEMS",
    published_at: "2024-03-01",
    downloads: 312,
    category: "Business",
    plugin_type: "business",
    permissions: [
      { code: "pm:project:read", name: "查看项目" },
    ],
  },
  {
    code: "bi",
    name: "商业智能",
    version: "1.0.0",
    latest_version: "1.0.0",
    description: "BI 商业智能系统，包含数据分析、仪表盘、报表等模块",
    author: "TOPEMS",
    published_at: "2024-03-10",
    downloads: 198,
    category: "Analytics",
    plugin_type: "business",
    permissions: [
      { code: "bi:analysis:read", name: "查看分析" },
    ],
  },
  {
    code: "workflow",
    name: "工作流引擎",
    version: "1.0.0",
    latest_version: "1.0.0",
    description: "Workflow 工作流引擎，包含流程设计、审批等模块",
    author: "TOPEMS",
    published_at: "2024-03-15",
    downloads: 156,
    category: "System",
    plugin_type: "core",
    permissions: [
      { code: "workflow:instance:read", name: "查看流程实例" },
    ],
  },
];

export const PluginManagementPage: React.FC = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [marketplaceTab, setMarketplaceTab] = useState(0);
  const [marketplaceSearch, setMarketplaceSearch] = useState("");
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
    title: "",
    message: "",
    action: () => {},
  });

  const loadPlugins = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await pluginApi.listInstalled();
      if (response.success && response.data) {
        setPlugins(response.data);
      } else {
        setError(response.message || "Failed to load plugins");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlugins();
  }, []);

  const handleEnable = async (pluginCode: string) => {
    try {
      setActionLoading(pluginCode);
      const response = await pluginApi.enable(pluginCode);
      if (response.success) {
        loadPlugins();
      }
    } catch (err) {
      console.error("Failed to enable plugin:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisable = async (pluginCode: string) => {
    setConfirmDialog({
      open: true,
      title: "Disable Plugin",
      message: `Are you sure you want to disable "${pluginCode}"?`,
      action: async () => {
        try {
          setActionLoading(pluginCode);
          const response = await pluginApi.disable(pluginCode);
          if (response.success) {
            loadPlugins();
          }
        } catch (err) {
          console.error("Failed to disable plugin:", err);
        } finally {
          setActionLoading(null);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handleUninstall = async (pluginCode: string) => {
    setConfirmDialog({
      open: true,
      title: "Uninstall Plugin",
      message: `Are you sure you want to uninstall "${pluginCode}"? This action cannot be undone.`,
      action: async () => {
        try {
          setActionLoading(pluginCode);
          const response = await pluginApi.uninstall(pluginCode);
          if (response.success) {
            loadPlugins();
          }
        } catch (err) {
          console.error("Failed to uninstall plugin:", err);
        } finally {
          setActionLoading(null);
          setConfirmDialog((prev) => ({ ...prev, open: false }));
        }
      },
    });
  };

  const handleOpenMarketplace = () => {
    setMarketplaceOpen(true);
    setMarketplaceTab(0);
    setMarketplaceSearch("");
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
        const response = await pluginApi.install(installingPlugin!.code);
        if (response.success) {
          setInstallStep(2);
          loadPlugins();
        } else {
          setInstallError(response.message || "Installation failed");
        }
      } catch (err: any) {
        setInstallError(err.message || "Installation failed");
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

  const getStatusChip = (status: string | undefined) => {
    switch (status) {
      case "running":
        return <Chip icon={<CheckCircle size={14} />} label="Running" color="success" size="small" />;
      case "stopped":
        return <Chip icon={<XCircle size={14} />} label="Stopped" color="error" size="small" />;
      default:
        return <Chip icon={<AlertCircle size={14} />} label="Unknown" color="warning" size="small" />;
    }
  };

  const filteredMarketplace = MOCK_MARKETPLACE.filter((plugin) => {
    const searchLower = marketplaceSearch.toLowerCase();
    return (
      plugin.name.toLowerCase().includes(searchLower) ||
      plugin.code.toLowerCase().includes(searchLower) ||
      plugin.description.toLowerCase().includes(searchLower)
    );
  });

  const installedCodes = plugins.map((p) => p.code);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Package size={24} />
          <Typography variant="h5" component="h1">Plugin Management</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<Store size={18} />} onClick={handleOpenMarketplace}>
            Browse Marketplace
          </Button>
          <Button variant="outlined" startIcon={<RefreshCw size={18} />} onClick={loadPlugins}>
            Refresh
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

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
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plugins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>No plugins installed</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                plugins.map((plugin) => (
                  <TableRow key={plugin.code}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Package size={18} />
                        <Box>
                          <Typography variant="body2" fontWeight={500}>{plugin.name}</Typography>
                          {plugin.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {plugin.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><code style={{ fontSize: 12 }}>{plugin.code}</code></TableCell>
                    <TableCell>{plugin.version}</TableCell>
                    <TableCell><Chip label={plugin.plugin_type} size="small" variant="outlined" /></TableCell>
                    <TableCell>{getStatusChip(plugin.runtime_status)}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                        {plugin.runtime_url || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {plugin.runtime_status === "running" ? (
                          <Tooltip title="Disable">
                            <IconButton size="small" color="warning" onClick={() => handleDisable(plugin.code)} disabled={actionLoading === plugin.code}>
                              <Square size={18} />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Enable">
                            <IconButton size="small" color="success" onClick={() => handleEnable(plugin.code)} disabled={actionLoading === plugin.code}>
                              <Play size={18} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Uninstall">
                          <IconButton size="small" color="error" onClick={() => handleUninstall(plugin.code)} disabled={actionLoading === plugin.code}>
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

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>Cancel</Button>
          <Button onClick={confirmDialog.action} variant="contained" color="error">Confirm</Button>
        </DialogActions>
      </Dialog>

      {/* Marketplace Dialog */}
      <Dialog open={marketplaceOpen} onClose={handleCloseMarketplace} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Store size={24} />
            Plugin Marketplace
          </Box>
        </DialogTitle>
        <DialogContent>
          {installingPlugin ? (
            <Box>
              <Stepper activeStep={installStep} sx={{ mb: 3 }}>
                <Step><StepLabel>Confirm</StepLabel></Step>
                <Step><StepLabel>Install</StepLabel></Step>
                <Step><StepLabel>Complete</StepLabel></Step>
              </Stepper>

              {installStep === 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>Confirm Installation</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    You are about to install the following plugin:
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={600}>{installingPlugin.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{installingPlugin.description}</Typography>
                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <GitBranch size={14} />
                        <Typography variant="caption">Version: {installingPlugin.latest_version}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Download size={14} />
                        <Typography variant="caption">Downloads: {installingPlugin.downloads}</Typography>
                      </Box>
                    </Stack>
                  </Card>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    This plugin will request the following permissions:
                  </Typography>
                  <List dense>
                    {installingPlugin.permissions.map((perm) => (
                      <ListItem key={perm.code} disableGutters>
                        <ListItemIcon sx={{ minWidth: 32 }}><Shield size={14} /></ListItemIcon>
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
                <Box sx={{ textAlign: "center", py: 4 }}>
                  {installLoading ? (
                    <>
                      <CircularProgress size={48} sx={{ mb: 2 }} />
                      <Typography>Installing {installingPlugin?.name}...</Typography>
                    </>
                  ) : installError ? (
                    <Alert severity="error" sx={{ mb: 2 }}>{installError}</Alert>
                  ) : null}
                </Box>
              )}

              {installStep === 2 && (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <CheckCircle size={64} color="green" style={{ marginBottom: 16 }} />
                  <Typography variant="h6" gutterBottom>Installation Complete!</Typography>
                  <Typography color="text.secondary">{installingPlugin?.name} has been installed successfully.</Typography>
                </Box>
              )}

              <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
                {installStep > 0 && installStep < 2 && (
                  <Button onClick={handleInstallBack} disabled={installLoading}>Back</Button>
                )}
                {installStep < 2 ? (
                  <Button variant="contained" onClick={handleInstallNext} disabled={installLoading}>
                    {installStep === 0 ? "Next" : "Install"}
                  </Button>
                ) : (
                  <Button variant="contained" onClick={handleInstallNext}>Done</Button>
                )}
              </Stack>
            </Box>
          ) : (
            <Box>
              <TextField
                fullWidth
                placeholder="Search plugins..."
                value={marketplaceSearch}
                onChange={(e) => setMarketplaceSearch(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search size={18} /></InputAdornment>,
                }}
              />
              <Tabs value={marketplaceTab} onChange={(_, v) => setMarketplaceTab(v)} sx={{ mb: 2 }}>
                <Tab label="All Plugins" />
                <Tab label="Business" />
                <Tab label="Analytics" />
                <Tab label="System" />
              </Tabs>
              <List>
                {filteredMarketplace
                  .filter((p) => {
                    if (marketplaceTab === 1) return p.category === "Business";
                    if (marketplaceTab === 2) return p.category === "Analytics";
                    if (marketplaceTab === 3) return p.category === "System";
                    return true;
                  })
                  .map((plugin) => {
                    const isInstalled = installedCodes.includes(plugin.code);
                    return (
                      <ListItem
                        key={plugin.code}
                        sx={{ border: 1, borderColor: "divider", borderRadius: 1, mb: 1 }}
                        secondaryAction={
                          isInstalled ? (
                            <Chip label="Installed" color="success" size="small" />
                          ) : (
                            <Button variant="outlined" size="small" startIcon={<Download size={14} />} onClick={() => handleInstallPlugin(plugin)}>
                              Install
                            </Button>
                          )
                        }
                      >
                        <ListItemIcon><Package size={24} /></ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              {plugin.name}
                              <Chip label={`v${plugin.latest_version}`} size="small" variant="outlined" />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">{plugin.description}</Typography>
                              <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <Download size={12} />
                                  <Typography variant="caption">{plugin.downloads}</Typography>
                                </Box>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <Calendar size={12} />
                                  <Typography variant="caption">{plugin.published_at}</Typography>
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
