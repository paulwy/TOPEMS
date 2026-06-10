import React, { useState, useEffect } from 'react';
import { Key, Search, Plus, Trash2, ChevronLeft, Shield, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authApi, type Permission } from '../api/iam';
import { useAppStore } from '../store';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ModeToggle } from '@/components/ModeToggle';

interface PermissionManagementPageProps {
  onNavigate?: (page: string) => void;
}

const PermissionManagementPage: React.FC<PermissionManagementPageProps> = ({ onNavigate: _onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newPermission, setNewPermission] = useState({
    name: '',
    resource: '',
    action: '',
    description: '',
  });

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.listPermissions();
      if (res.success && res.data) {
        setPermissions(res.data);
      }
    } catch (err: any) {
      setError(err.message || '加载权限失败');
      addNotification({ title: '失败', message: '加载权限失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authApi.createPermission({
        name: newPermission.name,
        resource: newPermission.resource,
        action: newPermission.action,
        description: newPermission.description || undefined,
      });

      if (res.success) {
        addNotification({ title: '成功', message: '权限创建成功', type: 'success' });
        setShowCreateModal(false);
        setNewPermission({ name: '', resource: '', action: '', description: '' });
        loadPermissions();
      } else {
        addNotification({ title: '失败', message: res.message || '创建权限失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '创建权限失败', type: 'error' });
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    if (!confirm('确定要删除这个权限吗？删除后相关角色的权限也会被移除。')) return;

    try {
      const res = await authApi.deletePermission(permissionId);
      if (res.success) {
        addNotification({ title: '成功', message: '权限删除成功', type: 'success' });
        loadPermissions();
      } else {
        addNotification({ title: '失败', message: res.message || '删除权限失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '删除权限失败', type: 'error' });
    }
  };

  const filteredPermissions = permissions.filter(
    (perm) =>
      perm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      perm.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      perm.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      perm.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getResourceBadge = (resource: string) => {
    const badges: Record<string, { variant: string; label: string }> = {
      doc: { variant: 'bg-blue-100 text-blue-700', label: '文档' },
      ai: { variant: 'bg-purple-100 text-purple-700', label: 'AI' },
      flow: { variant: 'bg-green-100 text-green-700', label: '流程' },
      user: { variant: 'bg-yellow-100 text-yellow-700', label: '用户' },
      role: { variant: 'bg-indigo-100 text-indigo-700', label: '角色' },
      permission: { variant: 'bg-pink-100 text-pink-700', label: '权限' },
      rs: { variant: 'bg-orange-100 text-orange-700', label: '研发' },
      lims: { variant: 'bg-cyan-100 text-cyan-700', label: 'LIMS' },
      qms: { variant: 'bg-teal-100 text-teal-700', label: '质量' },
      ehs: { variant: 'bg-red-100 text-red-700', label: 'EHS' },
      srm: { variant: 'bg-violet-100 text-violet-700', label: '采购' },
      gis: { variant: 'bg-emerald-100 text-emerald-700', label: 'GIS' },
      im: { variant: 'bg-rose-100 text-rose-700', label: '即时通讯' },
    };
    const config = badges[resource] || { variant: 'bg-gray-100 text-gray-700', label: resource };
    return <Badge className={config.variant}>{config.label}</Badge>;
  };

  const getActionBadge = (action: string) => {
    const badges: Record<string, { variant: string; label: string }> = {
      read: { variant: 'bg-green-100 text-green-700', label: '读取' },
      write: { variant: 'bg-blue-100 text-blue-700', label: '写入' },
      delete: { variant: 'bg-red-100 text-red-700', label: '删除' },
      admin: { variant: 'bg-purple-100 text-purple-700', label: '管理' },
    };
    const config = badges[action] || { variant: 'bg-gray-100 text-gray-700', label: action };
    return <Badge className={config.variant}>{config.label}</Badge>;
  };

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
                  <Key className='w-7 h-7 mr-3 text-purple-600' />
                  权限管理
                </h1>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>查看和管理系统权限配置</p>
              </div>
            </div>
            <div className='flex items-center space-x-2'>
              <ModeToggle />
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className='w-5 h-5 mr-2' />
                创建权限
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <Card className='mb-6'>
          <CardContent className='p-4'>
            <div className='flex flex-wrap gap-4'>
              <div className='flex-1 min-w-[200px] relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
                <Input
                  type='text'
                  placeholder='搜索权限名称、资源、操作或描述...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-10'
                />
              </div>
              <Button variant='outline' onClick={loadPermissions}>
                刷新
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-0'>
            {loading ? (
              <div className='p-8 text-center'>
                <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent'></div>
                <p className='mt-2 text-gray-500 dark:text-gray-400'>加载中...</p>
              </div>
            ) : error ? (
              <div className='p-8 text-center'>
                <AlertCircle className='w-12 h-12 text-red-500 mx-auto mb-3' />
                <p className='text-red-600 dark:text-red-400'>{error}</p>
                <Button className='mt-4' onClick={loadPermissions}>
                  重试
                </Button>
              </div>
            ) : filteredPermissions.length === 0 ? (
              <div className='p-8 text-center'>
                <Key className='w-12 h-12 text-gray-400 mx-auto mb-3' />
                <p className='text-gray-500 dark:text-gray-400'>暂无权限</p>
              </div>
            ) : (
              <div className='divide-y divide-gray-200 dark:divide-gray-700'>
                {filteredPermissions.map((perm) => (
                  <div key={perm.id} className='p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-start space-x-4'>
                        <div className='w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center flex-shrink-0'>
                          <Shield className='w-6 h-6 text-purple-600 dark:text-purple-400' />
                        </div>
                        <div className='flex-1'>
                          <div className='flex items-center space-x-3 flex-wrap'>
                            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>{perm.name}</h3>
                            {getResourceBadge(perm.resource)}
                            {getActionBadge(perm.action)}
                          </div>
                          {perm.description && (
                            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>{perm.description}</p>
                          )}
                          <p className='text-xs text-gray-400 mt-2'>权限 ID: {perm.id}</p>
                        </div>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='text-red-600 hover:text-red-700 dark:text-red-400'
                                onClick={() => handleDeletePermission(perm.id)}
                              >
                                <Trash2 className='w-4 h-4' />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>删除权限</TooltipContent>
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

        <Card className='mt-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'>
          <CardContent className='p-4'>
            <h4 className='font-medium text-blue-900 dark:text-blue-300 flex items-center'>
              <AlertCircle className='w-4 h-4 mr-2' />
              关于权限管理
            </h4>
            <p className='text-sm text-blue-700 dark:text-blue-400 mt-2'>
              权限是系统级配置，通常由开发人员在后端代码中预先定义。
              您可以在这里查看所有可用权限，并通过角色管理页面将权限分配给不同的角色。
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>创建新权限</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePermission}>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='create-name'>权限名称 *</Label>
                <Input
                  id='create-name'
                  type='text'
                  required
                  value={newPermission.name}
                  onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
                  placeholder='例如：文档读取'
                />
              </div>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='create-resource'>资源 *</Label>
                  <Input
                    id='create-resource'
                    type='text'
                    required
                    value={newPermission.resource}
                    onChange={(e) => setNewPermission({ ...newPermission, resource: e.target.value })}
                    placeholder='例如：doc'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='create-action'>操作 *</Label>
                  <Input
                    id='create-action'
                    type='text'
                    required
                    value={newPermission.action}
                    onChange={(e) => setNewPermission({ ...newPermission, action: e.target.value })}
                    placeholder='例如：read'
                  />
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='create-description'>描述</Label>
                <textarea
                  id='create-description'
                  value={newPermission.description}
                  onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
                  className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800'
                  rows={3}
                  placeholder='描述这个权限的用途'
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='secondary'
                onClick={() => {
                  setShowCreateModal(false);
                  setNewPermission({ name: '', resource: '', action: '', description: '' });
                }}
              >
                取消
              </Button>
              <Button type='submit'>创建</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PermissionManagementPage;
