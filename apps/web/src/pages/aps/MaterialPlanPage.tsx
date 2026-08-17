import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import i18n from '@/i18n';
import { Plus, Search, Edit, Trash2, RefreshCw, Package } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { materialPlanApi } from '@/api/aps';
import type { MaterialPlan, CreateMaterialPlanRequest } from '@/api/aps/types';

const SUPPLY_TYPE_LABEL: Record<string, string> = {
  purchase: i18n.t('aps.material_plan_page.k0'),
  transfer: i18n.t('aps.material_plan_page.k1'),
  produce: i18n.t('aps.material_plan_page.k2'),
};
const STATUS_LABEL: Record<string, string> = {
  pending: i18n.t('aps.material_plan_page.k3'),
  satisfied: i18n.t('aps.material_plan_page.k4'),
  shortage: i18n.t('aps.material_plan_page.k5'),
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
      title={i18n.t('aps.material_plan_page.k6')}
      subtitle={i18n.t('aps.material_plan_page.k7')}
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
              placeholder={i18n.t('aps.material_plan_page.k8')}
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
              {i18n.t('pages.material_plan_page.k0')}
            </Button>
            <Tooltip title={i18n.t('aps.material_plan_page.k9')}>
              <IconButton
                onClick={handleRefresh}
                size='small'
              >
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
            {i18n.t('pages.material_plan_page.k1')}
          </Button>
        </Box>
        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer
              component={Paper}
              variant='outlined'
            >
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{i18n.t('aps.material_plan_page.k10')}</TableCell>
                    <TableCell>{i18n.t('aps.material_plan_page.k11')}</TableCell>
                    <TableCell>{i18n.t('aps.material_plan_page.k12')}</TableCell>
                    <TableCell align='right'>{i18n.t('aps.material_plan_page.k13')}</TableCell>
                    <TableCell align='right'>{i18n.t('aps.material_plan_page.k14')}</TableCell>
                    <TableCell align='right'>{i18n.t('aps.material_plan_page.k15')}</TableCell>
                    <TableCell>{i18n.t('aps.material_plan_page.k16')}</TableCell>
                    <TableCell>{i18n.t('aps.material_plan_page.k17')}</TableCell>
                    <TableCell>{i18n.t('aps.material_plan_page.k18')}</TableCell>
                    <TableCell align='center'>{i18n.t('aps.material_plan_page.k19')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {listQuery.isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        align='center'
                      >
                        {i18n.t('pages.material_plan_page.k2')}
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        align='center'
                      >
                        <Box
                          sx={{
                            py: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <Package size={32} />
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {i18n.t('pages.material_plan_page.k3')}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((row) => {
                      const shortfall = row.shortfall_quantity ?? 0;
                      const hasShortage = shortfall > 0;
                      return (
                        <TableRow
                          key={row.id}
                          hover
                        >
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
                              label={
                                SUPPLY_TYPE_LABEL[row.supply_type ?? ''] ?? row.supply_type ?? '-'
                              }
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
                            <Tooltip title={i18n.t('aps.material_plan_page.k20')}>
                              <IconButton
                                size='small'
                                onClick={() => handleOpenEdit(row)}
                              >
                                <Edit size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={i18n.t('aps.material_plan_page.k21')}>
                              <IconButton
                                size='small'
                                color='error'
                                onClick={() => handleDelete(row)}
                              >
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
              labelRowsPerPage={i18n.t('aps.material_plan_page.k22')}
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to}${i18n.t('pages.material_plan_page.k0')}${count}`
              }
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
        <DialogTitle>
          {editingId ? i18n.t('aps.material_plan_page.k24') : i18n.t('aps.material_plan_page.k23')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, pt: 1 }}>
            <TextField
              label={i18n.t('aps.material_plan_page.k25')}
              value={form.plan_no}
              onChange={(e) => setForm({ ...form, plan_no: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label={i18n.t('aps.material_plan_page.id_26')}
              value={form.plan_id ?? ''}
              onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label={i18n.t('aps.material_plan_page.k27')}
              value={form.material_code ?? ''}
              onChange={(e) => setForm({ ...form, material_code: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label={i18n.t('aps.material_plan_page.k28')}
              value={form.material_name ?? ''}
              onChange={(e) => setForm({ ...form, material_name: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label={i18n.t('aps.material_plan_page.k29')}
              type='number'
              value={form.required_quantity ?? 0}
              onChange={(e) => setForm({ ...form, required_quantity: Number(e.target.value) })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label={i18n.t('aps.material_plan_page.k30')}
              type='number'
              value={form.available_quantity ?? 0}
              onChange={(e) => setForm({ ...form, available_quantity: Number(e.target.value) })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label={i18n.t('aps.material_plan_page.k31')}
              type='date'
              value={form.required_date ?? ''}
              onChange={(e) => setForm({ ...form, required_date: e.target.value })}
              size='small'
              sx={fieldSx}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label={i18n.t('aps.material_plan_page.k32')}
              select
              value={form.supply_type ?? 'purchase'}
              onChange={(e) =>
                setForm({
                  ...form,
                  supply_type: e.target.value as CreateMaterialPlanRequest['supply_type'],
                })
              }
              size='small'
              sx={fieldSx}
            >
              <MenuItem value='purchase'>{i18n.t('aps.material_plan_page.k33')}</MenuItem>
              <MenuItem value='transfer'>{i18n.t('aps.material_plan_page.k34')}</MenuItem>
              <MenuItem value='produce'>{i18n.t('aps.material_plan_page.k35')}</MenuItem>
            </TextField>
            <TextField
              label={i18n.t('aps.material_plan_page.k36')}
              select
              value={form.status ?? 'pending'}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as CreateMaterialPlanRequest['status'] })
              }
              size='small'
              sx={fieldSx}
            >
              <MenuItem value='pending'>{i18n.t('aps.material_plan_page.k37')}</MenuItem>
              <MenuItem value='satisfied'>{i18n.t('aps.material_plan_page.k38')}</MenuItem>
              <MenuItem value='shortage'>{i18n.t('aps.material_plan_page.k39')}</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {i18n.t('aps.material_plan_page.k40')}
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? i18n.t('pages.material_plan_page.k1') : i18n.t('aps.material_plan_page.k41')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>{i18n.t('aps.material_plan_page.k42')}</DialogTitle>
        <DialogContent>
          <Typography>
            {i18n.t('pages.material_plan_page.k0')}「{deleteTarget?.plan_no}」
            {i18n.t('pages.material_plan_page.k1')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>
            {i18n.t('aps.material_plan_page.k43')}
          </Button>
          <Button
            variant='contained'
            color='error'
            onClick={confirmDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending
              ? i18n.t('pages.material_plan_page.k2')
              : i18n.t('aps.material_plan_page.k44')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};
export default MaterialPlanPage;
