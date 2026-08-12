import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Tooltip,
  MenuItem,
  Paper,
  InputAdornment,
} from '@mui/material';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  Play,
  CheckCircle,
  XCircle,
  CalendarCheck,
} from 'lucide-react';
import { PageContainer } from '@/components/common';
import { scheduleApi } from '@/api/aps';
import type { Schedule, CreateScheduleRequest } from '@/api/aps/types';

const STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  released: '已发布',
  running: '运行中',
  completed: '已完成',
  cancelled: '已取消',
};

const STATUS_COLOR: Record<string, 'default' | 'primary' | 'success' | 'error' | 'info' | 'warning'> = {
  pending: 'default',
  released: 'info',
  running: 'primary',
  completed: 'success',
  cancelled: 'error',
};

const QUERY_KEY = 'aps-schedules';

const emptyForm: CreateScheduleRequest = {
  schedule_no: '',
  plan_id: '',
  work_order_id: '',
  product_id: '',
  product_name: '',
  work_center_id: '',
  work_center_name: '',
  planned_start: '',
  planned_end: '',
  quantity: 0,
  priority: 1,
  status: 'pending',
};

const ScheduleManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateScheduleRequest>(emptyForm);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Schedule | null>(null);

  const listQuery = useQuery({
    queryKey: [QUERY_KEY, page, pageSize, search],
    queryFn: async () => {
      const res = await scheduleApi.list({
        page: page + 1,
        pageSize,
        search: search || undefined,
      });
      if (res.success && res.data) {
        return { items: res.data.items, total: res.data.total };
      }
      return { items: [], total: 0 };
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateScheduleRequest) => scheduleApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateScheduleRequest }) =>
      scheduleApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => scheduleApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      setDeleteOpen(false);
      setDeleteTarget(null);
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => scheduleApi.start(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => scheduleApi.complete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => scheduleApi.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const saving = createMutation.isPending || updateMutation.isPending;

  const handleSearch = () => {
    setSearch(searchInput.trim());
    setPage(0);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (row: Schedule) => {
    setEditingId(row.id);
    setForm({
      schedule_no: row.schedule_no,
      plan_id: row.plan_id ?? '',
      work_order_id: row.work_order_id ?? '',
      product_id: row.product_id ?? '',
      product_name: row.product_name ?? '',
      work_center_id: row.work_center_id ?? '',
      work_center_name: row.work_center_name ?? '',
      planned_start: row.planned_start ?? '',
      planned_end: row.planned_end ?? '',
      quantity: row.quantity ?? 0,
      priority: row.priority ?? 1,
      status: row.status ?? 'pending',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (row: Schedule) => {
    setDeleteTarget(row);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  };

  const fieldSx = useMemo(
    () => ({ minWidth: { xs: '100%', sm: 240 } }),
    []
  );

  return (
    <PageContainer
      title='排程管理'
      subtitle='生产排程管理（开始/完成/取消）'
      padding={false}
      maxWidth={false}
    >
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flex: 1 }}>
            <TextField
              placeholder='按排程编号/产品搜索'
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              size='small'
              sx={{ flex: 1, maxWidth: 360 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>
                      <Search size={16} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Button variant='outlined' size='small' onClick={handleSearch}>
              搜索
            </Button>
            <Tooltip title='刷新'>
              <IconButton onClick={handleRefresh} size='small'>
                <RefreshCw size={16} />
              </IconButton>
            </Tooltip>
          </Box>
          <Button
            variant='contained'
            size='small'
            startIcon={<Plus size={16} />}
            onClick={handleOpenCreate}
          >
            新增排程
          </Button>
        </Box>

        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer component={Paper} variant='outlined'>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>排程编号</TableCell>
                    <TableCell>产品</TableCell>
                    <TableCell>工作中心</TableCell>
                    <TableCell>计划开始</TableCell>
                    <TableCell>计划结束</TableCell>
                    <TableCell align='right'>数量</TableCell>
                    <TableCell align='center'>优先级</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell align='center'>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {listQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} align='center'>
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align='center'>
                        <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <CalendarCheck size={32} />
                          <Typography variant='body2' color='text.secondary'>
                            暂无排程数据
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.schedule_no}</TableCell>
                        <TableCell>{row.product_name ?? '-'}</TableCell>
                        <TableCell>{row.work_center_name ?? '-'}</TableCell>
                        <TableCell>{row.planned_start ?? '-'}</TableCell>
                        <TableCell>{row.planned_end ?? '-'}</TableCell>
                        <TableCell align='right'>{row.quantity ?? 0}</TableCell>
                        <TableCell align='center'>{row.priority ?? '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_LABEL[row.status ?? ''] ?? row.status ?? '-'}
                            size='small'
                            color={STATUS_COLOR[row.status ?? ''] ?? 'default'}
                          />
                        </TableCell>
                        <TableCell align='center'>
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                            {row.status === 'pending' && (
                              <Tooltip title='开始'>
                                <IconButton
                                  size='small'
                                  color='primary'
                                  onClick={() => startMutation.mutate(row.id)}
                                  disabled={startMutation.isPending}
                                >
                                  <Play size={16} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {row.status === 'running' && (
                              <Tooltip title='完成'>
                                <IconButton
                                  size='small'
                                  color='success'
                                  onClick={() => completeMutation.mutate(row.id)}
                                  disabled={completeMutation.isPending}
                                >
                                  <CheckCircle size={16} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {(row.status === 'pending' || row.status === 'running') && (
                              <Tooltip title='取消'>
                                <IconButton
                                  size='small'
                                  color='error'
                                  onClick={() => cancelMutation.mutate(row.id)}
                                  disabled={cancelMutation.isPending}
                                >
                                  <XCircle size={16} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title='编辑'>
                              <IconButton size='small' onClick={() => handleOpenEdit(row)}>
                                <Edit size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title='删除'>
                              <IconButton size='small' color='error' onClick={() => handleDelete(row)}>
                                <Trash2 size={16} />
                              </IconButton>
                            </Tooltip>
                          </Box>
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
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50]}
              labelRowsPerPage='每页'
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 共 ${count}`}
            />
          </CardContent>
        </Card>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth='md'>
        <DialogTitle>{editingId ? '编辑排程' : '新增排程'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, pt: 1 }}>
            <TextField
              label='排程编号'
              value={form.schedule_no}
              onChange={(e) => setForm({ ...form, schedule_no: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='计划ID'
              value={form.plan_id ?? ''}
              onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='工单ID'
              value={form.work_order_id ?? ''}
              onChange={(e) => setForm({ ...form, work_order_id: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='产品名称'
              value={form.product_name ?? ''}
              onChange={(e) => setForm({ ...form, product_name: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='工作中心名称'
              value={form.work_center_name ?? ''}
              onChange={(e) => setForm({ ...form, work_center_name: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='计划开始'
              type='datetime-local'
              value={form.planned_start ?? ''}
              onChange={(e) => setForm({ ...form, planned_start: e.target.value })}
              size='small'
              sx={fieldSx}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label='计划结束'
              type='datetime-local'
              value={form.planned_end ?? ''}
              onChange={(e) => setForm({ ...form, planned_end: e.target.value })}
              size='small'
              sx={fieldSx}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label='数量'
              type='number'
              value={form.quantity ?? 0}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='优先级'
              type='number'
              value={form.priority ?? 1}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='状态'
              select
              value={form.status ?? 'pending'}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as CreateScheduleRequest['status'] })
              }
              size='small'
              sx={fieldSx}
            >
              <MenuItem value='pending'>待开始</MenuItem>
              <MenuItem value='in_progress'>进行中</MenuItem>
              <MenuItem value='completed'>已完成</MenuItem>
              <MenuItem value='cancelled'>已取消</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant='contained' onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth='xs' fullWidth>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确认要删除排程「{deleteTarget?.schedule_no}」吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>取消</Button>
          <Button
            variant='contained'
            color='error'
            onClick={confirmDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? '删除中...' : '删除'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ScheduleManagementPage;
