import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  Tooltip,
  Stack,
  Typography,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { designTokens } from '@/theme/tokens';
import type {
  Equipment,
  CreateEquipmentRequest,
  UpdateEquipmentRequest,
  EquipmentStatistics,
  MaintenanceEquipmentRequest,
  ListParams,
} from '@/api/mes';
import { mesApi } from '@/api/mes';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Wrench,
  BarChart3,
  Monitor,
  Power,
  AlertTriangle,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';

const ct = designTokens.colors;

const EquipmentManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateEquipmentRequest>({
    code: '',
    name: '',
    type: '',
    model: '',
    manufacturer: '',
    location: '',
    status: 'idle',
  });
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceEquipmentRequest>({
    maintenance_type: 'routine',
    description: '',
    maintainer: '',
    start_time: '',
  });

  const { addNotification } = useNotificationStore();

  const equipmentQuery = useQuery({
    queryKey: ['mes-equipment', currentPage, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      const params: ListParams = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await mesApi.equipment.list(params);
      if (!response.success || !response.data) {
        throw new Error(response.message || '加载设备列表失败');
      }
      return {
        items: response.data.equipments || [],
        total: response.data.total || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const statisticsQuery = useQuery({
    queryKey: ['mes-equipment-statistics'],
    queryFn: async () => {
      const response = await mesApi.equipment.getStatistics();
      if (!response.success || !response.data) {
        throw new Error(response.message || '加载设备统计失败');
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const equipment = equipmentQuery.data?.items ?? [];
  const total = equipmentQuery.data?.total ?? 0;
  const loading = equipmentQuery.isLoading || statisticsQuery.isLoading;
  const statistics = statisticsQuery.data ?? null;

  const createMutation = useMutation({
    mutationFn: async (data: CreateEquipmentRequest) => {
      const response = await mesApi.equipment.create(data);
      if (!response.success) {
        throw new Error(response.message || '创建设备失败');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-equipment'] });
      queryClient.invalidateQueries({ queryKey: ['mes-equipment-statistics'] });
      addNotification({
        type: 'success',
        title: '创建成功',
        message: '新设备已创建',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error('创建设备失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '创建设备失败',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEquipmentRequest }) => {
      const response = await mesApi.equipment.update(id, data);
      if (!response.success) {
        throw new Error(response.message || '更新设备失败');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-equipment'] });
      queryClient.invalidateQueries({ queryKey: ['mes-equipment-statistics'] });
      addNotification({
        type: 'success',
        title: '更新成功',
        message: '设备信息已更新',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error('更新设备失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '更新设备失败',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await mesApi.equipment.delete(id);
      if (!response.success) {
        throw new Error(response.message || '删除设备失败');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-equipment'] });
      queryClient.invalidateQueries({ queryKey: ['mes-equipment-statistics'] });
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '设备已删除',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error('删除设备失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '删除设备失败',
      });
    },
  });

  const maintenanceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MaintenanceEquipmentRequest }) => {
      const response = await mesApi.equipment.maintenance(id, data);
      if (!response.success) {
        throw new Error(response.message || '创建设备维护记录失败');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mes-equipment'] });
      queryClient.invalidateQueries({ queryKey: ['mes-equipment-statistics'] });
      addNotification({
        type: 'success',
        title: '维护成功',
        message: '设备维护记录已创建',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error('创建设备维护失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '创建设备维护记录失败',
      });
    },
  });

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      running: '运行中',
      idle: '空闲',
      maintenance: '维护中',
      fault: '故障',
    };
    return statusMap[status] || status;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedEquipment) {
        await updateMutation.mutateAsync({
          id: selectedEquipment.id,
          data: formData as UpdateEquipmentRequest,
        });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setShowDialog(false);
      resetForm();
    } catch {
    }
  };

  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment) return;
    try {
      await maintenanceMutation.mutateAsync({
        id: selectedEquipment.id,
        data: maintenanceData,
      });
      setShowMaintenanceDialog(false);
      resetMaintenanceForm();
    } catch {
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这个设备吗?')) return;
      try {
        await deleteMutation.mutateAsync(id);
      } catch {
      }
    },
    [deleteMutation]
  );

  const handleEdit = useCallback((eq: Equipment) => {
    setSelectedEquipment(eq);
    setFormData({
      code: eq.code,
      name: eq.name,
      type: eq.type,
      model: eq.model,
      manufacturer: eq.manufacturer,
      purchase_date: eq.purchase_date,
      location: eq.location,
      status: eq.status,
      value: eq.value,
      description: eq.description,
    });
    setShowDialog(true);
  }, []);

  const handleViewDetail = useCallback((eq: Equipment) => {
    setSelectedEquipment(eq);
    setShowDetailDialog(true);
  }, []);

  const handleMaintenance = useCallback((eq: Equipment) => {
    setSelectedEquipment(eq);
    setMaintenanceData({
      maintenance_type: 'routine',
      description: '',
      maintainer: '',
      start_time: new Date().toISOString().slice(0, 16),
    });
    setShowMaintenanceDialog(true);
  }, []);

  const resetForm = () => {
    setSelectedEquipment(null);
    setFormData({
      code: '',
      name: '',
      type: '',
      model: '',
      manufacturer: '',
      location: '',
      status: 'idle',
    });
  };

  const resetMaintenanceForm = () => {
    setMaintenanceData({
      maintenance_type: 'routine',
      description: '',
      maintainer: '',
      start_time: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        bg: string;
        color: string;
      }
    > = {
      running: { label: '运行中', bg: 'success.lighter', color: 'success.700' },
      idle: { label: '空闲', bg: 'grey.100', color: 'text.secondary' },
      maintenance: { label: '维护中', bg: 'warning.light', color: 'warning.700' },
      fault: { label: '故障', bg: 'error.lighter', color: 'error.dark' },
    };
    const s = statusMap[status] || { label: status, bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        size='small'
        label={s.label}
        sx={{ backgroundColor: s.bg, color: s.color, fontWeight: 500 }}
      />
    );
  };

  const isMutationPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    maintenanceMutation.isPending;

  const columns: ColumnDef<Equipment>[] = useMemo(
    () => [
      { id: 'code', label: '设备编号', sortable: true },
      { id: 'name', label: '设备名称', sortable: true },
      { id: 'type', label: '设备类型', sortable: true },
      { id: 'model', label: '型号', sortable: true },
      { id: 'location', label: '位置', sortable: true },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '运行中', value: 'running' },
          { label: '空闲', value: 'idle' },
          { label: '维护中', value: 'maintenance' },
          { label: '故障', value: 'fault' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const rowActions: RowAction<Equipment>[] = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: '设备维护',
        icon: <Wrench size={16} />,
        onClick: handleMaintenance,
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个设备吗?',
      },
    ],
    [handleViewDetail, handleMaintenance, handleEdit, handleDelete]
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  if (loading) return <LoadingSpinner />;

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Power
            size={18}
            sx={{ color: 'success.700' }}
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            运行中
          </Typography>
        </Box>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'success.700' }}
        >
          {statistics?.in_use || equipment.filter((e) => e.status === 'running').length}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Monitor
            size={18}
            sx={{ color: 'text.secondary' }}
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            空闲
          </Typography>
        </Box>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {statistics?.idle || equipment.filter((e) => e.status === 'idle').length}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Wrench
            size={18}
            sx={{ color: 'warning.700' }}
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            维护中
          </Typography>
        </Box>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'warning.700' }}
        >
          {statistics?.maintenance || equipment.filter((e) => e.status === 'maintenance').length}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <AlertTriangle
            size={18}
            sx={{ color: 'error.dark' }}
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            故障
          </Typography>
        </Box>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'error.dark' }}
        >
          {equipment.filter((e) => e.status === 'fault').length}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='设备管理'
      subtitle='管理设备信息,包括设备编号、名称、型号、状态等'
      headerProps={{
        pageIcon: <Wrench style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={equipment}
        loading={loading || isMutationPending}
        filters={filters}
        searchable
        searchPlaceholder='搜索设备编号或名称...'
        searchValue={searchTerm}
        onSearch={handleSearch}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
        actions={[
          {
            label: '新增设备',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无设备数据'
        getRowId={(row) => row.id}
        mobileCardTitleKey='name'
        mobileCardSubtitleKey='code'
        mobileCardDisplayFields={['status', 'location', 'department', 'next_maintenance_date']}
        mobileCardFieldLabels={{
          status: '状态',
          location: '位置',
          department: '部门',
          next_maintenance_date: '下次维护',
        }}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['mes-equipment'] });
          queryClient.invalidateQueries({ queryKey: ['mes-equipment-statistics'] });
        }}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedEquipment ? '编辑设备' : '新增设备'}</DialogTitle>
        <DialogContent>
          <Box
            component='span'
            sx={{
              display: 'block',
              color: 'text.secondary',
              mb: 2,
              fontSize: 14,
            }}
          >
            {selectedEquipment ? '修改设备信息' : '填写新设备信息'}
          </Box>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='code'>设备编号 *</InputLabel>
                <TextField
                  id='code'
                  required
                  size='small'
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='name'>设备名称 *</InputLabel>
                <TextField
                  id='name'
                  required
                  size='small'
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='type'>设备类型</InputLabel>
                <TextField
                  id='type'
                  size='small'
                  value={formData.type || ''}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='model'>型号</InputLabel>
                <TextField
                  id='model'
                  size='small'
                  value={formData.model || ''}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='manufacturer'>制造商</InputLabel>
                <TextField
                  id='manufacturer'
                  size='small'
                  value={formData.manufacturer || ''}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='purchase_date'>购置日期</InputLabel>
                <TextField
                  id='purchase_date'
                  type='date'
                  size='small'
                  value={formData.purchase_date || ''}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='location'>位置</InputLabel>
                <TextField
                  id='location'
                  size='small'
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='value'>设备价值</InputLabel>
                <TextField
                  id='value'
                  type='number'
                  size='small'
                  value={formData.value || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      value: parseFloat(e.target.value),
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='status'>状态</InputLabel>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <Select
                    id='status'
                    value={formData.status || 'idle'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value='idle'>空闲</MenuItem>
                    <MenuItem value='running'>运行中</MenuItem>
                    <MenuItem value='maintenance'>维护中</MenuItem>
                    <MenuItem value='fault'>故障</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='description'>描述</InputLabel>
                <TextField
                  id='description'
                  size='small'
                  multiline
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </Box>
            </Box>
            <DialogActions>
              <Button
                type='button'
                variant='outlined'
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button
                type='submit'
                variant='contained'
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* 设备维护对话框 */}
      <Dialog
        open={showMaintenanceDialog}
        onClose={() => setShowMaintenanceDialog(false)}
        maxWidth='sm'
      >
        <DialogTitle>设备维护</DialogTitle>
        <DialogContent>
          <Box
            component='span'
            sx={{
              display: 'block',
              color: 'text.secondary',
              mb: 2,
              fontSize: 14,
            }}
          >
            {selectedEquipment?.name} - 创建设备维护记录
          </Box>
          <form onSubmit={handleMaintenanceSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='maintenance_type'>维护类型 *</InputLabel>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <Select
                    id='maintenance_type'
                    value={maintenanceData.maintenance_type}
                    onChange={(e) =>
                      setMaintenanceData({
                        ...maintenanceData,
                        maintenance_type: e.target.value,
                      })
                    }
                  >
                    <MenuItem value='routine'>例行维护</MenuItem>
                    <MenuItem value='repair'>故障维修</MenuItem>
                    <MenuItem value='preventive'>预防性维护</MenuItem>
                    <MenuItem value='inspection'>检查保养</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='maintainer'>维护人员 *</InputLabel>
                <TextField
                  id='maintainer'
                  required
                  size='small'
                  value={maintenanceData.maintainer}
                  onChange={(e) =>
                    setMaintenanceData({ ...maintenanceData, maintainer: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='start_time'>开始时间 *</InputLabel>
                <TextField
                  id='start_time'
                  type='datetime-local'
                  required
                  size='small'
                  value={maintenanceData.start_time}
                  onChange={(e) =>
                    setMaintenanceData({ ...maintenanceData, start_time: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='end_time'>结束时间</InputLabel>
                <TextField
                  id='end_time'
                  type='datetime-local'
                  size='small'
                  value={maintenanceData.end_time || ''}
                  onChange={(e) =>
                    setMaintenanceData({ ...maintenanceData, end_time: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='cost'>费用</InputLabel>
                <TextField
                  id='cost'
                  type='number'
                  size='small'
                  value={maintenanceData.cost || ''}
                  onChange={(e) =>
                    setMaintenanceData({
                      ...maintenanceData,
                      cost: parseFloat(e.target.value),
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='description'>维护描述 *</InputLabel>
                <TextField
                  id='description'
                  required
                  size='small'
                  multiline
                  rows={3}
                  value={maintenanceData.description}
                  onChange={(e) =>
                    setMaintenanceData({ ...maintenanceData, description: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='result'>维护结果</InputLabel>
                <TextField
                  id='result'
                  size='small'
                  value={maintenanceData.result || ''}
                  onChange={(e) =>
                    setMaintenanceData({ ...maintenanceData, result: e.target.value })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='remarks'>备注</InputLabel>
                <TextField
                  id='remarks'
                  size='small'
                  multiline
                  rows={2}
                  value={maintenanceData.remarks || ''}
                  onChange={(e) =>
                    setMaintenanceData({ ...maintenanceData, remarks: e.target.value })
                  }
                />
              </Box>
            </Box>
            <DialogActions>
              <Button
                type='button'
                variant='outlined'
                onClick={() => setShowMaintenanceDialog(false)}
              >
                取消
              </Button>
              <Button
                type='submit'
                variant='contained'
                disabled={maintenanceMutation.isPending}
              >
                创建维护
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>设备详情</DialogTitle>
        <DialogContent>
          {selectedEquipment && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>设备编号</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedEquipment.code}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>设备名称</InputLabel>
                  <Box component='span'>{selectedEquipment.name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>设备类型</InputLabel>
                  <Box component='span'>{selectedEquipment.type || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>型号</InputLabel>
                  <Box component='span'>{selectedEquipment.model || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>制造商</InputLabel>
                  <Box component='span'>{selectedEquipment.manufacturer || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>位置</InputLabel>
                  <Box component='span'>{selectedEquipment.location || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedEquipment.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>设备价值</InputLabel>
                  <Box component='span'>
                    {selectedEquipment.value ? `¥${selectedEquipment.value.toLocaleString()}` : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>购置日期</InputLabel>
                  <Box component='span'>
                    {selectedEquipment.purchase_date
                      ? new Date(selectedEquipment.purchase_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>描述</InputLabel>
                  <Box component='span'>{selectedEquipment.description || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedEquipment.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>更新时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedEquipment.updated_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default EquipmentManagementPage;
