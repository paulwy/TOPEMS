import React, { useState } from 'react';
import { 
  Receipt, FileText, TrendingUp, DollarSign,
  Search, Plus, ChevronLeft, Eye, CheckCircle,
  XCircle, Clock, Filter, Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../hooks/useNotification';

interface ExpenseRecord {
  id: string;
  expense_number: string;
  applicant_name: string;
  department: string;
  expense_type: 'travel' | ' meals' | 'transport' | 'office' | 'communication' | 'other';
  amount: number;
  description: string;
  expense_date: string;
  receipt_count: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'reimbursed';
  approver?: string;
  approved_at?: string;
  reimbursed_at?: string;
}

interface BudgetRecord {
  id: string;
  department: string;
  budget_type: string;
  fiscal_year: string;
  total_budget: number;
  used_amount: number;
  remaining_amount: number;
  usage_rate: number;
  status: 'active' | 'frozen' | 'exhausted';
}

interface ReceivableRecord {
  id: string;
  invoice_number: string;
  customer_name: string;
  project_name: string;
  amount: number;
  invoice_date: string;
  due_date: string;
  status: 'pending' | 'partial' | 'received';
  received_amount: number;
}

interface PayableRecord {
  id: string;
  invoice_number: string;
  supplier_name: string;
  category: string;
  amount: number;
  invoice_date: string;
  due_date: string;
  status: 'pending' | 'partial' | 'paid';
  paid_amount: number;
}

const FinanceExpensePage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();
  
  const [activeTab, setActiveTab] = useState<'expenses' | 'budget' | 'receivable' | 'payable'>('expenses');
  const [searchQuery, setSearchQuery] = useState('');

  const [expenses] = useState<ExpenseRecord[]>([
    { id: '1', expense_number: 'EXP202605001', applicant_name: '张伟', department: '研发部', expense_type: 'travel', amount: 2500, description: '北京出差', expense_date: '2026-05-20', receipt_count: 3, status: 'approved', approver: '刘经理', approved_at: '2026-05-22' },
    { id: '2', expense_number: 'EXP202605002', applicant_name: '李娜', department: '产品部', expense_type: 'meals', amount: 800, description: '客户招待', expense_date: '2026-05-21', receipt_count: 2, status: 'pending' },
    { id: '3', expense_number: 'EXP202605003', applicant_name: '王强', department: '销售部', expense_type: 'transport', amount: 1500, description: '拜访客户交通费', expense_date: '2026-05-19', receipt_count: 5, status: 'reimbursed', approver: '孙经理', approved_at: '2026-05-20', reimbursed_at: '2026-05-23' },
    { id: '4', expense_number: 'EXP202605004', applicant_name: '赵丽', department: '财务部', expense_type: 'office', amount: 2000, description: '办公用品采购', expense_date: '2026-05-18', receipt_count: 1, status: 'approved', approver: '刘经理', approved_at: '2026-05-19' },
  ]);

  const [budgets] = useState<BudgetRecord[]>([
    { id: '1', department: '研发部', budget_type: '运营预算', fiscal_year: '2026', total_budget: 500000, used_amount: 280000, remaining_amount: 220000, usage_rate: 56, status: 'active' },
    { id: '2', department: '销售部', budget_type: '营销预算', fiscal_year: '2026', total_budget: 800000, used_amount: 650000, remaining_amount: 150000, usage_rate: 81.25, status: 'active' },
    { id: '3', department: '人事部', budget_type: '人力预算', fiscal_year: '2026', total_budget: 1200000, used_amount: 980000, remaining_amount: 220000, usage_rate: 81.67, status: 'active' },
    { id: '4', department: '行政部', budget_type: '运营预算', fiscal_year: '2026', total_budget: 300000, used_amount: 290000, remaining_amount: 10000, usage_rate: 96.67, status: 'frozen' },
  ]);

  const [receivables] = useState<ReceivableRecord[]>([
    { id: '1', invoice_number: 'INV202605001', customer_name: '华联科技', project_name: 'ERP系统开发', amount: 500000, invoice_date: '2026-05-15', due_date: '2026-06-15', status: 'pending', received_amount: 0 },
    { id: '2', invoice_number: 'INV202605002', customer_name: '中软国际', project_name: 'CRM系统实施', amount: 300000, invoice_date: '2026-05-10', due_date: '2026-06-10', status: 'partial', received_amount: 150000 },
    { id: '3', invoice_number: 'INV202605003', customer_name: '华为技术', project_name: '系统集成项目', amount: 800000, invoice_date: '2026-04-20', due_date: '2026-05-20', status: 'received', received_amount: 800000 },
  ]);

  const [payables] = useState<PayableRecord[]>([
    { id: '1', invoice_number: 'PO202605001', supplier_name: '阿里云', category: '云服务', amount: 50000, invoice_date: '2026-05-20', due_date: '2026-06-20', status: 'pending', paid_amount: 0 },
    { id: '2', invoice_number: 'PO202605002', supplier_name: '腾讯云', category: '云服务', amount: 30000, invoice_date: '2026-05-15', due_date: '2026-06-15', status: 'partial', paid_amount: 15000 },
    { id: '3', invoice_number: 'PO202605003', supplier_name: '华为云', category: '云服务', amount: 80000, invoice_date: '2026-04-25', due_date: '2026-05-25', status: 'paid', paid_amount: 80000 },
  ]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, React.ReactNode> = {
      draft: <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">草稿</span>,
      pending: <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center"><Clock className="w-3 h-3 mr-1" />待审批</span>,
      approved: <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center"><CheckCircle className="w-3 h-3 mr-1" />已批准</span>,
      rejected: <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center"><XCircle className="w-3 h-3 mr-1" />已拒绝</span>,
      reimbursed: <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center"><DollarSign className="w-3 h-3 mr-1" />已报销</span>,
      active: <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">执行中</span>,
      frozen: <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">已冻结</span>,
      exhausted: <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">已耗尽</span>,
      partial: <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">部分</span>,
      received: <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">已收款</span>,
      paid: <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">已付款</span>,
    };
    return badges[status] || <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{status}</span>;
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

  const filteredExpenses = expenses.filter(e => 
    e.applicant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.expense_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationContainer notifications={notifications} onClose={hideNotification} />
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Receipt className="w-7 h-7 mr-3 text-indigo-600" />
                  费用管理
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  管理费用报销、预算、应收应付款项
                </p>
              </div>
            </div>
            <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <Plus className="w-5 h-5 mr-2" />
              新增报销
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-4 mb-6 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'expenses' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span>费用报销</span>
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'budget' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span>预算管理</span>
          </button>
          <button
            onClick={() => setActiveTab('receivable')}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'receivable' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>应收账款</span>
          </button>
          <button
            onClick={() => setActiveTab('payable')}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'payable' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span>应付账款</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Download className="w-5 h-5 mr-2" />
              导出
            </button>
          </div>
        </div>

        {/* Content - Expenses */}
        {activeTab === 'expenses' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">报销单号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">申请人</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">费用类型</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">费用日期</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">票据数量</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{expense.expense_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{expense.applicant_name}</div>
                        <div className="text-sm text-gray-500">{expense.department}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{getExpenseTypeName(expense.expense_type)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-red-600">{formatCurrency(expense.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.expense_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.receipt_count}张</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(expense.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-800">查看</button>
                          {expense.status === 'pending' && (
                            <>
                              <button className="text-green-600 hover:text-green-800">批准</button>
                              <button className="text-red-600 hover:text-red-800">拒绝</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content - Budget */}
        {activeTab === 'budget' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {budgets.map((budget) => (
              <div key={budget.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{budget.department}</h3>
                    <p className="text-sm text-gray-500">{budget.budget_type} · {budget.fiscal_year}年</p>
                  </div>
                  {getStatusBadge(budget.status)}
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">预算使用进度</span>
                    <span className={`font-bold ${budget.usage_rate > 80 ? 'text-red-600' : 'text-blue-600'}`}>
                      {budget.usage_rate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all ${budget.usage_rate > 90 ? 'bg-red-500' : budget.usage_rate > 70 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                      style={{ width: `${budget.usage_rate}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">预算总额</p>
                    <p className="font-bold text-gray-900">{formatCurrency(budget.total_budget)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">已使用</p>
                    <p className="font-bold text-blue-600">{formatCurrency(budget.used_amount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">剩余</p>
                    <p className={`font-bold ${budget.remaining_amount < budget.total_budget * 0.2 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(budget.remaining_amount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Content - Receivable */}
        {activeTab === 'receivable' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">发票号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">客户名称</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">项目名称</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">开票金额</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">应收金额</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">到期日</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {receivables.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{rec.invoice_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rec.customer_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rec.project_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-red-600">{formatCurrency(rec.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(rec.amount - rec.received_amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{rec.due_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(rec.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content - Payable */}
        {activeTab === 'payable' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">单据号</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">供应商</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类别</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">应付金额</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">已付金额</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">到期日</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payables.map((pay) => (
                    <tr key={pay.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{pay.invoice_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pay.supplier_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pay.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-lg font-bold text-red-600">{formatCurrency(pay.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(pay.paid_amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pay.due_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(pay.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinanceExpensePage;
