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
  Tooltip,
  Stack,
  TextField,
  Chip,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Search, RefreshCw, Send, MapPin, XCircle } from 'lucide-react';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store/notificationStore';
import { shipmentApi } from '@/api/tms';
import type { Shipment } from '@/api/tms';

const QUERY_KEY = 'tms-shipments';

type ShipmentStatus = 'pending' | 'in_transit' | 'delivered' | 'cancelled';

const statusMeta: Record<ShipmentStatus, { label: string; color: 'warning' | 'info' | 'success' | 'default' }> = {
  pending: { label: '待发车', color: 'warning' },
  in_transit: { label: '运输中', color: 'info' },
  delivered: { label: '已送达', color: 'success' },
  cancelled: { label: '已取消', color: 'default' },
};

const renderStatusChip = (status?: string) => {
  const key = (status as ShipmentStatus) || 'pending';
  const meta = statusMeta[key] || { label: status || '-', color: 'default' as const };
  return <Chip size='small' color={meta.color} label={meta.label} />;
};

const ShipmentManagementPage: React.FC = () => {
  const { t: _t } = useTranslation();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const queryKey = useMemo(() => [QUERY_KEY, page, pageSize, search], [page, pageSize, search]);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await shipmentApi.list({ page, pageSize, search: search || undefined });
      if (!res.success) throw new Error('加载运单列表失败');
      return { items: res.data?.items || [], total: res.data?.total || 0 };
    },
  });

  const invalidateList = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
  };

  const dispatchMutation = useMutation({
    mutationFn: (id: string) => shipmentApi.dispatch(id),
    onSuccess: () => {
      invalidateList();
      addNotification({ type: 'success', title: '发车成功', message: '运单已发车' });
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        title: '发车失败',
        message: err instanceof Error ? err.message : '',
      });
    },
  });

  const arriveMutation = useMutation({
    mutationFn: (id: string) => shipmentApi.arrive(id),
    onSuccess: () => {
      invalidateList();
      addNotification({ type: 'success', title: '到达成功', message: '运单已到达' });
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        title: '到达操作失败',
        message: err instanceof Error ? err.message : '',
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => shipmentApi.cancel(id),
    onSuccess: () => {
      invalidateList();
      addNotification({ type: 'success', title: '取消成功', message: '运单已取消' });
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        title: '取消失败',
        message: err instanceof Error ? err.message : '',
      });
    },
  });

  const handleSearchSubmit = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleRefresh = () => {
    invalidateList();
  };

  const rows = data?.items || [];
  const total = data?.total || 0;

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
          <Tooltip title='发车'>
            <IconButton
              size='small'
              color='primary'
              disabled={acting}
              onClick={() => dispatchMutation.mutate(row.id)}
            >
              <Send size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title='取消'>
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
          <Tooltip title='到达'>
            <IconButton
              size='small'
              color='success'
              disabled={acting}
              onClick={() => arriveMutation.mutate(row.id)}
            >
              <MapPin size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title='取消'>
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
    return <Typography variant='body2' color='text.secondary'>-</Typography>;
  };

  return (
    <PageContainer
      title='运单管理'
      subtitle='管理运输运单及状态流转'
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
            placeholder='按运单号搜索'
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
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <Chip size='small' color='warning' label='待发车' />
          <Chip size='small' color='info' label='运输中' />
          <Chip size='small' color='success' label='已送达' />
          <Chip size='small' color='default' label='已取消' />
        </Stack>
      </Stack>

      <Card variant='outlined'>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>运单号</TableCell>
                <TableCell>承运商</TableCell>
                <TableCell>车辆</TableCell>
                <TableCell>司机</TableCell>
                <TableCell>路线</TableCell>
                <TableCell>起点</TableCell>
                <TableCell>终点</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>计划出发</TableCell>
                <TableCell>计划到达</TableCell>
                <TableCell align='center'>操作</TableCell>
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
                    暂无运单数据
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
          onRowsPerPageChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage='每页'
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 共 ${count} 条`}
        />
      </Card>
    </PageContainer>
  );
};

export default ShipmentManagementPage;
