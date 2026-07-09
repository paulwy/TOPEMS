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
import { designTokens } from '@/theme/tokens';
import { logger } from '@/utils/logger';

const ct = designTokens.colors;

interface OfficeSupply {
  id: string;
  item_code: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  min_stock: number;
  unit_price: number;
  status: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  normal: { label: '正常', bg: 'success.lighter', color: 'success.700' },
  low: { label: '库存不足', bg: 'error.lighter', color: ct.error[700] },
  out_of_stock: { label: '缺货', bg: 'error.lighter', color: ct.error[800] },
};

const mockSupplies: OfficeSupply[] = [
  {
    id: '1',
    item_code: 'OS-001',
    name: 'A4打印纸',
    category: '纸张',
    quantity: 50,
    unit: '包',
    min_stock: 20,
    unit_price: 25,
    status: 'normal',
  },
  {
    id: '2',
    item_code: 'OS-002',
    name: '签字笔(黑)',
    category: '笔类',
    quantity: 200,
    unit: '支',
    min_stock: 50,
    unit_price: 3,
    status: 'normal',
  },
  {
    id: '3',
    item_code: 'OS-003',
    name: '文件夹(蓝色)',
    category: '文件管理',
    quantity: 15,
    unit: '个',
    min_stock: 30,
    unit_price: 8,
    status: 'low',
  },
  {
    id: '4',
    item_code: 'OS-004',
    name: '订书钉',
    category: '办公工具',
    quantity: 100,
    unit: '盒',
    min_stock: 20,
    unit_price: 5,
    status: 'normal',
  },
  {
    id: '5',
    item_code: 'OS-005',
    name: '胶带(透明)',
    category: '办公工具',
    quantity: 0,
    unit: '卷',
    min_stock: 30,
    unit_price: 4,
    status: 'out_of_stock',
  },
  {
    id: '6',
    item_code: 'OS-006',
    name: '白板笔(红色)',
    category: '笔类',
    quantity: 8,
    unit: '支',
    min_stock: 10,
    unit_price: 6,
    status: 'low',
  },
  {
    id: '7',
    item_code: 'OS-007',
    name: '回形针',
    category: '办公工具',
    quantity: 500,
    unit: '盒',
    min_stock: 50,
    unit_price: 2,
    status: 'normal',
  },
  {
    id: '8',
    item_code: 'OS-008',
    name: '便签纸',
    category: '纸张',
    quantity: 30,
    unit: '本',
    min_stock: 20,
    unit_price: 5,
    status: 'normal',
  },
];

interface SupplyFormData {
  item_code: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  min_stock: number;
  unit_price: number;
  status: string;
}

const defaultFormData: SupplyFormData = {
  item_code: '',
  name: '',
  category: '',
  quantity: 0,
  unit: '个',
  min_stock: 10,
  unit_price: 0,
  status: 'normal',
};

