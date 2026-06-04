import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, X, Check, Clock, Calendar, User, Building2 } from 'lucide-react';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from '../components/NotificationContainer';
import { leaveApi, employeeApi, type LeaveRequest, type PaginatedResult, type ListParams } from '../api/hrm';

const LeaveManagementPage: React.FC = () => {
  const { success, error, notifications, hideNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<LeaveRequest>>({ items: [], total: 0, page: 1, page_size: 10 });
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState('');

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveRequest | null>(null);
  const [formData, setFormData] = useState<Partial<LeaveRequest>>({});

  const fetchLeaveRequests = async (params?: ListParams) => {
    setLoading(true);
    try {
      const response = await leaveApi.list(params);
      if (response.code === 200) {
        setData(response.data!);
      }
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeeApi.list();
      if (response.code === 200) {
        setEmployees(response.data?.items.map((e) => ({ id: e.id, name: e.name })) || []);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
    fetchEmployees();
  }, []);

  const handleSearch = () => {
    fetchLeaveRequests({
      page: 1,
      search: searchText || undefined,
      status: statusFilter || undefined,
      employee_id: employeeFilter || undefined,
    });
  };

  const handleReset = () => {
    setSearchText('');
    setStatusFilter('');
    setTypeFilter('');
    setEmployeeFilter('');
    fetchLeaveRequests({ page: 1 });
  };

  const handleAdd = () => {
    setEditingLeave(null);
    setFormData({});
    setIsModalVisible(true);
  };

  const handleEdit = (record: LeaveRequest) => {
    setEditingLeave(record);
    setFormData(record);
    setIsModalVisible(true);
  };

  const handleView = (record: LeaveRequest) => {
    setEditingLeave(record);
    setIsViewModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await leaveApi.delete(id);
      if (response.code === 200) {
        fetchLeaveRequests();
      }
    } catch (error) {
      console.error('Failed to delete leave request:', error);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await leaveApi.approve(id, 'admin');
      if (response.code === 200) {
        fetchLeaveRequests();
      }
    } catch (error) {
      console.error('Failed to approve leave request:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const response = await leaveApi.reject(id, 'admin', '已拒绝');
      if (response.code === 200) {
        fetchLeaveRequests();
      }
    } catch (error) {
      console.error('Failed to reject leave request:', error);
    }
  };

  const handleModalOk = async () => {
    try {
      if (editingLeave) {
        await leaveApi.update(editingLeave.id, formData);
      } else {
        await leaveApi.create(formData);
      }
      setIsModalVisible(false);
      fetchLeaveRequests();
    } catch (error) {
      console.error('Failed to save leave request:', error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待审批';
      case 'approved':
        return '已批准';
      case 'rejected':
        return '已拒绝';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  const getLeaveTypeText = (type: string) => {
    const types: Record<string, string> = {
      annual: '年假',
      sick: '病假',
      personal: '事假',
      maternity: '产假',
      paternity: '陪产假',
      other: '其他',
    };
    return types[type] || type;
  };

  const totalPages = Math.ceil(data.total / data.page_size);

  const leaveTypes = [
    { value: 'annual', label: '年假' },
    { value: 'sick', label: '病假' },
    { value: 'personal', label: '事假' },
    { value: 'maternity', label: '产假' },
    { value: 'paternity', label: '陪产假' },
    { value: 'other', label: '其他' },
  ];

  return (
    <div className='min-h-screen bg-gray-50'>
      <NotificationContainer notifications={notifications} onClose={hideNotification} />
      <div className='p-6'>
        <div className='flex justify-between items-center mb-6'>
          <h2 className='text-xl font-bold text-gray-800'>休假管理</h2>
          <button
            onClick={handleAdd}
            className='flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
          >
            <Plus size={18} />
            新增申请
          </button>
        </div>

        <div className='bg-white rounded-lg shadow p-4 mb-4'>
          <div className='flex flex-wrap gap-4'>
            <div className='flex-1 min-w-[200px]'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' size={18} />
                <input
                  type='text'
                  placeholder='搜索员工姓名'
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>
            <div className='w-40'>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                <option value=''>全部员工</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <div className='w-32'>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                <option value=''>全部类型</option>
                {leaveTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className='w-32'>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                <option value=''>全部状态</option>
                <option value='pending'>待审批</option>
                <option value='approved'>已批准</option>
                <option value='rejected'>已拒绝</option>
                <option value='cancelled'>已取消</option>
              </select>
            </div>
            <div className='flex gap-2'>
              <button
                onClick={handleSearch}
                className='px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors'
              >
                搜索
              </button>
              <button
                onClick={handleReset}
                className='px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors'
              >
                重置
              </button>
            </div>
          </div>
        </div>

        <div className='bg-white rounded-lg shadow overflow-hidden'>
          <table className='w-full'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>员工</th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  休假类型
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  开始日期
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  结束日期
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>天数</th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>状态</th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>操作</th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {loading ? (
                <tr>
                  <td colSpan={7} className='px-6 py-12 text-center'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto'></div>
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className='px-6 py-12 text-center text-gray-500'>
                    暂无数据
                  </td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id} className='hover:bg-gray-50'>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      {employees.find((e) => e.id === item.employee_id)?.name || '-'}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>{getLeaveTypeText(item.leave_type)}</td>
                    <td className='px-6 py-4 whitespace-nowrap'>{item.start_date}</td>
                    <td className='px-6 py-4 whitespace-nowrap'>{item.end_date}</td>
                    <td className='px-6 py-4 whitespace-nowrap'>{item.days}</td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}
                      >
                        {getStatusText(item.status)}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex gap-2'>
                        <button
                          onClick={() => handleView(item)}
                          className='p-2 text-blue-600 hover:bg-blue-50 rounded-lg'
                          title='查看'
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className='p-2 text-blue-600 hover:bg-blue-50 rounded-lg'
                          title='编辑'
                        >
                          <Edit size={18} />
                        </button>
                        {item.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(item.id)}
                              className='p-2 text-green-600 hover:bg-green-50 rounded-lg'
                              title='批准'
                            >
                              <Check size={18} />
                            </button>
                            <button
                              onClick={() => handleReject(item.id)}
                              className='p-2 text-red-600 hover:bg-red-50 rounded-lg'
                              title='拒绝'
                            >
                              <X size={18} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className='p-2 text-red-600 hover:bg-red-50 rounded-lg'
                          title='删除'
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {data.total > data.page_size && (
            <div className='px-6 py-4 border-t border-gray-200 flex items-center justify-between'>
              <span className='text-sm text-gray-500'>
                显示第 {(data.page - 1) * data.page_size + 1} - {Math.min(data.page * data.page_size, data.total)}{' '}
                条，共 {data.total} 条
              </span>
              <div className='flex gap-2'>
                <button
                  onClick={() => data.page > 1 && fetchLeaveRequests({ page: data.page - 1 })}
                  disabled={data.page <= 1}
                  className='px-3 py-1 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50'
                >
                  上一页
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => fetchLeaveRequests({ page })}
                    className={`px-3 py-1 border rounded-lg text-sm ${
                      page === data.page ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => data.page < totalPages && fetchLeaveRequests({ page: data.page + 1 })}
                  disabled={data.page >= totalPages}
                  className='px-3 py-1 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50'
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>

        {isModalVisible && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg shadow-xl w-full max-w-md mx-4'>
              <div className='flex justify-between items-center p-4 border-b'>
                <h3 className='text-lg font-semibold'>{editingLeave ? '编辑休假申请' : '新增休假申请'}</h3>
                <button onClick={() => setIsModalVisible(false)} className='p-1 hover:bg-gray-100 rounded'>
                  <X size={20} />
                </button>
              </div>
              <div className='p-4 space-y-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>员工 *</label>
                  <select
                    value={(formData as LeaveRequest)?.employee_id || ''}
                    onChange={(e) => handleInputChange('employee_id', e.target.value)}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value=''>请选择员工</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>休假类型 *</label>
                  <select
                    value={(formData as LeaveRequest)?.leave_type || ''}
                    onChange={(e) => handleInputChange('leave_type', e.target.value)}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                  >
                    <option value=''>请选择休假类型</option>
                    {leaveTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>开始日期 *</label>
                    <input
                      type='date'
                      value={(formData as LeaveRequest)?.start_date || ''}
                      onChange={(e) => handleInputChange('start_date', e.target.value)}
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>结束日期 *</label>
                    <input
                      type='date'
                      value={(formData as LeaveRequest)?.end_date || ''}
                      onChange={(e) => handleInputChange('end_date', e.target.value)}
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    />
                  </div>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>休假天数 *</label>
                  <input
                    type='number'
                    value={(formData as LeaveRequest)?.days || ''}
                    onChange={(e) => handleInputChange('days', parseFloat(e.target.value) || 0)}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    placeholder='请输入休假天数'
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-1'>备注</label>
                  <textarea
                    value={(formData as LeaveRequest)?.reason || ''}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
                    rows={3}
                    placeholder='请输入备注信息'
                  />
                </div>
              </div>
              <div className='flex justify-end gap-2 p-4 border-t'>
                <button
                  onClick={() => setIsModalVisible(false)}
                  className='px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50'
                >
                  取消
                </button>
                <button
                  onClick={handleModalOk}
                  className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2'
                >
                  <Check size={18} />
                  确定
                </button>
              </div>
            </div>
          </div>
        )}

        {isViewModalVisible && editingLeave && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
            <div className='bg-white rounded-lg shadow-xl w-full max-w-md mx-4'>
              <div className='flex justify-between items-center p-4 border-b'>
                <h3 className='text-lg font-semibold'>休假详情</h3>
                <button onClick={() => setIsViewModalVisible(false)} className='p-1 hover:bg-gray-100 rounded'>
                  <X size={20} />
                </button>
              </div>
              <div className='p-4 space-y-3'>
                <div className='flex justify-between'>
                  <span className='font-medium text-gray-600'>员工:</span>
                  <span>{employees.find((e) => e.id === editingLeave.employee_id)?.name || '-'}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='font-medium text-gray-600'>休假类型:</span>
                  <span>{getLeaveTypeText(editingLeave.leave_type)}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='font-medium text-gray-600'>开始日期:</span>
                  <span>{editingLeave.start_date}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='font-medium text-gray-600'>结束日期:</span>
                  <span>{editingLeave.end_date}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='font-medium text-gray-600'>休假天数:</span>
                  <span>{editingLeave.days}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='font-medium text-gray-600'>备注:</span>
                  <span className='max-w-xs truncate'>{editingLeave.reason || '-'}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='font-medium text-gray-600'>状态:</span>
                  <span className={`px-2 text-xs font-semibold rounded-full ${getStatusColor(editingLeave.status)}`}>
                    {getStatusText(editingLeave.status)}
                  </span>
                </div>
                {editingLeave.approver_id && (
                  <div className='flex justify-between'>
                    <span className='font-medium text-gray-600'>审批人:</span>
                    <span>{editingLeave.approver_id}</span>
                  </div>
                )}
                {editingLeave.rejection_reason && (
                  <div className='flex justify-between'>
                    <span className='font-medium text-gray-600'>审批意见:</span>
                    <span className='max-w-xs truncate'>{editingLeave.rejection_reason}</span>
                  </div>
                )}
                <div className='flex justify-between'>
                  <span className='font-medium text-gray-600'>创建时间:</span>
                  <span>{editingLeave.created_at}</span>
                </div>
              </div>
              <div className='flex justify-end p-4 border-t'>
                <button
                  onClick={() => setIsViewModalVisible(false)}
                  className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveManagementPage;
