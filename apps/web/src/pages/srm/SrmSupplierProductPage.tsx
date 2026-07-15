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
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';
import { logger } from '@/utils/logger';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const ct = designTokens.colors;

interface SupplierProduct {
  id: string;
  product_code: string;
  name: string;
  supplier: string;
  category: string;
  price: number;
  unit: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: '在售', bg: 'success.lighter', color: 'success.700' },
  inactive: { label: '停售', bg: 'error.lighter', color: ct.error[700] },
  pending: { label: '待审核', bg: 'warning.light', color: 'warning.700' },
};

const mockProducts: SupplierProduct[] = [
  {
    id: '1',
    product_code: 'SP-001',
    name: '不锈钢板材 304',
    supplier: '宝钢集团',
    category: '原材料',
    price: 12500,
    unit: '吨',
    status: 'active',
    created_at: '2025-01-15',
    updated_at: '2025-06-01',
  },
  {
    id: '2',
    product_code: 'SP-002',
    name: '铝合金型材 6061',
    supplier: '中铝集团',
    category: '原材料',
    price: 18500,
    unit: '吨',
    status: 'active',
    created_at: '2025-01-20',
    updated_at: '2025-06-01',
  },
  {
    id: '3',
    product_code: 'SP-003',
    name: '密封圈 NBR',
    supplier: '三力密封',
    category: '零部件',
    price: 2.5,
    unit: '个',
    status: 'active',
    created_at: '2025-02-01',
    updated_at: '2025-05-28',
  },
  {
    id: '4',
    product_code: 'SP-004',
    name: '电机 Y2-7.5kW',
    supplier: '西门子电气',
    category: '设备配件',
    price: 3500,
    unit: '台',
    status: 'active',
    created_at: '2025-02-15',
    updated_at: '2025-06-01',
  },
  {
    id: '5',
    product_code: 'SP-005',
    name: '液压油 HM46',
    supplier: '长城润滑油',
    category: '化工原料',
    price: 28,
    unit: '升',
    status: 'active',
    created_at: '2025-03-01',
    updated_at: '2025-05-30',
  },
  {
    id: '6',
    product_code: 'SP-006',
    name: '传感器 PT100',
    supplier: '霍尼韦尔',
    category: '电子元器件',
    price: 85,
    unit: '只',
    status: 'pending',
    created_at: '2025-03-10',
    updated_at: '2025-06-01',
  },
  {
    id: '7',
    product_code: 'SP-007',
    name: '瓦楞纸箱定制',
    supplier: '合兴包装',
    category: '包装材料',
    price: 3.8,
    unit: '个',
    status: 'active',
    created_at: '2025-04-01',
    updated_at: '2025-05-25',
  },
  {
    id: '8',
    product_code: 'SP-008',
    name: '轴承 SKF6205',
    supplier: '瑞典SKF',
    category: '零部件',
    price: 68,
    unit: '只',
    status: 'inactive',
    created_at: '2025-04-15',
    updated_at: '2025-05-20',
  },
];

interface ProductFormData {
  product_code: string;
  name: string;
  supplier: string;
  category: string;
  price: number;
  unit: string;
  status: string;
}

const defaultFormData: ProductFormData = {
  product_code: '',
  name: '',
  supplier: '',
  category: '',
  price: 0,
  unit: '个',
  status: 'active',
};

