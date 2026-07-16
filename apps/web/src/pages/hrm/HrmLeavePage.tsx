import React, { useState, useMemo, useCallback } from 'react';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
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
import { Card, CardContent, Typography, Box } from '@mui/material';
import {
  ListPageTemplate,
  StatCard,
  StatCardGroup,
  type ColumnDef,
  type RowAction,
} from '@/components';
import {
  StatusBadge,
  ActionButton,
  FormField,
  FormSelect,
  ConfirmDialog,
} from '@topems/shared-components';
import { Dialog } from '@/components/common/Dialog';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import {
  leaveApi,
  employeeApi,
  type LeaveRequest,
  type PaginatedResult,
  type ListParams,
} from '@/api/hrm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const ct = designTokens.colors;

const LeaveManagementPage: React.FC = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [editingLeave, setEditingLeave] = useState<LeaveRequest | null>(null);
  const [formData, setFormData] = useState<Partial<LeaveRequest>>({});

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  // React Query - 请假申请列表
  const leaveRequestsQuery = useQuery<PaginatedResult<LeaveRequest>>({
    queryKey: ['hrm-leave-requests-list', searchText, statusFilter, typeFilter, employeeFilter],
    queryFn: async () => {
      const params: ListParams = {};
      if (searchText) params.search = searchText;
      if (statusFilter) params.status = statusFilter;
      if (employeeFilter) params.employee_id = employeeFilter;
      const response = await leaveApi.list(params);
      if (response.code === 200) {
        return response.data!;
      }
      return { items: [], total: 0, page: 1, pagesize: 10 };
    },
    staleTime: 5 * 60 * 1000,
  });

  const data = leaveRequestsQuery.data || { items: [], total: 0, page: 1, pagesize: 10 };
  const loading = leaveRequestsQuery.isLoading;

  // React Query - 员工列表
  const employeesQuery = useQuery<{ id: string; name: string }[]>({
    queryKey: ['hrm-leave-employees'],
    queryFn: async () => {
      const response = await employeeApi.list();
      if (response.code === 200) {
        const items = response.data?.items || response.data || [];
        if (Array.isArray(items)) {
          return (
            items.map((e: { id?: string; name?: string }) => ({
              id: e.id || '',
              name: e.name || '',
            })) || []
          );
        }
      }
      return [];
    },
    staleTime: 30 * 60 * 1000,
  });

  const employees = employeesQuery.data || [];

  // React Query - Mutations
  const createLeaveMutation = useMutation({
    mutationFn: (data: Partial<LeaveRequest>) => leaveApi.create(data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '创建成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['hrm-leave-requests-list'] });
    },
    onError: () => {
      addNotification({ title: '失败', message: '创建失败', type: 'error' });
    },
  });

  const updateLeaveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LeaveRequest> }) =>
      leaveApi.update(id, data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '更新成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['hrm-leave-requests-list'] });
    },
    onError: () => {
      addNotification({ title: '失败', message: '更新失败', type: 'error' });
    },
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: (id: string) => leaveApi.delete(id),
    onSuccess: () => {
      addNotification({ title: '成功', message: '删除成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['hrm-leave-requests-list'] });
    },
    onError: () => {
      addNotification({ title: '失败', message: '删除失败', type: 'error' });
    },
  });

  const approveLeaveMutation = useMutation({
    mutationFn: (id: string) => leaveApi.approve(id, 'admin'),
    onSuccess: () => {
      addNotification({ title: '成功', message: '已批准', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['hrm-leave-requests-list'] });
    },
    onError: () => {
      addNotification({ title: '失败', message: '操作失败', type: 'error' });
    },
  });

  const rejectLeaveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      leaveApi.reject(id, 'admin', reason),
    onSuccess: () => {
      addNotification({ title: '成功', message: '已拒绝', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['hrm-leave-requests-list'] });
    },
    onError: () => {
      addNotification({ title: '失败', message: '操作失败', type: 'error' });
    },
  });

  const handleSearch = () => {
    queryClient.invalidateQueries({ queryKey: ['hrm-leave-requests-list'] });
  };

  const handleReset = useCallback(() => {
    setSearchText('');
    setStatusFilter('');
    setTypeFilter('');
    setEmployeeFilter('');
  }, []);

  const handleAdd = useCallback(() => {
    setEditingLeave(null);
    setFormData({});
    setIsModalVisible(true);
  }, []);

  const handleEdit = useCallback((record: LeaveRequest) => {
    setEditingLeave(record);
    setFormData(record);
    setIsModalVisible(true);
  }, []);

  const handleView = useCallback((record: LeaveRequest) => {
    setEditingLeave(record);
    setIsViewModalVisible(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      const confirmDelete = async () => {
        try {
          await deleteLeaveMutation.mutateAsync(id);
        } catch (error: unknown) {
          logger.error('Failed to delete leave request:', error);
        }
      };
      setConfirmDialogConfig({
        title: '确认删除',
        message: '确定要删除这个请假申请吗？',
        onConfirm: confirmDelete,
        danger: true,
      });
      setConfirmDialogOpen(true);
    },
    [deleteLeaveMutation]
  );

  const handleApprove = useCallback(
    (id: string) => {
      const confirmApprove = async () => {
        try {
          await approveLeaveMutation.mutateAsync(id);
        } catch (error: unknown) {
          logger.error('Failed to approve leave request:', error);
        }
      };
      setConfirmDialogConfig({
        title: '确认批准',
        message: '确定要批准这个请假申请吗？',
        onConfirm: confirmApprove,
      });
      setConfirmDialogOpen(true);
    },
    [approveLeaveMutation]
  );

  const handleReject = useCallback(
    (id: string) => {
      const confirmReject = async () => {
        try {
          await rejectLeaveMutation.mutateAsync({ id, reason: '已拒绝' });
        } catch (error: unknown) {
          logger.error('Failed to reject leave request:', error);
        }
      };
      setConfirmDialogConfig({
        title: '确认拒绝',
        message: '确定要拒绝这个请假申请吗？',
        onConfirm: confirmReject,
        danger: true,
      });
      setConfirmDialogOpen(true);
    },
    [rejectLeaveMutation]
  );

  const handleModalOk = useCallback(async () => {
    try {
      if (editingLeave) {
        await updateLeaveMutation.mutateAsync({ id: editingLeave.id, data: formData });
      } else {
        await createLeaveMutation.mutateAsync(formData);
      }
      setIsModalVisible(false);
    } catch (error: unknown) {
      logger.error('Failed to save leave request:', error);
    }
  }, [editingLeave, formData, createLeaveMutation, updateLeaveMutation]);

  const handleInputChange = useCallback((field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const getLeaveStatusBadge = (status: string) => (
    <StatusBadge
      status={`leave_${status}`}
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

  const leaveStats = useMemo(() => {
    const items = data.items as LeaveRequest[];
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
    [handleView, handleEdit, handleApprove, handleReject, handleDelete]
  );

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <FileText size={28} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary[400]} 0%, ${ct.info[400]} 100%)`,
      }}
      padding={false}
      maxWidth={false}
    >
      <Box sx={{ p: 3 }}>
        <Card sx={{ mb: 3, borderRadius: 3 }}>
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
            pageSize: data.pagesize,
            total: data.total,
            onPageChange: (page) =>
              queryClient.setQueryData(
                ['hrm-leave-requests-list'],
                (prev: PaginatedResult<LeaveRequest> | undefined) => ({
                  ...(prev || { items: [], total: 0, page: 1, pagesize: 10 }),
                  page: page + 1,
                })
              ),
            onPageSizeChange: (pageSize) =>
              queryClient.setQueryData(
                ['hrm-leave-requests-list'],
                (prev: PaginatedResult<LeaveRequest> | undefined) => ({
                  ...(prev || { items: [], total: 0, page: 1, pagesize: 10 }),
                  pagesize: pageSize,
                  page: 1,
                })
              ),
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
          exportable
          exportFileName='休假申请列表'
          persistFilters
          persistSearch
          emptyActionButton={{
            label: '新增休假申请',
            icon: <Plus size={16} />,
            onClick: handleAdd,
          }}
        />

        <Dialog
          open={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          title={editingLeave ? '编辑休假申请' : '新增休假申请'}
          maxWidth='sm'
          fullWidth
          cancelButton={{ label: '取消' }}
          confirmButton={{ label: '确定', onClick: handleModalOk }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <FormSelect
              name='employee_id'
              label='员工 *'
              value={(formData as LeaveRequest)?.employee_id || ''}
              options={[
                { value: '', label: '请选择员工' },
                ...employees.map((e) => ({ value: e.id, label: e.name })),
              ]}
              onChange={(value) => handleInputChange('employee_id', value as string | number)}
            />
            <FormSelect
              name='leave_type'
              label='休假类型 *'
              value={(formData as LeaveRequest)?.leave_type || ''}
              options={[{ value: '', label: '请选择休假类型' }, ...leaveTypes]}
              onChange={(value) => handleInputChange('leave_type', value as string | number)}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormField
                name='start_date'
                label='开始日期 *'
                type='date'
                value={(formData as LeaveRequest)?.start_date || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('start_date', e.target.value)
                }
                fullWidth
                slotProps={{ inputLabel: { shrink: true } } as const}
              />
              <FormField
                name='end_date'
                label='结束日期 *'
                type='date'
                value={(formData as LeaveRequest)?.end_date || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('end_date', e.target.value)
                }
                fullWidth
                slotProps={{ inputLabel: { shrink: true } } as const}
              />
            </Box>
            <FormField
              name='days'
              label='休假天数 *'
              type='number'
              value={(formData as LeaveRequest)?.days || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange('days', parseFloat(e.target.value) || 0)
              }
              placeholder='请输入休假天数'
              fullWidth
            />
            <FormField
              name='reason'
              label='备注'
              value={(formData as LeaveRequest)?.reason || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange('reason', e.target.value)
              }
              multiline
              rows={3}
              placeholder='请输入备注信息'
              fullWidth
            />
          </Box>
        </Dialog>

        <Dialog
          open={isViewModalVisible}
          onClose={() => setIsViewModalVisible(false)}
          title='休假详情'
          maxWidth='sm'
          fullWidth
          confirmButton={{ label: '关闭', onClick: () => setIsViewModalVisible(false) }}
        >
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
                <Typography variant='body2'>{getLeaveTypeText(editingLeave.leave_type)}</Typography>
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
        </Dialog>

        <ConfirmDialog
          isOpen={confirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
          onConfirm={() => {
            confirmDialogConfig?.onConfirm();
            setConfirmDialogOpen(false);
          }}
          title={confirmDialogConfig?.title || ''}
          message={confirmDialogConfig?.message || ''}
          danger={confirmDialogConfig?.danger}
        />
      </Box>
    </PageContainer>
  );
};

export default LeaveManagementPage;
