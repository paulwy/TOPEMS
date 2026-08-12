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
import { Plus, Search, Edit, Trash2, RefreshCw, Package } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { materialPlanApi } from '@/api/aps';
import type { MaterialPlan, CreateMaterialPlanRequest } from '@/api/aps/types';

const SUPPLY_TYPE_LABEL: Record<string, string> = {
  purchase: '采购',
  transfer: '调拨',
  produce: '生产',
};

const STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  satisfied: '已满足',
  shortage: '短缺',
};

const STATUS_COLOR: Record<string, 'default' | 'success' | 'error' | 'warning'> = {
  pending: 'default',
  satisfied: 'success',
  shortage: 'error',
};

const QUERY_KEY = 'aps-material-plans';

const emptyForm: CreateMaterialPlanRequest = {
  plan_no: '',
  plan_id: '',
  material_id: '',
  material_code: '',
  material_name: '',
  required_quantity: 0,
  available_quantity: 0,
  required_date: '',
  supply_type: 'purchase',
  status: 'pending',
};

const MaterialPlanPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateMaterialPlanRequest>(emptyForm);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaterialPlan | null>(null);

  const listQuery = useQuery({
    queryKey: [QUERY_KEY, page, pageSize, search],
    queryFn: async () => {
      const res = await materialPlanApi.list({
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
    mutationFn: (data: CreateMaterialPlanRequest) => materialPlanApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateMaterialPlanRequest }) =>
      materialPlanApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => materialPlanApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      setDeleteOpen(false);
      setDeleteTarget(null);
    },
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

  const handleOpenEdit = (row: MaterialPlan) => {
    setEditingId(row.id);
    setForm({
      plan_no: row.plan_no,
      plan_id: row.plan_id ?? '',
      material_id: row.material_id ?? '',
      material_code: row.material_code ?? '',
      material_name: row.material_name ?? '',
      required_quantity: row.required_quantity ?? 0,
      available_quantity: row.available_quantity ?? 0,
      required_date: row.required_date ?? '',
      supply_type: row.supply_type ?? 'purchase',
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

  const handleDelete = (row: MaterialPlan) => {
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

  const fieldSx = useMemo(() => ({ minWidth: { xs: '100%', sm: 240 } }), []);

  return (
    <PageContainer
      title='物料计划'
      subtitle='物料需求计划管理'
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
              placeholder='按计划编号/物料搜索'
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
            新增物料计划
          </Button>
        </Box>

        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer component={Paper} variant='outlined'>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>计划编号</TableCell>
                    <TableCell>物料编码</TableCell>
                    <TableCell>物料名称</TableCell>
                    <TableCell align='right'>需求数量</TableCell>
                    <TableCell align='right'>可用数量</TableCell>
                    <TableCell align='right'>缺口数量</TableCell>
                    <TableCell>需求日期</TableCell>
                    <TableCell>供应类型</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell align='center'>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {listQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} align='center'>
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align='center'>
                        <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <Package size={32} />
                          <Typography variant='body2' color='text.secondary'>
                            暂无物料计划数据
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((row) => {
                      const shortfall = row.shortfall_quantity ?? 0;
                      const hasShortage = shortfall > 0;
                      return (
                        <TableRow key={row.id} hover>
                          <TableCell>{row.plan_no}</TableCell>
                          <TableCell>{row.material_code ?? '-'}</TableCell>
                          <TableCell>{row.material_name ?? '-'}</TableCell>
                          <TableCell align='right'>{row.required_quantity ?? 0}</TableCell>
                          <TableCell align='right'>{row.available_quantity ?? 0}</TableCell>
                          <TableCell align='right'>
                            {hasShortage ? (
                              <Chip
                                label={String(shortfall)}
                                size='small'
                                color='error'
                                variant='outlined'
                              />
                            ) : (
                              0
                            )}
                          </TableCell>
                          <TableCell>{row.required_date ?? '-'}</TableCell>
                          <TableCell>
                            <Chip
                              label={SUPPLY_TYPE_LABEL[row.supply_type ?? ''] ?? row.supply_type ?? '-'}
                              size='small'
                              variant='outlined'
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={STATUS_LABEL[row.status ?? ''] ?? row.status ?? '-'}
                              size='small'
                              color={STATUS_COLOR[row.status ?? ''] ?? 'default'}
                            />
                          </TableCell>
                          <TableCell align='center'>
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
                          </TableCell>
                        </TableRow>
                      );
                    })
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
        <DialogTitle>{editingId ? '编辑物料计划' : '新增物料计划'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, pt: 1 }}>
            <TextField
              label='计划编号'
              value={form.plan_no}
              onChange={(e) => setForm({ ...form, plan_no: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='生产计划ID'
              value={form.plan_id ?? ''}
              onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='物料编码'
              value={form.material_code ?? ''}
              onChange={(e) => setForm({ ...form, material_code: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='物料名称'
              value={form.material_name ?? ''}
              onChange={(e) => setForm({ ...form, material_name: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='需求数量'
              type='number'
              value={form.required_quantity ?? 0}
              onChange={(e) => setForm({ ...form, required_quantity: Number(e.target.value) })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='可用数量'
              type='number'
              value={form.available_quantity ?? 0}
              onChange={(e) => setForm({ ...form, available_quantity: Number(e.target.value) })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='需求日期'
              type='date'
              value={form.required_date ?? ''}
              onChange={(e) => setForm({ ...form, required_date: e.target.value })}
              size='small'
              sx={fieldSx}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label='供应类型'
              select
              value={form.supply_type ?? 'purchase'}
              onChange={(e) =>
                setForm({ ...form, supply_type: e.target.value as CreateMaterialPlanRequest['supply_type'] })
              }
              size='small'
              sx={fieldSx}
            >
              <MenuItem value='purchase'>采购</MenuItem>
              <MenuItem value='transfer'>调拨</MenuItem>
              <MenuItem value='produce'>生产</MenuItem>
            </TextField>
            <TextField
              label='状态'
              select
              value={form.status ?? 'pending'}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as CreateMaterialPlanRequest['status'] })
              }
              size='small'
              sx={fieldSx}
            >
              <MenuItem value='pending'>待处理</MenuItem>
              <MenuItem value='satisfied'>已满足</MenuItem>
              <MenuItem value='shortage'>短缺</MenuItem>
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
            确认要删除物料计划「{deleteTarget?.plan_no}」吗？此操作不可撤销。
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

export default MaterialPlanPage;
