import React, { useState, useEffect, useMemo } from 'react';
import {Box,
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
  Typography, useTheme} from '@mui/material';
import { Plus, Edit2, Trash2, Eye, FolderTree } from 'lucide-react';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { useAppStore } from '@/store';

interface SupplierCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  supplier_count: number;
  level: number;
  status: string;
  created_at: string;
  updated_at: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: '启用', bg: 'success.lighter', color: 'success.700' },
  inactive: { label: '禁用', bg: 'error.lighter', color: '#b91c1c' },
};

const mockCategories: SupplierCategory[] = [
  {
    id: '1',
    code: 'CAT-001',
    name: '原材料供应商',
    description: '提供原材料的供应商分类',
    supplier_count: 28,
    level: 1,
    status: 'active',
    created_at: '2025-01-15',
    updated_at: '2025-06-01',
  },
  {
    id: '2',
    code: 'CAT-002',
    name: '零部件供应商',
    description: '提供零部件的供应商分类',
    supplier_count: 45,
    level: 1,
    status: 'active',
    created_at: '2025-01-15',
    updated_at: '2025-06-01',
  },
  {
    id: '3',
    code: 'CAT-003',
    name: '包装材料供应商',
    description: '提供包装材料的供应商',
    supplier_count: 12,
    level: 1,
    status: 'active',
    created_at: '2025-02-10',
    updated_at: '2025-05-20',
  },
  {
    id: '4',
    code: 'CAT-004',
    name: '设备供应商',
    description: '提供生产设备的供应商',
    supplier_count: 8,
    level: 1,
    status: 'active',
    created_at: '2025-02-20',
    updated_at: '2025-06-01',
  },
  {
    id: '5',
    code: 'CAT-005',
    name: '化工原料供应商',
    description: '提供化工原料的供应商',
    supplier_count: 15,
    level: 2,
    status: 'active',
    created_at: '2025-03-01',
    updated_at: '2025-05-30',
  },
  {
    id: '6',
    code: 'CAT-006',
    name: '电子元器件供应商',
    description: '提供电子元器件的供应商',
    supplier_count: 32,
    level: 2,
    status: 'active',
    created_at: '2025-03-10',
    updated_at: '2025-06-01',
  },
  {
    id: '7',
    code: 'CAT-007',
    name: '物流服务商',
    description: '提供物流配送服务的供应商',
    supplier_count: 6,
    level: 1,
    status: 'inactive',
    created_at: '2025-04-01',
    updated_at: '2025-05-15',
  },
  {
    id: '8',
    code: 'CAT-008',
    name: '检测设备供应商',
    description: '提供检测设备的供应商',
    supplier_count: 4,
    level: 2,
    status: 'active',
    created_at: '2025-04-15',
    updated_at: '2025-06-01',
  },
];

interface CategoryFormData {
  code: string;
  name: string;
  description: string;
  level: number;
  status: string;
}

const defaultFormData: CategoryFormData = {
  code: '',
  name: '',
  description: '',
  level: 1,
  status: 'active',
};

