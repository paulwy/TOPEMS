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
  type BatchAction,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye, Calculator, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import type { FixedAsset } from '@/api/erp/types';

const DepreciationPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDepreciateDialog, setShowDepreciateDialog] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [depreciatePeriod, setDepreciatePeriod] = useState('');
  const [formData, setFormData] = useState({
    asset_code: '',
    asset_name: '',
    asset_type: '',
    asset_category: '',
    purchase_date: '',
    original_value: 0,
    accumulated_depreciation: 0,
    net_value: 0,
    depreciation_method: 'straight_line',
    expected_life: 3,
    salvage_value: 0,
    monthly_depreciation: 0,
    location: '',
    department_id: '',
    status: 'active',
  });

  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const mockAssets: FixedAsset[] = [
    {
      id: '1',
      asset_code: 'FA-001',
      asset_name: '办公电脑-01',
      asset_type: 'computer',
      asset_category: '电脑设备',
      purchase_date: '2022-01-15',
      original_value: 8500,
      accumulated_depreciation: 5100,
      net_value: 3400,
      depreciation_method: 'straight_line',
      expected_life: 3,
      salvage_value: 0,
      monthly_depreciation: 236.11,
      location: '研发部',
      status: 'active',
      created_at: '2022-01-15',
      updated_at: '2024-01-15',
    },
    {
      id: '2',
      asset_code: 'FA-002',
      asset_name: '服务器-01',
      asset_type: 'server',
      asset_category: '服务器',
      purchase_date: '2021-06-20',
      original_value: 45000,
      accumulated_depreciation: 33750,
      net_value: 11250,
      depreciation_method: 'straight_line',
      expected_life: 5,
      salvage_value: 4500,
      monthly_depreciation: 675,
      location: '机房',
      status: 'active',
      created_at: '2021-06-20',
      updated_at: '2024-01-15',
    },
    {
      id: '3',
      asset_code: 'FA-003',
      asset_name: '打印机-01',
      asset_type: 'printer',
      asset_category: '办公设备',
      purchase_date: '2022-03-10',
      original_value: 2800,
      accumulated_depreciation: 1866.67,
      net_value: 933.33,
      depreciation_method: 'straight_line',
      expected_life: 3,
      salvage_value: 0,
      monthly_depreciation: 77.78,
      location: '行政部',
      status: 'active',
      created_at: '2022-03-10',
      updated_at: '2024-01-15',
    },
    {
      id: '4',
      asset_code: 'FA-004',
      asset_name: '投影仪-01',
      asset_type: 'projector',
      asset_category: '办公设备',
      purchase_date: '2022-02-28',
      original_value: 5200,
      accumulated_depreciation: 3466.67,
      net_value: 1733.33,
      depreciation_method: 'straight_line',
      expected_life: 3,
      salvage_value: 0,
      monthly_depreciation: 144.44,
      location: '会议室A',
      status: 'active',
      created_at: '2022-02-28',
      updated_at: '2024-01-15',
    },
    {
      id: '5',
      asset_code: 'FA-005',
      asset_name: '空调-01',
      asset_type: 'aircon',
      asset_category: '办公设备',
      purchase_date: '2021-08-15',
      original_value: 8900,
      accumulated_depreciation: 5340,
      net_value: 3560,
      depreciation_method: 'straight_line',
      expected_life: 5,
      salvage_value: 890,
      monthly_depreciation: 133.5,
      location: '大会议室',
      status: 'active',
      created_at: '2021-08-15',
      updated_at: '2024-01-15',
    },
    {
      id: '6',
      asset_code: 'FA-006',
      asset_name: '汽车-01',
      asset_type: 'vehicle',
      asset_category: '运输工具',
      purchase_date: '2020-05-20',
      original_value: 230000,
      accumulated_depreciation: 161000,
      net_value: 69000,
      depreciation_method: 'straight_line',
      expected_life: 5,
      salvage_value: 23000,
      monthly_depreciation: 3450,
      location: '车库',
      status: 'active',
      created_at: '2020-05-20',
      updated_at: '2024-01-15',
    },
    {
      id: '7',
      asset_code: 'FA-007',
      asset_name: '复印机-01',
      asset_type: 'copier',
      asset_category: '办公设备',
      purchase_date: '2021-09-18',
      original_value: 18500,
      accumulated_depreciation: 11100,
      net_value: 7400,
      depreciation_method: 'straight_line',
      expected_life: 5,
      salvage_value: 1850,
      monthly_depreciation: 277.5,
      location: '文印室',
      status: 'depreciated',
      created_at: '2021-09-18',
      updated_at: '2024-01-15',
    },
    {
      id: '8',
      asset_code: 'FA-008',
      asset_name: '路由器-01',
      asset_type: 'network',
      asset_category: '网络设备',
      purchase_date: '2021-11-25',
      original_value: 3200,
      accumulated_depreciation: 2133.33,
      net_value: 1066.67,
      depreciation_method: 'straight_line',
      expected_life: 3,
      salvage_value: 0,
      monthly_depreciation: 88.89,
      location: '机房',
      status: 'active',
      created_at: '2021-11-25',
      updated_at: '2024-01-15',
    },
  ];

  const filteredAssets = useMemo(() => {
    let result = mockAssets;
    if (searchTerm) {
      result = result.filter((a) => {
        return (
          a.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.asset_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.asset_category?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }
    if (statusFilter !== 'all') {
      result = result.filter((a) => a.status === statusFilter);
    }
    return result;
  }, [searchTerm, statusFilter]);

  const { isLoading } = useQuery({
    queryKey: [QUERY_KEYS.FINANCE.ASSET, searchTerm, statusFilter, currentPage, pageSize],
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
    mutationFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '创建成功',
        message: '新固定资产已创建',
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FINANCE.ASSET] });
      setShowDialog(false);
      resetForm();
    },
    onError: (error) => {
      apiLogger.error('创建失败:', error);
      addNotification({
        type: 'error',
        title: '创建失败',
        message: '无法创建固定资产',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '更新成功',
        message: '固定资产信息已更新',
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FINANCE.ASSET] });
      setShowDialog(false);
      resetForm();
    },
    onError: (error) => {
      apiLogger.error('更新失败:', error);
      addNotification({
        type: 'error',
        title: '更新失败',
        message: '无法更新固定资产',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (_id: string) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '固定资产已删除',
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FINANCE.ASSET] });
    },
    onError: (error) => {
      apiLogger.error('删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除固定资产',
      });
    },
  });

  const depreciateMutation = useMutation({
    mutationFn: async (data: { period: string; asset_ids?: string[] }) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        success: true,
        data: { depreciated_count: data.asset_ids?.length || assets.length, errors: [] },
      };
    },
    onSuccess: (result) => {
      addNotification({
        type: 'success',
        title: '折旧成功',
        message: `已完成 ${result.data.depreciated_count} 项资产的折旧`,
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FINANCE.ASSET] });
      setShowDepreciateDialog(false);
      setDepreciatePeriod('');
    },
    onError: (error) => {
      apiLogger.error('折旧失败:', error);
      addNotification({
        type: 'error',
        title: '折旧失败',
        message: '无法执行折旧',
      });
    },
  });

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (selectedAsset) {
      await updateMutation.mutateAsync();
    } else {
      await createMutation.mutateAsync();
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这个固定资产吗?')) return;
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  const handleEdit = useCallback((asset: FixedAsset) => {
    setSelectedAsset(asset);
    setFormData({
      asset_code: asset.asset_code,
      asset_name: asset.asset_name,
      asset_type: asset.asset_type,
      asset_category: asset.asset_category || '',
      purchase_date: asset.purchase_date,
      original_value: asset.original_value,
      accumulated_depreciation: asset.accumulated_depreciation,
      net_value: asset.net_value,
      depreciation_method: asset.depreciation_method,
      expected_life: asset.expected_life,
      salvage_value: asset.salvage_value,
      monthly_depreciation: asset.monthly_depreciation,
      location: asset.location || '',
      department_id: asset.department_id || '',
      status: asset.status,
    });
    setShowDialog(true);
  }, []);

  const handleViewDetail = useCallback((asset: FixedAsset) => {
    setSelectedAsset(asset);
    setShowDetailDialog(true);
  }, []);

  const handleDepreciate = useCallback(() => {
    setShowDepreciateDialog(true);
  }, []);

  const handleBatchDepreciate = useCallback((selectedRows: FixedAsset[]) => {
    const ids = selectedRows.map((row) => row.id);
    setSelectedIds(ids);
    setShowDepreciateDialog(true);
  }, []);

  const handleConfirmDepreciate = async () => {
    if (!depreciatePeriod) {
      addNotification({ type: 'warning', title: '提示', message: '请选择折旧期间' });
      return;
    }
    await depreciateMutation.mutateAsync({
      period: depreciatePeriod,
      asset_ids: selectedIds.length > 0 ? selectedIds : undefined,
    });
    setSelectedIds([]);
  };

  const resetForm = () => {
    setSelectedAsset(null);
    setFormData({
      asset_code: '',
      asset_name: '',
      asset_type: '',
      asset_category: '',
      purchase_date: '',
      original_value: 0,
      accumulated_depreciation: 0,
      net_value: 0,
      depreciation_method: 'straight_line',
      expected_life: 3,
      salvage_value: 0,
      monthly_depreciation: 0,
      location: '',
      department_id: '',
      status: 'active',
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
      active: { label: '在用', bg: 'success.lighter', color: 'success.700' },
      idle: { label: '闲置', bg: 'info.lighter', color: 'info.700' },
      depreciated: { label: '本月已折旧', bg: 'grey.100', color: 'text.secondary' },
      retired: { label: '已报废', bg: 'error.lighter', color: 'error.dark' },
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

  const getMethodLabel = (method: string) => {
    const methodMap: Record<string, string> = {
      straight_line: '直线法',
      declining_balance: '双倍余额递减法',
      sum_of_years: '年数总和法',
    };
    return methodMap[method] || method;
  };

  const columns: ColumnDef<FixedAsset>[] = useMemo(
    () => [
      { id: 'asset_code', label: '资产编码', sortable: true, width: 120 },
      { id: 'asset_name', label: '资产名称', sortable: true, width: 150 },
      { id: 'asset_category', label: '分类', width: 100 },
      {
        id: 'original_value',
        label: '原值',
        width: 120,
        align: 'right',
        render: (row) =>
          `¥${row.original_value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
      },
      {
        id: 'accumulated_depreciation',
        label: '累计折旧',
        width: 120,
        align: 'right',
        render: (row) =>
          `¥${row.accumulated_depreciation.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
      },
      {
        id: 'net_value',
        label: '净值',
        width: 120,
        align: 'right',
        render: (row) => `¥${row.net_value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
      },
      {
        id: 'depreciation_method',
        label: '折旧方法',
        width: 100,
        render: (row) => getMethodLabel(row.depreciation_method),
      },
      {
        id: 'monthly_depreciation',
        label: '月折旧额',
        width: 120,
        align: 'right',
        render: (row) =>
          `¥${row.monthly_depreciation.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
      },
      {
        id: 'expected_life',
        label: '使用年限',
        width: 80,
        align: 'center',
        render: (row) => `${row.expected_life}年`,
      },
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
          { label: '在用', value: 'active' },
          { label: '闲置', value: 'idle' },
          { label: '本月已折旧', value: 'depreciated' },
          { label: '已报废', value: 'retired' },
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

  const rowActions: RowAction<FixedAsset>[] = useMemo(
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
        confirmMessage: '确定要删除这个固定资产吗?',
        divider: true,
      },
    ],
    [handleViewDetail, handleEdit, handleDelete]
  );

  const batchActions: BatchAction<FixedAsset>[] = useMemo(
    () => [
      {
        label: '批量折旧',
        icon: <Calculator size={16} />,
        color: 'primary',
        onClick: handleBatchDepreciate,
        confirm: true,
        confirmMessage: '确定要对选中的资产执行折旧吗?',
      },
    ],
    [handleBatchDepreciate]
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
    const totalValue = assets.reduce((sum, a) => sum + a.original_value, 0);
    const totalDepreciation = assets.reduce((sum, a) => sum + a.accumulated_depreciation, 0);
    const totalNetValue = assets.reduce((sum, a) => sum + a.net_value, 0);
    const monthlyDepreciation = assets.reduce((sum, a) => sum + a.monthly_depreciation, 0);
    return {
      total: assets.length,
      totalValue,
      totalDepreciation,
      totalNetValue,
      monthlyDepreciation,
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
          资产原值
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          ¥{stats.totalValue.toLocaleString()}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          累计折旧
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          ¥{stats.totalDepreciation.toLocaleString()}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          月折旧额
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          ¥{stats.monthlyDepreciation.toFixed(2)}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='折旧管理'
      subtitle='管理固定资产折旧信息'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={assets}
        loading={isLoading}
        filters={filters}
        searchable
        searchPlaceholder='搜索资产编码、名称、分类...'
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
            label: '新增固定资产',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
          {
            label: '执行折旧',
            icon: <Calculator size={16} />,
            onClick: handleDepreciate,
          },
        ]}
        rowActions={rowActions}
        batchActions={batchActions}
        headerContent={statsContent}
        emptyMessage='暂无固定资产数据'
        getRowId={(row) => row.id}
        exportable
        exportFileName='折旧清单'
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='lg'
      >
        <DialogTitle>{selectedAsset ? '编辑固定资产' : '新增固定资产'}</DialogTitle>
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
            {selectedAsset ? '修改固定资产信息' : '填写新固定资产信息'}
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
                <InputLabel htmlFor='asset_code'>资产编码 *</InputLabel>
                <TextField
                  id='asset_code'
                  required
                  size='small'
                  value={formData.asset_code}
                  onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='asset_name'>资产名称 *</InputLabel>
                <TextField
                  id='asset_name'
                  required
                  size='small'
                  value={formData.asset_name}
                  onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='asset_category'>分类</InputLabel>
                <TextField
                  id='asset_category'
                  size='small'
                  select
                  value={formData.asset_category}
                  onChange={(e) => setFormData({ ...formData, asset_category: e.target.value })}
                >
                  <option value=''>请选择分类</option>
                  <option value='办公设备'>办公设备</option>
                  <option value='电脑设备'>电脑设备</option>
                  <option value='服务器'>服务器</option>
                  <option value='网络设备'>网络设备</option>
                  <option value='办公家具'>办公家具</option>
                  <option value='运输工具'>运输工具</option>
                </TextField>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='purchase_date'>购入日期 *</InputLabel>
                <TextField
                  id='purchase_date'
                  type='date'
                  required
                  size='small'
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='original_value'>原值 *</InputLabel>
                <TextField
                  id='original_value'
                  type='number'
                  required
                  size='small'
                  value={formData.original_value}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      original_value: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='salvage_value'>残值</InputLabel>
                <TextField
                  id='salvage_value'
                  type='number'
                  size='small'
                  value={formData.salvage_value}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      salvage_value: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='expected_life'>使用年限（年）</InputLabel>
                <TextField
                  id='expected_life'
                  type='number'
                  size='small'
                  value={formData.expected_life}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expected_life: parseFloat(e.target.value) || 3,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='depreciation_method'>折旧方法</InputLabel>
                <TextField
                  id='depreciation_method'
                  size='small'
                  select
                  value={formData.depreciation_method}
                  onChange={(e) =>
                    setFormData({ ...formData, depreciation_method: e.target.value })
                  }
                >
                  <option value='straight_line'>直线法</option>
                  <option value='declining_balance'>双倍余额递减法</option>
                  <option value='sum_of_years'>年数总和法</option>
                </TextField>
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
        <DialogTitle>固定资产详情</DialogTitle>
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
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>资产编码</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedAsset.asset_code}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>资产名称</InputLabel>
                  <Box component='span'>{selectedAsset.asset_name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>分类</InputLabel>
                  <Box component='span'>{selectedAsset.asset_category || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>购入日期</InputLabel>
                  <Box component='span'>
                    {new Date(selectedAsset.purchase_date).toLocaleDateString('zh-CN')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>原值</InputLabel>
                  <Box component='span'>
                    ¥
                    {selectedAsset.original_value.toLocaleString('zh-CN', {
                      minimumFractionDigits: 2,
                    })}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>残值</InputLabel>
                  <Box component='span'>
                    ¥
                    {selectedAsset.salvage_value.toLocaleString('zh-CN', {
                      minimumFractionDigits: 2,
                    })}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>累计折旧</InputLabel>
                  <Box component='span'>
                    ¥
                    {selectedAsset.accumulated_depreciation.toLocaleString('zh-CN', {
                      minimumFractionDigits: 2,
                    })}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>净值</InputLabel>
                  <Box component='span'>
                    ¥{selectedAsset.net_value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>月折旧额</InputLabel>
                  <Box component='span'>
                    ¥
                    {selectedAsset.monthly_depreciation.toLocaleString('zh-CN', {
                      minimumFractionDigits: 2,
                    })}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>折旧方法</InputLabel>
                  <Box component='span'>{getMethodLabel(selectedAsset.depreciation_method)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>使用年限</InputLabel>
                  <Box component='span'>{selectedAsset.expected_life}年</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedAsset.status)}</Box>
                </Box>
                {selectedAsset.location && (
                  <Box>
                    <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>存放位置</InputLabel>
                    <Box component='span'>{selectedAsset.location}</Box>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDepreciateDialog}
        onClose={() => setShowDepreciateDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedIds.length > 0 ? '批量折旧' : '执行折旧'}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mt: 2,
            }}
          >
            {selectedIds.length > 0 && (
              <Box>
                <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                  已选择 {selectedIds.length} 项资产
                </InputLabel>
              </Box>
            )}
            <Box>
              <InputLabel htmlFor='depreciate_period'>折旧期间 *</InputLabel>
              <TextField
                id='depreciate_period'
                type='date'
                required
                size='small'
                fullWidth
                value={depreciatePeriod}
                onChange={(e) => setDepreciatePeriod(e.target.value)}
              />
            </Box>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mt: 2 }}
            >
              {selectedIds.length > 0
                ? '将对选中的资产执行折旧处理'
                : '将对所有符合条件的资产执行折旧处理'}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            type='button'
            variant='outlined'
            onClick={() => {
              setShowDepreciateDialog(false);
              setDepreciatePeriod('');
            }}
          >
            取消
          </Button>
          <Button
            type='button'
            variant='contained'
            onClick={handleConfirmDepreciate}
            disabled={depreciateMutation.isPending || !depreciatePeriod}
            startIcon={
              depreciateMutation.isPending ? <RefreshCw size={16} /> : <Calculator size={16} />
            }
          >
            {depreciateMutation.isPending ? '折旧中...' : '确认折旧'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default DepreciationPage;
