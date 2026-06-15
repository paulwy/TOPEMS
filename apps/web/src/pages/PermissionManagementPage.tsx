import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Box,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  IconButton,
  Stack,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import {
  Key,
  Search,
  Plus,
  Trash2,
  ChevronLeft,
  Shield,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authApi, type Permission } from "../api/iam";
import { useAppStore } from "../store";
import { ModeToggle } from "@/components/ModeToggle";

interface PermissionManagementPageProps {
  onNavigate?: (page: string) => void;
}

const PermissionManagementPage: React.FC<PermissionManagementPageProps> = ({
  onNavigate: _onNavigate,
}) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newPermission, setNewPermission] = useState({
    name: "",
    code: "",
    category: "",
    description: "",
  });

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.listPermissions();
      if (res.success && res.data) {
        setPermissions(res.data);
      }
    } catch (err: any) {
      setError(err.message || "加载权限失败");
      addNotification({
        title: "失败",
        message: "加载权限失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authApi.createPermission({
        name: newPermission.name,
        code: newPermission.code,
        category: newPermission.category,
        module: newPermission.category,
        description: newPermission.description || undefined,
      });

      if (res.success) {
        addNotification({
          title: "成功",
          message: "权限创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setNewPermission({ name: "", code: "", category: "", description: "" });
        loadPermissions();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "创建权限失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "创建权限失败",
        type: "error",
      });
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    if (!confirm("确定要删除这个权限吗？删除后相关角色的权限也会被移除。"))
      return;

    try {
      const res = await authApi.deletePermission(permissionId);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "权限删除成功",
          type: "success",
        });
        loadPermissions();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除权限失败",
          type: "error",
        });
      }
    } catch (err: any) {
      addNotification({
        title: "失败",
        message: err.message || "删除权限失败",
        type: "error",
      });
    }
  };

  const filteredPermissions = permissions.filter(
    (perm) =>
      perm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      perm.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      perm.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      perm.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getCategoryBadge = (category: string) => {
    const badges: Record<string, { bgcolor: string; color: string; label: string }> = {
      doc: { bgcolor: "blue.100", color: "blue.700", label: "文档" },
      ai: { bgcolor: "purple.100", color: "purple.700", label: "AI" },
      workflow: { bgcolor: "green.100", color: "green.700", label: "流程" },
      iam: { bgcolor: "yellow.100", color: "yellow.700", label: "IAM" },
      rs: { bgcolor: "orange.100", color: "orange.700", label: "研发" },
      lims: { bgcolor: "cyan.100", color: "cyan.700", label: "LIMS" },
      qms: { bgcolor: "teal.100", color: "teal.700", label: "质量" },
      ehs: { bgcolor: "red.100", color: "red.700", label: "EHS" },
      srm: { bgcolor: "violet.100", color: "violet.700", label: "采购" },
      pdm: { bgcolor: "amber.100", color: "amber.700", label: "产品" },
      gis: { bgcolor: "emerald.100", color: "emerald.700", label: "GIS" },
      im: { bgcolor: "rose.100", color: "rose.700", label: "即时通讯" },
      mail: { bgcolor: "indigo.100", color: "indigo.700", label: "邮件" },
      system: { bgcolor: "gray.100", color: "gray.700", label: "系统" },
      crm: { bgcolor: "pink.100", color: "pink.700", label: "CRM" },
      pm: { bgcolor: "lime.100", color: "lime.700", label: "项目" },
      integration: { bgcolor: "sky.100", color: "sky.700", label: "集成" },
    };
    const config = badges[category] || {
      bgcolor: "gray.100",
      color: "gray.700",
      label: category,
    };
    return <Chip size="small" sx={{ bgcolor: config.bgcolor, color: config.color }} label={config.label} />;
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <Box sx={{ bgcolor: "white", borderBottom: 1, borderColor: "grey.200" }}>
        <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: 3 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Button variant="text" onClick={() => navigate("/dashboard")}>
                <ChevronLeft sx={{ width: 20, height: 20 }} />
              </Button>
              <Box>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                  <Key sx={{ width: 28, height: 28, color: "purple.600" }} />
                  <Typography variant="h5" sx={{ fontWeight: "bold" }}>权限管理</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  查看和管理系统权限配置
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <ModeToggle />
              <Button variant="contained" onClick={() => setShowCreateModal(true)} startIcon={<Plus sx={{ width: 20, height: 20 }} />}>
                创建权限
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: 4 }}>
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
              <Box sx={{ flex: 1, position: "relative" }}>
                <Search sx={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 20, height: 20, color: "grey.400" }} />
                <TextField
                  size="small"
                  placeholder="搜索权限名称、资源、操作或描述..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ pl: 4, width: "100%" }}
                />
              </Box>
              <Button variant="outlined" onClick={loadPermissions} startIcon={<RefreshCw sx={{ width: 16, height: 16 }} />}>
                刷新
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box sx={{ p: 8, textAlign: "center" }}>
                <Box sx={{ display: "inline-block", width: 32, height: 32, border: 4, borderColor: "purple.600", borderRadius: "50%", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
                <Typography sx={{ mt: 2, color: "text.secondary" }}>加载中...</Typography>
              </Box>
            ) : error ? (
              <Box sx={{ p: 8, textAlign: "center" }}>
                <AlertCircle sx={{ width: 48, height: 48, color: "error.main", mx: "auto", mb: 1.5 }} />
                <Typography color="error">{error}</Typography>
                <Button sx={{ mt: 2 }} onClick={loadPermissions}>重试</Button>
              </Box>
            ) : filteredPermissions.length === 0 ? (
              <Box sx={{ p: 8, textAlign: "center" }}>
                <Key sx={{ width: 48, height: 48, color: "grey.400", mx: "auto", mb: 1.5 }} />
                <Typography color="text.secondary">暂无权限</Typography>
              </Box>
            ) : (
              <Box>
                {filteredPermissions.map((perm, index) => (
                  <Box
                    key={perm.id}
                    sx={{
                      p: 3,
                      borderBottom: index < filteredPermissions.length - 1 ? 1 : 0,
                      borderColor: "grey.200",
                      "&:hover": { bgcolor: "grey.50" },
                    }}
                  >
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
                        <Box sx={{ width: 48, height: 48, bgcolor: "purple.100", borderRadius: 1, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Shield sx={{ width: 24, height: 24, color: "purple.600" }} />
                        </Box>
                        <Box>
                          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{perm.name}</Typography>
                            {getCategoryBadge(perm.category)}
                          </Stack>
                          {perm.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {perm.description}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.disabled" sx={{ mt: 1, display: "block" }}>
                            权限码: {perm.code}
                          </Typography>
                        </Box>
                      </Stack>
                      <Tooltip title="删除权限">
                        <IconButton
                          size="small"
                          sx={{ color: "error.main", "&:hover": { color: "error.dark" } }}
                          onClick={() => handleDeletePermission(perm.id)}
                        >
                          <Trash2 sx={{ width: 16, height: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        <Card sx={{ mt: 3, bgcolor: "blue.50", border: 1, borderColor: "blue.200" }}>
          <CardContent sx={{ p: 2 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <AlertCircle sx={{ width: 16, height: 16, color: "blue.700" }} />
              <Typography variant="subtitle2" color="blue.900">关于权限管理</Typography>
            </Stack>
            <Typography variant="body2" color="blue.700" sx={{ mt: 1 }}>
              权限是系统级配置，通常由开发人员在后端代码中预先定义。
              您可以在这里查看所有可用权限，并通过角色管理页面将权限分配给不同的角色。
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建新权限</DialogTitle>
        <form onSubmit={handleCreatePermission}>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">权限名称 *</Typography>
                <TextField
                  fullWidth
                  size="small"
                  required
                  value={newPermission.name}
                  onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
                  placeholder="例如：文档读取"
                  sx={{ mt: 0.5 }}
                />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">权限码 *</Typography>
                <TextField
                  fullWidth
                  size="small"
                  required
                  value={newPermission.code}
                  onChange={(e) => setNewPermission({ ...newPermission, code: e.target.value })}
                  placeholder="例如：doc:read"
                  sx={{ mt: 0.5 }}
                />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">分类 *</Typography>
                <TextField
                  fullWidth
                  size="small"
                  required
                  value={newPermission.category}
                  onChange={(e) => setNewPermission({ ...newPermission, category: e.target.value })}
                  placeholder="例如：doc"
                  sx={{ mt: 0.5 }}
                />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">描述</Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={newPermission.description}
                  onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
                  placeholder="描述这个权限的用途"
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setShowCreateModal(false);
                setNewPermission({ name: "", code: "", category: "", description: "" });
              }}
            >
              取消
            </Button>
            <Button type="submit" variant="contained">创建</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default PermissionManagementPage;
