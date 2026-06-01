import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Eye, Edit, Trash2, FileText, Calendar, AlertCircle, Check, X, RefreshCw, Clock } from 'lucide-react';
import type { Contract, ContractRenewal, Employee } from '../api/hrm';
import { contractApi, contractRenewalApi, employeeApi } from '../api/hrm';
import type { PaginatedResult } from '../api/hrm';

const contractTypes = [
  { value: 'labor', label: '劳动合同' },
  { value: 'probation', label: '试用期合同' },
  { value: 'part-time', label: '兼职合同' },
  { value: 'project', label: '项目合同' },
  { value: 'consulting', label: '咨询合同' },
];

const statusMap: Record<string, { text: string; color: string }> = {
  active: { text: '生效中', color: 'bg-green-100 text-green-800' },
  expired: { text: '已到期', color: 'bg-red-100 text-red-800' },
  terminated: { text: '已终止', color: 'bg-gray-100 text-gray-600' },
  pending: { text: '待审批', color: 'bg-orange-100 text-orange-800' },
};

const renewalStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待审批', color: 'bg-orange-100 text-orange-800' },
  approved: { text: '已批准', color: 'bg-green-100 text-green-800' },
  rejected: { text: '已拒绝', color: 'bg-red-100 text-red-800' },
  executed: { text: '已执行', color: 'bg-blue-100 text-blue-800' },
};

const renewalTypes = [
  { value: 'regular', label: '常规续签' },
  { value: 'promotion', label: '升职续签' },
  { value: 'demotion', label: '降职续签' },
  { value: 'transfer', label: '调岗续签' },
];

interface FormState {
  employee_id: string;
  contract_no: string;
  contract_type: string;
  party_a_name: string;
  party_a_contact: string;
  party_b_name: string;
  party_b_contact: string;
  start_date: string;
  end_date: string;
  salary: string;
  probation_period_days: string;
  reminder_days: string;
  contract_file_path: string;
  notes: string;
}

interface RenewFormState {
  renewal_type: string;
  new_start_date: string;
  new_end_date: string;
  new_salary: string;
  renewal_reason: string;
}

