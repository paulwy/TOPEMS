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
import { Plus, Edit, Delete, Layers } from 'lucide-react';
import { pdmApi } from '@/api/pdm';
import type { Material, CreateMaterialRequest } from '@/api/pdm';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { PageContainer } from '@/components/common/PageContainerV2';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

interface MaterialFormData {
  code: string;
  name: string;
  category: string;
  specification: string;
  unit: string;
  unit_price: number;
  supplier: string;
  status: string;
  inventory_quantity: number;
  safety_stock: number;
}

const STATUS_COLORS: Record<
  string,
  'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
> = {
  active: 'success',
  inactive: 'default',
  low_stock: 'warning',
  out_of_stock: 'error',
};

const CATEGORY_OPTIONS = [
  { label: '原材料', value: 'raw_material' },
  { label: '辅助材料', value: 'auxiliary' },
  { label: '包装材料', value: 'packaging' },
  { label: '成品', value: 'finished_goods' },
  { label: '半成品', value: 'semi_finished' },
  { label: '备品备件', value: 'spare_parts' },
];

export const MaterialPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState<MaterialFormData>({
    code: '',
    name: '',
    category: 'raw_material',
    specification: '',
    unit: 'kg',
    unit_price: 0,
    supplier: '',
    status: 'active',
    inventory_quantity: 0,
    safety_stock: 0,
  });
  const addNotification = useAppStore((state) => state.addNotification);

  const loadMaterials = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.MATERIALS });
  }, [queryClient]);

  const { data: materials = [], isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.PDM.MATERIALS,
    queryFn: async () => {
      const response = await pdmApi.listMaterials();
      if (response.success && response.data) {
        const data = response.data as any;
        return Array.isArray(data) ? data : data.materials || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createMaterialMutation = useMutation({
    mutationFn: (data: CreateMaterialRequest) => pdmApi.createMaterial(data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '物料创建成功', type: 'success' });
      setOpenDialog(false);
      setEditingMaterial(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.MATERIALS });
    },
    onError: () => {
      addNotification({ title: '错误', message: '创建失败', type: 'error' });
    },
  });

  const updateMaterialMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateMaterialRequest }) =>
      pdmApi.updateMaterial(id, data),
    onSuccess: () => {
      addNotification({ title: '成功', message: '物料更新成功', type: 'success' });
      setOpenDialog(false);
      setEditingMaterial(null);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.MATERIALS });
    },
    onError: () => {
      addNotification({ title: '错误', message: '更新失败', type: 'error' });
    },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: (id: string) => pdmApi.deleteMaterial(id),
    onSuccess: () => {
      addNotification({ title: '成功', message: '物料删除成功', type: 'success' });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PDM.MATERIALS });
    },
    onError: () => {
      addNotification({ title: '错误', message: '删除失败', type: 'error' });
    },
  });

  const handleEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setFormData({
      code: material.code || '',
      name: material.name || '',
      category: material.category || 'raw_material',
      specification: material.specification || '',
      unit: material.unit || 'kg',
      unit_price: material.unit_price || 0,
      supplier: material.supplier || '',
      status: material.status || 'active',
      inventory_quantity: material.inventory_quantity || 0,
      safety_stock: material.safety_stock || 0,
    });
    setOpenDialog(true);
  };

  const handleDeleteMaterial = (id: string) => {
    deleteMaterialMutation.mutate(id);
  };

  const handleCreate = () => {
    setEditingMaterial(null);
    setFormData({
      code: '',
      name: '',
      category: 'raw_material',
      specification: '',
      unit: 'kg',
      unit_price: 0,
      supplier: '',
      status: 'active',
      inventory_quantity: 0,
      safety_stock: 0,
    });
    setOpenDialog(true);
  };

  const handleSaveMaterial = () => {
    const requestData: CreateMaterialRequest = {
      code: formData.code,
      name: formData.name,
      category: formData.category,
      specification: formData.specification,
      unit: formData.unit,
      unit_price: formData.unit_price,
      supplier: formData.supplier,
      status: formData.status,
      inventory_quantity: formData.inventory_quantity,
      safety_stock: formData.safety_stock,
    };

    if (editingMaterial) {
      updateMaterialMutation.mutate({ id: editingMaterial.id, data: requestData });
    } else {
      createMaterialMutation.mutate(requestData);
    }
  };

  const filteredMaterials = useMemo(() => {
    return materials.filter((material: any) => {
      const matchesSearch =
        !searchTerm ||
        material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (material.supplier && material.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [materials, searchTerm]);

  const statusOptions = [
    { label: '活跃', value: 'active' },
    { label: '未激活', value: 'inactive' },
    { label: '库存不足', value: 'low_stock' },
    { label: '缺货', value: 'out_of_stock' },
  ];

  const categoryFilterOptions = CATEGORY_OPTIONS.map((opt) => ({
    label: opt.label,
    value: opt.value,
  }));

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'category',
        label: '物料分类',
        type: 'select',
        options: categoryFilterOptions,
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: statusOptions.map((opt) => ({ label: opt.label, value: opt.value })),
      },
    ],
    [categoryFilterOptions]
  );

  const handleFilterChange = useCallback((values: Record<string, any>) => {
    // Filter implementation
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const columns: ColumnDef<Material>[] = useMemo(
    () => [
      { id: 'code', label: '物料编码', minWidth: 120 },
      { id: 'name', label: '物料名称', minWidth: 160 },
      {
        id: 'category',
        label: '分类',
        minWidth: 100,
        render: (row) => {
          const cat = CATEGORY_OPTIONS.find((c) => c.value === row.category);
          return cat?.label || row.category || '-';
        },
      },
      { id: 'specification', label: '规格', minWidth: 120 },
      { id: 'unit', label: '单位', minWidth: 80 },
      {
        id: 'unit_price',
        label: '单价',
        minWidth: 100,
        align: 'right',
        render: (row) => `¥ ${row.unit_price?.toFixed(2) || '0.00'}`,
      },
      {
        id: 'inventory_quantity',
        label: '库存',
        minWidth: 80,
        align: 'right',
        render: (row) => row.inventory_quantity?.toString() || '0',
      },
      {
        id: 'safety_stock',
        label: '安全库存',
        minWidth: 100,
        align: 'right',
        render: (row) => row.safety_stock?.toString() || '0',
      },
      {
        id: 'status',
        label: '状态',
        minWidth: 100,
        render: (row) => {
          let displayStatus = row.status || 'active';
          if (row.inventory_quantity !== undefined && row.safety_stock !== undefined) {
            if (row.inventory_quantity <= 0) {
              displayStatus = 'out_of_stock';
            } else if (row.inventory_quantity < row.safety_stock) {
              displayStatus = 'low_stock';
            }
          }
          return (
            <Chip
              label={statusOptions.find((s) => s.value === displayStatus)?.label || displayStatus}
              color={STATUS_COLORS[displayStatus] || 'default'}
              size='small'
            />
          );
        },
      },
    ],
    []
  );

  const rowActions: RowAction<Material>[] = useMemo(
    () => [
      {
        label: '编辑',
        icon: <Edit size={16} />,
        color: 'primary',
        onClick: (row) => handleEditMaterial(row),
      },
      {
        label: '删除',
        icon: <Delete size={16} />,
        color: 'error',
        onClick: (row) => handleDeleteMaterial(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个物料吗？',
      },
    ],
    []
  );

  const totalValue = filteredMaterials.reduce(
    (sum: number, m: any) => sum + (m.unit_price || 0) * (m.inventory_quantity || 0),
    0
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
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>物料种类</Box>
          <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
            {loading ? '...' : `${filteredMaterials.length} 种`}
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
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>库存总量</Box>
          <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'primary.main' }}>
            {loading
              ? '...'
              : `${filteredMaterials.reduce((sum: number, m: any) => sum + (m.inventory_quantity || 0), 0)} 件`}
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
          <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mb: 1 }}>库存总值</Box>
          <Box sx={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'success.main' }}>
            {loading ? '...' : `¥ ${totalValue.toLocaleString()}`}
          </Box>
        </Box>
      </Grid>
    </Grid>
  );

  return (
    <PageContainer
      title='物料管理'
      subtitle='管理生产所需的原材料、辅助材料等物料'
      headerProps={{
        pageIcon: <Layers style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={filteredMaterials}
        loading={loading}
        searchable
        searchPlaceholder='搜索物料名称、编码或供应商...'
        onSearch={handleSearch}
        filters={filters}
        filtersValue={{}}
        onFilterChange={handleFilterChange}
        rowActions={rowActions}
        actions={[
          {
            label: '添加物料',
            icon: <Plus size={16} />,
            onClick: handleCreate,
            variant: 'contained',
          },
        ]}
        onRefresh={loadMaterials}
        headerContent={statsCards}
        emptyMessage='暂无物料数据'
      />

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{editingMaterial ? '编辑物料' : '添加物料'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <Grid
              container
              spacing={3}
            >
              <Grid size={{ xs: 6 }}>
                <TextField
                  label='物料编码 *'
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label='物料名称 *'
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  fullWidth
                  required
                />
              </Grid>
            </Grid>
            <Grid
              container
              spacing={3}
            >
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>物料分类</InputLabel>
                  <Select
                    value={formData.category}
                    label='物料分类'
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
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
              <Grid size={{ xs: 6 }}>
                <TextField
                  label='规格'
                  value={formData.specification}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                  fullWidth
                />
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
              <Grid size={{ xs: 6 }}>
                <TextField
                  label='单价'
                  type='number'
                  value={formData.unit_price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unit_price: parseFloat(e.target.value) || 0,
                    })
                  }
                  fullWidth
                />
              </Grid>
            </Grid>
            <TextField
              label='供应商'
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              fullWidth
            />
            <Grid
              container
              spacing={3}
            >
              <Grid size={{ xs: 6 }}>
                <TextField
                  label='当前库存'
                  type='number'
                  value={formData.inventory_quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      inventory_quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label='安全库存'
                  type='number'
                  value={formData.safety_stock}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      safety_stock: parseFloat(e.target.value) || 0,
                    })
                  }
                  fullWidth
                />
              </Grid>
            </Grid>
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleSaveMaterial}
            disabled={!formData.code || !formData.name}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default MaterialPage;
