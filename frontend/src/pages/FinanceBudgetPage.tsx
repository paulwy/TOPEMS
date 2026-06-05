import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  Building2,
  DollarSign,
  PieChart,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { budgetApi, type Budget, type PaginatedResult } from '../api/erp';
import { useAppStore } from '../store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const FinanceBudgetPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  const [formData, setFormData] = useState({
    department_id: '',
    budget_type: 'operating',
    fiscal_year: new Date().getFullYear().toString(),
    total_budget: '',
    status: 'active',
  });

  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = async () => {
    setLoading(true);
    try {
      const response = await budgetApi.list();
      if (response.success && response.data) {
        setBudgets(response.data.items || []);
      }
    } catch (err) {
      console.error('加载预算数据失败:', err);
      addNotification({ title: '错误', message: '加载预算数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const data = {
        ...formData,
        total_budget: parseFloat(formData.total_budget),
      };
      const response = await budgetApi.create(data);
      if (response.success) {
        addNotification({ title: '成功', message: '预算创建成功', type: 'success' });
        setShowCreateDialog(false);
        resetForm();
        loadBudgets();
      }
    } catch (err) {
      console.error('创建预算失败:', err);
      addNotification({ title: '错误', message: '创建预算失败', type: 'error' });
    }
  };

  const handleUpdate = async () => {
    if (!editingBudget) return;
    try {
      const data = {
        ...formData,
        total_budget: parseFloat(formData.total_budget),
      };
      const response = await budgetApi.update(editingBudget.id, data);
      if (response.success) {
        addNotification({ title: '成功', message: '预算更新成功', type: 'success' });
        setEditingBudget(null);
        setShowCreateDialog(false);
        resetForm();
        loadBudgets();
      }
    } catch (err) {
      console.error('更新预算失败:', err);
      addNotification({ title: '错误', message: '更新预算失败', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除此预算吗？')) return;
    try {
      const response = await budgetApi.delete(id);
      if (response.success) {
        addNotification({ title: '成功', message: '预算删除成功', type: 'success' });
        loadBudgets();
      }
    } catch (err) {
      console.error('删除预算失败:', err);
      addNotification({ title: '错误', message: '删除预算失败', type: 'error' });
    }
  };

  const openEditDialog = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({
      department_id: budget.department_id || '',
      budget_type: budget.budget_type || 'operating',
      fiscal_year: budget.fiscal_year || new Date().getFullYear().toString(),
      total_budget: budget.total_budget.toString(),
      status: budget.status,
    });
    setShowCreateDialog(true);
  };

  const openDetailDialog = (budget: Budget) => {
    setSelectedBudget(budget);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setFormData({
      department_id: '',
      budget_type: 'operating',
      fiscal_year: new Date().getFullYear().toString(),
      total_budget: '',
      status: 'active',
    });
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const filteredBudgets = budgets.filter((budget) => {
    const matchesSearch =
      budget.budget_type?.toLowerCase().includes(searchTerm.toLowerCase()) || budget.fiscal_year?.includes(searchTerm);
    const matchesType = !filterType || budget.budget_type === filterType;
    const matchesStatus = !filterStatus || budget.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalBudget = budgets.reduce((sum, b) => sum + b.total_budget, 0);
  const totalUsed = budgets.reduce((sum, b) => sum + (b.used_amount || 0), 0);
  const totalRemaining = budgets.reduce((sum, b) => sum + (b.remaining_amount || 0), 0);
  const avgUsageRate =
    budgets.length > 0 ? budgets.reduce((sum, b) => sum + (b.usage_rate || 0), 0) / budgets.length : 0;

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
      frozen: 'bg-gray-100 text-gray-700',
      completed: 'bg-blue-100 text-blue-700',
    };
    const labels = {
      active: '执行中',
      expired: '已过期',
      frozen: '已冻结',
      completed: '已完成',
    };
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.active}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      operating: '运营预算',
      capital: '资本预算',
      project: '项目预算',
      marketing: '市场预算',
      personnel: '人事预算',
    };
    return labels[type] || type;
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>预算管理</h1>
          <p className='text-slate-500 mt-1'>管理企业各项预算的分配与执行情况</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className='flex items-center space-x-2'>
              <Plus className='w-4 h-4' />
              <span>新增预算</span>
            </Button>
          </DialogTrigger>
          <DialogContent className='sm:max-w-md'>
            <DialogHeader>
              <DialogTitle>{editingBudget ? '编辑预算' : '新增预算'}</DialogTitle>
            </DialogHeader>
            <div className='space-y-4 mt-4'>
              <div className='space-y-2'>
                <Label htmlFor='budget_type'>预算类型</Label>
                <Select
                  value={formData.budget_type}
                  onValueChange={(value) => setFormData({ ...formData, budget_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='选择预算类型' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='operating'>运营预算</SelectItem>
                    <SelectItem value='capital'>资本预算</SelectItem>
                    <SelectItem value='project'>项目预算</SelectItem>
                    <SelectItem value='marketing'>市场预算</SelectItem>
                    <SelectItem value='personnel'>人事预算</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='fiscal_year'>预算年度</Label>
                <Input
                  id='fiscal_year'
                  type='number'
                  value={formData.fiscal_year}
                  onChange={(e) => setFormData({ ...formData, fiscal_year: e.target.value })}
                  placeholder='请输入预算年度'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='total_budget'>预算金额</Label>
                <Input
                  id='total_budget'
                  type='number'
                  value={formData.total_budget}
                  onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                  placeholder='请输入预算金额'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='status'>状态</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder='选择状态' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='active'>执行中</SelectItem>
                    <SelectItem value='completed'>已完成</SelectItem>
                    <SelectItem value='frozen'>已冻结</SelectItem>
                    <SelectItem value='expired'>已过期</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className='mt-4'>
              <Button
                variant='outline'
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingBudget(null);
                  resetForm();
                }}
              >
                取消
              </Button>
              <Button onClick={editingBudget ? handleUpdate : handleCreate}>{editingBudget ? '更新' : '创建'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card className='bg-gradient-to-br from-blue-500 to-indigo-500 text-white'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm opacity-80'>总预算</p>
                <p className='text-3xl font-bold mt-2'>{formatCurrency(totalBudget)}</p>
              </div>
              <div className='p-3 bg-white/20 rounded-full'>
                <DollarSign className='w-6 h-6' />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='bg-gradient-to-br from-orange-500 to-red-500 text-white'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm opacity-80'>已使用</p>
                <p className='text-3xl font-bold mt-2'>{formatCurrency(totalUsed)}</p>
              </div>
              <div className='p-3 bg-white/20 rounded-full'>
                <PieChart className='w-6 h-6' />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='bg-gradient-to-br from-green-500 to-emerald-500 text-white'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm opacity-80'>剩余预算</p>
                <p className='text-3xl font-bold mt-2'>{formatCurrency(totalRemaining)}</p>
              </div>
              <div className='p-3 bg-white/20 rounded-full'>
                <CheckCircle2 className='w-6 h-6' />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className='bg-gradient-to-br from-purple-500 to-violet-500 text-white'>
          <CardContent className='p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm opacity-80'>平均使用率</p>
                <p className='text-3xl font-bold mt-2'>{formatPercent(avgUsageRate)}</p>
              </div>
              <div className='p-3 bg-white/20 rounded-full'>
                <Calendar className='w-6 h-6' />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center justify-between'>
            <span>预算列表</span>
            <Button variant='outline' size='sm' onClick={loadBudgets} className='h-8'>
              <RefreshCw className='w-4 h-4 mr-2' />
              刷新
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col sm:flex-row gap-4 mb-4'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
              <Input
                placeholder='搜索预算类型或年度...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>
            <div className='flex gap-2'>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className='w-32'>
                  <SelectValue placeholder='类型' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>全部</SelectItem>
                  <SelectItem value='operating'>运营预算</SelectItem>
                  <SelectItem value='capital'>资本预算</SelectItem>
                  <SelectItem value='project'>项目预算</SelectItem>
                  <SelectItem value='marketing'>市场预算</SelectItem>
                  <SelectItem value='personnel'>人事预算</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className='w-32'>
                  <SelectValue placeholder='状态' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>全部</SelectItem>
                  <SelectItem value='active'>执行中</SelectItem>
                  <SelectItem value='completed'>已完成</SelectItem>
                  <SelectItem value='frozen'>已冻结</SelectItem>
                  <SelectItem value='expired'>已过期</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className='p-8 text-center'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent' />
              <p className='mt-2 text-slate-500'>加载中...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>预算类型</TableHead>
                  <TableHead>预算年度</TableHead>
                  <TableHead className='text-right'>预算金额</TableHead>
                  <TableHead className='text-right'>已使用</TableHead>
                  <TableHead className='text-right'>剩余</TableHead>
                  <TableHead>使用率</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className='text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBudgets.length > 0 ? (
                  filteredBudgets.map((budget) => (
                    <TableRow key={budget.id}>
                      <TableCell>
                        <div className='flex items-center'>
                          <Building2 className='w-4 h-4 mr-2 text-slate-400' />
                          {getTypeLabel(budget.budget_type || '')}
                        </div>
                      </TableCell>
                      <TableCell>{budget.fiscal_year}</TableCell>
                      <TableCell className='text-right font-medium'>{formatCurrency(budget.total_budget)}</TableCell>
                      <TableCell className='text-right'>{formatCurrency(budget.used_amount || 0)}</TableCell>
                      <TableCell className='text-right'>{formatCurrency(budget.remaining_amount || 0)}</TableCell>
                      <TableCell>
                        <div className='flex items-center space-x-2'>
                          <div className='flex-1 max-w-24'>
                            <Progress value={budget.usage_rate || 0} className='h-2' />
                          </div>
                          <span className='text-sm text-slate-500 w-14'>{formatPercent(budget.usage_rate || 0)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(budget.status)}</TableCell>
                      <TableCell className='text-right'>
                        <div className='flex items-center justify-end space-x-2'>
                          <Button variant='ghost' size='sm' onClick={() => openDetailDialog(budget)}>
                            <Eye className='w-4 h-4' />
                          </Button>
                          <Button variant='ghost' size='sm' onClick={() => openEditDialog(budget)}>
                            <Edit2 className='w-4 h-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='text-red-500 hover:text-red-600'
                            onClick={() => handleDelete(budget.id)}
                          >
                            <Trash2 className='w-4 h-4' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className='text-center py-8'>
                      <AlertCircle className='w-12 h-12 mx-auto text-slate-300 mb-2' />
                      <p className='text-slate-500'>暂无预算数据</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle className='flex items-center'>
              <PieChart className='w-5 h-5 mr-2 text-indigo-600' />
              预算详情
            </DialogTitle>
          </DialogHeader>
          {selectedBudget && (
            <div className='space-y-6 mt-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='p-4 bg-slate-50 rounded-lg'>
                  <p className='text-sm text-slate-500'>预算类型</p>
                  <p className='font-medium mt-1'>{getTypeLabel(selectedBudget.budget_type || '')}</p>
                </div>
                <div className='p-4 bg-slate-50 rounded-lg'>
                  <p className='text-sm text-slate-500'>预算年度</p>
                  <p className='font-medium mt-1'>{selectedBudget.fiscal_year}</p>
                </div>
              </div>

              <div className='p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg'>
                <div className='flex items-center justify-between mb-4'>
                  <span className='text-sm text-slate-500'>预算金额</span>
                  <span className='text-2xl font-bold text-indigo-600'>
                    {formatCurrency(selectedBudget.total_budget)}
                  </span>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <p className='text-sm text-slate-500'>已使用</p>
                    <p className='text-lg font-bold text-orange-600'>
                      {formatCurrency(selectedBudget.used_amount || 0)}
                    </p>
                  </div>
                  <div>
                    <p className='text-sm text-slate-500'>剩余预算</p>
                    <p className='text-lg font-bold text-green-600'>
                      {formatCurrency(selectedBudget.remaining_amount || 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className='flex items-center justify-between mb-2'>
                  <span className='text-sm text-slate-500'>使用进度</span>
                  <span className='font-medium'>{formatPercent(selectedBudget.usage_rate || 0)}</span>
                </div>
                <Progress value={selectedBudget.usage_rate || 0} className='h-4' />
              </div>

              <div className='flex items-center justify-between p-4 bg-slate-50 rounded-lg'>
                <span className='text-sm text-slate-500'>状态</span>
                {getStatusBadge(selectedBudget.status)}
              </div>

              <div className='flex items-center justify-between text-sm text-slate-500'>
                <span>创建时间: {new Date(selectedBudget.created_at).toLocaleDateString()}</span>
                <span>更新时间: {new Date(selectedBudget.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceBudgetPage;
