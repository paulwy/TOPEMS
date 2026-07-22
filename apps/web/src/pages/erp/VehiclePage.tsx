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
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type { Vehicle, PaginationParams } from '@/api/erp';
import { vehicleApi } from '@/api/erp';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Edit, Trash2, Eye, Car, Save } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const VehiclePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    plate_number: '',
    brand: '',
    model: '',
    vehicle_type: '',
    status: 'available',
    driver: '',
    fuel_type: '',
  });

  const { addNotification } = useNotificationStore();

  const params: PaginationParams & { vehicle_type?: string } = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;
  if (vehicleTypeFilter !== 'all') params.vehicle_type = vehicleTypeFilter;

  const { data: vehiclesData, isLoading: loading } = useQuery({
    queryKey: [...QUERY_KEYS.ERP.VEHICLES, params],
    queryFn: async () => {
      const response = await vehicleApi.list(params);
      if (response.success && response.data) {
        return {
          vehicles: response.data.items || [],
          total: response.data.total || 0,
        };
      }
      return { vehicles: [], total: 0 };
    },
  });

  const vehicles = vehiclesData?.vehicles || [];
  const total = vehiclesData?.total || 0;

  const invalidateVehicles = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.VEHICLES });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<Vehicle>) => vehicleApi.create(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '新车辆已添加' });
      invalidateVehicles();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '添加车辆失败' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vehicle> }) =>
      vehicleApi.update(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '更新成功', message: '车辆信息已更新' });
      invalidateVehicles();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '更新车辆失败' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vehicleApi.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '车辆已删除' });
      invalidateVehicles();
    },
    onError: (error: unknown) => {
      apiLogger.error('删除失败:', error);
      addNotification({ type: 'error', title: '删除失败', message: '无法删除车辆' });
    },
  });

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      available: '可用',
      in_use: '使用中',
      maintenance: '维护中',
      unavailable: '不可用',
    };
    return statusMap[status] || status;
  };

  const getVehicleTypeText = (vehicleType: string) => {
    const vehicleTypeMap: Record<string, string> = {
      sedan: '轿车',
      suv: 'SUV',
      van: '面包车',
      truck: '卡车',
      bus: '巴士',
    };
    return vehicleTypeMap[vehicleType] || vehicleType;
  };

  const getFuelTypeText = (fuelType: string) => {
    const fuelTypeMap: Record<string, string> = {
      gasoline: '汽油',
      diesel: '柴油',
      electric: '电动',
      hybrid: '混合动力',
    };
    return fuelTypeMap[fuelType] || fuelType;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVehicle) {
      updateMutation.mutate({ id: selectedVehicle.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('确定要删除这个车辆吗?')) return;
    deleteMutation.mutate(id);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormData({
      plate_number: vehicle.plate_number,
      brand: vehicle.brand,
      model: vehicle.model,
      vehicle_type: vehicle.vehicle_type,
      status: vehicle.status,
      driver: vehicle.driver,
      fuel_type: vehicle.fuel_type,
    });
    setShowDialog(true);
  };

  const handleViewDetail = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedVehicle(null);
    setFormData({
      plate_number: '',
      brand: '',
      model: '',
      vehicle_type: '',
      status: 'available',
      driver: '',
      fuel_type: '',
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
      available: { label: '可用', bg: 'success.lighter', color: 'success.700' },
      in_use: { label: '使用中', bg: 'info.lighter', color: 'info.700' },
      maintenance: { label: '维护中', bg: 'warning.light', color: 'warning.700' },
      unavailable: { label: '不可用', bg: 'error.lighter', color: 'error.dark' },
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

  const columns: ColumnDef<Vehicle>[] = useMemo(
    () => [
      { id: 'plate_number', label: '车牌号', sortable: true },
      { id: 'brand', label: '品牌', sortable: true },
      { id: 'model', label: '型号' },
      {
        id: 'vehicle_type',
        label: '车辆类型',
        render: (row) => getVehicleTypeText(row.vehicle_type || ''),
      },
      { id: 'driver', label: '驾驶员' },
      {
        id: 'mileage',
        label: '里程(km)',
        render: (row) => row.mileage?.toLocaleString() || '-',
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'last_service',
        label: '上次保养',
        render: (row) =>
          row.last_service ? new Date(row.last_service).toLocaleDateString('zh-CN') : '-',
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
          { label: '可用', value: 'available' },
          { label: '使用中', value: 'in_use' },
          { label: '维护中', value: 'maintenance' },
          { label: '不可用', value: 'unavailable' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
      {
        id: 'vehicle_type',
        label: '车辆类型',
        type: 'select',
        options: [
          { label: '全部类型', value: 'all' },
          { label: '轿车', value: 'sedan' },
          { label: 'SUV', value: 'suv' },
          { label: '面包车', value: 'van' },
          { label: '卡车', value: 'truck' },
          { label: '巴士', value: 'bus' },
        ],
        value: vehicleTypeFilter,
        onChange: (value: unknown) => {
          setVehicleTypeFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter, vehicleTypeFilter]
  );

  const rowActions: RowAction<Vehicle>[] = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
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
        confirmMessage: '确定要删除这个车辆吗?',
      },
    ],
    []
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
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Car
            size={18}
            sx={{ color: 'secondary.700' }}
          />
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: 14 }}
          >
            车辆总数
          </Box>
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'secondary.700' }}>{vehicles.length}</Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>可用</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>
          {vehicles.filter((v) => v.status === 'available').length}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>使用中</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'info.700' }}>
          {vehicles.filter((v) => v.status === 'in_use').length}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>维护中</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>
          {vehicles.filter((v) => v.status === 'maintenance').length}
        </Box>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Car style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={vehicles}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索车牌号或品牌...'
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
            label: '新增车辆',
            icon: <Car size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无车辆数据'
        getRowId={(row) => row.id}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedVehicle ? '编辑车辆' : '新增车辆'}</DialogTitle>
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
            {selectedVehicle ? '修改车辆信息' : '填写新车辆信息'}
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
                <InputLabel htmlFor='plate_number'>车牌号 *</InputLabel>
                <TextField
                  id='plate_number'
                  required
                  size='small'
                  value={formData.plate_number}
                  onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='brand'>品牌</InputLabel>
                <TextField
                  id='brand'
                  size='small'
                  value={formData.brand || ''}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
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
                <InputLabel htmlFor='vehicle_type'>车辆类型</InputLabel>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <Select
                    id='vehicle_type'
                    value={formData.vehicle_type || ''}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  >
                    <MenuItem value='sedan'>轿车</MenuItem>
                    <MenuItem value='suv'>SUV</MenuItem>
                    <MenuItem value='van'>面包车</MenuItem>
                    <MenuItem value='truck'>卡车</MenuItem>
                    <MenuItem value='bus'>巴士</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='driver'>驾驶员</InputLabel>
                <TextField
                  id='driver'
                  size='small'
                  value={formData.driver || ''}
                  onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='fuel_type'>燃料类型</InputLabel>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <Select
                    id='fuel_type'
                    value={formData.fuel_type || ''}
                    onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                  >
                    <MenuItem value='gasoline'>汽油</MenuItem>
                    <MenuItem value='diesel'>柴油</MenuItem>
                    <MenuItem value='electric'>电动</MenuItem>
                    <MenuItem value='hybrid'>混合动力</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='status'>状态</InputLabel>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <Select
                    id='status'
                    value={formData.status || 'available'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value='available'>可用</MenuItem>
                    <MenuItem value='in_use'>使用中</MenuItem>
                    <MenuItem value='maintenance'>维护中</MenuItem>
                    <MenuItem value='unavailable'>不可用</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <DialogActions sx={{ mt: 2 }}>
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
                startIcon={<Save size={16} />}
              >
                保存
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
        <DialogTitle>车辆详情</DialogTitle>
        <DialogContent>
          {selectedVehicle && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>车牌号</InputLabel>
                  <Box sx={{ fontWeight: 500 }}>{selectedVehicle.plate_number}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>品牌</InputLabel>
                  <Box component='span'>{selectedVehicle.brand || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>型号</InputLabel>
                  <Box component='span'>{selectedVehicle.model || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>车辆类型</InputLabel>
                  <Box component='span'>
                    {getVehicleTypeText(selectedVehicle.vehicle_type || '')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>驾驶员</InputLabel>
                  <Box component='span'>{selectedVehicle.driver || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedVehicle.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>里程(km)</InputLabel>
                  <Box component='span'>{selectedVehicle.mileage?.toLocaleString() || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>燃料类型</InputLabel>
                  <Box component='span'>
                    {selectedVehicle.fuel_type ? getFuelTypeText(selectedVehicle.fuel_type) : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>上次保养</InputLabel>
                  <Box component='span'>
                    {selectedVehicle.last_service
                      ? new Date(selectedVehicle.last_service).toLocaleDateString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedVehicle.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>更新时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedVehicle.updated_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default VehiclePage;
