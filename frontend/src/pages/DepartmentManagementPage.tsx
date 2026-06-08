import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  XCircle,
  Folder,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { departmentApi, type Department } from '../api/hrm';
import { useAppStore } from '../store';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ModeToggle } from '@/components/ModeToggle';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DepartmentManagementPageProps {
  onNavigate?: (page: string) => void;
}

const DepartmentManagementPage: React.FC<DepartmentManagementPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  const [newDepartment, setNewDepartment] = useState<Partial<Department>>({
    name: '',
    code: '',
    parent_id: '',
    company_id: '',
    description: '',
    status: 'active',
  });

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await departmentApi.list();
      if (res.success && res.data) {
        setDepartments(res.data.items || []);
      } else {
        setDepartments([]);
      }
    } catch (err: any) {
      setError(err.message || '加载部门列表失败');
      addNotification({ title: '加载失败', message: '加载部门列表失败', type: 'error' });
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await departmentApi.create(newDepartment);
      if (res.success) {
        addNotification({ title: '成功', message: '部门创建成功', type: 'success' });
        setShowCreateModal(false);
        setNewDepartment({
          name: '',
          code: '',
          parent_id: '',
          company_id: '',
          description: '',
          status: 'active',
        });
        loadDepartments();
      } else {
        addNotification({ title: '失败', message: res.message || '创建部门失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '创建部门失败', type: 'error' });
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm('确定要删除这个部门吗？')) return;
    try {
      const res = await departmentApi.delete(id);
      if (res.success) {
        addNotification({ title: '成功', message: '部门删除成功', type: 'success' });
        loadDepartments();
      } else {
        addNotification({ title: '失败', message: res.message || '删除部门失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '删除部门失败', type: 'error' });
    }
  };

  const handleEditDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartment) return;
    try {
      const res = await departmentApi.update(selectedDepartment.id, selectedDepartment);
      if (res.success) {
        addNotification({ title: '成功', message: '部门信息更新成功', type: 'success' });
        setShowEditModal(false);
        setSelectedDepartment(null);
        loadDepartments();
      } else {
        addNotification({ title: '失败', message: res.message || '更新部门失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '更新部门失败', type: 'error' });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      inactive: 'secondary',
      archived: 'outline',
    };
    const labels: Record<string, string> = {
      active: '活跃',
      inactive: '停用',
      archived: '归档',
    };
    return <Badge variant={colors[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const buildDepartmentTree = (depts: Department[]): Department[] => {
    const deptMap = new Map<string, Department & { children?: Department[] }>();

    depts.forEach((dept) => {
      deptMap.set(dept.id, { ...dept, children: [] });
    });

    const rootDepts: (Department & { children?: Department[] })[] = [];

    depts.forEach((dept) => {
      const deptWithChildren = deptMap.get(dept.id)!;
      if (dept.parent_id && deptMap.has(dept.parent_id)) {
        deptMap.get(dept.parent_id)!.children!.push(deptWithChildren);
      } else {
        rootDepts.push(deptWithChildren);
      }
    });

    return rootDepts;
  };

  const renderDepartmentTree = (depts: Department[], level: number = 0) => {
    return depts.map((dept) => (
      <div key={dept.id} className='group'>
        <div
          className={`flex items-center justify-between p-4 rounded-lg ${level > 0 ? 'ml-8 border-l-2 border-gray-200 dark:border-gray-700' : ''}`}
        >
          <div className='flex items-center space-x-3'>
            <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center'>
              <Folder className='w-5 h-5 text-blue-600 dark:text-blue-400' />
            </div>
            <div>
              <div className='flex items-center space-x-2'>
                <h4 className='font-medium text-gray-900 dark:text-gray-100'>{dept.name}</h4>
                {dept.code && <span className='text-sm text-gray-500 dark:text-gray-400'>({dept.code})</span>}
                {getStatusBadge(dept.status)}
              </div>
              {dept.description && <p className='text-sm text-gray-500 dark:text-gray-400'>{dept.description}</p>}
            </div>
          </div>

          <div className='opacity-0 group-hover:opacity-100 flex items-center space-x-2 transition-opacity'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      setSelectedDepartment(dept);
                      setShowEditModal(true);
                    }}
                  >
                    <Edit className='w-4 h-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>编辑</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='text-red-600 hover:text-red-700 dark:text-red-400'
                    onClick={() => handleDeleteDepartment(dept.id)}
                  >
                    <Trash2 className='w-4 h-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>删除</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {(dept as any).children?.length > 0 && renderDepartmentTree((dept as any).children, level + 1)}
      </div>
    ));
  };

  const columns = useMemo<ColumnDef<Department>[]>(
    () => [
      {
        accessorKey: 'name',
        header: '部门名称',
        cell: ({ row }) => {
          const dept = row.original;
          return (
            <div className='flex items-center space-x-3'>
              <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center'>
                <Folder className='w-5 h-5 text-blue-600 dark:text-blue-400' />
              </div>
              <div>
                <div className='font-medium text-gray-900 dark:text-gray-100'>{dept.name}</div>
                {dept.code && <div className='text-sm text-gray-500 dark:text-gray-400'>{dept.code}</div>}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        accessorKey: 'description',
        header: '描述',
        cell: ({ row }) => (
          <span className='text-sm text-gray-500 dark:text-gray-400'>{row.original.description || '-'}</span>
        ),
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
          const dept = row.original;
          return (
            <div className='flex items-center justify-end space-x-2'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => {
                  setSelectedDepartment(dept);
                  setShowEditModal(true);
                }}
              >
                <Edit className='w-4 h-4' />
              </Button>
              <Button
                variant='ghost'
                size='sm'
                className='text-red-600 hover:text-red-700 dark:text-red-400'
                onClick={() => handleDeleteDepartment(dept.id)}
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
      <div className='bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <Button variant='ghost' onClick={() => navigate('/dashboard')}>
                <ChevronLeft className='w-5 h-5' />
              </Button>
              <div>
                <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center'>
                  <Building2 className='w-7 h-7 mr-3 text-blue-600' />
                  部门管理
                </h1>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>管理组织架构、层级关系</p>
              </div>
            </div>
            <div className='flex items-center space-x-2'>
              <ModeToggle />
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className='w-5 h-5 mr-2' />
                新增部门
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
              placeholder='搜索部门名称、编码、描述...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-10'
            />
          </div>
          <Button variant='secondary' onClick={loadDepartments}>
            刷新
          </Button>
        </div>

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
                <Button className='mt-4' onClick={loadDepartments}>
                  重试
                </Button>
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className='p-8 text-center'>
                <Building2 className='w-12 h-12 text-gray-400 mx-auto mb-3' />
                <p className='text-gray-500 dark:text-gray-400'>暂无部门数据</p>
              </div>
            ) : (
              <div className='p-6'>{renderDepartmentTree(buildDepartmentTree(filteredDepartments))}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>新增部门</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateDepartment}>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='name'>部门名称 *</Label>
                  <Input
                    id='name'
                    type='text'
                    required
                    value={newDepartment.name || ''}
                    onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                    placeholder='请输入部门名称'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='code'>部门编码</Label>
                  <Input
                    id='code'
                    type='text'
                    value={newDepartment.code || ''}
                    onChange={(e) => setNewDepartment({ ...newDepartment, code: e.target.value })}
                    placeholder='请输入部门编码'
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='parent'>上级部门</Label>
                <Select
                  value={newDepartment.parent_id || ''}
                  onValueChange={(value) => setNewDepartment({ ...newDepartment, parent_id: value || undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='无（顶级部门）' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>无（顶级部门）</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='description'>描述</Label>
                <Textarea
                  id='description'
                  value={newDepartment.description || ''}
                  onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                  rows={3}
                  placeholder='请输入部门描述'
                />
              </div>
            </div>

            <DialogFooter className='mt-6'>
              <Button type='button' variant='secondary' onClick={() => setShowCreateModal(false)}>
                取消
              </Button>
              <Button type='submit'>创建</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>编辑部门</DialogTitle>
          </DialogHeader>
          {selectedDepartment && (
            <form onSubmit={handleEditDepartment}>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='edit-name'>部门名称 *</Label>
                    <Input
                      id='edit-name'
                      type='text'
                      required
                      value={selectedDepartment.name}
                      onChange={(e) => setSelectedDepartment({ ...selectedDepartment, name: e.target.value })}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit-code'>部门编码</Label>
                    <Input
                      id='edit-code'
                      type='text'
                      value={selectedDepartment.code || ''}
                      onChange={(e) => setSelectedDepartment({ ...selectedDepartment, code: e.target.value })}
                    />
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='edit-parent'>上级部门</Label>
                  <Select
                    value={selectedDepartment.parent_id || ''}
                    onValueChange={(value) =>
                      setSelectedDepartment({ ...selectedDepartment, parent_id: value || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='无（顶级部门）' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='none'>无（顶级部门）</SelectItem>
                      {departments
                        .filter((d) => d.id !== selectedDepartment.id)
                        .map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='edit-description'>描述</Label>
                  <Textarea
                    id='edit-description'
                    value={selectedDepartment.description || ''}
                    onChange={(e) => setSelectedDepartment({ ...selectedDepartment, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter className='mt-6'>
                <Button
                  type='button'
                  variant='secondary'
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedDepartment(null);
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
    </div>
  );
};

export default DepartmentManagementPage;