const SrmCategoryPage: React.FC = () => {
  const [categories, setCategories] = useState<SupplierCategory[]>([]);
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(defaultFormData);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      setCategories(mockCategories);
    } catch (error: unknown) {
      console.error('加载供应商分类失败:', error);
      addNotification({ title: '加载失败', message: '加载供应商分类失败', type: 'error' });
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

  const columns: ColumnDef<SupplierCategory>[] = [
    {
      id: 'code',
      label: '分类编码',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.code}</Box>,
    },
    { id: 'name', label: '分类名称' },
    {
      id: 'description',
      label: '描述',
      render: (row) => (
        <Typography
          component='span'
          variant='body2'
          sx={{
            color: 'text.secondary',
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
            whiteSpace: 'nowrap',
          }}
        >
          {row.description || '-'}
        </Typography>
      ),
    },
    {
      id: 'supplier_count',
      label: '供应商数量',
      align: 'right',
      render: (row) => (
        <Chip
          label={row.supplier_count}
          size='small'
          variant='outlined'
        />
      ),
    },
    {
      id: 'level',
      label: '层级',
      align: 'center',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          {Array.from({ length: row.level }).map((_, i) => (
            <FolderTree
              key={i}
              style={{ width: 14, height: 14, color: theme.palette.primary.main }}
            />
          ))}
        </Box>
      ),
    },
    { id: 'status', label: '状态', render: (row) => getStatusBadge(row.status) },
  ];

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.code.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [categories, searchTerm]
  );
  const paginatedData = filteredCategories.slice(page * pageSize, page * pageSize + pageSize);

  const rowActions: RowAction<SupplierCategory>[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (row) =>
        addNotification({ title: '查看', message: `查看分类: ${row.name}`, type: 'info' }),
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
        setCategories((prev) => prev.filter((c) => c.id !== row.id));
        addNotification({ title: '成功', message: '分类删除成功', type: 'success' });
      },
    },
  ];

  const handleCreate = () => {
    setFormData(defaultFormData);
    setShowCreateModal(true);
  };
  const handleEdit = (row: SupplierCategory) => {
    setEditingId(row.id);
    setFormData({
      code: row.code,
      name: row.name,
      description: row.description,
      level: row.level,
      status: row.status,
    });
    setShowEditModal(true);
  };
  const handleSaveCreate = () => {
    const newCategory: SupplierCategory = {
      id: Date.now().toString(),
      ...formData,
      supplier_count: 0,
      created_at: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
    };
    setCategories((prev) => [newCategory, ...prev]);
    setShowCreateModal(false);
    addNotification({ title: '成功', message: '供应商分类创建成功', type: 'success' });
  };
  const handleSaveEdit = () => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === editingId
          ? { ...c, ...formData, updated_at: new Date().toISOString().split('T')[0] }
          : c
      )
    );
    setShowEditModal(false);
    setEditingId(null);
    addNotification({ title: '成功', message: '供应商分类更新成功', type: 'success' });
  };

  const renderFormFields = (
    data: CategoryFormData,
    onChange: (d: CategoryFormData) => void,
    editing: boolean
  ) => (
    <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <TextField
          fullWidth
          label='分类编码 *'
          value={data.code}
          onChange={(e) => onChange({ ...data, code: e.target.value })}
          placeholder='请输入分类编码'
          disabled={editing}
        />
        <TextField
          fullWidth
          label='分类名称 *'
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder='请输入分类名称'
        />
      </Box>
      <TextField
        fullWidth
        label='描述'
        value={data.description}
        onChange={(e) => onChange({ ...data, description: e.target.value })}
        placeholder='请输入描述'
        multiline
        rows={2}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <FormControl fullWidth>
          <InputLabel>层级</InputLabel>
          <Select
            value={data.level}
            label='层级'
            onChange={(e) => onChange({ ...data, level: Number(e.target.value) })}
          >
            <MenuItem value={1}>一级</MenuItem>
            <MenuItem value={2}>二级</MenuItem>
            <MenuItem value={3}>三级</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>状态</InputLabel>
          <Select
            value={data.status}
            label='状态'
            onChange={(e) => onChange({ ...data, status: e.target.value })}
          >
            <MenuItem value='active'>启用</MenuItem>
            <MenuItem value='inactive'>禁用</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='供应商分类'
      subtitle='Supplier Category Management'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: 'SRM' },
          { label: '供应商分类' },
        ]}
        columns={columns}
        data={paginatedData}
        loading={loading}
        getRowId={(row) => row.id}
        searchable
        searchPlaceholder='搜索分类名称或编码...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        pagination={{
          page,
          pageSize,
          total: filteredCategories.length,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        actions={[
          {
            label: '新增分类',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        emptyMessage='暂无供应商分类数据'
      />
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新增供应商分类</DialogTitle>
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
        <DialogTitle>编辑供应商分类</DialogTitle>
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

export default SrmCategoryPage;
