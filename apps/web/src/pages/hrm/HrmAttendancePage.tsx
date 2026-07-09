import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  Calendar,
  Download,
  BarChart3,
  Users,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  Plus,
} from 'lucide-react';
import { attendanceApi, leaveApi, type AttendanceRecord, type LeaveRequest } from '@/api/hrm';
import { apiLogger } from '@/utils/logger';
import { useAppStore } from '../../store';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  StatsPageTemplate,
  type StatsStatCard,
} from '@/components/templates';
import { StatusBadge } from '@topems/shared-components';
import { PageContainer } from '@/components/common/PageContainerV2';
import {
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormLabel,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';

const HrmAttendancePage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState<'records' | 'leaves' | 'statistics'>('records');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-05-27');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveFormData, setLeaveFormData] = useState<Partial<LeaveRequest>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'records') {
        const res = await attendanceApi.list({ date: selectedDate, pagesize: 100 });
        if (res.code === 200) {
          setRecords(res.data?.items || []);
        }
      } else if (activeTab === 'leaves') {
        const res = await leaveApi.list({ pagesize: 100 });
        if (res.code === 200) {
          setLeaves(res.data?.items || []);
        }
      }
    } catch (err: unknown) {
      apiLogger.error('Failed to load data:', err);
      addNotification({ title: '加载失败', message: '加载数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedDate, addNotification]);

  useEffect(() => {
    loadData();
  }, [activeTab, selectedDate]);

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

  const handleLeaveAction = useCallback(
    async (id: string, action: 'approve' | 'reject') => {
      try {
        const response = await leaveApi.approve(id, action);
        if (response.code === 200) {
          addNotification({
            title: '成功',
            message: action === 'approve' ? '已批准' : '已拒绝',
            type: 'success',
          });
          loadData();
        }
      } catch (err: unknown) {
        apiLogger.error('Failed to process leave:', err);
        addNotification({ title: '失败', message: '操作失败', type: 'error' });
      }
    },
    [addNotification, loadData]
  );

  const handleCreateLeave = useCallback(async () => {
    try {
      const response = await leaveApi.create(leaveFormData);
      if (response.code === 200) {
        addNotification({ title: '成功', message: '申请已提交', type: 'success' });
        setShowLeaveModal(false);
        setLeaveFormData({});
        loadData();
      }
    } catch (err: unknown) {
      apiLogger.error('Failed to create leave:', err);
      addNotification({ title: '失败', message: '提交失败', type: 'error' });
    }
  }, [leaveFormData, addNotification, loadData]);

  const filteredRecords = records.filter((r) =>
    r.employee_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLeaves = leaves.filter((l) =>
    l.employee_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const attendanceStats = useMemo(() => {
    const totalEmployees = records.length;
    const totalPresent = records.filter((r) => r.status !== 'absent').length;
    const totalLate = records.filter((r) => r.status === 'late').length;
    const totalAbsent = records.filter((r) => r.status === 'absent').length;
    const presentRate = totalEmployees > 0 ? Math.round((totalPresent / totalEmployees) * 100) : 0;
    const avgWorkHours =
      records.length > 0
        ? Math.round(
            (records.reduce((sum, r) => sum + (r.work_hours || 0), 0) / records.length) * 10
          ) / 10
        : 0;

    return {
      totalEmployees,
      totalPresent,
      totalLate,
      totalAbsent,
      presentRate,
      avgWorkHours,
      pendingLeaves: leaves.filter((l) => l.status === 'pending').length,
    };
  }, [records, leaves]);

  const statCards: StatsStatCard[] = [
    {
      id: 'totalEmployees',
      title: '总员工数',
      value: attendanceStats.totalEmployees,
      icon: <Users size={20} />,
      color: 'primary',
    },
    {
      id: 'totalPresent',
      title: '出勤人数',
      value: attendanceStats.totalPresent,
      icon: <CheckCircle size={20} />,
      color: 'success',
    },
    {
      id: 'presentRate',
      title: '出勤率',
      value: `${attendanceStats.presentRate}%`,
      icon: <BarChart3 size={20} />,
      color: 'primary',
    },
    {
      id: 'avgWorkHours',
      title: '平均工时',
      value: `${attendanceStats.avgWorkHours}h`,
      icon: <Clock size={20} />,
      color: 'warning',
    },
    {
      id: 'totalLate',
      title: '迟到人数',
      value: attendanceStats.totalLate,
      icon: <AlertCircle size={20} />,
      color: 'warning',
    },
    {
      id: 'totalAbsent',
      title: '缺勤人数',
      value: attendanceStats.totalAbsent,
      icon: <XCircle size={20} />,
      color: 'error',
    },
    {
      id: 'pendingLeaves',
      title: '待审批请假',
      value: attendanceStats.pendingLeaves,
      icon: <Clock size={20} />,
      color: 'info',
    },
  ];

  const recordColumns: ColumnDef<AttendanceRecord>[] = [
    {
      id: 'employee_name',
      label: '员工姓名',
      width: 150,
      render: (row) => (
        <Box>
          <Typography
            variant='body2'
            sx={{ fontWeight: 500 }}
          >
            {row.employee_name}
          </Typography>
          <Typography
            variant='caption'
            color='text.secondary'
          >
            {row.employee_id.substring(0, 8)}...
          </Typography>
        </Box>
      ),
    },
    {
      id: 'date',
      label: '日期',
      width: 120,
    },
    {
      id: 'check_in',
      label: '上班打卡',
      width: 120,
      render: (row) => (
        <Typography variant='body2'>{row.check_in || row.check_in_time || '-'}</Typography>
      ),
    },
    {
      id: 'check_out',
      label: '下班打卡',
      width: 120,
      render: (row) => (
        <Typography variant='body2'>{row.check_out || row.check_out_time || '-'}</Typography>
      ),
    },
    {
      id: 'work_hours',
      label: '工时',
      width: 100,
      render: (row) => (
        <Typography variant='body2'>
          {row.work_hours && row.work_hours > 0 ? `${row.work_hours}h` : '-'}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: '状态',
      width: 100,
      render: (row) => (
        <StatusBadge
          status={`attendance_${row.status}`}
          showIcon
        />
      ),
    },
  ];

  const recordActions: RowAction<AttendanceRecord>[] = [
    {
      label: '详情',
      icon: <Eye size={16} />,
      onClick: () => {},
    },
  ];

  const leaveColumns: ColumnDef<LeaveRequest>[] = [
    {
      id: 'employee_name',
      label: '申请人',
      width: 120,
      render: (row) => (
        <Typography
          variant='body2'
          sx={{ fontWeight: 500 }}
        >
          {row.employee_name}
        </Typography>
      ),
    },
    {
      id: 'leave_type',
      label: '请假类型',
      width: 100,
      render: (row) => (
        <Chip
          size='small'
          label={getLeaveTypeName(row.leave_type)}
        />
      ),
    },
    {
      id: 'start_date',
      label: '开始日期',
      width: 120,
    },
    {
      id: 'end_date',
      label: '结束日期',
      width: 120,
    },
    {
      id: 'days',
      label: '天数',
      width: 80,
      render: (row) => <Typography variant='body2'>{row.days}天</Typography>,
    },
    {
      id: 'reason',
      label: '原因',
      width: 150,
      render: (row) => (
        <Typography
          variant='body2'
          sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          title={row.reason}
        >
          {row.reason}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: '状态',
      width: 100,
      render: (row) => (
        <StatusBadge
          status={`leave_${row.status}`}
          showIcon
        />
      ),
    },
  ];

  const leaveActions: RowAction<LeaveRequest>[] = [
    {
      label: '批准',
      icon: <CheckCircle size={16} />,
      onClick: (row) => handleLeaveAction(row.id, 'approve'),
      color: 'success',
      show: (row) => row.status === 'pending',
      confirm: true,
      confirmMessage: '确定要批准这个请假申请吗？',
    },
    {
      label: '拒绝',
      icon: <XCircle size={16} />,
      onClick: (row) => handleLeaveAction(row.id, 'reject'),
      color: 'error',
      show: (row) => row.status === 'pending',
      confirm: true,
      confirmMessage: '确定要拒绝这个请假申请吗？',
    },
    {
      label: '详情',
      icon: <Eye size={16} />,
      onClick: () => {},
      show: (row) => row.status !== 'pending',
    },
  ];

  const renderTabs = (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Button
        variant={activeTab === 'records' ? 'contained' : 'outlined'}
        onClick={() => setActiveTab('records')}
        startIcon={<Calendar size={16} />}
      >
        考勤记录
      </Button>
      <Button
        variant={activeTab === 'leaves' ? 'contained' : 'outlined'}
        onClick={() => setActiveTab('leaves')}
        startIcon={<Clock size={16} />}
      >
        请假申请
      </Button>
      <Button
        variant={activeTab === 'statistics' ? 'contained' : 'outlined'}
        onClick={() => setActiveTab('statistics')}
        startIcon={<BarChart3 size={16} />}
      >
        考勤统计
      </Button>
    </Box>
  );

  const renderDatePicker = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <TextField
        type='date'
        size='small'
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        sx={{ bgcolor: 'white', borderRadius: 1 }}
      />
      <Button
        variant='outlined'
        startIcon={<Download size={18} />}
      >
        导出
      </Button>
    </Box>
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title='考勤管理'
      subtitle='查看员工考勤记录和请假申请'
      autoTitle
      autoBreadcrumbs
    >
      {activeTab === 'statistics' ? (
        <StatsPageTemplate
          title='考勤统计'
          subtitle='查看考勤数据分析和统计报表'
          statCards={statCards}
          showStatCards={true}
          customToolbar={renderTabs}
        />
      ) : (
        <>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
          >
            {renderTabs}
            {renderDatePicker}
          </Box>

          {activeTab === 'records' && (
            <ListPageTemplate<AttendanceRecord>
              title='考勤记录'
              subtitle='查看员工考勤打卡记录'
              columns={recordColumns}
              data={filteredRecords}
              loading={loading}
              rowActions={recordActions}
              searchable
              searchPlaceholder='搜索员工姓名...'
              searchValue={searchQuery}
              onSearch={setSearchQuery}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'leaves' && (
            <ListPageTemplate<LeaveRequest>
              title='请假申请'
              subtitle='管理员工请假申请'
              columns={leaveColumns}
              data={filteredLeaves}
              loading={loading}
              rowActions={leaveActions}
              searchable
              searchPlaceholder='搜索申请人...'
              searchValue={searchQuery}
              onSearch={setSearchQuery}
              actions={[
                {
                  label: '请假申请',
                  icon: <Plus size={16} />,
                  onClick: () => setShowLeaveModal(true),
                  variant: 'contained',
                },
              ]}
              onRefresh={loadData}
            />
          )}
        </>
      )}

      {showLeaveModal && (
        <Dialog
          open={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>请假申请</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                <Box>
                  <FormLabel>请假类型 *</FormLabel>
                  <FormControl
                    size='small'
                    fullWidth
                  >
                    <Select
                      value={leaveFormData.leave_type || ''}
                      onChange={(e) =>
                        setLeaveFormData({ ...leaveFormData, leave_type: e.target.value })
                      }
                      displayEmpty
                    >
                      <MenuItem
                        value=''
                        disabled
                      >
                        请选择类型
                      </MenuItem>
                      <MenuItem value='sick'>病假</MenuItem>
                      <MenuItem value='personal'>事假</MenuItem>
                      <MenuItem value='annual'>年假</MenuItem>
                      <MenuItem value='marriage'>婚假</MenuItem>
                      <MenuItem value='maternity'>产假</MenuItem>
                      <MenuItem value='funeral'>丧假</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box>
                  <FormLabel>请假天数 *</FormLabel>
                  <TextField
                    size='small'
                    fullWidth
                    type='number'
                    value={leaveFormData.days?.toString() || ''}
                    onChange={(e) =>
                      setLeaveFormData({ ...leaveFormData, days: parseInt(e.target.value) || 0 })
                    }
                    placeholder='请输入天数'
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                <Box>
                  <FormLabel>开始日期 *</FormLabel>
                  <TextField
                    size='small'
                    fullWidth
                    type='date'
                    value={leaveFormData.start_date || ''}
                    onChange={(e) =>
                      setLeaveFormData({ ...leaveFormData, start_date: e.target.value })
                    }
                  />
                </Box>
                <Box>
                  <FormLabel>结束日期 *</FormLabel>
                  <TextField
                    size='small'
                    fullWidth
                    type='date'
                    value={leaveFormData.end_date || ''}
                    onChange={(e) =>
                      setLeaveFormData({ ...leaveFormData, end_date: e.target.value })
                    }
                  />
                </Box>
              </Box>
              <Box>
                <FormLabel>请假原因 *</FormLabel>
                <TextField
                  size='small'
                  fullWidth
                  multiline
                  rows={3}
                  value={leaveFormData.reason || ''}
                  onChange={(e) => setLeaveFormData({ ...leaveFormData, reason: e.target.value })}
                  placeholder='请输入请假原因'
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              variant='outlined'
              onClick={() => setShowLeaveModal(false)}
            >
              取消
            </Button>
            <Button
              variant='contained'
              onClick={handleCreateLeave}
            >
              提交申请
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </PageContainer>
  );
};

export default HrmAttendancePage;
