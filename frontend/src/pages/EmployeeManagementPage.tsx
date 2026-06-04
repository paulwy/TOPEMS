import React, { useState, useEffect, useMemo } from 'react';
import { User, Search, Plus, Edit, Trash2, ChevronLeft, AlertCircle, Mail, Phone, Link, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { employeeApi, type Employee } from '../api/erp';
import { useAppStore } from '../store';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModeToggle } from '@/components/ModeToggle';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface EmployeeManagementPageProps {
  onNavigate?: (page: string) => void;
}

const EmployeeManagementPage: React.FC<EmployeeManagementPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [newEmployee, setNewEmployee] = useState<Partial<Employee> & { password: string }>({
    employee_number: '',
    name: '',
    gender: '',
    birth_date: '',
    hire_date: '',
    department_id: '',
    position: '',
    email: '',
    phone: '',
    status: 'active',
    password: '',
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employeeApi.list();
      if (res.success && res.data) {
        setEmployees(res.data.items || []);
      } else {
        setEmployees([]);
      }
    } catch (err: any) {
      setError(err.message || '加载员工列表失败');
      addNotification({ title: '加载失败', message: '加载员工列表失败', type: 'error' });
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await employeeApi.create(newEmployee);
      if (res.success) {
        addNotification({ title: '成功', message: '员工创建成功', type: 'success' });
        setShowCreateModal(false);
        setNewEmployee({
          employee_number: '',
          name: '',
          gender: '',
          birth_date: '',
          hire_date: '',
          department_id: '',
          position: '',
          email: '',
          phone: '',
          status: 'active',
          password: '',
        });
        loadEmployees();
      } else {
        addNotification({ title: '失败', message: res.message || '创建员工失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '创建员工失败', type: 'error' });
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('确定要删除这个员工吗？')) return;
    try {
      const res = await employeeApi.delete(id);
      if (res.success) {
        addNotification({ title: '成功', message: '员工删除成功', type: 'success' });
        loadEmployees();
      } else {
        addNotification({ title: '失败', message: res.message || '删除员工失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '删除员工失败', type: 'error' });
    }
  };

  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    try {
      const res = await employeeApi.update(selectedEmployee.id, selectedEmployee);
      if (res.success) {
        addNotification({ title: '成功', message: '员工信息更新成功', type: 'success' });
        setShowEditModal(false);
        setSelectedEmployee(null);
        loadEmployees();
      } else {
        addNotification({ title: '失败', message: res.message || '更新员工失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '失败', message: err.message || '更新员工失败', type: 'error' });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      inactive: 'secondary',
      archived: 'outline',
    };
    const labels: Record<string, string> = {
      active: '在职',
      inactive: '离职',
      archived: '归档',
    };
    return <Badge variant={colors[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  const columns = useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        accessorKey: 'name',
        header: '员工信息',
        cell: ({ row }) => {
          const emp = row.original;
          return (
            <div className='flex items-center space-x-3'>
              <Avatar>
                <AvatarFallback className='bg-blue-100 text-blue-700'>
                  {emp.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className='font-medium text-gray-900 dark:text-gray-100'>{emp.name}</div>
                <div className='text-sm text-gray-500 dark:text-gray-400'>{emp.employee_number}</div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'user_id',
        header: '系统账号',
        cell: ({ row }) => {
          const emp = row.original;
          return emp.user_id ? (
            <div className='flex items-center'>
              <Link className='w-3 h-3 text-blue-500 mr-1' />
              <span className='text-sm text-blue-600 dark:text-blue-400'>已关联</span>
            </div>
          ) : (
            <span className='text-sm text-gray-400 dark:text-gray-500 flex items-center'>
              <AlertCircle className='w-3 h-3 mr-1' />
              未关联
            </span>
          );
        },
      },
      {
        accessorKey: 'position',
        header: '职位',
        cell: ({ row }) => {
          return <div className='text-sm text-gray-900 dark:text-gray-100'>{row.original.position || '-'}</div>;
        },
      },
      {
        accessorKey: 'contact',
        header: '联系方式',
        cell: ({ row }) => {
          const emp = row.original;
          return (
            <div className='text-sm text-gray-900 dark:text-gray-100'>
              {emp.email && (
                <div className='flex items-center text-sm text-gray-600 dark:text-gray-400'>
                  <Mail className='w-3 h-3 mr-1' />
                  {emp.email}
                </div>
              )}
              {emp.phone && (
                <div className='flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1'>
                  <Phone className='w-3 h-3 mr-1' />
                  {emp.phone}
                </div>
              )}
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
        accessorKey: 'hire_date',
        header: '入职日期',
        cell: ({ row }) => {
          return (
            <span className='text-sm text-gray-500 dark:text-gray-400'>
              {row.original.hire_date ? new Date(row.original.hire_date).toLocaleDateString('zh-CN') : '-'}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => {
          const emp = row.original;
          return (
            <div className='flex items-center justify-end space-x-2'>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => {
                        setSelectedEmployee(emp);
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
                      onClick={() => handleDeleteEmployee(emp.id)}
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
                  <User className='w-7 h-7 mr-3 text-blue-600' />
                  员工管理
                </h1>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>管理员工信息、任职信息</p>
              </div>
            </div>
            <div className='flex items-center space-x-2'>
              <ModeToggle />
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className='w-5 h-5 mr-2' />
                新增员工
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
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
                <Button className='mt-4' onClick={loadEmployees}>
                  重试
                </Button>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={employees}
                searchPlaceholder='搜索员工姓名、工号、邮箱、电话、职位...'
                searchKey='name'
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
          <form onSubmit={handleCreateEmployee}>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='employee_number'>工号 *</Label>
                  <Input
                    id='employee_number'
                    type='text'
                    required
                    value={newEmployee.employee_number || ''}
                    onChange={(e) => setNewEmployee({ ...newEmployee, employee_number: e.target.value })}
                    placeholder='请输入工号'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='name'>姓名 *</Label>
                  <Input
                    id='name'
                    type='text'
                    required
                    value={newEmployee.name || ''}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    placeholder='请输入姓名'
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='gender'>性别</Label>
                  <Select
                    value={newEmployee.gender || ''}
                    onValueChange={(value) => setNewEmployee({ ...newEmployee, gender: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='请选择' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=''>请选择</SelectItem>
                      <SelectItem value='male'>男</SelectItem>
                      <SelectItem value='female'>女</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='position'>职位</Label>
                  <Input
                    id='position'
                    type='text'
                    value={newEmployee.position || ''}
                    onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                    placeholder='请输入职位'
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='birth_date'>出生日期</Label>
                  <Input
                    id='birth_date'
                    type='date'
                    value={newEmployee.birth_date || ''}
                    onChange={(e) => setNewEmployee({ ...newEmployee, birth_date: e.target.value })}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='hire_date'>入职日期</Label>
                  <Input
                    id='hire_date'
                    type='date'
                    value={newEmployee.hire_date || ''}
                    onChange={(e) => setNewEmployee({ ...newEmployee, hire_date: e.target.value })}
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='email'>邮箱</Label>
                  <Input
                    id='email'
                    type='email'
                    value={newEmployee.email || ''}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    placeholder='请输入邮箱'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='phone'>电话</Label>
                  <Input
                    id='phone'
                    type='text'
                    value={newEmployee.phone || ''}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                    placeholder='请输入电话'
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='password'>
                    <Key className='w-4 h-4 inline mr-1' />
                    登录密码 *
                  </Label>
                  <Input
                    id='password'
                    type='password'
                    required
                    value={newEmployee.password || ''}
                    onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                    placeholder='请输入登录密码'
                    minLength={6}
                  />
                  <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>至少6个字符，员工将用此密码登录系统</p>
                </div>
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
            <form onSubmit={handleEditEmployee}>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_employee_number'>工号 *</Label>
                    <Input
                      id='edit_employee_number'
                      type='text'
                      required
                      value={selectedEmployee.employee_number}
                      onChange={(e) => setSelectedEmployee({ ...selectedEmployee, employee_number: e.target.value })}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_name'>姓名 *</Label>
                    <Input
                      id='edit_name'
                      type='text'
                      required
                      value={selectedEmployee.name}
                      onChange={(e) => setSelectedEmployee({ ...selectedEmployee, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_gender'>性别</Label>
                    <Select
                      value={selectedEmployee.gender || ''}
                      onValueChange={(value) => setSelectedEmployee({ ...selectedEmployee, gender: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='请选择' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=''>请选择</SelectItem>
                        <SelectItem value='male'>男</SelectItem>
                        <SelectItem value='female'>女</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_position'>职位</Label>
                    <Input
                      id='edit_position'
                      type='text'
                      value={selectedEmployee.position || ''}
                      onChange={(e) => setSelectedEmployee({ ...selectedEmployee, position: e.target.value })}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_birth_date'>出生日期</Label>
                    <Input
                      id='edit_birth_date'
                      type='date'
                      value={selectedEmployee.birth_date || ''}
                      onChange={(e) => setSelectedEmployee({ ...selectedEmployee, birth_date: e.target.value })}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_hire_date'>入职日期</Label>
                    <Input
                      id='edit_hire_date'
                      type='date'
                      value={selectedEmployee.hire_date || ''}
                      onChange={(e) => setSelectedEmployee({ ...selectedEmployee, hire_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_email'>邮箱</Label>
                    <Input
                      id='edit_email'
                      type='email'
                      value={selectedEmployee.email || ''}
                      onChange={(e) => setSelectedEmployee({ ...selectedEmployee, email: e.target.value })}
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='edit_phone'>电话</Label>
                    <Input
                      id='edit_phone'
                      type='text'
                      value={selectedEmployee.phone || ''}
                      onChange={(e) => setSelectedEmployee({ ...selectedEmployee, phone: e.target.value })}
                    />
                  </div>
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
    </div>
  );
};

export default EmployeeManagementPage;
