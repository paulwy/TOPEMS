import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Box,
  Typography,
  TextField,
  Chip,
  Tooltip,
  IconButton,
  Button,
} from '@mui/material';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Key, Plus, Trash2, ChevronLeft, Shield, AlertCircle, RefreshCw, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authApi, type Permission } from '@/api/iam';
import { useAppStore } from '../../store';
import { ModeToggle } from '@/components/theme/ModeToggle';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { extractErrorMessage } from '@/utils/errors';
import { PageContainer } from '@/components/common';

interface PermissionManagementPageProps {
  onNavigate?: (page: string) => void;
}

const categoryLabels: Record<string, string> = {
  doc: '文档',
  ai: 'AI',
  workflow: '流程',
  iam: 'IAM',
  rs: '研发',
  lims: 'LIMS',
  qms: '质量',
  ehs: 'EHS',
  srm: '采购',
  pdm: '产品',
  gis: 'GIS',
  im: '即时通讯',
  mail: '邮件',
  system: '系统',
  crm: 'CRM',
  pm: '项目',
  integration: '集成',
};

const PermissionManagementPage: React.FC<PermissionManagementPageProps> = ({
  onNavigate: _onNavigate,
}) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);

  const [newPermission, setNewPermission] = useState({
    name: '',
    code: '',
    category: '',
    description: '',
  });

  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const loadPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.listPermissions();
      if (res.success && res.data) {
        setPermissions(res.data);
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err, '加载权限失败'));
      addNotification({
        title: '失败',
        message: '加载权限失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

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
          title: '成功',
          message: '权限创建成功',
          type: 'success',
        });
        setShowCreateModal(false);
        setNewPermission({ name: '', code: '', category: '', description: '' });
        loadPermissions();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '创建权限失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '创建权限失败'),
        type: 'error',
      });
    }
  };

  const handleUpdatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPermission) return;
    try {
      const res = await authApi.updatePermission(editingPermission.id, {
        name: editingPermission.name,
        description: editingPermission.description,
      });

      if (res.success) {
        addNotification({
          title: '成功',
          message: '权限更新成功',
          type: 'success',
        });
        setEditingPermission(null);
        loadPermissions();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '更新权限失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '更新权限失败'),
        type: 'error',
      });
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    if (!confirm('确定要删除这个权限吗？删除后相关角色的权限也会被移除。')) return;

    try {
      const res = await authApi.deletePermission(permissionId);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '权限删除成功',
          type: 'success',
        });
        loadPermissions();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '删除权限失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '失败',
        message: extractErrorMessage(err, '删除权限失败'),
        type: 'error',
      });
    }
  };

  // 过滤后的数据
  const filteredPermissions = useMemo(() => {
    return permissions.filter(
      (perm) =>
        perm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        perm.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        perm.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        perm.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [permissions, searchQuery]);

  // 分页数据
  const paginatedPermissions = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredPermissions.slice(start, end);
  }, [filteredPermissions, page, pageSize]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const getCategoryBadge = (category: string) => {
    const badges: Record<string, { bgcolor: string; color: string; label: string }> = {
      doc: {
        bgcolor: 'blue.100',
        color: 'blue.700',
        label: categoryLabels.doc || '文档',
      },
      ai: {
        bgcolor: 'purple.100',
        color: 'purple.700',
        label: categoryLabels.ai || 'AI',
      },
      workflow: {
        bgcolor: 'green.100',
        color: 'green.700',
        label: categoryLabels.workflow || '流程',
      },
      iam: {
        bgcolor: 'yellow.100',
        color: 'yellow.700',
        label: categoryLabels.iam || 'IAM',
      },
      rs: {
        bgcolor: 'orange.100',
        color: 'orange.700',
        label: categoryLabels.rs || '研发',
      },
      lims: {
        bgcolor: 'cyan.100',
        color: 'cyan.700',
        label: categoryLabels.lims || 'LIMS',
      },
      qms: {
        bgcolor: 'teal.100',
        color: 'teal.700',
        label: categoryLabels.qms || '质量',
      },
      ehs: {
        bgcolor: 'red.100',
        color: 'red.700',
        label: categoryLabels.ehs || 'EHS',
      },
      srm: {
        bgcolor: 'violet.100',
        color: 'violet.700',
        label: categoryLabels.srm || '采购',
      },
      pdm: {
        bgcolor: 'amber.100',
        color: 'amber.700',
        label: categoryLabels.pdm || '产品',
      },
      gis: {
        bgcolor: 'emerald.100',
        color: 'emerald.700',
        label: categoryLabels.gis || 'GIS',
      },
      im: {
        bgcolor: 'rose.100',
        color: 'rose.700',
        label: categoryLabels.im || '即时通讯',
      },
      mail: {
        bgcolor: 'indigo.100',
        color: 'indigo.700',
        label: categoryLabels.mail || '邮件',
      },
      system: {
        bgcolor: 'gray.100',
        color: 'gray.700',
        label: categoryLabels.system || '系统',
      },
      crm: {
        bgcolor: 'pink.100',
        color: 'pink.700',
        label: categoryLabels.crm || 'CRM',
      },
      pm: {
        bgcolor: 'lime.100',
        color: 'lime.700',
        label: categoryLabels.pm || '项目',
      },
      integration: {
        bgcolor: 'sky.100',
        color: 'sky.700',
        label: categoryLabels.integration || '集成',
      },
    };
    const config = badges[category] || {
      bgcolor: 'gray.100',
      color: 'gray.700',
      label: category,
    };
    return (
      <Chip
        size='small'
        sx={{ bgcolor: config.bgcolor, color: config.color }}
        label={config.label}
      />
    );
  };

  // 列定义
  const columns: ColumnDef<Permission>[] = useMemo(
    () => [
      {
        id: 'name',
        label: '权限名称',
        sortable: true,
        render: (perm) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'purple.100',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Shield sx={{ width: 18, height: 18, color: 'purple.600' }} />
            </Box>
            <Box>
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                {perm.name}
              </Typography>
              {perm.description && (
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {perm.description}
                </Typography>
              )}
            </Box>
          </Box>
        ),
      },
      {
        id: 'code',
        label: '权限码',
        sortable: true,
        render: (perm) => (
          <Typography
            variant='body2'
            sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
          >
            {perm.code}
          </Typography>
        ),
      },
      {
        id: 'category',
        label: '分类',
        sortable: true,
        render: (perm) => getCategoryBadge(perm.category),
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
        render: (perm) => (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              justifyContent: 'flex-end',
            }}
          >
            <Tooltip title='编辑'>
              <IconButton
                size='small'
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingPermission(perm);
                }}
              >
                <Edit sx={{ width: 16, height: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title='删除'>
              <IconButton
                size='small'
                sx={{
                  color: 'error.main',
                  '&:hover': { color: 'error.dark' },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePermission(perm.id);
                }}
              >
                <Trash2 sx={{ width: 16, height: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // 筛选器定义
  const filters = useMemo(
    () => [
      {
        id: 'category',
        label: '分类',
        type: 'select' as const,
        options: Object.entries(categoryLabels).map(([value, label]) => ({
          label,
          value,
        })),
      },
    ],
    []
  );

  return (
    <PageContainer
      title='权限管理'
      subtitle='查看和管理系统权限配置'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '系统管理' }, { label: '权限管理' }]}
        backButton={{
          href: '/dashboard',
          onClick: () => navigate('/dashboard'),
        }}
        columns={columns}
        data={paginatedPermissions}
        loading={loading}
        error={error || undefined}
        pagination={{
          page,
          pageSize,
          total: filteredPermissions.length,
          onPageChange: handlePageChange,
        }}
        searchable
        searchPlaceholder='搜索权限名称、权限码或描述...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        actions={[
          {
            label: '创建权限',
            icon: <Plus size={16} />,
            onClick: () => setShowCreateModal(true),
            variant: 'contained',
          },
        ]}
        rowActions={[]}
        onRefresh={loadPermissions}
        emptyMessage='暂无权限'
        headerContent={
          <Box
            sx={{
              bgcolor: 'blue.50',
              border: 1,
              borderColor: 'blue.200',
              borderRadius: 1,
              p: 2,
            }}
          >
            <Stack
              direction='row'
              spacing={1}
              sx={{ alignItems: 'center' }}
            >
              <AlertCircle sx={{ width: 16, height: 16, color: 'blue.700' }} />
              <Typography
                variant='subtitle2'
                color='blue.900'
              >
                关于权限管理
              </Typography>
            </Stack>
            <Typography
              variant='body2'
              color='blue.700'
              sx={{ mt: 1 }}
            >
              权限是系统级配置，通常由开发人员在后端代码中预先定义。
              您可以在这里查看所有可用权限，并通过角色管理页面将权限分配给不同的角色。
            </Typography>
          </Box>
        }
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>创建新权限</DialogTitle>
        <form onSubmit={handleCreatePermission}>
          <DialogContent>
            <Stack
              spacing={2}
              sx={{ pt: 1 }}
            >
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  权限名称 *
                </Typography>
                <TextField
                  fullWidth
                  size='small'
                  required
                  value={newPermission.name}
                  onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
                  placeholder='例如：文档读取'
                  sx={{ mt: 0.5 }}
                />
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  权限码 *
                </Typography>
                <TextField
                  fullWidth
                  size='small'
                  required
                  value={newPermission.code}
                  onChange={(e) => setNewPermission({ ...newPermission, code: e.target.value })}
                  placeholder='例如：doc:read'
                  sx={{ mt: 0.5 }}
                />
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  分类 *
                </Typography>
                <TextField
                  fullWidth
                  size='small'
                  required
                  value={newPermission.category}
                  onChange={(e) =>
                    setNewPermission({
                      ...newPermission,
                      category: e.target.value,
                    })
                  }
                  placeholder='例如：doc'
                  sx={{ mt: 0.5 }}
                />
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  描述
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={newPermission.description}
                  onChange={(e) =>
                    setNewPermission({
                      ...newPermission,
                      description: e.target.value,
                    })
                  }
                  placeholder='描述这个权限的用途'
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setShowCreateModal(false);
                setNewPermission({
                  name: '',
                  code: '',
                  category: '',
                  description: '',
                });
              }}
            >
              取消
            </Button>
            <Button
              type='submit'
              variant='contained'
            >
              创建
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={!!editingPermission}
        onClose={() => setEditingPermission(null)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>编辑权限</DialogTitle>
        {editingPermission && (
          <form onSubmit={handleUpdatePermission}>
            <DialogContent>
              <Stack
                spacing={2}
                sx={{ pt: 1 }}
              >
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    权限名称 *
                  </Typography>
                  <TextField
                    fullWidth
                    size='small'
                    required
                    value={editingPermission.name}
                    onChange={(e) =>
                      setEditingPermission({
                        ...editingPermission,
                        name: e.target.value,
                      })
                    }
                    placeholder='例如：文档读取'
                    sx={{ mt: 0.5 }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    权限码 *
                  </Typography>
                  <TextField
                    fullWidth
                    size='small'
                    required
                    value={editingPermission.code}
                    onChange={(e) =>
                      setEditingPermission({
                        ...editingPermission,
                        code: e.target.value,
                      })
                    }
                    placeholder='例如：doc:read'
                    sx={{ mt: 0.5 }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    分类 *
                  </Typography>
                  <TextField
                    fullWidth
                    size='small'
                    required
                    value={editingPermission.category}
                    onChange={(e) =>
                      setEditingPermission({
                        ...editingPermission,
                        category: e.target.value,
                      })
                    }
                    placeholder='例如：doc'
                    sx={{ mt: 0.5 }}
                  />
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    描述
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={editingPermission.description || ''}
                    onChange={(e) =>
                      setEditingPermission({
                        ...editingPermission,
                        description: e.target.value,
                      })
                    }
                    placeholder='描述这个权限的用途'
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditingPermission(null)}>取消</Button>
              <Button
                type='submit'
                variant='contained'
              >
                保存
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>
    </PageContainer>
  );
};

export default PermissionManagementPage;
