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
  Checkbox,
  IconButton,
  Avatar,
  Stack,
  FormControlLabel,
  Paper,
} from "@mui/material";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronLeft,
  UserPlus,
  UserMinus,
  Loader2,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authApi, type User, type Role } from "../api/iam";
import { useAppStore } from "../store";
import { RoleBadge } from "@/components/PermissionGate";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/DataTable";

import { ModeToggle } from "@/components/ModeToggle";

interface UserManagementPageProps {
  onNavigate?: (page: string) => void;
}

const UserManagementPage: React.FC<UserManagementPageProps> = ({
  onNavigate: _onNavigate,
}) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<Role[]>([]);

  // 批量选择状态
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(),
  );
  const [selectAll, setSelectAll] = useState(false);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // 搜索时重置到第一页
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [currentPage, debouncedSearch]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        authApi.listUsers({
          page: currentPage,
          page_size: pageSize,
          search: debouncedSearch || undefined,
        }),
        authApi.listRoles(),
      ]);

      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data.users || []);
        setTotalUsers(usersRes.data.total || 0);
      }
      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
      }
    } catch (_err: any) {
      const errorMsg =
        _err.response?.data?.message || _err.message || "加载数据失败";
      setError(errorMsg);
      addNotification({ title: "加载失败", message: errorMsg, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // 批量选择处理
  const handleSelectUser = useCallback((userId: string) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map((u) => u.id)));
    }
    setSelectAll(!selectAll);
  }, [selectAll, users]);

  // 批量启用/禁用用户
  const handleBatchUpdateStatus = async (isActive: boolean) => {
    if (selectedUserIds.size === 0) {
      addNotification({
        title: "提示",
        message: "请先选择要操作的用户",
        type: "info",
      });
      return;
    }

    try {
      const res = await authApi.batchUpdateUsers({
        user_ids: Array.from(selectedUserIds),
        is_active: isActive,
      });
      if (res.success) {
        addNotification({
          title: "成功",
          message: `已${isActive ? "启用" : "禁用"} ${selectedUserIds.size} 个用户`,
          type: "success",
        });
        setSelectedUserIds(new Set());
        setSelectAll(false);
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "操作失败",
          type: "error",
        });
      }
    } catch (_err: any) {
      addNotification({
        title: "失败",
        message: _err.message || "操作失败",
        type: "error",
      });
    }
  };

  // 批量删除用户
  const handleBatchDelete = async () => {
    if (selectedUserIds.size === 0) {
      addNotification({
        title: "提示",
        message: "请先选择要删除的用户",
        type: "info",
      });
      return;
    }

    if (
      !confirm(
        `确定要删除选中的 ${selectedUserIds.size} 个用户吗？此操作不可恢复。`,
      )
    ) {
      return;
    }

    try {
      const res = await authApi.batchDeleteUsers({
        user_ids: Array.from(selectedUserIds),
      });
      if (res.success) {
        addNotification({
          title: "成功",
          message: `已删除 ${selectedUserIds.size} 个用户`,
          type: "success",
        });
        setSelectedUserIds(new Set());
        setSelectAll(false);
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除失败",
          type: "error",
        });
      }
    } catch (_err: any) {
      addNotification({
        title: "失败",
        message: _err.message || "删除失败",
        type: "error",
      });
    }
  };

  // 计算总页数
  const totalPages = Math.ceil(totalUsers / pageSize);

  // 分页导航
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    full_name: "",
    role: "普通用户",
  });

  const loadUserRoles = async (userId: string) => {
    try {
      const res = await authApi.getUserRoles(userId);
      if (res.success && res.data) {
        setUserRoles(res.data);
      }
    } catch (_err: any) {
      addNotification({
        title: "加载失败",
        message: "加载用户角色失败",
        type: "error",
      });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authApi.createUser({
        username: newUser.username,
        email: newUser.email,
        password: newUser.password,
        full_name: newUser.full_name,
      });
      if (res.success) {
        addNotification({
          title: "成功",
          message: "用户创建成功",
          type: "success",
        });
        setShowCreateModal(false);
        setNewUser({
          username: "",
          email: "",
          password: "",
          full_name: "",
          role: "普通用户",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "创建用户失败",
          type: "error",
        });
      }
    } catch (_err: any) {
      const errorMsg =
        _err.response?.data?.message || _err.message || "创建用户失败";
      addNotification({ title: "失败", message: errorMsg, type: "error" });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("确定要删除这个用户吗？")) return;
    try {
      const res = await authApi.deleteUser(userId);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "用户删除成功",
          type: "success",
        });
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "删除用户失败",
          type: "error",
        });
      }
    } catch (_err: any) {
      addNotification({
        title: "失败",
        message: _err.message || "删除用户失败",
        type: "error",
      });
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await authApi.updateUser(selectedUser.id, {
        full_name: selectedUser.full_name || undefined,
        email: selectedUser.email,
        is_active: selectedUser.is_active,
      });
      if (res.success) {
        addNotification({
          title: "成功",
          message: "用户更新成功",
          type: "success",
        });
        setShowEditModal(false);
        setSelectedUser(null);
        loadData();
      } else {
        addNotification({
          title: "失败",
          message: res.message || "更新用户失败",
          type: "error",
        });
      }
    } catch (_err: any) {
      addNotification({
        title: "失败",
        message: _err.message || "更新用户失败",
        type: "error",
      });
    }
  };

  const handleAddRoleToUser = async (userId: string, roleId: string) => {
    try {
      const res = await authApi.addUserRole(userId, roleId);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "角色添加成功",
          type: "success",
        });
        await loadUserRoles(userId);
      } else {
        addNotification({
          title: "失败",
          message: res.message || "添加角色失败",
          type: "error",
        });
      }
    } catch (_err: any) {
      addNotification({
        title: "失败",
        message: _err.message || "添加角色失败",
        type: "error",
      });
    }
  };

  const handleRemoveRoleFromUser = async (userId: string, roleId: string) => {
    try {
      const res = await authApi.removeUserRole(userId, roleId);
      if (res.success) {
        addNotification({
          title: "成功",
          message: "角色移除成功",
          type: "success",
        });
        await loadUserRoles(userId);
      } else {
        addNotification({
          title: "失败",
          message: res.message || "移除角色失败",
          type: "error",
        });
      }
    } catch (_err: any) {
      addNotification({
        title: "失败",
        message: _err.message || "移除角色失败",
        type: "error",
      });
    }
  };

  const openRolesModal = async (user: User) => {
    setSelectedUser(user);
    await loadUserRoles(user.id);
    setShowRolesModal(true);
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<
      string,
      | "default"
      | "primary"
      | "secondary"
      | "error"
      | "info"
      | "success"
      | "warning"
    > = {
      管理员: "error",
      普通用户: "info",
      访客: "default",
    };
    return (
      <Chip
        size="small"
        color={colors[role] || "default"}
        label={role || "未知"}
      />
    );
  };

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <Checkbox
            checked={selectAll && users.length > 0}
            onChange={handleSelectAll}
            aria-label="全选"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedUserIds.has(row.original.id)}
            onChange={() => handleSelectUser(row.original.id)}
            aria-label={`选择 ${row.original.username}`}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: "username",
        header: "用户",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar
                sx={{
                  bgcolor: "primary.main",
                  width: 32,
                  height: 32,
                  fontSize: "0.875rem",
                }}
              >
                {user.username.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {user.full_name || user.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
            </Box>
          );
        },
      },
      {
        accessorKey: "role",
        header: "角色",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <RoleBadge role={user.role || "user"} size="sm" />
              {user.roles && user.roles.length > 1 && (
                <Typography variant="caption" color="text.secondary">
                  +{user.roles.length - 1}
                </Typography>
              )}
            </Box>
          );
        },
      },
      {
        accessorKey: "permissions",
        header: "权限",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <Typography variant="body2" color="text.secondary">
              {user.permissions ? user.permissions.length : 0} 个权限
            </Typography>
          );
        },
      },
      {
        accessorKey: "is_active",
        header: "状态",
        cell: ({ row }) => {
          const user = row.original;
          const isActive = user.is_active !== false;
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {isActive ? (
                <CheckCircle size={16} color="#2e7d32" />
              ) : (
                <XCircle size={16} color="#d32f2f" />
              )}
              <Typography variant="body2">
                {isActive ? "活跃" : "禁用"}
              </Typography>
            </Box>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "创建时间",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <Typography variant="body2" color="text.secondary">
              {new Date(user.created_at).toLocaleDateString("zh-CN")}
            </Typography>
          );
        },
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
              <Tooltip title="编辑" arrow>
                <IconButton
                  size="small"
                  onClick={() => {
                    setSelectedUser(user);
                    setShowEditModal(true);
                  }}
                >
                  <Edit size={16} />
                </IconButton>
              </Tooltip>
              <Tooltip title="管理角色" arrow>
                <IconButton size="small" onClick={() => openRolesModal(user)}>
                  <Shield size={16} />
                </IconButton>
              </Tooltip>
              <Tooltip title="删除" arrow>
                <IconButton
                  size="small"
                  sx={{ color: "error.main" }}
                  onClick={() => handleDeleteUser(user.id)}
                >
                  <Trash2 size={16} />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    ],
    [],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      {/* Header */}
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
                  <Users size={28} color="#1976d2" />
                  用户管理
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  管理平台用户账户、角色和权限
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
                创建用户
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: 4 }}>
        {/* Search and Batch Actions */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
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
                placeholder="搜索用户名、邮箱..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ width: "100%", pl: 5 }}
              />
            </Box>
            <Button
              variant="outlined"
              onClick={loadData}
              disabled={loading}
              startIcon={
                <RefreshCw
                  size={16}
                  sx={loading ? { animation: "spin 1s linear infinite" } : {}}
                />
              }
            >
              刷新
            </Button>
          </Box>

          {/* Batch Actions Toolbar */}
          {selectedUserIds.size > 0 && (
            <Paper
              sx={{ p: 2, mb: 2, bgcolor: "primary.light", borderRadius: 2 }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircle size={20} color="#1976d2" />
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, color: "primary.main" }}
                  >
                    已选择 {selectedUserIds.size} 个用户
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleBatchUpdateStatus(true)}
                  >
                    批量启用
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleBatchUpdateStatus(false)}
                  >
                    批量禁用
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    onClick={handleBatchDelete}
                  >
                    批量删除
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      setSelectedUserIds(new Set());
                      setSelectAll(false);
                    }}
                  >
                    取消选择
                  </Button>
                </Box>
              </Box>
            </Paper>
          )}
        </Box>

        {/* Table */}
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <Loader2
                  sx={{
                    width: 32,
                    height: 32,
                    color: "#1976d2",
                    animation: "spin 1s linear infinite",
                    mx: "auto",
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
            ) : (
              <>
                <DataTable
                  columns={columns}
                  data={users}
                  searchPlaceholder="搜索用户名、邮箱..."
                  searchKey="username"
                />

                {/* Pagination */}
                {totalPages > 1 && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      px: 3,
                      py: 2,
                      borderTop: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      显示 {(currentPage - 1) * pageSize + 1} -{" "}
                      {Math.min(currentPage * pageSize, totalUsers)} 共{" "}
                      {totalUsers} 条
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={goToPrevPage}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      <Typography variant="body2" sx={{ px: 1 }}>
                        第 {currentPage} / {totalPages} 页
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight size={16} />
                      </Button>
                    </Box>
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Create User Dialog */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>创建新用户</DialogTitle>
        <form onSubmit={handleCreateUser}>
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, py: 2 }}
            >
              <TextField
                label="用户名 *"
                required
                value={newUser.username}
                onChange={(e) =>
                  setNewUser({ ...newUser, username: e.target.value })
                }
                placeholder="输入用户名"
                fullWidth
              />
              <TextField
                label="邮箱 *"
                type="email"
                required
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                placeholder="输入邮箱"
                fullWidth
              />
              <TextField
                label="密码 *"
                type="password"
                required
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
                placeholder="输入密码"
                fullWidth
              />
              <TextField
                label="姓名"
                value={newUser.full_name}
                onChange={(e) =>
                  setNewUser({ ...newUser, full_name: e.target.value })
                }
                placeholder="输入姓名"
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setShowCreateModal(false);
                setNewUser({
                  username: "",
                  email: "",
                  password: "",
                  full_name: "",
                  role: "普通用户",
                });
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

      {/* Edit User Dialog */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>编辑用户</DialogTitle>
        {selectedUser && (
          <form onSubmit={handleEditUser}>
            <DialogContent>
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: 2, py: 2 }}
              >
                <TextField
                  label="用户名"
                  value={selectedUser.username}
                  disabled
                  fullWidth
                />
                <TextField
                  label="邮箱 *"
                  type="email"
                  required
                  value={selectedUser.email}
                  onChange={(e) =>
                    setSelectedUser({
                      ...selectedUser,
                      email: e.target.value,
                    })
                  }
                  fullWidth
                />
                <TextField
                  label="姓名"
                  value={selectedUser.full_name || ""}
                  onChange={(e) =>
                    setSelectedUser({
                      ...selectedUser,
                      full_name: e.target.value,
                    })
                  }
                  placeholder="输入姓名"
                  fullWidth
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedUser.is_active}
                      onChange={(e) =>
                        setSelectedUser({
                          ...selectedUser,
                          is_active: e.target.checked,
                        })
                      }
                    />
                  }
                  label="启用账户"
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
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

      {/* Roles Management Dialog */}
      <Dialog
        open={showRolesModal}
        onClose={() => setShowRolesModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          用户角色管理 - {selectedUser?.full_name || selectedUser?.username}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              已有角色
            </Typography>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 3 }}
            >
              {userRoles.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  暂无分配角色
                </Typography>
              ) : (
                userRoles.map((role) => (
                  <Box
                    key={role.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 2,
                      bgcolor: "success.light",
                      borderRadius: 2,
                      border: 1,
                      borderColor: "success.main",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Shield size={16} color="#2e7d32" />
                      <Typography
                        sx={{ fontWeight: 500, color: "success.main" }}
                      >
                        {role.name}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      sx={{ color: "error.main" }}
                      onClick={() =>
                        selectedUser &&
                        handleRemoveRoleFromUser(selectedUser.id, role.id)
                      }
                      title="移除角色"
                    >
                      <UserMinus size={16} />
                    </IconButton>
                  </Box>
                ))
              )}
            </Box>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              可用角色
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {roles
                .filter((r) => !userRoles.some((ur) => ur.id === r.id))
                .map((role) => (
                  <Box
                    key={role.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 2,
                      bgcolor: "grey.100",
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Shield size={16} color="#9e9e9e" />
                      <Box>
                        <Typography sx={{ fontWeight: 500 }}>
                          {role.name}
                        </Typography>
                        {role.description && (
                          <Typography variant="caption" color="text.secondary">
                            - {role.description}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() =>
                        selectedUser &&
                        handleAddRoleToUser(selectedUser.id, role.id)
                      }
                      title="添加角色"
                    >
                      <UserPlus size={16} />
                    </IconButton>
                  </Box>
                ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setShowRolesModal(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Tooltip component for actions
function Tooltip({
  title,
  children,
  arrow,
}: {
  title: string;
  children: React.ReactNode;
  arrow?: boolean;
}) {
  return (
    <Box sx={{ position: "relative", display: "inline-flex" }}>
      {children}
      <Box
        sx={{
          position: "absolute",
          bgcolor: "rgba(0,0,0,0.8)",
          color: "white",
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontSize: "0.75rem",
          whiteSpace: "nowrap",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          mt: 0.5,
          opacity: 0,
          visibility: "hidden",
          "&:hover": { opacity: 1, visibility: "visible" },
          ...(arrow
            ? {
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: -4,
                  left: "50%",
                  transform: "translateX(-50%)",
                  borderWidth: "0 4px 4px 4px",
                  borderStyle: "solid",
                  borderColor:
                    "transparent transparent rgba(0,0,0,0.8) transparent",
                },
              }
            : {}),
        }}
      >
        {title}
      </Box>
    </Box>
  );
}

export default UserManagementPage;
