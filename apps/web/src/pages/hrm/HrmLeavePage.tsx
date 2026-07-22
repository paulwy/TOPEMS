import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
import { useUrlListState } from '@/hooks';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const LeaveManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  // URL 同步的列表状态（搜索、分页、筛选）
  const listState = useUrlListState<{
    search: string;
    employee: string;
    type: string;
    status: string;
  }>({
    defaultSearch: '',
    defaultPageSize: 10,
    defaultFilters: { search: '', employee: '', type: '', status: '' },
    historyMode: 'replace',
  });

  const {
    debouncedSearch,
    currentPage,
    pageSize,
    filters,
    setCurrentPage,
    setPageSize,
    setFilter,
    setFilters,
    clearAll,
  } = listState;

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
    queryKey: ['hrm-leave-requests-list', debouncedSearch, filters.status, filters.type, filters.employee, currentPage, pageSize],
    queryFn: async () => {
      const params: ListParams = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.status) params.status = filters.status;
      if (filters.employee) params.employee_id = filters.employee;
      params.page = currentPage;
      params.pagesize = pageSize;
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
      addNotification({ title: t('hrm.hrm_leave_page.success'), message: t('hrm.hrm_leave_page.create'), type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['hrm-leave-requests-list'] });
    },
    onError: () => {
      addNotification({ title: t('hrm.hrm_leave_page.fail'), message: t('hrm.hrm_leave_page.create_1'), type: 'error' });
    },
  });

  const updateLeaveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LeaveRequest> }) =>
      leaveApi.update(id, data),
    onSuccess: () => {
      addNotification({ title: t('hrm.hrm_leave_page.success'), message: t('hrm.hrm_leave_page.update'), type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['hrm-leave-requests-list'] });
    },
    onError: () => {
      addNotification({ title: t('hrm.hrm_leave_page.fail'), message: t('hrm.hrm_leave_page.update_1'), type: 'error' });
    },
  });

  const deleteLeaveMutation = useMutation({
    mutationFn: (id: string) => leaveApi.delete(id),
    onSuccess: () => {
      addNotification({ title: t('hrm.hrm_leave_page.success'), message: t('hrm.hrm_leave_page.delete_success'), type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['hrm-leave-requests-list'] });
    },
    onError: () => {
      addNotification({ title: t('hrm.hrm_leave_page.fail'), message: t('hrm.hrm_leave_page.delete'), type: 'error' });
    },
  });

  const approveLeaveMutation = useMutation({
    mutationFn: (id: string) => leaveApi.approve(id, 'admin'),
    onSuccess: () => {
      addNotification({ title: t('hrm.hrm_leave_page.success'), message: t('hrm.hrm_leave_page.text_337737'), type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['hrm-leave-requests-list'] });
    },
    onError: () => {
      addNotification({ title: t('hrm.hrm_leave_page.fail'), message: t('hrm.hrm_leave_page.operation_failed'), type: 'error' });
    },
  });

  const rejectLeaveMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      leaveApi.reject(id, 'admin', reason),
    onSuccess: () => {
      addNotification({ title: t('hrm.hrm_leave_page.success'), message: t('hrm.hrm_leave_page.text_81233d'), type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['hrm-leave-requests-list'] });
    },
    onError: () => {
      addNotification({ title: t('hrm.hrm_leave_page.fail'), message: t('hrm.hrm_leave_page.operation_failed'), type: 'error' });
    },
  });

  const handleSearch = () => {
    queryClient.invalidateQueries({ queryKey: ['hrm-leave-requests-list'] });
  };

  const handleReset = useCallback(() => {
    clearAll();
  }, [clearAll]);

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
        title: t('hrm.hrm_leave_page.confirm_delete'),
        message: t('hrm.hrm_leave_page.confirm'),
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
        title: t('hrm.hrm_leave_page.confirm_1'),
        message: t('hrm.hrm_leave_page.confirm_2'),
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
          await rejectLeaveMutation.mutateAsync({ id, reason: t('hrm.hrm_leave_page.text_81233d') });
        } catch (error: unknown) {
          logger.error('Failed to reject leave request:', error);
        }
      };
      setConfirmDialogConfig({
        title: t('hrm.hrm_leave_page.confirm_3'),
        message: t('hrm.hrm_leave_page.confirm_4'),
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
      annual: t('hrm.hrm_leave_page.text_69a928'),
      sick: t('hrm.hrm_leave_page.text_26fa6c'),
      personal: t('hrm.hrm_leave_page.text_f571dd'),
      maternity: t('hrm.hrm_leave_page.text_f8d792'),
      paternity: t('hrm.hrm_leave_page.text_e4eaf1'),
      other: t('hrm.hrm_leave_page.other'),
    };
    return types[type] || type;
  };

  const leaveTypes = [
    { value: 'annual', label: t('hrm.hrm_leave_page.text_69a928') },
    { value: 'sick', label: t('hrm.hrm_leave_page.text_26fa6c') },
    { value: 'personal', label: t('hrm.hrm_leave_page.text_f571dd') },
    { value: 'maternity', label: t('hrm.hrm_leave_page.text_f8d792') },
    { value: 'paternity', label: t('hrm.hrm_leave_page.text_e4eaf1') },
    { value: 'other', label: t('hrm.hrm_leave_page.other') },
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
        title: t('hrm.hrm_leave_page.text_88ce9c'),
        value: leaveStats.total,
        icon: <FileText size={20} />,
        color: 'primary' as const,
      },
      {
        id: 'pending',
        title: t('hrm.hrm_leave_page.text_b0bf01'),
        value: leaveStats.pending,
        icon: <Clock size={20} />,
        color: 'warning' as const,
      },
      {
        id: 'approved',
        title: t('hrm.hrm_leave_page.text_337737'),
        value: leaveStats.approved,
        icon: <CheckCircle size={20} />,
        color: 'success' as const,
      },
      {
        id: 'rejected',
        title: t('hrm.hrm_leave_page.text_81233d'),
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
        label: t('hrm.hrm_leave_page.text_2ed392'),
        minWidth: 150,
        render: (row) => employees.find((e) => e.id === row.employee_id)?.name || '-',
      },
      {
        id: 'leave_type',
        label: t('hrm.hrm_leave_page.type'),
        minWidth: 120,
        render: (row) => getLeaveTypeText(row.leave_type),
      },
      {
        id: 'start_date',
        label: t('hrm.hrm_leave_page.start_date'),
        minWidth: 120,
        render: (row) => row.start_date,
      },
      {
        id: 'end_date',
        label: t('hrm.hrm_leave_page.end_date'),
        minWidth: 120,
        render: (row) => row.end_date,
      },
      {
        id: 'days',
        label: t('hrm.hrm_leave_page.text_aaf707'),
        minWidth: 80,
        render: (row) => row.days,
      },
      {
        id: 'status',
        label: t('hrm.hrm_leave_page.status'),
        minWidth: 100,
        render: (row) => getLeaveStatusBadge(row.status),
      },
    ],
    [employees]
  );

  const rowActions = useMemo<RowAction<LeaveRequest>[]>(
    () => [
      {
        label: t('hrm.hrm_leave_page.view'),
        icon: <Eye size={16} />,
        onClick: handleView,
      },
      {
        label: t('hrm.hrm_leave_page.edit'),
        icon: <Edit size={16} />,
        onClick: handleEdit,
        color: 'primary',
      },
      {
        label: t('hrm.hrm_leave_page.text_7a712b'),
        icon: <Check size={16} />,
        onClick: (row) => handleApprove(row.id),
        color: 'success',
        show: (row) => row.status === 'pending',
      },
      {
        label: t('hrm.hrm_leave_page.text_7173f8'),
        icon: <X size={16} />,
        onClick: (row) => handleReject(row.id),
        color: 'error',
        show: (row) => row.status === 'pending',
        divider: true,
      },
      {
        label: t('hrm.hrm_leave_page.delete_1'),
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
          searchable
          searchValue={filters.search as string}
          onSearchChange={(val) => setFilter('search', val)}
          pagination={{
            page: currentPage - 1,
            pageSize,
            total: data.total,
            onPageChange: (page) => setCurrentPage(page + 1),
            onPageSizeChange: (size) => setPageSize(size),
          }}
          rowActions={rowActions}
          onRowClick={handleView}
          emptyMessage={t('hrm.hrm_leave_page.no_data')}
          filters={[
            {
              id: 'employee',
              label: t('hrm.hrm_leave_page.text_2ed392'),
              type: 'select',
              options: employees.map((e) => ({ label: e.name, value: e.id })),
            },
            {
              id: 'type',
              label: t('hrm.hrm_leave_page.type'),
              type: 'select',
              options: leaveTypes,
            },
            {
              id: 'status',
              label: t('hrm.hrm_leave_page.status'),
              type: 'select',
              options: [
                { label: t('hrm.hrm_leave_page.status_1'), value: '' },
                { label: t('hrm.hrm_leave_page.text_b0bf01'), value: 'pending' },
                { label: t('hrm.hrm_leave_page.text_337737'), value: 'approved' },
                { label: t('hrm.hrm_leave_page.text_81233d'), value: 'rejected' },
                { label: t('hrm.hrm_leave_page.cancelled'), value: 'cancelled' },
              ],
            },
          ]}
          filtersValue={{
            employee: filters.employee,
            type: filters.type,
            status: filters.status,
          }}
          onFilterChange={(newFilters) => {
            setFilters(newFilters as Record<string, string>);
          }}
          actions={[
            {
              label: t('hrm.hrm_leave_page.reset'),
              variant: 'outlined',
              onClick: handleReset,
            },
          ]}
          exportable
          exportFileName={t('hrm.hrm_leave_page.list')}
          emptyActionButton={{
            label: t('hrm.hrm_leave_page.add'),
            icon: <Plus size={16} />,
            onClick: handleAdd,
          }}
        />

        <Dialog
          open={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          title={editingLeave ? t('hrm.hrm_leave_page.edit_1') : t('hrm.hrm_leave_page.add')}
          maxWidth='sm'
          fullWidth
          cancelButton={{ label: t('hrm.hrm_leave_page.cancel') }}
          confirmButton={{ label: t('hrm.hrm_leave_page.confirm_5'), onClick: handleModalOk }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <FormSelect
              name='employee_id'
              label={t('hrm.hrm_leave_page.text_1a8eb0')}
              value={(formData as LeaveRequest)?.employee_id || ''}
              options={[
                { value: '', label: t('hrm.hrm_leave_page.please_select') },
                ...employees.map((e) => ({ value: e.id, label: e.name })),
              ]}
              onChange={(value) => handleInputChange('employee_id', value as string | number)}
            />
            <FormSelect
              name='leave_type'
              label={t('hrm.hrm_leave_page.type_1')}
              value={(formData as LeaveRequest)?.leave_type || ''}
              options={[{ value: '', label: t('hrm.hrm_leave_page.please_select_1') }, ...leaveTypes]}
              onChange={(value) => handleInputChange('leave_type', value as string | number)}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormField
                name='start_date'
                label={t('hrm.hrm_leave_page.start_date_1')}
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
                label={t('hrm.hrm_leave_page.end_date_1')}
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
              label={t('hrm.hrm_leave_page.text_c5dc09')}
              type='number'
              value={(formData as LeaveRequest)?.days || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange('days', parseFloat(e.target.value) || 0)
              }
              placeholder={t('hrm.hrm_leave_page.please_input')}
              fullWidth
            />
            <FormField
              name='reason'
              label={t('hrm.hrm_leave_page.remark')}
              value={(formData as LeaveRequest)?.reason || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange('reason', e.target.value)
              }
              multiline
              rows={3}
              placeholder={t('hrm.hrm_leave_page.please_input_1')}
              fullWidth
            />
          </Box>
        </Dialog>

        <Dialog
          open={isViewModalVisible}
          onClose={() => setIsViewModalVisible(false)}
          title={t('hrm.hrm_leave_page.detail')}
          maxWidth='sm'
          fullWidth
          confirmButton={{ label: t('hrm.hrm_leave_page.close'), onClick: () => setIsViewModalVisible(false) }}
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
