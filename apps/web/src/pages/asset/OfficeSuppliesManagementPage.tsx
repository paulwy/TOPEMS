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
} from '@mui/material';
import { Button } from '@mui/material';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  AlertCircle,
  DollarSign,
  MapPin,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { officeSupplyApi, type OfficeSupply } from '@/api/erp';
import { useAppStore } from '../../store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { ModeToggle } from '@/components/theme/ModeToggle';
import { PageContainer } from '@/components/common';

interface OfficeSuppliesManagementPageProps {
  onNavigate?: (page: string) => void;
}

const OfficeSuppliesManagementPage: React.FC<OfficeSuppliesManagementPageProps> = ({
  onNavigate,
}) => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [supplies, setSupplies] = useState<OfficeSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<OfficeSupply | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 分页状态
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      const promises = selectedIds.map((id) => officeSupplyApi.delete(id));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      addNotification({
        title: '批量删除成功',
        message: `成功删除 ${successCount} 条记录，失败 ${selectedIds.length - successCount} 条`,
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

  const [newSupply, setNewSupply] = useState<Partial<OfficeSupply>>({
    name: '',
    category: '',
    quantity: 0,
    unit: '',
    price: 0,
    location: '',
    status: 'active',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await officeSupplyApi.list();
      if (res.success && res.data) {
        setSupplies(res.data.items || []);
      } else {
        setSupplies([]);
      }
    } catch (err: unknown) {
      setError((err as { message?: string }).message || '加载数据失败');
      addNotification({
        title: '加载失败',
        message: '加载数据失败',
        type: 'error',
      });
      setSupplies([]);
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await officeSupplyApi.create(newSupply);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '办公用品创建成功',
          type: 'success',
        });
        setShowCreateModal(false);
        setNewSupply({
          name: '',
          category: '',
          quantity: 0,
          unit: '',
          price: 0,
          location: '',
          status: 'active',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '创建办公用品失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '失败',
        message: (err as { message?: string }).message || '创建办公用品失败',
        type: 'error',
      });
    }
  };

  const handleDeleteSupply = useCallback(
    async (id: string) => {
      if (!confirm('确定要删除这个办公用品吗？')) return;
      try {
        const res = await officeSupplyApi.delete(id);
        if (res.success) {
          addNotification({
            title: '成功',
            message: '办公用品删除成功',
            type: 'success',
          });
          loadData();
        } else {
          addNotification({
            title: '失败',
            message: res.message || '删除办公用品失败',
            type: 'error',
          });
        }
      } catch (err: unknown) {
        addNotification({
          title: '失败',
          message: (err as { message?: string }).message || '删除办公用品失败',
          type: 'error',
        });
      }
    },
    [loadData, addNotification]
  );

  const handleEditSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupply) return;
    try {
      const res = await officeSupplyApi.update(selectedSupply.id, selectedSupply);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '办公用品信息更新成功',
          type: 'success',
        });
        setShowEditModal(false);
        setSelectedSupply(null);
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '更新办公用品失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '失败',
        message: (err as { message?: string }).message || '更新办公用品失败',
        type: 'error',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
      active: 'success',
      inactive: 'info',
      low_stock: 'warning',
      out_of_stock: 'error',
    };
    const labels: Record<string, string> = {
      active: '正常',
      inactive: '停用',
      low_stock: '库存不足',
      out_of_stock: '缺货',
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

  // 过滤后的数据
  const filteredSupplies = useMemo(() => {
    return supplies.filter(
      (supply) =>
        supply.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (supply.category && supply.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (supply.location && supply.location.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [supplies, searchQuery]);

  // 分页数据
  const paginatedSupplies = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredSupplies.slice(start, end);
  }, [filteredSupplies, page, pageSize]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // 列定义
  const columns: ColumnDef<OfficeSupply>[] = useMemo(
    () => [
      {
        id: 'name',
        label: '物品名称',
        sortable: true,
        render: (supply) => (
          <Typography sx={{ fontWeight: 500, color: 'text.primary' }}>{supply.name}</Typography>
        ),
      },
      {
        id: 'category',
        label: '类别',
        sortable: true,
        render: (supply) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
            {supply.category || '-'}
          </Typography>
        ),
      },
      {
        id: 'quantity',
        label: '数量',
        sortable: true,
        render: (supply) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'text.primary' }}>
            {supply.quantity} {supply.unit || ''}
          </Typography>
        ),
      },
      {
        id: 'price',
        label: '单价',
        sortable: true,
        render: (supply) => (
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
            {supply.price ? `¥${supply.price.toFixed(2)}` : '-'}
          </Box>
        ),
      },
      {
        id: 'location',
        label: '存放位置',
        sortable: true,
        render: (supply) => (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '0.875rem',
              color: 'text.secondary',
            }}
          >
            <span style={{ marginRight: 4 }}>
              <MapPin
                size={12}
                style={{ color: 'blue' }}
              />
            </span>
            {supply.location || '-'}
          </Box>
        ),
      },
      {
        id: 'status',
        label: '状态',
        sortable: true,
        render: (supply) => getStatusBadge(supply.status),
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
        render: (supply) => (
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
                setSelectedSupply(supply);
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
                handleDeleteSupply(supply.id);
              }}
            >
              <Trash2 size={16} />
            </IconButton>
          </Box>
        ),
      },
    ],

    [handleDeleteSupply]
  );

  // 筛选器定义
  const filters = useMemo(
    () => [
      {
        id: 'category',
        label: '类别',
        type: 'select' as const,
        options: [
          { label: '全部', value: '' },
          { label: '文具', value: 'stationery' },
          { label: '电子设备', value: 'electronics' },
          { label: '家具', value: 'furniture' },
          { label: '清洁用品', value: 'cleaning' },
          { label: '其他', value: 'other' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { label: '全部', value: '' },
          { label: '正常', value: 'active' },
          { label: '停用', value: 'inactive' },
          { label: '库存不足', value: 'low_stock' },
          { label: '缺货', value: 'out_of_stock' },
        ],
      },
    ],
    []
  );

  return (
    <PageContainer title='办公用品管理' subtitle='管理办公用品的库存、领用、归还等'>
      <ListPageTemplate
        title=''
        subtitle=''
        backButton={{
          href: '/dashboard',
          onClick: () => navigate('/dashboard'),
        }}
        columns={columns}
        data={paginatedSupplies}
        loading={loading}
        error={error || undefined}
        pagination={{
          page,
          pageSize,
          total: filteredSupplies.length,
          onPageChange: handlePageChange,
        }}
        searchable
        searchPlaceholder='搜索物品名称、类别、存放位置...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
        actions={[
          {
            label: '新增物品',
            icon: <Plus size={16} />,
            onClick: () => setShowCreateModal(true),
            variant: 'contained',
          },
        ]}
        batchActions={[
          {
            label: '批量删除',
            icon: <Trash2 size={16} />,
            color: 'error',
            confirm: true,
            confirmMessage: `确定要删除选中的 ${selectedIds.length} 个办公用品吗？`,
            onClick: handleBatchDelete,
          },
        ]}
        onRefresh={loadData}
        emptyMessage='暂无办公用品'
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新增办公用品</DialogTitle>
        <DialogContent sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Box
            component='form'
            onSubmit={handleCreateSupply}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label='物品名称 *'
                value={newSupply.name || ''}
                onChange={(e) => setNewSupply({ ...newSupply, name: e.target.value })}
                fullWidth
                required
              />

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
                  value={newSupply.category || ''}
                  onChange={(e) => setNewSupply({ ...newSupply, category: e.target.value })}
                  fullWidth
                />
                <TextField
                  label='单位'
                  value={newSupply.unit || ''}
                  onChange={(e) => setNewSupply({ ...newSupply, unit: e.target.value })}
                  fullWidth
                />
                <TextField
                  label='数量 *'
                  type='number'
                  value={newSupply.quantity || ''}
                  onChange={(e) =>
                    setNewSupply({
                      ...newSupply,
                      quantity: Number(e.target.value),
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
                    md: 'repeat(2, 1fr)',
                  },
                  gap: 2,
                }}
              >
                <TextField
                  label='单价'
                  type='number'
                  slotProps={{
                    input: { inputProps: { min: 0, step: '0.01' } },
                  }}
                  value={newSupply.price || ''}
                  onChange={(e) =>
                    setNewSupply({
                      ...newSupply,
                      price: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
                <TextField
                  label='存放位置'
                  value={newSupply.location || ''}
                  onChange={(e) => setNewSupply({ ...newSupply, location: e.target.value })}
                  fullWidth
                />
              </Box>

              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={newSupply.status || 'active'}
                  label='状态'
                  onChange={(e) => setNewSupply({ ...newSupply, status: e.target.value })}
                >
                  <MenuItem value='active'>正常</MenuItem>
                  <MenuItem value='inactive'>停用</MenuItem>
                  <MenuItem value='low_stock'>库存不足</MenuItem>
                  <MenuItem value='out_of_stock'>缺货</MenuItem>
                </Select>
              </FormControl>
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
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>编辑办公用品</DialogTitle>
        <DialogContent sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {selectedSupply && (
            <Box
              component='form'
              onSubmit={handleEditSupply}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label='物品名称 *'
                  value={selectedSupply.name}
                  onChange={(e) =>
                    setSelectedSupply({
                      ...selectedSupply,
                      name: e.target.value,
                    })
                  }
                  fullWidth
                  required
                />

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
                    value={selectedSupply.category || ''}
                    onChange={(e) =>
                      setSelectedSupply({
                        ...selectedSupply,
                        category: e.target.value,
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label='单位'
                    value={selectedSupply.unit || ''}
                    onChange={(e) =>
                      setSelectedSupply({
                        ...selectedSupply,
                        unit: e.target.value,
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label='数量 *'
                    type='number'
                    value={selectedSupply.quantity}
                    onChange={(e) =>
                      setSelectedSupply({
                        ...selectedSupply,
                        quantity: Number(e.target.value),
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
                      md: 'repeat(2, 1fr)',
                    },
                    gap: 2,
                  }}
                >
                  <TextField
                    label='单价'
                    type='number'
                    slotProps={{
                      input: { inputProps: { min: 0, step: '0.01' } },
                    }}
                    value={selectedSupply.price || ''}
                    onChange={(e) =>
                      setSelectedSupply({
                        ...selectedSupply,
                        price: Number(e.target.value),
                      })
                    }
                    fullWidth
                  />
                  <TextField
                    label='存放位置'
                    value={selectedSupply.location || ''}
                    onChange={(e) =>
                      setSelectedSupply({
                        ...selectedSupply,
                        location: e.target.value,
                      })
                    }
                    fullWidth
                  />
                </Box>

                <FormControl fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={selectedSupply.status}
                    label='状态'
                    onChange={(e) =>
                      setSelectedSupply({
                        ...selectedSupply,
                        status: e.target.value,
                      })
                    }
                  >
                    <MenuItem value='active'>正常</MenuItem>
                    <MenuItem value='inactive'>停用</MenuItem>
                    <MenuItem value='low_stock'>库存不足</MenuItem>
                    <MenuItem value='out_of_stock'>缺货</MenuItem>
                  </Select>
                </FormControl>
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
                    setSelectedSupply(null);
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
    </PageContainer>
  );
};

export default OfficeSuppliesManagementPage;