const OfficeSuppliesPage: React.FC = () => {
  const [supplies, setSupplies] = useState<OfficeSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SupplyFormData>(defaultFormData);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      setSupplies(mockSupplies);
    } catch (error: unknown) {
      logger.error('加载办公用品数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_MAP[status] || {
      label: status,
      bg: 'grey.100',
      color: ct.text.secondary,
    };
    return (
      <Chip
        label={config.label}
        size='small'
        sx={{ bgcolor: config.bg, color: config.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<OfficeSupply>[] = [
    {
      id: 'item_code',
      label: '物品编码',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.item_code}</Box>,
    },
    { id: 'name', label: '名称' },
    {
      id: 'category',
      label: '分类',
      render: (row) => (
        <Chip
          label={row.category}
          size='small'
          variant='outlined'
        />
      ),
    },
    {
      id: 'quantity',
      label: '库存量',
      align: 'right',
      render: (row) => (
        <Typography
          variant='body2'
          sx={{
            fontWeight: 600,
            color: row.quantity <= row.min_stock ? 'error.dark' : 'text.primary',
          }}
        >
          {row.quantity}
        </Typography>
      ),
    },
    { id: 'unit', label: '单位', align: 'center' },
    { id: 'min_stock', label: '最低库存', align: 'right' },
    {
      id: 'unit_price',
      label: '单价',
      align: 'right',
      render: (row) => <Typography variant='body2'>{row.unit_price.toFixed(2)}</Typography>,
    },
    { id: 'status', label: '状态', render: (row) => getStatusBadge(row.status) },
  ];

  const filteredSupplies = useMemo(() => {
    return supplies.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.item_code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || s.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [supplies, searchTerm, categoryFilter, statusFilter]);

  const paginatedData = filteredSupplies.slice(page * pageSize, page * pageSize + pageSize);

  const rowActions: RowAction<OfficeSupply>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) =>
        addNotification({ title: '查看', message: `查看: ${row.name}`, type: 'info' }),
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
        setSupplies((prev) => prev.filter((s) => s.id !== row.id));
        addNotification({ title: '成功', message: '删除成功', type: 'success' });
      },
    },
  ];

  const handleCreate = () => {
    setFormData(defaultFormData);
    setShowCreateModal(true);
  };
  const handleEdit = (row: OfficeSupply) => {
    setEditingId(row.id);
    setFormData({
      item_code: row.item_code,
      name: row.name,
      category: row.category,
      quantity: row.quantity,
      unit: row.unit,
      min_stock: row.min_stock,
      unit_price: row.unit_price,
      status: row.status,
    });
    setShowEditModal(true);
  };
  const handleSaveCreate = () => {
    setSupplies((prev) => [{ id: Date.now().toString(), ...formData }, ...prev]);
    setShowCreateModal(false);
    addNotification({ title: '成功', message: '办公用品添加成功', type: 'success' });
  };
  const handleSaveEdit = () => {
    setSupplies((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...formData } : s)));
    setShowEditModal(false);
    setEditingId(null);
    addNotification({ title: '成功', message: '办公用品更新成功', type: 'success' });
  };

  const renderFormFields = (
    data: SupplyFormData,
    onChange: (d: SupplyFormData) => void,
    editing: boolean
  ) => (
    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <TextField
          fullWidth
          label='物品编码 *'
          value={data.item_code}
          onChange={(e) => onChange({ ...data, item_code: e.target.value })}
          placeholder='请输入物品编码'
          disabled={editing}
        />
        <TextField
          fullWidth
          label='名称 *'
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder='请输入名称'
        />
        <TextField
          fullWidth
          label='分类 *'
          value={data.category}
          onChange={(e) => onChange({ ...data, category: e.target.value })}
          placeholder='请输入分类'
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField
            fullWidth
            type='number'
            label='库存量 *'
            value={data.quantity}
            onChange={(e) => onChange({ ...data, quantity: parseInt(e.target.value) || 0 })}
            placeholder='库存量'
          />
          <TextField
            fullWidth
            label='单位'
            value={data.unit}
            onChange={(e) => onChange({ ...data, unit: e.target.value })}
            placeholder='单位'
          />
        </Box>
        <TextField
          fullWidth
          type='number'
          label='最低库存 *'
          value={data.min_stock}
          onChange={(e) => onChange({ ...data, min_stock: parseInt(e.target.value) || 0 })}
          placeholder='最低库存'
        />
        <TextField
          fullWidth
          type='number'
          label='单价 *'
          value={data.unit_price}
          onChange={(e) => onChange({ ...data, unit_price: parseFloat(e.target.value) || 0 })}
          placeholder='单价'
        />
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='办公用品管理'
      subtitle='Office Supplies Management'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'OA' },
          { label: '办公用品管理' },
        ]}
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        searchable
        searchPlaceholder='搜索名称或编码...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        filters={[
          {
            id: 'category',
            label: '分类',
            type: 'select',
            options: [
              { label: '全部', value: 'all' },
              { label: '纸张', value: '纸张' },
              { label: '笔类', value: '笔类' },
              { label: '办公工具', value: '办公工具' },
              { label: '文件管理', value: '文件管理' },
            ],
            value: categoryFilter,
            onChange: (value: unknown) => {
              setCategoryFilter(value as string);
              setPage(0);
            },
          },
          {
            id: 'status',
            label: '状态',
            type: 'select',
            options: [
              { label: '全部', value: 'all' },
              { label: '正常', value: 'normal' },
              { label: '库存不足', value: 'low' },
              { label: '缺货', value: 'out_of_stock' },
            ],
            value: statusFilter,
            onChange: (value: unknown) => {
              setStatusFilter(value as string);
              setPage(0);
            },
          },
        ]}
        pagination={{
          page,
          pageSize,
          total: filteredSupplies.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        actions={[
          {
            label: '新增物品',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        emptyMessage='暂无办公用品数据'
      />
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新增办公用品</DialogTitle>
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
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>编辑办公用品</DialogTitle>
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

export default OfficeSuppliesPage;
