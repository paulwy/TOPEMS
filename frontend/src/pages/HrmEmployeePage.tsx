import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Plus, Edit, Trash2, Eye, Mail, Phone, Briefcase, Building2 } from 'lucide-react';
import { employeeApi, departmentApi, type Employee, type PaginatedResult, type ListParams } from '../api/hrm';
import { useAppStore } from '../store';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/DataTable';
import { HrmLayout } from '../components/HrmLayout';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ModeToggle } from '@/components/ModeToggle';

const HrmEmployeePage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Employee>>({ items: [], total: 0, page: 1, page_size: 10 });
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [formData, setFormData] = useState<Partial<Employee>>({});

  const fetchEmployees = async (params?: ListParams) => {
    setLoading(true);
    try {
      const response = await employeeApi.list(params);
      if (response.code === 200 && response.data) {
        const data = response.data as any;
        setData({
          items: data.items || [],
          total: data.total || 0,
          page: data.page || 1,
          page_size: data.page_size || 10,
        });
      }
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '获取员工数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentApi.list({ page_size: 100 });
      if (response.code === 200 && response.data) {
        const data = response.data as any;
        setDepartments(data.departments || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch departments:', error);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const handleSearch = () => {
    fetchEmployees({ search: searchText, department_id: departmentFilter, status: statusFilter });
  };

  const handleReset = () => {
    setSearchText('');
    setDepartmentFilter('');
    setStatusFilter('');
    fetchEmployees();
  };

  const handleAdd = () => {
    setSelectedEmployee(null);
    setFormData({});
    setShowCreateModal(true);
  };

  const handleEdit = (record: Employee) => {
    setSelectedEmployee(record);
    setFormData(record);
    setShowEditModal(true);
  };

  const handleView = (record: Employee) => {
    setSelectedEmployee(record);
    setShowViewModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个员工吗？')) return;
    try {
      const response = await employeeApi.delete(id);
      if (response.code === 200) {
        addNotification({ title: '成功', message: '员工删除成功', type: 'success' });
        fetchEmployees();
      } else {
        addNotification({ title: '失败', message: '删除员工失败', type: 'error' });
      }
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '删除员工失败', type: 'error' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await employeeApi.create(formData);
      addNotification({ title: '成功', message: '员工创建成功', type: 'success' });
      setShowCreateModal(false);
      setFormData({});
      fetchEmployees();
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '创建员工失败', type: 'error' });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    try {
      await employeeApi.update(selectedEmployee.id, formData);
      addNotification({ title: '成功', message: '员工更新成功', type: 'success' });
      setShowEditModal(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '更新员工失败', type: 'error' });
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      inactive: 'secondary',
    };
    const labels: Record<string, string> = {
      active: '在职',
      inactive: '离职',
    };
    return <Badge variant={colors[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  const columns = useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        accessorKey: 'name',
        header: '员工信息',
        cell: ({ row }) => {
          return (
            <div className='flex items-center space-x-3'>
              <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center'>
                <Users className='w-5 h-5 text-blue-600 dark:text-blue-400' />
              </div>
              <div>
                <div className='font-medium text-gray-900 dark:text-gray-100'>{row.original.name}</div>
                {row.original.employee_number && (
                  <div className='text-sm text-gray-500 dark:text-gray-400'>{row.original.employee_number}</div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'department_id',
        header: '所属部门',
        cell: ({ row }) => {
          const dept = departments.find((d) => d.id === row.original.department_id);
          return (
            <div className='flex items-center space-x-2'>
              <Building2 className='w-4 h-4 text-gray-400' />
              <span>{dept?.name || '-'}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'position',
        header: '职位',
        cell: ({ row }) => (
          <div className='flex items-center space-x-2'>
            <Briefcase className='w-4 h-4 text-gray-400' />
            <span>{row.original.position || '-'}</span>
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: '邮箱',
        cell: ({ row }) => (
          <div className='flex items-center space-x-2'>
            <Mail className='w-4 h-4 text-gray-400' />
            <span className='text-sm'>{row.original.email || '-'}</span>
          </div>
        ),
      },
      {
        accessorKey: 'phone',
        header: '电话',
        cell: ({ row }) => (
          <div className='flex items-center space-x-2'>
            <Phone className='w-4 h-4 text-gray-400' />
            <span>{row.original.phone || '-'}</span>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => getStatusBadge(row.original.status),
      },
      {
        accessorKey: 'id',
        header: '操作',
        cell: ({ row }) => (
          <div className='flex items-center space-x-2'>
            <Button variant='ghost' size='icon' onClick={() => handleView(row.original)}>
              <Eye className='w-4 h-4' />
            </Button>
            <Button variant='ghost' size='icon' onClick={() => handleEdit(row.original)}>
              <Edit className='w-4 h-4' />
            </Button>
            <Button variant='ghost' size='icon' onClick={() => handleDelete(row.original.id)}>
              <Trash2 className='w-4 h-4' />
            </Button>
          </div>
        ),
      },
    ],
    [departments]
  );

  return (
    <HrmLayout title='员工管理' subtitle='管理企业员工信息'>
      <div className='bg-white rounded-lg shadow p-6'>
        <div className='flex items-center justify-between mb-6'>
          <div></div>
          <div className='flex items-center space-x-2'>
            <ModeToggle />
            <Button onClick={handleAdd}>
              <Plus className='w-5 h-5 mr-2' />
              新增员工
            </Button>
          </div>
        </div>

        <div className='space-y-6'>
          <Card className='mb-6'>
            <CardContent className='p-4'>
              <div className='flex flex-wrap gap-4'>
                <div className='flex-1 min-w-[200px] relative'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
                  <Input
                    placeholder='搜索员工姓名、工号、邮箱...'
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className='pl-10'
                  />
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className='w-[160px]'>
                    <SelectValue placeholder='全部部门' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=''>全部部门</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className='w-[140px]'>
                    <SelectValue placeholder='全部状态' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=''>全部状态</SelectItem>
                    <SelectItem value='active'>在职</SelectItem>
                    <SelectItem value='inactive'>离职</SelectItem>
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
                  <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent'></div>
                  <p className='mt-2 text-gray-500 dark:text-gray-400'>加载中...</p>
                </div>
              ) : data.items.length === 0 ? (
                <div className='p-8 text-center'>
                  <Users className='w-12 h-12 text-gray-400 mx-auto mb-3' />
                  <p className='text-gray-500 dark:text-gray-400'>暂无员工数据</p>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={data.items}
                  enablePagination={true}
                  pageCount={Math.ceil(data.total / data.page_size)}
                  onPageChange={(page) => fetchEmployees({ page })}
                  currentPage={data.page}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className='max-w-lg'>
            <DialogHeader>
              <DialogTitle>新增员工</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='create-name'>员工姓名 *</Label>
                    <Input
                      id='create-name'
                      type='text'
                      required
                      value={(formData as Employee)?.name || ''}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder='请输入员工姓名'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='create-number'>工号</Label>
                    <Input
                      id='create-number'
                      type='text'
                      value={(formData as Employee)?.employee_number || ''}
                      onChange={(e) => handleInputChange('employee_number', e.target.value)}
                      placeholder='请输入工号'
                    />
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='create-email'>邮箱</Label>
                    <Input
                      id='create-email'
                      type='email'
                      value={(formData as Employee)?.email || ''}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder='请输入邮箱'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='create-phone'>电话</Label>
                    <Input
                      id='create-phone'
                      type='text'
                      value={(formData as Employee)?.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder='请输入电话'
                    />
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='create-department'>所属部门</Label>
                  <Select
                    value={(formData as Employee)?.department_id || ''}
                    onValueChange={(value) => handleInputChange('department_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='请选择部门' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=''>无</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='create-position'>职位</Label>
                  <Input
                    id='create-position'
                    type='text'
                    value={(formData as Employee)?.position || ''}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    placeholder='请输入职位'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='create-hire-date'>入职日期</Label>
                  <Input
                    id='create-hire-date'
                    type='date'
                    value={(formData as Employee)?.hire_date || ''}
                    onChange={(e) => handleInputChange('hire_date', e.target.value)}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='create-status'>状态</Label>
                  <Select
                    value={(formData as Employee)?.status || 'active'}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='请选择' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='active'>在职</SelectItem>
                      <SelectItem value='inactive'>离职</SelectItem>
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
              <DialogTitle>编辑员工</DialogTitle>
            </DialogHeader>
            {selectedEmployee && (
              <form onSubmit={handleUpdate}>
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='edit-name'>员工姓名 *</Label>
                      <Input
                        id='edit-name'
                        type='text'
                        required
                        value={(formData as Employee)?.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='edit-number'>工号</Label>
                      <Input
                        id='edit-number'
                        type='text'
                        value={(formData as Employee)?.employee_number || ''}
                        onChange={(e) => handleInputChange('employee_number', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='edit-email'>邮箱</Label>
                      <Input
                        id='edit-email'
                        type='email'
                        value={(formData as Employee)?.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='edit-phone'>电话</Label>
                      <Input
                        id='edit-phone'
                        type='text'
                        value={(formData as Employee)?.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit-department'>所属部门</Label>
                    <Select
                      value={(formData as Employee)?.department_id || ''}
                      onValueChange={(value) => handleInputChange('department_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='请选择' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=''>无</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit-position'>职位</Label>
                    <Input
                      id='edit-position'
                      type='text'
                      value={(formData as Employee)?.position || ''}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit-status'>状态</Label>
                    <Select
                      value={(formData as Employee)?.status || 'active'}
                      onValueChange={(value) => handleInputChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='请选择' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='active'>在职</SelectItem>
                        <SelectItem value='inactive'>离职</SelectItem>
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
                      setSelectedEmployee(null);
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
              <DialogTitle>员工详情</DialogTitle>
            </DialogHeader>
            {selectedEmployee && (
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1'>
                    <Label className='text-gray-500'>员工姓名</Label>
                    <div className='font-medium'>{selectedEmployee.name}</div>
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-gray-500'>工号</Label>
                    <div className='font-medium'>{selectedEmployee.employee_number || '-'}</div>
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1'>
                    <Label className='text-gray-500'>邮箱</Label>
                    <div className='font-medium'>{selectedEmployee.email || '-'}</div>
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-gray-500'>电话</Label>
                    <div className='font-medium'>{selectedEmployee.phone || '-'}</div>
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1'>
                    <Label className='text-gray-500'>所属部门</Label>
                    <div className='font-medium'>
                      {departments.find((d) => d.id === selectedEmployee.department_id)?.name || '-'}
                    </div>
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-gray-500'>职位</Label>
                    <div className='font-medium'>{selectedEmployee.position || '-'}</div>
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-1'>
                    <Label className='text-gray-500'>入职日期</Label>
                    <div className='font-medium'>{selectedEmployee.hire_date || '-'}</div>
                  </div>
                  <div className='space-y-1'>
                    <Label className='text-gray-500'>状态</Label>
                    <div className='font-medium'>{getStatusBadge(selectedEmployee.status)}</div>
                  </div>
                </div>
                <div className='space-y-1'>
                  <Label className='text-gray-500'>创建时间</Label>
                  <div className='text-sm text-gray-500'>{selectedEmployee.created_at}</div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setShowViewModal(false)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </HrmLayout>
  );
};

export default HrmEmployeePage;
