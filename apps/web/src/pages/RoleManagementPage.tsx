import React, { useState, useEffect } from 'react';
import { Shield, Search, Plus, Trash2, ChevronLeft, Key, AlertCircle, CheckCircle, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authApi, type Role, type Permission } from '../api/iam';
import { useAppStore } from '../store';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ModeToggle } from '@/components/ModeToggle';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RoleManagementPageProps {
  onNavigate?: (page: string) => void;
}

const RoleManagementPage: React.FC<RoleManagementPageProps> = ({ onNavigate: _onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);

  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([authApi.listRoles(), authApi.listPermissions()]);

      if (rolesRes.success && rolesRes.data) {
        setRoles(rolesRes.data);
      }
      if (permsRes.success && permsRes.data) {
        setAllPermissions(permsRes.data);
      }
    } catch (_err: any) {
      setError(_err.message || '加载数据失败');
      addNotification({ title: '加载失败', message: '加载数据失败', type: 'error' });
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
      addNotification({ title: '加载失败', message: '加载角色权限失败', type: 'error' });
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authApi.createRole(newRole);
      if (res.success) {
        addNotification({ title: '成功', message: '角色创建成功', type: 'success' });
        setShowCreateModal(false);
        setNewRole({ name: '', description: '' });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '创建角色失败', type: 'error' });
      }
    } catch (_err: any) {
      addNotification({ title: '失败', message: _err.message || '创建角色失败', type: 'error' });
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
        addNotification({ title: '成功', message: '角色更新成功', type: 'success' });
        setShowEditModal(false);
        setSelectedRole(null);
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '更新角色失败', type: 'error' });
      }
    } catch (_err: any) {
      addNotification({ title: '失败', message: _err.message || '更新角色失败', type: 'error' });
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('确定要删除这个角色吗？删除后无法恢复。')) return;

    try {
      const res = await authApi.deleteRole(roleId);
      if (res.success) {
        addNotification({ title: '成功', message: '角色删除成功', type: 'success' });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '删除角色失败', type: 'error' });
      }
    } catch (_err: any) {
      addNotification({ title: '失败', message: _err.message || '删除角色失败', type: 'error' });
    }
  };

  const handleAddPermission = async (roleId: string, permissionId: string) => {
    try {
      const res = await authApi.addRolePermission(roleId, permissionId);
      if (res.success) {
        addNotification({ title: '成功', message: '权限添加成功', type: 'success' });
        loadRolePermissions(roleId);
      } else {
        addNotification({ title: '失败', message: res.message || '添加权限失败', type: 'error' });
      }
    } catch (_err: any) {
      addNotification({ title: '失败', message: _err.message || '添加权限失败', type: 'error' });
    }
  };

  const handleRemovePermission = async (roleId: string, permissionId: string) => {
    try {
      const res = await authApi.removeRolePermission(roleId, permissionId);
      if (res.success) {
        addNotification({ title: '成功', message: '权限移除成功', type: 'success' });
        loadRolePermissions(roleId);
      } else {
        addNotification({ title: '失败', message: res.message || '移除权限失败', type: 'error' });
      }
    } catch (_err: any) {
      addNotification({ title: '失败', message: _err.message || '移除权限失败', type: 'error' });
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
      role.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <div className='bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <Button variant='ghost' onClick={() => navigate('/dashboard')}>
                <ChevronLeft className='w-5 h-5' />
              </Button>
              <div>
                <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center'>
                  <Shield className='w-7 h-7 mr-3 text-indigo-600' />
                  角色管理
                </h1>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>管理用户角色、权限配置</p>
              </div>
            </div>
            <div className='flex items-center space-x-2'>
              <ModeToggle />
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className='w-5 h-5 mr-2' />
                创建角色
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-6 flex items-center space-x-4'>
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
            <Input
              type='text'
              placeholder='搜索角色名称或描述...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-10'
            />
          </div>
          <Button variant='secondary' onClick={loadData}>
            刷新
          </Button>
        </div>

        <Card>
          <CardContent className='p-0'>
            {loading ? (
              <div className='p-8 text-center'>
                <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent'></div>
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
            ) : filteredRoles.length === 0 ? (
              <div className='p-8 text-center'>
                <Shield className='w-12 h-12 text-gray-400 mx-auto mb-3' />
                <p className='text-gray-500 dark:text-gray-400'>暂无角色</p>
              </div>
            ) : (
              <div className='divide-y divide-gray-200 dark:divide-gray-700'>
                {filteredRoles.map((role) => (
                  <div key={role.id} className='p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-start space-x-4'>
                        <div className='w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center flex-shrink-0'>
                          <Shield className='w-6 h-6 text-indigo-600 dark:text-indigo-400' />
                        </div>
                        <div className='flex-1'>
                          <div className='flex items-center space-x-3'>
                            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>{role.name}</h3>
                          </div>
                          {role.description && (
                            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>{role.description}</p>
                          )}
                          <p className='text-xs text-gray-400 dark:text-gray-500 mt-2'>
                            创建时间: {new Date(role.created_at).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => {
                                  setSelectedRole(role);
                                  setShowEditModal(true);
                                }}
                              >
                                <Edit className='w-5 h-5' />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>编辑角色</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant='ghost' size='sm' onClick={() => openPermissionsModal(role)}>
                                <Key className='w-5 h-5' />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>管理权限</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='text-red-600 hover:text-red-700 dark:text-red-400'
                                onClick={() => handleDeleteRole(role.id)}
                              >
                                <Trash2 className='w-5 h-5' />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>删除角色</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>创建新角色</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRole}>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='name'>角色名称 *</Label>
                <Input
                  id='name'
                  type='text'
                  required
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                  placeholder='例如：管理员、普通用户'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='description'>描述</Label>
                <Textarea
                  id='description'
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  rows={3}
                  placeholder='描述这个角色的用途'
                />
              </div>
            </div>

            <DialogFooter className='mt-6'>
              <Button
                type='button'
                variant='secondary'
                onClick={() => {
                  setShowCreateModal(false);
                  setNewRole({ name: '', description: '' });
                }}
              >
                取消
              </Button>
              <Button type='submit'>创建</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>编辑角色</DialogTitle>
          </DialogHeader>
          {selectedRole && (
            <form onSubmit={handleEditRole}>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='edit-name'>角色名称 *</Label>
                  <Input
                    id='edit-name'
                    type='text'
                    required
                    value={selectedRole.name}
                    onChange={(e) => setSelectedRole({ ...selectedRole, name: e.target.value })}
                    placeholder='例如：管理员、普通用户'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='edit-description'>描述</Label>
                  <Textarea
                    id='edit-description'
                    value={selectedRole.description || ''}
                    onChange={(e) => setSelectedRole({ ...selectedRole, description: e.target.value })}
                    rows={3}
                    placeholder='描述这个角色的用途'
                  />
                </div>
              </div>

              <DialogFooter className='mt-6'>
                <Button
                  type='button'
                  variant='secondary'
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedRole(null);
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

      <Dialog open={showPermissionsModal} onOpenChange={setShowPermissionsModal}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>角色权限 - {selectedRole?.name}</DialogTitle>
          </DialogHeader>
          <div className='overflow-y-auto max-h-[60vh]'>
            <h4 className='font-medium text-gray-900 dark:text-gray-100 mb-4'>可选权限</h4>
            <div className='space-y-2'>
              {allPermissions.map((perm) => {
                const hasPermission = rolePermissions.some((p) => p.id === perm.id);
                return (
                  <div
                    key={perm.id}
                    className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg'
                  >
                    <div className='flex-1'>
                      <div className='flex items-center space-x-2'>
                        <span className='font-medium text-gray-900 dark:text-gray-100'>{perm.name}</span>
                        {hasPermission && <CheckCircle className='w-4 h-4 text-green-500' />}
                      </div>
                      <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>{perm.description}</p>
                      <p className='text-xs text-gray-400 dark:text-gray-500'>
                        分类: {perm.category} | 权限码: {perm.code}
                      </p>
                    </div>
                    {hasPermission ? (
                      <Button
                        variant='secondary'
                        size='sm'
                        className='text-red-600 hover:text-red-700 dark:text-red-400'
                        onClick={() => selectedRole && handleRemovePermission(selectedRole.id, perm.id)}
                      >
                        移除
                      </Button>
                    ) : (
                      <Button
                        variant='secondary'
                        size='sm'
                        className='text-indigo-600 hover:text-indigo-700 dark:text-indigo-400'
                        onClick={() => selectedRole && handleAddPermission(selectedRole.id, perm.id)}
                      >
                        添加
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button type='button' variant='secondary' onClick={() => setShowPermissionsModal(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoleManagementPage;
