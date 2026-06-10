import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, ChevronLeft, Plus, Edit, Trash2, Eye, CheckCircle, DollarSign, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { budgetApi, type Budget } from '../api/erp';
import { departmentApi, type Department } from '../api/hrm';
import { useAppStore } from '../store';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ModeToggle } from '@/components/ModeToggle';
import { Badge } from '@/components/ui/badge';
import OrganizationFilter, { type OrganizationFilterValue } from '../components/ui/OrganizationFilter';

const BudgetManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [organizationFilter, setOrganizationFilter] = useState<OrganizationFilterValue>({});
  const [newBudget, setNewBudget] = useState({
    department_id: '',
    budget_type: '',
    fiscal_year: new Date().getFullYear().toString(),
    total_budget: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [budgetRes, deptRes] = await Promise.all([budgetApi.list(), departmentApi.list()]);

      if (budgetRes.success && budgetRes.data) {
        setBudgets(budgetRes.data.items || []);
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
    const badges: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      active: { variant: 'default', label: '执行中' },
      frozen: { variant: 'secondary', label: '已冻结' },
      exhausted: { variant: 'destructive', label: '已耗尽' },
    };

    const config = badges[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDepartmentName = (id: string) => {
    const dept = departments.find((d) => d.id === id);
    return dept?.name || '-';
  };

  const getBudgetTypeName = (type: string) => {
    const types: Record<string, string> = {
      office: '办公费',
      marketing: '市场费',
      development: '研发费',
      travel: '差旅费',
      training: '培训费',
      other: '其他',
    };
    return types[type] || type;
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 90) return 'bg-red-500';
    if (rate >= 70) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const handleCreate = async () => {
    try {
      const res = await budgetApi.create({
        department_id: newBudget.department_id || undefined,
        budget_type: newBudget.budget_type || undefined,
        fiscal_year: newBudget.fiscal_year,
        total_budget: newBudget.total_budget,
      });

      if (res.success) {
        addNotification({ title: '成功', message: '预算创建成功', type: 'success' });
        setShowCreateModal(false);
        setNewBudget({
          department_id: '',
          budget_type: '',
          fiscal_year: new Date().getFullYear().toString(),
          total_budget: 0,
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
    if (!editingBudget) return;

    try {
      const res = await budgetApi.update(editingBudget.id, {
        department_id: editingBudget.department_id || undefined,
        budget_type: editingBudget.budget_type || undefined,
        fiscal_year: editingBudget.fiscal_year,
        total_budget: editingBudget.total_budget,
        used_amount: editingBudget.used_amount,
        status: editingBudget.status,
      });

      if (res.success) {
        addNotification({ title: '成功', message: '预算更新成功', type: 'success' });
        setEditingBudget(null);
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '更新失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '错误', message: err.message || '更新失败', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条预算记录吗？')) return;

    try {
      const res = await budgetApi.delete(id);
      if (res.success) {
        addNotification({ title: '成功', message: '预算删除成功', type: 'success' });
        loadData();
      } else {
        addNotification({ title: '失败', message: res.message || '删除失败', type: 'error' });
      }
    } catch (err: any) {
      addNotification({ title: '错误', message: err.message || '删除失败', type: 'error' });
    }
  };

  const columns = useMemo<ColumnDef<Budget>[]>(
    () => [
      {
        accessorKey: 'department_id',
        header: '部门',
        cell: ({ row }) => (
          <div className='font-medium text-slate-900 dark:text-slate-100'>
            {getDepartmentName(row.original.department_id || '')}
          </div>
        ),
      },
      {
        accessorKey: 'budget_type',
        header: '预算类型',
        cell: ({ row }) => (
          <div className='text-slate-900 dark:text-slate-100'>{getBudgetTypeName(row.original.budget_type || '')}</div>
        ),
      },
      {
        accessorKey: 'fiscal_year',
        header: '财年',
        cell: ({ row }) => <div className='text-slate-900 dark:text-slate-100'>{row.original.fiscal_year}年</div>,
      },
      {
        accessorKey: 'total_budget',
        header: '预算总额',
        cell: ({ row }) => <div className='font-bold text-blue-600'>¥{row.original.total_budget.toLocaleString()}</div>,
      },
      {
        id: 'usage',
        header: '使用进度',
        cell: ({ row }) => (
          <div className='w-full max-w-xs'>
            <div className='flex justify-between text-xs mb-1'>
              <span className='text-slate-600 dark:text-slate-400'>
                已用: ¥{row.original.used_amount.toLocaleString()}
              </span>
              <span className={`font-bold ${row.original.usage_rate > 80 ? 'text-red-600' : 'text-blue-600'}`}>
                {row.original.usage_rate.toFixed(1)}%
              </span>
            </div>
            <div className='w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2'>
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(row.original.usage_rate)}`}
                style={{ width: `${Math.min(row.original.usage_rate, 100)}%` }}
              ></div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'remaining_amount',
        header: '剩余',
        cell: ({ row }) => (
          <div
            className={`font-bold ${
              row.original.remaining_amount < row.original.total_budget * 0.2 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            ¥{row.original.remaining_amount.toLocaleString()}
          </div>
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
        cell: ({ row }) => (
          <div className='flex items-center space-x-2'>
            <Button variant='ghost' size='sm' onClick={() => setEditingBudget(row.original)}>
              <Edit className='w-4 h-4' />
            </Button>
            <Button variant='ghost' size='sm' className='text-red-600' onClick={() => handleDelete(row.original.id)}>
              <Trash2 className='w-4 h-4' />
            </Button>
          </div>
        ),
      },
    ],
    [departments]
  );

  // 统计卡片数据
  const totalBudget = budgets.reduce((sum, b) => sum + b.total_budget, 0);
  const totalUsed = budgets.reduce((sum, b) => sum + b.used_amount, 0);
  const avgUsageRate = budgets.length > 0 ? budgets.reduce((sum, b) => sum + b.usage_rate, 0) / budgets.length : 0;

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
                  <TrendingUp className='w-7 h-7 mr-3 text-green-600' />
                  预算管理
                </h1>
                <p className='mt-1 text-sm text-slate-500 dark:text-slate-400'>管理各部门预算，追踪预算使用情况</p>
              </div>
            </div>
            <div className='flex items-center space-x-2'>
              <ModeToggle />
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className='w-5 h-5 mr-2' />
                新增预算
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        {/* 组织筛选 */}
        <div className='bg-slate-100 dark:bg-slate-800 rounded-lg p-4 mb-6'>
          <OrganizationFilter
            value={organizationFilter}
            onChange={setOrganizationFilter}
            showCompany={true}
            showDepartment={true}
            showEmployee={false}
          />
        </div>

        {/* 统计卡片 */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-6'>
          <Card>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-slate-600 dark:text-slate-400'>总预算</p>
                  <p className='text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2'>
                    ¥{totalBudget.toLocaleString()}
                  </p>
                </div>
                <div className='p-3 bg-blue-100 dark:bg-blue-900 rounded-full'>
                  <DollarSign className='w-6 h-6 text-blue-600 dark:text-blue-400' />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-slate-600 dark:text-slate-400'>已使用</p>
                  <p className='text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2'>
                    ¥{totalUsed.toLocaleString()}
                  </p>
                </div>
                <div className='p-3 bg-green-100 dark:bg-green-900 rounded-full'>
                  <TrendingUp className='w-6 h-6 text-green-600 dark:text-green-400' />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-slate-600 dark:text-slate-400'>平均使用率</p>
                  <p
                    className={`text-2xl font-bold mt-2 ${
                      avgUsageRate > 80 ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {avgUsageRate.toFixed(1)}%
                  </p>
                </div>
                <div className='p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full'>
                  <Calendar className='w-6 h-6 text-yellow-600 dark:text-yellow-400' />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 预算列表 */}
        <Card>
          <CardContent className='p-0'>
            {loading ? (
              <div className='p-8 text-center'>
                <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent' />
                <p className='mt-2 text-slate-500 dark:text-slate-400'>加载中...</p>
              </div>
            ) : (
              <DataTable columns={columns} data={budgets} searchPlaceholder='搜索预算...' searchKey='fiscal_year' />
            )}
          </CardContent>
        </Card>
      </div>

      {/* 创建预算弹窗 */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增预算</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='department'>部门</Label>
              <Select
                value={newBudget.department_id}
                onValueChange={(value) => setNewBudget({ ...newBudget, department_id: value })}
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
              <Label htmlFor='type'>预算类型</Label>
              <Select
                value={newBudget.budget_type}
                onValueChange={(value) => setNewBudget({ ...newBudget, budget_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder='选择类型' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='office'>办公费</SelectItem>
                  <SelectItem value='marketing'>市场费</SelectItem>
                  <SelectItem value='development'>研发费</SelectItem>
                  <SelectItem value='travel'>差旅费</SelectItem>
                  <SelectItem value='training'>培训费</SelectItem>
                  <SelectItem value='other'>其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='year'>财年</Label>
              <Input
                id='year'
                type='text'
                value={newBudget.fiscal_year}
                onChange={(e) => setNewBudget({ ...newBudget, fiscal_year: e.target.value })}
                placeholder='例如: 2024'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='amount'>预算金额</Label>
              <Input
                id='amount'
                type='number'
                value={newBudget.total_budget}
                onChange={(e) => setNewBudget({ ...newBudget, total_budget: parseFloat(e.target.value) || 0 })}
                placeholder='输入预算金额'
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowCreateModal(false)}>
              取消
            </Button>
            <Button onClick={handleCreate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑预算弹窗 */}
      <Dialog open={!!editingBudget} onOpenChange={() => setEditingBudget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑预算</DialogTitle>
          </DialogHeader>
          {editingBudget && (
            <div className='space-y-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='edit-department'>部门</Label>
                <Select
                  value={editingBudget.department_id || ''}
                  onValueChange={(value) => setEditingBudget({ ...editingBudget, department_id: value || undefined })}
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
                <Label htmlFor='edit-type'>预算类型</Label>
                <Select
                  value={editingBudget.budget_type || ''}
                  onValueChange={(value) => setEditingBudget({ ...editingBudget, budget_type: value || undefined })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='选择类型' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='office'>办公费</SelectItem>
                    <SelectItem value='marketing'>市场费</SelectItem>
                    <SelectItem value='development'>研发费</SelectItem>
                    <SelectItem value='travel'>差旅费</SelectItem>
                    <SelectItem value='training'>培训费</SelectItem>
                    <SelectItem value='other'>其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='edit-year'>财年</Label>
                <Input
                  id='edit-year'
                  type='text'
                  value={editingBudget.fiscal_year}
                  onChange={(e) => setEditingBudget({ ...editingBudget, fiscal_year: e.target.value })}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='edit-total'>预算总额</Label>
                <Input
                  id='edit-total'
                  type='number'
                  value={editingBudget.total_budget}
                  onChange={(e) =>
                    setEditingBudget({ ...editingBudget, total_budget: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='edit-used'>已使用金额</Label>
                <Input
                  id='edit-used'
                  type='number'
                  value={editingBudget.used_amount}
                  onChange={(e) => setEditingBudget({ ...editingBudget, used_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='edit-status'>状态</Label>
                <Select
                  value={editingBudget.status}
                  onValueChange={(value) => setEditingBudget({ ...editingBudget, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='选择状态' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='active'>执行中</SelectItem>
                    <SelectItem value='frozen'>已冻结</SelectItem>
                    <SelectItem value='exhausted'>已耗尽</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditingBudget(null)}>
              取消
            </Button>
            <Button onClick={handleUpdate}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetManagementPage;
