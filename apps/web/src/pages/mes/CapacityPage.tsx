import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Plus, Pencil, Trash2 } from 'lucide-react';
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
import { capacityApi } from '@/api/mes/capacity';
import type { Capacity } from '@/api/mes/capacity';
import { useNotificationStore } from '@/store';

interface ListLike {
  items?: unknown[];
  total?: number;
  page?: number;
  page_size?: number;
}

const CapacityPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const pageSize = 10;
  const queryKey = 'mes-capacities';

  const { data } = useQuery({
    queryKey: [queryKey, page, search],
    queryFn: () =>
      capacityApi.list({ page: page + 1, page_size: pageSize, search: search || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['mes-capacities'] });

  const saveMutation = useMutation<void, Error>({
    mutationFn: async () => {
      if (editingId) {
        await capacityApi.update(editingId, form);
      } else {
        await capacityApi.create(form as never);
      }
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('mes.capacity.saveSuccess') });
      setOpen(false);
      invalidate();
    },
    onError: () => {
      addNotification({ type: 'error', message: t('mes.capacity.saveFailed') });
    },
  });

  const removeMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await capacityApi.remove(id);
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('mes.capacity.deleteSuccess') });
      invalidate();
    },
    onError: () => addNotification({ type: 'error', message: t('mes.capacity.deleteFailed') }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({});
    setOpen(true);
  };

  const openEdit = (row: Capacity) => {
    setEditingId(row.id);
    setForm({
      work_center_name: row.work_center_name ?? '',
      capacity_date: row.capacity_date,
      available_hours: row.available_hours != null ? String(row.available_hours) : '',
      status: row.status,
    });
    setOpen(true);
  };

  const columns = useMemo(
    () => [
      { key: 'capacity_date', label: t('mes.capacity.date') },
      { key: 'work_center_name', label: t('mes.capacity.workCenter') },
      { key: 'available_hours', label: t('mes.capacity.availableHours') },
      { key: 'used_hours', label: t('mes.capacity.usedHours') },
      { key: 'utilization_rate', label: t('mes.capacity.utilizationRate') },
      { key: 'status', label: t('mes.capacity.status') },
    ],
    [t]
  );

  const listData = data?.data as ListLike | undefined;
  const rows = (listData?.items ?? []) as Capacity[];
  const total = listData?.total ?? 0;

  const formFields = useMemo(
    () => [
      { key: 'work_center_name', label: t('mes.capacity.workCenter') },
      { key: 'capacity_date', label: t('mes.capacity.date') },
      { key: 'available_hours', label: t('mes.capacity.availableHours') },
      { key: 'status', label: t('mes.capacity.status') },
    ],
    [t]
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant='h5'
        sx={{ fontWeight: 600 }}
      >
        {t('mes.capacity.title')}
      </Typography>
      <Typography
        variant='body2'
        sx={{ color: 'text.secondary', mt: 0.5 }}
      >
        {t('mes.capacity.titleDesc')}
      </Typography>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mt: 2, mb: 2 }}
      >
        <TextField
          size='small'
          placeholder={t('mes.capacity.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          variant='contained'
          startIcon={<Plus size={18} />}
          onClick={openCreate}
        >
          {t('mes.capacity.create')}
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
                <TableCell>{t('mes.capacity.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
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
                        ((row as unknown as Record<string, string | number | null>)[c.key] ?? '-')
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <IconButton
                      size='small'
                      onClick={() => openEdit(row)}
                    >
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      size='small'
                      color='error'
                      onClick={() => removeMutation.mutate(row.id)}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
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
        <DialogTitle>{editingId ? t('mes.capacity.edit') : t('mes.capacity.create')}</DialogTitle>
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
          <Button onClick={() => setOpen(false)}>{t('mes.capacity.cancel')}</Button>
          <Button
            variant='contained'
            onClick={() => saveMutation.mutate()}
          >
            {t('mes.capacity.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CapacityPage;
