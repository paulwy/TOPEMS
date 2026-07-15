import React, { useState, useMemo, useCallback } from 'react';
import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  InputLabel,
  Typography,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye, Package as PackageIcon, MapPin, Calendar } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { assetApi } from '@/api/erp/finance/asset';
import type { Asset } from '@/api/erp/types';

const AssetListPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    asset_number: '',
    name: '',
    category: '',
    brand: '',
    model: '',
    purchase_date: '',
    purchase_amount: 0,
    location: '',
    responsible_id: '',
    status: 'active',
    description: '',
  });

  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const mockAssets: Asset[] = [
    {
      id: '1',
      asset_number: 'AST-001',
      name: '办公电脑-01',
      category: '电脑设备',
      brand: '联想',
      model: 'ThinkPad X1',
      purchase_date: '2024-01-15',
      purchase_amount: 8500,
      location: '研发部',
      status: 'in_use',
      created_at: '2024-01-15',
      updated_at: '2024-01-15',
    },
    {
      id: '2',
      asset_number: 'AST-002',
      name: '服务器-01',
      category: '服务器',
      brand: '戴尔',
      model: 'PowerEdge R740',
      purchase_date: '2023-06-20',
      purchase_amount: 45000,
      location: '机房',
      status: 'in_use',
      created_at: '2023-06-20',
      updated_at: '2023-06-20',
    },
    {
      id: '3',
      asset_number: 'AST-003',
      name: '打印机-01',
      category: '办公设备',
      brand: '惠普',
      model: 'LaserJet Pro',
      purchase_date: '2024-03-10',
      purchase_amount: 2800,
      location: '行政部',
      status: 'in_use',
      created_at: '2024-03-10',
      updated_at: '2024-03-10',
    },
    {
      id: '4',
      asset_number: 'AST-004',
      name: '投影仪-01',
      category: '办公设备',
      brand: '爱普生',
      model: 'CB-FH52',
      purchase_date: '2024-02-28',
      purchase_amount: 5200,
      location: '会议室A',
      status: 'in_use',
      created_at: '2024-02-28',
      updated_at: '2024-02-28',
    },
    {
      id: '5',
      asset_number: 'AST-005',
      name: '空调-01',
      category: '办公设备',
      brand: '格力',
      model: 'KFR-72LW',
      purchase_date: '2023-08-15',
      purchase_amount: 8900,
      location: '大会议室',
      status: 'in_use',
      created_at: '2023-08-15',
      updated_at: '2023-08-15',
    },
    {
      id: '6',
      asset_number: 'AST-006',
      name: '办公桌-01',
      category: '办公家具',
      brand: '美时',
      model: 'A系列',
      purchase_date: '2024-01-05',
      purchase_amount: 1200,
      location: '财务部',
      status: 'in_use',
      created_at: '2024-01-05',
      updated_at: '2024-01-05',
    },
    {
      id: '7',
      asset_number: 'AST-007',
      name: '笔记本电脑-01',
      category: '电脑设备',
      brand: '苹果',
      model: 'MacBook Pro',
      purchase_date: '2024-04-20',
      purchase_amount: 12999,
      location: '市场部',
      status: 'in_use',
      created_at: '2024-04-20',
      updated_at: '2024-04-20',
    },
    {
      id: '8',
      asset_number: 'AST-008',
      name: '监控摄像头-01',
      category: '网络设备',
      brand: '海康威视',
      model: 'DS-2CD3T46WD-I3',
      purchase_date: '2023-12-10',
      purchase_amount: 650,
      location: '大门',
      status: 'in_use',
      created_at: '2023-12-10',
      updated_at: '2023-12-10',
    },
    {
      id: '9',
      asset_number: 'AST-009',
      name: '路由器-01',
      category: '网络设备',
      brand: '华为',
      model: 'AR6140-S',
      purchase_date: '2023-11-25',
      purchase_amount: 3200,
      location: '机房',
      status: 'in_use',
      created_at: '2023-11-25',
      updated_at: '2023-11-25',
    },
    {
      id: '10',
      asset_number: 'AST-010',
      name: '复印机-01',
      category: '办公设备',
      brand: '佳能',
      model: 'iR-ADV C3525',
      purchase_date: '2023-09-18',
      purchase_amount: 18500,
      location: '文印室',
      status: 'maintenance',
      created_at: '2023-09-18',
      updated_at: '2023-09-18',
    },
    {
      id: '11',
      asset_number: 'AST-011',
      name: '汽车-01',
      category: '运输工具',
      brand: '大众',
      model: '迈腾',
      purchase_date: '2022-05-20',
      purchase_amount: 230000,
      location: '车库',
      status: 'in_use',
      created_at: '2022-05-20',
      updated_at: '2022-05-20',
    },
    {
      id: '12',
      asset_number: 'AST-012',
      name: '软件许可证-01',
      category: '软件资产',
      brand: '微软',
      model: 'Office 365',
      purchase_date: '2024-01-01',
      purchase_amount: 3650,
      location: '全公司',
      status: 'in_use',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
  ];

  const filteredAssets = useMemo(() => {
    let result = mockAssets;
    if (searchTerm) {
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.asset_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((a) => a.status === statusFilter);
    }
    if (categoryFilter !== 'all') {
      result = result.filter((a) => a.category === categoryFilter);
    }
    return result;
  }, [searchTerm, statusFilter, categoryFilter]);

  const { isLoading } = useQuery({
    queryKey: [
      QUERY_KEYS.ERP.ASSETS,
      searchTerm,
      statusFilter,
      categoryFilter,
      currentPage,
      pageSize,
    ],
    queryFn: async () => ({
      items: filteredAssets,
      total: filteredAssets.length,
      page: currentPage - 1,
      pagesize: pageSize,
    }),
  });

  const assets = filteredAssets;
  const total = filteredAssets.length;

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '创建成功',
        message: '新资产已创建',
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ERP.ASSETS] });
      setShowDialog(false);
      resetForm();
    },
    onError: (error) => {
      apiLogger.error('创建失败:', error);
      addNotification({
        type: 'error',
        title: '创建失败',
        message: '无法创建资产',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '更新成功',
        message: '资产信息已更新',
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ERP.ASSETS] });
      setShowDialog(false);
      resetForm();
    },
    onError: (error) => {
      apiLogger.error('更新失败:', error);
      addNotification({
        type: 'error',
        title: '更新失败',
        message: '无法更新资产',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '资产已删除',
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ERP.ASSETS] });
    },
    onError: (error) => {
      apiLogger.error('删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除资产',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAsset) {
      await updateMutation.mutateAsync({ id: selectedAsset.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这个资产吗?')) return;
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const handleEdit = useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    setFormData({
      asset_number: asset.asset_number,
      name: asset.name,
      category: asset.category || '',
      brand: asset.brand || '',
      model: asset.model || '',
      purchase_date: asset.purchase_date || '',
      purchase_amount: asset.purchase_amount || 0,
      location: asset.location || '',
      responsible_id: asset.responsible_id || '',
      status: asset.status,
      description: '',
    });
    setShowDialog(true);
  }, []);

  const handleViewDetail = useCallback((asset: Asset) => {
    setSelectedAsset(asset);
    setShowDetailDialog(true);
  }, []);

  const resetForm = () => {
    setSelectedAsset(null);
    setFormData({
      asset_number: '',
      name: '',
      category: '',
      brand: '',
      model: '',
      purchase_date: '',
      purchase_amount: 0,
      location: '',
      responsible_id: '',
      status: 'active',
      description: '',
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
      in_use: { label: '使用中', bg: 'success.lighter', color: 'success.700' },
      idle: { label: '闲置', bg: 'info.lighter', color: 'info.700' },
      maintenance: { label: '维修中', bg: 'warning.lighter', color: 'warning.700' },
      retired: { label: '已报废', bg: 'error.lighter', color: 'error.dark' },
      inventory: { label: '库存', bg: 'grey.100', color: 'text.secondary' },
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

  const columns: ColumnDef<Asset>[] = useMemo(
    () => [
      { id: 'asset_number', label: '资产编号', sortable: true, width: 120 },
      { id: 'name', label: '资产名称', sortable: true, width: 150 },
      { id: 'category', label: '分类', width: 100 },
      {
        id: 'brand',
        label: '品牌/型号',
        width: 180,
        render: (row) =>
          row.brand && row.model ? `${row.brand} ${row.model}` : row.brand || row.model || '-',
      },
      {
        id: 'purchase_amount',
        label: '购入金额',
        width: 120,
        align: 'right',
        render: (row) =>
          row.purchase_amount
            ? `¥${row.purchase_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
            : '-',
      },
      {
        id: 'purchase_date',
        label: '购入日期',
        sortable: true,
        width: 120,
        render: (row) =>
          row.purchase_date ? new Date(row.purchase_date).toLocaleDateString('zh-CN') : '-',
      },
      { id: 'location', label: '存放位置', width: 120 },
      {
        id: 'status',
        label: '状态',
        width: 100,
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
          { label: '使用中', value: 'in_use' },
          { label: '闲置', value: 'idle' },
          { label: '维修中', value: 'maintenance' },
          { label: '已报废', value: 'retired' },
          { label: '库存', value: 'inventory' },
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
          { label: '办公设备', value: '办公设备' },
          { label: '电脑设备', value: '电脑设备' },
          { label: '服务器', value: '服务器' },
          { label: '网络设备', value: '网络设备' },
          { label: '办公家具', value: '办公家具' },
          { label: '运输工具', value: '运输工具' },
          { label: '软件资产', value: '软件资产' },
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

  const rowActions: RowAction<Asset>[] = useMemo(
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
        label: '调拨',
        icon: <MapPin size={16} />,
        onClick: () => {},
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个资产吗?',
        divider: true,
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
      total: assets.length,
      inUse: assets.filter((a) => a.status === 'in_use').length,
      idle: assets.filter((a) => a.status === 'idle').length,
      maintenance: assets.filter((a) => a.status === 'maintenance').length,
    };
  }, [assets]);

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
          资产总数
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
          使用中
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.inUse}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          闲置
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.idle}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          维修中
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.maintenance}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='资产列表'
      subtitle='管理企业固定资产信息'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={assets}
        loading={isLoading}
        filters={filters}
        searchable
        searchPlaceholder='搜索资产编号、名称、品牌、位置...'
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
            label: '新增资产',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无资产数据'
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='lg'
      >
        <DialogTitle>{selectedAsset ? '编辑资产' : '新增资产'}</DialogTitle>
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
            {selectedAsset ? '修改资产信息' : '填写新资产信息'}
          </Box>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='asset_number'>资产编号 *</InputLabel>
                <TextField
                  id='asset_number'
                  required
                  size='small'
                  value={formData.asset_number}
                  onChange={(e) => setFormData({ ...formData, asset_number: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='name'>资产名称 *</InputLabel>
                <TextField
                  id='name'
                  required
                  size='small'
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='category'>分类</InputLabel>
                <TextField
                  id='category'
                  size='small'
                  select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value=''>请选择分类</option>
                  <option value='办公设备'>办公设备</option>
                  <option value='电脑设备'>电脑设备</option>
                  <option value='服务器'>服务器</option>
                  <option value='网络设备'>网络设备</option>
                  <option value='办公家具'>办公家具</option>
                  <option value='运输工具'>运输工具</option>
                  <option value='软件资产'>软件资产</option>
                </TextField>
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
                <InputLabel htmlFor='model'>型号</InputLabel>
                <TextField
                  id='model'
                  size='small'
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='purchase_amount'>购入金额</InputLabel>
                <TextField
                  id='purchase_amount'
                  type='number'
                  size='small'
                  value={formData.purchase_amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      purchase_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='purchase_date'>购入日期</InputLabel>
                <TextField
                  id='purchase_date'
                  type='date'
                  size='small'
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='location'>存放位置</InputLabel>
                <TextField
                  id='location'
                  size='small'
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='status'>状态</InputLabel>
                <TextField
                  id='status'
                  size='small'
                  select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value='in_use'>使用中</option>
                  <option value='idle'>闲置</option>
                  <option value='maintenance'>维修中</option>
                  <option value='retired'>已报废</option>
                  <option value='inventory'>库存</option>
                </TextField>
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
        maxWidth='lg'
      >
        <DialogTitle>资产详情</DialogTitle>
        <DialogContent>
          {selectedAsset && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>资产编号</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedAsset.asset_number}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>资产名称</InputLabel>
                  <Box component='span'>{selectedAsset.name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>分类</InputLabel>
                  <Box component='span'>{selectedAsset.category || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>品牌</InputLabel>
                  <Box component='span'>{selectedAsset.brand || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>型号</InputLabel>
                  <Box component='span'>{selectedAsset.model || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>购入金额</InputLabel>
                  <Box component='span'>
                    {selectedAsset.purchase_amount
                      ? `¥${selectedAsset.purchase_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>购入日期</InputLabel>
                  <Box component='span'>
                    {selectedAsset.purchase_date
                      ? new Date(selectedAsset.purchase_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>存放位置</InputLabel>
                  <Box component='span'>{selectedAsset.location || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedAsset.status)}</Box>
                </Box>
                {selectedAsset.serial_number && (
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>序列号</InputLabel>
                    <Box component='span'>{selectedAsset.serial_number}</Box>
                  </Box>
                )}
                {selectedAsset.manufacturer && (
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>制造商</InputLabel>
                    <Box component='span'>{selectedAsset.manufacturer}</Box>
                  </Box>
                )}
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedAsset.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default AssetListPage;
