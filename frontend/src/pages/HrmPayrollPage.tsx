import React, { useState } from 'react';
import { 
  DollarSign, FileText, TrendingUp, Calculator,
  Search, Plus, ChevronLeft, Eye, Download, Calendar,
  CheckCircle, XCircle, Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../hooks/useNotification';

interface PayrollRecord {
  id: string;
  employee_name: string;
  employee_number: string;
  department: string;
  position: string;
  base_salary: number;
  bonus: number;
  allowance: number;
  deduction: number;
  social_security: number;
  housing_fund: number;
  income_tax: number;
  net_salary: number;
  payment_date?: string;
  status: 'pending' | 'processing' | 'paid';
  period: string;
}

interface SalaryAdjustment {
  id: string;
  employee_name: string;
  department: string;
  adjustment_type: 'promotion' | 'demotion' | 'bonus' | 'deduction';
  old_salary: number;
  new_salary: number;
  adjustment_amount: number;
  reason: string;
  effective_date: string;
  status: 'pending' | 'approved' | 'rejected';
  applicant: string;
  applied_at: string;
}

interface PayrollSummary {
  total_employees: number;
  total_base_salary: number;
  total_bonus: number;
  total_deductions: number;
  total_net_salary: number;
  period: string;
}

const HrmPayrollPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();
  
  const [activeTab, setActiveTab] = useState<'payroll' | 'adjustments' | 'calculator'>('payroll');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('2026-05');

  const [payrollRecords] = useState<PayrollRecord[]>([
    { id: '1', employee_name: '张伟', employee_number: 'EMP001', department: '研发部', position: '高级工程师', base_salary: 30000, bonus: 5000, allowance: 2000, deduction: 1000, social_security: 2400, housing_fund: 1800, income_tax: 3500, net_salary: 28300, payment_date: '2026-05-15', status: 'paid', period: '2026-05' },
    { id: '2', employee_name: '李娜', employee_number: 'EMP002', department: '产品部', position: '产品经理', base_salary: 25000, bonus: 3000, allowance: 1500, deduction: 500, social_security: 2000, housing_fund: 1500, income_tax: 2500, net_salary: 24000, payment_date: '2026-05-15', status: 'paid', period: '2026-05' },
    { id: '3', employee_name: '王强', employee_number: 'EMP003', department: '销售部', position: '销售经理', base_salary: 20000, bonus: 8000, allowance: 1000, deduction: 0, social_security: 1600, housing_fund: 1200, income_tax: 2000, net_salary: 24200, status: 'processing', period: '2026-05' },
    { id: '4', employee_name: '赵丽', employee_number: 'EMP004', department: '财务部', position: '财务主管', base_salary: 22000, bonus: 2000, allowance: 1000, deduction: 0, social_security: 1760, housing_fund: 1320, income_tax: 2200, net_salary: 19720, status: 'pending', period: '2026-05' },
    { id: '5', employee_name: '孙明', employee_number: 'EMP005', department: '研发部', position: '工程师', base_salary: 15000, bonus: 2000, allowance: 500, deduction: 0, social_security: 1200, housing_fund: 900, income_tax: 1200, net_salary: 14200, status: 'pending', period: '2026-05' },
  ]);

  const [adjustments] = useState<SalaryAdjustment[]>([
    { id: '1', employee_name: '张伟', department: '研发部', adjustment_type: 'promotion', old_salary: 25000, new_salary: 30000, adjustment_amount: 5000, reason: '晋升为高级工程师', effective_date: '2026-06-01', status: 'approved', applicant: '刘经理', applied_at: '2026-05-20' },
    { id: '2', employee_name: '李娜', department: '产品部', adjustment_type: 'bonus', old_salary: 25000, new_salary: 25000, adjustment_amount: 3000, reason: 'Q1绩效奖金', effective_date: '2026-05-01', status: 'approved', applicant: '赵总', applied_at: '2026-04-25' },
    { id: '3', employee_name: '王强', department: '销售部', adjustment_type: 'bonus', old_salary: 20000, new_salary: 20000, adjustment_amount: 8000, reason: '4月销售冠军奖励', effective_date: '2026-05-01', status: 'pending', applicant: '孙经理', applied_at: '2026-05-01' },
  ]);

  const summary: PayrollSummary = {
    total_employees: payrollRecords.length,
    total_base_salary: payrollRecords.reduce((sum, r) => sum + r.base_salary, 0),
    total_bonus: payrollRecords.reduce((sum, r) => sum + r.bonus, 0),
    total_deductions: payrollRecords.reduce((sum, r) => sum + r.deduction + r.social_security + r.housing_fund + r.income_tax, 0),
    total_net_salary: payrollRecords.reduce((sum, r) => sum + r.net_salary, 0),
    period: selectedPeriod,
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, React.ReactNode> = {
      pending: <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center"><Clock className="w-3 h-3 mr-1" />待发放</span>,
      processing: <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center"><Calculator className="w-3 h-3 mr-1" />计算中</span>,
      paid: <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center"><CheckCircle className="w-3 h-3 mr-1" />已发放</span>,
      approved: <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">已批准</span>,
      rejected: <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">已拒绝</span>,
    };
    return badges[status] || <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">{status}</span>;
  };

  const getAdjustmentTypeName = (type: string) => {
    const types: Record<string, string> = {
      promotion: '晋升调薪',
      demotion: '降职调薪',
      bonus: '奖金发放',
      deduction: '扣款',
    };
    return types[type] || type;
  };

  const filteredRecords = payrollRecords.filter(r => 
    r.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

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
                  <DollarSign className="w-7 h-7 mr-3 text-emerald-600" />
                  薪酬管理
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  管理员工薪资、奖金、社保和个税计算
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="2026-05">2026年5月</option>
                <option value="2026-04">2026年4月</option>
                <option value="2026-03">2026年3月</option>
              </select>
              <button className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                <Calculator className="w-5 h-5 mr-2" />
                计算薪资
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">发放人数</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_employees}人</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">基本工资合计</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_base_salary)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">奖金合计</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.total_bonus)}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">实发工资合计</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.total_net_salary)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('payroll')}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'payroll' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>工资条</span>
          </button>
          <button
            onClick={() => setActiveTab('adjustments')}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'adjustments' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span>调薪记录</span>
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'calculator' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calculator className="w-5 h-5" />
            <span>个税计算器</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索员工姓名/部门..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <Download className="w-5 h-5 mr-2" />
              导出工资条
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'payroll' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">员工姓名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">部门/岗位</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">基本工资</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">奖金</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">社保公积金</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">个税</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">实发工资</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{record.employee_name}</div>
                        <div className="text-sm text-gray-500">{record.employee_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{record.department}</div>
                        <div className="text-sm text-gray-500">{record.position}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(record.base_salary)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-medium">{formatCurrency(record.bonus)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(record.social_security + record.housing_fund)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{formatCurrency(record.income_tax)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-blue-600">{formatCurrency(record.net_salary)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(record.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-blue-600 hover:text-blue-800">查看</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'adjustments' && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">员工姓名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">调薪类型</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">原工资</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">新工资</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">调整金额</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">原因</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">生效日期</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adjustments.map((adj) => (
                    <tr key={adj.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{adj.employee_name}</div>
                        <div className="text-sm text-gray-500">{adj.department}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getAdjustmentTypeName(adj.adjustment_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(adj.old_salary)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(adj.new_salary)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                        +{formatCurrency(adj.adjustment_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">{adj.reason}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{adj.effective_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(adj.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'calculator' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">个税计算器</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">税前月收入 (元)</label>
                <input
                  type="number"
                  placeholder="请输入税前收入"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">社保公积金 (元)</label>
                <input
                  type="number"
                  placeholder="请输入社保公积金"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">专项附加扣除 (元)</label>
                <input
                  type="number"
                  placeholder="请输入专项附加扣除"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  计算
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HrmPayrollPage;
