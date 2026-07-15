import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
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

interface PositionManagementPageProps {}

const PositionManagementPage: React.FC<PositionManagementPageProps> = () => {
  const theme = useTheme();
  const addNotification = useNotificationStore((state) => state.addNotification);
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
    queryKey: [...QUERY_KEYS.HRM.POSITION, { searchText, statusFilter, departmentFilter }],
    queryFn: async () => {
      const params: ListParams = {};
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await positionApi.list(params);
      if (response.code === 200 && response.data) {
        const data = response.data as any;
        return {
          items: data.items || [],
          total: data.total || 0,
          page: data.page || 1,
          pagesize: data.pagesize || 10,
        };
      }
      return { items: [], total: 0, page: 1, pagesize: 10 };
    },
  });

  const departmentsQuery = useQuery<{ id: string; name: string }[]>({
    queryKey: QUERY_KEYS.HRM.DEPARTMENTS,
    queryFn: async () => {
      const response = await departmentApi.list();
      if (response.code === 200 && response.data) {
        const items = response.data.items || [];
        return items.map((d: Department) => ({ id: d.id, name: d.name }));
      }
      return [];
    },
  });

  const loading = positionsQuery.isLoading;
  const data: PaginatedResult<Position> = positionsQuery.data || {
    items: [],
    total: 0,
    page: 1,
    pagesize: 10,
  };
  const departments = departmentsQuery.data || [];

  const fetchPositions = () => {
    positionsQuery.refetch();
  };

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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => positionApi.delete(id),
    onSuccess: (response) => {
      if (response.code === 200) {
        addNotification({
          title: '成功',
          message: '岗位删除成功',
          type: 'success',
        });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.POSITION });
      } else {
        addNotification({
          title: '失败',
          message: '删除岗位失败',
          type: 'error',
        });
      }
    },
    onError: (error: unknown) => {
      addNotification({
        title: '失败',
        message: (error as { message?: string }).message || '删除岗位失败',
        type: 'error',
      });
    },
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Position>) => positionApi.create(data),
    onSuccess: (response) => {
      if (response.code === 200) {
        addNotification({
          title: '成功',
          message: '岗位创建成功',
          type: 'success',
        });
        setShowCreateModal(false);
        setFormData({});
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.POSITION });
      } else {
        addNotification({
          title: '失败',
          message: '创建岗位失败',
          type: 'error',
        });
      }
    },
    onError: (error: unknown) => {
      addNotification({
        title: '失败',
        message: (error as { message?: string }).message || '创建岗位失败',
        type: 'error',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (args: { id: string; data: Partial<Position> }) =>
      positionApi.update(args.id, args.data),
    onSuccess: (response) => {
      if (response.code === 200) {
        addNotification({
          title: '成功',
          message: '岗位更新成功',
          type: 'success',
        });
        setShowEditModal(false);
        setSelectedPosition(null);
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.POSITION });
      } else {
        addNotification({
          title: '失败',
          message: '更新岗位失败',
          type: 'error',
        });
      }
    },
    onError: (error: unknown) => {
      addNotification({
        title: '失败',
        message: (error as { message?: string }).message || '更新岗位失败',
        type: 'error',
      });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPosition) return;
    updateMutation.mutate({ id: selectedPosition.id, data: formData });
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
      active: '启用',
      inactive: '禁用',
    };
    return (
      <StatusBadge
        status={status}
        label={labels[status] || status}
        color={colors[status] || 'default'}
      />
    );
  };

  // 计算统计数据
  const stats = useMemo(() => {
    const totalPositions = data.total;
    const activePositions = data.items.filter((item) => item.status === 'active').length;
    const inactivePositions = data.items.filter((item) => item.status === 'inactive').length;
    const totalEmployees = data.items.reduce((sum, item) => sum + (item.employee_count || 0), 0);

    return [
      {
        title: '总岗位数',
        value: totalPositions,
        icon: <Briefcase style={{ width: 24, height: 24 }} />,
        color: 'primary' as const,
      },
      {
        title: '启用岗位',
        value: activePositions,
        icon: <CheckCircle style={{ width: 24, height: 24 }} />,
        color: 'success' as const,
      },
      {
        title: '禁用岗位',
        value: inactivePositions,
        icon: <XCircle style={{ width: 24, height: 24 }} />,
        color: 'warning' as const,
      },
      {
        title: '总人数',
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
        label: '岗位名称',
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
        label: '所属部门',
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
        label: '岗位级别',
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
        label: '薪资范围',
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
        label: '状态',
        render: (row: Position) => getStatusBadge(row.status),
      },
    ],
    [departments]
  );

  const rowActions: RowAction<Position>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: handleView,
    },
    {
      label: '编辑',
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: handleEdit,
    },
    {
      label: '删除',
      icon: <Trash2 style={{ width: 16, height: 16 }} />,
      color: 'error',
      onClick: (row: Position) => handleDelete(row.id),
      confirm: true,
      confirmMessage: '确定要删除这个岗位吗？',
    },
  ];

  // 导出字段配置
  const exportFields = useMemo(
    () => [
      { key: 'name', title: '岗位名称' },
      { key: 'code', title: '岗位编码' },
      { key: 'level', title: '岗位级别' },
      { key: 'min_salary', title: '最低薪资' },
      { key: 'max_salary', title: '最高薪资' },
      { key: 'status', title: '状态' },
      { key: 'employee_count', title: '员工数量' },
    ],
    []
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* 列表页模板 */}
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 3 }}>
        <ListPageTemplate
          title='岗位管理'
          subtitle='管理企业岗位信息、薪资范围'
          breadcrumbs={[{ label: '人力资源', href: '/hrm' }, { label: '岗位管理' }]}
          columns={columns}
          data={data.items}
          loading={loading}
          rowActions={rowActions}
          pagination={{
            page: data.page - 1,
            pageSize: data.pagesize,
            total: data.total,
            onPageChange: (page: number) => fetchPositions(),
          }}
          searchable
          searchPlaceholder='搜索岗位名称或编码'
          searchValue={searchText}
          onSearch={(value: string) => setSearchText(value)}
          filters={[
            {
              id: 'department',
              label: '部门',
              type: 'select',
              options: [
                { label: '全部部门', value: 'all' },
                ...departments.map((d) => ({ label: d.name, value: d.id })),
              ],
              value: departmentFilter,
              onChange: (value: unknown) => setDepartmentFilter(value as string),
            },
            {
              id: 'status',
              label: '状态',
              type: 'select',
              options: [
                { label: '全部状态', value: 'all' },
                { label: '启用', value: 'active' },
                { label: '禁用', value: 'inactive' },
              ],
              value: statusFilter,
              onChange: (value: unknown) => setStatusFilter(value as string),
            },
          ]}
          actions={[
            {
              label: '导出',
              icon: <Briefcase style={{ width: 18, height: 18 }} />,
              onClick: () => {
                // 导出功能通过 DataExport 组件实现
              },
              variant: 'outlined',
            },
            {
              label: '新增岗位',
              icon: <Plus style={{ width: 18, height: 18 }} />,
              onClick: handleAdd,
              variant: 'contained',
            },
          ]}
          onRefresh={() => fetchPositions()}
          emptyMessage='暂无岗位数据'
          emptyIcon={
            <Briefcase style={{ width: 48, height: 48, color: theme.palette.text.disabled }} />
          }
          headerContent={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ModeToggle />
              <DataExport
                data={data.items as unknown as Record<string, unknown>[]}
                fields={exportFields}
                defaultFileName='岗位数据'
                buttonText='导出'
              />
            </Box>
          }
          exportable
          exportFileName='岗位列表'
          persistFilters
          persistSearch
          emptyActionButton={{
            label: '新增岗位',
            icon: <Plus size={16} />,
            onClick: handleAdd,
          }}
        />
      </Box>

      {/* 创建对话框 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title='新增岗位'
        maxWidth='sm'
        fullWidth
        cancelButton={{ label: '取消' }}
        confirmButton={{
          label: '创建',
          onClick: () => handleCreate({ preventDefault: () => {} } as React.FormEvent),
        }}
      >
        <DialogContent>
          <form onSubmit={handleCreate}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormField
                name='create-name'
                label='岗位名称 *'
                type='text'
                required
                fullWidth
                value={(formData as Position)?.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('name', e.target.value)
                }
                placeholder='请输入岗位名称'
              />
              <FormField
                name='create-code'
                label='岗位编码'
                type='text'
                fullWidth
                value={(formData as Position)?.code || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('code', e.target.value)
                }
                placeholder='请输入岗位编码'
              />
              <FormSelect
                name='department_id'
                label='所属部门'
                value={(formData as Position)?.department_id || ''}
                options={[
                  { value: 'none', label: '无' },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
                onChange={(value) => handleInputChange('department_id', value)}
              />
              <FormField
                name='create-level'
                label='岗位级别'
                type='text'
                fullWidth
                value={(formData as Position)?.level || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('level', e.target.value)
                }
                placeholder='请输入岗位级别'
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
                  label='最低薪资'
                  type='number'
                  fullWidth
                  value={(formData as Position)?.min_salary || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('min_salary', parseFloat(e.target.value) || 0)
                  }
                  placeholder='最低薪资'
                />
                <FormField
                  name='create-max-salary'
                  label='最高薪资'
                  type='number'
                  fullWidth
                  value={(formData as Position)?.max_salary || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('max_salary', parseFloat(e.target.value) || 0)
                  }
                  placeholder='最高薪资'
                />
              </Box>
              <FormField
                name='create-description'
                label='岗位描述'
                multiline
                rows={3}
                fullWidth
                value={(formData as Position)?.description || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('description', e.target.value)
                }
                placeholder='请输入岗位描述'
              />
              <FormField
                name='create-requirements'
                label='任职要求'
                multiline
                rows={3}
                fullWidth
                value={(formData as Position)?.requirements || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('requirements', e.target.value)
                }
                placeholder='请输入任职要求'
              />
              <FormSelect
                name='status'
                label='状态'
                value={(formData as Position)?.status || 'active'}
                options={[
                  { value: 'active', label: '启用' },
                  { value: 'inactive', label: '禁用' },
                ]}
                onChange={(value) => handleInputChange('status', value)}
              />
            </Box>
            <DialogActions sx={{ mt: 3 }}>
              <Button onClick={() => setShowCreateModal(false)}>取消</Button>
              <Button
                type='submit'
                variant='contained'
              >
                创建
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title='编辑岗位'
        maxWidth='sm'
        fullWidth
        cancelButton={{
          label: '取消',
          onClick: () => {
            setShowEditModal(false);
            setSelectedPosition(null);
          },
        }}
        confirmButton={{
          label: '保存',
          onClick: () => handleUpdate({ preventDefault: () => {} } as React.FormEvent),
        }}
      >
        {selectedPosition && (
          <form onSubmit={handleUpdate}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormField
                name='edit-name'
                label='岗位名称 *'
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
                label='岗位编码'
                type='text'
                fullWidth
                value={(formData as Position)?.code || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('code', e.target.value)
                }
              />
              <FormSelect
                name='department_id'
                label='所属部门'
                value={(formData as Position)?.department_id || ''}
                options={[
                  { value: 'none', label: '无' },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
                onChange={(value) => handleInputChange('department_id', value)}
              />
              <FormField
                name='edit-level'
                label='岗位级别'
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
                  label='最低薪资'
                  type='number'
                  fullWidth
                  value={(formData as Position)?.min_salary || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('min_salary', parseFloat(e.target.value) || 0)
                  }
                />
                <FormField
                  name='edit-max-salary'
                  label='最高薪资'
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
                label='岗位描述'
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
                label='任职要求'
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
                label='状态'
                value={(formData as Position)?.status || 'active'}
                options={[
                  { value: 'active', label: '启用' },
                  { value: 'inactive', label: '禁用' },
                ]}
                onChange={(value) => handleInputChange('status', value)}
              />
            </Box>
          </form>
        )}
      </Dialog>

      {/* 查看对话框 */}
      <Dialog
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        title='岗位详情'
        maxWidth='sm'
        fullWidth
        confirmButton={{ label: '关闭' }}
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
