import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  Download,
  BarChart3,
  Users,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronLeft,
  Plus,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  TextField,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  InputAdornment,
  Chip,
} from '@mui/material';
import { Button } from '@mui/material';
import { useNotification } from '@/hooks/useNotification';
import { NotificationContainer } from '@/components/notification/NotificationContainer';
import { StatCardGroup } from '@/components/mui';
import { StatusBadge } from '@/components/hrm/StatusBadge';

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

  // 统计数据
  const attendanceStats = useMemo(() => {
    const totalEmployees = summaries.reduce((sum, s) => sum + s.total_employees, 0);
    const totalPresent = summaries.reduce((sum, s) => sum + s.present_count, 0);
    const totalLate = summaries.reduce((sum, s) => sum + s.late_count, 0);
    const totalAbsent = summaries.reduce((sum, s) => sum + s.absent_count, 0);
    const avgOnTimeRate = totalEmployees > 0 ? (totalPresent / totalEmployees) * 100 : 0;
    const avgWorkHours =
      summaries.length > 0
        ? summaries.reduce((sum, s) => sum + s.average_work_hours, 0) / summaries.length
        : 0;

    return {
      totalEmployees,
      totalPresent,
      totalLate,
      totalAbsent,
      avgOnTimeRate: Math.round(avgOnTimeRate * 10) / 10,
      avgWorkHours: Math.round(avgWorkHours * 10) / 10,
      presentRate: Math.round((totalPresent / totalEmployees) * 100),
      leaveCount: leaves.filter((l) => l.status === 'pending').length,
      pendingLeaves: leaves.filter((l) => l.status === 'pending').length,
    };
  }, [summaries, leaves]);

  // 考勤状态分布数据
  const attendanceStatusData = useMemo(
    () => [
      {
        name: '正常',
        value: records.filter((r) => r.status === 'normal').length,
        color: 'success.dark',
      },
      {
        name: '迟到',
        value: records.filter((r) => r.status === 'late').length,
        color: 'warning.main',
      },
      {
        name: '早退',
        value: records.filter((r) => r.status === 'early_leave').length,
        color: '#f97316',
      },
      {
        name: '缺勤',
        value: records.filter((r) => r.status === 'absent').length,
        color: 'error.main',
      },
      {
        name: '请假',
        value: records.filter((r) => r.status === 'leave').length,
        color: 'primary.main',
      },
    ],
    [records]
  );

  // 部门出勤率数据
  const departmentOnTimeData = useMemo(
    () =>
      summaries.map((s) => ({
        name: s.department,
        value: s.on_time_rate,
        color:
          s.on_time_rate >= 95 ? 'success.dark' : s.on_time_rate >= 85 ? 'warning.main' : 'error.main',
      })),
    [summaries]
  );

  // 部门出勤人数数据
  const departmentAttendanceData = useMemo(
    () => [
      {
        name: '出勤人数',
        value: summaries.reduce((sum, s) => sum + s.present_count, 0),
        color: 'success.dark',
      },
      {
        name: '缺勤人数',
        value: summaries.reduce((sum, s) => sum + s.absent_count, 0),
        color: 'error.main',
      },
    ],
    [summaries]
  );

  const getAttendanceStatusBadge = (status: string) => (
    <StatusBadge
      status={status}
      category='attendance'
      showIcon
    />
  );

  const getLeaveStatusBadge = (status: string) => (
    <StatusBadge
      status={status}
      category='leave'
      showIcon
    />
  );

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
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <NotificationContainer
        notifications={notifications}
        onClose={hideNotification}
      />

      {/* Header */}
      <Box
        sx={{
          bgcolor: 'white',
          boxShadow: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            maxWidth: '7xl',
            mx: 'auto',
            px: { xs: 2, sm: 3, lg: 4 },
            py: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                onClick={() => navigate('/dashboard')}
                sx={{ minWidth: 'auto', p: 1 }}
              >
                <ChevronLeft />
              </Button>
              <Box>
                {/* 面包屑导航 */}
                <Box sx={{ mb: 1 }}>
                  <Typography
                    component='a'
                    href='/hrm'
                    sx={{
                      color: 'text.secondary',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      '&:hover': {
                        color: 'primary.main',
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    人力资源
                  </Typography>
                  <Typography
                    component='span'
                    sx={{ mx: 1, color: 'text.disabled' }}
                  >
                    /
                  </Typography>
                  <Typography
                    component='span'
                    sx={{ color: 'text.primary', fontSize: '0.875rem' }}
                  >
                    考勤管理
                  </Typography>
                </Box>
                <Typography
                  variant='h5'
                  component='h1'
                  sx={{
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    color: 'text.primary',
                  }}
                >
                  <Box sx={{ color: '#14b8a6', display: 'flex' }}>
                    <Clock size={28} />
                  </Box>
                  考勤管理
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary', mt: 0.5 }}
                >
                  管理员工考勤打卡、请假申请和考勤统计
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TextField
                type='date'
                size='small'
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
              <Button
                variant='outlined'
                startIcon={<Download size={18} />}
                sx={{ borderRadius: 2 }}
              >
                导出
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ maxWidth: '7xl', mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            mb: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTabs-indicator': {
              bgcolor: 'primary.main',
            },
          }}
        >
          <Tab
            icon={
              <Box sx={{ display: 'flex' }}>
                <Calendar size={18} />
              </Box>
            }
            iconPosition='start'
            label='考勤记录'
            value='records'
          />
          <Tab
            icon={
              <Box sx={{ display: 'flex' }}>
                <Clock size={18} />
              </Box>
            }
            iconPosition='start'
            label='请假申请'
            value='leaves'
          />
          <Tab
            icon={
              <Box sx={{ display: 'flex' }}>
                <BarChart3 size={18} />
              </Box>
            }
            iconPosition='start'
            label='考勤统计'
            value='statistics'
          />
        </Tabs>

        {/* Search Bar */}
        <Card sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField
                placeholder='搜索员工姓名/部门...'
                size='small'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ flex: 1 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position='start'>
                        <Box sx={{ display: 'flex', color: 'text.secondary' }}>
                          <Search size={20} />
                        </Box>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button
                variant='contained'
                startIcon={<Plus size={18} />}
                sx={{ borderRadius: 2 }}
              >
                请假申请
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Content */}
        {activeTab === 'records' && (
          <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell>员工姓名</TableCell>
                    <TableCell>部门</TableCell>
                    <TableCell>日期</TableCell>
                    <TableCell>上班打卡</TableCell>
                    <TableCell>下班打卡</TableCell>
                    <TableCell>工时</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow
                      key={record.id}
                      hover
                    >
                      <TableCell>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {record.employee_name}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {record.employee_number}
                        </Typography>
                      </TableCell>
                      <TableCell>{record.department}</TableCell>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.check_in || '-'}</TableCell>
                      <TableCell>{record.check_out || '-'}</TableCell>
                      <TableCell>{record.work_hours > 0 ? `${record.work_hours}h` : '-'}</TableCell>
                      <TableCell>{getAttendanceStatusBadge(record.status)}</TableCell>
                      <TableCell>
                        <Button
                          size='small'
                          color='primary'
                        >
                          详情
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {activeTab === 'leaves' && (
          <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell>申请人</TableCell>
                    <TableCell>部门</TableCell>
                    <TableCell>请假类型</TableCell>
                    <TableCell>开始日期</TableCell>
                    <TableCell>结束日期</TableCell>
                    <TableCell>天数</TableCell>
                    <TableCell>原因</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaves.map((leave) => (
                    <TableRow
                      key={leave.id}
                      hover
                    >
                      <TableCell sx={{ fontWeight: 500 }}>{leave.employee_name}</TableCell>
                      <TableCell>{leave.department}</TableCell>
                      <TableCell>{getLeaveTypeName(leave.leave_type)}</TableCell>
                      <TableCell>{leave.start_date}</TableCell>
                      <TableCell>{leave.end_date}</TableCell>
                      <TableCell>{leave.days}天</TableCell>
                      <TableCell>
                        <Typography
                          variant='body2'
                          sx={{
                            maxWidth: 150,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={leave.reason}
                        >
                          {leave.reason}
                        </Typography>
                      </TableCell>
                      <TableCell>{getLeaveStatusBadge(leave.status)}</TableCell>
                      <TableCell>
                        {leave.status === 'pending' ? (
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Button
                              size='small'
                              color='success'
                            >
                              批准
                            </Button>
                            <Button
                              size='small'
                              color='error'
                            >
                              拒绝
                            </Button>
                          </Box>
                        ) : (
                          <Button
                            size='small'
                            color='primary'
                          >
                            详情
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {activeTab === 'statistics' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* 统计卡片 */}
            <StatCardGroup
              stats={[
                {
                  title: '总员工数',
                  value: attendanceStats.totalEmployees,
                  icon: <Users size={20} />,
                  color: 'primary',
                },
                {
                  title: '出勤人数',
                  value: attendanceStats.totalPresent,
                  icon: <CheckCircle size={20} />,
                  color: 'success',
                },
                {
                  title: '出勤率',
                  value: `${attendanceStats.presentRate}%`,
                  icon: <BarChart3 size={20} />,
                  color: 'primary',
                },
                {
                  title: '平均工时',
                  value: `${attendanceStats.avgWorkHours}h`,
                  icon: <Clock size={20} />,
                  color: 'secondary',
                },
                {
                  title: '迟到人数',
                  value: attendanceStats.totalLate,
                  icon: <AlertCircle size={20} />,
                  color: 'warning',
                },
                {
                  title: '缺勤人数',
                  value: attendanceStats.totalAbsent,
                  icon: <XCircle size={20} />,
                  color: 'error',
                },
                {
                  title: '待审批请假',
                  value: attendanceStats.pendingLeaves,
                  icon: <Clock size={20} />,
                  color: 'warning',
                },
                {
                  title: '准时率',
                  value: `${attendanceStats.avgOnTimeRate}%`,
                  icon: <CheckCircle size={20} />,
                  color: 'success',
                },
              ]}
              columns={4}
            />

            {/* 图表区域 */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
                gap: 3,
              }}
            >
              <Card sx={{ borderRadius: 2 }}>
                <CardHeader title='考勤状态分布' />
                <CardContent>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {attendanceStatusData.map((item) => (
                      <Box
                        key={item.name}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: item.color,
                          }}
                        />
                        <Typography variant='body2'>
                          {item.name}: {item.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>

              <Card sx={{ borderRadius: 2 }}>
                <CardHeader title='部门出勤率对比' />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {departmentOnTimeData.map((item) => (
                      <Box
                        key={item.name}
                        sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                      >
                        <Typography
                          variant='body2'
                          sx={{ width: 80 }}
                        >
                          {item.name}
                        </Typography>
                        <Box
                          sx={{
                            flex: 1,
                            bgcolor: 'grey.200',
                            borderRadius: 1,
                            height: 8,
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              width: `${item.value}%`,
                              bgcolor: item.color,
                              height: '100%',
                            }}
                          />
                        </Box>
                        <Typography
                          variant='body2'
                          sx={{ width: 50 }}
                        >
                          {item.value}%
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Card sx={{ borderRadius: 2 }}>
              <CardHeader title='各部门出勤人数' />
              <CardContent>
                <Box sx={{ display: 'flex', gap: 4 }}>
                  {departmentAttendanceData.map((item) => (
                    <Box
                      key={item.name}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: item.color,
                        }}
                      />
                      <Typography variant='body2'>
                        {item.name}: {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* 部门明细表格 */}
            <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <TableContainer>
                <Table>
                  <TableHead sx={{ bgcolor: 'grey.50' }}>
                    <TableRow>
                      <TableCell>部门</TableCell>
                      <TableCell>总人数</TableCell>
                      <TableCell>出勤人数</TableCell>
                      <TableCell>缺勤人数</TableCell>
                      <TableCell>迟到人数</TableCell>
                      <TableCell>出勤率</TableCell>
                      <TableCell>平均工时</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summaries.map((summary) => (
                      <TableRow
                        key={summary.department}
                        hover
                      >
                        <TableCell sx={{ fontWeight: 500 }}>{summary.department}</TableCell>
                        <TableCell>{summary.total_employees}</TableCell>
                        <TableCell sx={{ color: 'success.main', fontWeight: 500 }}>
                          {summary.present_count}
                        </TableCell>
                        <TableCell sx={{ color: 'error.main', fontWeight: 500 }}>
                          {summary.absent_count}
                        </TableCell>
                        <TableCell sx={{ color: 'warning.main', fontWeight: 500 }}>
                          {summary.late_count}
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Typography variant='body2'>{summary.on_time_rate}%</Typography>
                            <Box
                              sx={{
                                width: 64,
                                bgcolor: 'grey.200',
                                borderRadius: 1,
                                height: 8,
                                overflow: 'hidden',
                              }}
                            >
                              <Box
                                sx={{
                                  width: `${summary.on_time_rate}%`,
                                  bgcolor: 'success.main',
                                  height: '100%',
                                  borderRadius: 1,
                                }}
                              />
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>{summary.average_work_hours}h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default HrmAttendancePage;
