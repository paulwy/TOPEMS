import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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
  Tooltip,
  Stack,
  TextField,
  Chip,
  CircularProgress,
  IconButton,
} from '@mui/material';
import i18n from '@/i18n';
import { Search, RefreshCw, Send, MapPin, XCircle } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { useCrudOperations } from '@/hooks/useCrudQueries';
import { shipmentApi } from '@/api/tms';
import type { Shipment } from '@/api/tms';

type ShipmentStatus = 'pending' | 'in_transit' | 'delivered' | 'cancelled';
const statusMeta: Record<
  ShipmentStatus,
  { label: string; color: 'warning' | 'info' | 'success' | 'default' }
> = {
  pending: { label: i18n.t('tms.shipment_management_page.k0'), color: 'warning' },
  in_transit: { label: i18n.t('tms.shipment_management_page.k1'), color: 'info' },
  delivered: { label: i18n.t('tms.shipment_management_page.k2'), color: 'success' },
  cancelled: { label: i18n.t('tms.shipment_management_page.k3'), color: 'default' },
};
const renderStatusChip = (status?: string) => {
  const key = (status as ShipmentStatus) || 'pending';
  const meta = statusMeta[key] || { label: status || '-', color: 'default' as const };
  return (
    <Chip
      size='small'
      color={meta.color}
      label={meta.label}
    />
  );
};
const ShipmentManagementPage: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const {
    data: rows,
    loading: isLoading,
    pagination: { page, pageSize, total, setPage, setPageSize },
    fetch,
    refresh,
  } = useCrudOperations<Shipment>({
    api: shipmentApi,
    queryKey: 'tms-shipments',
    pageParamName: 'page',
    pageSizeParamName: 'pageSize',
  });
  const dispatchMutation = useMutation({
    mutationFn: (id: string) => shipmentApi.dispatch(id),
    onSuccess: () => refresh(),
  });
  const arriveMutation = useMutation({
    mutationFn: (id: string) => shipmentApi.arrive(id),
    onSuccess: () => refresh(),
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => shipmentApi.cancel(id),
    onSuccess: () => refresh(),
  });
  const handleSearchSubmit = () => fetch({ search: searchInput || undefined });
  const handleRefresh = () => refresh();
  const renderActions = (row: Shipment) => {
    const status = row.status as ShipmentStatus;
    const acting =
      dispatchMutation.isPending || arriveMutation.isPending || cancelMutation.isPending;
    if (status === 'pending') {
      return (
        <Stack
          direction='row'
          spacing={0.5}
          sx={{ justifyContent: 'center' }}
        >
          <Tooltip title={i18n.t('tms.shipment_management_page.k14')}>
            <IconButton
              size='small'
              color='primary'
              disabled={acting}
              onClick={() => dispatchMutation.mutate(row.id)}
            >
              <Send size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title={i18n.t('tms.shipment_management_page.k15')}>
            <IconButton
              size='small'
              color='error'
              disabled={acting}
              onClick={() => cancelMutation.mutate(row.id)}
            >
              <XCircle size={16} />
            </IconButton>
          </Tooltip>
        </Stack>
      );
    }
    if (status === 'in_transit') {
      return (
        <Stack
          direction='row'
          spacing={0.5}
          sx={{ justifyContent: 'center' }}
        >
          <Tooltip title={i18n.t('tms.shipment_management_page.k16')}>
            <IconButton
              size='small'
              color='success'
              disabled={acting}
              onClick={() => arriveMutation.mutate(row.id)}
            >
              <MapPin size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title={i18n.t('tms.shipment_management_page.k17')}>
            <IconButton
              size='small'
              color='error'
              disabled={acting}
              onClick={() => cancelMutation.mutate(row.id)}
            >
              <XCircle size={16} />
            </IconButton>
          </Tooltip>
        </Stack>
      );
    }
    return (
      <Typography
        variant='body2'
        color='text.secondary'
      >
        -
      </Typography>
    );
  };
  return (
    <PageContainer
      title={i18n.t('tms.shipment_management_page.k18')}
      subtitle={i18n.t('tms.shipment_management_page.k19')}
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
            placeholder={i18n.t('tms.shipment_management_page.k20')}
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
            {i18n.t('pages.shipment_management_page.k0')}
          </Button>
          <Tooltip title={i18n.t('tms.shipment_management_page.k21')}>
            <IconButton
              size='small'
              onClick={handleRefresh}
            >
              <RefreshCw size={16} />
            </IconButton>
          </Tooltip>
        </Stack>
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <Chip
            size='small'
            color='warning'
            label={i18n.t('tms.shipment_management_page.k22')}
          />
          <Chip
            size='small'
            color='info'
            label={i18n.t('tms.shipment_management_page.k23')}
          />
          <Chip
            size='small'
            color='success'
            label={i18n.t('tms.shipment_management_page.k24')}
          />
          <Chip
            size='small'
            color='default'
            label={i18n.t('tms.shipment_management_page.k25')}
          />
        </Stack>
      </Stack>
      <Card variant='outlined'>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{i18n.t('tms.shipment_management_page.k26')}</TableCell>
                <TableCell>{i18n.t('tms.shipment_management_page.k27')}</TableCell>
                <TableCell>{i18n.t('tms.shipment_management_page.k28')}</TableCell>
                <TableCell>{i18n.t('tms.shipment_management_page.k29')}</TableCell>
                <TableCell>{i18n.t('tms.shipment_management_page.k30')}</TableCell>
                <TableCell>{i18n.t('tms.shipment_management_page.k31')}</TableCell>
                <TableCell>{i18n.t('tms.shipment_management_page.k32')}</TableCell>
                <TableCell>{i18n.t('tms.shipment_management_page.k33')}</TableCell>
                <TableCell>{i18n.t('tms.shipment_management_page.k34')}</TableCell>
                <TableCell>{i18n.t('tms.shipment_management_page.k35')}</TableCell>
                <TableCell align='center'>{i18n.t('tms.shipment_management_page.k36')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    align='center'
                    sx={{ py: 4 }}
                  >
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    align='center'
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    {i18n.t('pages.shipment_management_page.k1')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                  >
                    <TableCell>{row.shipment_no || '-'}</TableCell>
                    <TableCell>{row.carrier_id || '-'}</TableCell>
                    <TableCell>{row.vehicle_id || '-'}</TableCell>
                    <TableCell>{row.driver_id || '-'}</TableCell>
                    <TableCell>{row.route_id || '-'}</TableCell>
                    <TableCell>{row.origin || '-'}</TableCell>
                    <TableCell>{row.destination || '-'}</TableCell>
                    <TableCell>{renderStatusChip(row.status)}</TableCell>
                    <TableCell>{row.planned_departure || '-'}</TableCell>
                    <TableCell>{row.planned_arrival || '-'}</TableCell>
                    <TableCell align='center'>{renderActions(row)}</TableCell>
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
          labelRowsPerPage={i18n.t('tms.shipment_management_page.k37')}
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to}${i18n.t('pages.shipment_management_page.k0')}${count}${i18n.t('pages.shipment_management_page.k1')}`
          }
        />
      </Card>
    </PageContainer>
  );
};
export default ShipmentManagementPage;
