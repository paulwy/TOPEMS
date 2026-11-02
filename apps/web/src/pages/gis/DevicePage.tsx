import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { gisDeviceApi } from '@/api/gis/devices';
import type { GisDevice } from '@/api/gis/devices';
import { useNotificationStore } from '@/store';

import { PageContainer } from '@/components/common';
import { EmptyState } from '@/components';

interface ListLike {
  items?: unknown[];
  total?: number;
  page?: number;
  page_size?: number;
}

const DevicePage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const pageSize = 10;
  const queryKey = 'gis-devices';

  const { data } = useQuery({
    queryKey: [queryKey, page, search],
    queryFn: () =>
      gisDeviceApi.list({ page: page + 1, page_size: pageSize, search: search || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['gis-devices'] });

  const saveMutation = useMutation<void, Error>({
    mutationFn: async () => {
      if (editingId) {
        await gisDeviceApi.update(editingId, form);
      } else {
        await gisDeviceApi.create(form as never);
      }
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('gis.devices.saveSuccess') });
      setOpen(false);
      invalidate();
    },
    onError: () => {
      addNotification({ type: 'error', message: t('gis.devices.saveFailed') });
    },
  });

  const removeMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await gisDeviceApi.remove(id);
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('gis.devices.deleteSuccess') });
      invalidate();
    },
    onError: () => addNotification({ type: 'error', message: t('gis.devices.deleteFailed') }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({});
    setOpen(true);
  };

  const openEdit = (row: GisDevice) => {
    setEditingId(row.id);
    setForm({
      device_code: row.device_code,
      device_name: row.device_name,
      device_type: row.device_type ?? '',
      status: row.status,
      description: row.description ?? '',
    });
    setOpen(true);
  };

  const columns = useMemo(
    () => [
      { key: 'device_code', label: t('gis.devices.code') },
      { key: 'device_name', label: t('gis.devices.name') },
      { key: 'device_type', label: t('gis.devices.type') },
      { key: 'status', label: t('gis.devices.status') },
    ],
    [t]
  );

  const listData = data?.data as ListLike | undefined;
  const rows = (listData?.items ?? []) as GisDevice[];
  const total = listData?.total ?? 0;

  const formFields = useMemo(
    () => [
      { key: 'device_code', label: t('gis.devices.code') },
      { key: 'device_name', label: t('gis.devices.name') },
      { key: 'device_type', label: t('gis.devices.type') },
      { key: 'description', label: t('gis.devices.description') },
      { key: 'status', label: t('gis.devices.status') },
    ],
    [t]
  );

  return (
    <PageContainer autoTitle>
      <Box sx={{ p: 3 }}>
        <Typography
          variant='h5'
          sx={{ fontWeight: 600 }}
        >
          {t('gis.devices.title')}
        </Typography>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary', mt: 0.5 }}
        >
          {t('gis.devices.titleDesc')}
        </Typography>
        <Stack
          direction='row'
          spacing={2}
          sx={{ mt: 2, mb: 2 }}
        >
          <TextField
            size='small'
            placeholder={t('gis.devices.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            variant='contained'
            startIcon={<Plus size={18} />}
            data-testid='device-create-btn'
            onClick={openCreate}
          >
            {t('gis.devices.create')}
          </Button>
        </Stack>
        <Card variant='outlined'>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  {columns.map((c) => (
                    <TableCell key={c.key}>{c.label}</TableCell>
                  ))}
                  <TableCell>{t('gis.devices.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + 1}
                      align='center'
                      sx={{ py: 4 }}
                    >
                      <EmptyState
                        emoji='📡'
                        title={t('gis.devices.empty')}
                        compact
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                    >
                      {columns.map((c) => (
                        <TableCell key={c.key}>
                          {c.key === 'status' ? (
                            <Chip
                              size='small'
                              label={row.status}
                              color={row.status === 'active' ? 'success' : 'default'}
                            />
                          ) : (
                            ((row as unknown as Record<string, string | number | null>)[c.key] ??
                            '-')
                          )}
                        </TableCell>
                      ))}
                      <TableCell>
                        <IconButton
                          size='small'
                          data-testid='device-edit-btn'
                          onClick={() => openEdit(row)}
                        >
                          <Pencil size={16} />
                        </IconButton>
                        <IconButton
                          size='small'
                          color='error'
                          data-testid='device-delete-btn'
                          onClick={() => removeMutation.mutate(row.id)}
                        >
                          <Trash2 size={16} />
                        </IconButton>
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
            onPageChange={(_e, p) => setPage(p)}
            rowsPerPage={pageSize}
            rowsPerPageOptions={[pageSize]}
            labelRowsPerPage=''
          />
        </Card>
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          maxWidth='sm'
          fullWidth
        >
          <DialogTitle>{editingId ? t('gis.devices.edit') : t('gis.devices.create')}</DialogTitle>
          <DialogContent>
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              {formFields.map((f) => (
                <TextField
                  key={f.key}
                  size='small'
                  label={f.label}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>{t('gis.devices.cancel')}</Button>
            <Button
              variant='contained'
              onClick={() => saveMutation.mutate()}
            >
              {t('gis.devices.save')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default DevicePage;
