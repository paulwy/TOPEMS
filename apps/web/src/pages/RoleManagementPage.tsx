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
} from "@mui/material";
import React, { useState, useEffect } from "react";
import {
  Shield,
  Search,
  Plus,
  Trash2,
  ChevronLeft,
  Key,
  AlertCircle,
  CheckCircle,
  Edit,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authApi, type Role, type Permission } from "../api/iam";
import { useAppStore } from "../store";

import { ModeToggle } from "@/components/ModeToggle";

interface RoleManagementPageProps {
  onNavigate?: (page: string) => void;
}

const RoleManagementPage: React.FC<RoleManagementPageProps> = ({
  onNavigate: _onNavigate,
}) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);

  const [newRole, setNewRole] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        authApi.listRoles(),
        authApi.listPermissions(),
      ]);

      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
      }
      if (permsRes.success && permsRes.data) {
        setAllPermissions(permsRes.data);
      }
    } catch (_err: any) {
      setError(_err.message || "加载数据失败");
      addNotification({
        title: "加载失败",
        message: "加载数据失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRolePermissions = async (roleId: string) => {
    try {
      const res = await authApi.getRolePermissions(roleId);
      if (res.success && res.data) {
        setRolePermissions(res.data);
      }
    } catch (_err: any) {
      addNotification({
        title: "加载失败",
        message: "加载角色权限失败",
        type: "error",
      });
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authApi.createRole(newRole);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "角色创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setNewRole({ name: "", description: "" });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "创建角色失败",
          type: "error",
        });
      }
    } catch (_err: any) {
      addNotification({
        title: "失败",
        message: _err.message || "创建角色失败",
        type: "error",
      });
    }
  };

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    try {
      const res = await authApi.updateRole(selectedRole.id, {
        name: selectedRole.name,
        description: selectedRole.description,
      });
      if (res.success) {
        addNotification({
          title: "成功",
          message: "角色更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedRole(null);
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "更新角色失败",
          type: "error",
        });
      }
    } catch (_err: any) {
      addNotification({
        title: "失败",
        message: _err.message || "更新角色失败",
        type: "error",
      });
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("确定要删除这个角色吗？删除后无法恢复。")) return;

    try {
      const res = await authApi.deleteRole(roleId);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "角色删除成功",
          type: "success",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除角色失败",
          type: "error",
        });
      }
    } catch (_err: any) {
      addNotification({
        title: "失败",
        message: _err.message || "删除角色失败",
        type: "error",
      });
    }
  };

  const handleAddPermission = async (roleId: string, permissionId: string) => {
    try {
      const res = await authApi.addRolePermission(roleId, permissionId);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "权限添加成功",
          type: "success",
        });
        loadRolePermissions(roleId);
      } else {
        addNotification({
          title: "失败",
          message: res.message || "添加权限失败",
          type: "error",
        });
      }
    } catch (_err: any) {
      addNotification({
        title: "失败",
        message: _err.message || "添加权限失败",
        type: "error",
      });
    }
  };

  const handleRemovePermission = async (
    roleId: string,
    permissionId: string,
  ) => {
    try {
      const res = await authApi.removeRolePermission(roleId, permissionId);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "权限移除成功",
          type: "success",
        });
        loadRolePermissions(roleId);
      } else {
        addNotification({
          title: "失败",
          message: res.message || "移除权限失败",
          type: "error",
        });
      }
    } catch (_err: any) {
      addNotification({
        title: "失败",
        message: _err.message || "移除权限失败",
        type: "error",
      });
    }
  };

  const openPermissionsModal = async (role: Role) => {
    setSelectedRole(role);
    await loadRolePermissions(role.id);
    setShowPermissionsModal(true);
  };

  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      {/* 顶部导航 */}
      <Box
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <IconButton onClick={() => navigate("/dashboard")}>
                <ChevronLeft />
              </IconButton>
              <Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Shield size={28} color="#6366f1" />
                  角色管理
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  管理用户角色、权限配置
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ModeToggle />
              <Button
                variant="contained"
                onClick={() => setShowCreateModal(true)}
                startIcon={<Plus size={20} />}
              >
                创建角色
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: 4 }}>
        {/* 搜索栏 */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Box sx={{ flex: 1, position: "relative" }}>
            <Search
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                width: 20,
                height: 20,
                color: "#9e9e9e",
              }}
            />
            <TextField
              size="small"
              placeholder="搜索角色名称或描述..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: "100%", pl: 5 }}
            />
          </Box>
          <Button variant="outlined" onClick={loadData}>
            刷新
          </Button>
        </Box>

        {/* 角色列表 */}
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Box
                  sx={{
                    display: "inline-block",
                    width: 32,
                    height: 32,
                    border: 4,
                    borderColor: "primary.main",
                    borderTop: "transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <Typography sx={{ mt: 2, color: "text.secondary" }}>
                  加载中...
                </Typography>
              </Box>
            ) : error ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <AlertCircle size={48} color="#d32f2f" />
                <Typography sx={{ color: "error.main", mt: 2 }}>
                  {error}
                </Typography>
                <Button sx={{ mt: 2 }} onClick={loadData}>
                  重试
                </Button>
              </Box>
            ) : filteredRoles.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Shield size={48} color="#9e9e9e" />
                <Typography sx={{ color: "text.secondary", mt: 2 }}>
                  暂无角色
                </Typography>
              </Box>
            ) : (
              <Box>
                {filteredRoles.map((role) => (
                  <Box
                    key={role.id}
                    sx={{
                      p: 3,
                      borderBottom: 1,
                      borderColor: "divider",
                      "&:hover": { bgcolor: "grey.50" },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 2,
                        }}
                      >
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: "primary.light",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Shield size={24} color="#6366f1" />
                        </Box>
                        <Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 600 }}
                            >
                              {role.name}
                            </Typography>
                          </Box>
                          {role.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.5 }}
                            >
                              {role.description}
                            </Typography>
                          )}
                          <Typography
                            variant="caption"
                            color="text.disabled"
                            sx={{ mt: 1, display: "block" }}
                          >
                            创建时间:{" "}
                            {new Date(role.created_at).toLocaleString("zh-CN")}
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                      >
                        <Tooltip title="编辑角色">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedRole(role);
                              setShowEditModal(true);
                            }}
                          >
                            <Edit size={20} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="管理权限">
                          <IconButton
                            size="small"
                            onClick={() => openPermissionsModal(role)}
                          >
                            <Key size={20} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除角色">
                          <IconButton
                            size="small"
                            sx={{ color: "error.main" }}
                            onClick={() => handleDeleteRole(role.id)}
                          >
                            <Trash2 size={20} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* 创建角色对话框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>创建新角色</DialogTitle>
        <form onSubmit={handleCreateRole}>
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
            >
              <TextField
                label="角色名称 *"
                required
                value={newRole.name}
                onChange={(e) =>
                  setNewRole({ ...newRole, name: e.target.value })
                }
                placeholder="例如：管理员、普通用户"
                fullWidth
              />
              <TextField
                label="描述"
                multiline
                rows={3}
                value={newRole.description}
                onChange={(e) =>
                  setNewRole({ ...newRole, description: e.target.value })
                }
                placeholder="描述这个角色的用途"
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setShowCreateModal(false);
                setNewRole({ name: "", description: "" });
              }}
            >
              取消
            </Button>
            <Button type="submit" variant="contained">
              创建
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 编辑角色对话框 */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>编辑角色</DialogTitle>
        {selectedRole && (
          <form onSubmit={handleEditRole}>
            <DialogContent>
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
              >
                <TextField
                  label="角色名称 *"
                  required
                  value={selectedRole.name}
                  onChange={(e) =>
                    setSelectedRole({ ...selectedRole, name: e.target.value })
                  }
                  placeholder="例如：管理员、普通用户"
                  fullWidth
                />
                <TextField
                  label="描述"
                  multiline
                  rows={3}
                  value={selectedRole.description || ""}
                  onChange={(e) =>
                    setSelectedRole({
                      ...selectedRole,
                      description: e.target.value,
                    })
                  }
                  placeholder="描述这个角色的用途"
                  fullWidth
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRole(null);
                }}
              >
                取消
              </Button>
              <Button type="submit" variant="contained">
                保存
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>

      {/* 权限管理对话框 */}
      <Dialog
        open={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>角色权限 - {selectedRole?.name}</DialogTitle>
        <DialogContent sx={{ overflow: "auto", maxHeight: "60vh" }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            可选权限
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {allPermissions.map((perm) => {
              const hasPermission = rolePermissions.some(
                (p) => p.id === perm.id,
              );
              return (
                <Box
                  key={perm.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 2,
                    bgcolor: "grey.100",
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography sx={{ fontWeight: 500 }}>
                        {perm.name}
                      </Typography>
                      {hasPermission && (
                        <CheckCircle size={16} color="#2e7d32" />
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.5 }}
                    >
                      {perm.description}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      分类: {perm.category} | 权限码: {perm.code}
                    </Typography>
                  </Box>
                  {hasPermission ? (
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={() =>
                        selectedRole &&
                        handleRemovePermission(selectedRole.id, perm.id)
                      }
                    >
                      移除
                    </Button>
                  ) : (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() =>
                        selectedRole &&
                        handleAddPermission(selectedRole.id, perm.id)
                      }
                    >
                      添加
                    </Button>
                  )}
                </Box>
              );
            })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPermissionsModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoleManagementPage;