export default function HrmContractPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Contract>>({ items: [], total: 0, page: 1, page_size: 20 });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit' | 'view'>('create');
  const [currentContract, setCurrentContract] = useState<Contract | null>(null);
  const [formState, setFormState] = useState<FormState>({
    employee_id: '',
    contract_no: '',
    contract_type: '',
    party_a_name: '',
    party_a_contact: '',
    party_b_name: '',
    party_b_contact: '',
    start_date: '',
    end_date: '',
    salary: '',
    probation_period_days: '',
    reminder_days: '30',
    contract_file_path: '',
    notes: '',
  });

  const [renewModalVisible, setRenewModalVisible] = useState(false);
  const [renewFormState, setRenewFormState] = useState<RenewFormState>({
    renewal_type: 'regular',
    new_start_date: '',
    new_end_date: '',
    new_salary: '',
    renewal_reason: '',
  });
  const [renewContractId, setRenewContractId] = useState('');

  const [renewals, setRenewals] = useState<ContractRenewal[]>([]);
  const [showRenewals, setShowRenewals] = useState(false);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; onConfirm: () => void } | null>(null);

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const showConfirm = useCallback((title: string, onConfirm: () => void) => {
    setConfirmDialog({ title, onConfirm });
  }, []);

  useEffect(() => {
    loadData();
    loadEmployees();
  }, [currentPage, statusFilter, showExpiringOnly]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        page_size: 20,
      };
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (showExpiringOnly) {
        const result = await contractApi.getExpiring({ days: 30, page: currentPage, page_size: 20 });
        if (result.code === 0) {
          setData(result.data);
        } else {
          showNotification('error', result.message || '获取即将到期合同失败');
        }
      } else {
        const result = await contractApi.list(params);
        if (result.code === 0) {
          setData(result.data);
        } else {
          showNotification('error', result.message || '获取合同列表失败');
        }
      }
    } catch (error) {
      showNotification('error', '获取合同列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const result = await employeeApi.list({ page: 1, page_size: 100 });
      if (result.code === 0) {
        setEmployees(result.data.items);
      }
    } catch (error) {
      console.error('获取员工列表失败', error);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadData();
  };

  const handleCreate = () => {
    setModalType('create');
    setCurrentContract(null);
    setFormState({
      employee_id: '',
      contract_no: '',
      contract_type: '',
      party_a_name: '',
      party_a_contact: '',
      party_b_name: '',
      party_b_contact: '',
      start_date: '',
      end_date: '',
      salary: '',
      probation_period_days: '',
      reminder_days: '30',
      contract_file_path: '',
      notes: '',
    });
    setModalVisible(true);
  };

  const handleEdit = (contract: Contract) => {
    setModalType('edit');
    setCurrentContract(contract);
    setFormState({
      employee_id: contract.employee_id || '',
      contract_no: contract.contract_no || '',
      contract_type: contract.contract_type || '',
      party_a_name: contract.party_a_name || '',
      party_a_contact: contract.party_a_contact || '',
      party_b_name: contract.party_b_name || '',
      party_b_contact: contract.party_b_contact || '',
      start_date: contract.start_date || '',
      end_date: contract.end_date || '',
      salary: contract.salary?.toString() || '',
      probation_period_days: contract.probation_period_days?.toString() || '',
      reminder_days: contract.reminder_days?.toString() || '30',
      contract_file_path: contract.contract_file_path || '',
      notes: contract.notes || '',
    });
    setModalVisible(true);
  };

  const handleView = async (contract: Contract) => {
    setModalType('view');
    setCurrentContract(contract);
    const result = await contractRenewalApi.list({ contract_id: contract.id });
    if (result.code === 0) {
      setRenewals(result.data.items);
    }
    setShowRenewals(false);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await contractApi.delete(id);
      if (result.code === 0) {
        showNotification('success', '删除成功');
        loadData();
      } else {
        showNotification('error', result.message || '删除失败');
      }
    } catch (error) {
      showNotification('error', '删除失败');
    }
  };

  const handleSave = async () => {
    if (!formState.employee_id) {
      showNotification('error', '请选择员工');
      return;
    }
    if (!formState.contract_type) {
      showNotification('error', '请选择合同类型');
      return;
    }
    if (!formState.start_date) {
      showNotification('error', '请选择开始日期');
      return;
    }

    const values = {
      ...formState,
      salary: formState.salary ? parseInt(formState.salary) : undefined,
      probation_period_days: formState.probation_period_days ? parseInt(formState.probation_period_days) : undefined,
      reminder_days: formState.reminder_days ? parseInt(formState.reminder_days) : undefined,
    };

    try {
      if (modalType === 'create') {
        const result = await contractApi.create(values);
        if (result.code === 0) {
          showNotification('success', '创建成功');
          setModalVisible(false);
          loadData();
        } else {
          showNotification('error', result.message || '创建失败');
        }
      } else if (currentContract) {
        const result = await contractApi.update(currentContract.id, values);
        if (result.code === 0) {
          showNotification('success', '更新成功');
          setModalVisible(false);
          loadData();
        } else {
          showNotification('error', result.message || '更新失败');
        }
      }
    } catch (error) {
      showNotification('error', '保存失败');
    }
  };

  const handleRenew = (contract: Contract) => {
    setRenewContractId(contract.id);
    setRenewFormState({
      renewal_type: 'regular',
      new_start_date: contract.end_date || new Date().toISOString().split('T')[0],
      new_end_date: '',
      new_salary: '',
      renewal_reason: '',
    });
    setRenewModalVisible(true);
  };

  const handleSubmitRenew = async () => {
    if (!renewFormState.new_start_date) {
      showNotification('error', '请选择新合同开始日期');
      return;
    }

    const values = {
      ...renewFormState,
      new_salary: renewFormState.new_salary ? parseInt(renewFormState.new_salary) : undefined,
    };

    try {
      const result = await contractApi.renew(renewContractId, values);
      if (result.code === 0) {
        showNotification('success', '续签申请提交成功');
        setRenewModalVisible(false);
      } else {
        showNotification('error', result.message || '提交失败');
      }
    } catch (error) {
      showNotification('error', '提交失败');
    }
  };

  const handleApproveRenewal = async (id: string) => {
    try {
      const result = await contractRenewalApi.approve(id);
      if (result.code === 0) {
        showNotification('success', '续签申请已批准');
        loadData();
      } else {
        showNotification('error', result.message || '操作失败');
      }
    } catch (error) {
      showNotification('error', '操作失败');
    }
  };

  const handleRejectRenewal = async (id: string) => {
    const reason = prompt('请输入拒绝理由：');
    if (!reason) return;
    try {
      const result = await contractRenewalApi.reject(id, reason);
      if (result.code === 0) {
        showNotification('success', '续签申请已拒绝');
        loadData();
      } else {
        showNotification('error', result.message || '操作失败');
      }
    } catch (error) {
      showNotification('error', '操作失败');
    }
  };

  const handleExecuteRenewal = async (id: string) => {
    try {
      const result = await contractRenewalApi.execute(id);
      if (result.code === 0) {
        showNotification('success', '合同续签已执行');
        loadData();
      } else {
        showNotification('error', result.message || '操作失败');
      }
    } catch (error) {
      showNotification('error', '操作失败');
    }
  };

  const getEmployeeName = (id?: string) => {
    if (!id) return '-';
    return employees.find(e => e.id === id)?.name || '-';
  };

  const getDaysUntilExpiry = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const hasExpiringSoon = (endDate?: string) => {
    const days = getDaysUntilExpiry(endDate);
    return days !== null && days > 0 && days <= 30;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium mb-4">{confirmDialog.title}</h3>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">合同管理</h1>
              <p className="text-sm text-gray-500 mt-1">管理员工合同信息，包括合同创建、到期提醒和续签流程</p>
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
            >
              <Plus size={18} />
              新建合同
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-4 py-3 border-b flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="搜索合同编号或员工姓名"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{ width: 160 }}
              >
                <option value="">全部状态</option>
                <option value="active">生效中</option>
                <option value="expired">已到期</option>
                <option value="terminated">已终止</option>
              </select>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showExpiringOnly}
                  onChange={(e) => {
                    setShowExpiringOnly(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">仅显示即将到期(30天内)</span>
              </label>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <RefreshCw size={16} />
              刷新
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">合同编号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">员工</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">合同类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">薪资</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">有效期</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : data.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">暂无数据</td>
                  </tr>
                ) : (
                  data.items.map((item) => {
                    const days = getDaysUntilExpiry(item.end_date);
                    const isExpiringSoon = hasExpiringSoon(item.end_date);
                    
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-blue-500" />
                            <span className="font-medium text-gray-900">{item.contract_no || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getEmployeeName(item.employee_id)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {contractTypes.find(t => t.value === item.contract_type)?.label || item.contract_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.salary ? `${item.salary.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-gray-400" />
                            <span className={`text-sm ${isExpiringSoon ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
                              {new Date(item.start_date).toLocaleDateString('zh-CN')} ~ {item.end_date ? new Date(item.end_date).toLocaleDateString('zh-CN') : '无固定期限'}
                            </span>
                          </div>
                          {isExpiringSoon && days !== null && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-orange-600">
                              <AlertCircle size={12} />
                              <span>剩余{days}天到期</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusMap[item.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                            {statusMap[item.status]?.text || item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleView(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="查看"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="编辑"
                            >
                              <Edit size={18} />
                            </button>
                            {item.status === 'active' && (
                              <button
                                onClick={() => handleRenew(item)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                title="续签"
                              >
                                <RefreshCw size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => showConfirm('确定删除该合同吗?', () => handleDelete(item.id))}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="删除"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t flex items-center justify-between">
            <span className="text-sm text-gray-500">
              共 {data.total} 条记录
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="text-sm text-gray-600 px-2">第 {currentPage} 页</span>
              <button
                disabled={currentPage * data.page_size >= data.total}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-medium">
                {modalType === 'create' ? '新建合同' : modalType === 'edit' ? '编辑合同' : '合同详情'}
              </h2>
              <button
                onClick={() => {
                  setModalVisible(false);
                  setShowRenewals(false);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {modalType !== 'view' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">员工 *</label>
                    <select
                      value={formState.employee_id}
                      onChange={(e) => setFormState(s => ({ ...s, employee_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">请选择员工</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">合同编号</label>
                    <input
                      type="text"
                      value={formState.contract_no}
                      onChange={(e) => setFormState(s => ({ ...s, contract_no: e.target.value }))}
                      disabled={modalType === 'create'}
                      placeholder={modalType === 'create' ? '自动生成' : ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">合同类型 *</label>
                    <select
                      value={formState.contract_type}
                      onChange={(e) => setFormState(s => ({ ...s, contract_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">请选择合同类型</option>
                      {contractTypes.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">甲方名称</label>
                      <input
                        type="text"
                        value={formState.party_a_name}
                        onChange={(e) => setFormState(s => ({ ...s, party_a_name: e.target.value }))}
                        placeholder="公司名称"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">甲方联系人</label>
                      <input
                        type="text"
                        value={formState.party_a_contact}
                        onChange={(e) => setFormState(s => ({ ...s, party_a_contact: e.target.value }))}
                        placeholder="联系人姓名"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">乙方名称</label>
                      <input
                        type="text"
                        value={formState.party_b_name}
                        onChange={(e) => setFormState(s => ({ ...s, party_b_name: e.target.value }))}
                        placeholder="员工姓名"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">乙方联系人</label>
                      <input
                        type="text"
                        value={formState.party_b_contact}
                        onChange={(e) => setFormState(s => ({ ...s, party_b_contact: e.target.value }))}
                        placeholder="员工联系方式"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">开始日期 *</label>
                      <input
                        type="date"
                        value={formState.start_date}
                        onChange={(e) => setFormState(s => ({ ...s, start_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
                      <input
                        type="date"
                        value={formState.end_date}
                        onChange={(e) => setFormState(s => ({ ...s, end_date: e.target.value }))}
                        placeholder="无固定期限"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">薪资</label>
                      <input
                        type="number"
                        value={formState.salary}
                        onChange={(e) => setFormState(s => ({ ...s, salary: e.target.value }))}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">试用期(天)</label>
                      <input
                        type="number"
                        value={formState.probation_period_days}
                        onChange={(e) => setFormState(s => ({ ...s, probation_period_days: e.target.value }))}
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">提前提醒天数</label>
                      <input
                        type="number"
                        value={formState.reminder_days}
                        onChange={(e) => setFormState(s => ({ ...s, reminder_days: e.target.value }))}
                        placeholder="30"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">合同文件路径</label>
                    <input
                      type="text"
                      value={formState.contract_file_path}
                      onChange={(e) => setFormState(s => ({ ...s, contract_file_path: e.target.value }))}
                      placeholder="上传文件路径"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                    <textarea
                      value={formState.notes}
                      onChange={(e) => setFormState(s => ({ ...s, notes: e.target.value }))}
                      rows={3}
                      placeholder="备注信息"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  {currentContract && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded p-3">
                          <span className="text-sm text-gray-500">合同编号</span>
                          <p className="font-medium">{currentContract.contract_no || '-'}</p>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <span className="text-sm text-gray-500">员工</span>
                          <p className="font-medium">{getEmployeeName(currentContract.employee_id)}</p>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <span className="text-sm text-gray-500">合同类型</span>
                          <p className="font-medium">
                            {contractTypes.find(t => t.value === currentContract.contract_type)?.label || currentContract.contract_type}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <span className="text-sm text-gray-500">状态</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusMap[currentContract.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                            {statusMap[currentContract.status]?.text || currentContract.status}
                          </span>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <span className="text-sm text-gray-500">薪资</span>
                          <p className="font-medium">{currentContract.salary?.toLocaleString() || '-'}</p>
                        </div>
                        <div className="bg-gray-50 rounded p-3">
                          <span className="text-sm text-gray-500">试用期</span>
                          <p className="font-medium">{currentContract.probation_period_days || 0} 天</p>
                        </div>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <span className="text-sm text-gray-500">有效期</span>
                        <p className="font-medium">
                          {new Date(currentContract.start_date).toLocaleDateString('zh-CN')} 
                          ~ {currentContract.end_date ? new Date(currentContract.end_date).toLocaleDateString('zh-CN') : '无固定期限'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <span className="text-sm text-gray-500">甲方信息</span>
                        <p className="font-medium">{currentContract.party_a_name || '-'}</p>
                        <p className="text-sm">{currentContract.party_a_contact || '-'}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <span className="text-sm text-gray-500">乙方信息</span>
                        <p className="font-medium">{currentContract.party_b_name || '-'}</p>
                        <p className="text-sm">{currentContract.party_b_contact || '-'}</p>
                      </div>
                      {currentContract.notes && (
                        <div className="bg-gray-50 rounded p-3">
                          <span className="text-sm text-gray-500">备注</span>
                          <p className="font-medium">{currentContract.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {showRenewals && (
                    <div className="mt-4 pt-4 border-t">
                      <h3 className="font-medium mb-3">续签记录</h3>
                      {renewals.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">暂无续签记录</p>
                      ) : (
                        <div className="space-y-2">
                          {renewals.map(renewal => (
                            <div key={renewal.id} className="border rounded p-3">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="font-medium">{renewalTypes.find(t => t.value === renewal.renewal_type)?.label || renewal.renewal_type}</span>
                                  <span className="ml-2 text-sm text-gray-500">
                                    {new Date(renewal.created_at).toLocaleString('zh-CN')}
                                  </span>
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${renewalStatusMap[renewal.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                                  {renewalStatusMap[renewal.status]?.text || renewal.status}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mb-2">
                                新合同期限: {new Date(renewal.new_start_date).toLocaleDateString('zh-CN')} ~ {renewal.new_end_date ? new Date(renewal.new_end_date).toLocaleDateString('zh-CN') : '无固定期限'}
                              </div>
                              {renewal.new_salary && (
                                <div className="text-sm text-gray-600 mb-2">
                                  新薪资: {renewal.new_salary.toLocaleString()}
                                </div>
                              )}
                              {renewal.renewal_reason && (
                                <div className="text-sm text-gray-600 mb-2">
                                  续签原因: {renewal.renewal_reason}
                                </div>
                              )}
                              {renewal.rejection_reason && (
                                <div className="text-sm text-red-600">
                                  拒绝理由: {renewal.rejection_reason}
                                </div>
                              )}
                              <div className="flex gap-2 mt-3">
                                {renewal.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleApproveRenewal(renewal.id)}
                                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                                    >
                                      <Check size={14} />
                                      批准
                                    </button>
                                    <button
                                      onClick={() => handleRejectRenewal(renewal.id)}
                                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                                    >
                                      <X size={14} />
                                      拒绝
                                    </button>
                                  </>
                                )}
                                {renewal.status === 'approved' && (
                                  <button
                                    onClick={() => handleExecuteRenewal(renewal.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                                  >
                                    <RefreshCw size={14} />
                                    执行续签
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              {modalType !== 'view' ? (
                <>
                  <button
                    onClick={() => setModalVisible(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                  >
                    {modalType === 'create' ? '创建' : '保存'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowRenewals(!showRenewals)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    {showRenewals ? '隐藏续签记录' : '查看续签记录'}
                  </button>
                  <button
                    onClick={() => setModalVisible(false)}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
                  >
                    关闭
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {renewModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-medium">合同续签申请</h2>
              <button
                onClick={() => setRenewModalVisible(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">续签类型 *</label>
                <select
                  value={renewFormState.renewal_type}
                  onChange={(e) => setRenewFormState(s => ({ ...s, renewal_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">请选择续签类型</option>
                  {renewalTypes.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">新合同开始日期 *</label>
                  <input
                    type="date"
                    value={renewFormState.new_start_date}
                    onChange={(e) => setRenewFormState(s => ({ ...s, new_start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">新合同结束日期</label>
                  <input
                    type="date"
                    value={renewFormState.new_end_date}
                    onChange={(e) => setRenewFormState(s => ({ ...s, new_end_date: e.target.value }))}
                    placeholder="无固定期限"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新薪资</label>
                <input
                  type="number"
                  value={renewFormState.new_salary}
                  onChange={(e) => setRenewFormState(s => ({ ...s, new_salary: e.target.value }))}
                  placeholder="不修改请留空"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">续签原因</label>
                <textarea
                  value={renewFormState.renewal_reason}
                  onChange={(e) => setRenewFormState(s => ({ ...s, renewal_reason: e.target.value }))}
                  rows={3}
                  placeholder="请说明续签原因"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t">
              <button
                onClick={() => setRenewModalVisible(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSubmitRenew}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
              >
                提交申请
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}