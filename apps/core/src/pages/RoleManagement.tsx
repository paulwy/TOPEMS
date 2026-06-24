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
  Checkbox,
  FormGroup,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Shield as ShieldIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Key as KeyIcon,
} from '@mui/icons-material';
import type { Role, Permission } from '@topems/shared-types';
import { useIamStore } from '../store/iamStore';
import { iamApi } from '../api/iam';

export const RoleManagement: React.FC = () => {
  const {
    roles,
    permissions,
    loading,
    error,
    loadRoles,
    loadPermissions,
    addRole,
    updateRole: storeUpdateRole,
    deleteRole: storeDeleteRole,
  } = useIamStore();

  const [searchKeyword, setSearchKeyword] = useState('');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);

  const [newRole, setNewRole] = useState({
    name: '',
    code: '',
    description: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, [loadRoles, loadPermissions]);

  const filteredRoles = useMemo(() => {
    if (!searchKeyword) return roles;
    const keyword = searchKeyword.toLowerCase();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(keyword) ||
        r.code.toLowerCase().includes(keyword) ||
        r.description?.toLowerCase().includes(keyword)
    );
  }, [roles, searchKeyword]);

  const handleCreateRole = async () => {
    if (!newRole.name || !newRole.code) return;
    setSubmitting(true);
    try {
      const role = await iamApi.createRole(newRole);
      addRole(role);
      setCreateDialogOpen(false);
      setNewRole({ name: '', code: '', description: '' });
    } catch (err) {
      console.error('创建角色失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole) return;
    setSubmitting(true);
    try {
      const role = await iamApi.updateRole(selectedRole.id, {
        name: selectedRole.name,
        description: selectedRole.description,
        status: selectedRole.status,
      });
      storeUpdateRole(role);
      setEditDialogOpen(false);
      setSelectedRole(null);
    } catch (err) {
      console.error('更新角色失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!window.confirm('确定要删除这个角色吗？删除后无法恢复。')) return;
    try {
      await iamApi.deleteRole(id);
      storeDeleteRole(id);
    } catch (err) {
      console.error('删除角色失败:', err);
    }
  };

  const openPermissionDialog = async (role: Role) => {
    setSelectedRole(role);
    try {
      const perms = await iamApi.getRolePermissions(role.id);
      setRolePermissions(perms);
    } catch (err) {
      console.error('加载角色权限失败:', err);
      setRolePermissions([]);
    }
    setPermissionDialogOpen(true);
  };

  const handlePermissionToggle = async (permissionId: string, checked: boolean) => {
    if (!selectedRole) return;
    try {
      if (checked) {
        await iamApi.addRolePermission(selectedRole.id, permissionId);
      } else {
        await iamApi.removeRolePermission(selectedRole.id, permissionId);
      }
      const perms = await iamApi.getRolePermissions(selectedRole.id);
      setRolePermissions(perms);
    } catch (err) {
      console.error('更新权限失败:', err);
    }
  };

  const permissionsByModule = useMemo(() => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach((p) => {
      const module = p.resource || 'other';
      if (!grouped[module]) {
        grouped[module] = [];
      }
      grouped[module].push(p);
    });
    return grouped;
  }, [permissions]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            角色管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理用户角色、权限配置
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              loadRoles();
              loadPermissions();
            }}
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            创建角色
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索角色名称、编码..."
            size="small"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
            }}
            sx={{ minWidth: 300 }}
          />
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>角色名称</TableCell>
                <TableCell>编码</TableCell>
                <TableCell>描述</TableCell>
                <TableCell>权限数</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredRoles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无角色数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRoles.map((role) => (
                  <TableRow key={role.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                          <ShieldIcon sx={{ color: 'primary.main' }} />
                        </Box>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {role.name}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={role.code} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {role.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{role.permissions?.length || 0} 个</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={role.status === 'active' ? '启用' : '禁用'}
                        size="small"
                        color={role.status === 'active' ? 'success' : 'default'}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => openPermissionDialog(role)}
                        title="管理权限"
                      >
                        <KeyIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedRole(role);
                          setEditDialogOpen(true);
                        }}
                        title="编辑"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteRole(role.id)}
                        title="删除"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建新角色</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="角色名称"
              required
              value={newRole.name}
              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="角色编码"
              required
              value={newRole.code}
              onChange={(e) => setNewRole({ ...newRole, code: e.target.value })}
              placeholder="例如：admin, user"
              fullWidth
            />
            <TextField
              label="描述"
              multiline
              rows={3}
              value={newRole.description}
              onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreateRole}
            disabled={submitting || !newRole.name || !newRole.code}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑角色</DialogTitle>
        {selectedRole && (
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="角色名称"
                required
                value={selectedRole.name}
                onChange={(e) => setSelectedRole({ ...selectedRole, name: e.target.value })}
                fullWidth
              />
              <TextField label="角色编码" value={selectedRole.code} disabled fullWidth />
              <TextField
                label="描述"
                multiline
                rows={3}
                value={selectedRole.description || ''}
                onChange={(e) =>
                  setSelectedRole({ ...selectedRole, description: e.target.value })
                }
                fullWidth
              />
            </Box>
          </DialogContent>
        )}
        <DialogActions>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setSelectedRole(null);
            }}
          >
            取消
          </Button>
          <Button variant="contained" onClick={handleEditRole} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={permissionDialogOpen}
        onClose={() => setPermissionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>角色权限 - {selectedRole?.name}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, maxHeight: '60vh', overflow: 'auto' }}>
            {Object.keys(permissionsByModule).length === 0 ? (
              <Typography color="text.secondary">暂无权限数据</Typography>
            ) : (
              Object.entries(permissionsByModule).map(([module, perms]) => (
                <Box key={module} sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    {module}
                  </Typography>
                  <FormGroup>
                    {perms.map((perm) => {
                      const hasPermission = rolePermissions.some((p) => p.id === perm.id);
                      return (
                        <FormControlLabel
                          key={perm.id}
                          control={
                            <Checkbox
                              checked={hasPermission}
                              onChange={(e) => handlePermissionToggle(perm.id, e.target.checked)}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2">{perm.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {perm.code}
                              </Typography>
                            </Box>
                          }
                        />
                      );
                    })}
                  </FormGroup>
                </Box>
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setPermissionDialogOpen(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
