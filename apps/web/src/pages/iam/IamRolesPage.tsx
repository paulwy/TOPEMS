/**
 * IAM 角色管理页面 - V4.0 标准化改造样板
 *
 * 改造要点：
 * 1. PageContainer 使用 autoTitle + autoBreadcrumbs 自动从路由/导航获取标题和面包屑
 * 2. 使用 ConfirmDialog 替代原生 confirm() 确认删除操作
 * 3. 使用 useCallback 优化事件处理函数
 * 4. 统一的样式和交互规范
 *
 * @module pages/iam
 * @path /iam/roles
 */

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Typography,
  Button,
  Stack,
  Chip,
} from '@mui/material';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  Edit,
  Key,
  CheckCircle,
  UserCheck,
} from 'lucide-react';

import { authApi, type Role, type Permission } from '@/api/iam';
import { SERVICES } from '@/utils/apiPath';
import { useAppStore } from '../../store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';

/**
 * IAM 角色管理页面组件
 *
 * V4.0 规范：
 * - 使用 PageContainer 的 autoTitle 自动从路由获取标题
 * - 使用 ConfirmDialog 替代原生 confirm()
 * - 使用 useCallback 优化性能
 * - 返回按钮指向 /iam/dashboard（模块首页）
 */
export const IamRolesPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);

  // 确认对话框状态
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  // 表单状态
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
  });

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  /**
   * 加载角色列表和权限列表
   * V4.0 规范：使用 SERVICES 统一 API 路径格式
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // V4.0 规范：使用 SERVICES 格式的 API 路径
      const apiPath = SERVICES.iam.list('roles');
      console.debug('[IAM] Fetching roles:', apiPath);

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
    } catch (_err: unknown) {
      const errorMsg = extractErrorMessage(_err, '加载数据失败');
      setError(errorMsg);
      addNotification({
        title: '加载失败',
        message: errorMsg,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  /**
   * 加载角色的权限列表
   */
  const loadRolePermissions = useCallback(async (roleId: string) => {
    try {
      const res = await authApi.getRolePermissions(roleId);
      if (res.success && res.data) {
        setRolePermissions(res.data);
      }
    } catch {
      addNotification({
        title: '加载失败',
        message: '加载角色权限失败',
        type: 'error',
      });
    }
  }, [addNotification]);

  /**
   * 创建角色
   */
  const handleCreateRole = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const res = await authApi.createRole(newRole);
        if (res.success) {
          addNotification({
            title: '成功',
            message: '角色创建成功',
            type: 'success',
          });
          setShowCreateModal(false);
          setNewRole({ name: '', description: '' });
          loadData();
        } else {
          addNotification({
            title: '失败',
            message: res.message || '创建角色失败',
            type: 'error',
          });
        }
      } catch (_err: unknown) {
        addNotification({
          title: '失败',
          message: extractErrorMessage(_err, '创建角色失败'),
          type: 'error',
        });
      }
    },
    [newRole, addNotification, loadData]
  );

  /**
   * 编辑角色
   */
  const handleEditRole = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedRole) return;
      try {
        const res = await authApi.updateRole(selectedRole.id, {
          name: selectedRole.name,
          description: selectedRole.description,
        });
        if (res.success) {
          addNotification({
            title: '成功',
            message: '角色更新成功',
            type: 'success',
          });
          setShowEditModal(false);
          setSelectedRole(null);
          loadData();
        } else {
          addNotification({
            title: '失败',
            message: res.message || '更新角色失败',
            type: 'error',
          });
        }
      } catch (_err: unknown) {
        addNotification({
          title: '失败',
          message: extractErrorMessage(_err, '更新角色失败'),
          type: 'error',
        });
      }
    },
    [selectedRole, addNotification, loadData]
  );

  /**
   * 删除角色
   * V4.0 规范：使用 ConfirmDialog 替代原生 confirm()
   */
  const handleDeleteRole = useCallback(
    (roleId: string) => {
      openConfirmDialog({
        title: '确认删除',
        message: '确定要删除这个角色吗？删除后无法恢复。',
        danger: true,
        onConfirm: async () => {
          try {
            const res = await authApi.deleteRole(roleId);
            if (res.success) {
              addNotification({
                title: '成功',
                message: '角色删除成功',
                type: 'success',
              });
              loadData();
            } else {
              addNotification({
                title: '失败',
                message: res.message || '删除角色失败',
                type: 'error',
              });
            }
          } catch (_err: unknown) {
            addNotification({
              title: '失败',
              message: extractErrorMessage(_err, '删除角色失败'),
              type: 'error',
            });
          }
        },
      });
    },
    [addNotification, loadData]
  );

  /**
   * 添加权限
   */
  const handleAddPermission = useCallback(
    async (roleId: string, permissionId: string) => {
      try {
        const res = await authApi.addRolePermission(roleId, permissionId);
        if (res.success) {
          addNotification({
            title: '成功',
            message: '权限添加成功',
            type: 'success',
          });
          loadRolePermissions(roleId);
        } else {
          addNotification({
            title: '失败',
            message: res.message || '添加权限失败',
            type: 'error',
          });
        }
      } catch {
        addNotification({
          title: '失败',
          message: extractErrorMessage(undefined, '添加权限失败'),
          type: 'error',
        });
      }
    },
    [addNotification, loadRolePermissions]
  );

  /**
   * 移除权限
   */
  const handleRemovePermission = useCallback(
    async (roleId: string, permissionId: string) => {
      try {
        const res = await authApi.removeRolePermission(roleId, permissionId);
        if (res.success) {
          addNotification({
            title: '成功',
            message: '权限移除成功',
            type: 'success',
          });
          loadRolePermissions(roleId);
        } else {
          addNotification({
            title: '失败',
            message: res.message || '移除权限失败',
            type: 'error',
          });
        }
      } catch {
        addNotification({
          title: '失败',
          message: extractErrorMessage(undefined, '移除权限失败'),
          type: 'error',
        });
      }
    },
    [addNotification, loadRolePermissions]
  );

  /**
   * 打开权限管理弹窗
   */
  const openPermissionsModal = useCallback(
    async (role: Role) => {
      setSelectedRole(role);
      await loadRolePermissions(role.id);
      setShowPermissionsModal(true);
    },
    [loadRolePermissions]
  );

  /**
   * 打开确认对话框
   * V4.0 规范：统一的确认对话框处理
   */
  const openConfirmDialog = useCallback(
    (config: { title: string; message: string; onConfirm: () => void; danger?: boolean }) => {
      setConfirmDialogConfig(config);
      setConfirmDialogOpen(true);
    },
    []
  );

  // 表格列定义
  // V4.0 规范：统一的列配置
  const columns: ColumnDef<Role>[] = useMemo(
    () => [
      {
        id: 'name',
        label: '角色名称',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                bgcolor: 'primary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={20} color='primary.main' />
            </Box>
            <Box>
              <Typography variant='body2' sx={{ fontWeight: 500 }}>
                {row.name}
              </Typography>
              {row.description && (
                <Typography variant='caption' color='text.secondary'>
                  {row.description}
                </Typography>
              )}
            </Box>
          </Box>
        ),
      },
      {
        id: 'created_at',
        label: '创建时间',
        render: (row) => (
          <Typography variant='body2' color='text.secondary'>
            {row.created_at
              ? new Date(row.created_at).toLocaleString('zh-CN')
              : '-'}
          </Typography>
        ),
      },
    ],
    []
  );

  // 行操作按钮
  // V4.0 规范：统一的操作按钮配置
  const rowActions = useMemo(
    () => [
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (row: Role) => {
          setSelectedRole(row);
          setShowEditModal(true);
        },
      },
      {
        label: '管理权限',
        icon: <Key size={16} />,
        onClick: (row: Role) => openPermissionsModal(row),
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error' as const,
        onClick: (row: Role) => handleDeleteRole(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个角色吗？删除后无法恢复。',
      },
    ],
    [openPermissionsModal, handleDeleteRole]
  );

  // 过滤后的角色列表
  const filteredRoles = useMemo(() => {
    if (!searchQuery) return roles;
    const query = searchQuery.toLowerCase();
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(query) ||
        role.description?.toLowerCase().includes(query)
    );
  }, [roles, searchQuery]);

  return (
    <PageContainer
      // V4.0: 使用 autoTitle 自动从路由/导航获取标题
      // title='角色管理' // 可以省略
      headerProps={{
        pageIcon: <UserCheck size={20} />,
      }}
      // V4.0: 返回按钮指向模块首页
      backButton={{
        href: '/iam/dashboard',
      }}
    >
      {/*
       * V4.0 规范：ListPageTemplate 完整配置
       */}
      <ListPageTemplate
        columns={columns}
        data={filteredRoles}
        loading={loading}
        error={error}
        rowActions={rowActions}
        searchable
        searchPlaceholder='搜索角色名称或描述...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        actions={[
          {
            label: '创建角色',
            icon: <Plus size={20} />,
            onClick: () => setShowCreateModal(true),
          },
        ]}
        onRefresh={loadData}
      />

      {/* 创建角色对话框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>创建新角色</DialogTitle>
        <form onSubmit={handleCreateRole}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label='角色名称 *'
                required
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                placeholder='例如：管理员，普通用户'
                fullWidth
              />
              <TextField
                label='描述'
                multiline
                rows={3}
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                placeholder='描述这个角色的用途'
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setShowCreateModal(false);
                setNewRole({ name: '', description: '' });
              }}
            >
              取消
            </Button>
            <Button type='submit' variant='contained'>
              创建
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 编辑角色对话框 */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>编辑角色</DialogTitle>
        {selectedRole && (
          <form onSubmit={handleEditRole}>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField
                  label='角色名称 *'
                  required
                  value={selectedRole.name}
                  onChange={(e) =>
                    setSelectedRole({ ...selectedRole, name: e.target.value })
                  }
                  placeholder='例如：管理员，普通用户'
                  fullWidth
                />
                <TextField
                  label='描述'
                  multiline
                  rows={3}
                  value={selectedRole.description || ''}
                  onChange={(e) =>
                    setSelectedRole({
                      ...selectedRole,
                      description: e.target.value,
                    })
                  }
                  placeholder='描述这个角色的用途'
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
              <Button type='submit' variant='contained'>
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
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>角色权限 - {selectedRole?.name}</DialogTitle>
        <DialogContent sx={{ overflow: 'auto', maxHeight: '60vh' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {allPermissions.map((perm) => {
              const hasPermission = rolePermissions.some((p) => p.id === perm.id);
              return (
                <Box
                  key={perm.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    bgcolor: hasPermission ? 'success.light' : 'grey.100',
                    borderRadius: 2,
                    border: 1,
                    borderColor: hasPermission ? 'success.main' : 'divider',
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 500 }}>{perm.name}</Typography>
                      {hasPermission && <CheckCircle size={16} color='success.dark' />}
                    </Box>
                    <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                      {perm.description}
                    </Typography>
                    <Stack direction='row' spacing={1} sx={{ mt: 1 }}>
                      <Chip
                        label={perm.category}
                        size='small'
                        variant='outlined'
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                      <Typography
                        variant='caption'
                        color='text.disabled'
                        sx={{ lineHeight: '20px' }}
                      >
                        {perm.code}
                      </Typography>
                    </Stack>
                  </Box>
                  {hasPermission ? (
                    <Button
                      variant='outlined'
                      size='small'
                      color='error'
                      onClick={() =>
                        selectedRole && handleRemovePermission(selectedRole.id, perm.id)
                      }
                    >
                      移除
                    </Button>
                  ) : (
                    <Button
                      variant='outlined'
                      size='small'
                      onClick={() =>
                        selectedRole && handleAddPermission(selectedRole.id, perm.id)
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

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogOpen(false);
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

export default IamRolesPage;
