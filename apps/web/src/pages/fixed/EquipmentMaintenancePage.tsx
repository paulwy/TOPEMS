import {
  Box,
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
} from '@mui/material';
import { Button } from '@mui/material';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Edit, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { assetApi, type Asset } from '@/api/erp';
import { mesEquipmentApi, type MaintenanceRecord } from '@/api/mes';
import { useAppStore } from '../../store';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { apiLogger } from '@/utils/logger';

const STATUS_COLOR_MAP: Record<string, 'success' | 'warning' | 'default' | 'error'> = {
  completed: 'success',
  in_progress: 'warning',
  pending: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '完成',
};

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '完成' },
];

const EquipmentMaintenancePage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalMaintenances, setTotalMaintenances] = useState(0);

  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedForMaintenance, setSelectedForMaintenance] = useState<Asset | null>(null);

  const [newMaintenance, setNewMaintenance] = useState<Partial<MaintenanceRecord>>({
    maintenance_type: '',
    description: '',
    maintainer: '',
    start_time: new Date().toISOString(),
    status: 'pending',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, debouncedSearch, filterStatus]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: currentPage + 1,
        page_size: pageSize,
      };
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (filterStatus) {
        params.status = filterStatus;
      }

      const [assetRes, maintenanceRes] = await Promise.all([
        assetApi.list(),
        mesEquipmentApi.listMaintenances(params),
      ]);

      if (assetRes.success && assetRes.data) {
        setAssets(assetRes.data.items || []);
      }

      if (maintenanceRes.success && maintenanceRes.data) {
        setMaintenances(maintenanceRes.data.items || []);
        setTotalMaintenances(maintenanceRes.data.total || 0);
      }
    } catch (err: unknown) {
      const message = (err as { message?: string }).message || '加载数据失败';
      setError(message);
      apiLogger.error('加载维护记录失败:', err);
      addNotification({
        title: '加载失败',
        message: '加载数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, filterStatus, addNotification]);

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForMaintenance) return;
    try {
      const data: any = {
        equipment_id: selectedForMaintenance.id,
        maintenance_type: newMaintenance.maintenance_type,
        description: newMaintenance.description,
        maintainer: newMaintenance.maintainer,
        start_time: newMaintenance.start_time,
        end_time: newMaintenance.end_time,
        cost: newMaintenance.cost,
        status: newMaintenance.status,
        remarks: newMaintenance.remarks,
      };
      const res = await mesEquipmentApi.createMaintenance(data);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '维护记录创建成功',
          type: 'success',
        });
        setShowMaintenanceModal(false);
        setSelectedForMaintenance(null);
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '创建维护记录失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('创建维护记录失败:', err);
      addNotification({
        title: '失败',
        message: (err as { message?: string }).message || '创建维护记录失败',
        type: 'error',
      });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(0);
  };

  const handleFilterChange = (filters: Record<string, any>) => {
    if (filters.status !== undefined) {
      setFilterStatus(filters.status);
      setCurrentPage(0);
    }
  };

  const getStatusBadge = (status: string) => (
    <Chip
      size='small'
      color={STATUS_COLOR_MAP[status] || 'default'}
      label={STATUS_LABEL_MAP[status] || status}
      variant='outlined'
    />
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: STATUS_OPTIONS,
        value: filterStatus,
        onChange: (value: any) => setFilterStatus(value),
      },
    ],
    [filterStatus]
  );

  const columns = useMemo<ColumnDef<MaintenanceRecord>[]>(
    () => [
      {
        id: 'equipment_code',
        label: '设备编号',
        width: 140,
        sortable: true,
        render: (row) => (
          <Typography sx={{ fontWeight: 500, color: 'grey.900' }}>{row.equipment_code}</Typography>
        ),
      },
      {
        id: 'equipment_name',
        label: '设备名称',
        width: 180,
        render: (row) => <Typography sx={{ color: 'grey.900' }}>{row.equipment_name}</Typography>,
      },
      {
        id: 'maintenance_type',
        label: '维护类型',
        width: 120,
        render: (row) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>{row.maintenance_type}</Typography>
        ),
      },
      {
        id: 'description',
        label: '维护描述',
        minWidth: 200,
        render: (row) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>{row.description}</Typography>
        ),
      },
      {
        id: 'maintainer',
        label: '维护人员',
        width: 100,
        render: (row) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>{row.maintainer || '-'}</Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'start_time',
        label: '开始时间',
        width: 160,
        sortable: true,
        render: (row) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
            {row.start_time?.substring(0, 16).replace('T', ' ') || '-'}
          </Typography>
        ),
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<MaintenanceRecord>[]>(
    () => [
      {
        label: '编辑',
        icon: <Edit sx={{ width: 16, height: 16 }} />,
        onClick: () => {
          addNotification({
            title: '提示',
            message: '编辑功能开发中',
            type: 'info',
          });
        },
      },
    ],
    [addNotification]
  );

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.50' }}>
      <ListPageTemplate
        title='设备维护维修'
        subtitle='设备维护和维修记录管理'
        backButton={{
          onClick: () => navigate('/equipment'),
        }}
        columns={columns}
        data={maintenances}
        loading={loading}
        error={error || undefined}
        getRowId={(row) => row.id}
        sortable
        defaultSortBy='start_time'
        defaultSortOrder='desc'
        searchable
        searchPlaceholder='搜索设备名称、编号、维护人员...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        filtersValue={{ status: filterStatus }}
        onFilterChange={handleFilterChange}
        pagination={{
          page: currentPage,
          pageSize,
          total: totalMaintenances,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        rowActions={rowActions}
        onRefresh={loadData}
        actions={[
          {
            label: '新增维护',
            icon: <Plus sx={{ width: 16, height: 16 }} />,
            onClick: () => {
              setSelectedForMaintenance(assets[0] || null);
              setShowMaintenanceModal(true);
            },
            variant: 'contained',
          },
        ]}
        showRowNumber
        columnConfigurable
        persistColumnConfig
        columnConfigStorageKey='equipment-maintenances-columns'
      />

      <Dialog
        open={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>设备维护记录</DialogTitle>
        <DialogContent>
          <form onSubmit={handleCreateMaintenance}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Box sx={{ backgroundColor: 'grey.50', p: 2, borderRadius: 2 }}>
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#475569',
                  }}
                >
                  设备: {selectedForMaintenance?.name} ({selectedForMaintenance?.asset_number})
                </Typography>
              </Box>

              <FormControl fullWidth>
                <InputLabel>维护类型 *</InputLabel>
                <Select
                  value={newMaintenance.maintenance_type || ''}
                  label='维护类型 *'
                  onChange={(e) =>
                    setNewMaintenance({
                      ...newMaintenance,
                      maintenance_type: e.target.value,
                    })
                  }
                >
                  <MenuItem value='定期维护'>定期维护</MenuItem>
                  <MenuItem value='故障维修'>故障维修</MenuItem>
                  <MenuItem value='预防性维护'>预防性维护</MenuItem>
                  <MenuItem value='大修'>大修</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label='维护描述 *'
                multiline
                rows={3}
                value={newMaintenance.description || ''}
                onChange={(e) =>
                  setNewMaintenance({
                    ...newMaintenance,
                    description: e.target.value,
                  })
                }
                fullWidth
                required
              />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <TextField
                  label='维护人员 *'
                  value={newMaintenance.maintainer || ''}
                  onChange={(e) =>
                    setNewMaintenance({
                      ...newMaintenance,
                      maintainer: e.target.value,
                    })
                  }
                  fullWidth
                  required
                />
                <TextField
                  label='开始时间 *'
                  type='datetime-local'
                  value={
                    newMaintenance.start_time ? newMaintenance.start_time.substring(0, 16) : ''
                  }
                  onChange={(e) =>
                    setNewMaintenance({
                      ...newMaintenance,
                      start_time: new Date(e.target.value).toISOString(),
                    })
                  }
                  fullWidth
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 2,
                }}
              >
                <TextField
                  label='结束时间'
                  type='datetime-local'
                  value={newMaintenance.end_time ? newMaintenance.end_time.substring(0, 16) : ''}
                  onChange={(e) =>
                    setNewMaintenance({
                      ...newMaintenance,
                      end_time: new Date(e.target.value).toISOString(),
                    })
                  }
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label='费用 (元)'
                  type='number'
                  slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                  value={newMaintenance.cost || ''}
                  onChange={(e) =>
                    setNewMaintenance({
                      ...newMaintenance,
                      cost: Number(e.target.value),
                    })
                  }
                  fullWidth
                />
              </Box>

              <FormControl fullWidth>
                <InputLabel>维护状态</InputLabel>
                <Select
                  value={newMaintenance.status || 'pending'}
                  label='维护状态'
                  onChange={(e) =>
                    setNewMaintenance({
                      ...newMaintenance,
                      status: e.target.value,
                    })
                  }
                >
                  <MenuItem value='pending'>待处理</MenuItem>
                  <MenuItem value='in_progress'>进行中</MenuItem>
                  <MenuItem value='completed'>已完成</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label='备注'
                multiline
                rows={2}
                value={newMaintenance.remarks || ''}
                onChange={(e) =>
                  setNewMaintenance({
                    ...newMaintenance,
                    remarks: e.target.value,
                  })
                }
                fullWidth
              />
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
                onClick={() => setShowMaintenanceModal(false)}
              >
                取消
              </Button>
              <Button
                variant='contained'
                type='submit'
              >
                提交
              </Button>
            </Box>
          </form>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default EquipmentMaintenancePage;
