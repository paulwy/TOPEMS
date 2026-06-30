/**
 * IAM 权限管理页面 - V4.0 标准化改造样板
 *
 * 改造要点：
 * 1. 使用 TreePageTemplate 按分类展示权限层次结构
 * 2. 使用 PageContainer 的 autoTitle + autoBreadcrumbs 自动从路由/导航获取标题和面包屑
 * 3. 使用 ConfirmDialog 替代原生 confirm() 确认删除操作
 * 4. 使用 useCallback 优化事件处理函数
 * 5. 统一的样式和交互规范
 *
 * @module pages/iam
 * @path /iam/permissions
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  Edit,
  Key,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { authApi, type Permission } from '@/api/iam';
import { useAppStore } from '../../store';
import {
  TreePageTemplate,
  type TreeNode,
  type TreeAction,
} from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';

/**
 * 权限分类配置
 */
const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  doc: { label: '文档', color: '#2196F3', icon: 'FileText' },
  ai: { label: 'AI', color: '#9C27B0', icon: 'Brain' },
  workflow: { label: '流程', color: '#4CAF50', icon: 'GitBranch' },
  iam: { label: 'IAM', color: '#FF9800', icon: 'Shield' },
  rs: { label: '研发', color: '#FF5722', icon: 'Code' },
  lims: { label: 'LIMS', color: '#00BCD4', icon: 'TestTube' },
  qms: { label: '质量', color: '#009688', icon: 'CheckCircle' },
  ehs: { label: 'EHS', color: '#F44336', icon: 'Safety' },
  srm: { label: '采购', color: '#8E24AA', icon: 'ShoppingCart' },
  pdm: { label: '产品', color: '#FFB300', icon: 'Package' },
  gis: { label: 'GIS', color: '#43A047', icon: 'Map' },
  im: { label: '即时通讯', color: '#E91E63', icon: 'MessageCircle' },
  mail: { label: '邮件', color: '#3F51B5', icon: 'Mail' },
  system: { label: '系统', color: '#607D8B', icon: 'Settings' },
  crm: { label: 'CRM', color: '#E91E63', icon: 'Users' },
  pm: { label: '项目', color: '#8BC34A', icon: 'Folder' },
  integration: { label: '集成', color: '#03A9F4', icon: 'Link' },
};

/**
 * IAM 权限管理页面组件
 *
 * V4.0 规范：
 * - 使用 TreePageTemplate 展示分类树形结构
 * - 使用 PageContainer 的 autoTitle 自动从路由获取标题
 * - 使用 ConfirmDialog 替代原生 confirm()
 * - 使用 useCallback 优化性能
 * - 返回按钮指向 /iam/dashboard（模块首页）
 */
