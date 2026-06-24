import {
  Card,
  CardContent,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from '@mui/material';
import { Button } from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronLeft, AlertCircle, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { assetApi, type Asset } from '@/api/erp';
import { employeeApi, type Employee } from '@/api/hrm';
import { mesEquipmentApi, type MaintenanceRecord } from '@/api/mesEquipment';
import { useAppStore } from '../../store';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';

const EquipmentMaintenancePage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [assetRes, employeeRes, maintenanceRes] = await Promise.all([
        assetApi.list(),
        employeeApi.list(),
        mesEquipmentApi.listMaintenances(),
      ]);

      if (assetRes.success && assetRes.data) {
        setAssets(assetRes.data.items || []);
      }

      if (employeeRes.success && employeeRes.data) {
        setEmployees(employeeRes.data.items || []);
      }

      if (maintenanceRes.success && maintenanceRes.data) {
        setMaintenances(maintenanceRes.data.items || []);
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
      addNotification({
        title: '失败',
        message: (err as { message?: string }).message || '创建维护记录失败',
        type: 'error',
      });
    }
  };

  const maintenanceColumns = useMemo<ColumnDef<MaintenanceRecord>[]>(
    () => [
      {
        accessorKey: 'equipment_code',
        header: '设备编号',
        cell: ({ row }) => row.original.equipment_code,
      },
      {
        accessorKey: 'equipment_name',
        header: '设备名称',
        cell: ({ row }) => row.original.equipment_name,
      },
      {
        accessorKey: 'maintenance_type',
        header: '维护类型',
        cell: ({ row }) => row.original.maintenance_type,
      },
      {
        accessorKey: 'description',
        header: '维护描述',
        cell: ({ row }) => row.original.description,
      },
      {
        accessorKey: 'maintainer',
        header: '维护人员',
        cell: ({ row }) => row.original.maintainer,
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => (
          <Chip
            size='small'
            color={
              row.original.status === 'completed'
                ? 'success'
                : row.original.status === 'in_progress'
                  ? 'warning'
                  : 'default'
            }
            label={
              row.original.status === 'pending'
                ? '待处理'
                : row.original.status === 'in_progress'
                  ? '进行中'
                  : '完成'
            }
          />
        ),
      },
    ],
    []
  );

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.100' }}>
      <Box sx={{ backgroundColor: 'white', borderBottom: '1px solid border.default' }}>
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                variant='text'
                onClick={() => navigate('/equipment')}
              >
                <ChevronLeft sx={{ width: 20, height: 20, marginRight: 1 }} />
                返回设备台账
              </Button>
              <Box sx={{ ml: 2 }}>
                <Typography
                  sx={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: 'grey.900',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Wrench
                    sx={{
                      width: 28,
                      height: 28,
                      marginRight: 3,
                      color: '#f97316',
                    }}
                  />
                  设备维护维修
                </Typography>
                <Typography sx={{ mt: 0.5, fontSize: '0.875rem', color: 'grey.600' }}>
                  设备维护和维修记录管理
                </Typography>
              </Box>
            </Box>
            <Button
              variant='contained'
              onClick={() => {
                setSelectedForMaintenance(assets[0] || null);
                setShowMaintenanceModal(true);
              }}
            >
              <Plus sx={{ width: 16, height: 16, marginRight: 8 }} />
              新增维护
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 4 }}>
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Box
                  sx={{
                    display: 'inline-block',
                    width: 32,
                    height: 32,
                    border: '4px solid primary.dark',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <Typography sx={{ mt: 2, color: 'grey.600' }}>加载中...</Typography>
              </Box>
            ) : error ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <AlertCircle
                  sx={{
                    width: 48,
                    height: 48,
                    color: 'error.main',
                    mx: 'auto',
                    mb: 2,
                  }}
                />
                <Typography sx={{ color: 'error.dark' }}>{error}</Typography>
                <Button
                  sx={{ mt: 2 }}
                  onClick={loadData}
                >
                  重试
                </Button>
              </Box>
            ) : (
              <DataTable
                columns={maintenanceColumns}
                data={maintenances}
                searchPlaceholder='搜索维护记录...'
                searchKey='description'
              />
            )}
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>设备维护记录</DialogTitle>
        <DialogContent>
          <form onSubmit={handleCreateMaintenance}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
