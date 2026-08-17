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
import { Plus, Search, Edit, Trash2, RefreshCw, Gauge } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { capacityApi } from '@/api/aps';
import type { Capacity, CreateCapacityRequest } from '@/api/aps/types';

const STATUS_LABEL: Record<string, string> = {
  available: i18n.t('aps.capacity_management_page.k0'),
  busy: i18n.t('aps.capacity_management_page.k1'),
  maintenance: i18n.t('aps.capacity_management_page.k2'),
  offline: i18n.t('aps.capacity_management_page.k3'),
};
const STATUS_COLOR: Record<string, 'success' | 'warning' | 'info' | 'default' | 'error'> = {
  available: 'success',
  busy: 'warning',
  maintenance: 'info',
  offline: 'default',
};
const QUERY_KEY = 'aps-capacities';
const emptyForm: CreateCapacityRequest = {
  work_center_id: '',
  work_center_name: '',
  capacity_date: '',
  available_hours: 0,
  used_hours: 0,
  status: 'available',
};
const CapacityManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateCapacityRequest>(emptyForm);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Capacity | null>(null);
  const listQuery = useQuery({
    queryKey: [QUERY_KEY, page, pageSize, search],
    queryFn: async () => {
      const res = await capacityApi.list({
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
    mutationFn: (data: CreateCapacityRequest) => capacityApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      setDialogOpen(false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateCapacityRequest }) =>
      capacityApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      setDialogOpen(false);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => capacityApi.delete(id),
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
  const handleOpenEdit = (row: Capacity) => {
    setEditingId(row.id);
    setForm({
      work_center_id: row.work_center_id,
      work_center_name: row.work_center_name ?? '',
      capacity_date: row.capacity_date ?? '',
      available_hours: row.available_hours ?? 0,
      used_hours: row.used_hours ?? 0,
      status: row.status ?? 'available',
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
  const handleDelete = (row: Capacity) => {
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
  const formatRate = (rate?: number) => {
    if (rate === undefined || rate === null) return '-';
    return `${(rate * 100).toFixed(1)}%`;
  };
  const fieldSx = useMemo(() => ({ minWidth: { xs: '100%', sm: 240 } }), []);
  return (
    <PageContainer
      title={i18n.t('aps.capacity_management_page.k4')}
      subtitle={i18n.t('aps.capacity_management_page.k5')}
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
              placeholder={i18n.t('aps.capacity_management_page.k6')}
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
              {i18n.t('pages.capacity_management_page.k0')}
            </Button>
            <Tooltip title={i18n.t('aps.capacity_management_page.k7')}>
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
            {i18n.t('pages.capacity_management_page.k1')}
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
                    <TableCell>{i18n.t('aps.capacity_management_page.k8')}</TableCell>
                    <TableCell>{i18n.t('aps.capacity_management_page.k9')}</TableCell>
                    <TableCell align='right'>
                      {i18n.t('aps.capacity_management_page.k10')}
                    </TableCell>
                    <TableCell align='right'>
                      {i18n.t('aps.capacity_management_page.k11')}
                    </TableCell>
                    <TableCell align='right'>
                      {i18n.t('aps.capacity_management_page.k12')}
                    </TableCell>
                    <TableCell>{i18n.t('aps.capacity_management_page.k13')}</TableCell>
                    <TableCell align='center'>
                      {i18n.t('aps.capacity_management_page.k14')}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {listQuery.isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        align='center'
                      >
                        {i18n.t('pages.capacity_management_page.k2')}
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
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
                          <Gauge size={32} />
                          <Typography
                            variant='body2'
                            color='text.secondary'
                          >
                            {i18n.t('pages.capacity_management_page.k3')}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((row) => (
                      <TableRow
                        key={row.id}
                        hover
                      >
                        <TableCell>{row.work_center_name ?? row.work_center_id}</TableCell>
                        <TableCell>{row.capacity_date ?? '-'}</TableCell>
                        <TableCell align='right'>{row.available_hours ?? 0}</TableCell>
                        <TableCell align='right'>{row.used_hours ?? 0}</TableCell>
                        <TableCell align='right'>{formatRate(row.utilization_rate)}</TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_LABEL[row.status ?? ''] ?? row.status ?? '-'}
                            size='small'
                            color={STATUS_COLOR[row.status ?? ''] ?? 'default'}
                          />
                        </TableCell>
                        <TableCell align='center'>
                          <Tooltip title={i18n.t('aps.capacity_management_page.k15')}>
                            <IconButton
                              size='small'
                              onClick={() => handleOpenEdit(row)}
                            >
                              <Edit size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={i18n.t('aps.capacity_management_page.k16')}>
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
              labelRowsPerPage={i18n.t('aps.capacity_management_page.k17')}
              labelDisplayedRows={({ from, to, count }) =>
                `${from}-${to}${i18n.t('pages.capacity_management_page.k0')}${count}`
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
          {editingId
            ? i18n.t('aps.capacity_management_page.k19')
            : i18n.t('aps.capacity_management_page.k18')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, pt: 1 }}>
            <TextField
              label={i18n.t('aps.capacity_management_page.id_20')}
              value={form.work_center_id}
              onChange={(e) => setForm({ ...form, work_center_id: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label={i18n.t('aps.capacity_management_page.k21')}
              value={form.work_center_name ?? ''}
              onChange={(e) => setForm({ ...form, work_center_name: e.target.value })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label={i18n.t('aps.capacity_management_page.k22')}
              type='date'
              value={form.capacity_date ?? ''}
              onChange={(e) => setForm({ ...form, capacity_date: e.target.value })}
              size='small'
              sx={fieldSx}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label={i18n.t('aps.capacity_management_page.k23')}
              type='number'
              value={form.available_hours ?? 0}
              onChange={(e) => setForm({ ...form, available_hours: Number(e.target.value) })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label={i18n.t('aps.capacity_management_page.k24')}
              type='number'
              value={form.used_hours ?? 0}
              onChange={(e) => setForm({ ...form, used_hours: Number(e.target.value) })}
              size='small'
              sx={fieldSx}
            />
            <TextField
              label={i18n.t('aps.capacity_management_page.k25')}
              select
              value={form.status ?? 'available'}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as CreateCapacityRequest['status'] })
              }
              size='small'
              sx={fieldSx}
            >
              <MenuItem value='available'>{i18n.t('aps.capacity_management_page.k26')}</MenuItem>
              <MenuItem value='busy'>{i18n.t('aps.capacity_management_page.k27')}</MenuItem>
              <MenuItem value='maintenance'>{i18n.t('aps.capacity_management_page.k28')}</MenuItem>
              <MenuItem value='offline'>{i18n.t('aps.capacity_management_page.k29')}</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            {i18n.t('aps.capacity_management_page.k30')}
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? i18n.t('pages.capacity_management_page.k1')
              : i18n.t('aps.capacity_management_page.k31')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>{i18n.t('aps.capacity_management_page.k32')}</DialogTitle>
        <DialogContent>
          <Typography>
            {i18n.t('pages.capacity_management_page.k0')}「
            {deleteTarget?.work_center_name ?? deleteTarget?.work_center_id}」
            {i18n.t('pages.capacity_management_page.k1')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>
            {i18n.t('aps.capacity_management_page.k33')}
          </Button>
          <Button
            variant='contained'
            color='error'
            onClick={confirmDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending
              ? i18n.t('pages.capacity_management_page.k2')
              : i18n.t('aps.capacity_management_page.k34')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};
export default CapacityManagementPage;