export const IamPermissionsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  // 数据状态
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // 选中节点
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  // 弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);

  // 确认对话框状态
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  // 表单状态
  const [newPermission, setNewPermission] = useState({
    name: '',
    code: '',
    category: 'iam',
    description: '',
  });

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  /**
   * 加载权限列表
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.listPermissions();
      if (res.success && res.data) {
        setPermissions(res.data);
      }
    } catch (_err: unknown) {
      const errorMsg = extractErrorMessage(_err, '加载权限失败');
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
   * 将权限列表转换为树形结构
   * - 按 category 分组
   * - 分类作为父节点
   * - 权限作为子节点
   */
  const treeData = useMemo((): TreeNode[] => {
    // 按分类分组
    const groupedByCategory = permissions.reduce((acc, perm) => {
      const category = perm.category || 'system';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);

    // 转换为树节点
    return Object.entries(groupedByCategory)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, perms]) => {
        const config = CATEGORY_CONFIG[category] || {
          label: category,
          color: '#607D8B',
          icon: 'Settings',
        };

        return {
          id: `category-${category}`,
          name: config.label,
          type: 'folder' as const,
          accentColor: config.color,
          icon: (
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: `${config.color}20`,
              }}
            >
              <Shield sx={{ width: 16, height: 16, color: config.color }} />
            </Box>
          ),
          children: perms.map((perm) => ({
            id: perm.id,
            name: perm.name,
            type: 'item' as const,
            data: perm,
            accentColor: config.color,
            icon: (
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.100',
                }}
              >
                <Key sx={{ width: 16, height: 16, color: 'grey.600' }} />
              </Box>
            ),
          })),
        };
      });
  }, [permissions]);

  /**
   * 筛选后的树数据
   */
  const filteredTreeData = useMemo((): TreeNode[] => {
    let result = treeData;

    // 按分类筛选
    if (categoryFilter !== 'all') {
      result = result.filter((node) => node.id === `category-${categoryFilter}`);
    }

    // 按搜索关键词筛选
    if (searchQuery.trim()) {
      const search = searchQuery.toLowerCase();
      result = result
        .map((node) => {
          const matchingChildren = node.children?.filter(
            (child) =>
              child.name.toLowerCase().includes(search) ||
              (child.data as Permission)?.code?.toLowerCase().includes(search) ||
              (child.data as Permission)?.description?.toLowerCase().includes(search)
          );
          if (matchingChildren && matchingChildren.length > 0) {
            return { ...node, children: matchingChildren };
          }
          // 父节点匹配也保留
          if (node.name.toLowerCase().includes(search)) {
            return node;
          }
          return null;
        })
        .filter((n): n is TreeNode => n !== null);
    }

    return result;
  }, [treeData, searchQuery, categoryFilter]);

  /**
   * 统计数据
   */
  const stats = useMemo(() => {
    const total = permissions.length;
    const categories = Object.keys(groupPermissionsByCategory()).length;

    return [
      { id: 'total', title: '权限总数', value: total, icon: <Key size={20} />, color: 'primary' as const },
      { id: 'categories', title: '分类数量', value: categories, icon: <Shield size={20} />, color: 'success' as const },
    ];
  }, [permissions]);

  /**
   * 按分类分组权限
   */
  const groupPermissionsByCategory = useCallback(() => {
    return permissions.reduce((acc, perm) => {
      const category = perm.category || 'system';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(perm);
      return acc;
    }, {} as Record<string, Permission[]>);
  }, [permissions]);

  /**
   * 创建权限
   */
  const handleCreatePermission = useCallback(
    async (e: React.FormEvent) => {
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
            title: '成功',
            message: '权限创建成功',
            type: 'success',
          });
          setShowCreateModal(false);
          setNewPermission({ name: '', code: '', category: 'iam', description: '' });
          loadData();
        } else {
          addNotification({
            title: '失败',
            message: res.message || '创建权限失败',
            type: 'error',
          });
        }
      } catch (_err: unknown) {
        addNotification({
          title: '失败',
          message: extractErrorMessage(_err, '创建权限失败'),
          type: 'error',
        });
      }
    },
    [newPermission, addNotification, loadData]
  );

  /**
   * 编辑权限
   */
  const handleUpdatePermission = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedPermission) return;

      try {
        const res = await authApi.updatePermission(selectedPermission.id, {
          name: selectedPermission.name,
          description: selectedPermission.description,
        });

        if (res.success) {
          addNotification({
            title: '成功',
            message: '权限更新成功',
            type: 'success',
          });
          setShowEditModal(false);
          setSelectedPermission(null);
          loadData();
        } else {
          addNotification({
            title: '失败',
            message: res.message || '更新权限失败',
            type: 'error',
          });
        }
      } catch (_err: unknown) {
        addNotification({
          title: '失败',
          message: extractErrorMessage(_err, '更新权限失败'),
          type: 'error',
        });
      }
    },
    [selectedPermission, addNotification, loadData]
  );

  /**
   * 删除权限
   * V4.0 规范：使用 ConfirmDialog 替代原生 confirm()
   */
  const handleDeletePermission = useCallback(
    (permissionId: string) => {
      const permission = permissions.find((p) => p.id === permissionId);
      openConfirmDialog({
        title: '确认删除',
        message: `确定要删除权限"${permission?.name || ''}"吗？删除后相关角色的权限也会被移除。`,
        danger: true,
        onConfirm: async () => {
          try {
            const res = await authApi.deletePermission(permissionId);
            if (res.success) {
              addNotification({
                title: '成功',
                message: '权限删除成功',
                type: 'success',
              });
              setSelectedNode(null);
              loadData();
            } else {
              addNotification({
                title: '失败',
                message: res.message || '删除权限失败',
                type: 'error',
              });
            }
          } catch (_err: unknown) {
            addNotification({
              title: '失败',
              message: extractErrorMessage(_err, '删除权限失败'),
              type: 'error',
            });
          }
        },
      });
    },
    [permissions, addNotification, loadData]
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

  /**
   * 树节点选择处理
   */
  const handleSelectNode = useCallback((node: TreeNode | null) => {
    setSelectedNode(node);
  }, []);

  /**
   * 行操作按钮
   */
  const rowActions = useMemo((): TreeAction[] => {
    if (!selectedNode || selectedNode.type === 'folder') {
      return [];
    }

    const permission = selectedNode.data as Permission;

    return [
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: () => {
          setSelectedPermission(permission);
          setShowEditModal(true);
        },
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: () => handleDeletePermission(permission.id),
        divider: true,
      },
    ];
  }, [selectedNode, handleDeletePermission]);

  /**
   * 详情面板渲染
   */
  const detailPanel = useCallback(
    (node: TreeNode | null) => {
      if (!node || node.type === 'folder') {
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <AlertCircle sx={{ width: 48, height: 48, color: 'text.disabled', mb: 2 }} />
            <Typography color='text.secondary'>
              选择一个权限查看详情
            </Typography>
          </Box>
        );
      }

      const permission = node.data as Permission;
      const categoryConfig = CATEGORY_CONFIG[permission.category] || {
        label: permission.category,
        color: '#607D8B',
      };

      return (
        <Stack spacing={3}>
          {/* 基本信息 */}
          <Box>
            <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1.5 }}>
              基本信息
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1.5,
                    bgcolor: `${categoryConfig.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Shield sx={{ width: 24, height: 24, color: categoryConfig.color }} />
                </Box>
                <Box>
                  <Typography variant='h6' sx={{ fontWeight: 600 }}>
                    {permission.name}
                  </Typography>
                  <Chip
                    label={categoryConfig.label}
                    size='small'
                    sx={{
                      bgcolor: `${categoryConfig.color}20`,
                      color: categoryConfig.color,
                      fontWeight: 500,
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>

          {/* 权限码 */}
          <Box>
            <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1 }}>
              权限码
            </Typography>
            <Box
              sx={{
                p: 1.5,
                bgcolor: 'grey.100',
                borderRadius: 1,
                fontFamily: 'monospace',
              }}
            >
              <Typography variant='body2' sx={{ fontFamily: 'inherit' }}>
                {permission.code}
              </Typography>
            </Box>
          </Box>

          {/* 描述 */}
          <Box>
            <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1 }}>
              描述
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {permission.description || '暂无描述'}
            </Typography>
          </Box>

          {/* 分类信息 */}
          <Box>
            <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 1 }}>
              所属分类
            </Typography>
            <Typography variant='body2'>
              {categoryConfig.label} ({permission.category})
            </Typography>
          </Box>
        </Stack>
      );
    },
    []
  );

  /**
   * 筛选选项
   */
  const filterOptions = useMemo(() => {
    const categories = Object.keys(groupPermissionsByCategory());
    return [
      { label: '全部分类', value: 'all' },
      ...categories.map((cat) => ({
        label: CATEGORY_CONFIG[cat]?.label || cat,
        value: cat,
      })),
    ];
  }, [groupPermissionsByCategory]);

  /**
   * 新增按钮点击
   */
  const handleAdd = useCallback(() => {
    setNewPermission({ name: '', code: '', category: 'iam', description: '' });
    setShowCreateModal(true);
  }, []);

  return (
    <PageContainer
      // V4.0: 使用 autoTitle 自动从路由/导航获取标题
      // title='权限管理' // 可以省略
      headerProps={{
        pageIcon: <Key size={20} />,
        // V4.0: 返回按钮指向模块首页
        backButton: {
          href: '/iam/dashboard',
        },
      }}
    >
      {/*
       * V4.0 规范：TreePageTemplate 完整配置
       */}
      <TreePageTemplate
        title=''
        subtitle=''
        stats={stats}
        data={filteredTreeData}
        loading={loading}
        searchPlaceholder='搜索权限名称、权限码或描述...'
        filterOptions={filterOptions}
        filterValue={categoryFilter}
        onFilterChange={setCategoryFilter}
        onSearch={setSearchQuery}
        onSelect={handleSelectNode}
        selectedId={selectedNode?.id}
        detailPanel={detailPanel}
        detailPanelTitle={selectedNode?.type === 'item' ? '权限详情' : undefined}
        rowActions={rowActions}
        onAdd={handleAdd}
        addButtonText='创建权限'
        addButtonIcon={<Plus size={18} />}
        onRefresh={loadData}
        showFilter={true}
        showAddButton={true}
        showRefresh={true}
        emptyState={{
          emoji: '🔐',
          title: '暂无权限',
          description: '点击"创建权限"按钮添加新的权限',
          actionLabel: '创建权限',
          onAction: handleAdd,
        }}
      />

      {/* 创建权限对话框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>创建新权限</DialogTitle>
        <form onSubmit={handleCreatePermission}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label='权限名称 *'
                required
                value={newPermission.name}
                onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
                placeholder='例如：用户查看'
                fullWidth
              />
              <TextField
                label='权限码 *'
                required
                value={newPermission.code}
                onChange={(e) => setNewPermission({ ...newPermission, code: e.target.value })}
                placeholder='例如：iam:user:read'
                fullWidth
                helperText='权限码格式：模块:资源:操作'
              />
              <FormControl fullWidth>
                <InputLabel>分类 *</InputLabel>
                <Select
                  value={newPermission.category}
                  label='分类 *'
                  onChange={(e) =>
                    setNewPermission({ ...newPermission, category: e.target.value })
                  }
                >
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <MenuItem key={key} value={key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Shield sx={{ width: 16, height: 16, color: config.color }} />
                        {config.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label='描述'
                multiline
                rows={3}
                value={newPermission.description}
                onChange={(e) =>
                  setNewPermission({ ...newPermission, description: e.target.value })
                }
                placeholder='描述这个权限的用途'
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setShowCreateModal(false);
                setNewPermission({ name: '', code: '', category: 'iam', description: '' });
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

      {/* 编辑权限对话框 */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>编辑权限</DialogTitle>
        {selectedPermission && (
          <form onSubmit={handleUpdatePermission}>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                <TextField
                  label='权限名称 *'
                  required
                  value={selectedPermission.name}
                  onChange={(e) =>
                    setSelectedPermission({ ...selectedPermission, name: e.target.value })
                  }
                  fullWidth
                />
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant='caption' color='text.secondary'>
                    权限码
                  </Typography>
                  <Typography variant='body2' sx={{ fontFamily: 'monospace' }}>
                    {selectedPermission.code}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                  }}
                >
                  <Typography variant='caption' color='text.secondary'>
                    分类
                  </Typography>
                  <Typography variant='body2'>
                    {CATEGORY_CONFIG[selectedPermission.category]?.label ||
                      selectedPermission.category}
                  </Typography>
                </Box>
                <TextField
                  label='描述'
                  multiline
                  rows={3}
                  value={selectedPermission.description || ''}
                  onChange={(e) =>
                    setSelectedPermission({
                      ...selectedPermission,
                      description: e.target.value,
                    })
                  }
                  placeholder='描述这个权限的用途'
                  fullWidth
                />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedPermission(null);
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

export default IamPermissionsPage;
