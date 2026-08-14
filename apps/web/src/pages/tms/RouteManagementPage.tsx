import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import i18n from '@/i18n';
import { Plus, Pencil, Trash2, Search, RefreshCw } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store/notificationStore';
import { routeApi } from '@/api/tms';
import type { Route, CreateRouteRequest, RouteStatus } from '@/api/tms';
const QUERY_KEY = 'tms-routes';
const statusOptions = [
  { value: 'active', label: i18n.t('tms.route_management_page.k0') },
  { value: 'inactive', label: i18n.t('tms.route_management_page.k1') },
];
const renderStatusChip = (status?: string) => {
  if (status === 'active') return <Chip size='small' color='success' label={i18n.t('tms.route_management_page.k2')} />;
  if (status === 'inactive') return <Chip size='small' color='default' label={i18n.t('tms.route_management_page.k3')} />;
  return <Chip size='small' color='default' label={status || '-'} />;
};
const RouteManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<Partial<Route>>({});
  const [deleteTarget, setDeleteTarget] = useState<Route | null>(null);
  const queryKey = useMemo(() => [QUERY_KEY, page, pageSize, search], [page, pageSize, search]);
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await routeApi.list({ page, pageSize, search: search || undefined });
      if (!res.success) throw new Error(i18n.t('tms.route_management_page.k4'));
      return { items: res.data?.items || [], total: res.data?.total || 0 };
    },
  });
  const createMutation = useMutation({
    mutationFn: (data: CreateRouteRequest) => routeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      addNotification({ type: 'success', title: i18n.t('tms.route_management_page.k6'), message: i18n.t('tms.route_management_page.k5') });
      setFormOpen(false);
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        title: i18n.t('tms.route_management_page.k7'),
        message: err instanceof Error ? err.message : '',
      });
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateRouteRequest> }) =>
      routeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      addNotification({ type: 'success', title: i18n.t('tms.route_management_page.k9'), message: i18n.t('tms.route_management_page.k8') });
      setFormOpen(false);
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        title: i18n.t('tms.route_management_page.k10'),
        message: err instanceof Error ? err.message : '',
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => routeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      addNotification({ type: 'success', title: i18n.t('tms.route_management_page.k12'), message: i18n.t('tms.route_management_page.k11') });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        title: i18n.t('tms.route_management_page.k13'),
        message: err instanceof Error ? err.message : '',
      });
    },
  });
  const handleOpenCreate = () => {
    setFormMode('create');
    setFormData({ status: 'active' });
    setFormOpen(true);
  };
  const handleOpenEdit = (row: Route) => {
    setFormMode('edit');
    setFormData({ ...row });
    setFormOpen(true);
  };
  const handleSubmit = () => {
    const payload: CreateRouteRequest = {
      route_no: formData.route_no || '',
      name: formData.name || '',
      origin: formData.origin,
      destination: formData.destination,
      distance_km: formData.distance_km ? Number(formData.distance_km) : undefined,
      estimated_hours: formData.estimated_hours ? Number(formData.estimated_hours) : undefined,
      status: formData.status,
    };
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
      title={i18n.t('tms.route_management_page.k14')}
      subtitle={i18n.t('tms.route_management_page.k15')}
      maxWidth={false}
    >
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 2, flexWrap: 'wrap', gap: 1, alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <TextField
            size='small'
            placeholder={i18n.t('tms.route_management_page.k16')}
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
            {i18n.t('pages.route_management_page.k0')}
          </Button>
          <Tooltip title={i18n.t('tms.route_management_page.k17')}>
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
          {i18n.t('pages.route_management_page.k1')}
        </Button>
      </Stack>
      <Card variant='outlined'>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{i18n.t('tms.route_management_page.k18')}</TableCell>
                <TableCell>{i18n.t('tms.route_management_page.k19')}</TableCell>
                <TableCell>{i18n.t('tms.route_management_page.k20')}</TableCell>
                <TableCell>{i18n.t('tms.route_management_page.k21')}</TableCell>
                <TableCell align='right'>{i18n.t('tms.route_management_page.km_22')}</TableCell>
                <TableCell align='right'>{i18n.t('tms.route_management_page.h_23')}</TableCell>
                <TableCell>{i18n.t('tms.route_management_page.k24')}</TableCell>
                <TableCell align='center'>{i18n.t('tms.route_management_page.k25')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    align='center'
                    sx={{ py: 4 }}
                  >
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    align='center'
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    {i18n.t('pages.route_management_page.k2')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                  >
                    <TableCell>{row.route_no || '-'}</TableCell>
                    <TableCell>{row.name || '-'}</TableCell>
                    <TableCell>{row.origin || '-'}</TableCell>
                    <TableCell>{row.destination || '-'}</TableCell>
                    <TableCell align='right'>{row.distance_km ?? '-'}</TableCell>
                    <TableCell align='right'>{row.estimated_hours ?? '-'}</TableCell>
                    <TableCell>{renderStatusChip(row.status)}</TableCell>
                    <TableCell align='center'>
                      <Stack
                        direction='row'
                        spacing={0.5}
                        sx={{ justifyContent: 'center' }}
                      >
                        <Tooltip title={i18n.t('tms.route_management_page.k26')}>
                          <IconButton
                            size='small'
                            onClick={() => handleOpenEdit(row)}
                          >
                            <Pencil size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={i18n.t('tms.route_management_page.k27')}>
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
          labelRowsPerPage={i18n.t('tms.route_management_page.k28')}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to}${i18n.t('pages.route_management_page.k0')}${count}${i18n.t('pages.route_management_page.k1')}`}
        />
      </Card>
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{formMode === 'create' ? i18n.t('tms.route_management_page.k30') : i18n.t('tms.route_management_page.k29')}</DialogTitle>
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
              label={i18n.t('tms.route_management_page.k31')}
              value={formData.route_no || ''}
              onChange={(e) => setFormData({ ...formData, route_no: e.target.value })}
              size='small'
              required
            />
            <TextField
              label={i18n.t('tms.route_management_page.k32')}
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              size='small'
              required
            />
            <TextField
              label={i18n.t('tms.route_management_page.k33')}
              value={formData.origin || ''}
              onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
              size='small'
            />
            <TextField
              label={i18n.t('tms.route_management_page.k34')}
              value={formData.destination || ''}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              size='small'
            />
            <TextField
              label={i18n.t('tms.route_management_page.km_35')}
              type='number'
              value={formData.distance_km ?? ''}
              onChange={(e) => setFormData({ ...formData, distance_km: Number(e.target.value) })}
              size='small'
            />
            <TextField
              label={i18n.t('tms.route_management_page.h_36')}
              type='number'
              value={formData.estimated_hours ?? ''}
              onChange={(e) =>
                setFormData({ ...formData, estimated_hours: Number(e.target.value) })
              }
              size='small'
            />
            <TextField
              label={i18n.t('tms.route_management_page.k37')}
              select
              value={formData.status || 'active'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as RouteStatus })}
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>{i18n.t('tms.route_management_page.k38')}</Button>
          <Button
            variant='contained'
            onClick={handleSubmit}
            disabled={submitting || !formData.route_no || !formData.name}
          >
            {submitting ? i18n.t('pages.route_management_page.k2') : i18n.t('tms.route_management_page.k39')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>{i18n.t('tms.route_management_page.k40')}</DialogTitle>
        <DialogContent>
          <Typography>
            确定要删除路线「{deleteTarget?.name}」吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{i18n.t('tms.route_management_page.k41')}</Button>
          <Button
            color='error'
            variant='contained'
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? i18n.t('pages.route_management_page.k3') : i18n.t('tms.route_management_page.k42')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};
export default RouteManagementPage;