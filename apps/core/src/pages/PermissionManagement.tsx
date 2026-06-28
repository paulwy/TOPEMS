import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';

import type { Permission } from '@topems/shared-types';
import { useIamStore } from '../store/iamStore';
import { iamApi } from '../api/iam';
import { Plus, RefreshCw, Search, Shield, Trash2 } from 'lucide-react';
const AddIcon = Plus;
const DeleteIcon = Trash2;
const RefreshIcon = RefreshCw;
const SearchIcon = Search;
const ShieldIcon = Shield;

const typeLabels: Record<string, string> = {
  menu: '菜单',
  button: '按钮',
  api: 'API',
};

const typeColors: Record<string, 'primary' | 'success' | 'warning' | 'default'> = {
  menu: 'primary',
  button: 'success',
  api: 'warning',
};

export const PermissionManagement: React.FC = () => {
  const {
    permissions,
    loading,
    error,
    loadPermissions,
    addPermission,
    deletePermission: storeDeletePermission,
  } = useIamStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [newPermission, setNewPermission] = useState({
    name: '',
    code: '',
    type: 'button' as 'menu' | 'button' | 'api',
    resource: '',
    action: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      if (typeFilter !== 'all' && p.type !== typeFilter) {
        return false;
      }
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        return (
          p.name.toLowerCase().includes(keyword) ||
          p.code.toLowerCase().includes(keyword) ||
          p.resource?.toLowerCase().includes(keyword)
        );
      }
      return true;
    });
  }, [permissions, searchKeyword, typeFilter]);

  const permissionsByResource = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    filteredPermissions.forEach((p) => {
      const resource = p.resource || 'other';
      if (!grouped[resource]) {
        grouped[resource] = [];
      }
      grouped[resource].push(p);
    });
    return grouped;
  }, [filteredPermissions]);

  const handleCreatePermission = async () => {
    if (!newPermission.name || !newPermission.code) return;
    setSubmitting(true);
    try {
      const perm = await iamApi.createPermission(newPermission);
      addPermission(perm);
      setCreateDialogOpen(false);
      setNewPermission({
        name: '',
        code: '',
        type: 'button',
        resource: '',
        action: '',
      });
    } catch (err) {
      console.error('创建权限失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePermission = async (id: string) => {
    if (!window.confirm('确定要删除这个权限吗？删除后相关角色的权限也会被移除。')) return;
    try {
      await iamApi.deletePermission(id);
      storeDeletePermission(id);
    } catch (err) {
      console.error('删除权限失败:', err);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            权限管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            查看和管理系统权限配置
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadPermissions()}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            创建权限
          </Button>
        </Box>
      </Box>

      <Paper
        sx={{
          mb: 3,
          p: 2,
          bgcolor: 'info.50',
          border: 1,
          borderColor: 'info.200',
        }}
      >
        <Typography variant="body2" color="info.900">
          权限是系统级配置，通常由开发人员在后端代码中预先定义。
          您可以在这里查看所有可用权限，并通过角色管理页面将权限分配给不同的角色。
        </Typography>
      </Paper>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索权限名称、权限码..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            slotProps={{
              input: {
                size: 'small',
                startAdornment: <SearchIcon size={20} style={{ color: 'var(--mui-palette-text-secondary, #666)', marginRight: 1 * 4 }} />,
              },
            }}
            sx={{ minWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>类型</InputLabel>
            <Select
              value={typeFilter}
              label="类型"
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="menu">菜单</MenuItem>
              <MenuItem value="button">按钮</MenuItem>
              <MenuItem value="api">API</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Paper sx={{ py: 8 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        </Paper>
      ) : Object.keys(permissionsByResource).length === 0 ? (
        <Paper sx={{ py: 8 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography color="text.secondary">暂无权限数据</Typography>
          </Box>
        </Paper>
      ) : (
        Object.entries(permissionsByResource).map(([resource, perms]) => (
          <Paper key={resource} sx={{ mb: 3 }}>
            <Box
              sx={{
                px: 2,
                py: 1.5,
                bgcolor: 'grey.50',
                borderBottom: 1,
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <ShieldIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {resource}
              </Typography>
              <Chip label={`${perms.length} 个权限`} size="small" variant="outlined" />
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>权限名称</TableCell>
                    <TableCell>权限码</TableCell>
                    <TableCell>类型</TableCell>
                    <TableCell>操作</TableCell>
                    <TableCell align="right">管理</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {perms.map((perm) => (
                    <TableRow key={perm.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {perm.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                        >
                          {perm.code}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={typeLabels[perm.type] || perm.type}
                          size="small"
                          color={typeColors[perm.type] || 'default'}
                          variant="filled"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {perm.action || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeletePermission(perm.id)}
                          title="删除"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ))
      )}

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建新权限</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="权限名称"
              required
              value={newPermission.name}
              onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
              placeholder="例如：用户创建"
              fullWidth
            />
            <TextField
              label="权限码"
              required
              value={newPermission.code}
              onChange={(e) => setNewPermission({ ...newPermission, code: e.target.value })}
              placeholder="例如：user:create"
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>类型</InputLabel>
              <Select
                value={newPermission.type}
                label="类型"
                onChange={(e) =>
                  setNewPermission({
                    ...newPermission,
                    type: e.target.value as 'menu' | 'button' | 'api',
                  })
                }
              >
                <MenuItem value="menu">菜单</MenuItem>
                <MenuItem value="button">按钮</MenuItem>
                <MenuItem value="api">API</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="所属模块/资源"
              value={newPermission.resource}
              onChange={(e) => setNewPermission({ ...newPermission, resource: e.target.value })}
              placeholder="例如：user, iam"
              fullWidth
            />
            <TextField
              label="操作"
              value={newPermission.action}
              onChange={(e) => setNewPermission({ ...newPermission, action: e.target.value })}
              placeholder="例如：create, read, update, delete"
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreatePermission}
            disabled={submitting || !newPermission.name || !newPermission.code}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
