import {
  Chip,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Button,
} from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, DollarSign, ClipboardCheck, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { assetApi, type Asset } from '@/api/erp';
import { employeeApi, type Employee } from '@/api/hrm';
import { useAppStore } from '../../store';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import { MES_PATHS } from '@/modules/mes/config';

const EquipmentManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalAssets, setTotalAssets] = useState(0);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

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
  });

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadData();
  }, [currentPage, debouncedSearch, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      const [assetRes, employeeRes] = await Promise.all([
        assetApi.list(params),
        employeeApi.list(),
      ]);

      if (assetRes.success && assetRes.data) {
        setAssets(assetRes.data.items || []);
        setTotalAssets(assetRes.data.total || 0);
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
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await assetApi.create(newAsset);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '设备创建成功',
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
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '创建设备失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '失败',
        message: (err as { message?: string }).message || '创建设备失败',
        type: 'error',
      });
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm('确定要删除这个设备吗？')) return;
    try {
      const res = await assetApi.delete(id);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '设备删除成功',
          type: 'success',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '删除设备失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '失败',
        message: (err as { message?: string }).message || '删除设备失败',
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
          message: '设备信息更新成功',
          type: 'success',
        });
        setShowEditModal(false);
        setSelectedAsset(null);
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '更新设备失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '失败',
        message: (err as { message?: string }).message || '更新设备失败',
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

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: 'all', label: '全部状态' },
          { value: 'idle', label: '闲置' },
          { value: 'in_use', label: '使用中' },
          { value: 'maintenance', label: '维护中' },
          { value: 'scrapped', label: '报废' },
        ],
      },
    ],

    []
  );

  const handleFilterChange = (filters: Record<string, unknown>) => {
    if (filters.status !== undefined) {
      setFilterStatus(filters.status as string);
      setCurrentPage(1);
    }
  };

  const columns = useMemo<ColumnDef<Asset>[]>(
    () => [
      {
        id: 'asset_number',
        label: '设备编号',
        render: (row) => (
          <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>{row.asset_number}</Typography>
        ),
      },
      {
        id: 'name',
        label: '设备名称',
        render: (row) => <Typography sx={{ color: 'grey.900' }}>{row.name}</Typography>,
      },
      {
        id: 'category',
        label: '类别',
        render: (row) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
            {row.category || '-'}
          </Typography>
        ),
      },
      {
        id: 'brand',
        label: '品牌',
        render: (row) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
            {row.brand || '-'}
          </Typography>
        ),
      },
      {
        id: 'department',
        label: '部门',
        render: (row) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
            {row.department || '-'}
          </Typography>
        ),
      },
      {
        id: 'purchase_amount',
        label: '采购金额',
        align: 'right',
        render: (row) => (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '0.875rem',
              color: 'grey.900',
            }}
          >
            <DollarSign sx={{ width: 12, height: 12, marginRight: 4, color: 'success.dark' }} />
            {row.purchase_amount ? `¥${row.purchase_amount.toLocaleString()}` : '-'}
          </Box>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],

    [employees]
  );

  const rowActions = useMemo<RowAction<Asset>[]>(
    () => [
      {
        label: '编辑',
        icon: <Edit sx={{ width: 16, height: 16 }} />,
        onClick: (row) => {
          setSelectedAsset(row);
          setShowEditModal(true);
        },
      },
      {
        label: '删除',
        icon: <Trash2 sx={{ width: 16, height: 16 }} />,
        color: 'error',
        onClick: (row) => handleDeleteAsset(row.id),
        confirm: true,
        confirmMessage: '确定要删除这个设备吗？',
      },
    ],

    []
  );

  return (
    <PageContainer
      title='设备管理'
      subtitle='设备台账管理'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        backButton={{
          onClick: () => navigate('/dashboard'),
        }}
        columns={columns}
        data={assets}
        loading={loading}
        error={error || undefined}
        getRowId={(row) => row.id}
        searchable
        searchPlaceholder='搜索设备名称、编号、品牌、型号...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        filtersValue={{ status: filterStatus }}
        onFilterChange={handleFilterChange}
        pagination={{
          page: currentPage,
          pageSize,
          total: totalAssets,
          onPageChange: setCurrentPage,
        }}
        rowActions={rowActions}
        onRefresh={loadData}
        actions={[
          {
            label: '点检记录',
            icon: <ClipboardCheck sx={{ width: 16, height: 16 }} />,
            onClick: () => navigate(MES_PATHS.equipment),
            variant: 'outlined',
          },
          {
            label: '维护维修',
            icon: <Wrench sx={{ width: 16, height: 16 }} />,
            onClick: () => navigate(MES_PATHS.equipment),
            variant: 'outlined',
          },
          {
            label: '新增设备',
            icon: <Plus sx={{ width: 16, height: 16 }} />,
            onClick: () => setShowCreateModal(true),
            variant: 'contained',
          },
        ]}
      />

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>新增设备</DialogTitle>
        <DialogContent sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <form onSubmit={handleCreateAsset}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                }}
              >
                <TextField
                  label='设备编号 *'
                  value={newAsset.asset_number || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, asset_number: e.target.value })}
                  fullWidth
                  required
                />
                <TextField
                  label='设备名称 *'
                  value={newAsset.name || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  fullWidth
                  required
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 16,
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
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 16,
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
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 16,
                }}
              >
                <TextField
                  label='额定功率 (kW)'
                  type='number'
                  slotProps={{ htmlInput: { step: '0.01' } }}
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
                  slotProps={{ htmlInput: { step: '0.01' } }}
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
                  slotProps={{ htmlInput: { step: '0.01' } }}
                  value={newAsset.rated_current || ''}
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
                      rated_current: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
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
                  slotProps={{ inputLabel: { shrink: true } } as any}
                />
                <TextField
                  label='采购金额'
                  type='number'
                  slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                  value={newAsset.purchase_amount || ''}
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
                      purchase_amount: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                }}
              >
                <TextField
                  label='存放位置'
                  value={newAsset.location || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                  fullWidth
                />
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
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                }}
              >
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
                <TextField
                  label='图片URL'
                  value={newAsset.image_url || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, image_url: e.target.value })}
                  fullWidth
                />
              </div>

              <TextField
                label='技术规格'
                multiline
                rows={3}
                value={newAsset.specifications || ''}
                onChange={(e) => setNewAsset({ ...newAsset, specifications: e.target.value })}
                fullWidth
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 24,
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
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>编辑设备</DialogTitle>
        <DialogContent sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {selectedAsset && (
            <form onSubmit={handleEditAsset}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 16,
                  }}
                >
                  <TextField
                    label='设备编号 *'
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
                    label='设备名称 *'
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
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 16,
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
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 16,
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
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 16,
                  }}
                >
                  <TextField
                    label='额定功率 (kW)'
                    type='number'
                    slotProps={{ htmlInput: { step: '0.01' } }}
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
                    slotProps={{ htmlInput: { step: '0.01' } }}
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
                    slotProps={{ htmlInput: { step: '0.01' } }}
                    value={selectedAsset.rated_current || ''}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        rated_current: Number(e.target.value),
                      })
                    }
                    fullWidth
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 16,
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
                    slotProps={{ inputLabel: { shrink: true } } as any}
                  />
                  <TextField
                    label='采购金额'
                    type='number'
                    slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                    value={selectedAsset.purchase_amount || ''}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        purchase_amount: Number(e.target.value),
                      })
                    }
                    fullWidth
                  />
                </div>

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

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 16,
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
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  marginTop: 24,
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
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default EquipmentManagementPage;
