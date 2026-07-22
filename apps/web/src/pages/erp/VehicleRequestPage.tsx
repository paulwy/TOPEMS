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
  Tabs,
  Tab,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type { VehicleRequest, Vehicle, PaginationParams } from '@/api/erp';
import { vehicleRequestApi, vehicleApi } from '@/api/erp';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Edit, Trash2, Eye, Save, Car, ClipboardCheck } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const VehicleRequestPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VehicleRequest | Vehicle | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<{
    [key: string]: unknown;
    vehicle_id: string;
    vehicle_plate: string;
    requester: string;
    purpose: string;
    start_time: string;
    end_time: string;
    driver_required: boolean;
    status: string;
    plate_number: string;
    brand: string;
    model: string;
    vehicle_type: string;
    driver: string;
    last_service: string;
    mileage: number;
    fuel_type: string;
  }>({
    vehicle_id: '',
    vehicle_plate: '',
    requester: '',
    purpose: '',
    start_time: '',
    end_time: '',
    driver_required: false,
    status: 'pending',
    plate_number: '',
    brand: '',
    model: '',
    vehicle_type: '',
    driver: '',
    last_service: '',
    mileage: 0,
    fuel_type: 'gasoline',
  });

  const params: PaginationParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: [...QUERY_KEYS.ERP.VEHICLE_REQUESTS, params],
    queryFn: async () => {
      const response = await vehicleRequestApi.list(params);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 0,
  });

  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery({
    queryKey: [...QUERY_KEYS.ERP.VEHICLES, params],
    queryFn: async () => {
      const response = await vehicleApi.list(params);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 1,
  });

  const requests = requestsData?.items || [];
  const vehicles = vehiclesData?.items || [];
  const data = activeTab === 0 ? requests : vehicles;
  const total = activeTab === 0 ? (requestsData?.total || 0) : (vehiclesData?.total || 0);
  const loading = activeTab === 0 ? requestsLoading : vehiclesLoading;

  const invalidateData = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.VEHICLE_REQUESTS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.VEHICLES });
  };

  const createMutation = useMutation({
    mutationFn: (data: unknown) =>
      activeTab === 0 ? vehicleRequestApi.create(data as Partial<VehicleRequest>) as Promise<unknown> : vehicleApi.create(data as Partial<Vehicle>) as Promise<unknown>,
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '记录已添加' });
      invalidateData();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '添加记录失败' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) =>
      activeTab === 0 ? vehicleRequestApi.update(id, data as Partial<VehicleRequest>) as Promise<unknown> : vehicleApi.update(id, data as Partial<Vehicle>) as Promise<unknown>,
    onSuccess: () => {
      addNotification({ type: 'success', title: '更新成功', message: '记录信息已更新' });
      invalidateData();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '更新记录失败' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      activeTab === 0 ? vehicleRequestApi.delete(id) : vehicleApi.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '记录已删除' });
      invalidateData();
    },
    onError: (error: unknown) => {
      apiLogger.error('删除失败:', error);
      addNotification({ type: 'error', title: '删除失败', message: '无法删除记录' });
    },
  });

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待审批',
      approved: '已批准',
      rejected: '已拒绝',
      completed: '已完成',
      available: '可用',
      in_use: '使用中',
      maintenance: '维护中',
      unavailable: '不可用',
    };
    return statusMap[status] || status;
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
      pending: { label: '待审批', bg: 'warning.light', color: 'warning.700' },
      approved: { label: '已批准', bg: 'success.lighter', color: 'success.700' },
      rejected: { label: '已拒绝', bg: 'error.lighter', color: 'error.dark' },
      completed: { label: '已完成', bg: 'secondary[100]', color: 'secondary.700' },
      available: { label: '可用', bg: 'success.lighter', color: 'success.700' },
      in_use: { label: '使用中', bg: 'warning.light', color: 'warning.700' },
      maintenance: { label: '维护中', bg: 'info.light', color: 'info.700' },
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('确定要删除这条记录吗?')) return;
    deleteMutation.mutate(id);
  };

  const handleEdit = (item: VehicleRequest | Vehicle) => {
    setSelectedItem(item);
    if (activeTab === 0) {
      const req = item as VehicleRequest;
      setFormData({
        vehicle_id: req.vehicle_id,
        vehicle_plate: req.vehicle_plate,
        requester: req.requester,
        purpose: req.purpose,
        start_time: req.start_time,
        end_time: req.end_time,
        driver_required: req.driver_required,
        status: req.status,
        plate_number: '',
        brand: '',
        model: '',
        vehicle_type: '',
        driver: '',
        last_service: '',
        mileage: 0,
        fuel_type: 'gasoline',
      });
    } else {
      const v = item as Vehicle;
      setFormData({
        vehicle_id: '',
        vehicle_plate: '',
        requester: '',
        purpose: '',
        start_time: '',
        end_time: '',
        driver_required: false,
        status: v.status,
        plate_number: v.plate_number,
        brand: v.brand || '',
        model: v.model || '',
        vehicle_type: v.vehicle_type || '',
        driver: v.driver || '',
        last_service: v.last_service || '',
        mileage: v.mileage || 0,
        fuel_type: v.fuel_type || 'gasoline',
      });
    }
    setShowDialog(true);
  };

  const handleViewDetail = (item: VehicleRequest | Vehicle) => {
    setSelectedItem(item);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedItem(null);
    setFormData({
      vehicle_id: '',
      vehicle_plate: '',
      requester: '',
      purpose: '',
      start_time: '',
      end_time: '',
      driver_required: false,
      status: 'pending',
      plate_number: '',
      brand: '',
      model: '',
      vehicle_type: '',
      driver: '',
      last_service: '',
      mileage: 0,
      fuel_type: 'gasoline',
    });
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const columns: ColumnDef<VehicleRequest | Vehicle>[] = useMemo(
    () => [
      {
        id: 'name',
        label: activeTab === 0 ? '车牌号' : '车牌号',
        render: (row) => (activeTab === 0 ? (row as VehicleRequest).vehicle_plate : (row as Vehicle).plate_number),
        sortable: true,
      },
      {
        id: 'requester',
        label: activeTab === 0 ? '申请人' : '司机',
        render: (row) =>
          activeTab === 0 ? (row as VehicleRequest).requester : (row as Vehicle).driver || '-',
      },
      {
        id: 'purpose',
        label: activeTab === 0 ? '用途' : '车型',
        render: (row) =>
          activeTab === 0 ? (row as VehicleRequest).purpose : (row as Vehicle).model || '-',
      },
      {
        id: 'time',
        label: activeTab === 0 ? '时间' : '里程',
        render: (row) =>
          activeTab === 0
            ? `${(row as VehicleRequest).start_time?.slice(11, 16) || '-'} - ${(row as VehicleRequest).end_time?.slice(11, 16) || '-'}`
            : `${(row as Vehicle).mileage || 0} km`,
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'created_at',
        label: '创建时间',
        render: (row) => new Date(row.created_at).toLocaleDateString('zh-CN'),
      },
    ],
    [activeTab]
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options:
          activeTab === 0
            ? [
                { label: '全部状态', value: 'all' },
                { label: '待审批', value: 'pending' },
                { label: '已批准', value: 'approved' },
                { label: '已拒绝', value: 'rejected' },
                { label: '已完成', value: 'completed' },
              ]
            : [
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
    ],
    [statusFilter, activeTab]
  );

  const rowActions: RowAction<VehicleRequest | Vehicle>[] = useMemo(
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
        confirmMessage: '确定要删除这条记录吗?',
      },
    ],
    []
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const pendingRequests = requests.filter((r) => r.status === 'pending').length;
  const availableVehicles = vehicles.filter((v) => v.status === 'available').length;

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
          {activeTab === 0 ? (
            <ClipboardCheck size={18} sx={{ color: 'secondary.700' }} />
          ) : (
            <Car size={18} sx={{ color: 'secondary.700' }} />
          )}
          <Box component='span' sx={{ color: 'text.secondary', fontSize: 14 }}>
            {activeTab === 0 ? '申请总数' : '车辆总数'}
          </Box>
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'secondary.700' }}>{data.length}</Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>
          {activeTab === 0 ? '已批准' : '可用车辆'}
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>
          {activeTab === 0
            ? requests.filter((r) => r.status === 'approved').length
            : availableVehicles}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>
          {activeTab === 0 ? '待审批' : '使用中'}
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>
          {activeTab === 0
            ? pendingRequests
            : vehicles.filter((v) => v.status === 'in_use').length}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>
          {activeTab === 0 ? '已拒绝' : '维护中'}
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'error.dark' }}>
          {activeTab === 0
            ? requests.filter((r) => r.status === 'rejected').length
            : vehicles.filter((v) => v.status === 'maintenance').length}
        </Box>
      </Box>
    </Box>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: activeTab === 0 ? <ClipboardCheck style={{ width: 20, height: 20 }} /> : <Car style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(_, v) => {
          setActiveTab(v);
          setCurrentPage(1);
        }}
        sx={{ mb: 3 }}
      >
        <Tab label='车辆申请' icon={<ClipboardCheck size={16} />} />
        <Tab label='车辆管理' icon={<Car size={16} />} />
      </Tabs>

      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={data}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={activeTab === 0 ? '搜索车牌号...' : '搜索车牌号...'}
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
            label: `新增${activeTab === 0 ? '申请' : '车辆'}`,
            icon: <Save size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage={`暂无${activeTab === 0 ? '车辆申请' : '车辆'}数据`}
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedItem ? '编辑记录' : `新增${activeTab === 0 ? '车辆申请' : '车辆'}`}</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              {activeTab === 0 ? (
                <>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='vehicle_plate'>车牌号 *</InputLabel>
                    <TextField
                      id='vehicle_plate'
                      required
                      size='small'
                      value={formData.vehicle_plate}
                      onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='requester'>申请人</InputLabel>
                    <TextField
                      id='requester'
                      size='small'
                      value={formData.requester}
                      onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='purpose'>用途 *</InputLabel>
                    <TextField
                      id='purpose'
                      required
                      size='small'
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='start_time'>开始时间 *</InputLabel>
                    <TextField
                      id='start_time'
                      required
                      size='small'
                      type='datetime-local'
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='end_time'>结束时间 *</InputLabel>
                    <TextField
                      id='end_time'
                      required
                      size='small'
                      type='datetime-local'
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='driver_required'>需要司机</InputLabel>
                    <FormControl fullWidth size='small'>
                      <Select
                        id='driver_required'
                        value={formData.driver_required ? 'true' : 'false'}
                        onChange={(e) => setFormData({ ...formData, driver_required: e.target.value === 'true' })}
                      >
                        <MenuItem value='true'>是</MenuItem>
                        <MenuItem value='false'>否</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </>
              ) : (
                <>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='plate_number'>车牌号码 *</InputLabel>
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
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='model'>车型</InputLabel>
                    <TextField
                      id='model'
                      size='small'
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='vehicle_type'>车辆类型</InputLabel>
                    <TextField
                      id='vehicle_type'
                      size='small'
                      value={formData.vehicle_type}
                      onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='driver'>司机</InputLabel>
                    <TextField
                      id='driver'
                      size='small'
                      value={formData.driver}
                      onChange={(e) => setFormData({ ...formData, driver: e.target.value })}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='mileage'>里程(km)</InputLabel>
                    <TextField
                      id='mileage'
                      size='small'
                      type='number'
                      value={formData.mileage}
                      onChange={(e) =>
                        setFormData({ ...formData, mileage: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='fuel_type'>燃油类型</InputLabel>
                    <FormControl fullWidth size='small'>
                      <Select
                        id='fuel_type'
                        value={formData.fuel_type}
                        onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                      >
                        <MenuItem value='gasoline'>汽油</MenuItem>
                        <MenuItem value='diesel'>柴油</MenuItem>
                        <MenuItem value='electric'>电动</MenuItem>
                        <MenuItem value='hybrid'>混动</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <InputLabel htmlFor='last_service'>上次保养</InputLabel>
                    <TextField
                      id='last_service'
                      size='small'
                      type='date'
                      value={formData.last_service}
                      onChange={(e) => setFormData({ ...formData, last_service: e.target.value })}
                    />
                  </Box>
                </>
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='status'>状态</InputLabel>
                <FormControl fullWidth size='small'>
                  <Select
                    id='status'
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {activeTab === 0 ? (
                      <>
                        <MenuItem value='pending'>待审批</MenuItem>
                        <MenuItem value='approved'>已批准</MenuItem>
                        <MenuItem value='rejected'>已拒绝</MenuItem>
                        <MenuItem value='completed'>已完成</MenuItem>
                      </>
                    ) : (
                      <>
                        <MenuItem value='available'>可用</MenuItem>
                        <MenuItem value='in_use'>使用中</MenuItem>
                        <MenuItem value='maintenance'>维护中</MenuItem>
                        <MenuItem value='unavailable'>不可用</MenuItem>
                      </>
                    )}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <DialogActions sx={{ mt: 2 }}>
              <Button type='button' variant='outlined' onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button type='submit' variant='contained' startIcon={<Save size={16} />}>
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{activeTab === 0 ? '车辆申请' : '车辆'}详情</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>车牌号</InputLabel>
                  <Box sx={{ fontWeight: 500 }}>
                    {activeTab === 0 ? (selectedItem as VehicleRequest).vehicle_plate : (selectedItem as Vehicle).plate_number}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                    {activeTab === 0 ? '申请人' : '司机'}
                  </InputLabel>
                  <Box component='span'>
                    {activeTab === 0
                      ? (selectedItem as VehicleRequest).requester
                      : (selectedItem as Vehicle).driver || '-'}
                  </Box>
                </Box>
                {activeTab === 0 && (
                  <>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>用途</InputLabel>
                      <Box component='span'>{(selectedItem as VehicleRequest).purpose}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>开始时间</InputLabel>
                      <Box component='span'>{(selectedItem as VehicleRequest).start_time}</Box>
                    </Box>
                  </>
                )}
                {activeTab === 1 && (
                  <>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>车型</InputLabel>
                      <Box component='span'>{(selectedItem as Vehicle).model || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>里程</InputLabel>
                      <Box component='span'>{(selectedItem as Vehicle).mileage || 0} km</Box>
                    </Box>
                  </>
                )}
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedItem.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>{new Date(selectedItem.created_at).toLocaleString('zh-CN')}</Box>
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

export default VehicleRequestPage;