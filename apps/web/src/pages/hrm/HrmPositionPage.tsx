import React, { useState, useMemo } from 'react';
import { Typography, Box, Button, DialogContent, DialogActions, useTheme } from '@mui/material';
import { Briefcase, Plus, Edit, Trash2, Eye, Users, CheckCircle, XCircle } from 'lucide-react';
import {
  positionApi,
  departmentApi,
  type Position,
  type Department,
  type PaginatedResult,
  type ListParams,
} from '@/api/hrm';
import { useNotificationStore } from '../../store';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { ModeToggle } from '@/components/theme/ModeToggle';
import {
  DataExport,
  ActionButton,
  FormField,
  FormSelect,
  StatusBadge,
  Dialog,
} from '@/components/common';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiLogger } from '@/utils/logger';

import { useTranslation } from 'react-i18next';
interface PositionManagementPageProps {}

const PositionManagementPage: React.FC<PositionManagementPageProps> = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  const [formData, setFormData] = useState<Partial<Position>>({});

  const positionsQuery = useQuery<PaginatedResult<Position>>({
    queryKey: ['hrm-positions', searchText, statusFilter, departmentFilter],
    queryFn: async (): Promise<PaginatedResult<Position>> => {
      const params: ListParams = {};
      if (searchText) params.search = searchText;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (departmentFilter && departmentFilter !== 'all') params.department_id = departmentFilter;

      const response = await positionApi.list(params);
      if (response.code === 200 && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return {
          items: (data.items as Position[]) || [],
          total: (data.total as number) || 0,
          page: (data.page as number) || 1,
          pagesize: (data.pagesize as number) || 10,
        };
      }
      return { items: [], total: 0, page: 1, pagesize: 10 };
    },
    staleTime: 5 * 60 * 1000,
  });

  const departmentsQuery = useQuery<{ id: string; name: string }[]>({
    queryKey: ['hrm-departments'],
    queryFn: async () => {
      const response = await departmentApi.list();
      if (response.code === 200 && response.data) {
        const items = response.data.items || [];
        return items.map((d: Department) => ({ id: d.id, name: d.name }));
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const data = positionsQuery.data || { items: [], total: 0, page: 1, pagesize: 10 };
  const loading = positionsQuery.isLoading;
  const departments = departmentsQuery.data || [];

  React.useEffect(() => {
    if (positionsQuery.isError) {
      apiLogger.error(t('hrm.hrm_position_page.list'), positionsQuery.error);
      addNotification({
        title: t('hrm.hrm_position_page.fail'),
        message: (positionsQuery.error as { message?: string })?.message || t('hrm.hrm_position_page.list_1'),
        type: 'error',
      });
    }
  }, [positionsQuery.isError, positionsQuery.error, apiLogger, addNotification]);

  React.useEffect(() => {
    if (departmentsQuery.isError) {
      apiLogger.error(t('hrm.hrm_position_page.list_2'), departmentsQuery.error);
      addNotification({
        title: t('hrm.hrm_position_page.fail'),
        message: (departmentsQuery.error as { message?: string })?.message || t('hrm.hrm_position_page.list_3'),
        type: 'error',
      });
    }
  }, [departmentsQuery.isError, departmentsQuery.error, apiLogger, addNotification]);

  const createPositionMutation = useMutation({
    mutationFn: (data: Partial<Position>) => positionApi.create(data),
    onSuccess: () => {
      addNotification({
        title: t('hrm.hrm_position_page.success'),
        message: t('hrm.hrm_position_page.create'),
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['hrm-positions'] });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('hrm.hrm_position_page.create_1'), error);
      addNotification({
        title: t('hrm.hrm_position_page.fail_1'),
        message: (error as { message?: string }).message || t('hrm.hrm_position_page.create_2'),
        type: 'error',
      });
    },
  });

  const updatePositionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Position> }) =>
      positionApi.update(id, data),
    onSuccess: () => {
      addNotification({
        title: t('hrm.hrm_position_page.success'),
        message: t('hrm.hrm_position_page.update'),
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['hrm-positions'] });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('hrm.hrm_position_page.update_1'), error);
      addNotification({
        title: t('hrm.hrm_position_page.fail_1'),
        message: (error as { message?: string }).message || t('hrm.hrm_position_page.update_2'),
        type: 'error',
      });
    },
  });

  const deletePositionMutation = useMutation({
    mutationFn: (id: string) => positionApi.delete(id),
    onSuccess: () => {
      addNotification({
        title: t('hrm.hrm_position_page.success'),
        message: t('hrm.hrm_position_page.delete_success'),
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['hrm-positions'] });
    },
    onError: (error: unknown) => {
      apiLogger.error(t('hrm.hrm_position_page.delete'), error);
      addNotification({
        title: t('hrm.hrm_position_page.fail_1'),
        message: (error as { message?: string }).message || t('hrm.hrm_position_page.delete_1'),
        type: 'error',
      });
    },
  });

  const handleAdd = () => {
    setSelectedPosition(null);
    setFormData({});
    setShowCreateModal(true);
  };

  const handleEdit = (record: Position) => {
    setSelectedPosition(record);
    setFormData(record);
    setShowEditModal(true);
  };

  const handleView = (record: Position) => {
    setSelectedPosition(record);
    setShowViewModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('hrm.hrm_position_page.confirm'))) return;
    await deletePositionMutation.mutateAsync(id);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPositionMutation.mutateAsync(formData);
    setShowCreateModal(false);
    setFormData({});
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPosition) return;
    await updatePositionMutation.mutateAsync({ id: selectedPosition.id, data: formData });
    setShowEditModal(false);
    setSelectedPosition(null);
  };

  const handleInputChange = (field: string, value: string | number | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<
      string,
      'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
    > = {
      active: 'success',
      inactive: 'default',
    };
    const labels: Record<string, string> = {
      active: t('hrm.hrm_position_page.active'),
      inactive: t('hrm.hrm_position_page.text_710ad0'),
    };
    return (
      <StatusBadge
        status={status}
        label={labels[status] || status}
        color={colors[status] || 'default'}
      />
    );
  };

  const stats = useMemo(() => {
    const totalPositions = data.total;
    const activePositions = data.items.filter((item) => item.status === 'active').length;
    const inactivePositions = data.items.filter((item) => item.status === 'inactive').length;
    const totalEmployees = data.items.reduce((sum, item) => sum + (item.employee_count || 0), 0);

    return [
      {
        title: t('hrm.hrm_position_page.text_7fa104'),
        value: totalPositions,
        icon: <Briefcase style={{ width: 24, height: 24 }} />,
        color: 'primary' as const,
      },
      {
        title: t('hrm.hrm_position_page.active_1'),
        value: activePositions,
        icon: <CheckCircle style={{ width: 24, height: 24 }} />,
        color: 'success' as const,
      },
      {
        title: t('hrm.hrm_position_page.text_a240fa'),
        value: inactivePositions,
        icon: <XCircle style={{ width: 24, height: 24 }} />,
        color: 'warning' as const,
      },
      {
        title: t('hrm.hrm_position_page.text_c9088f'),
        value: totalEmployees,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: 'info' as const,
      },
    ];
  }, [data]);

  const columns = useMemo<ColumnDef<Position>[]>(
    () => [
      {
        id: 'name',
        label: t('hrm.hrm_position_page.name'),
        render: (row: Position) => {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: 'indigo.100',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Briefcase style={{ width: 20, height: 20, color: theme.palette.primary.main }} />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500, color: 'grey.900' }}
                >
                  {row.name}
                </Typography>
                {row.code && (
                  <Typography
                    variant='caption'
                    sx={{ color: 'grey.500' }}
                  >
                    {row.code}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        },
      },
      {
        id: 'department_id',
        label: t('hrm.hrm_position_page.text_68923b'),
        render: (row: Position) => (
          <Typography
            variant='body2'
            sx={{ color: 'grey.900' }}
          >
            {departments.find((d) => d.id === row.department_id)?.name || '-'}
          </Typography>
        ),
      },
      {
        id: 'level',
        label: t('hrm.hrm_position_page.text_f42e3d'),
        render: (row: Position) => (
          <Typography
            variant='body2'
            sx={{ color: 'grey.900' }}
          >
            {row.level || '-'}
          </Typography>
        ),
      },
      {
        id: 'salary_range',
        label: t('hrm.hrm_position_page.text_532859'),
        render: (row: Position) => (
          <Typography
            variant='body2'
            sx={{ color: 'grey.900' }}
          >
            {row.min_salary || 0} - {row.max_salary || 0}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: t('hrm.hrm_position_page.status'),
        render: (row: Position) => getStatusBadge(row.status),
      },
    ],
    [departments]
  );

  const rowActions: RowAction<Position>[] = [
    {
      label: t('hrm.hrm_position_page.view'),
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: handleView,
    },
    {
      label: t('hrm.hrm_position_page.edit'),
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: handleEdit,
    },
    {
      label: t('hrm.hrm_position_page.delete_2'),
      icon: <Trash2 style={{ width: 16, height: 16 }} />,
      color: 'error',
      onClick: (row: Position) => handleDelete(row.id),
      confirm: true,
      confirmMessage: t('hrm.hrm_position_page.confirm'),
    },
  ];

  const exportFields = useMemo(
    () => [
      { key: 'name', title: t('hrm.hrm_position_page.name') },
      { key: 'code', title: t('hrm.hrm_position_page.code') },
      { key: 'level', title: t('hrm.hrm_position_page.text_f42e3d') },
      { key: 'min_salary', title: t('hrm.hrm_position_page.text_ac4667') },
      { key: 'max_salary', title: t('hrm.hrm_position_page.text_d8c7a1') },
      { key: 'status', title: t('hrm.hrm_position_page.status') },
      { key: 'employee_count', title: t('hrm.hrm_position_page.quantity') },
    ],
    []
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 3 }}>
        <ListPageTemplate
          title={t('hrm.hrm_position_page.text_a862dd')}
          subtitle={t('hrm.hrm_position_page.info')}
          breadcrumbs={[{ label: t('hrm.hrm_position_page.text_40fb54'), href: '/hrm' }, { label: t('hrm.hrm_position_page.text_a862dd') }]}
          columns={columns}
          data={data.items}
          loading={loading}
          rowActions={rowActions}
          pagination={{
            page: data.page - 1,
            pageSize: data.pagesize,
            total: data.total,
            onPageChange: (page: number) => {
              queryClient.setQueryData<PaginatedResult<Position>>(
                ['hrm-positions', searchText, statusFilter, departmentFilter],
                (prev) => prev ? ({
                  ...prev,
                  page: page + 1,
                }) : prev
              );
            },
          }}
          searchable
          searchPlaceholder={t('hrm.hrm_position_page.search')}
          searchValue={searchText}
          onSearch={(value: string) => setSearchText(value)}
          filters={[
            {
              id: 'department',
              label: t('hrm.hrm_position_page.text_1e1459'),
              type: 'select',
              options: [
                { label: t('hrm.hrm_position_page.all'), value: 'all' },
                ...departments.map((d) => ({ label: d.name, value: d.id })),
              ],
              value: departmentFilter,
              onChange: (value: unknown) => setDepartmentFilter(value as string),
            },
            {
              id: 'status',
              label: t('hrm.hrm_position_page.status'),
              type: 'select',
              options: [
                { label: t('hrm.hrm_position_page.status_1'), value: 'all' },
                { label: t('hrm.hrm_position_page.active'), value: 'active' },
                { label: t('hrm.hrm_position_page.text_710ad0'), value: 'inactive' },
              ],
              value: statusFilter,
              onChange: (value: unknown) => setStatusFilter(value as string),
            },
          ]}
          actions={[
            {
              label: t('hrm.hrm_position_page.export'),
              icon: <Briefcase style={{ width: 18, height: 18 }} />,
              onClick: () => {},
              variant: 'outlined',
            },
            {
              label: t('hrm.hrm_position_page.add'),
              icon: <Plus style={{ width: 18, height: 18 }} />,
              onClick: handleAdd,
              variant: 'contained',
            },
          ]}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['hrm-positions'] })}
          emptyMessage={t('hrm.hrm_position_page.no_data')}
          emptyIcon={
            <Briefcase style={{ width: 48, height: 48, color: theme.palette.text.disabled }} />
          }
          headerContent={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ModeToggle />
              <DataExport
                data={data.items as unknown as Record<string, unknown>[]}
                fields={exportFields}
                defaultFileName={t('hrm.hrm_position_page.text_1ae711')}
                buttonText={t('hrm.hrm_position_page.export')}
              />
            </Box>
          }
          exportable
          exportFileName={t('hrm.hrm_position_page.list_4')}
          persistFilters
          persistSearch
          emptyActionButton={{
            label: t('hrm.hrm_position_page.add'),
            icon: <Plus size={16} />,
            onClick: handleAdd,
          }}
        />
      </Box>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('hrm.hrm_position_page.add')}
        maxWidth='sm'
        fullWidth
        cancelButton={{ label: t('hrm.hrm_position_page.cancel') }}
        confirmButton={{
          label: t('hrm.hrm_position_page.create_3'),
          onClick: () => handleCreate({ preventDefault: () => {} } as React.FormEvent),
          disabled: createPositionMutation.isPending,
        }}
      >
        <DialogContent>
          <form onSubmit={handleCreate}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormField
                name='create-name'
                label={t('hrm.hrm_position_page.name_1')}
                type='text'
                required
                fullWidth
                value={(formData as Position)?.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('name', e.target.value)
                }
                placeholder={t('hrm.hrm_position_page.please_input')}
              />
              <FormField
                name='create-code'
                label={t('hrm.hrm_position_page.code')}
                type='text'
                fullWidth
                value={(formData as Position)?.code || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('code', e.target.value)
                }
                placeholder={t('hrm.hrm_position_page.please_input_1')}
              />
              <FormSelect
                name='department_id'
                label={t('hrm.hrm_position_page.text_68923b')}
                value={(formData as Position)?.department_id || ''}
                options={[
                  { value: 'none', label: t('hrm.hrm_position_page.text_d81bb2') },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
                onChange={(value) => handleInputChange('department_id', value)}
              />
              <FormField
                name='create-level'
                label={t('hrm.hrm_position_page.text_f42e3d')}
                type='text'
                fullWidth
                value={(formData as Position)?.level || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('level', e.target.value)
                }
                placeholder={t('hrm.hrm_position_page.please_input_2')}
              />
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                }}
              >
                <FormField
                  name='create-min-salary'
                  label={t('hrm.hrm_position_page.text_ac4667')}
                  type='number'
                  fullWidth
                  value={(formData as Position)?.min_salary || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('min_salary', parseFloat(e.target.value) || 0)
                  }
                  placeholder={t('hrm.hrm_position_page.text_ac4667')}
                />
                <FormField
                  name='create-max-salary'
                  label={t('hrm.hrm_position_page.text_d8c7a1')}
                  type='number'
                  fullWidth
                  value={(formData as Position)?.max_salary || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('max_salary', parseFloat(e.target.value) || 0)
                  }
                  placeholder={t('hrm.hrm_position_page.text_d8c7a1')}
                />
              </Box>
              <FormField
                name='create-description'
                label={t('hrm.hrm_position_page.description')}
                multiline
                rows={3}
                fullWidth
                value={(formData as Position)?.description || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('description', e.target.value)
                }
                placeholder={t('hrm.hrm_position_page.please_input_3')}
              />
              <FormField
                name='create-requirements'
                label={t('hrm.hrm_position_page.text_2bc4c4')}
                multiline
                rows={3}
                fullWidth
                value={(formData as Position)?.requirements || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('requirements', e.target.value)
                }
                placeholder={t('hrm.hrm_position_page.please_input_4')}
              />
              <FormSelect
                name='status'
                label={t('hrm.hrm_position_page.status')}
                value={(formData as Position)?.status || 'active'}
                options={[
                  { value: 'active', label: t('hrm.hrm_position_page.active') },
                  { value: 'inactive', label: t('hrm.hrm_position_page.text_710ad0') },
                ]}
                onChange={(value) => handleInputChange('status', value)}
              />
            </Box>
            <DialogActions sx={{ mt: 3 }}>
              <Button onClick={() => setShowCreateModal(false)}>取消</Button>
              <Button
                type='submit'
                variant='contained'
                disabled={createPositionMutation.isPending}
              >
                {createPositionMutation.isPending ? t('hrm.hrm_position_page.create_4') : t('hrm.hrm_position_page.create_3')}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={t('hrm.hrm_position_page.edit_1')}
        maxWidth='sm'
        fullWidth
        cancelButton={{
          label: t('hrm.hrm_position_page.cancel'),
          onClick: () => {
            setShowEditModal(false);
            setSelectedPosition(null);
          },
        }}
        confirmButton={{
          label: t('hrm.hrm_position_page.save'),
          onClick: () => handleUpdate({ preventDefault: () => {} } as React.FormEvent),
          disabled: updatePositionMutation.isPending,
        }}
      >
        {selectedPosition && (
          <form onSubmit={handleUpdate}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormField
                name='edit-name'
                label={t('hrm.hrm_position_page.name_1')}
                type='text'
                required
                fullWidth
                value={(formData as Position)?.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('name', e.target.value)
                }
              />
              <FormField
                name='edit-code'
                label={t('hrm.hrm_position_page.code')}
                type='text'
                fullWidth
                value={(formData as Position)?.code || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('code', e.target.value)
                }
              />
              <FormSelect
                name='department_id'
                label={t('hrm.hrm_position_page.text_68923b')}
                value={(formData as Position)?.department_id || ''}
                options={[
                  { value: 'none', label: t('hrm.hrm_position_page.text_d81bb2') },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
                onChange={(value) => handleInputChange('department_id', value)}
              />
              <FormField
                name='edit-level'
                label={t('hrm.hrm_position_page.text_f42e3d')}
                type='text'
                fullWidth
                value={(formData as Position)?.level || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('level', e.target.value)
                }
              />
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                }}
              >
                <FormField
                  name='edit-min-salary'
                  label={t('hrm.hrm_position_page.text_ac4667')}
                  type='number'
                  fullWidth
                  value={(formData as Position)?.min_salary || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('min_salary', parseFloat(e.target.value) || 0)
                  }
                />
                <FormField
                  name='edit-max-salary'
                  label={t('hrm.hrm_position_page.text_d8c7a1')}
                  type='number'
                  fullWidth
                  value={(formData as Position)?.max_salary || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('max_salary', parseFloat(e.target.value) || 0)
                  }
                />
              </Box>
              <FormField
                name='edit-description'
                label={t('hrm.hrm_position_page.description')}
                multiline
                rows={3}
                fullWidth
                value={(formData as Position)?.description || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('description', e.target.value)
                }
              />
              <FormField
                name='edit-requirements'
                label={t('hrm.hrm_position_page.text_2bc4c4')}
                multiline
                rows={3}
                fullWidth
                value={(formData as Position)?.requirements || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('requirements', e.target.value)
                }
              />
              <FormSelect
                name='status'
                label={t('hrm.hrm_position_page.status')}
                value={(formData as Position)?.status || 'active'}
                options={[
                  { value: 'active', label: t('hrm.hrm_position_page.active') },
                  { value: 'inactive', label: t('hrm.hrm_position_page.text_710ad0') },
                ]}
                onChange={(value) => handleInputChange('status', value)}
              />
            </Box>
          </form>
        )}
      </Dialog>

      <Dialog
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        title={t('hrm.hrm_position_page.detail')}
        maxWidth='sm'
        fullWidth
        confirmButton={{ label: t('hrm.hrm_position_page.close') }}
      >
        <DialogContent>
          {selectedPosition && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    岗位名称
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 'medium' }}
                  >
                    {selectedPosition.name}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    岗位编码
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 'medium' }}
                  >
                    {selectedPosition.code || '-'}
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    所属部门
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 'medium' }}
                  >
                    {departments.find((d) => d.id === selectedPosition.department_id)?.name || '-'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    岗位级别
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 'medium' }}
                  >
                    {selectedPosition.level || '-'}
                  </Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    薪资范围
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 'medium' }}
                  >
                    {selectedPosition.min_salary || 0} - {selectedPosition.max_salary || 0}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    状态
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 'medium' }}
                  >
                    {getStatusBadge(selectedPosition.status)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  岗位描述
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.primary' }}
                >
                  {selectedPosition.description || '-'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  任职要求
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ color: 'text.primary' }}
                >
                  {selectedPosition.requirements || '-'}
                </Typography>
              </Box>
              {selectedPosition.created_at && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    创建时间
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary' }}
                  >
                    {selectedPosition.created_at}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PositionManagementPage;