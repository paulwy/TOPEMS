import React, { useState, useEffect, useMemo } from 'react';
import { Building2, Search, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { departmentApi, type Department, type PaginatedResult, type ListParams } from '../api/hrm';
import { useAppStore } from '../store';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/DataTable';
import { HrmLayout } from '../components/HrmLayout';

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

const HrmDepartmentPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Department>>({ items: [], total: 0, page: 1, page_size: 10 });
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  const [formData, setFormData] = useState<Partial<Department>>({});
  const [departmentsList, setDepartmentsList] = useState<{ id: string; name: string }[]>([]);

  const fetchDepartments = async (params?: ListParams) => {
    setLoading(true);
    try {
      const response = await departmentApi.list(params);
      if (response.code === 200 && response.data) {
        const data = response.data as any;
        setData({
          items: data.items || [],
          total: data.total || 0,
          page: data.page || 1,
          page_size: data.page_size || 10,
        });
        
        const items = data.items || [];
        setDepartmentsList(items.map((d: any) => ({ id: d.id, name: d.name })));
      } else {
        setData({ items: [], total: 0, page: 1, page_size: 10 });
        setDepartmentsList([]);
      }
    } catch (error: any) {
      addNotification({ title: '加载失败', message: error.message || '获取部门列表失败', type: 'error' });
      setData({ items: [], total: 0, page: 1, page_size: 10 });
      setDepartmentsList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleSearch = () => {
    fetchDepartments({
      page: 1,
      search: searchText || undefined,
      status: statusFilter || undefined,
    });
  };

  const handleReset = () => {
    setSearchText('');
    setStatusFilter('');
    fetchDepartments({ page: 1 });
  };

  const handleAdd = () => {
    setSelectedDepartment(null);
    setFormData({});
    setShowCreateModal(true);
  };

  const handleEdit = (record: Department) => {
    setSelectedDepartment(record);
    setFormData(record);
    setShowEditModal(true);
  };

  const handleView = (record: Department) => {
    setSelectedDepartment(record);
    setShowViewModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个部门吗？')) return;
    try {
      const response = await departmentApi.delete(id);
      if (response.code === 200) {
        addNotification({ title: '成功', message: '部门删除成功', type: 'success' });
        fetchDepartments();
      } else {
        addNotification({ title: '失败', message: '删除部门失败', type: 'error' });
      }
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '删除部门失败', type: 'error' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await departmentApi.create(formData);
      addNotification({ title: '成功', message: '部门创建成功', type: 'success' });
      setShowCreateModal(false);
      setFormData({});
      fetchDepartments();
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '创建部门失败', type: 'error' });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepartment) return;
    try {
      await departmentApi.update(selectedDepartment.id, formData);
      addNotification({ title: '成功', message: '部门更新成功', type: 'success' });
      setShowEditModal(false);
      setSelectedDepartment(null);
      fetchDepartments();
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '更新部门失败', type: 'error' });
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      inactive: 'secondary',
    };
    const labels: Record<string, string> = {
      active: '启用',
      inactive: '禁用',
    };
    return <Badge variant={colors[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  const columns = useMemo<ColumnDef<Department>[]>(
    () => [
      {
        accessorKey: 'name',
        header: '部门名称',
        cell: ({ row }) => {
          return (
            <div className='flex items-center space-x-3'>
              <div className='w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center'>
                <Building2 className='w-5 h-5 text-emerald-600 dark:text-emerald-400' />
              </div>
              <div>
                <div className='font-medium text-gray-900 dark:text-gray-100'>{row.original.name}</div>
                {row.original.code && (
                  <div className='text-sm text-gray-500 dark:text-gray-400'>{row.original.code}</div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'parent_id',
        header: '上级部门',
        cell: ({ row }) => {
          const parent = departmentsList.find((d) => d.id === row.original.parent_id);
          return (
            <span className='text-sm text-gray-900 dark:text-gray-100'>{parent?.name || '-'}</span>
          );
        },
      },
      {
        accessorKey: 'description',
        header: '描述',
        cell: ({ row }) => (
          <span className='text-sm text-gray-900 dark:text-gray-100 truncate max-w-[200px]'>
            {row.original.description || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
          const department = row.original;
          return (
            <div className='flex items-center justify-end space-x-2'>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant='ghost' size='sm' onClick={() => handleView(department)}>
                      <Eye className='w-4 h-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>查看</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant='ghost' size='sm' onClick={() => handleEdit(department)}>
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
                      onClick={() => handleDelete(department.id)}
                    >
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>删除</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        },
      },
    ],
    [departmentsList]
  );

  return (
    <HrmLayout title='部门管理' subtitle='管理企业组织架构'>
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='flex items-center justify-between mb-6'>
          <div></div>
          <div className='flex items-center space-x-2'>
            <ModeToggle />
            <Button onClick={handleAdd}>
              <Plus className='w-5 h-5 mr-2' />
              新增部门
            </Button>
          </div>
        </div>

        <div className='space-y-6'>
          <Card className='mb-6'>
            <CardContent className='p-4'>
              <div className='flex flex-wrap gap-4'>
                <div className='flex-1 min-w-[200px] relative'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
                  <Input
                    type='text'
                    placeholder='搜索部门名称或编码'
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className='pl-10'
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className='w-[140px]'>
                    <SelectValue placeholder='全部状态' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>全部状态</SelectItem>
                    <SelectItem value='active'>启用</SelectItem>
                    <SelectItem value='inactive'>禁用</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant='secondary' onClick={handleSearch}>
                  搜索
                </Button>
                <Button variant='outline' onClick={handleReset}>
                  重置
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className='p-0'>
              {loading ? (
                <div className='p-8 text-center'>
                  <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent'></div>
                  <p className='mt-2 text-gray-500 dark:text-gray-400'>加载中...</p>
                </div>
              ) : data.items.length === 0 ? (
                <div className='p-8 text-center'>
                  <Building2 className='w-12 h-12 text-gray-400 mx-auto mb-3' />
                  <p className='text-gray-500 dark:text-gray-400'>暂无部门数据</p>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={data.items}
                  enablePagination={true}
                  pageCount={Math.ceil(data.total / data.page_size)}
                  onPageChange={(page) => fetchDepartments({ page })}
                  currentPage={data.page}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className='max-w-lg'>
            <DialogHeader>
              <DialogTitle>新增部门</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='create-name'>部门名称 *</Label>
                  <Input
                    id='create-name'
                    type='text'
                    required
                    value={(formData as Department)?.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder='请输入部门名称'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='create-code'>部门编码</Label>
                  <Input
                    id='create-code'
                    type='text'
                    value={(formData as Department)?.code || ''}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                    placeholder='请输入部门编码'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='create-parent'>上级部门</Label>
                  <Select
                    value={(formData as Department)?.parent_id || ''}
                    onValueChange={(value) => handleInputChange('parent_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='请选择' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='none'>无</SelectItem>
                      {departmentsList
                        .filter((d) => !selectedDepartment || d.id !== selectedDepartment.id)
                        .map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='create-description'>部门描述</Label>
                  <Textarea
                    id='create-description'
                    value={(formData as Department)?.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    placeholder='请输入部门描述'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='create-status'>状态</Label>
                  <Select
                    value={(formData as Department)?.status || 'active'}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='请选择' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='active'>启用</SelectItem>
                      <SelectItem value='inactive'>禁用</SelectItem>
                    </SelectContent>
                  </Select>
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
              <form onSubmit={handleUpdate}>
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='edit-name'>部门名称 *</Label>
                    <Input
                      id='edit-name'
                      type='text'
                      required
                      value={(formData as Department)?.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit-code'>部门编码</Label>
                    <Input
                      id='edit-code'
                      type='text'
                      value={(formData as Department)?.code || ''}
                      onChange={(e) => handleInputChange('code', e.target.value)}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit-parent'>上级部门</Label>
                    <Select
                      value={(formData as Department)?.parent_id || ''}
                      onValueChange={(value) => handleInputChange('parent_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='请选择' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='none'>无</SelectItem>
                        {departmentsList
                          .filter((d) => d.id !== selectedDepartment.id)
                          .map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit-description'>部门描述</Label>
                    <Textarea
                      id='edit-description'
                      value={(formData as Department)?.description || ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit-status'>状态</Label>
                    <Select
                      value={(formData as Department)?.status || 'active'}
                      onValueChange={(value) => handleInputChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='请选择' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='active'>启用</SelectItem>
                        <SelectItem value='inactive'>禁用</SelectItem>
                      </SelectContent>
                    </Select>
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

        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className='max-w-lg'>
            <DialogHeader>
              <DialogTitle>部门详情</DialogTitle>
            </DialogHeader>
            {selectedDepartment && (
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label>部门名称</Label>
                  <div className='text-sm text-gray-900 dark:text-gray-100'>{selectedDepartment.name}</div>
                </div>
                {selectedDepartment.code && (
                  <div className='space-y-2'>
                    <Label>部门编码</Label>
                    <div className='text-sm text-gray-900 dark:text-gray-100'>{selectedDepartment.code}</div>
                  </div>
                )}
                {selectedDepartment.parent_id && (
                  <div className='space-y-2'>
                    <Label>上级部门</Label>
                    <div className='text-sm text-gray-900 dark:text-gray-100'>
                      {departmentsList.find((d) => d.id === selectedDepartment.parent_id)?.name || '-'}
                    </div>
                  </div>
                )}
                {selectedDepartment.description && (
                  <div className='space-y-2'>
                    <Label>部门描述</Label>
                    <div className='text-sm text-gray-900 dark:text-gray-100'>{selectedDepartment.description}</div>
                  </div>
                )}
                <div className='space-y-2'>
                  <Label>状态</Label>
                  <div>{getStatusBadge(selectedDepartment.status)}</div>
                </div>
              </div>
            )}
            <DialogFooter className='mt-6'>
              <Button type='button' variant='secondary' onClick={() => setShowViewModal(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </HrmLayout>
  );
};

export default HrmDepartmentPage;
