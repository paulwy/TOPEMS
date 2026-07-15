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
  Typography,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import React, { useState, useMemo, useCallback } from 'react';
import type { Material, CreateMaterialRequest, UpdateMaterialRequest } from '@/api/erp';
import { erpApi } from '@/api/erp';
import { useNotificationStore } from '@/store';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye, Package as PackageIcon } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const MaterialManagementPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateMaterialRequest>({
    material_code: '',
    material_name: '',
    specification: '',
    category: '',
    unit: '',
    unit_price: 0,
    supplier_id: '',
    supplier_name: '',
    status: 'active',
    description: '',
    barcode: '',
    weight: 0,
    volume: 0,
  });

  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const queryKey = [
    QUERY_KEYS.ERP.MATERIALS,
    searchTerm,
    statusFilter,
    categoryFilter,
    currentPage,
    pageSize,
  ];

  const { data: materialsResponse, isLoading } = useQuery<{
    materials: Material[];
    total: number;
    page: number;
    pagesize: number;
  }>({
    queryKey,
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const response = await erpApi.materials.list(params);
      if (!response.success) {
        throw new Error('Failed to fetch materials');
      }
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const materials = materialsResponse?.materials || [];
  const total = materialsResponse?.total || 0;

  const createMutation = useMutation({
    mutationFn: async (data: CreateMaterialRequest) => {
      const response = await erpApi.materials.create(data);
      if (!response.success) {
        throw new Error('Failed to create material');
      }
      return response;
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '创建成功',
        message: '新物料已创建',
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ERP.MATERIALS] });
      setShowDialog(false);
      resetForm();
    },
    onError: (error) => {
      apiLogger.error('创建失败:', error);
      addNotification({
        type: 'error',
        title: '创建失败',
        message: '无法创建物料',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMaterialRequest }) => {
      const response = await erpApi.materials.update(id, data);
      if (!response.success) {
        throw new Error('Failed to update material');
      }
      return response;
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '更新成功',
        message: '物料信息已更新',
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ERP.MATERIALS] });
      setShowDialog(false);
      resetForm();
    },
    onError: (error) => {
      apiLogger.error('更新失败:', error);
      addNotification({
        type: 'error',
        title: '更新失败',
        message: '无法更新物料',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await erpApi.materials.delete(id);
      if (!response.success) {
        throw new Error('Failed to delete material');
      }
      return response;
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '物料已删除',
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ERP.MATERIALS] });
    },
    onError: (error) => {
      apiLogger.error('删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除物料',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMaterial) {
      await updateMutation.mutateAsync({
        id: selectedMaterial.id,
        data: formData as UpdateMaterialRequest,
      });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这个物料吗?')) return;
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const handleEdit = useCallback((material: Material) => {
    setSelectedMaterial(material);
    setFormData({
      material_code: material.material_code,
      material_name: material.material_name,
      specification: material.specification,
      category: material.category,
      unit: material.unit,
      unit_price: material.unit_price,
      supplier_id: material.supplier_id,
      supplier_name: material.supplier_name,
      status: material.status,
      description: material.description,
      barcode: material.barcode,
      weight: material.weight,
      volume: material.volume,
    });
    setShowDialog(true);
  }, []);

  const handleViewDetail = useCallback((material: Material) => {
    setSelectedMaterial(material);
    setShowDetailDialog(true);
  }, []);

  const resetForm = () => {
    setSelectedMaterial(null);
    setFormData({
      material_code: '',
      material_name: '',
      specification: '',
      category: '',
      unit: '',
      unit_price: 0,
      supplier_id: '',
      supplier_name: '',
      status: 'active',
      description: '',
      barcode: '',
      weight: 0,
      volume: 0,
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
      active: { label: '启用', bg: 'success.lighter', color: 'success.700' },
      inactive: { label: '停用', bg: 'grey.100', color: 'text.secondary' },
      obsolete: { label: '淘汰', bg: 'error.lighter', color: 'error.dark' },
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

  const columns: ColumnDef<Material>[] = useMemo(
    () => [
      { id: 'material_code', label: '物料编码', sortable: true },
      { id: 'material_name', label: '物料名称', sortable: true },
      { id: 'specification', label: '规格型号' },
      { id: 'category', label: '分类' },
      { id: 'unit', label: '单位' },
      {
        id: 'unit_price',
        label: '单价',
        render: (row) =>
          row.unit_price
            ? `¥${row.unit_price.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
            : '-',
      },
      { id: 'supplier_name', label: '主供应商' },
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
          { label: '启用', value: 'active' },
          { label: '停用', value: 'inactive' },
          { label: '淘汰', value: 'obsolete' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
      {
        id: 'category',
        label: '分类',
        type: 'select',
        options: [
          { label: '全部分类', value: 'all' },
          { label: '电子元件', value: '电子元件' },
          { label: '机械零件', value: '机械零件' },
          { label: '原材料', value: '原材料' },
          { label: '包装材料', value: '包装材料' },
          { label: '辅助材料', value: '辅助材料' },
        ],
        value: categoryFilter,
        onChange: (value: unknown) => {
          setCategoryFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter, categoryFilter]
  );

  const rowActions: RowAction<Material>[] = useMemo(
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
        confirmMessage: '确定要删除这个物料吗?',
      },
    ],
    [handleViewDetail, handleEdit, handleDelete]
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const stats = useMemo(() => {
    return {
      total: materials.length,
      active: materials.filter((m: Material) => m.status === 'active').length,
      inactive: materials.filter((m: Material) => m.status === 'inactive').length,
      obsolete: materials.filter((m: Material) => m.status === 'obsolete').length,
    };
  }, [materials]);

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          物料总数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.total}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          启用中
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.active}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已停用
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.inactive}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已淘汰
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'error.dark' }}
        >
          {stats.obsolete}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='物料管理'
      subtitle='管理物料基础信息，包括编码、名称、规格、分类等'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={materials}
        loading={isLoading}
        filters={filters}
        searchable
        searchPlaceholder='搜索物料编码、名称或条码...'
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
            label: '新增物料',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无物料数据'
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedMaterial ? '编辑物料' : '新增物料'}</DialogTitle>
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
            {selectedMaterial ? '修改物料信息' : '填写新物料信息'}
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
                <InputLabel htmlFor='material_code'>物料编码 *</InputLabel>
                <TextField
                  id='material_code'
                  required
                  size='small'
                  value={formData.material_code}
                  onChange={(e) => setFormData({ ...formData, material_code: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='material_name'>物料名称 *</InputLabel>
                <TextField
                  id='material_name'
                  required
                  size='small'
                  value={formData.material_name}
                  onChange={(e) => setFormData({ ...formData, material_name: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='specification'>规格型号</InputLabel>
                <TextField
                  id='specification'
                  size='small'
                  value={formData.specification}
                  onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='category'>分类</InputLabel>
                <FormControl size='small'>
                  <Select
                    id='category'
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <MenuItem value='电子元件'>电子元件</MenuItem>
                    <MenuItem value='机械零件'>机械零件</MenuItem>
                    <MenuItem value='原材料'>原材料</MenuItem>
                    <MenuItem value='包装材料'>包装材料</MenuItem>
                    <MenuItem value='辅助材料'>辅助材料</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='unit'>单位</InputLabel>
                <TextField
                  id='unit'
                  size='small'
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='unit_price'>单价</InputLabel>
                <TextField
                  id='unit_price'
                  type='number'
                  size='small'
                  value={formData.unit_price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unit_price: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='supplier_name'>主供应商</InputLabel>
                <TextField
                  id='supplier_name'
                  size='small'
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='status'>状态</InputLabel>
                <FormControl size='small'>
                  <Select
                    id='status'
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value='active'>启用</MenuItem>
                    <MenuItem value='inactive'>停用</MenuItem>
                    <MenuItem value='obsolete'>淘汰</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='barcode'>条形码</InputLabel>
                <TextField
                  id='barcode'
                  size='small'
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='weight'>重量 (kg)</InputLabel>
                <TextField
                  id='weight'
                  type='number'
                  size='small'
                  value={formData.weight}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      weight: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='volume'>体积 (m³)</InputLabel>
                <TextField
                  id='volume'
                  type='number'
                  size='small'
                  value={formData.volume}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      volume: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: '1 / -1' }}>
                <InputLabel htmlFor='description'>描述</InputLabel>
                <TextField
                  id='description'
                  size='small'
                  multiline
                  rows={2}
                  value={formData.description}
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
                {createMutation.isPending || updateMutation.isPending ? '保存中...' : '保存'}
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
        <DialogTitle>物料详情</DialogTitle>
        <DialogContent>
          {selectedMaterial && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>物料编码</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedMaterial.material_code}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>物料名称</InputLabel>
                  <Box component='span'>{selectedMaterial.material_name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>规格型号</InputLabel>
                  <Box component='span'>{selectedMaterial.specification || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>分类</InputLabel>
                  <Box component='span'>{selectedMaterial.category || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>单位</InputLabel>
                  <Box component='span'>{selectedMaterial.unit || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>单价</InputLabel>
                  <Box component='span'>
                    {selectedMaterial.unit_price
                      ? `¥${selectedMaterial.unit_price.toFixed(2)}`
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>主供应商</InputLabel>
                  <Box component='span'>{selectedMaterial.supplier_name || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedMaterial.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>条形码</InputLabel>
                  <Box component='span'>{selectedMaterial.barcode || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>重量</InputLabel>
                  <Box component='span'>
                    {selectedMaterial.weight ? `${selectedMaterial.weight} kg` : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>体积</InputLabel>
                  <Box component='span'>
                    {selectedMaterial.volume ? `${selectedMaterial.volume} m³` : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedMaterial.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                {selectedMaterial.description && (
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>描述</InputLabel>
                    <Box component='span'>{selectedMaterial.description}</Box>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default MaterialManagementPage;
