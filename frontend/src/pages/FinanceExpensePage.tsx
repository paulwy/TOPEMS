import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, FileText, TrendingUp, DollarSign,
  ChevronLeft, Plus, Edit, Trash2, Eye, CheckCircle,
  XCircle, Clock, Download, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { expenseApi, budgetApi, receivableApi, payableApi, departmentApi, type Expense, type Budget, type Receivable, type Payable, type Department } from '../api/erp';
import { useAppStore } from '../store';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ModeToggle } from '@/components/ModeToggle';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface FinanceExpensePageProps {
  onNavigate?: (page: string) => void;
}

const FinanceExpensePage: React.FC<FinanceExpensePageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  
  const [activeTab, setActiveTab] = useState<string>('expenses');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentCreateType, setCurrentCreateType] = useState<string>('');
  const [newRecord, setNewRecord] = useState<Partial<Expense | Budget | Receivable | Payable>>({});
  const [editingRecord, setEditingRecord] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const promises: any[] = [
        expenseApi.list(),
        budgetApi.list(),
        receivableApi.list(),
        payableApi.list(),
        departmentApi.list()
      ];
      
      const results = await Promise.allSettled(promises);
      
      if (results[0].status === 'fulfilled' && results[0].value.success && results[0].value.data) {
        setExpenses(results[0].value.data.items || []);
      }
      
      if (results[1].status === 'fulfilled' && results[1].value.success && results[1].value.data) {
        setBudgets(results[1].value.data.items || []);
      }
      
      if (results[2].status === 'fulfilled' && results[2].value.success && results[2].value.data) {
        setReceivables(results[2].value.data.items || []);
      }
      
      if (results[3].status === 'fulfilled' && results[3].value.success && results[3].value.data) {
        setPayables(results[3].value.data.items || []);
      }
      
      if (results[4].status === 'fulfilled' && results[4].value.success && results[4].value.data) {
        setDepartments(results[4].value.data.items || []);
      }
      
    } catch (err: any) {
      console.error('加载数据失败:', err);
      addNotification({ title: '错误', message: '加载数据失败: ' + (err.message || '未知错误'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 处理创建操作
  const handleCreate = async (data: any) => {
    try {
      let result;
      switch (currentCreateType) {
        case 'expense':
          result = await expenseApi.create(data);
          break;
        case 'budget':
          result = await budgetApi.create(data);
          break;
        case 'receivable':
          result = await receivableApi.create(data);
          break;
        case 'payable':
          result = await payableApi.create(data);
          break;
      }
      
      if (result?.success) {
        addNotification({ title: '成功', message: '创建成功', type: 'success' });
        setShowCreateModal(false);
        loadData();
      } else {
        addNotification({ title: '失败', message: result?.message || '创建失败', type: 'error' });
      }
    } catch (err) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    }
  };

  // 处理更新操作
  const handleUpdate = async (id: string, data: any) => {
    try {
      let result;
      switch (currentCreateType) {
        case 'expense':
          result = await expenseApi.update(id, data);
          break;
        case 'budget':
          result = await budgetApi.update(id, data);
          break;
        case 'receivable':
          result = await receivableApi.update(id, data);
          break;
        case 'payable':
          result = await payableApi.update(id, data);
          break;
      }
      
      if (result?.success) {
        addNotification({ title: '成功', message: '更新成功', type: 'success' });
        setShowCreateModal(false);
        loadData();
      } else {
        addNotification({ title: '失败', message: result?.message || '更新失败', type: 'error' });
      }
    } catch (err) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    }
  };

  // 处理删除操作
  const handleDelete = async (id: string, type: string) => {
    if (!confirm('确定要删除吗？')) return;
    
    try {
      let result;
      switch (type) {
        case 'expense':
          result = await expenseApi.delete(id);
          break;
        case 'budget':
          result = await budgetApi.delete(id);
          break;
        case 'receivable':
          result = await receivableApi.delete(id);
          break;
        case 'payable':
          result = await payableApi.delete(id);
          break;
      }
      
      if (result?.success) {
        addNotification({ title: '成功', message: '删除成功', type: 'success' });
        loadData();
      } else {
        addNotification({ title: '失败', message: result?.message || '删除失败', type: 'error' });
      }
    } catch (err) {
      addNotification({ title: '错误', message: '操作失败', type: 'error' });
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      draft: { variant: 'outline', label: '草稿' },
      pending: { variant: 'secondary', label: '待审批' },
      approved: { variant: 'default', label: '已批准' },
      rejected: { variant: 'destructive', label: '已拒绝' },
      reimbursed: { variant: 'default', label: '已报销' },
      active: { variant: 'default', label: '执行中' },
      frozen: { variant: 'secondary', label: '已冻结' },
      exhausted: { variant: 'destructive', label: '已耗尽' },
      partial: { variant: 'secondary', label: '部分' },
      received: { variant: 'default', label: '已收款' },
      paid: { variant: 'default', label: '已付款' },
    };
    
    const config = badges[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getExpenseTypeName = (type: string) => {
    const types: Record<string, string> = {
      travel: '差旅费',
      meals: '餐饮费',
      transport: '交通费',
      office: '办公费',
      communication: '通讯费',
      other: '其他',
    };
    return types[type] || type;
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

  const getDepartmentName = (id: string) => {
    const dept = departments.find(d => d.id === id);
    return dept?.name || '-';
  };

  // 模拟审批功能
  const handleApproveExpense = (expenseId: string) => {
    setExpenses(prev => prev.map(exp => 
      exp.id === expenseId 
        ? { ...exp, status: 'approved', approved_at: new Date().toISOString().split('T')[0] }
        : exp
    ));
    addNotification({ title: '成功', message: '报销已批准', type: 'success' });
  };

  const handleRejectExpense = (expenseId: string) => {
    setExpenses(prev => prev.map(exp => 
      exp.id === expenseId 
        ? { ...exp, status: 'rejected' }
        : exp
    ));
    addNotification({ title: '提示', message: '报销已拒绝', type: 'warning' });
  };

  // 模拟收款功能
  const handleReceivePayment = (receivableId: string) => {
    setReceivables(prev => prev.map(rec => 
      rec.id === receivableId 
        ? { ...rec, status: 'received', received_amount: rec.amount }
        : rec
    ));
    addNotification({ title: '成功', message: '已完成收款', type: 'success' });
  };

  // 模拟付款功能
  const handlePayInvoice = (payableId: string) => {
    setPayables(prev => prev.map(pay => 
      pay.id === payableId 
        ? { ...pay, status: 'paid', paid_amount: pay.amount }
        : pay
    ));
    addNotification({ title: '成功', message: '已完成付款', type: 'success' });
  };

  const expenseColumns = useMemo<ColumnDef<Expense>[]>(() => [
    {
      accessorKey: 'expense_number',
      header: '报销单号',
      cell: ({ row }) => (
        <div className="font-medium text-slate-900 dark:text-slate-100">
          {row.original.expense_number}
        </div>
      ),
    },
    {
      accessorKey: 'applicant_name',
      header: '申请人',
      cell: ({ row }) => (
        <div className="text-slate-900 dark:text-slate-100">
          {row.original.applicant_name || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'department_id',
      header: '部门',
      cell: ({ row }) => (
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {getDepartmentName(row.original.department_id || '')}
        </div>
      ),
    },
    {
      accessorKey: 'expense_type',
      header: '费用类型',
      cell: ({ row }) => (
        <div className="text-sm text-slate-900 dark:text-slate-100">
          {getExpenseTypeName(row.original.expense_type)}
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: '金额',
      cell: ({ row }) => (
        <div className="font-bold text-red-600">
          {formatCurrency(row.original.amount)}
        </div>
      ),
    },
    {
      accessorKey: 'expense_date',
      header: '费用日期',
      cell: ({ row }) => (
        <div className="text-sm text-slate-900 dark:text-slate-100">
          {row.original.expense_date || '-'}
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
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setEditingRecord(row.original);
              setCurrentCreateType('expense');
              setNewRecord(row.original);
              setShowCreateModal(true);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-600"
            onClick={() => handleDelete(row.original.id, 'expense')}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          {row.original.status === 'pending' && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-green-600"
                onClick={() => handleApproveExpense(row.original.id)}
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-red-600"
                onClick={() => handleRejectExpense(row.original.id)}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ], [departments]);

  const receivableColumns = useMemo<ColumnDef<Receivable>[]>(() => [
    {
      accessorKey: 'invoice_number',
      header: '发票号',
      cell: ({ row }) => (
        <div className="font-medium text-blue-600">
          {row.original.invoice_number}
        </div>
      ),
    },
    {
      accessorKey: 'customer_name',
      header: '客户名称',
      cell: ({ row }) => (
        <div className="text-slate-900 dark:text-slate-100">
          {row.original.customer_name || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'project_name',
      header: '项目名称',
      cell: ({ row }) => (
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {row.original.project_name || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: '开票金额',
      cell: ({ row }) => (
        <div className="font-bold text-red-600">
          {formatCurrency(row.original.amount)}
        </div>
      ),
    },
    {
      id: 'receivable_amount',
      header: '应收金额',
      cell: ({ row }) => (
        <div className="text-sm text-slate-900 dark:text-slate-100">
          {formatCurrency(row.original.amount - (row.original.received_amount || 0))}
        </div>
      ),
    },
    {
      accessorKey: 'due_date',
      header: '到期日',
      cell: ({ row }) => (
        <div className="text-sm text-slate-900 dark:text-slate-100">
          {row.original.due_date || '-'}
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
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setEditingRecord(row.original);
              setCurrentCreateType('receivable');
              setNewRecord(row.original);
              setShowCreateModal(true);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-600"
            onClick={() => handleDelete(row.original.id, 'receivable')}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          {row.original.status !== 'received' && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-green-600"
              onClick={() => handleReceivePayment(row.original.id)}
            >
              <DollarSign className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ], []);

  const payableColumns = useMemo<ColumnDef<Payable>[]>(() => [
    {
      accessorKey: 'invoice_number',
      header: '单据号',
      cell: ({ row }) => (
        <div className="font-medium text-blue-600">
          {row.original.invoice_number}
        </div>
      ),
    },
    {
      accessorKey: 'supplier_name',
      header: '供应商',
      cell: ({ row }) => (
        <div className="text-slate-900 dark:text-slate-100">
          {row.original.supplier_name || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: '类别',
      cell: ({ row }) => (
        <div className="text-sm text-slate-900 dark:text-slate-100">
          {row.original.category || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: '应付金额',
      cell: ({ row }) => (
        <div className="font-bold text-red-600">
          {formatCurrency(row.original.amount)}
        </div>
      ),
    },
    {
      accessorKey: 'paid_amount',
      header: '已付金额',
      cell: ({ row }) => (
        <div className="text-sm text-slate-900 dark:text-slate-100">
          {formatCurrency(row.original.paid_amount || 0)}
        </div>
      ),
    },
    {
      accessorKey: 'due_date',
      header: '到期日',
      cell: ({ row }) => (
        <div className="text-sm text-slate-900 dark:text-slate-100">
          {row.original.due_date || '-'}
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
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setEditingRecord(row.original);
              setCurrentCreateType('payable');
              setNewRecord(row.original);
              setShowCreateModal(true);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-600"
            onClick={() => handleDelete(row.original.id, 'payable')}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          {row.original.status !== 'paid' && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-green-600"
              onClick={() => handlePayInvoice(row.original.id)}
            >
              <DollarSign className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ], []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                  <Receipt className="w-7 h-7 mr-3 text-indigo-600" />
                  费用管理
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  管理费用报销、预算、应收应付款项
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ModeToggle />
              <Button>
                <Plus className="w-5 h-5 mr-2" />
                新增报销
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="expenses" className="flex items-center space-x-2">
              <Receipt className="w-4 h-4" />
              <span>费用报销</span>
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>预算管理</span>
            </TabsTrigger>
            <TabsTrigger value="receivable" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>应收账款</span>
            </TabsTrigger>
            <TabsTrigger value="payable" className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4" />
              <span>应付账款</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                    <p className="mt-2 text-slate-500 dark:text-slate-400">加载中...</p>
                  </div>
                ) : (
                  <DataTable
                    columns={expenseColumns}
                    data={expenses}
                    searchPlaceholder="搜索报销单..."
                    searchKey="expense_number"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="budget" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {budgets.map((budget) => (
                <Card key={budget.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {getDepartmentName(budget.department_id || '')}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {budget.budget_type} · {budget.fiscal_year}年
                        </p>
                      </div>
                      {getStatusBadge(budget.status)}
                    </div>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600 dark:text-slate-400">预算使用进度</span>
                        <span className={`font-bold ${(budget.usage_rate || 0) > 80 ? 'text-red-600' : 'text-blue-600'}`}>
                          {budget.usage_rate}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all ${
                            (budget.usage_rate || 0) > 90 ? 'bg-red-500' : 
                            (budget.usage_rate || 0) > 70 ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${budget.usage_rate}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">预算总额</p>
                        <p className="font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(budget.total_budget)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">已使用</p>
                        <p className="font-bold text-blue-600">
                          {formatCurrency(budget.used_amount || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">剩余</p>
                        <p className={`font-bold ${
                          (budget.remaining_amount || 0) < budget.total_budget * 0.2 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {formatCurrency(budget.remaining_amount || 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="receivable" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                    <p className="mt-2 text-slate-500 dark:text-slate-400">加载中...</p>
                  </div>
                ) : (
                  <DataTable
                    columns={receivableColumns}
                    data={receivables}
                    searchPlaceholder="搜索应收账款..."
                    searchKey="invoice_number"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payable" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
                    <p className="mt-2 text-slate-500 dark:text-slate-400">加载中...</p>
                  </div>
                ) : (
                  <DataTable
                    columns={payableColumns}
                    data={payables}
                    searchPlaceholder="搜索应付账款..."
                    searchKey="invoice_number"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FinanceExpensePage;
