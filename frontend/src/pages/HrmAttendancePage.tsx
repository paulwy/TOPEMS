import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Plus,
  ChevronLeft,
  Eye,
  Download,
  Filter,
  BarChart3,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from '../components/NotificationContainer';

interface AttendanceRecord {
  id: string;
  employee_name: string;
  employee_number: string;
  department: string;
  date: string;
  check_in?: string;
  check_out?: string;
  work_hours: number;
  status: 'normal' | 'late' | 'early_leave' | 'absent' | 'leave';
  late_minutes?: number;
  early_minutes?: number;
  remark?: string;
}

interface LeaveRequest {
  id: string;
  employee_name: string;
  department: string;
  leave_type: 'sick' | 'personal' | 'annual' | 'marriage' | 'maternity' | 'funeral';
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approver?: string;
  approved_at?: string;
}

interface AttendanceSummary {
  department: string;
  total_employees: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  on_time_rate: number;
  average_work_hours: number;
}

const HrmAttendancePage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error, notifications, hideNotification } = useNotification();

  const [activeTab, setActiveTab] = useState<'records' | 'leaves' | 'statistics'>('records');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-05-27');

  const [records] = useState<AttendanceRecord[]>([
    {
      id: '1',
      employee_name: '张伟',
      employee_number: 'EMP001',
      department: '研发部',
      date: '2026-05-27',
      check_in: '09:02',
      check_out: '18:15',
      work_hours: 9.2,
      status: 'late',
      late_minutes: 2,
    },
    {
      id: '2',
      employee_name: '李娜',
      employee_number: 'EMP002',
      department: '产品部',
      date: '2026-05-27',
      check_in: '08:55',
      check_out: '18:30',
      work_hours: 9.6,
      status: 'normal',
    },
    {
      id: '3',
      employee_name: '王强',
      employee_number: 'EMP003',
      department: '销售部',
      date: '2026-05-27',
      check_in: '09:10',
      check_out: '17:45',
      work_hours: 8.6,
      status: 'early_leave',
      early_minutes: 15,
    },
    {
      id: '4',
      employee_name: '赵丽',
      employee_number: 'EMP004',
      department: '财务部',
      date: '2026-05-27',
      check_in: '08:58',
      check_out: '18:05',
      work_hours: 9.1,
      status: 'normal',
    },
    {
      id: '5',
      employee_name: '孙明',
      employee_number: 'EMP005',
      department: '研发部',
      date: '2026-05-27',
      work_hours: 0,
      status: 'absent',
    },
    {
      id: '6',
      employee_name: '周婷',
      employee_number: 'EMP006',
      department: '人事部',
      date: '2026-05-27',
      check_in: '09:00',
      check_out: '18:10',
      work_hours: 9.2,
      status: 'normal',
    },
  ]);

  const [leaves] = useState<LeaveRequest[]>([
    {
      id: '1',
      employee_name: '张伟',
      department: '研发部',
      leave_type: 'annual',
      start_date: '2026-06-01',
      end_date: '2026-06-05',
      days: 5,
      reason: '年假出行',
      status: 'approved',
      approver: '刘经理',
      approved_at: '2026-05-25',
    },
    {
      id: '2',
      employee_name: '李娜',
      department: '产品部',
      leave_type: 'sick',
      start_date: '2026-05-28',
      end_date: '2026-05-28',
      days: 1,
      reason: '身体不适',
      status: 'pending',
    },
    {
      id: '3',
      employee_name: '王强',
      department: '销售部',
      leave_type: 'personal',
      start_date: '2026-05-30',
      end_date: '2026-05-30',
      days: 1,
      reason: '私人事务',
      status: 'pending',
    },
    {
      id: '4',
      employee_name: '赵丽',
      department: '财务部',
      leave_type: 'marriage',
      start_date: '2026-06-10',
      end_date: '2026-06-15',
      days: 6,
      reason: '婚礼',
      status: 'approved',
      approver: '刘经理',
      approved_at: '2026-05-20',
    },
  ]);

  const [summaries] = useState<AttendanceSummary[]>([
    {
      department: '研发部',
      total_employees: 15,
      present_count: 14,
      absent_count: 1,
      late_count: 2,
      on_time_rate: 86.7,
      average_work_hours: 9.1,
    },
    {
      department: '产品部',
      total_employees: 8,
      present_count: 8,
      absent_count: 0,
      late_count: 0,
      on_time_rate: 100.0,
      average_work_hours: 9.3,
    },
    {
      department: '销售部',
      total_employees: 10,
      present_count: 9,
      absent_count: 1,
      late_count: 1,
      on_time_rate: 90.0,
      average_work_hours: 8.8,
    },
    {
      department: '财务部',
      total_employees: 6,
      present_count: 6,
      absent_count: 0,
      late_count: 0,
      on_time_rate: 100.0,
      average_work_hours: 9.2,
    },
    {
      department: '人事部',
      total_employees: 4,
      present_count: 4,
      absent_count: 0,
      late_count: 0,
      on_time_rate: 100.0,
      average_work_hours: 9.1,
    },
  ]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, React.ReactNode> = {
      normal: (
        <span className='px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center'>
          <CheckCircle className='w-3 h-3 mr-1' />
          正常
        </span>
      ),
      late: (
        <span className='px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center'>
          <AlertCircle className='w-3 h-3 mr-1' />
          迟到
        </span>
      ),
      early_leave: (
        <span className='px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full flex items-center'>
          <AlertCircle className='w-3 h-3 mr-1' />
          早退
        </span>
      ),
      absent: (
        <span className='px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center'>
          <XCircle className='w-3 h-3 mr-1' />
          缺勤
        </span>
      ),
      leave: (
        <span className='px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center'>
          <Clock className='w-3 h-3 mr-1' />
          请假
        </span>
      ),
      pending: <span className='px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full'>待审批</span>,
      approved: <span className='px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full'>已批准</span>,
      rejected: <span className='px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full'>已拒绝</span>,
    };
    return badges[status] || <span className='px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full'>{status}</span>;
  };

  const getLeaveTypeName = (type: string) => {
    const types: Record<string, string> = {
      sick: '病假',
      personal: '事假',
      annual: '年假',
      marriage: '婚假',
      maternity: '产假',
      funeral: '丧假',
    };
    return types[type] || type;
  };

  const filteredRecords = records.filter(
    (r) =>
      r.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className='min-h-screen bg-gray-50'>
      <NotificationContainer notifications={notifications} onClose={hideNotification} />

      {/* Header */}
      <div className='bg-white shadow-sm border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <button
                onClick={() => navigate('/dashboard')}
                className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
              >
                <ChevronLeft className='w-5 h-5 text-gray-600' />
              </button>
              <div>
                <h1 className='text-2xl font-bold text-gray-900 flex items-center'>
                  <Clock className='w-7 h-7 mr-3 text-teal-600' />
                  考勤管理
                </h1>
                <p className='mt-1 text-sm text-gray-500'>管理员工考勤打卡、请假申请和考勤统计</p>
              </div>
            </div>
            <div className='flex items-center space-x-3'>
              <input
                type='date'
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className='px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
              />
              <button className='flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors'>
                <Download className='w-5 h-5 mr-2' />
                导出
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <div className='flex space-x-4 mb-6 border-b border-gray-200'>
          <button
            onClick={() => setActiveTab('records')}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'records' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Calendar className='w-5 h-5' />
            <span>考勤记录</span>
          </button>
          <button
            onClick={() => setActiveTab('leaves')}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'leaves' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock className='w-5 h-5' />
            <span>请假申请</span>
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`pb-4 px-2 font-medium transition-colors flex items-center space-x-2 ${
              activeTab === 'statistics'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className='w-5 h-5' />
            <span>考勤统计</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className='bg-white rounded-lg shadow-sm p-4 mb-6'>
          <div className='flex items-center space-x-4'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
              <input
                type='text'
                placeholder='搜索员工姓名/部门...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500'
              />
            </div>
            <button className='flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'>
              <Plus className='w-5 h-5 mr-2' />
              请假申请
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'records' && (
          <div className='bg-white rounded-lg shadow-sm overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      员工姓名
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      部门
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      日期
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      上班打卡
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      下班打卡
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      工时
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      状态
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className='hover:bg-gray-50'>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='text-sm font-medium text-gray-900'>{record.employee_name}</div>
                        <div className='text-sm text-gray-500'>{record.employee_number}</div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>{record.department}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>{record.date}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>{record.check_in || '-'}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>{record.check_out || '-'}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                        {record.work_hours > 0 ? `${record.work_hours}h` : '-'}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>{getStatusBadge(record.status)}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm'>
                        <button className='text-blue-600 hover:text-blue-800'>详情</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'leaves' && (
          <div className='bg-white rounded-lg shadow-sm overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-gray-200'>
                <thead className='bg-gray-50'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      申请人
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      部门
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      请假类型
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      开始日期
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      结束日期
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      天数
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      原因
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      状态
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className='bg-white divide-y divide-gray-200'>
                  {leaves.map((leave) => (
                    <tr key={leave.id} className='hover:bg-gray-50'>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                        {leave.employee_name}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>{leave.department}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                        {getLeaveTypeName(leave.leave_type)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>{leave.start_date}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>{leave.end_date}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>{leave.days}天</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate'>
                        {leave.reason}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>{getStatusBadge(leave.status)}</td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm'>
                        {leave.status === 'pending' ? (
                          <div className='flex space-x-2'>
                            <button className='text-green-600 hover:text-green-800'>批准</button>
                            <button className='text-red-600 hover:text-red-800'>拒绝</button>
                          </div>
                        ) : (
                          <button className='text-blue-600 hover:text-blue-800'>详情</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'statistics' && (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {summaries.map((summary) => (
              <div key={summary.department} className='bg-white rounded-lg shadow-sm p-6'>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold text-gray-900'>{summary.department}</h3>
                  <Users className='w-5 h-5 text-gray-400' />
                </div>

                <div className='grid grid-cols-2 gap-4 mb-4'>
                  <div className='text-center p-3 bg-gray-50 rounded-lg'>
                    <div className='text-2xl font-bold text-blue-600'>
                      {summary.present_count}/{summary.total_employees}
                    </div>
                    <div className='text-xs text-gray-500 mt-1'>出勤人数</div>
                  </div>
                  <div className='text-center p-3 bg-gray-50 rounded-lg'>
                    <div className='text-2xl font-bold text-green-600'>{summary.on_time_rate}%</div>
                    <div className='text-xs text-gray-500 mt-1'>出勤率</div>
                  </div>
                </div>

                <div className='space-y-2 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>迟到人数</span>
                    <span className='font-medium text-yellow-600'>{summary.late_count}人</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>缺勤人数</span>
                    <span className='font-medium text-red-600'>{summary.absent_count}人</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>平均工时</span>
                    <span className='font-medium text-gray-900'>{summary.average_work_hours}h</span>
                  </div>
                </div>

                <div className='mt-4 pt-4 border-t border-gray-200'>
                  <div className='flex justify-between text-xs text-gray-500'>
                    <span>出勤率</span>
                    <span>{summary.on_time_rate}%</span>
                  </div>
                  <div className='w-full bg-gray-200 rounded-full h-2 mt-1'>
                    <div className='bg-green-500 h-2 rounded-full' style={{ width: `${summary.on_time_rate}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HrmAttendancePage;
