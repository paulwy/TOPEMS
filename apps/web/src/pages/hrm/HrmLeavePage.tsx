import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  Check,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  TextField,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import {
  ListPageTemplate,
  StatCard,
  StatCardGroup,
  type ColumnDef,
  type RowAction,
} from '@/components/mui';
import { useNotification } from '@/hooks/useNotification';
import { NotificationContainer } from '@/components/notification/NotificationContainer';
import { StatusBadge } from '@/components/hrm/StatusBadge';
import { logger } from '@/utils/logger';
import {
  leaveApi,
  employeeApi,
  type LeaveRequest,
  type PaginatedResult,
  type ListParams,
} from '@/api/hrm';

const LeaveManagementPage: React.FC = () => {
  const { success, error, notifications, hideNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<LeaveRequest>>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });
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
      logger.error('Failed to fetch leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeeApi.list();
      if (response.code === 200) {
        const items = response.data?.items || response.data || [];
        if (Array.isArray(items)) {
          setEmployees(items.map((e: any) => ({ id: e.id, name: e.name })) || []);
        } else {
          setEmployees([]);
        }
      }
    } catch (error) {
      logger.error('Failed to fetch employees:', error);
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
      logger.error('Failed to delete leave request:', error);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await leaveApi.approve(id, 'admin');
      if (response.code === 200) {
        fetchLeaveRequests();
      }
    } catch (error) {
      logger.error('Failed to approve leave request:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const response = await leaveApi.reject(id, 'admin', '已拒绝');
      if (response.code === 200) {
        fetchLeaveRequests();
      }
    } catch (error) {
      logger.error('Failed to reject leave request:', error);
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
      logger.error('Failed to save leave request:', error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getLeaveStatusBadge = (status: string) => (
    <StatusBadge
      status={status}
      category='leave'
      showIcon
    />
  );

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

  const leaveTypes = [
    { value: 'annual', label: '年假' },
    { value: 'sick', label: '病假' },
    { value: 'personal', label: '事假' },
    { value: 'maternity', label: '产假' },
    { value: 'paternity', label: '陪产假' },
    { value: 'other', label: '其他' },
  ];

  // 统计卡片数据
  const leaveStats = useMemo(() => {
    const items = data.items;
    return {
      total: data.total,
      pending: items.filter((i) => i.status === 'pending').length,
      approved: items.filter((i) => i.status === 'approved').length,
      rejected: items.filter((i) => i.status === 'rejected').length,
    };
  }, [data]);

  const statCards = useMemo(
    () => [
      {
        id: 'total',
        title: '申请总数',
        value: leaveStats.total,
        icon: <FileText size={20} />,
        color: 'primary' as const,
      },
      {
        id: 'pending',
        title: '待审批',
        value: leaveStats.pending,
        icon: <Clock size={20} />,
        color: 'warning' as const,
      },
      {
        id: 'approved',
        title: '已批准',
        value: leaveStats.approved,
        icon: <CheckCircle size={20} />,
        color: 'success' as const,
      },
      {
        id: 'rejected',
        title: '已拒绝',
        value: leaveStats.rejected,
        icon: <XCircle size={20} />,
        color: 'error' as const,
      },
    ],
    [leaveStats]
  );

  // 表格列定义
  const columns = useMemo<ColumnDef<LeaveRequest>[]>(
    () => [
      {
        id: 'employee',
        label: '员工',
        minWidth: 150,
        render: (row) => employees.find((e) => e.id === row.employee_id)?.name || '-',
      },
      {
        id: 'leave_type',
        label: '休假类型',
        minWidth: 120,
        render: (row) => getLeaveTypeText(row.leave_type),
      },
      {
        id: 'start_date',
        label: '开始日期',
        minWidth: 120,
        render: (row) => row.start_date,
      },
      {
        id: 'end_date',
        label: '结束日期',
        minWidth: 120,
        render: (row) => row.end_date,
      },
      {
        id: 'days',
        label: '天数',
        minWidth: 80,
        render: (row) => row.days,
      },
      {
        id: 'status',
        label: '状态',
        minWidth: 100,
        render: (row) => getLeaveStatusBadge(row.status),
      },
    ],
    [employees]
  );

  // 行操作
  const rowActions = useMemo<RowAction<LeaveRequest>[]>(
    () => [
      {
        label: '查看',
        icon: <Eye size={16} />,
        onClick: handleView,
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: handleEdit,
        color: 'primary',
      },
      {
        label: '批准',
        icon: <Check size={16} />,
        onClick: (row) => handleApprove(row.id),
        color: 'success',
        show: (row) => row.status === 'pending',
      },
      {
        label: '拒绝',
        icon: <X size={16} />,
        onClick: (row) => handleReject(row.id),
        color: 'error',
        show: (row) => row.status === 'pending',
        divider: true,
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        onClick: (row) => handleDelete(row.id),
        color: 'error',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb' }}>
      <NotificationContainer
        notifications={notifications}
        onClose={hideNotification}
      />
      <Box sx={{ p: 3 }}>
        {/* 面包屑导航 */}
        <Box sx={{ mb: 2 }}>
          <Typography
            component='a'
            href='/hrm'
            sx={{
              color: 'text.secondary',
              textDecoration: 'none',
              fontSize: '0.875rem',
              '&:hover': { color: 'primary.main', textDecoration: 'underline' },
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
            休假管理
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Typography
            variant='h5'
            sx={{ fontWeight: 'bold' }}
          >
            休假管理
          </Typography>
          <Button
            variant='contained'
            startIcon={<Plus size={18} />}
            onClick={handleAdd}
          >
            新增申请
          </Button>
        </Box>

        {/* 统计卡片 */}
        <Card sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent sx={{ p: 2 }}>
            <StatCardGroup
              stats={statCards}
              columns={4}
            />
          </CardContent>
        </Card>

        <ListPageTemplate
          columns={columns}
          data={data.items}
          loading={loading}
          pagination={{
            page: data.page - 1,
            pageSize: data.page_size,
            total: data.total,
            onPageChange: (page) => fetchLeaveRequests({ page: page + 1 }),
            onPageSizeChange: (pageSize) => fetchLeaveRequests({ page_size: pageSize }),
          }}
          rowActions={rowActions}
          onRowClick={handleView}
          emptyMessage='暂无休假申请数据'
          filters={[
            {
              id: 'search',
              label: '搜索',
              type: 'text',
              placeholder: '搜索员工姓名...',
            },
            {
              id: 'employee',
              label: '员工',
              type: 'select',
              options: employees.map((e) => ({ label: e.name, value: e.id })),
            },
            {
              id: 'type',
              label: '休假类型',
              type: 'select',
              options: leaveTypes,
            },
            {
              id: 'status',
              label: '状态',
              type: 'select',
              options: [
                { label: '全部状态', value: '' },
                { label: '待审批', value: 'pending' },
                { label: '已批准', value: 'approved' },
                { label: '已拒绝', value: 'rejected' },
                { label: '已取消', value: 'cancelled' },
              ],
            },
          ]}
          filtersValue={{
            search: searchText,
            employee: employeeFilter,
            type: typeFilter,
            status: statusFilter,
          }}
          onFilterChange={(filters) => {
            if (filters.search !== undefined) setSearchText(filters.search as string);
            if (filters.employee !== undefined) setEmployeeFilter(filters.employee as string);
            if (filters.type !== undefined) setTypeFilter(filters.type as string);
            if (filters.status !== undefined) setStatusFilter(filters.status as string);
          }}
          onSearch={handleSearch}
          actions={[
            {
              label: '搜索',
              variant: 'outlined',
              onClick: handleSearch,
            },
            {
              label: '重置',
              variant: 'outlined',
              onClick: handleReset,
            },
          ]}
        />

        {/* 新增/编辑 Dialog */}
        <Dialog
          open={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          maxWidth='sm'
          fullWidth
          slotProps={{
            paper: {
              sx: { borderRadius: 2 },
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 'bold' }}>
            {editingLeave ? '编辑休假申请' : '新增休假申请'}
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>员工 *</InputLabel>
                <Select
                  value={(formData as LeaveRequest)?.employee_id || ''}
                  label='员工 *'
                  onChange={(e) => handleInputChange('employee_id', e.target.value)}
                >
                  <MenuItem value=''>请选择员工</MenuItem>
                  {employees.map((e) => (
                    <MenuItem
                      key={e.id}
                      value={e.id}
                    >
                      {e.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>休假类型 *</InputLabel>
                <Select
                  value={(formData as LeaveRequest)?.leave_type || ''}
                  label='休假类型 *'
                  onChange={(e) => handleInputChange('leave_type', e.target.value)}
                >
                  <MenuItem value=''>请选择休假类型</MenuItem>
                  {leaveTypes.map((t) => (
                    <MenuItem
                      key={t.value}
                      value={t.value}
                    >
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  type='date'
                  label='开始日期 *'
                  value={(formData as LeaveRequest)?.start_date || ''}
                  onChange={(e) => handleInputChange('start_date', e.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  type='date'
                  label='结束日期 *'
                  value={(formData as LeaveRequest)?.end_date || ''}
                  onChange={(e) => handleInputChange('end_date', e.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
              <TextField
                type='number'
                label='休假天数 *'
                value={(formData as LeaveRequest)?.days || ''}
                onChange={(e) => handleInputChange('days', parseFloat(e.target.value) || 0)}
                placeholder='请输入休假天数'
                fullWidth
              />
              <TextField
                label='备注'
                value={(formData as LeaveRequest)?.reason || ''}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                multiline
                rows={3}
                placeholder='请输入备注信息'
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={() => setIsModalVisible(false)}
              variant='outlined'
            >
              取消
            </Button>
            <Button
              onClick={handleModalOk}
              variant='contained'
              startIcon={<Check size={18} />}
            >
              确定
            </Button>
          </DialogActions>
        </Dialog>

        {/* 查看详情 Dialog */}
        <Dialog
          open={isViewModalVisible}
          onClose={() => setIsViewModalVisible(false)}
          maxWidth='sm'
          fullWidth
          slotProps={{
            paper: {
              sx: { borderRadius: 2 },
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 'bold' }}>休假详情</DialogTitle>
          <DialogContent dividers>
            {editingLeave && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    员工:
                  </Typography>
                  <Typography variant='body2'>
                    {employees.find((e) => e.id === editingLeave.employee_id)?.name || '-'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    休假类型:
                  </Typography>
                  <Typography variant='body2'>
                    {getLeaveTypeText(editingLeave.leave_type)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    开始日期:
                  </Typography>
                  <Typography variant='body2'>{editingLeave.start_date}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    结束日期:
                  </Typography>
                  <Typography variant='body2'>{editingLeave.end_date}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    休假天数:
                  </Typography>
                  <Typography variant='body2'>{editingLeave.days}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    备注:
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {editingLeave.reason || '-'}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    状态:
                  </Typography>
                  {getLeaveStatusBadge(editingLeave.status)}
                </Box>
                {editingLeave.approver_id && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      审批人:
                    </Typography>
                    <Typography variant='body2'>{editingLeave.approver_id}</Typography>
                  </Box>
                )}
                {editingLeave.rejection_reason && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      审批意见:
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {editingLeave.rejection_reason}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    创建时间:
                  </Typography>
                  <Typography variant='body2'>{editingLeave.created_at}</Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              onClick={() => setIsViewModalVisible(false)}
              variant='contained'
            >
              关闭
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default LeaveManagementPage;
