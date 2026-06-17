/**
 * Plugin Management Page
 * 插件管理页面
 */

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
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
} from "lucide-react";
import { pluginApi, type Plugin } from "@/api/plugin";

export const PluginManagementPage: React.FC = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
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

  const getStatusChip = (status: string | undefined) => {
    switch (status) {
      case "running":
        return (
          <Chip
            icon={<CheckCircle size={14} />}
            label="Running"
            color="success"
            size="small"
          />
        );
      case "stopped":
        return (
          <Chip
            icon={<XCircle size={14} />}
            label="Stopped"
            color="error"
            size="small"
          />
        );
      default:
        return (
          <Chip
            icon={<AlertCircle size={14} />}
            label="Unknown"
            color="warning"
            size="small"
          />
        );
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Package size={24} />
          <Typography variant="h5" component="h1">
            Plugin Management
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshCw size={18} />}
          onClick={loadPlugins}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
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
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plugins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      No plugins installed
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                plugins.map((plugin) => (
                  <TableRow key={plugin.code}>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Package size={18} />
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {plugin.name}
                          </Typography>
                          {plugin.description && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: "block",
                                maxWidth: 300,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
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
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{getStatusChip(plugin.runtime_status)}</TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontFamily: "monospace" }}
                      >
                        {plugin.runtime_url || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {plugin.runtime_status === "running" ? (
                          <Tooltip title="Disable">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleDisable(plugin.code)}
                              disabled={actionLoading === plugin.code}
                            >
                              <Square size={18} />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Enable">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleEnable(plugin.code)}
                              disabled={actionLoading === plugin.code}
                            >
                              <Play size={18} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Uninstall">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleUninstall(plugin.code)}
                            disabled={actionLoading === plugin.code}
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

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() =>
          setConfirmDialog((prev) => ({ ...prev, open: false }))
        }
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setConfirmDialog((prev) => ({ ...prev, open: false }))
            }
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDialog.action}
            variant="contained"
            color="error"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PluginManagementPage;
