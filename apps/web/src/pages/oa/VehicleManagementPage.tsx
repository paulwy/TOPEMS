import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
} from '@mui/material';
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { useAppStore } from '@/store';

interface Vehicle {
  id: string;
  plate_no: string;
  vehicle_type: string;
  brand: string;
  model: string;
  driver: string;
  status: string;
  next_maintenance: string;
  department: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  available: { label: '可用', bg: 'success.lighter', color: 'success.700' },
  in_use: { label: '使用中', bg: 'primary.100', color: 'primary.700' },
  maintenance: { label: '维修中', bg: 'warning.light', color: 'warning.700' },
  retired: { label: '已退役', bg: 'grey.200', color: 'grey.600' },
};

const mockVehicles: Vehicle[] = [
  {
    id: '1',
    plate_no: '京A12345',
    vehicle_type: '轿车',
    brand: '大众',
    model: '帕萨特',
    driver: '张三',
    status: 'available',
    next_maintenance: '2025-07-15',
    department: '行政部',
  },
  {
    id: '2',
    plate_no: '京B67890',
    vehicle_type: 'SUV',
    brand: '丰田',
    model: '汉兰达',
    driver: '李四',
    status: 'in_use',
    next_maintenance: '2025-08-01',
    department: '销售部',
  },
  {
    id: '3',
    plate_no: '京C11111',
    vehicle_type: '货车',
    brand: '福田',
    model: '欧曼',
    driver: '王五',
    status: 'maintenance',
    next_maintenance: '2025-06-20',
    department: '物流部',
  },
  {
    id: '4',
    plate_no: '京D22222',
    vehicle_type: '面包车',
    brand: '五菱',
    model: '宏光',
    driver: '赵六',
    status: 'available',
    next_maintenance: '2025-09-10',
    department: '后勤部',
  },
  {
    id: '5',
    plate_no: '京E33333',
    vehicle_type: '轿车',
    brand: '本田',
    model: '雅阁',
    driver: '钱七',
    status: 'in_use',
    next_maintenance: '2025-07-25',
    department: '行政部',
  },
  {
    id: '6',
    plate_no: '京F44444',
    vehicle_type: '货车',
    brand: '东风',
    model: '天龙',
    driver: '孙八',
    status: 'available',
    next_maintenance: '2025-10-01',
    department: '物流部',
  },
  {
    id: '7',
    plate_no: '京G55555',
    vehicle_type: '轿车',
    brand: '奥迪',
    model: 'A6L',
    driver: '周九',
    status: 'retired',
    next_maintenance: '-',
    department: '行政部',
  },
];

interface VehicleFormData {
  plate_no: string;
  vehicle_type: string;
  brand: string;
  model: string;
  driver: string;
  status: string;
  next_maintenance: string;
  department: string;
}

const defaultFormData: VehicleFormData = {
  plate_no: '',
  vehicle_type: '轿车',
  brand: '',
  model: '',
  driver: '',
  status: 'available',
  next_maintenance: '',
  department: '',
};

const VehicleManagementPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<VehicleFormData>(defaultFormData);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      setVehicles(mockVehicles);
    } catch (error: any) {
      console.error('加载车辆数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_MAP[status] || { label: status, bg: 'grey.100', color: '#475569' };
    return (
      <Chip
        label={config.label}
        size='small'
        sx={{ bgcolor: config.bg, color: config.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<Vehicle>[] = [
    {
      id: 'plate_no',
      label: '车牌号',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.plate_no}</Box>,
    },
    { id: 'vehicle_type', label: '车辆类型' },
    { id: 'brand', label: '品牌' },
    { id: 'model', label: '型号' },
    { id: 'driver', label: '驾驶员' },
    { id: 'status', label: '状态', render: (row) => getStatusBadge(row.status) },
    {
      id: 'next_maintenance',
      label: '下次保养',
      render: (row) =>
        row.next_maintenance !== '-' ? (
          <Typography variant='body2'>{row.next_maintenance}</Typography>
        ) : (
          '-'
        ),
    },
    { id: 'department', label: '所属部门' },
  ];

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchesSearch =
        v.plate_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.brand.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      const matchesType = typeFilter === 'all' || v.vehicle_type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [vehicles, searchTerm, statusFilter, typeFilter]);

  const paginatedData = filteredVehicles.slice(page * pageSize, page * pageSize + pageSize);

  const rowActions: RowAction<Vehicle>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) =>
        addNotification({ title: '查看', message: `查看车辆: ${row.plate_no}`, type: 'info' }),
    },
    {
      label: '编辑',
      icon: <Edit2 style={{ width: 16, height: 16 }} />,
      color: 'primary',
      onClick: (row) => handleEdit(row),
    },
    {
      label: '删除',
      icon: <Trash2 style={{ width: 16, height: 16 }} />,
      color: 'error',
      onClick: (row) => {
        setVehicles((prev) => prev.filter((v) => v.id !== row.id));
        addNotification({ title: '成功', message: '车辆删除成功', type: 'success' });
      },
    },
  ];

  const handleCreate = () => {
    setFormData(defaultFormData);
    setShowCreateModal(true);
  };
  const handleEdit = (row: Vehicle) => {
    setEditingId(row.id);
    setFormData({
      plate_no: row.plate_no,
      vehicle_type: row.vehicle_type,
      brand: row.brand,
      model: row.model,
      driver: row.driver,
      status: row.status,
      next_maintenance: row.next_maintenance,
      department: row.department,
    });
    setShowEditModal(true);
  };
  const handleSaveCreate = () => {
    setVehicles((prev) => [{ id: Date.now().toString(), ...formData }, ...prev]);
    setShowCreateModal(false);
    addNotification({ title: '成功', message: '车辆添加成功', type: 'success' });
  };
  const handleSaveEdit = () => {
    setVehicles((prev) => prev.map((v) => (v.id === editingId ? { ...v, ...formData } : v)));
    setShowEditModal(false);
    setEditingId(null);
    addNotification({ title: '成功', message: '车辆更新成功', type: 'success' });
  };

  const renderFormFields = (
    data: VehicleFormData,
    onChange: (d: VehicleFormData) => void,
    editing: boolean
  ) => (
    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <TextField
          fullWidth
          label='车牌号 *'
          value={data.plate_no}
          onChange={(e) => onChange({ ...data, plate_no: e.target.value })}
          placeholder='请输入车牌号'
          disabled={editing}
        />
        <FormControl fullWidth>
          <InputLabel>车辆类型</InputLabel>
          <Select
            value={data.vehicle_type}
            label='车辆类型'
            onChange={(e) => onChange({ ...data, vehicle_type: e.target.value })}
          >
            <MenuItem value='轿车'>轿车</MenuItem>
            <MenuItem value='SUV'>SUV</MenuItem>
            <MenuItem value='货车'>货车</MenuItem>
            <MenuItem value='面包车'>面包车</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          label='品牌 *'
          value={data.brand}
          onChange={(e) => onChange({ ...data, brand: e.target.value })}
          placeholder='请输入品牌'
        />
        <TextField
          fullWidth
          label='型号'
          value={data.model}
          onChange={(e) => onChange({ ...data, model: e.target.value })}
          placeholder='请输入型号'
        />
        <TextField
          fullWidth
          label='驾驶员 *'
          value={data.driver}
          onChange={(e) => onChange({ ...data, driver: e.target.value })}
          placeholder='请输入驾驶员'
        />
        <FormControl fullWidth>
          <InputLabel>状态</InputLabel>
          <Select
            value={data.status}
            label='状态'
            onChange={(e) => onChange({ ...data, status: e.target.value })}
          >
            <MenuItem value='available'>可用</MenuItem>
            <MenuItem value='in_use'>使用中</MenuItem>
            <MenuItem value='maintenance'>维修中</MenuItem>
            <MenuItem value='retired'>已退役</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          type='date'
          label='下次保养'
          value={data.next_maintenance}
          onChange={(e) => onChange({ ...data, next_maintenance: e.target.value })}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          fullWidth
          label='所属部门'
          value={data.department}
          onChange={(e) => onChange({ ...data, department: e.target.value })}
          placeholder='请输入所属部门'
        />
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='车辆管理'
      subtitle='Vehicle Management'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'OA' },
          { label: '车辆管理' },
        ]}
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        searchable
        searchPlaceholder='搜索车牌号或品牌...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        filters={[
          {
            id: 'status',
            label: '状态',
            type: 'select',
            options: [
              { label: '全部', value: 'all' },
              { label: '可用', value: 'available' },
              { label: '使用中', value: 'in_use' },
              { label: '维修中', value: 'maintenance' },
              { label: '已退役', value: 'retired' },
            ],
            value: statusFilter,
            onChange: (value) => {
              setStatusFilter(value);
              setPage(0);
            },
          },
          {
            id: 'vehicle_type',
            label: '车辆类型',
            type: 'select',
            options: [
              { label: '全部', value: 'all' },
              { label: '轿车', value: '轿车' },
              { label: 'SUV', value: 'SUV' },
              { label: '货车', value: '货车' },
              { label: '面包车', value: '面包车' },
            ],
            value: typeFilter,
            onChange: (value) => {
              setTypeFilter(value);
              setPage(0);
            },
          },
        ]}
        pagination={{
          page,
          pageSize,
          total: filteredVehicles.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        actions={[
          {
            label: '新增车辆',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        emptyMessage='暂无车辆数据'
      />
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增车辆</DialogTitle>
        <DialogContent>{renderFormFields(formData, setFormData, false)}</DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSaveCreate}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingId(null);
        }}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>编辑车辆</DialogTitle>
        <DialogContent>{renderFormFields(formData, setFormData, true)}</DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => {
              setShowEditModal(false);
              setEditingId(null);
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSaveEdit}
          >
            更新
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default VehicleManagementPage;
