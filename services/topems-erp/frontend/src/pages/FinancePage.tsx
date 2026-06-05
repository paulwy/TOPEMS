import React, { useEffect, useState } from 'react';
import { expenseApi, type Expense } from '../api/erp';

const FinancePage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<Partial<Expense>>({
    title: '',
    amount: 0,
    category: 'other',
    description: '',
    status: 'pending',
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = selectedCategory !== 'all' ? { category: selectedCategory } : undefined;
      const response = await expenseApi.list(params);
      if (response.success && response.data) {
        setExpenses(response.data.items || []);
      }
    } catch (err) {
      setError('获取报销列表失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [selectedCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await expenseApi.update(editingExpense.id, formData);
      } else {
        await expenseApi.create(formData);
      }
      setShowModal(false);
      setEditingExpense(null);
      fetchExpenses();
    } catch (err) {
      console.error('操作失败', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个报销吗？')) return;
    try {
      await expenseApi.delete(id);
      fetchExpenses();
    } catch (err) {
      console.error('删除失败', err);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await expenseApi.update(id, { status: 'approved' });
      fetchExpenses();
    } catch (err) {
      console.error('审批失败', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await expenseApi.update(id, { status: 'rejected' });
      fetchExpenses();
    } catch (err) {
      console.error('拒绝失败', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      reimbursed: 'bg-blue-100 text-blue-800',
    };
    const labels: Record<string, string> = {
      pending: '待审批',
      approved: '已批准',
      rejected: '已拒绝',
      reimbursed: '已报销',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getCategoryLabel = (category?: string) => {
    const labels: Record<string, string> = {
      travel: '差旅费',
      meal: '餐饮费',
      office: '办公用品',
      equipment: '设备采购',
      training: '培训费',
      marketing: '营销费用',
      other: '其他',
    };
    return labels[category || 'other'] || category;
  };

  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const approvedAmount = expenses
    .filter(expense => expense.status === 'approved' || expense.status === 'reimbursed')
    .reduce((sum, expense) => sum + expense.amount, 0);
  const pendingAmount = expenses
    .filter(expense => expense.status === 'pending')
    .reduce((sum, expense) => sum + expense.amount, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">财务管理</h1>
        <button
          onClick={() => {
            setEditingExpense(null);
            setFormData({
              title: '',
              amount: 0,
              category: 'other',
              description: '',
              status: 'pending',
            });
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          新增报销
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
          <div className="text-sm text-gray-500 mb-1">总支出</div>
          <div className="text-2xl font-bold text-gray-900">¥{totalAmount.toFixed(2)}</div>
        </div>
        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
          <div className="text-sm text-gray-500 mb-1">已批准</div>
          <div className="text-2xl font-bold text-green-600">¥{approvedAmount.toFixed(2)}</div>
        </div>
        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
          <div className="text-sm text-gray-500 mb-1">待审批</div>
          <div className="text-2xl font-bold text-yellow-600">¥{pendingAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* 筛选 */}
      <div className="mb-4">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="all">全部分类</option>
          <option value="travel">差旅费</option>
          <option value="meal">餐饮费</option>
          <option value="office">办公用品</option>
          <option value="equipment">设备采购</option>
          <option value="training">培训费</option>
          <option value="marketing">营销费用</option>
          <option value="other">其他</option>
        </select>
      </div>

      {/* 报销列表 */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分类</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金额</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.map((expense) => (
              <tr key={expense.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{expense.title}</div>
                  {expense.description && (
                    <div className="text-sm text-gray-500 mt-1">{expense.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{getCategoryLabel(expense.category)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">¥{expense.amount.toFixed(2)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(expense.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {new Date(expense.expense_date || expense.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  {expense.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(expense.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        批准
                      </button>
                      <button
                        onClick={() => handleReject(expense.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        拒绝
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setEditingExpense(expense);
                      setFormData(expense);
                      setShowModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {expenses.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">暂无报销记录</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingExpense ? '编辑报销' : '新增报销'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                <input
                  type="text"
                  required
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">金额 *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount || 0}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                <select
                    value={formData.category || 'other'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                  <option value="travel">差旅费</option>
                  <option value="meal">餐饮费</option>
                  <option value="office">办公用品</option>
                  <option value="equipment">设备采购</option>
                  <option value="training">培训费</option>
                  <option value="marketing">营销费用</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">日期</label>
                <input
                  type="date"
                  value={formData.expense_date?.split('T')[0] || ''}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              {editingExpense && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  <select
                      value={formData.status || 'pending'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                    <option value="pending">待审批</option>
                    <option value="approved">已批准</option>
                    <option value="rejected">已拒绝</option>
                    <option value="reimbursed">已报销</option>
                  </select>
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancePage;
