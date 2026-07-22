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
import type { Asset, FixedAsset, PaginationParams } from '@/api/erp';
import { assetApi, fixedAssetApi } from '@/api/erp';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Edit, Trash2, Eye, Save, Building2, Hammer } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

type AssetFormData = {
  name: string;
  asset_number: string;
  category?: string;
  brand?: string;
  model?: string;
  purchase_date?: string;
  purchase_amount?: number;
  location?: string;
  responsible_id?: string;
  status: string;
  serial_number?: string;
  manufacturer?: string;
  rated_power?: number;
  rated_voltage?: number;
  rated_current?: number;
  specifications?: string;
  image_url?: string;
  department?: string;
};

type FixedAssetFormData = {
  asset_code: string;
  asset_name: string;
  asset_type: string;
  asset_category?: string;
  purchase_date: string;
  original_value: number;
  accumulated_depreciation: number;
  net_value: number;
  depreciation_method: string;
  expected_life: number;
  salvage_value: number;
  monthly_depreciation: number;
  location?: string;
  responsible_id?: string;
  department_id?: string;
  status: string;
};

const AssetManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Asset | FixedAsset | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assetForm, setAssetForm] = useState<AssetFormData>({
    name: '',
    asset_number: '',
    category: '',
    brand: '',
    model: '',
    purchase_date: '',
    purchase_amount: 0,
    location: '',
    responsible_id: '',
    status: 'active',
    serial_number: '',
    manufacturer: '',
    rated_power: 0,
    rated_voltage: 0,
    rated_current: 0,
    specifications: '',
    image_url: '',
    department: '',
  });
  const [fixedAssetForm, setFixedAssetForm] = useState<FixedAssetFormData>({
    asset_code: '',
    asset_name: '',
    asset_type: '',
    asset_category: '',
    purchase_date: '',
    original_value: 0,
    accumulated_depreciation: 0,
    net_value: 0,
    depreciation_method: 'straight_line',
    expected_life: 0,
    salvage_value: 0,
    monthly_depreciation: 0,
    location: '',
    responsible_id: '',
    department_id: '',
    status: 'active',
  });

  const params: PaginationParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data: assetsData, isLoading: assetsLoading } = useQuery({
    queryKey: [...QUERY_KEYS.ERP.ASSETS, params],
    queryFn: async () => {
      const response = await assetApi.list(params);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 0,
  });

  const { data: fixedAssetsData, isLoading: fixedAssetsLoading } = useQuery({
    queryKey: [...QUERY_KEYS.ERP.FIXED_ASSETS, params],
    queryFn: async () => {
      const response = await fixedAssetApi.list(params);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 1,
  });

  const assets = assetsData?.items || [];
  const fixedAssets = fixedAssetsData?.items || [];
  const data = activeTab === 0 ? assets : fixedAssets;
  const total = activeTab === 0 ? (assetsData?.total || 0) : (fixedAssetsData?.total || 0);
  const loading = activeTab === 0 ? assetsLoading : fixedAssetsLoading;

  const invalidateData = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.ASSETS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.FIXED_ASSETS });
  };

  const createAssetMutation = useMutation({
    mutationFn: (data: Partial<Asset>) => assetApi.create(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '流动资产已添加' });
      invalidateData();
      setShowDialog(false);
      resetAssetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '添加流动资产失败' });
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Asset> }) =>
      assetApi.update(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '更新成功', message: '流动资产信息已更新' });
      invalidateData();
      setShowDialog(false);
      resetAssetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '更新流动资产失败' });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (id: string) => assetApi.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '流动资产已删除' });
      invalidateData();
    },
    onError: (error: unknown) => {
      apiLogger.error('删除失败:', error);
      addNotification({ type: 'error', title: '删除失败', message: '无法删除流动资产' });
    },
  });

  const createFixedAssetMutation = useMutation({
    mutationFn: (data: Partial<FixedAsset>) => fixedAssetApi.create(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '固定资产已添加' });
      invalidateData();
      setShowDialog(false);
      resetFixedAssetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '添加固定资产失败' });
    },
  });

  const updateFixedAssetMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FixedAsset> }) =>
      fixedAssetApi.update(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '更新成功', message: '固定资产信息已更新' });
      invalidateData();
      setShowDialog(false);
      resetFixedAssetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '更新固定资产失败' });
    },
  });

  const deleteFixedAssetMutation = useMutation({
    mutationFn: (id: string) => fixedAssetApi.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '固定资产已删除' });
      invalidateData();
    },
    onError: (error: unknown) => {
      apiLogger.error('删除失败:', error);
      addNotification({ type: 'error', title: '删除失败', message: '无法删除固定资产' });
    },
  });

  const depreciateMutation = useMutation({
    mutationFn: (id: string) =>
      fixedAssetApi.depreciate({ asset_ids: [id], period: new Date().toISOString().slice(0, 7) }),
    onSuccess: () => {
      addNotification({ type: 'success', title: '折旧成功', message: '固定资产折旧已计算' });
      invalidateData();
    },
    onError: (error: unknown) => {
      apiLogger.error('折旧失败:', error);
      addNotification({ type: 'error', title: '折旧失败', message: '无法计算折旧' });
    },
  });

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      active: '在用',
      idle: '闲置',
      maintenance: '维修中',
      retired: '已报废',
      transferred: '已转移',
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
      active: { label: '在用', bg: 'success.lighter', color: 'success.700' },
      idle: { label: '闲置', bg: 'warning.light', color: 'warning.700' },
      maintenance: { label: '维修中', bg: 'info.light', color: 'info.700' },
      retired: { label: '已报废', bg: 'error.lighter', color: 'error.dark' },
      transferred: { label: '已转移', bg: 'grey.100', color: 'text.secondary' },
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

  const handleSubmitAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem && activeTab === 0) {
      updateAssetMutation.mutate({ id: selectedItem.id, data: assetForm });
    } else {
      createAssetMutation.mutate(assetForm);
    }
  };

  const handleSubmitFixedAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem && activeTab === 1) {
      updateFixedAssetMutation.mutate({ id: selectedItem.id, data: fixedAssetForm });
    } else {
      createFixedAssetMutation.mutate(fixedAssetForm);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('确定要删除这个资产吗?')) return;
    if (activeTab === 0) {
      deleteAssetMutation.mutate(id);
    } else {
      deleteFixedAssetMutation.mutate(id);
    }
  };

  const handleEdit = (item: Asset | FixedAsset) => {
    setSelectedItem(item);
    if (activeTab === 0) {
      const a = item as Asset;
      setAssetForm({
        name: a.name || '',
        asset_number: a.asset_number || '',
        category: a.category || '',
        brand: a.brand || '',
        model: a.model || '',
        purchase_date: a.purchase_date || '',
        purchase_amount: a.purchase_amount || 0,
        location: a.location || '',
        responsible_id: a.responsible_id || '',
        status: a.status || 'active',
        serial_number: a.serial_number || '',
        manufacturer: a.manufacturer || '',
        rated_power: a.rated_power || 0,
        rated_voltage: a.rated_voltage || 0,
        rated_current: a.rated_current || 0,
        specifications: a.specifications || '',
        image_url: a.image_url || '',
        department: a.department || '',
      });
    } else {
      const fa = item as FixedAsset;
      setFixedAssetForm({
        asset_code: fa.asset_code || '',
        asset_name: fa.asset_name || '',
        asset_type: fa.asset_type || '',
        asset_category: fa.asset_category || '',
        purchase_date: fa.purchase_date || '',
        original_value: fa.original_value || 0,
        accumulated_depreciation: fa.accumulated_depreciation || 0,
        net_value: fa.net_value || 0,
        depreciation_method: fa.depreciation_method || 'straight_line',
        expected_life: fa.expected_life || 0,
        salvage_value: fa.salvage_value || 0,
        monthly_depreciation: fa.monthly_depreciation || 0,
        location: fa.location || '',
        responsible_id: fa.responsible_id || '',
        department_id: fa.department_id || '',
        status: fa.status || 'active',
      });
    }
    setShowDialog(true);
  };

  const handleViewDetail = (item: Asset | FixedAsset) => {
    setSelectedItem(item);
    setShowDetailDialog(true);
  };

  const resetAssetForm = () => {
    setAssetForm({
      name: '',
      asset_number: '',
      category: '',
      brand: '',
      model: '',
      purchase_date: '',
      purchase_amount: 0,
      location: '',
      responsible_id: '',
      status: 'active',
      serial_number: '',
      manufacturer: '',
      rated_power: 0,
      rated_voltage: 0,
      rated_current: 0,
      specifications: '',
      image_url: '',
      department: '',
    });
  };

  const resetFixedAssetForm = () => {
    setFixedAssetForm({
      asset_code: '',
      asset_name: '',
      asset_type: '',
      asset_category: '',
      purchase_date: '',
      original_value: 0,
      accumulated_depreciation: 0,
      net_value: 0,
      depreciation_method: 'straight_line',
      expected_life: 0,
      salvage_value: 0,
      monthly_depreciation: 0,
      location: '',
      responsible_id: '',
      department_id: '',
      status: 'active',
    });
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const assetColumns: ColumnDef<Asset>[] = useMemo(
    () => [
      { id: 'name', label: '资产名称', accessorKey: 'name', sortable: true },
      {
        id: 'asset_number',
        label: '资产编号',
        accessorKey: 'asset_number',
      },
      {
        id: 'category',
        label: '类别',
        render: (row) => row.category || '-',
      },
      {
        id: 'department',
        label: '所属部门',
        render: (row) => row.department || '-',
      },
      {
        id: 'purchase_amount',
        label: '购置金额',
        render: (row) => `¥${(row.purchase_amount || 0).toFixed(2)}`,
        sortable: true,
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
    []
  );

  const fixedAssetColumns: ColumnDef<FixedAsset>[] = useMemo(
    () => [
      { id: 'asset_name', label: '资产名称', accessorKey: 'asset_name', sortable: true },
      {
        id: 'asset_code',
        label: '资产编码',
        accessorKey: 'asset_code',
      },
      {
        id: 'asset_category',
        label: '类别',
        render: (row) => row.asset_category || '-',
      },
      {
        id: 'department_id',
        label: '部门ID',
        render: (row) => row.department_id || '-',
      },
      {
        id: 'original_value',
        label: '原值',
        render: (row) => `¥${(row.original_value || 0).toFixed(2)}`,
        sortable: true,
      },
      {
        id: 'net_value',
        label: '净值',
        render: (row) => `¥${(row.net_value || 0).toFixed(2)}`,
        sortable: true,
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
    []
  );

  const columns = (activeTab === 0 ? assetColumns : fixedAssetColumns) as ColumnDef<
    Asset | FixedAsset
  >[];

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '在用', value: 'active' },
          { label: '闲置', value: 'idle' },
          { label: '维修中', value: 'maintenance' },
          { label: '已报废', value: 'retired' },
          { label: '已转移', value: 'transferred' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const rowActions = useMemo<RowAction<Asset | FixedAsset>[]>(
    () => {
      const actions: RowAction<Asset | FixedAsset>[] = [
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
      ];
      if (activeTab === 1) {
        actions.push({
          label: '计算折旧',
          icon: <Hammer size={16} />,
          color: 'info',
          onClick: (row: Asset | FixedAsset) => depreciateMutation.mutate(row.id),
          confirm: true,
          confirmMessage: '确定要计算该资产的折旧吗?',
        });
      }
      actions.push({
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row: Asset | FixedAsset) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个资产吗?',
      });
      return actions;
    },
    [activeTab]
  );

  const handleOpenCreate = () => {
    setSelectedItem(null);
    if (activeTab === 0) {
      resetAssetForm();
    } else {
      resetFixedAssetForm();
    }
    setShowDialog(true);
  };

  const totalAssetValue = assets.reduce((sum, item) => sum + (item.purchase_amount || 0), 0);
  const totalFixedAssetValue = fixedAssets.reduce((sum, item) => sum + (item.original_value || 0), 0);
  const totalValue = activeTab === 0 ? totalAssetValue : totalFixedAssetValue;
  const activeCount = data.filter((item) => item.status === 'active').length;

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
          <Building2 size={18} sx={{ color: 'secondary.700' }} />
          <Box component='span' sx={{ color: 'text.secondary', fontSize: 14 }}>
            资产总数
          </Box>
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'secondary.700' }}>{data.length}</Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>资产总值</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>
          ¥{totalValue.toFixed(2)}
        </Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>在用资产</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>{activeCount}</Box>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
        <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>报废/转移</Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'error.dark' }}>
          {data.filter((item) => ['retired', 'transferred'].includes(item.status)).length}
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
        pageIcon: <Building2 style={{ width: 20, height: 20 }} />,
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
        <Tab label='流动资产' icon={<Building2 size={16} />} />
        <Tab label='固定资产' icon={<Hammer size={16} />} />
      </Tabs>

      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={data}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索资产名称...'
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
            label: `新增${activeTab === 0 ? '流动' : '固定'}资产`,
            icon: <Save size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage={`暂无${activeTab === 0 ? '流动' : '固定'}资产数据`}
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedItem ? '编辑资产' : `新增${activeTab === 0 ? '流动' : '固定'}资产`}</DialogTitle>
        <DialogContent>
          {activeTab === 0 ? (
            <form onSubmit={handleSubmitAsset}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                  py: 2,
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='asset_name'>资产名称 *</InputLabel>
                  <TextField
                    id='asset_name'
                    required
                    size='small'
                    value={assetForm.name}
                    onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='asset_number'>资产编号</InputLabel>
                  <TextField
                    id='asset_number'
                    size='small'
                    value={assetForm.asset_number || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, asset_number: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='category'>类别</InputLabel>
                  <TextField
                    id='category'
                    size='small'
                    value={assetForm.category || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='brand'>品牌</InputLabel>
                  <TextField
                    id='brand'
                    size='small'
                    value={assetForm.brand || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, brand: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='model'>型号</InputLabel>
                  <TextField
                    id='model'
                    size='small'
                    value={assetForm.model || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, model: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='serial_number'>序列号</InputLabel>
                  <TextField
                    id='serial_number'
                    size='small'
                    value={assetForm.serial_number || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, serial_number: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='manufacturer'>制造商</InputLabel>
                  <TextField
                    id='manufacturer'
                    size='small'
                    value={assetForm.manufacturer || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, manufacturer: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='department'>所属部门</InputLabel>
                  <TextField
                    id='department'
                    size='small'
                    value={assetForm.department || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, department: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='location'>存放位置</InputLabel>
                  <TextField
                    id='location'
                    size='small'
                    value={assetForm.location || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='responsible_id'>负责人ID</InputLabel>
                  <TextField
                    id='responsible_id'
                    size='small'
                    value={assetForm.responsible_id || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, responsible_id: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='purchase_date'>购置日期</InputLabel>
                  <TextField
                    id='purchase_date'
                    size='small'
                    type='date'
                    value={assetForm.purchase_date || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, purchase_date: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='purchase_amount'>购置金额</InputLabel>
                  <TextField
                    id='purchase_amount'
                    size='small'
                    type='number'
                    value={assetForm.purchase_amount}
                    onChange={(e) =>
                      setAssetForm({ ...assetForm, purchase_amount: parseFloat(e.target.value) || 0 })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='rated_power'>额定功率(kW)</InputLabel>
                  <TextField
                    id='rated_power'
                    size='small'
                    type='number'
                    value={assetForm.rated_power}
                    onChange={(e) =>
                      setAssetForm({ ...assetForm, rated_power: parseFloat(e.target.value) || 0 })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='rated_voltage'>额定电压(V)</InputLabel>
                  <TextField
                    id='rated_voltage'
                    size='small'
                    type='number'
                    value={assetForm.rated_voltage}
                    onChange={(e) =>
                      setAssetForm({ ...assetForm, rated_voltage: parseFloat(e.target.value) || 0 })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='rated_current'>额定电流(A)</InputLabel>
                  <TextField
                    id='rated_current'
                    size='small'
                    type='number'
                    value={assetForm.rated_current}
                    onChange={(e) =>
                      setAssetForm({ ...assetForm, rated_current: parseFloat(e.target.value) || 0 })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: '1 / -1' }}>
                  <InputLabel htmlFor='specifications'>规格说明</InputLabel>
                  <TextField
                    id='specifications'
                    size='small'
                    multiline
                    rows={2}
                    value={assetForm.specifications || ''}
                    onChange={(e) => setAssetForm({ ...assetForm, specifications: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='status'>状态</InputLabel>
                  <FormControl fullWidth size='small'>
                    <Select
                      id='status'
                      value={assetForm.status || 'active'}
                      onChange={(e) => setAssetForm({ ...assetForm, status: e.target.value })}
                    >
                      <MenuItem value='active'>在用</MenuItem>
                      <MenuItem value='idle'>闲置</MenuItem>
                      <MenuItem value='maintenance'>维修中</MenuItem>
                      <MenuItem value='retired'>已报废</MenuItem>
                      <MenuItem value='transferred'>已转移</MenuItem>
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
          ) : (
            <form onSubmit={handleSubmitFixedAsset}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                  py: 2,
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='fa_asset_name'>资产名称 *</InputLabel>
                  <TextField
                    id='fa_asset_name'
                    required
                    size='small'
                    value={fixedAssetForm.asset_name}
                    onChange={(e) => setFixedAssetForm({ ...fixedAssetForm, asset_name: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='fa_asset_code'>资产编码 *</InputLabel>
                  <TextField
                    id='fa_asset_code'
                    required
                    size='small'
                    value={fixedAssetForm.asset_code}
                    onChange={(e) => setFixedAssetForm({ ...fixedAssetForm, asset_code: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='fa_asset_type'>资产类型</InputLabel>
                  <TextField
                    id='fa_asset_type'
                    size='small'
                    value={fixedAssetForm.asset_type || ''}
                    onChange={(e) => setFixedAssetForm({ ...fixedAssetForm, asset_type: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='fa_asset_category'>资产类别</InputLabel>
                  <TextField
                    id='fa_asset_category'
                    size='small'
                    value={fixedAssetForm.asset_category || ''}
                    onChange={(e) => setFixedAssetForm({ ...fixedAssetForm, asset_category: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='fa_department_id'>部门ID</InputLabel>
                  <TextField
                    id='fa_department_id'
                    size='small'
                    value={fixedAssetForm.department_id || ''}
                    onChange={(e) => setFixedAssetForm({ ...fixedAssetForm, department_id: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='fa_location'>存放位置</InputLabel>
                  <TextField
                    id='fa_location'
                    size='small'
                    value={fixedAssetForm.location || ''}
                    onChange={(e) => setFixedAssetForm({ ...fixedAssetForm, location: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='fa_responsible_id'>负责人ID</InputLabel>
                  <TextField
                    id='fa_responsible_id'
                    size='small'
                    value={fixedAssetForm.responsible_id || ''}
                    onChange={(e) => setFixedAssetForm({ ...fixedAssetForm, responsible_id: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='fa_purchase_date'>购入日期 *</InputLabel>
                  <TextField
                    id='fa_purchase_date'
                    required
                    size='small'
                    type='date'
                    value={fixedAssetForm.purchase_date || ''}
                    onChange={(e) => setFixedAssetForm({ ...fixedAssetForm, purchase_date: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='fa_original_value'>原值 *</InputLabel>
                  <TextField
                    id='fa_original_value'
                    required
                    size='small'
                    type='number'
                    value={fixedAssetForm.original_value}
                    onChange={(e) =>
                      setFixedAssetForm({ ...fixedAssetForm, original_value: parseFloat(e.target.value) || 0 })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='fa_accumulated_depreciation'>累计折旧</InputLabel>
                  <TextField
                    id='fa_accumulated_depreciation'
                    size='small'
                    type='number'
                    value={fixedAssetForm.accumulated_depreciation}
                    onChange={(e) =>
                      setFixedAssetForm({ ...fixedAssetForm, accumulated_depreciation: parseFloat(e.target.value) || 0 })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='fa_net_value'>净值</InputLabel>
                  <TextField
                    id='fa_net_value'
                    size='small'
                    type='number'
                    value={fixedAssetForm.net_value}
                    onChange={(e) =>
                      setFixedAssetForm({ ...fixedAssetForm, net_value: parseFloat(e.target.value) || 0 })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='fa_depreciation_method'>折旧方法</InputLabel>
                  <FormControl fullWidth size='small'>
                    <Select
                      id='fa_depreciation_method'
                      value={fixedAssetForm.depreciation_method || 'straight_line'}
                      onChange={(e) =>
                        setFixedAssetForm({ ...fixedAssetForm, depreciation_method: e.target.value })
                      }
                    >
                      <MenuItem value='straight_line'>直线法</MenuItem>
                      <MenuItem value='double_declining'>双倍余额递减法</MenuItem>
                      <MenuItem value='units_of_production'>工作量法</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='fa_expected_life'>预计使用年限(年)</InputLabel>
                  <TextField
                    id='fa_expected_life'
                    size='small'
                    type='number'
                    value={fixedAssetForm.expected_life}
                    onChange={(e) =>
                      setFixedAssetForm({ ...fixedAssetForm, expected_life: parseInt(e.target.value) || 0 })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='fa_salvage_value'>残值</InputLabel>
                  <TextField
                    id='fa_salvage_value'
                    size='small'
                    type='number'
                    value={fixedAssetForm.salvage_value}
                    onChange={(e) =>
                      setFixedAssetForm({ ...fixedAssetForm, salvage_value: parseFloat(e.target.value) || 0 })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='fa_monthly_depreciation'>月折旧额</InputLabel>
                  <TextField
                    id='fa_monthly_depreciation'
                    size='small'
                    type='number'
                    value={fixedAssetForm.monthly_depreciation}
                    onChange={(e) =>
                      setFixedAssetForm({ ...fixedAssetForm, monthly_depreciation: parseFloat(e.target.value) || 0 })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='fa_status'>状态</InputLabel>
                  <FormControl fullWidth size='small'>
                    <Select
                      id='fa_status'
                      value={fixedAssetForm.status || 'active'}
                      onChange={(e) => setFixedAssetForm({ ...fixedAssetForm, status: e.target.value })}
                    >
                      <MenuItem value='active'>在用</MenuItem>
                      <MenuItem value='idle'>闲置</MenuItem>
                      <MenuItem value='maintenance'>维修中</MenuItem>
                      <MenuItem value='retired'>已报废</MenuItem>
                      <MenuItem value='transferred'>已转移</MenuItem>
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
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>资产详情</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {activeTab === 0 ? (
                  <>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>资产名称</InputLabel>
                      <Box sx={{ fontWeight: 500 }}>{(selectedItem as Asset).name}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>资产编号</InputLabel>
                      <Box component='span'>{(selectedItem as Asset).asset_number || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>类别</InputLabel>
                      <Box component='span'>{(selectedItem as Asset).category || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>品牌</InputLabel>
                      <Box component='span'>{(selectedItem as Asset).brand || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>型号</InputLabel>
                      <Box component='span'>{(selectedItem as Asset).model || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>序列号</InputLabel>
                      <Box component='span'>{(selectedItem as Asset).serial_number || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>制造商</InputLabel>
                      <Box component='span'>{(selectedItem as Asset).manufacturer || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>所属部门</InputLabel>
                      <Box component='span'>{(selectedItem as Asset).department || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>存放位置</InputLabel>
                      <Box component='span'>{(selectedItem as Asset).location || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>购置日期</InputLabel>
                      <Box component='span'>
                        {(() => {
                          const date = (selectedItem as Asset).purchase_date;
                          return date ? new Date(date).toLocaleDateString('zh-CN') : '-';
                        })()}
                      </Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>购置金额</InputLabel>
                      <Box component='span'>¥{(selectedItem as Asset).purchase_amount?.toFixed(2) || '0.00'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>额定功率</InputLabel>
                      <Box component='span'>{(selectedItem as Asset).rated_power || 0} kW</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>额定电压</InputLabel>
                      <Box component='span'>{(selectedItem as Asset).rated_voltage || 0} V</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>额定电流</InputLabel>
                      <Box component='span'>{(selectedItem as Asset).rated_current || 0} A</Box>
                    </Box>
                    {(selectedItem as Asset).specifications && (
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>规格说明</InputLabel>
                        <Box>{(selectedItem as Asset).specifications}</Box>
                      </Box>
                    )}
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                      <Box>{getStatusBadge(selectedItem.status)}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                      <Box component='span'>{new Date(selectedItem.created_at).toLocaleString('zh-CN')}</Box>
                    </Box>
                  </>
                ) : (
                  <>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>资产名称</InputLabel>
                      <Box sx={{ fontWeight: 500 }}>{(selectedItem as FixedAsset).asset_name}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>资产编码</InputLabel>
                      <Box component='span'>{(selectedItem as FixedAsset).asset_code || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>资产类型</InputLabel>
                      <Box component='span'>{(selectedItem as FixedAsset).asset_type || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>资产类别</InputLabel>
                      <Box component='span'>{(selectedItem as FixedAsset).asset_category || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>部门ID</InputLabel>
                      <Box component='span'>{(selectedItem as FixedAsset).department_id || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>存放位置</InputLabel>
                      <Box component='span'>{(selectedItem as FixedAsset).location || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>购入日期</InputLabel>
                      <Box component='span'>
                        {(() => {
                          const date = (selectedItem as FixedAsset).purchase_date;
                          return date ? new Date(date).toLocaleDateString('zh-CN') : '-';
                        })()}
                      </Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>原值</InputLabel>
                      <Box component='span'>¥{(selectedItem as FixedAsset).original_value?.toFixed(2) || '0.00'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>累计折旧</InputLabel>
                      <Box component='span'>
                        ¥{(selectedItem as FixedAsset).accumulated_depreciation?.toFixed(2) || '0.00'}
                      </Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>净值</InputLabel>
                      <Box component='span'>¥{(selectedItem as FixedAsset).net_value?.toFixed(2) || '0.00'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>折旧方法</InputLabel>
                      <Box component='span'>{(selectedItem as FixedAsset).depreciation_method || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>预计使用年限</InputLabel>
                      <Box component='span'>{(selectedItem as FixedAsset).expected_life || 0} 年</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>残值</InputLabel>
                      <Box component='span'>¥{(selectedItem as FixedAsset).salvage_value?.toFixed(2) || '0.00'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>月折旧额</InputLabel>
                      <Box component='span'>
                        ¥{(selectedItem as FixedAsset).monthly_depreciation?.toFixed(2) || '0.00'}
                      </Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                      <Box>{getStatusBadge(selectedItem.status)}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                      <Box component='span'>{new Date(selectedItem.created_at).toLocaleString('zh-CN')}</Box>
                    </Box>
                  </>
                )}
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

export default AssetManagementPage;