const SrmSupplierProductPage: React.FC = () => {
  const queryClient = useQueryClient();
  const productsQuery = useQuery<SupplierProduct[]>({
    queryKey: ['srm-supplier-products'],
    queryFn: async () => {
      return mockProducts;
    },
    staleTime: 5 * 60 * 1000,
  });

  const products = productsQuery.data ?? [];
  const loading = productsQuery.isLoading;

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    if (productsQuery.isError) {
      logger.error('加载供应商产品失败:', productsQuery.error);
      addNotification({ title: '加载失败', message: '加载供应商产品失败', type: 'error' });
    }
  }, [productsQuery.isError, productsQuery.error, addNotification]);

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

  const columns: ColumnDef<SupplierProduct>[] = [
    {
      id: 'product_code',
      label: '产品编码',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.product_code}</Box>,
    },
    { id: 'name', label: '产品名称' },
    { id: 'supplier', label: '供应商' },
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
      id: 'price',
      label: '价格',
      align: 'right',
      render: (row) => (
        <Typography
          variant='body2'
          sx={{ fontWeight: 500 }}
        >
          {row.price.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </Typography>
      ),
    },
    { id: 'unit', label: '单位', align: 'center' },
    { id: 'status', label: '状态', render: (row) => getStatusBadge(row.status) },
  ];

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.supplier.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [products, searchTerm]
  );
  const paginatedData = filteredProducts.slice(page * pageSize, page * pageSize + pageSize);

  const rowActions: RowAction<SupplierProduct>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) =>
        addNotification({ title: '查看', message: `查看产品: ${row.name}`, type: 'info' }),
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
        queryClient.setQueryData<SupplierProduct[]>(['srm-supplier-products'], (old) =>
          (old || []).filter((p) => p.id !== row.id)
        );
        addNotification({ title: '成功', message: '产品删除成功', type: 'success' });
      },
    },
  ];

  const handleCreate = () => {
    setFormData(defaultFormData);
    setShowCreateModal(true);
  };
  const handleEdit = (row: SupplierProduct) => {
    setEditingId(row.id);
    setFormData({
      product_code: row.product_code,
      name: row.name,
      supplier: row.supplier,
      category: row.category,
      price: row.price,
      unit: row.unit,
      status: row.status,
    });
    setShowEditModal(true);
  };
  const handleSaveCreate = () => {
    const newProduct: SupplierProduct = {
      id: Date.now().toString(),
      ...formData,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
    };
    queryClient.setQueryData<SupplierProduct[]>(['srm-supplier-products'], (old) => [
      newProduct,
      ...(old || []),
    ]);
    setShowCreateModal(false);
    addNotification({ title: '成功', message: '供应商产品创建成功', type: 'success' });
  };
  const handleSaveEdit = () => {
    queryClient.setQueryData<SupplierProduct[]>(['srm-supplier-products'], (old) =>
      (old || []).map((p) =>
        p.id === editingId
          ? { ...p, ...formData, updated_at: new Date().toISOString().split('T')[0] }
          : p
      )
    );
    setShowEditModal(false);
    setEditingId(null);
    addNotification({ title: '成功', message: '供应商产品更新成功', type: 'success' });
  };

  const renderFormFields = (
    data: ProductFormData,
    onChange: (d: ProductFormData) => void,
    editing: boolean
  ) => (
    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <TextField
          fullWidth
          label='产品编码 *'
          value={data.product_code}
          onChange={(e) => onChange({ ...data, product_code: e.target.value })}
          placeholder='请输入产品编码'
          disabled={editing}
        />
        <TextField
          fullWidth
          label='产品名称 *'
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder='请输入产品名称'
        />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <TextField
          fullWidth
          label='供应商 *'
          value={data.supplier}
          onChange={(e) => onChange({ ...data, supplier: e.target.value })}
          placeholder='请输入供应商名称'
        />
        <TextField
          fullWidth
          label='分类'
          value={data.category}
          onChange={(e) => onChange({ ...data, category: e.target.value })}
          placeholder='请输入产品分类'
        />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <TextField
          fullWidth
          type='number'
          label='价格 *'
          value={data.price}
          onChange={(e) => onChange({ ...data, price: parseFloat(e.target.value) || 0 })}
          placeholder='请输入价格'
        />
        <TextField
          fullWidth
          label='单位'
          value={data.unit}
          onChange={(e) => onChange({ ...data, unit: e.target.value })}
          placeholder='请输入单位'
        />
      </Box>
      <FormControl fullWidth>
        <InputLabel>状态</InputLabel>
        <Select
          value={data.status}
          label='状态'
          onChange={(e) => onChange({ ...data, status: e.target.value })}
        >
          <MenuItem value='active'>在售</MenuItem>
          <MenuItem value='inactive'>停售</MenuItem>
          <MenuItem value='pending'>待审核</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );

  return (
    <PageContainer
      title='供应商产品'
      subtitle='Supplier Product Management'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'SRM' },
          { label: '供应商产品' },
        ]}
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        searchable
        searchPlaceholder='搜索产品名称、编码或供应商...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        pagination={{
          page,
          pageSize,
          total: filteredProducts.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        actions={[
          {
            label: '新增产品',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        emptyMessage='暂无供应商产品数据'
      />
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新增供应商产品</DialogTitle>
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
        <DialogTitle>编辑供应商产品</DialogTitle>
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

export default SrmSupplierProductPage;
