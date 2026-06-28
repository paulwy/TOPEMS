import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box as LucideBox,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  AlertCircle,
  DollarSign,
  User,
  Settings,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { assetApi, type Asset } from '@/api/erp';
import { employeeApi, type Employee } from '@/api/hrm';
import { useAppStore } from '../../store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { ModeToggle } from '@/components/theme/ModeToggle';
import { PageContainer } from '@/components/common';

import {
  Box,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Button,
} from '@mui/material';

interface AssetManagementPageProps {
  onNavigate?: (page: string) => void;
}

const AssetManagementPage: React.FC<AssetManagementPageProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchStatusModal, setShowBatchStatusModal] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string>('');

  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetRes, employeeRes] = await Promise.all([assetApi.list(), employeeApi.list()]);

      if (assetRes.success && assetRes.data) {
        setAssets(assetRes.data.items || []);
      }

      if (employeeRes.success && employeeRes.data) {
        setEmployees(employeeRes.data.items || []);
      }
    } catch (err: unknown) {
      setError((err as { message?: string }).message || '加载数据失败');
      addNotification({
        title: '加载失败',
        message: '加载数据失败',
        type: 'error',
      });
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBatchUpdateStatus = () => {
    setShowBatchStatusModal(true);
  };

  const confirmBatchUpdateStatus = async () => {
    if (selectedIds.length === 0 || !batchStatus) return;

    try {
      const promises = selectedIds.map((id) => assetApi.update(id, { status: batchStatus }));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      addNotification({
        title: '批量更新成功',
        message: `成功更新 ${successCount} 条资产状态，失败 ${selectedIds.length - successCount} 条`,
        type: 'success',
      });

      setSelectedIds([]);
      setShowBatchStatusModal(false);
      setBatchStatus('');
      loadData();
    } catch (err: unknown) {
      addNotification({
        title: '批量更新失败',
        message: (err as { message?: string }).message || '批量更新状态失败',
        type: 'error',
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      const promises = selectedIds.map((id) => assetApi.delete(id));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      addNotification({
        title: '批量删除成功',
        message: `成功删除 ${successCount} 条资产，失败 ${selectedIds.length - successCount} 条`,
        type: 'success',
      });

      setSelectedIds([]);
      loadData();
    } catch (err: unknown) {
      addNotification({
        title: '批量删除失败',
        message: (err as { message?: string }).message || '批量删除失败',
        type: 'error',
      });
    }
  };

  const [newAsset, setNewAsset] = useState<Partial<Asset>>({
    asset_number: '',
    name: '',
    category: '',
    brand: '',
    model: '',
    purchase_date: '',
    purchase_amount: 0,
    location: '',
    responsible_id: '',
    status: 'idle',
    serial_number: '',
    manufacturer: '',
    rated_power: 0,
    rated_voltage: 0,
    rated_current: 0,
    department: '',
  });

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await assetApi.create(newAsset);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '资产创建成功',
          type: 'success',
        });
        setShowCreateModal(false);
        setNewAsset({
          asset_number: '',
          name: '',
          category: '',
          brand: '',
          model: '',
          purchase_date: '',
          purchase_amount: 0,
          location: '',
          responsible_id: '',
          status: 'idle',
          serial_number: '',
          manufacturer: '',
          rated_power: 0,
          rated_voltage: 0,
          rated_current: 0,
          department: '',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '创建资产失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '失败',
        message: (err as { message?: string }).message || '创建资产失败',
        type: 'error',
      });
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('确定要删除这个资产吗？')) return;
    try {
      const res = await assetApi.delete(id);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '资产删除成功',
          type: 'success',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '删除资产失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '失败',
        message: (err as { message?: string }).message || '删除资产失败',
        type: 'error',
      });
    }
  };

  const handleEditAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      const res = await assetApi.update(selectedAsset.id, selectedAsset);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '资产信息更新成功',
          type: 'success',
        });
        setShowEditModal(false);
        setSelectedAsset(null);
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '更新资产失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '失败',
        message: (err as { message?: string }).message || '更新资产失败',
        type: 'error',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
      in_use: 'success',
      idle: 'info',
      maintenance: 'warning',
      scrapped: 'error',
    };
    const labels: Record<string, string> = {
      in_use: '使用中',
      idle: '闲置',
      maintenance: '维护中',
      scrapped: '报废',
    };
    return (
      <Chip
        size='small'
        color={colors[status] || 'default'}
        label={labels[status] || status}
        variant='outlined'
      />
    );
  };

  const getEmployeeName = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    return emp ? emp.name : '-';
  };

  // 过滤后的数据
  const filteredAssets = useMemo(() => {
    return assets.filter(
      (asset) =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asset.asset_number &&
          asset.asset_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (asset.brand && asset.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (asset.model && asset.model.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [assets, searchQuery]);

  // 分页数据
  const paginatedAssets = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredAssets.slice(start, end);
  }, [filteredAssets, page, pageSize]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // 列定义
  const columns: ColumnDef<Asset>[] = useMemo(
    () => [
      {
        id: 'asset_number',
        label: '资产编号',
        sortable: true,
        render: (asset) => (
          <Typography sx={{ fontWeight: 500, color: 'text.primary' }}>
            {asset.asset_number}
          </Typography>
        ),
      },
      {
        id: 'name',
        label: '资产名称',
        sortable: true,
        render: (asset) => <Typography sx={{ color: 'text.primary' }}>{asset.name}</Typography>,
      },
      {
        id: 'category',
        label: '类别',
        sortable: true,
        render: (asset) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
            {asset.category || '-'}
          </Typography>
        ),
      },
      {
        id: 'brand',
        label: '品牌',
        sortable: true,
        render: (asset) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
            {asset.brand || '-'}
          </Typography>
        ),
      },
      {
        id: 'model',
        label: '型号',
        sortable: true,
        render: (asset) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
            {asset.model || '-'}
          </Typography>
        ),
      },
      {
        id: 'purchase_amount',
        label: '采购金额',
        sortable: true,
        render: (asset) => (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '0.875rem',
              color: 'text.primary',
            }}
          >
            <span style={{ marginRight: 4 }}>
              <DollarSign
                size={12}
                style={{ color: 'green' }}
              />
            </span>
            {asset.purchase_amount ? `¥${asset.purchase_amount.toLocaleString()}` : '-'}
          </Box>
        ),
      },
      {
        id: 'responsible_id',
        label: '负责人',
        sortable: true,
        render: (asset) => (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '0.875rem',
              color: 'text.primary',
            }}
          >
            <span style={{ marginRight: 4 }}>
              <User
                size={12}
                style={{ color: 'blue' }}
              />
            </span>
            {getEmployeeName(asset.responsible_id || '')}
          </Box>
        ),
      },
      {
        id: 'status',
        label: '状态',
        sortable: true,
        render: (asset) => getStatusBadge(asset.status),
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
        render: (asset) => (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 1,
            }}
          >
            <IconButton
              size='small'
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAsset(asset);
                setShowEditModal(true);
              }}
            >
              <Edit size={16} />
            </IconButton>
            <IconButton
              size='small'
              color='error'
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteAsset(asset.id);
              }}
            >
              <Trash2 size={16} />
            </IconButton>
          </Box>
        ),
      },
    ],

    [employees]
  );

  // 筛选器定义
  const filters = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { label: '全部', value: '' },
          { label: '使用中', value: 'in_use' },
          { label: '闲置', value: 'idle' },
          { label: '维护中', value: 'maintenance' },
          { label: '报废', value: 'scrapped' },
        ],
      },
    ],
    []
  );

  return (
    <PageContainer
      title='资产管理'
      subtitle='管理企业资产、设备台账'
      headerProps={{
        pageIcon: <Layers style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        backButton={{
          href: '/dashboard',
          onClick: () => navigate('/dashboard'),
        }}
        columns={columns}
        data={paginatedAssets}
        loading={loading}
        error={error || undefined}
        pagination={{
          page,
          pageSize,
          total: filteredAssets.length,
          onPageChange: handlePageChange,
        }}
        searchable
        searchPlaceholder='搜索资产名称、编号、品牌、型号...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
        actions={[
          {
            label: '新增资产',
            icon: <Plus size={16} />,
            onClick: () => setShowCreateModal(true),
            variant: 'contained',
          },
        ]}
        batchActions={[
          {
            label: '批量更新状态',
            icon: <Settings size={16} />,
            onClick: handleBatchUpdateStatus,
          },
          {
            label: '批量删除',
            icon: <Trash2 size={16} />,
            color: 'error',
            confirm: true,
            confirmMessage: `确定要删除选中的 ${selectedIds.length} 个资产吗？`,
            onClick: handleBatchDelete,
          },
        ]}
        onRefresh={loadData}
        emptyMessage='暂无资产'
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>新增资产</DialogTitle>
        <DialogContent sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Box
            component='form'
            onSubmit={handleCreateAsset}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(1, 1fr)',
                    md: 'repeat(2, 1fr)',
                  },
                  gap: 2,
                }}
              >
                <TextField
                  label='资产编号 *'
                  value={newAsset.asset_number || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, asset_number: e.target.value })}
                  fullWidth
                  required
                />
                <TextField
                  label='资产名称 *'
                  value={newAsset.name || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  fullWidth
                  required
                />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(1, 1fr)',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                  },
                  gap: 2,
                }}
              >
                <TextField
                  label='类别'
                  value={newAsset.category || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
                  fullWidth
                />
                <TextField
                  label='品牌'
                  value={newAsset.brand || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, brand: e.target.value })}
                  fullWidth
                />
                <TextField
                  label='型号'
                  value={newAsset.model || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, model: e.target.value })}
                  fullWidth
                />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(1, 1fr)',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                  },
                  gap: 2,
                }}
              >
                <TextField
                  label='序列号'
                  value={newAsset.serial_number || ''}
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
                      serial_number: e.target.value,
                    })
                  }
                  fullWidth
                />
                <TextField
                  label='制造商'
                  value={newAsset.manufacturer || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, manufacturer: e.target.value })}
                  fullWidth
                />
                <TextField
                  label='部门'
                  value={newAsset.department || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, department: e.target.value })}
                  fullWidth
                />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(1, 1fr)',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(3, 1fr)',
                  },
                  gap: 2,
                }}
              >
                <TextField
                  label='额定功率 (kW)'
                  type='number'
                  slotProps={{ input: { inputProps: { step: '0.01' } } }}
                  value={newAsset.rated_power || ''}
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
                      rated_power: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
                <TextField
                  label='额定电压 (V)'
                  type='number'
                  slotProps={{ input: { inputProps: { step: '0.01' } } }}
                  value={newAsset.rated_voltage || ''}
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
                      rated_voltage: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
                <TextField
                  label='额定电流 (A)'
                  type='number'
                  slotProps={{ input: { inputProps: { step: '0.01' } } }}
                  value={newAsset.rated_current || ''}
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
                      rated_current: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(1, 1fr)',
                    md: 'repeat(2, 1fr)',
                  },
                  gap: 2,
                }}
              >
                <TextField
                  label='采购日期'
                  type='date'
                  value={newAsset.purchase_date || ''}
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
                      purchase_date: e.target.value,
                    })
                  }
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label='采购金额'
                  type='number'
                  slotProps={{
                    input: { inputProps: { min: 0, step: '0.01' } },
                  }}
                  value={newAsset.purchase_amount || ''}
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
                      purchase_amount: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
              </Box>

              <TextField
                label='存放位置'
                value={newAsset.location || ''}
                onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                fullWidth
              />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(1, 1fr)',
                    md: 'repeat(2, 1fr)',
                  },
                  gap: 2,
                }}
              >
                <FormControl fullWidth>
                  <InputLabel>负责人</InputLabel>
                  <Select
                    value={newAsset.responsible_id || ''}
                    label='负责人'
                    onChange={(e) =>
                      setNewAsset({
                        ...newAsset,
                        responsible_id: e.target.value,
                      })
                    }
                  >
                    <MenuItem value='none'>无</MenuItem>
                    {employees.map((emp) => (
                      <MenuItem
                        key={emp.id}
                        value={emp.id}
                      >
                        {emp.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={newAsset.status || 'idle'}
                    label='状态'
                    onChange={(e) => setNewAsset({ ...newAsset, status: e.target.value })}
                  >
                    <MenuItem value='idle'>闲置</MenuItem>
                    <MenuItem value='in_use'>使用中</MenuItem>
                    <MenuItem value='maintenance'>维护中</MenuItem>
                    <MenuItem value='scrapped'>报废</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Box
              sx={{
                mt: 3,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 1,
              }}
            >
              <Button
                variant='outlined'
                onClick={() => setShowCreateModal(false)}
              >
                取消
              </Button>
              <Button
                variant='contained'
                type='submit'
              >
                创建
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>编辑资产</DialogTitle>
        <DialogContent sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {selectedAsset && (
            <Box
              component='form'
              onSubmit={handleEditAsset}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(1, 1fr)',
                      md: 'repeat(2, 1fr)',
                    },
                    gap: 2,
                  }}
                >
                  <TextField
                    label='资产编号 *'
                    value={selectedAsset.asset_number}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        asset_number: e.target.value,
                      })
                    }
                    fullWidth
                    required
                  />
                  <TextField
                    label='资产名称 *'
                    value={selectedAsset.name}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        name: e.target.value,
                      })
                    }
                    fullWidth
                    required
                  />
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(1, 1fr)',
                      sm: 'repeat(2, 1fr)',
                      md: 'repeat(3, 1fr)',
                    },
                    gap: 2,
                  }}
                >
                  <TextField
                    label='类别'
                    value={selectedAsset.category || ''}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        category: e.target.value,
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label='品牌'
                    value={selectedAsset.brand || ''}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        brand: e.target.value,
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label='型号'
                    value={selectedAsset.model || ''}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        model: e.target.value,
                      })
                    }
                    fullWidth
                  />
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(1, 1fr)',
                      sm: 'repeat(2, 1fr)',
                      md: 'repeat(3, 1fr)',
                    },
                    gap: 2,
                  }}
                >
                  <TextField
                    label='序列号'
                    value={selectedAsset.serial_number || ''}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        serial_number: e.target.value,
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label='制造商'
                    value={selectedAsset.manufacturer || ''}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        manufacturer: e.target.value,
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label='部门'
                    value={selectedAsset.department || ''}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        department: e.target.value,
                      })
                    }
                    fullWidth
                  />
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(1, 1fr)',
                      sm: 'repeat(2, 1fr)',
                      md: 'repeat(3, 1fr)',
                    },
                    gap: 2,
                  }}
                >
                  <TextField
                    label='额定功率 (kW)'
                    type='number'
                    slotProps={{ input: { inputProps: { step: '0.01' } } }}
                    value={selectedAsset.rated_power || ''}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        rated_power: Number(e.target.value),
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label='额定电压 (V)'
                    type='number'
                    slotProps={{ input: { inputProps: { step: '0.01' } } }}
                    value={selectedAsset.rated_voltage || ''}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        rated_voltage: Number(e.target.value),
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label='额定电流 (A)'
                    type='number'
                    slotProps={{ input: { inputProps: { step: '0.01' } } }}
                    value={selectedAsset.rated_current || ''}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        rated_current: Number(e.target.value),
                      })
                    }
                    fullWidth
                  />
                </Box>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(1, 1fr)',
                      md: 'repeat(2, 1fr)',
                    },
                    gap: 2,
                  }}
                >
                  <TextField
                    label='采购日期'
                    type='date'
                    value={selectedAsset.purchase_date || ''}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        purchase_date: e.target.value,
                      })
                    }
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    label='采购金额'
                    type='number'
                    slotProps={{
                      input: { inputProps: { min: 0, step: '0.01' } },
                    }}
                    value={selectedAsset.purchase_amount || ''}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        purchase_amount: Number(e.target.value),
                      })
                    }
                    fullWidth
                  />
                </Box>

                <TextField
                  label='存放位置'
                  value={selectedAsset.location || ''}
                  onChange={(e) =>
                    setSelectedAsset({
                      ...selectedAsset,
                      location: e.target.value,
                    })
                  }
                  fullWidth
                />

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(1, 1fr)',
                      md: 'repeat(2, 1fr)',
                    },
                    gap: 2,
                  }}
                >
                  <FormControl fullWidth>
                    <InputLabel>负责人</InputLabel>
                    <Select
                      value={selectedAsset.responsible_id || ''}
                      label='负责人'
                      onChange={(e) =>
                        setSelectedAsset({
                          ...selectedAsset,
                          responsible_id: e.target.value,
                        })
                      }
                    >
                      <MenuItem value='none'>无</MenuItem>
                      {employees
                        .filter((e) => e.id !== selectedAsset.id)
                        .map((emp) => (
                          <MenuItem
                            key={emp.id}
                            value={emp.id}
                          >
                            {emp.name}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel>状态</InputLabel>
                    <Select
                      value={selectedAsset.status}
                      label='状态'
                      onChange={(e) =>
                        setSelectedAsset({
                          ...selectedAsset,
                          status: e.target.value,
                        })
                      }
                    >
                      <MenuItem value='idle'>闲置</MenuItem>
                      <MenuItem value='in_use'>使用中</MenuItem>
                      <MenuItem value='maintenance'>维护中</MenuItem>
                      <MenuItem value='scrapped'>报废</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              <Box
                sx={{
                  mt: 3,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 1,
                }}
              >
                <Button
                  variant='outlined'
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedAsset(null);
                  }}
                >
                  取消
                </Button>
                <Button
                  variant='contained'
                  type='submit'
                >
                  保存
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showBatchStatusModal}
        onClose={() => setShowBatchStatusModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>批量更新状态</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>选择新状态</InputLabel>
              <Select
                value={batchStatus}
                label='选择新状态'
                onChange={(e) => setBatchStatus(e.target.value)}
              >
                <MenuItem value='idle'>闲置</MenuItem>
                <MenuItem value='in_use'>使用中</MenuItem>
                <MenuItem value='maintenance'>维护中</MenuItem>
                <MenuItem value='scrapped'>报废</MenuItem>
              </Select>
            </FormControl>
            <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              将批量更新{' '}
              <Box
                component='span'
                sx={{ fontWeight: 600 }}
              >
                {selectedIds.length}
              </Box>{' '}
              条资产的状态
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => {
              setShowBatchStatusModal(false);
              setBatchStatus('');
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={confirmBatchUpdateStatus}
            disabled={!batchStatus}
          >
            确认更新
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default AssetManagementPage;
