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
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Plus, Edit, Trash2, DollarSign, ClipboardCheck, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCrudOperations } from '@/hooks/useCrudQueries';
import { useQuery } from '@tanstack/react-query';
import { equipmentCrudApi, type Equipment } from '@/api/asset';
import { employeeApi, type Employee } from '@/api/hrm';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import { MES_PATHS } from '@/modules/mes/config';
import { DASHBOARD_PATHS } from '@/routes/dashboard';

const EquipmentManagementPage: React.FC = () => {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Equipment | null>(null);

  const [newAsset, setNewAsset] = useState<Partial<Equipment>>({
    equipment_code: '',
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

  const {
    data: equipments,
    loading,
    error,
    pagination,
    fetch,
    refresh,
    create: createItem,
    update: updateItem,
    delete: deleteItem,
  } = useCrudOperations<Equipment>({
    api: equipmentCrudApi,
    queryKey: 'asset-equipments',
    defaultPageSize: 20,
    pageParamName: 'page',
    pageSizeParamName: 'pagesize',
  });

  const { data: employeesData } = useQuery({
    queryKey: ['hrm-employees-all'],
    queryFn: async () => {
      const res = await employeeApi.list();
      if (res.success && res.data) {
        return res.data.items || [];
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const employees = employeesData || [];

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      pagination.setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, pagination]);

  useEffect(() => {
    const params: Record<string, unknown> = {};
    if (debouncedSearch) {
      params.search = debouncedSearch;
    }
    if (filterStatus !== 'all') {
      params.status = filterStatus;
    }
    fetch(params);
  }, [debouncedSearch, filterStatus, fetch]);

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createItem(newAsset);
      setShowCreateModal(false);
      setNewAsset({
        equipment_code: '',
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
    } catch (_err: unknown) {
      // 错误已由 useCrudOperations 处理
    }
  };

  const handleDeleteAsset = useCallback(
    async (id: string) => {
      try {
        await deleteItem(id);
      } catch (_err: unknown) {
        // 错误已由 useCrudOperations 处理
      }
    },
    [deleteItem]
  );

  const handleEditAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      await updateItem(selectedAsset.id, selectedAsset);
      setShowEditModal(false);
      setSelectedAsset(null);
    } catch (_err: unknown) {
      // 错误已由 useCrudOperations 处理
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
      pagination.setPage(1);
    }
  };

  const columns = useMemo<ColumnDef<Equipment>[]>(
    () => [
      {
        id: 'equipment_code',
        label: '设备编号',
        render: (row) => (
          <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>{row.equipment_code}</Typography>
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

  const rowActions = useMemo<RowAction<Equipment>[]>(
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

    [handleDeleteAsset]
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
          onClick: () => navigate(DASHBOARD_PATHS.dashboard),
        }}
        columns={columns}
        data={equipments}
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
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onPageChange: pagination.setPage,
        }}
        rowActions={rowActions}
        onRefresh={refresh}
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
                  value={newAsset.equipment_code || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, equipment_code: e.target.value })}
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
                  value={newAsset.brand || ''}
                  onChange={(e) => setNewAsset({ ...newAsset, brand: e.target.value })}
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
                    <MenuItem value=''>无</MenuItem>
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
                    value={selectedAsset.equipment_code}
                    onChange={(e) =>
                      setSelectedAsset({
                        ...selectedAsset,
                        equipment_code: e.target.value,
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
                      <MenuItem value=''>无</MenuItem>
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
