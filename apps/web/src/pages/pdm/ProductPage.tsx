import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button,
  Chip,
} from '@mui/material';
import { Plus, Edit, Delete, Package } from 'lucide-react';
import { pdmApi } from '@/api/pdm';
import type { Product, CreateProductRequest } from '@/api/pdm';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

interface ProductFormData {
  name: string;
  code: string;
  version: string;
  status: string;
  description: string;
  category: string;
  unit: string;
}

const STATUS_COLORS: Record<
  string,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
> = {
  active: 'success',
  inactive: 'default',
  draft: 'warning',
  archived: 'default',
};

export const ProductPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    code: '',
    version: '1.0',
    status: 'active',
    description: '',
    category: '',
    unit: '',
  });
  const addNotification = useNotificationStore((state) => state.addNotification);

  const loadProducts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.PRODUCTS });
  }, [queryClient]);

  const { data: products = [], isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.PDM.PRODUCTS,
    queryFn: async () => {
      const response = await pdmApi.listProducts();
      if (response.success && response.data) {
        const data = response.data as any;
        const items = Array.isArray(data) ? data : data.products || [];
        return items as Product[];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createProductMutation = useMutation({
    mutationFn: (data: CreateProductRequest) => pdmApi.createProduct(data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '产品创建成功', type: 'success' });
      setOpenDialog(false);
      setEditingProduct(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.PRODUCTS });
    },
    onError: () => {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateProductRequest }) =>
      pdmApi.updateProduct(id, data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '产品更新成功', type: 'success' });
      setOpenDialog(false);
      setEditingProduct(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.PRODUCTS });
    },
    onError: () => {
      addNotification({ title: '错误', message: '更新失败', type: 'error' });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => pdmApi.deleteProduct(id),
    onSuccess: () => {
      addNotification({ title: '成功', message: '产品删除成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.PRODUCTS });
    },
    onError: () => {
      addNotification({ title: '错误', message: '删除失败', type: 'error' });
    },
  });

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      code: product.code || '',
      version: product.version || '1.0',
      status: product.status || 'active',
      description: product.description || '',
      category: product.category || '',
      unit: product.unit || '',
    });
    setOpenDialog(true);
  };

  const handleDeleteProduct = (id: string) => {
    deleteProductMutation.mutate(id);
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      code: '',
      version: '1.0',
      status: 'active',
      description: '',
      category: '',
      unit: '',
    });
    setOpenDialog(true);
  };

  const handleSaveProduct = () => {
    const requestData: CreateProductRequest = {
      name: formData.name,
      code: formData.code,
      version: formData.version,
      status: formData.status,
      description: formData.description,
      category: formData.category,
      unit: formData.unit,
    };

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: requestData });
    } else {
      createProductMutation.mutate(requestData);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        !searchTerm ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [products, searchTerm]);

  const statusOptions = [
    { label: '活跃', value: 'active' },
    { label: '未激活', value: 'inactive' },
    { label: '草稿', value: 'draft' },
    { label: '已归档', value: 'archived' },
  ];

  const statusFilterOptions = statusOptions.map((opt) => ({ label: opt.label, value: opt.value }));

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: statusFilterOptions,
      },
    ],
    [statusFilterOptions]
  );

  const handleFilterChange = useCallback((values: Record<string, any>) => {
    // Filter implementation
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const columns: ColumnDef<Product>[] = useMemo(
    () => [
      { id: 'code', label: '产品编码', minWidth: 120 },
      { id: 'name', label: '产品名称', minWidth: 160 },
      { id: 'category', label: '分类', minWidth: 100 },
      {
        id: 'version',
        label: '版本',
        minWidth: 80,
        render: (row) => `v${row.version || '1.0'}`,
      },
      {
        id: 'status',
        label: '状态',
        minWidth: 100,
        render: (row) => (
          <Chip
            label={statusOptions.find((s) => s.value === row.status)?.label || row.status}
            color={STATUS_COLORS[row.status] || 'default'}
            size='small'
          />
        ),
      },
      { id: 'unit', label: '单位', minWidth: 80 },
      {
        id: 'created_at',
        label: '创建时间',
        minWidth: 160,
        render: (row) => {
          if (!row.created_at) return '-';
          const date = new Date(row.created_at);
          return date.toLocaleDateString('zh-CN');
        },
      },
    ],
    []
  );

  const rowActions: RowAction<Product>[] = useMemo(
    () => [
      {
        label: '编辑',
        icon: <Edit size={16} />,
        color: 'primary',
        onClick: (row) => handleEditProduct(row),
      },
      {
        label: '删除',
        icon: <Delete size={16} />,
        color: 'error',
        onClick: (row) => handleDeleteProduct(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个产品吗？',
      },
    ],
    []
  );

  const statsCards = (
    <Grid
      container
      spacing={3}
      sx={{ mb: 2 }}
    >
      <Grid size={{ xs: 12, sm: 4 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>产品总数</Box>
          <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
            {loading ? '...' : `${filteredProducts.length} 个`}
          </Box>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>活跃产品</Box>
          <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'success.main' }}>
            {loading ? '...' : `${products.filter((p) => p.status === 'active').length} 个`}
          </Box>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>草稿产品</Box>
          <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'warning.main' }}>
            {loading ? '...' : `${products.filter((p) => p.status === 'draft').length} 个`}
          </Box>
        </Box>
      </Grid>
    </Grid>
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Package style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main} 0%, ${ct.secondary.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredProducts}
        loading={loading}
        searchable
        searchPlaceholder='搜索产品名称、编码或分类...'
        onSearch={handleSearch}
        filters={filters}
        filtersValue={{}}
        onFilterChange={handleFilterChange}
        rowActions={rowActions}
        actions={[
          {
            label: '添加产品',
            icon: <Plus size={16} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        onRefresh={loadProducts}
        headerContent={statsCards}
        emptyMessage='暂无产品数据'
      />

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{editingProduct ? '编辑产品' : '添加产品'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              label='产品编码 *'
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label='产品名称 *'
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label='产品分类'
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              fullWidth
            />
            <Grid
              container
              spacing={3}
            >
              <Grid size={{ xs: 6 }}>
                <TextField
                  label='版本'
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={formData.status}
                    label='状态'
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {statusOptions.map((option) => (
                      <MenuItem
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid
              container
              spacing={3}
            >
              <Grid size={{ xs: 6 }}>
                <TextField
                  label='单位'
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  fullWidth
                />
              </Grid>
            </Grid>
            <TextField
              label='产品描述'
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleSaveProduct}
            disabled={!formData.code || !formData.name}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ProductPage;
