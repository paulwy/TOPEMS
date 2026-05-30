import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Mail, Phone, Building2, Calendar, BriefCase,
  FileText, Clock, CheckCircle2, XCircle, Edit, Save
} from 'lucide-react';
import {
  employeeApi,
  attendanceApi,
  leaveApi,
  employeePerformanceApi,
  type Employee,
  type AttendanceRecord,
  type LeaveRequest,
  type PerformanceReview
} from '../api/hrm';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from '../components/NotificationContainer';

const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [performanceReviews, setPerformanceReviews] = useState<PerformanceReview[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'attendance' | 'leave' | 'performance'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});

  useEffect(() => {
    if (id) {
      loadEmployeeData();
    }
  }, [id]);

  const loadEmployeeData = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const [employeeRes, attendanceRes, leaveRes, performanceRes] = await Promise.allSettled([
        employeeApi.get(id),
        attendanceApi.list({ employee_id: id, page: 1, page_size: 30 }),
        leaveApi.list({ employee_id: id, page: 1, page_size: 30 }),
        employeePerformanceApi.getReviews(id),
      ]);

      if (employeeRes.status === 'fulfilled' && employeeRes.value.code === 200) {
        setEmployee(employeeRes.value.data as any);
        setEditForm(employeeRes.value.data as any);
      }

      if (attendanceRes.status === 'fulfilled' && attendanceRes.value.code === 200) {
        setAttendance((attendanceRes.value.data as any)?.items || []);
      }

      if (leaveRes.status === 'fulfilled' && leaveRes.value.code === 200) {
        setLeaves((leaveRes.value.data as any)?.items || []);
      }

      if (performanceRes.status === 'fulfilled' && performanceRes.value.code === 200) {
        setPerformanceReviews((performanceRes.value.data as any)?.items || []);
      }
    } catch (err) {
      console.error('Failed to load employee data:', err);
      showError('加载员工数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      const response = await employeeApi.update(id, editForm);
      if (response.code === 200) {
        setEmployee(editForm as Employee);
        setIsEditing(false);
        success('员工信息更新成功');
      }
    } catch (err) {
      console.error('Failed to update employee:', err);
      showError('更新失败');
    }
  };

  const handleCheckIn = async () => {
    if (!id) return;

    try {
      const response = await attendanceApi.checkIn(id);
      if (response.code === 200) {
        success('打卡成功');
        loadEmployeeData();
      }
    } catch (err) {
      console.error('Failed to check in:', err);
      showError('打卡失败');
    }
  };

  const handleCheckOut = async () => {
    if (!id) return;

    try {
      const response = await attendanceApi.checkOut(id);
      if (response.code === 200) {
        success('下班打卡成功');
        loadEmployeeData();
      }
    } catch (err) {
      console.error('Failed to check out:', err);
      showError('下班打卡失败');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">员工不存在</p>
          <button
            onClick={() => navigate('/employees')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationContainer notifications={[]} onClose={() => {}} />

      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/employees')}
                className="p-2 hover:bg-gray-100 rounded-lg mr-4"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
                <p className="text-sm text-gray-500">
                  {employee.employee_number} · {employee.position || '未分配职位'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    保存
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  编辑
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-4 mb-6">
          {[
            { key: 'info', label: '基本信息', icon: User },
            { key: 'attendance', label: '考勤记录', icon: Clock },
            { key: 'leave', label: '请假记录', icon: Calendar },
            { key: 'performance', label: '绩效考核', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-lg flex items-center ${
                activeTab === tab.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'info' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">基本信息</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">工号</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.employee_number || ''}
                    onChange={(e) => setEditForm({ ...editForm, employee_number: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{employee.employee_number}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">姓名</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{employee.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">邮箱</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{employee.email || '未填写'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">电话</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{employee.phone || '未填写'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">职位</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.position || ''}
                    onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">{employee.position || '未分配'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">入职日期</label>
                <p className="mt-1 text-gray-900">
                  {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '未填写'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">状态</label>
                <span className={`mt-1 inline-flex px-2 py-1 text-sm rounded-full ${
                  employee.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {employee.status === 'active' ? '在职' : '离职'}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">考勤记录</h2>
              <div className="flex space-x-2">
                <button
                  onClick={handleCheckIn}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  上班打卡
                </button>
                <button
                  onClick={handleCheckOut}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  下班打卡
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">日期</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">上班打卡</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">下班打卡</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">工作时长</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">状态</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        暂无考勤记录
                      </td>
                    </tr>
                  ) : (
                    attendance.map((record) => (
                      <tr key={record.id}>
                        <td className="px-4 py-2 text-sm">{new Date(record.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm">{record.check_in || '-'}</td>
                        <td className="px-4 py-2 text-sm">{record.check_out || '-'}</td>
                        <td className="px-4 py-2 text-sm">{record.work_hours ? `${record.work_hours}h` : '-'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            record.status === 'present'
                              ? 'bg-green-100 text-green-800'
                              : record.status === 'absent'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {record.status === 'present' ? '正常' : record.status === 'absent' ? '缺勤' : '迟到'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'leave' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">请假记录</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">请假类型</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">开始日期</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">结束日期</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">天数</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">原因</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">状态</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaves.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        暂无请假记录
                      </td>
                    </tr>
                  ) : (
                    leaves.map((leave) => (
                      <tr key={leave.id}>
                        <td className="px-4 py-2 text-sm">
                          {leave.leave_type === 'annual' ? '年假' :
                           leave.leave_type === 'sick' ? '病假' :
                           leave.leave_type === 'personal' ? '事假' : '其他'}
                        </td>
                        <td className="px-4 py-2 text-sm">{new Date(leave.start_date).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm">{new Date(leave.end_date).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm">{leave.days}</td>
                        <td className="px-4 py-2 text-sm">{leave.reason || '-'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            leave.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : leave.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {leave.status === 'approved' ? '已通过' :
                             leave.status === 'rejected' ? '已拒绝' : '待审批'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">绩效考核</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">考核周期</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">评分</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">评语</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">状态</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {performanceReviews.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        暂无绩效考核记录
                      </td>
                    </tr>
                  ) : (
                    performanceReviews.map((review) => (
                      <tr key={review.id}>
                        <td className="px-4 py-2 text-sm">{review.review_period || '-'}</td>
                        <td className="px-4 py-2 text-sm">{review.score || '-'}</td>
                        <td className="px-4 py-2 text-sm">{review.comments || '-'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            review.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : review.status === 'draft'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {review.status === 'completed' ? '已完成' :
                             review.status === 'draft' ? '草稿' : '进行中'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDetailPage;
