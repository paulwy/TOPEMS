import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  Download,
  Calculator,
  AlertTriangle,
  Search,
  Package,
  CheckCircle,
  PauseCircle,
  XCircle,
  DollarSign,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import { DataExport } from '@/components/common';
import { ListPageTemplate, StatCardGroup } from '@/components/mui';

import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Box as MuiBox,
  Typography,
  Stack,
  IconButton,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import { Button } from '@/components/ui/Button';

interface Asset {
  id: string;
  asset_code: string;
  asset_name: string;
  asset_category: string;
  original_value: number;
  accumulated_depreciation: number;
  net_value: number;
  usage_status: string;
}

const mockAssetData: Asset[] = [
  {
    id: '1',
    asset_code: 'A001',
    asset_name: '生产设备A',
    asset_category: '生产设备',
    original_value: 500000,
    accumulated_depreciation: 150000,
    net_value: 350000,
    usage_status: '使用中',
  },
  {
    id: '2',
    asset_code: 'A002',
    asset_name: '办公电脑',
    asset_category: '办公设备',
    original_value: 30000,
    accumulated_depreciation: 18000,
    net_value: 12000,
    usage_status: '使用中',
  },
  {
    id: '3',
    asset_code: 'A003',
    asset_name: '运输车辆',
    asset_category: '运输设备',
    original_value: 200000,
    accumulated_depreciation: 80000,
    net_value: 120000,
    usage_status: '使用中',
  },
  {
    id: '4',
    asset_code: 'A004',
    asset_name: '厂房建筑',
    asset_category: '房屋建筑',
    original_value: 2000000,
    accumulated_depreciation: 400000,
    net_value: 1600000,
    usage_status: '使用中',
  },
  {
    id: '5',
    asset_code: 'A005',
    asset_name: '检测仪器',
    asset_category: '检测设备',
    original_value: 150000,
    accumulated_depreciation: 45000,
    net_value: 105000,
    usage_status: '闲置',
  },
  {
    id: '6',
    asset_code: 'A006',
    asset_name: '空调系统',
    asset_category: '办公设备',
    original_value: 80000,
    accumulated_depreciation: 32000,
    net_value: 48000,
    usage_status: '使用中',
  },
  {
    id: '7',
    asset_code: 'A007',
    asset_name: '旧打印机',
    asset_category: '办公设备',
    original_value: 5000,
    accumulated_depreciation: 5000,
    net_value: 0,
    usage_status: '已报废',
  },
  {
    id: '8',
    asset_code: 'A008',
    asset_name: '研发设备',
    asset_category: '研发设备',
    original_value: 800000,
    accumulated_depreciation: 160000,
    net_value: 640000,
    usage_status: '使用中',
  },
];

const FinanceAssetPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [assetData, setAssetData] = useState<Asset[]>(mockAssetData);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDepreciationModal, setShowDepreciationModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const [newAsset, setNewAsset] = useState({
    asset_code: '',
    asset_name: '',
    asset_category: '',
    original_value: 0,
    usage_status: '使用中',
  });

  const filteredData = useMemo(() => {
    return assetData.filter((asset) => {
      if (filterCategory && asset.asset_category !== filterCategory) return false;
      if (filterStatus && asset.usage_status !== filterStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !asset.asset_code.toLowerCase().includes(query) &&
          !asset.asset_name.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [assetData, filterCategory, filterStatus, searchQuery]);

  // 统计卡片数据
  const statCards = useMemo(() => {
    const totalCount = assetData.length;
    const inUseCount = assetData.filter((a) => a.usage_status === '使用中').length;
    const idleCount = assetData.filter((a) => a.usage_status === '闲置').length;
    const scrappedCount = assetData.filter((a) => a.usage_status === '已报废').length;
    const totalOriginalValue = assetData.reduce((sum, a) => sum + a.original_value, 0);
    const totalNetValue = assetData.reduce((sum, a) => sum + a.net_value, 0);

    return [
      {
        title: '总资产数',
        value: totalCount,
        icon: <Package size={24} />,
        color: 'primary' as const,
      },
      {
        title: '使用中',
        value: inUseCount,
        icon: <CheckCircle size={24} />,
        color: 'success' as const,
      },
      {
        title: '闲置',
        value: idleCount,
        icon: <PauseCircle size={24} />,
        color: 'warning' as const,
      },
      {
        title: '已报废',
        value: scrappedCount,
        icon: <XCircle size={24} />,
        color: 'error' as const,
      },
      {
        title: '总原值',
        value: `¥${totalOriginalValue.toLocaleString()}`,
        icon: <DollarSign size={24} />,
        color: 'secondary' as const,
      },
      {
        title: '总净值',
        value: `¥${totalNetValue.toLocaleString()}`,
        icon: <DollarSign size={24} />,
        color: 'info' as const,
      },
    ];
  }, [assetData]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      使用中: 'success',
      闲置: 'warning',
      已报废: 'error',
    };
    return colors[status] || 'default';
  };

  const handleCreate = () => {
    const newEntry: Asset = {
      id: String(assetData.length + 1),
      ...newAsset,
      accumulated_depreciation: 0,
      net_value: newAsset.original_value,
    };
    setAssetData([...assetData, newEntry]);
    addNotification({
      title: '成功',
      message: '资产新增成功',
      type: 'success',
    });
    setShowCreateModal(false);
    setNewAsset({
      asset_code: '',
      asset_name: '',
      asset_category: '',
      original_value: 0,
      usage_status: '使用中',
    });
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset({ ...asset });
  };

  const handleUpdate = () => {
    if (!editingAsset) return;
    setAssetData(assetData.map((a) => (a.id === editingAsset.id ? editingAsset : a)));
    addNotification({
      title: '成功',
      message: '资产更新成功',
      type: 'success',
    });
    setEditingAsset(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('确定要删除该资产吗？')) return;
    setAssetData(assetData.filter((a) => a.id !== id));
    addNotification({
      title: '成功',
      message: '资产删除成功',
      type: 'success',
    });
  };

  const handleDepreciation = (asset: Asset) => {
    setSelectedAsset(asset);
    setShowDepreciationModal(true);
  };

  const confirmDepreciation = () => {
    if (!selectedAsset) return;
    const depreciation = selectedAsset.original_value * 0.1;
    const newAccumulated = selectedAsset.accumulated_depreciation + depreciation;
    const newNetValue = selectedAsset.original_value - newAccumulated;

    setAssetData(
      assetData.map((a) =>
        a.id === selectedAsset.id
          ? {
              ...a,
              accumulated_depreciation: newAccumulated,
              net_value: Math.max(0, newNetValue),
            }
          : a
      )
    );
    addNotification({
      title: '成功',
      message: '计提折旧完成',
      type: 'success',
    });
    setShowDepreciationModal(false);
  };

  const handleScrap = (asset: Asset) => {
    if (!confirm(`确定要报废资产 "${asset.asset_name}" 吗？`)) return;
    setAssetData(
      assetData.map((a) => (a.id === asset.id ? { ...a, usage_status: '已报废', net_value: 0 } : a))
    );
    addNotification({ title: '成功', message: '资产已报废', type: 'success' });
  };

  const handleExport = () => {
    addNotification({
      title: '导出成功',
      message: '资产数据已导出',
      type: 'success',
    });
  };

  const columns = useMemo(
    () => [
      {
        id: 'asset_code',
        label: '资产编号',
        render: (row: Asset) => (
          <MuiBox sx={{ fontWeight: 600, color: 'success.main' }}>{row.asset_code}</MuiBox>
        ),
      },
      {
        id: 'asset_name',
        label: '资产名称',
        render: (row: Asset) => <MuiBox sx={{ fontWeight: 500 }}>{row.asset_name}</MuiBox>,
      },
      {
        id: 'asset_category',
        label: '资产类别',
        render: (row: Asset) => (
          <Chip
            label={row.asset_category}
            size='small'
          />
        ),
      },
      {
        id: 'original_value',
        label: '原值',
        render: (row: Asset) => (
          <MuiBox sx={{ fontFamily: 'monospace' }}>¥{row.original_value.toLocaleString()}</MuiBox>
        ),
      },
      {
        id: 'accumulated_depreciation',
        label: '累计折旧',
        render: (row: Asset) => (
          <MuiBox sx={{ color: 'warning.main', fontFamily: 'monospace' }}>
            ¥{row.accumulated_depreciation.toLocaleString()}
          </MuiBox>
        ),
      },
      {
        id: 'net_value',
        label: '净值',
        render: (row: Asset) => (
          <MuiBox
            sx={{
              fontWeight: 700,
              color: 'primary.main',
              fontFamily: 'monospace',
            }}
          >
            ¥{row.net_value.toLocaleString()}
          </MuiBox>
        ),
      },
      {
        id: 'usage_status',
        label: '使用状态',
        render: (row: Asset) => (
          <Chip
            label={row.usage_status}
            size='small'
            color={getStatusColor(row.usage_status)}
          />
        ),
      },
    ],
    []
  );

  const rowActions = useMemo(
    () => [
      {
        label: '计提折旧',
        icon: <Calculator sx={{ width: 16, height: 16 }} />,
        color: 'success' as const,
        onClick: (row: Asset) => handleDepreciation(row),
      },
      {
        label: '编辑',
        icon: <Edit sx={{ width: 16, height: 16 }} />,
        onClick: (row: Asset) => handleEdit(row),
      },
      {
        label: '报废',
        icon: <AlertTriangle sx={{ width: 16, height: 16 }} />,
        color: 'warning' as const,
        onClick: (row: Asset) => handleScrap(row),
      },
      {
        label: '删除',
        icon: <Trash2 sx={{ width: 16, height: 16 }} />,
        color: 'error' as const,
        onClick: (row: Asset) => handleDelete(row.id),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const advancedFilters = useMemo(
    () => [
      {
        id: 'asset_category',
        label: '资产类别',
        type: 'select' as const,
        options: [
          { value: '生产设备', label: '生产设备' },
          { value: '办公设备', label: '办公设备' },
          { value: '运输设备', label: '运输设备' },
          { value: '房屋建筑', label: '房屋建筑' },
          { value: '研发设备', label: '研发设备' },
          { value: '检测设备', label: '检测设备' },
        ],
        value: filterCategory,
        onChange: setFilterCategory,
      },
      {
        id: 'usage_status',
        label: '使用状态',
        type: 'select' as const,
        options: [
          { value: '使用中', label: '使用中' },
          { value: '闲置', label: '闲置' },
          { value: '已报废', label: '已报废' },
        ],
        value: filterStatus,
        onChange: setFilterStatus,
      },
    ],
    [filterCategory, filterStatus]
  );

  // 导出字段配置
  const exportFields = useMemo(
    () => [
      { key: 'asset_code', title: '资产编码' },
      { key: 'asset_name', title: '资产名称' },
      { key: 'asset_category', title: '资产类别' },
      { key: 'original_value', title: '原值' },
      { key: 'accumulated_depreciation', title: '累计折旧' },
      { key: 'net_value', title: '净值' },
      { key: 'usage_status', title: '使用状态' },
    ],
    []
  );

  return (
    <MuiBox sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <MuiBox
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 'sm',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <MuiBox
          sx={{
            maxWidth: 1280,
            mx: 'auto',
            px: { xs: 2, sm: 3, lg: 4 },
            py: 3,
          }}
        >
          <Stack
            direction='row'
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Stack
              direction='row'
              sx={{ alignItems: 'center' }}
              spacing={2}
            >
              <IconButton onClick={() => navigate('/dashboard')}>
                <ChevronLeft sx={{ width: 20, height: 20 }} />
              </IconButton>
              <MuiBox>
                <Typography
                  variant='h5'
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: 700,
                  }}
                >
                  <MuiBox
                    component='span'
                    sx={{
                      width: 28,
                      height: 28,
                      mr: 1.5,
                      color: 'success.main',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Calculator size={28} />
                  </MuiBox>
                  资产管理
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  管理企业固定资产，计提折旧和处理报废
                </Typography>
              </MuiBox>
            </Stack>
            <Stack
              direction='row'
              spacing={1}
            >
              <Button
                variant='outlined'
                startIcon={<Download sx={{ width: 20, height: 20 }} />}
                onClick={handleExport}
              >
                导出
              </Button>
              <DataExport
                data={assetData as unknown as Record<string, unknown>[]}
                fields={exportFields}
                defaultFileName='资产数据'
                buttonText='数据导出'
              />
              <Button
                variant='contained'
                startIcon={<Plus sx={{ width: 20, height: 20 }} />}
                onClick={() => setShowCreateModal(true)}
              >
                新增资产
              </Button>
            </Stack>
          </Stack>
        </MuiBox>
      </MuiBox>

      <MuiBox sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}>
        {/* 统计卡片 */}
        <StatCardGroup
          stats={statCards}
          columns={6}
        />

        <ListPageTemplate
          columns={columns}
          data={filteredData}
          searchable
          searchPlaceholder='搜索资产编号、名称...'
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          filters={advancedFilters}
          filtersValue={{
            asset_category: filterCategory,
            usage_status: filterStatus,
          }}
          onFilterChange={(filters) => {
            if (filters.asset_category !== undefined)
              setFilterCategory(filters.asset_category as string);
            if (filters.usage_status !== undefined) setFilterStatus(filters.usage_status as string);
          }}
          rowActions={rowActions}
        />
      </MuiBox>

      {/* Create Modal */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新增资产</DialogTitle>
        <DialogContent>
          <Stack
            spacing={3}
            sx={{ pt: 2 }}
          >
            <Stack
              direction='row'
              spacing={2}
            >
              <TextField
                label='资产编号 *'
                fullWidth
                value={newAsset.asset_code}
                onChange={(e) => setNewAsset({ ...newAsset, asset_code: e.target.value })}
              />
              <TextField
                label='资产名称 *'
                fullWidth
                value={newAsset.asset_name}
                onChange={(e) => setNewAsset({ ...newAsset, asset_name: e.target.value })}
              />
            </Stack>
            <Stack
              direction='row'
              spacing={2}
            >
              <FormControl fullWidth>
                <InputLabel>资产类别</InputLabel>
                <Select
                  value={newAsset.asset_category}
                  label='资产类别'
                  onChange={(e) => setNewAsset({ ...newAsset, asset_category: e.target.value })}
                >
                  <MenuItem value=''>请选择</MenuItem>
                  <MenuItem value='生产设备'>生产设备</MenuItem>
                  <MenuItem value='办公设备'>办公设备</MenuItem>
                  <MenuItem value='运输设备'>运输设备</MenuItem>
                  <MenuItem value='房屋建筑'>房屋建筑</MenuItem>
                  <MenuItem value='研发设备'>研发设备</MenuItem>
                  <MenuItem value='检测设备'>检测设备</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label='原值 *'
                type='number'
                fullWidth
                value={newAsset.original_value}
                onChange={(e) =>
                  setNewAsset({
                    ...newAsset,
                    original_value: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleCreate}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Modal */}
      <Dialog
        open={!!editingAsset}
        onClose={() => setEditingAsset(null)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>编辑资产</DialogTitle>
        <DialogContent>
          {editingAsset && (
            <Stack
              spacing={3}
              sx={{ pt: 2 }}
            >
              <Stack
                direction='row'
                spacing={2}
              >
                <TextField
                  label='资产编号'
                  fullWidth
                  value={editingAsset.asset_code}
                  slotProps={{ input: { readOnly: true } }}
                />
                <TextField
                  label='资产名称'
                  fullWidth
                  value={editingAsset.asset_name}
                  onChange={(e) =>
                    setEditingAsset({
                      ...editingAsset,
                      asset_name: e.target.value,
                    })
                  }
                />
              </Stack>
              <Stack
                direction='row'
                spacing={2}
              >
                <FormControl fullWidth>
                  <InputLabel>资产类别</InputLabel>
                  <Select
                    value={editingAsset.asset_category}
                    label='资产类别'
                    onChange={(e) =>
                      setEditingAsset({
                        ...editingAsset,
                        asset_category: e.target.value,
                      })
                    }
                  >
                    <MenuItem value='生产设备'>生产设备</MenuItem>
                    <MenuItem value='办公设备'>办公设备</MenuItem>
                    <MenuItem value='运输设备'>运输设备</MenuItem>
                    <MenuItem value='房屋建筑'>房屋建筑</MenuItem>
                    <MenuItem value='研发设备'>研发设备</MenuItem>
                    <MenuItem value='检测设备'>检测设备</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label='使用状态'
                  fullWidth
                  value={editingAsset.usage_status}
                  onChange={(e) =>
                    setEditingAsset({
                      ...editingAsset,
                      usage_status: e.target.value,
                    })
                  }
                />
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingAsset(null)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleUpdate}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* Depreciation Modal */}
      <Dialog
        open={showDepreciationModal}
        onClose={() => setShowDepreciationModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>计提折旧</DialogTitle>
        <DialogContent>
          {selectedAsset && (
            <Stack
              spacing={3}
              sx={{ pt: 2 }}
            >
              <MuiBox sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  资产名称
                </Typography>
                <Typography
                  variant='body1'
                  sx={{ fontWeight: 500 }}
                >
                  {selectedAsset.asset_name}
                </Typography>
              </MuiBox>
              <MuiBox
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <MuiBox sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    原值
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700 }}
                  >
                    ¥{selectedAsset.original_value.toLocaleString()}
                  </Typography>
                </MuiBox>
                <MuiBox sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    当前累计折旧
                  </Typography>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 700 }}
                  >
                    ¥{selectedAsset.accumulated_depreciation.toLocaleString()}
                  </Typography>
                </MuiBox>
              </MuiBox>
              <MuiBox
                sx={{
                  p: 2,
                  bgcolor: 'success.light',
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  本次计提折旧（10%）
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'success.main' }}
                >
                  ¥{(selectedAsset.original_value * 0.1).toLocaleString()}
                </Typography>
              </MuiBox>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDepreciationModal(false)}>取消</Button>
          <Button
            variant='contained'
            color='success'
            onClick={confirmDepreciation}
          >
            确认计提
          </Button>
        </DialogActions>
      </Dialog>
    </MuiBox>
  );
};

export default FinanceAssetPage;
