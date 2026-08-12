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
import { Plus, Search, Edit, Trash2, RefreshCw, ClipboardList } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { productionPlanApi } from '@/api/aps';
import type {
  ProductionPlan,
  CreateProductionPlanRequest,
} from '@/api/aps/types';

const PLAN_TYPE_LABEL: Record<string, string> = {
  monthly: '月计划',
  weekly: '周计划',
  daily: '日计划',
};

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  approved: '已审批',
  in_progress: '执行中',
  completed: '已完成',
  cancelled: '已取消',
};

const STATUS_COLOR: Record<string, 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'> = {
  draft: 'default',
  approved: 'info',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'error',
};

const QUERY_KEY = 'aps-production-plans';

const emptyForm: CreateProductionPlanRequest = {
  plan_no: '',
  plan_name: '',
  plan_type: 'monthly',
  start_date: '',
  end_date: '',
  status: 'draft',
  product_id: '',
  product_name: '',
  target_quantity: 0,
  notes: '',
};

const ProductionPlanPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateProductionPlanRequest>(emptyForm);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductionPlan | null>(null);

  const listQuery = useQuery({
    queryKey: [QUERY_KEY, page, pageSize, search],
    queryFn: async () => {
      const res = await productionPlanApi.list({
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
    mutationFn: (data: CreateProductionPlanRequest) => productionPlanApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      setDialogOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateProductionPlanRequest }) =>
      productionPlanApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      setDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productionPlanApi.delete(id),
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

  const handleOpenEdit = (row: ProductionPlan) => {
    setEditingId(row.id);
    setForm({
      plan_no: row.plan_no,
      plan_name: row.plan_name,
      plan_type: row.plan_type ?? 'monthly',
      start_date: row.start_date ?? '',
      end_date: row.end_date ?? '',
      status: row.status ?? 'draft',
      product_id: row.product_id ?? '',
      product_name: row.product_name ?? '',
      target_quantity: row.target_quantity ?? 0,
      notes: row.notes ?? '',
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

  const handleDelete = (row: ProductionPlan) => {
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
      title='生产计划'
      subtitle='生产计划管理（月/周/日计划）'
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
              placeholder='按计划编号/名称搜索'
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
            <Button
              variant='outlined'
              size='small'
              onClick={handleSearch}
            >
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
            新增计划
          </Button>
        </Box>

        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer component={Paper} variant='outlined'>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>计划编号</TableCell>
                    <TableCell>计划名称</TableCell>
                    <TableCell>类型</TableCell>
                    <TableCell>开始日期</TableCell>
                    <TableCell>结束日期</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell align='right'>目标产量</TableCell>
                    <TableCell align='center'>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {listQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} align='center'>
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align='center'>
                        <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                          <ClipboardList size={32} />
                          <Typography variant='body2' color='text.secondary'>
                            暂无生产计划数据
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.plan_no}</TableCell>
                        <TableCell>{row.plan_name}</TableCell>
                        <TableCell>
                          <Chip
                            label={PLAN_TYPE_LABEL[row.plan_type ?? ''] ?? row.plan_type ?? '-'}
                            size='small'
                            variant='outlined'
                          />
                        </TableCell>
                        <TableCell>{row.start_date ?? '-'}</TableCell>
                        <TableCell>{row.end_date ?? '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_LABEL[row.status ?? ''] ?? row.status ?? '-'}
                            size='small'
                            color={STATUS_COLOR[row.status ?? ''] ?? 'default'}
                          />
                        </TableCell>
                        <TableCell align='right'>{row.target_quantity ?? 0}</TableCell>
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

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth='md'
      >
        <DialogTitle>{editingId ? '编辑生产计划' : '新增生产计划'}</DialogTitle>
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
              label='计划名称'
              value={form.plan_name}
              onChange={(e) => setForm({ ...form, plan_name: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='计划类型'
              select
              value={form.plan_type ?? 'monthly'}
              onChange={(e) =>
                setForm({ ...form, plan_type: e.target.value as CreateProductionPlanRequest['plan_type'] })
              }
              size='small'
              sx={fieldSx}
            >
              <MenuItem value='monthly'>月计划</MenuItem>
              <MenuItem value='weekly'>周计划</MenuItem>
              <MenuItem value='daily'>日计划</MenuItem>
            </TextField>
            <TextField
              label='开始日期'
              type='date'
              value={form.start_date ?? ''}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              size='small'
              sx={fieldSx}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label='结束日期'
              type='date'
              value={form.end_date ?? ''}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              size='small'
              sx={fieldSx}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label='状态'
              select
              value={form.status ?? 'draft'}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as CreateProductionPlanRequest['status'] })
              }
              size='small'
              sx={fieldSx}
            >
              <MenuItem value='draft'>草稿</MenuItem>
              <MenuItem value='approved'>已审批</MenuItem>
              <MenuItem value='in_progress'>执行中</MenuItem>
              <MenuItem value='completed'>已完成</MenuItem>
              <MenuItem value='cancelled'>已取消</MenuItem>
            </TextField>
            <TextField
              label='产品名称'
              value={form.product_name ?? ''}
              onChange={(e) => setForm({ ...form, product_name: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='目标产量'
              type='number'
              value={form.target_quantity ?? 0}
              onChange={(e) =>
                setForm({ ...form, target_quantity: Number(e.target.value) })
              }
              size='small'
              sx={fieldSx}
            />
            <TextField
              label='备注'
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              size='small'
              sx={{ minWidth: { xs: '100%', sm: '100%' } }}
              multiline
              minRows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant='contained' onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <Typography>
            确认要删除生产计划「{deleteTarget?.plan_name ?? deleteTarget?.plan_no}」吗？此操作不可撤销。
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

export default ProductionPlanPage;
