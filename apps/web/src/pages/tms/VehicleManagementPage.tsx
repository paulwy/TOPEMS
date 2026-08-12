import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Stack,
  CircularProgress,
} from '@mui/material';
import { Plus, Pencil, Trash2, Search, RefreshCw } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store/notificationStore';
import { vehicleApi } from '@/api/tms';
import type { Vehicle, CreateVehicleRequest, VehicleStatus } from '@/api/tms';

const QUERY_KEY = 'tms-vehicles';

const statusOptions = [
  { value: 'active', label: '启用' },
  { value: 'inactive', label: '停用' },
];

const renderStatusChip = (status?: string) => {
  if (status === 'active') return <Chip size='small' color='success' label='启用' />;
  if (status === 'inactive') return <Chip size='small' color='default' label='停用' />;
  if (status === 'maintenance') return <Chip size='small' color='warning' label='维修中' />;
  return <Chip size='small' color='default' label={status || '-'} />;
};

const VehicleManagementPage: React.FC = () => {
  const { t: _t } = useTranslation();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<Partial<Vehicle>>({});
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);

  const queryKey = useMemo(() => [QUERY_KEY, page, pageSize, search], [page, pageSize, search]);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await vehicleApi.list({ page, pageSize, search: search || undefined });
      if (!res.success) throw new Error('加载车辆列表失败');
      return { items: res.data?.items || [], total: res.data?.total || 0 };
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateVehicleRequest) => vehicleApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      addNotification({ type: 'success', title: '创建成功', message: '车辆档案已创建' });
      setFormOpen(false);
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        title: '创建失败',
        message: err instanceof Error ? err.message : '',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateVehicleRequest> }) =>
      vehicleApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      addNotification({ type: 'success', title: '更新成功', message: '车辆档案已更新' });
      setFormOpen(false);
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        title: '更新失败',
        message: err instanceof Error ? err.message : '',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => vehicleApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      addNotification({ type: 'success', title: '删除成功', message: '车辆档案已删除' });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        title: '删除失败',
        message: err instanceof Error ? err.message : '',
      });
    },
  });

  const handleOpenCreate = () => {
    setFormMode('create');
    setFormData({ status: 'active' });
    setFormOpen(true);
  };

  const handleOpenEdit = (row: Vehicle) => {
    setFormMode('edit');
    setFormData({ ...row });
    setFormOpen(true);
  };

  const handleSubmit = () => {
    const payload = {
      vehicle_no: formData.vehicle_no || '',
      plate_number: formData.plate_number,
      vehicle_type: formData.vehicle_type,
      capacity: formData.capacity ? Number(formData.capacity) : undefined,
      carrier_id: formData.carrier_id,
      status: formData.status,
      notes: formData.notes,
    } as CreateVehicleRequest;
    if (formMode === 'create') {
      createMutation.mutate(payload);
    } else if (formData.id) {
      updateMutation.mutate({ id: formData.id, data: payload });
    }
  };

  const handleSearchSubmit = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  };

  const rows = data?.items || [];
  const total = data?.total || 0;
  const submitting = createMutation.isPending || updateMutation.isPending;

  return (
    <PageContainer
      title='车辆档案'
      subtitle='管理运输车辆档案信息'
      maxWidth={false}
    >
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 2, flexWrap: 'wrap', gap: 1, alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Stack direction='row' spacing={1} sx={{ alignItems: 'center' }}>
          <TextField
            size='small'
            placeholder='按车辆编号 / 车牌号搜索'
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearchSubmit();
            }}
            sx={{ width: 280 }}
            slotProps={{
              input: {
                startAdornment: <Search size={16} />,
              },
            }}
          />
          <Button
            variant='outlined'
            size='small'
            onClick={handleSearchSubmit}
          >
            搜索
          </Button>
          <Tooltip title='刷新'>
            <IconButton
              size='small'
              onClick={handleRefresh}
            >
              <RefreshCw size={16} />
            </IconButton>
          </Tooltip>
        </Stack>
        <Button
          variant='contained'
          size='small'
          startIcon={<Plus size={16} />}
          onClick={handleOpenCreate}
        >
          新增车辆
        </Button>
      </Stack>

      <Card variant='outlined'>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>车辆编号</TableCell>
                <TableCell>车牌号</TableCell>
                <TableCell>车型</TableCell>
                <TableCell align='right'>载重</TableCell>
                <TableCell>承运商</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align='center'>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align='center'
                    sx={{ py: 4 }}
                  >
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align='center'
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    暂无车辆数据
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                  >
                    <TableCell>{row.vehicle_no || '-'}</TableCell>
                    <TableCell>{row.plate_number || '-'}</TableCell>
                    <TableCell>{row.vehicle_type || '-'}</TableCell>
                    <TableCell align='right'>{row.capacity ?? '-'}</TableCell>
                    <TableCell>{row.carrier_id || '-'}</TableCell>
                    <TableCell>{renderStatusChip(row.status)}</TableCell>
                    <TableCell align='center'>
                      <Stack
                        direction='row'
                        spacing={0.5}
                        sx={{ justifyContent: 'center' }}
                      >
                        <Tooltip title='编辑'>
                          <IconButton
                            size='small'
                            onClick={() => handleOpenEdit(row)}
                          >
                            <Pencil size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title='删除'>
                          <IconButton
                            size='small'
                            color='error'
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component='div'
          count={total}
          page={page - 1}
          onPageChange={(_, p) => setPage(p + 1)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage='每页'
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 共 ${count} 条`}
        />
      </Card>

      {/* 新增 / 编辑表单 */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{formMode === 'create' ? '新增车辆' : '编辑车辆'}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: 2,
              mt: 1,
            }}
          >
            <TextField
              label='车辆编号'
              value={formData.vehicle_no || ''}
              onChange={(e) => setFormData({ ...formData, vehicle_no: e.target.value })}
              size='small'
              required
            />
            <TextField
              label='车牌号'
              value={formData.plate_number || ''}
              onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
              size='small'
            />
            <TextField
              label='车型'
              value={formData.vehicle_type || ''}
              onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
              size='small'
            />
            <TextField
              label='载重'
              type='number'
              value={formData.capacity ?? ''}
              onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
              size='small'
            />
            <TextField
              label='承运商ID'
              value={formData.carrier_id || ''}
              onChange={(e) => setFormData({ ...formData, carrier_id: e.target.value })}
              size='small'
            />
            <TextField
              label='状态'
              select
              value={formData.status || 'active'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
              size='small'
            >
              {statusOptions.map((opt) => (
                <MenuItem
                  key={opt.value}
                  value={opt.value}
                >
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <TextField
                label='备注'
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                size='small'
                multiline
                rows={2}
                fullWidth
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleSubmit}
            disabled={submitting || !formData.vehicle_no}
          >
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除确认 */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除车辆「{deleteTarget?.vehicle_no}」吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button
            color='error'
            variant='contained'
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? '删除中...' : '删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default VehicleManagementPage;
