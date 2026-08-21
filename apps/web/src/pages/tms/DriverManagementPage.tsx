import React, { useState } from 'react';
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
import { useCrudOperations } from '@/hooks/useCrudQueries';
import { driverApi } from '@/api/tms';
import type { Driver, CreateDriverRequest, DriverStatus } from '@/api/tms';

function getStatusOptions() {
  return [
    { value: 'active', label: i18n.t('tms.driver_management_page.k0') },
    { value: 'inactive', label: i18n.t('tms.driver_management_page.k1') },
  ];
}
const renderStatusChip = (status?: string) => {
  if (status === 'active')
    return (
      <Chip
        size='small'
        color='success'
        label={i18n.t('tms.driver_management_page.k2')}
      />
    );
  if (status === 'inactive')
    return (
      <Chip
        size='small'
        color='default'
        label={i18n.t('tms.driver_management_page.k3')}
      />
    );
  return (
    <Chip
      size='small'
      color='default'
      label={status || '-'}
    />
  );
};
const DriverManagementPage: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<Partial<Driver>>({});
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const {
    data: rows,
    loading: isLoading,
    pagination: { page, pageSize, total, setPage, setPageSize },
    fetch,
    refresh,
    create: createItem,
    update: updateItem,
    delete: deleteItem,
    createMutation,
    updateMutation,
    deleteMutation,
  } = useCrudOperations<Driver, CreateDriverRequest>({
    api: driverApi,
    queryKey: 'tms-drivers',
    pageParamName: 'page',
    pageSizeParamName: 'pageSize',
  });
  const handleOpenCreate = () => {
    setFormMode('create');
    setFormData({ status: 'active' });
    setFormOpen(true);
  };
  const handleOpenEdit = (row: Driver) => {
    setFormMode('edit');
    setFormData({ ...row });
    setFormOpen(true);
  };
  const handleSubmit = async () => {
    const payload: CreateDriverRequest = {
      driver_no: formData.driver_no || '',
      name: formData.name || '',
      phone: formData.phone,
      license_no: formData.license_no,
      license_type: formData.license_type,
      status: formData.status,
      carrier_id: formData.carrier_id,
    };
    try {
      if (formMode === 'create') {
        await createItem(payload);
      } else if (formData.id) {
        await updateItem(formData.id, payload);
      }
      setFormOpen(false);
    } catch {
      // Error notification handled by hook
    }
  };
  const handleSearchSubmit = () => fetch({ search: searchInput || undefined });
  const handleRefresh = () => refresh();
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteItem(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // Error notification handled by hook
    }
  };
  const submitting = createMutation.isPending || updateMutation.isPending;
  return (
    <PageContainer
      title={i18n.t('tms.driver_management_page.k14')}
      subtitle={i18n.t('tms.driver_management_page.k15')}
      maxWidth={false}
    >
      <Stack
        direction='row'
        spacing={2}
        sx={{
          mb: 2,
          flexWrap: 'wrap',
          gap: 1,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <TextField
            size='small'
            placeholder={i18n.t('tms.driver_management_page.k16')}
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
            {i18n.t('pages.driver_management_page.k0')}
          </Button>
          <Tooltip title={i18n.t('tms.driver_management_page.k17')}>
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
          {i18n.t('pages.driver_management_page.k1')}
        </Button>
      </Stack>
      <Card variant='outlined'>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{i18n.t('tms.driver_management_page.k18')}</TableCell>
                <TableCell>{i18n.t('tms.driver_management_page.k19')}</TableCell>
                <TableCell>{i18n.t('tms.driver_management_page.k20')}</TableCell>
                <TableCell>{i18n.t('tms.driver_management_page.k21')}</TableCell>
                <TableCell>{i18n.t('tms.driver_management_page.k22')}</TableCell>
                <TableCell>{i18n.t('tms.driver_management_page.k23')}</TableCell>
                <TableCell align='center'>{i18n.t('tms.driver_management_page.k24')}</TableCell>
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
                    {i18n.t('pages.driver_management_page.k2')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                  >
                    <TableCell>{row.driver_no || '-'}</TableCell>
                    <TableCell>{row.name || '-'}</TableCell>
                    <TableCell>{row.phone || '-'}</TableCell>
                    <TableCell>{row.license_no || '-'}</TableCell>
                    <TableCell>{row.license_type || '-'}</TableCell>
                    <TableCell>{renderStatusChip(row.status)}</TableCell>
                    <TableCell align='center'>
                      <Stack
                        direction='row'
                        spacing={0.5}
                        sx={{ justifyContent: 'center' }}
                      >
                        <Tooltip title={i18n.t('tms.driver_management_page.k25')}>
                          <IconButton
                            size='small'
                            onClick={() => handleOpenEdit(row)}
                          >
                            <Pencil size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={i18n.t('tms.driver_management_page.k26')}>
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
          onRowsPerPageChange={(e) => setPageSize(Number(e.target.value))}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage={i18n.t('tms.driver_management_page.k27')}
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to}${i18n.t('pages.driver_management_page.k0')}${count}${i18n.t('pages.driver_management_page.k1')}`
          }
        />
      </Card>
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>
          {formMode === 'create'
            ? i18n.t('tms.driver_management_page.k29')
            : i18n.t('tms.driver_management_page.k28')}
        </DialogTitle>
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
              label={i18n.t('tms.driver_management_page.k30')}
              value={formData.driver_no || ''}
              onChange={(e) => setFormData({ ...formData, driver_no: e.target.value })}
              size='small'
              required
            />
            <TextField
              label={i18n.t('tms.driver_management_page.k31')}
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              size='small'
              required
            />
            <TextField
              label={i18n.t('tms.driver_management_page.k32')}
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              size='small'
            />
            <TextField
              label={i18n.t('tms.driver_management_page.k33')}
              value={formData.license_no || ''}
              onChange={(e) => setFormData({ ...formData, license_no: e.target.value })}
              size='small'
            />
            <TextField
              label={i18n.t('tms.driver_management_page.k34')}
              value={formData.license_type || ''}
              onChange={(e) => setFormData({ ...formData, license_type: e.target.value })}
              size='small'
            />
            <TextField
              label={i18n.t('tms.driver_management_page.k35')}
              select
              value={formData.status || 'active'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as DriverStatus })}
              size='small'
            >
              {getStatusOptions().map((opt) => (
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
          <Button onClick={() => setFormOpen(false)}>
            {i18n.t('tms.driver_management_page.k36')}
          </Button>
          <Button
            variant='contained'
            onClick={handleSubmit}
            disabled={submitting || !formData.driver_no || !formData.name}
          >
            {submitting
              ? i18n.t('pages.driver_management_page.k2')
              : i18n.t('tms.driver_management_page.k37')}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>{i18n.t('tms.driver_management_page.k38')}</DialogTitle>
        <DialogContent>
          <Typography>
            {i18n.t('pages.driver_management_page.k0')}「{deleteTarget?.name}」
            {i18n.t('pages.driver_management_page.k1')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>
            {i18n.t('tms.driver_management_page.k39')}
          </Button>
          <Button
            color='error'
            variant='contained'
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending
              ? i18n.t('pages.driver_management_page.k3')
              : i18n.t('tms.driver_management_page.k40')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};
export default DriverManagementPage;
