import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authApi, type User, type Role } from '../api/iam';
import { useAppStore } from '../store';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModeToggle } from '@/components/ModeToggle';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface UserManagementPageProps {
  onNavigate?: (page: string) => void;
}

const UserManagementPage: React.FC<UserManagementPageProps> = ({ onNavigate: _onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<Role[]>([]);

  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: '普通用户',
  });

  const [currentPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    loadData();
  }, [currentPage, searchQuery]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        authApi.listUsers({ page: currentPage, page_size: pageSize, search: searchQuery || undefined }),
        authApi.listRoles(),
      ]);

      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data.users || []);
      }
      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
      }
    } catch (_err: any) {
      const errorMsg = _err.response?.data?.message || _err.message || '加载数据失败';
      setError(errorMsg);
      addNotification({ title: '加载失败', message: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadUserRoles = async (userId: string) => {
    try {
      const res = await authApi.getUserRoles(userId);
      if (res.success && res.data) {
        setUserRoles(res.data);
      }
    } catch (_err: any) {
      addNotification({ title: '加载失败', message: '加载用户角色失败', type: 'error' });
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
        addNotification({ title: '成功', message: '用户创建成功', type: 'success' });
        setShowCreateModal(false);
        setNewUser({ username: '', email: '', password: '', full_name: '', role: '普通用户' });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '创建用户失败', type: 'error' });
      }
    } catch (_err: any) {
      const errorMsg = _err.response?.data?.message || _err.message || '创建用户失败';
      addNotification({ title: '失败', message: errorMsg, type: 'error' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除这个用户吗？')) return;
    try {
      const res = await authApi.deleteUser(userId);
      if (res.success) {
        addNotification({ title: '成功', message: '用户删除成功', type: 'success' });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '删除用户失败', type: 'error' });
      }
    } catch (_err: any) {
      addNotification({ title: '失败', message: _err.message || '删除用户失败', type: 'error' });
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await authApi.updateUser(selectedUser.id, {
        full_name: selectedUser.full_name || undefined,
        email: selectedUser.email,
      });
      if (res.success) {
        addNotification({ title: '成功', message: '用户更新成功', type: 'success' });
        setShowEditModal(false);
        setSelectedUser(null);
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '更新用户失败', type: 'error' });
      }
    } catch (_err: any) {
      addNotification({ title: '失败', message: _err.message || '更新用户失败', type: 'error' });
    }
  };

  const handleAddRoleToUser = async (userId: string, roleId: string) => {
    try {
      const res = await authApi.addUserRole(userId, roleId);
      if (res.success) {
        addNotification({ title: '成功', message: '角色添加成功', type: 'success' });
        await loadUserRoles(userId);
      } else {
        addNotification({ title: '失败', message: res.message || '添加角色失败', type: 'error' });
      }
    } catch (_err: any) {
      addNotification({ title: '失败', message: _err.message || '添加角色失败', type: 'error' });
    }
  };

  const handleRemoveRoleFromUser = async (userId: string, roleId: string) => {
    try {
      const res = await authApi.removeUserRole(userId, roleId);
      if (res.success) {
        addNotification({ title: '成功', message: '角色移除成功', type: 'success' });
        await loadUserRoles(userId);
      } else {
        addNotification({ title: '失败', message: res.message || '移除角色失败', type: 'error' });
      }
    } catch (_err: any) {
      addNotification({ title: '失败', message: _err.message || '移除角色失败', type: 'error' });
    }
  };

  const openRolesModal = async (user: User) => {
    setSelectedUser(user);
    await loadUserRoles(user.id);
    setShowRolesModal(true);
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
      管理员: 'destructive',
      普通用户: 'secondary',
      访客: 'outline',
    };
    return <Badge variant={colors[role] || 'outline'}>{role || '未知'}</Badge>;
  };

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: 'username',
        header: '姓名',
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className='flex items-center space-x-3'>
              <Avatar>
                <AvatarFallback className='bg-blue-100 text-blue-700'>
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className='font-medium text-gray-900 dark:text-gray-100'>{user.full_name || user.username}</div>
                <div className='text-sm text-gray-500 dark:text-gray-400'>{user.email}</div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'role',
        header: '角色',
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className='flex items-center space-x-2'>
              {getRoleBadge(user.role || '普通用户')}
              {user.roles && user.roles.length > 1 && (
                <span className='text-xs text-gray-500'>+{user.roles.length - 1}</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'permissions',
        header: '权限',
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className='text-sm text-gray-500 dark:text-gray-400'>
              {user.permissions ? user.permissions.length : 0} 个权限
            </div>
          );
        },
      },
      {
        accessorKey: 'is_active',
        header: '状态',
        cell: ({ row }) => {
          const user = row.original;
          const isActive = user.is_active !== false;
          return (
            <div className='flex items-center space-x-2'>
              {isActive ? (
                <CheckCircle className='w-4 h-4 text-green-500' />
              ) : (
                <XCircle className='w-4 h-4 text-red-500' />
              )}
              <span className='text-sm text-gray-600 dark:text-gray-300'>{isActive ? '活跃' : '禁用'}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: '创建时间',
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className='text-sm text-gray-500 dark:text-gray-400'>
              {new Date(user.created_at).toLocaleDateString('zh-CN')}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className='flex items-center justify-end space-x-2'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setSelectedUser(user);
                  setShowEditModal(true);
                }}
              >
                <Edit className='w-4 h-4' />
              </Button>
              <Button variant='ghost' size='sm' onClick={() => openRolesModal(user)} title='管理角色'>
                <Shield className='w-4 h-4' />
              </Button>
              <Button
                variant='ghost'
                size='sm'
                className='text-red-600 hover:text-red-700'
                onClick={() => handleDeleteUser(user.id)}
              >
                <Trash2 className='w-4 h-4' />
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Header */}
      <div className='bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <Button variant='ghost' onClick={() => navigate('/dashboard')}>
                <ChevronLeft className='w-5 h-5' />
              </Button>
              <div>
                <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center'>
                  <Users className='w-7 h-7 mr-3 text-blue-600' />
                  用户管理
                </h1>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>管理平台用户账户、角色和权限</p>
              </div>
            </div>
            <div className='flex items-center space-x-2'>
              <ModeToggle />
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className='w-5 h-5 mr-2' />
                创建用户
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Search */}
        <div className='mb-6 flex items-center space-x-4'>
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
            <Input
              type='text'
              placeholder='搜索用户名、邮箱...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-10'
            />
          </div>
          <Button variant='secondary' onClick={loadData}>
            刷新
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className='p-0'>
            {loading ? (
              <div className='p-8 text-center'>
                <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent'></div>
                <p className='mt-2 text-gray-500 dark:text-gray-400'>加载中...</p>
              </div>
            ) : error ? (
              <div className='p-8 text-center'>
                <AlertCircle className='w-12 h-12 text-red-500 mx-auto mb-3' />
                <p className='text-red-600 dark:text-red-400'>{error}</p>
                <Button className='mt-4' onClick={loadData}>
                  重试
                </Button>
              </div>
            ) : (
              <DataTable columns={columns} data={users} searchPlaceholder='搜索用户名、邮箱...' searchKey='username' />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>创建新用户</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <div className='space-y-4 py-2'>
              <div className='space-y-2'>
                <Label htmlFor='username'>用户名 *</Label>
                <Input
                  id='username'
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder='输入用户名'
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='email'>邮箱 *</Label>
                <Input
                  id='email'
                  type='email'
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder='输入邮箱'
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='password'>密码 *</Label>
                <Input
                  id='password'
                  type='password'
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder='输入密码'
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='full_name'>姓名</Label>
                <Input
                  id='full_name'
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder='输入姓名'
                />
              </div>
            </div>
            <DialogFooter className='mt-6'>
              <Button
                type='button'
                variant='secondary'
                onClick={() => {
                  setShowCreateModal(false);
                  setNewUser({ username: '', email: '', password: '', full_name: '', role: '普通用户' });
                }}
              >
                取消
              </Button>
              <Button type='submit'>创建</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleEditUser}>
              <div className='space-y-4 py-2'>
                <div className='space-y-2'>
                  <Label htmlFor='edit-username'>用户名</Label>
                  <Input id='edit-username' value={selectedUser.username} disabled />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='edit-email'>邮箱 *</Label>
                  <Input
                    id='edit-email'
                    type='email'
                    value={selectedUser.email}
                    onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='edit-full_name'>姓名</Label>
                  <Input
                    id='edit-full_name'
                    value={selectedUser.full_name || ''}
                    onChange={(e) => setSelectedUser({ ...selectedUser, full_name: e.target.value })}
                    placeholder='输入姓名'
                  />
                </div>
              </div>
              <DialogFooter className='mt-6'>
                <Button
                  type='button'
                  variant='secondary'
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                >
                  取消
                </Button>
                <Button type='submit'>保存</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Roles Management Dialog */}
      <Dialog open={showRolesModal} onOpenChange={setShowRolesModal}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>用户角色管理 - {selectedUser?.full_name || selectedUser?.username}</DialogTitle>
          </DialogHeader>
          <div className='py-4'>
            <h4 className='font-medium text-gray-900 dark:text-gray-100 mb-4'>已有角色</h4>
            <div className='space-y-2 mb-6'>
              {userRoles.length === 0 ? (
                <p className='text-sm text-gray-500 dark:text-gray-400'>暂无分配角色</p>
              ) : (
                userRoles.map((role) => (
                  <div
                    key={role.id}
                    className='flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800'
                  >
                    <div className='flex items-center space-x-3'>
                      <Shield className='w-4 h-4 text-green-600 dark:text-green-400' />
                      <span className='font-medium text-green-900 dark:text-green-100'>{role.name}</span>
                    </div>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-red-600 hover:text-red-700'
                      onClick={() => selectedUser && handleRemoveRoleFromUser(selectedUser.id, role.id)}
                      title='移除角色'
                    >
                      <UserMinus className='w-4 h-4' />
                    </Button>
                  </div>
                ))
              )}
            </div>
            <h4 className='font-medium text-gray-900 dark:text-gray-100 mb-4'>可用角色</h4>
            <div className='space-y-2'>
              {roles
                .filter((r) => !userRoles.some((ur) => ur.id === r.id))
                .map((role) => (
                  <div
                    key={role.id}
                    className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg'
                  >
                    <div className='flex items-center space-x-3'>
                      <Shield className='w-4 h-4 text-gray-600 dark:text-gray-400' />
                      <div>
                        <span className='font-medium text-gray-900 dark:text-gray-100'>{role.name}</span>
                        {role.description && (
                          <span className='text-sm text-gray-500 dark:text-gray-400 ml-2'>- {role.description}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => selectedUser && handleAddRoleToUser(selectedUser.id, role.id)}
                      title='添加角色'
                    >
                      <UserPlus className='w-4 h-4' />
                    </Button>
                  </div>
                ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant='secondary' onClick={() => setShowRolesModal(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementPage;
