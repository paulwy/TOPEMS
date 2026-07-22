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
import type { OfficeSupply, PaginationParams } from '@/api/erp';
import { officeSupplyApi } from '@/api/erp';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Edit, Trash2, Eye, Package, Save } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const OfficeSuppliesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<OfficeSupply | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<OfficeSupply>>({
    name: '',
    category: '',
    quantity: 0,
    unit: '',
    price: 0,
    location: '',
    status: 'in_stock',
  });

  const { addNotification } = useNotificationStore();

  const params: PaginationParams & { category?: string } = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;
  if (categoryFilter !== 'all') params.category = categoryFilter;

  const { data: suppliesData, isLoading: loading } = useQuery({
    queryKey: [...QUERY_KEYS.ERP.ASSETS, params],
    queryFn: async () => {
      const response = await officeSupplyApi.list(params);
      if (response.success && response.data) {
        return {
          supplies: response.data.items || [],
          total: response.data.total || 0,
        };
      }
      return { supplies: [], total: 0 };
    },
  });

  const supplies = suppliesData?.supplies || [];
  const total = suppliesData?.total || 0;

  const invalidateSupplies = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.ASSETS });
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<OfficeSupply>) => officeSupplyApi.create(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '新办公用品已添加' });
      invalidateSupplies();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '添加办公用品失败' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OfficeSupply> }) =>
      officeSupplyApi.update(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '更新成功', message: '办公用品信息已更新' });
      invalidateSupplies();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '更新办公用品失败' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => officeSupplyApi.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '办公用品已删除' });
      invalidateSupplies();
    },
    onError: (error: unknown) => {
      apiLogger.error('删除失败:', error);
      addNotification({ type: 'error', title: '删除失败', message: '无法删除办公用品' });
    },
  });

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      in_stock: '在库',
      low_stock: '库存不足',
      out_of_stock: '缺货',
      discontinued: '已停用',
    };
    return statusMap[status] || status;
  };

  const getCategoryText = (category: string) => {
    const categoryMap: Record<string, string> = {
      stationery: '文具',
      electronics: '电子设备',
      furniture: '家具',
      consumables: '耗材',
      other: '其他',
    };
    return categoryMap[category] || category;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSupply) {
      updateMutation.mutate({ id: selectedSupply.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('确定要删除这个办公用品吗?')) return;
    deleteMutation.mutate(id);
  };

  const handleEdit = (supply: OfficeSupply) => {
    setSelectedSupply(supply);
    setFormData({
      name: supply.name,
      category: supply.category,
      quantity: supply.quantity,
      unit: supply.unit,
      price: supply.price,
      location: supply.location,
      status: supply.status,
    });
    setShowDialog(true);
  };

  const handleViewDetail = (supply: OfficeSupply) => {
    setSelectedSupply(supply);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedSupply(null);
    setFormData({
      name: '',
      category: '',
      quantity: 0,
      unit: '',
      price: 0,
      location: '',
      status: 'in_stock',
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
      in_stock: { label: '在库', bg: 'success.lighter', color: 'success.700' },
      low_stock: { label: '库存不足', bg: 'warning.light', color: 'warning.700' },
      out_of_stock: { label: '缺货', bg: 'error.lighter', color: 'error.dark' },
      discontinued: { label: '已停用', bg: 'grey.100', color: 'text.secondary' },
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

  const columns: ColumnDef<OfficeSupply>[] = useMemo(
    () => [
      { id: 'name', label: '名称', sortable: true },
      {
        id: 'category',
        label: '类别',
        render: (row) => getCategoryText(row.category || ''),
      },
      { id: 'quantity', label: '数量', sortable: true },
      { id: 'unit', label: '单位' },
      {
        id: 'price',
        label: '单价',
        render: (row) => (row.price ? `¥${row.price.toFixed(2)}` : '-'),
      },
      { id: 'location', label: '存放位置' },
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
          { label: '在库', value: 'in_stock' },
          { label: '库存不足', value: 'low_stock' },
          { label: '缺货', value: 'out_of_stock' },
          { label: '已停用', value: 'discontinued' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
      {
        id: 'category',
        label: '类别',
        type: 'select',
        options: [
          { label: '全部类别', value: 'all' },
          { label: '文具', value: 'stationery' },
          { label: '电子设备', value: 'electronics' },
          { label: '家具', value: 'furniture' },
          { label: '耗材', value: 'consumables' },
          { label: '其他', value: 'other' },
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

  const rowActions: RowAction<OfficeSupply>[] = useMemo(
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
        confirmMessage: '确定要删除这个办公用品吗?',
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
          <Package
            size={18}
            sx={{ color: 'secondary.700' }}
          />
          <Box
            component='span'
            sx={{ color: 'text.secondary', fontSize: 14 }}
          >
            物品总数
          </Box>
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'secondary.700' }}>{supplies.length}</Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>在库</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>
          {supplies.filter((s) => s.status === 'in_stock').length}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>库存不足</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>
          {supplies.filter((s) => s.status === 'low_stock').length}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>缺货</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'error.dark' }}>
          {supplies.filter((s) => s.status === 'out_of_stock').length}
        </Box>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Package style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={supplies}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索办公用品名称...'
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
            label: '新增办公用品',
            icon: <Package size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无办公用品数据'
        getRowId={(row) => row.id}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedSupply ? '编辑办公用品' : '新增办公用品'}</DialogTitle>
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
            {selectedSupply ? '修改办公用品信息' : '填写新办公用品信息'}
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
                <InputLabel htmlFor='name'>名称 *</InputLabel>
                <TextField
                  id='name'
                  required
                  size='small'
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='category'>类别</InputLabel>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <Select
                    id='category'
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <MenuItem value='stationery'>文具</MenuItem>
                    <MenuItem value='electronics'>电子设备</MenuItem>
                    <MenuItem value='furniture'>家具</MenuItem>
                    <MenuItem value='consumables'>耗材</MenuItem>
                    <MenuItem value='other'>其他</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='quantity'>数量 *</InputLabel>
                <TextField
                  id='quantity'
                  required
                  size='small'
                  type='number'
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseFloat(e.target.value) })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='unit'>单位</InputLabel>
                <TextField
                  id='unit'
                  size='small'
                  value={formData.unit || ''}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='price'>单价</InputLabel>
                <TextField
                  id='price'
                  size='small'
                  type='number'
                  value={formData.price || ''}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='location'>存放位置</InputLabel>
                <TextField
                  id='location'
                  size='small'
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
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
                    value={formData.status || 'in_stock'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value='in_stock'>在库</MenuItem>
                    <MenuItem value='low_stock'>库存不足</MenuItem>
                    <MenuItem value='out_of_stock'>缺货</MenuItem>
                    <MenuItem value='discontinued'>已停用</MenuItem>
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
        <DialogTitle>办公用品详情</DialogTitle>
        <DialogContent>
          {selectedSupply && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>名称</InputLabel>
                  <Box sx={{ fontWeight: 500 }}>{selectedSupply.name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>类别</InputLabel>
                  <Box component='span'>{getCategoryText(selectedSupply.category || '')}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>数量</InputLabel>
                  <Box component='span'>{selectedSupply.quantity}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>单位</InputLabel>
                  <Box component='span'>{selectedSupply.unit || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>单价</InputLabel>
                  <Box component='span'>
                    {selectedSupply.price ? `¥${selectedSupply.price.toFixed(2)}` : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>存放位置</InputLabel>
                  <Box component='span'>{selectedSupply.location || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedSupply.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedSupply.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>更新时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedSupply.updated_at).toLocaleString('zh-CN')}
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

export default OfficeSuppliesPage;
