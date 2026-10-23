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
import { analyteApi } from '@/api/lims/analytes';
import type { Analyte } from '@/api/lims/analytes';
import { useNotificationStore } from '@/store';

import { PageContainer } from '@/components/common';

interface ListLike {
  items?: unknown[];
  total?: number;
  page?: number;
  page_size?: number;
}

const AnalytePage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const pageSize = 10;
  const queryKey = 'lims-analytes';

  const { data } = useQuery({
    queryKey: [queryKey, page, search],
    queryFn: () =>
      analyteApi.list({ page: page + 1, page_size: pageSize, search: search || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['lims-analytes'] });

  const saveMutation = useMutation<void, Error>({
    mutationFn: async () => {
      if (editingId) {
        await analyteApi.update(editingId, form);
      } else {
        await analyteApi.create(form as never);
      }
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('lims.analytes.saveSuccess') });
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => {
      addNotification({ type: 'error', message: t('lims.analytes.saveFailed') });
      console.error(e);
    },
  });

  const removeMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await analyteApi.remove(id);
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('lims.analytes.deleteSuccess') });
      invalidate();
    },
    onError: () => addNotification({ type: 'error', message: t('lims.analytes.deleteFailed') }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({});
    setOpen(true);
  };

  const openEdit = (row: Analyte) => {
    setEditingId(row.id);
    setForm({
      analyte_code: row.analyte_code,
      analyte_name: row.analyte_name,
      status: row.status,
      category: row.category ?? '',
      unit: row.unit ?? '',
      method_reference: row.method_reference ?? '',
      limit_value: row.limit_value ?? '',
      accuracy: row.accuracy ?? '',
      description: row.description ?? '',
    });
    setOpen(true);
  };

  const columns = useMemo(
    () => [
      { key: 'analyte_code', label: t('lims.analytes.code') },
      { key: 'analyte_name', label: t('lims.analytes.name') },
      { key: 'category', label: t('lims.analytes.category') },
      { key: 'unit', label: t('lims.analytes.unit') },
      { key: 'status', label: t('lims.analytes.status') },
    ],
    [t]
  );

  const listData = data?.data as ListLike | undefined;
  const rows = (listData?.items ?? []) as Analyte[];
  const total = listData?.total ?? 0;

  const formFields = useMemo(
    () => [
      { key: 'analyte_code', label: t('lims.analytes.code') },
      { key: 'analyte_name', label: t('lims.analytes.name') },
      { key: 'category', label: t('lims.analytes.category') },
      { key: 'unit', label: t('lims.analytes.unit') },
      { key: 'method_reference', label: t('lims.analytes.methodReference') },
      { key: 'limit_value', label: t('lims.analytes.limitValue') },
      { key: 'accuracy', label: t('lims.analytes.accuracy') },
      { key: 'status', label: t('lims.analytes.status') },
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
          {t('lims.analytes.title')}
        </Typography>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary', mt: 0.5 }}
        >
          {t('lims.analytes.titleDesc')}
        </Typography>
        <Stack
          direction='row'
          spacing={2}
          sx={{ mt: 2, mb: 2 }}
        >
          <TextField
            size='small'
            placeholder={t('lims.analytes.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            variant='contained'
            startIcon={<Plus size={18} />}
            onClick={openCreate}
          >
            {t('lims.analytes.create')}
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
                  <TableCell>{t('lims.analytes.actions')}</TableCell>
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
          <DialogTitle>
            {editingId ? t('lims.analytes.edit') : t('lims.analytes.create')}
          </DialogTitle>
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
            <Button onClick={() => setOpen(false)}>{t('lims.analytes.cancel')}</Button>
            <Button
              variant='contained'
              onClick={() => saveMutation.mutate()}
            >
              {t('lims.analytes.save')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default AnalytePage;
