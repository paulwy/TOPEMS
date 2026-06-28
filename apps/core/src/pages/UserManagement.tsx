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
  Avatar,
  CircularProgress,
  Alert,
  Pagination,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';

import type { User, Role } from '@topems/shared-types';
import { useIamStore } from '../store/iamStore';
import { iamApi } from '../api/iam';
import { Pencil, Plus, RefreshCw, Search, Shield, Trash2 } from 'lucide-react';
const AddIcon = Plus;
const DeleteIcon = Trash2;
const EditIcon = Pencil;
const RefreshIcon = RefreshCw;
const SearchIcon = Search;
const ShieldIcon = Shield;

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'default';
    case 'locked':
      return 'error';
    default:
      return 'default';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active':
      return '活跃';
    case 'inactive':
      return '禁用';
    case 'locked':
      return '锁定';
    default:
      return status;
  }
};

export const UserManagement: React.FC = () => {
  const {
    users,
    roles,
    usersTotal,
    usersPage,
    usersPageSize,
    loading,
    error,
    loadUsers,
    loadRoles,
    addUser,
    updateUser: storeUpdateUser,
    deleteUser: storeDeleteUser,
  } = useIamStore();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<Role[]>([]);

  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    realName: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers({ page: 1, pageSize: 10 });
    loadRoles();
  }, [loadUsers, loadRoles]);

  const handleSearch = () => {
    loadUsers({
      page: 1,
      pageSize: usersPageSize,
      keyword: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    loadUsers({
      page,
      pageSize: usersPageSize,
      keyword: searchKeyword || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    });
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) return;
    setSubmitting(true);
    try {
      const user = await iamApi.createUser(newUser);
      addUser(user);
      setCreateDialogOpen(false);
      setNewUser({ username: '', email: '', password: '', realName: '' });
    } catch (err) {
      console.error('创建用户失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const user = await iamApi.updateUser(selectedUser.id, {
        email: selectedUser.email,
        realName: selectedUser.realName,
        status: selectedUser.status,
      });
      storeUpdateUser(user);
      setEditDialogOpen(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('更新用户失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('确定要删除这个用户吗？')) return;
    try {
      await iamApi.deleteUser(id);
      storeDeleteUser(id);
    } catch (err) {
      console.error('删除用户失败:', err);
    }
  };

  const openRoleDialog = async (user: User) => {
    setSelectedUser(user);
    try {
      const roles = await iamApi.getUserRoles(user.id);
      setUserRoles(roles);
    } catch (err) {
      console.error('加载用户角色失败:', err);
      setUserRoles([]);
    }
    setRoleDialogOpen(true);
  };

  const handleAddRole = async (roleId: string) => {
    if (!selectedUser) return;
    try {
      await iamApi.addUserRole(selectedUser.id, roleId);
      const roles = await iamApi.getUserRoles(selectedUser.id);
      setUserRoles(roles);
    } catch (err) {
      console.error('添加角色失败:', err);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!selectedUser) return;
    try {
      await iamApi.removeUserRole(selectedUser.id, roleId);
      const roles = await iamApi.getUserRoles(selectedUser.id);
      setUserRoles(roles);
    } catch (err) {
      console.error('移除角色失败:', err);
    }
  };

  const availableRoles = useMemo(() => {
    return roles.filter((r) => !userRoles.some((ur) => ur.id === r.id));
  }, [roles, userRoles]);

  const totalPages = Math.ceil(usersTotal / usersPageSize);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            用户管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理平台用户账户、角色和权限
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() =>
              loadUsers({
                page: usersPage,
                pageSize: usersPageSize,
                keyword: searchKeyword || undefined,
              })
            }
          >
            刷新
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            创建用户
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜索用户名、邮箱..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            slotProps={{
              input: {
                size: 'small',
                startAdornment: <SearchIcon size={20} style={{ color: 'var(--mui-palette-text-secondary, #666)', marginRight: 1 * 4 }} />,
              },
            }}
            sx={{ minWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>状态</InputLabel>
            <Select
              value={statusFilter}
              label="状态"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">全部</MenuItem>
              <MenuItem value="active">活跃</MenuItem>
              <MenuItem value="inactive">禁用</MenuItem>
              <MenuItem value="locked">锁定</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={handleSearch}>
            搜索
          </Button>
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
                <TableCell>用户</TableCell>
                <TableCell>邮箱</TableCell>
                <TableCell>角色</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>创建时间</TableCell>
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
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">暂无用户数据</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                          {user.realName?.charAt(0) || user.username.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {user.realName || user.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            @{user.username}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.slice(0, 2).map((role, idx) => (
                            <Chip key={idx} label={role} size="small" variant="outlined" />
                          ))
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            无
                          </Typography>
                        )}
                        {user.roles && user.roles.length > 2 && (
                          <Chip
                            label={`+${user.roles.length - 2}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(user.status)}
                        size="small"
                        color={getStatusColor(user.status) as any}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => openRoleDialog(user)}
                        title="管理角色"
                      >
                        <ShieldIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedUser(user);
                          setEditDialogOpen(true);
                        }}
                        title="编辑"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteUser(user.id)}
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
        {usersTotal > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
            <Pagination
              count={totalPages}
              page={usersPage}
              onChange={handlePageChange}
              size="small"
            />
          </Box>
        )}
      </Paper>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>创建新用户</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="用户名"
              required
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              fullWidth
            />
            <TextField
              label="邮箱"
              type="email"
              required
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="密码"
              type="password"
              required
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              fullWidth
            />
            <TextField
              label="姓名"
              value={newUser.realName}
              onChange={(e) => setNewUser({ ...newUser, realName: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreateUser}
            disabled={submitting || !newUser.username || !newUser.email || !newUser.password}
          >
            {submitting ? '创建中...' : '创建'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>编辑用户</DialogTitle>
        {selectedUser && (
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField label="用户名" value={selectedUser.username} disabled fullWidth />
              <TextField
                label="邮箱"
                type="email"
                value={selectedUser.email}
                onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                fullWidth
              />
              <TextField
                label="姓名"
                value={selectedUser.realName}
                onChange={(e) => setSelectedUser({ ...selectedUser, realName: e.target.value })}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={selectedUser.status}
                  label="状态"
                  onChange={(e) =>
                    setSelectedUser({
                      ...selectedUser,
                      status: e.target.value as 'active' | 'inactive' | 'locked',
                    })
                  }
                >
                  <MenuItem value="active">活跃</MenuItem>
                  <MenuItem value="inactive">禁用</MenuItem>
                  <MenuItem value="locked">锁定</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
        )}
        <DialogActions>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setSelectedUser(null);
            }}
          >
            取消
          </Button>
          <Button variant="contained" onClick={handleEditUser} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>用户角色管理 - {selectedUser?.realName || selectedUser?.username}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              已有角色
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
              {userRoles.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  暂无分配角色
                </Typography>
              ) : (
                userRoles.map((role) => (
                  <Box
                    key={role.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      bgcolor: 'success.light',
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'success.main',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ShieldIcon fontSize="small" color="success" />
                      <Typography sx={{ fontWeight: 500, color: 'success.main' }}>
                        {role.name}
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleRemoveRole(role.id)}
                    >
                      移除
                    </Button>
                  </Box>
                ))
              )}
            </Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              可用角色
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {availableRoles.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  没有更多可分配的角色
                </Typography>
              ) : (
                availableRoles.map((role) => (
                  <Box
                    key={role.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 2,
                      bgcolor: 'grey.100',
                      borderRadius: 1,
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 500 }}>{role.name}</Typography>
                      {role.description && (
                        <Typography variant="caption" color="text.secondary">
                          {role.description}
                        </Typography>
                      )}
                    </Box>
                    <Button size="small" onClick={() => handleAddRole(role.id)}>
                      添加
                    </Button>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setRoleDialogOpen(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
