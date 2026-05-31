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

// 模拟数据
const mockExpenses: Expense[] = [
  {
    id: '1',
    expense_number: 'EXP-2024-001',
    applicant_name: '张三',
    department_id: '1',
    expense_type: 'travel',
    amount: 1500.00,
    description: '出差上海',
    expense_date: '2024-05-15',
    receipt_count: 3,
    status: 'approved',
    approver_id: '2',
    approved_at: '2024-05-16',
    reimbursed_at: '2024-05-18',
    created_at: '2024-05-15',
    updated_at: '2024-05-18'
  },
  {
    id: '2',
    expense_number: 'EXP-2024-002',
    applicant_name: '李四',
    department_id: '2',
    expense_type: 'meals',
    amount: 350.00,
    description: '客户招待餐费',
    expense_date: '2024-05-20',
    receipt_count: 1,
    status: 'pending',
    created_at: '2024-05-20',
    updated_at: '2024-05-20'
  },
  {
    id: '3',
    expense_number: 'EXP-2024-003',
    applicant_name: '王五',
    department_id: '1',
    expense_type: 'office',
    amount: 800.00,
    description: '办公用品采购',
    expense_date: '2024-05-25',
    receipt_count: 5,
    status: 'reimbursed',
    created_at: '2024-05-25',
    updated_at: '2024-05-26'
  }
];

const mockBudgets: Budget[] = [
  {
    id: '1',
    department_id: '1',
    budget_type: 'office',
    fiscal_year: '2024',
    total_budget: 50000,
    used_amount: 28500,
    remaining_amount: 21500,
    usage_rate: 57,
    status: 'active',
    created_at: '2024-01-01',
    updated_at: '2024-05-30'
  },
  {
    id: '2',
    department_id: '2',
    budget_type: 'marketing',
    fiscal_year: '2024',
    total_budget: 80000,
    used_amount: 64000,
    remaining_amount: 16000,
    usage_rate: 80,
    status: 'active',
    created_at: '2024-01-01',
    updated_at: '2024-05-30'
  },
  {
    id: '3',
    department_id: '3',
    budget_type: 'development',
    fiscal_year: '2024',
    total_budget: 150000,
    used_amount: 45000,
    remaining_amount: 105000,
    usage_rate: 30,
    status: 'active',
    created_at: '2024-01-01',
    updated_at: '2024-05-30'
  }
];

const mockReceivables: Receivable[] = [
  {
    id: '1',
    invoice_number: 'INV-2024-001',
    customer_name: '科技公司A',
    project_name: 'ERP系统开发',
    amount: 120000,
    invoice_date: '2024-05-10',
    due_date: '2024-06-10',
    status: 'pending',
    received_amount: 0,
    created_at: '2024-05-10',
    updated_at: '2024-05-10'
  },
  {
    id: '2',
    invoice_number: 'INV-2024-002',
    customer_name: '贸易公司B',
    project_name: '软件许可',
    amount: 50000,
    invoice_date: '2024-05-15',
    due_date: '2024-06-15',
    status: 'partial',
    received_amount: 25000,
    created_at: '2024-05-15',
    updated_at: '2024-05-20'
  },
  {
    id: '3',
    invoice_number: 'INV-2024-003',
    customer_name: '制造企业C',
    project_name: '咨询服务',
    amount: 80000,
    invoice_date: '2024-05-01',
    due_date: '2024-06-01',
    status: 'received',
    received_amount: 80000,
    created_at: '2024-05-01',
    updated_at: '2024-05-25'
  }
];

const mockPayables: Payable[] = [
  {
    id: '1',
    invoice_number: 'PAY-2024-001',
    supplier_name: '供应商A',
    category: 'software',
    amount: 30000,
    invoice_date: '2024-05-05',
    due_date: '2024-06-05',
    status: 'pending',
    paid_amount: 0,
    created_at: '2024-05-05',
    updated_at: '2024-05-05'
  },
  {
    id: '2',
    invoice_number: 'PAY-2024-002',
    supplier_name: '供应商B',
    category: 'hardware',
    amount: 25000,
    invoice_date: '2024-05-10',
    due_date: '2024-06-10',
    status: 'paid',
    paid_amount: 25000,
    created_at: '2024-05-10',
    updated_at: '2024-05-22'
  },
  {
    id: '3',
    invoice_number: 'PAY-2024-003',
    supplier_name: '服务商C',
    category: 'service',
    amount: 15000,
    invoice_date: '2024-05-18',
    due_date: '2024-06-18',
    status: 'pending',
    paid_amount: 0,
    created_at: '2024-05-18',
    updated_at: '2024-05-18'
  }
];

const mockDepartments: Department[] = [
  { id: '1', name: '技术部', code: 'TECH', status: 'active', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '2', name: '市场部', code: 'MARKET', status: 'active', created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: '3', name: '财务部', code: 'FIN', status: 'active', created_at: '2024-01-01', updated_at: '2024-01-01' }
];

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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 尝试调用真实API，如果失败则使用模拟数据
      let expenseSuccess = false, budgetSuccess = false, receivableSuccess = false, payableSuccess = false, deptSuccess = false;
      
      try {
        const [expenseRes, budgetRes, receivableRes, payableRes, deptRes] = await Promise.all([
          expenseApi.list(),
          budgetApi.list(),
          receivableApi.list(),
          payableApi.list(),
          departmentApi.list()
        ]);
        
        if (expenseRes.success && expenseRes.data) {
          setExpenses(expenseRes.data.items || []);
          expenseSuccess = true;
        }
        if (budgetRes.success && budgetRes.data) {
          setBudgets(budgetRes.data.items || []);
          budgetSuccess = true;
        }
        if (receivableRes.success && receivableRes.data) {
          setReceivables(receivableRes.data.items || []);
          receivableSuccess = true;
        }
        if (payableRes.success && payableRes.data) {
          setPayables(payableRes.data.items || []);
          payableSuccess = true;
        }
        if (deptRes.success && deptRes.data) {
          setDepartments(deptRes.data.items || []);
          deptSuccess = true;
        }
      } catch (apiError) {
        console.log('API调用失败，使用模拟数据');
      }
      
      // 如果API调用失败，使用模拟数据
      if (!expenseSuccess) setExpenses(mockExpenses);
      if (!budgetSuccess) setBudgets(mockBudgets);
      if (!receivableSuccess) setReceivables(mockReceivables);
      if (!payableSuccess) setPayables(mockPayables);
      if (!deptSuccess) setDepartments(mockDepartments);
      
    } catch (err: any) {
      addNotification({ title: '提示', message: 'API服务不可用，使用演示数据', type: 'info' });
      // 确保使用模拟数据
      setExpenses(mockExpenses);
      setBudgets(mockBudgets);
      setReceivables(mockReceivables);
      setPayables(mockPayables);
      setDepartments(mockDepartments);
    } finally {
      setLoading(false);
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
