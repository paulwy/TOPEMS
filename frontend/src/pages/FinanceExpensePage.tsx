import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  Check,
  Clock,
  AlertCircle,
  Send,
  DollarSign,
  Calendar,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { expenseApi, employeeApi, departmentApi, type Expense, type Employee, type Department } from '../api/erp';
import { useAppStore } from '../store';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ModeToggle } from '@/components/ModeToggle';
import { Badge } from '@/components/ui/badge';

const FinanceExpensePage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterStatus, setFilterStatus] = useState('');

  const [newExpense, setNewExpense] = useState({
    expense_number: '',
    applicant_name: '',
    department_id: '',
    expense_type: '',
    amount: 0,
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
    receipt_count: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expenseRes, empRes, deptRes] = await Promise.all([
        expenseApi.list(),
        employeeApi.list(),
        departmentApi.list(),
      ]);

      if (expenseRes.success && expenseRes.data) {
        setExpenses(expenseRes.data.items || []);
      }
      if (empRes.success && empRes.data) {
        setEmployees(empRes.data.items || []);
      }
      if (deptRes.success && deptRes.data) {
        setDepartments(deptRes.data.items || []);
      }
    } catch (err: any) {
      addNotification({ title: '加载失败', message: err.message || '加载数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<
      string,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; icon: React.ReactNode }
    > = {
      pending: { variant: 'secondary', label: '待审批', icon: <Clock className='w-3 h-3 mr-1' /> },
      approved: { variant: 'default', label: '已审批', icon: <Check className='w-3 h-3 mr-1' /> },
      reimbursed: { variant: 'default', label: '已报销', icon: <DollarSign className='w-3 h-3 mr-1' /> },
      rejected: { variant: 'destructive', label: '已拒绝', icon: <AlertCircle className='w-3 h-3 mr-1' /> },
    };

    const config = badges[status] || { variant: 'outline' as const, label: status, icon: null };
    return (
      <Badge variant={config.variant}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getEmployeeName = (name: string) => {
    return name || '-';
  };

  const getDepartmentName = (id: string) => {
    const dept = departments.find((d) => d.id === id);
    return dept?.name || '-';
  };

  const getExpenseTypeName = (type: string) => {
    const types: Record<string, string> = {
      travel: '差旅费',
      office: '办公费',
      meal: '餐费',
      transportation: '交通费',
      communication: '通讯费',
      training: '培训费',
      other: '其他',
    };
    return types[type] || type;
  };

  const handleCreate = async () => {
    try {
      const res = await expenseApi.create({
        expense_number: newExpense.expense_number,
        applicant_name: newExpense.applicant_name || undefined,
        department_id: newExpense.department_id || undefined,
        expense_type: newExpense.expense_type || undefined,
        amount: newExpense.amount,
        description: newExpense.description || undefined,
        expense_date: newExpense.expense_date || undefined,
        receipt_count: newExpense.receipt_count,
      });

      if (res.success) {
        addNotification({ title: '成功', message: '费用报销创建成功', type: 'success' });
        setShowCreateModal(false);
        setNewExpense({
          expense_number: '',
          applicant_name: '',
          department_id: '',
          expense_type: '',
          amount: 0,
          description: '',
          expense_date: new Date().toISOString().split('T')[0],
          receipt_count: 0,
        });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '创建失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '错误', message: err.message || '创建失败', type: 'error' });
    }
  };

  const handleUpdate = async () => {
    if (!editingExpense) return;

    try {
      const res = await expenseApi.update(editingExpense.id, {
        applicant_name: editingExpense.applicant_name || undefined,
        department_id: editingExpense.department_id || undefined,
        expense_type: editingExpense.expense_type || undefined,
        amount: editingExpense.amount,
        description: editingExpense.description || undefined,
        expense_date: editingExpense.expense_date || undefined,
        receipt_count: editingExpense.receipt_count,
        status: editingExpense.status,
      });

      if (res.success) {
        addNotification({ title: '成功', message: '费用报销更新成功', type: 'success' });
        setEditingExpense(null);
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '更新失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '错误', message: err.message || '更新失败', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条费用报销记录吗？')) return;

    try {
      const res = await expenseApi.delete(id);
      if (res.success) {
        addNotification({ title: '成功', message: '费用报销删除成功', type: 'success' });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '删除失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '错误', message: err.message || '删除失败', type: 'error' });
    }
  };

  const handleApprove = async (expense: Expense) => {
    try {
      const res = await expenseApi.update(expense.id, {
        status: 'approved',
      });

      if (res.success) {
        addNotification({ title: '成功', message: '已审批通过', type: 'success' });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '审批失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '错误', message: err.message || '审批失败', type: 'error' });
    }
  };

  const filteredExpenses = useMemo(() => {
    if (!filterStatus) return expenses;
    return expenses.filter((e) => e.status === filterStatus);
  }, [expenses, filterStatus]);

  const columns = useMemo<ColumnDef<Expense>[]>(
    () => [
      {
        accessorKey: 'expense_number',
        header: '报销编号',
        cell: ({ row }) => <div className='font-medium text-blue-600'>{row.original.expense_number}</div>,
      },
      {
        accessorKey: 'applicant_name',
        header: '申请人',
        cell: ({ row }) => (
          <div className='flex items-center text-slate-900 dark:text-slate-100'>
            <User className='w-4 h-4 mr-2 text-blue-500' />
            {getEmployeeName(row.original.applicant_name || '')}
          </div>
        ),
      },
      {
        accessorKey: 'department_id',
        header: '部门',
        cell: ({ row }) => (
          <div className='text-slate-900 dark:text-slate-100'>
            {getDepartmentName(row.original.department_id || '')}
          </div>
        ),
      },
      {
        accessorKey: 'expense_type',
        header: '费用类型',
        cell: ({ row }) => (
          <div className='text-slate-900 dark:text-slate-100'>
            {getExpenseTypeName(row.original.expense_type || '')}
          </div>
        ),
      },
      {
        accessorKey: 'amount',
        header: '金额',
        cell: ({ row }) => <div className='font-bold text-green-600'>¥{row.original.amount.toLocaleString()}</div>,
      },
      {
        accessorKey: 'expense_date',
        header: '日期',
        cell: ({ row }) => (
          <div className='flex items-center text-slate-600 dark:text-slate-400 text-sm'>
            <Calendar className='w-3 h-3 mr-1' />
            {row.original.expense_date?.split('T')[0] || '-'}
          </div>
        ),
      },
      {
        accessorKey: 'receipt_count',
        header: '票据数',
        cell: ({ row }) => (
          <div className='text-slate-900 dark:text-slate-100'>{row.original.receipt_count || 0} 张</div>
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
          const expense = row.original;
          return (
            <div className='flex items-center space-x-2'>
              {expense.status === 'pending' && (
                <Button variant='ghost' size='sm' className='text-green-600' onClick={() => handleApprove(expense)}>
                  <Check className='w-4 h-4' />
                </Button>
              )}
              <Button variant='ghost' size='sm' onClick={() => setEditingExpense(expense)}>
                <Edit className='w-4 h-4' />
              </Button>
              <Button variant='ghost' size='sm' className='text-red-600' onClick={() => handleDelete(expense.id)}>
                <Trash2 className='w-4 h-4' />
              </Button>
            </div>
          );
        },
      },
    ],
    [departments]
  );

  const pendingCount = expenses.filter((e) => e.status === 'pending').length;
  const approvedCount = expenses.filter((e) => e.status === 'approved').length;
  const reimbursedCount = expenses.filter((e) => e.status === 'reimbursed').length;
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className='min-h-screen bg-slate-50 dark:bg-slate-900'>
      <div className='bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <Button variant='ghost' onClick={() => navigate('/dashboard')}>
                <ChevronLeft className='w-5 h-5' />
              </Button>
              <div>
                <h1 className='text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center'>
                  <FileText className='w-7 h-7 mr-3 text-indigo-600' />
                  费用报销
                </h1>
                <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>管理员工费用报销申请，审批报销流程</p>
              </div>
            </div>
            <div className='flex items-center space-x-2'>
              <ModeToggle />
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className='w-5 h-5 mr-2' />
                新建报销
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-6'>
          <Card>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-slate-600 dark:text-slate-400'>待审批</p>
                  <p className='text-2xl font-bold text-orange-600 mt-2'>{pendingCount}</p>
                </div>
                <div className='p-3 bg-orange-100 dark:bg-orange-900 rounded-full'>
                  <Clock className='w-6 h-6 text-orange-600' />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-slate-600 dark:text-slate-400'>已审批</p>
                  <p className='text-2xl font-bold text-blue-600 mt-2'>{approvedCount}</p>
                </div>
                <div className='p-3 bg-blue-100 dark:bg-blue-900 rounded-full'>
                  <Check className='w-6 h-6 text-blue-600' />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-slate-600 dark:text-slate-400'>已报销</p>
                  <p className='text-2xl font-bold text-green-600 mt-2'>{reimbursedCount}</p>
                </div>
                <div className='p-3 bg-green-100 dark:bg-green-900 rounded-full'>
                  <DollarSign className='w-6 h-6 text-green-600' />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-slate-600 dark:text-slate-400'>总金额</p>
                  <p className='text-2xl font-bold text-purple-600 mt-2'>¥{totalAmount.toLocaleString()}</p>
                </div>
                <div className='p-3 bg-purple-100 dark:bg-purple-900 rounded-full'>
                  <Send className='w-6 h-6 text-purple-600' />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className='flex items-center justify-between mb-4'>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className='w-32'>
              <SelectValue placeholder='全部状态' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>全部状态</SelectItem>
              <SelectItem value='pending'>待审批</SelectItem>
              <SelectItem value='approved'>已审批</SelectItem>
              <SelectItem value='reimbursed'>已报销</SelectItem>
              <SelectItem value='rejected'>已拒绝</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className='p-0'>
            {loading ? (
              <div className='p-8 text-center'>
                <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent' />
                <p className='mt-2 text-slate-500 dark:text-slate-400'>加载中...</p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredExpenses}
                searchPlaceholder='搜索报销编号、申请人...'
                searchKey='expense_number'
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>新建费用报销</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='expense-number'>报销编号 *</Label>
                <Input
                  id='expense-number'
                  type='text'
                  required
                  value={newExpense.expense_number}
                  onChange={(e) => setNewExpense({ ...newExpense, expense_number: e.target.value })}
                  placeholder='请输入报销编号'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='applicant'>申请人</Label>
                <Input
                  id='applicant'
                  type='text'
                  value={newExpense.applicant_name}
                  onChange={(e) => setNewExpense({ ...newExpense, applicant_name: e.target.value })}
                  placeholder='请输入申请人姓名'
                />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='department'>部门</Label>
                <Select
                  value={newExpense.department_id}
                  onValueChange={(value) => setNewExpense({ ...newExpense, department_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='选择部门' />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='type'>费用类型</Label>
                <Select
                  value={newExpense.expense_type}
                  onValueChange={(value) => setNewExpense({ ...newExpense, expense_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='选择类型' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='travel'>差旅费</SelectItem>
                    <SelectItem value='office'>办公费</SelectItem>
                    <SelectItem value='meal'>餐费</SelectItem>
                    <SelectItem value='transportation'>交通费</SelectItem>
                    <SelectItem value='communication'>通讯费</SelectItem>
                    <SelectItem value='training'>培训费</SelectItem>
                    <SelectItem value='other'>其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='amount'>金额 *</Label>
                <Input
                  id='amount'
                  type='number'
                  min='0'
                  step='0.01'
                  required
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                  placeholder='请输入金额'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='date'>日期</Label>
                <Input
                  id='date'
                  type='date'
                  value={newExpense.expense_date}
                  onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='receipts'>票据数量</Label>
              <Input
                id='receipts'
                type='number'
                min='0'
                value={newExpense.receipt_count}
                onChange={(e) => setNewExpense({ ...newExpense, receipt_count: parseInt(e.target.value) || 0 })}
                placeholder='请输入票据数量'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='description'>备注</Label>
              <Textarea
                id='description'
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                placeholder='请输入报销说明...'
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowCreateModal(false)}>
              取消
            </Button>
            <Button onClick={handleCreate}>提交申请</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>编辑费用报销</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <div className='space-y-4 py-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='edit-expense-number'>报销编号</Label>
                  <Input id='edit-expense-number' type='text' value={editingExpense.expense_number} readOnly />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='edit-applicant'>申请人</Label>
                  <Input
                    id='edit-applicant'
                    type='text'
                    value={editingExpense.applicant_name || ''}
                    onChange={(e) => setEditingExpense({ ...editingExpense, applicant_name: e.target.value })}
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='edit-department'>部门</Label>
                  <Select
                    value={editingExpense.department_id || ''}
                    onValueChange={(value) =>
                      setEditingExpense({ ...editingExpense, department_id: value || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='选择部门' />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='edit-type'>费用类型</Label>
                  <Select
                    value={editingExpense.expense_type || ''}
                    onValueChange={(value) =>
                      setEditingExpense({ ...editingExpense, expense_type: value || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='选择类型' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='travel'>差旅费</SelectItem>
                      <SelectItem value='office'>办公费</SelectItem>
                      <SelectItem value='meal'>餐费</SelectItem>
                      <SelectItem value='transportation'>交通费</SelectItem>
                      <SelectItem value='communication'>通讯费</SelectItem>
                      <SelectItem value='training'>培训费</SelectItem>
                      <SelectItem value='other'>其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='edit-amount'>金额</Label>
                  <Input
                    id='edit-amount'
                    type='number'
                    min='0'
                    step='0.01'
                    value={editingExpense.amount}
                    onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='edit-date'>日期</Label>
                  <Input
                    id='edit-date'
                    type='date'
                    value={editingExpense.expense_date?.split('T')[0] || ''}
                    onChange={(e) =>
                      setEditingExpense({ ...editingExpense, expense_date: e.target.value || undefined })
                    }
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='edit-receipts'>票据数量</Label>
                  <Input
                    id='edit-receipts'
                    type='number'
                    min='0'
                    value={editingExpense.receipt_count || 0}
                    onChange={(e) =>
                      setEditingExpense({ ...editingExpense, receipt_count: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='edit-status'>状态</Label>
                  <Select
                    value={editingExpense.status}
                    onValueChange={(value) => setEditingExpense({ ...editingExpense, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='选择状态' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='pending'>待审批</SelectItem>
                      <SelectItem value='approved'>已审批</SelectItem>
                      <SelectItem value='reimbursed'>已报销</SelectItem>
                      <SelectItem value='rejected'>已拒绝</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='edit-description'>备注</Label>
                <Textarea
                  id='edit-description'
                  value={editingExpense.description || ''}
                  onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value || undefined })}
                  placeholder='请输入报销说明...'
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditingExpense(null)}>
              取消
            </Button>
            <Button onClick={handleUpdate}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceExpensePage;
