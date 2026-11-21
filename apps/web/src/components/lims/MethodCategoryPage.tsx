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
import { methodCategoryApi } from '@/api/lims/testMethod';
import type { MethodCategory } from '@/api/lims/types';
import { useNotificationStore } from '@/store';

import { PageContainer } from '@/components/common';
import { EmptyState } from '@/components';

interface ListLike {
  items?: unknown[];
  total?: number;
  page?: number;
  page_size?: number;
}

const MethodCategoryPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const pageSize = 10;
  const queryKey = 'lims-method-categories';

  const { data } = useQuery({
    queryKey: [queryKey, page, search],
    queryFn: () =>
      methodCategoryApi.listMethodCategories({
        page: page + 1,
        page_size: pageSize,
        search: search || undefined,
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['lims-method-categories'] });

  const saveMutation = useMutation<void, Error>({
    mutationFn: async () => {
      if (editingId) {
        await methodCategoryApi.updateCategory(editingId, form);
      } else {
        await methodCategoryApi.createCategory(form as never);
      }
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('lims.methodCategories.saveSuccess') });
      setOpen(false);
      invalidate();
    },
    onError: () => {
      addNotification({ type: 'error', message: t('lims.methodCategories.saveFailed') });
    },
  });

  const removeMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await methodCategoryApi.deleteCategory(id);
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('lims.methodCategories.deleteSuccess') });
      invalidate();
    },
    onError: () =>
      addNotification({ type: 'error', message: t('lims.methodCategories.deleteFailed') }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({});
    setOpen(true);
  };

  const openEdit = (row: MethodCategory) => {
    setEditingId(row.id);
    setForm({
      category_code: row.category_code,
      category_name: row.category_name,
      sort_order: String(row.sort_order ?? 0),
      status: row.status,
      description: row.description ?? '',
    });
    setOpen(true);
  };

  const columns = useMemo(
    () => [
      { key: 'category_code', label: t('lims.methodCategories.code') },
      { key: 'category_name', label: t('lims.methodCategories.name') },
      { key: 'sort_order', label: t('lims.methodCategories.sortOrder') },
      { key: 'status', label: t('lims.methodCategories.status') },
    ],
    [t]
  );

  const listData = data?.data as ListLike | undefined;
  const rows = (listData?.items ?? []) as MethodCategory[];
  const total = listData?.total ?? 0;

  const formFields = useMemo(
    () => [
      { key: 'category_code', label: t('lims.methodCategories.code') },
      { key: 'category_name', label: t('lims.methodCategories.name') },
      { key: 'sort_order', label: t('lims.methodCategories.sortOrder') },
      { key: 'description', label: t('lims.methodCategories.description') },
      { key: 'status', label: t('lims.methodCategories.status') },
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
          {t('lims.methodCategories.title')}
        </Typography>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary', mt: 0.5 }}
        >
          {t('lims.methodCategories.titleDesc')}
        </Typography>
        <Stack
          direction='row'
          spacing={2}
          sx={{ mt: 2, mb: 2 }}
        >
          <TextField
            size='small'
            placeholder={t('lims.methodCategories.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            variant='contained'
            startIcon={<Plus size={18} />}
            onClick={openCreate}
          >
            {t('lims.methodCategories.create')}
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
                  <TableCell>{t('lims.methodCategories.actions')}</TableCell>
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
                        emoji='📋'
                        title={t('lims.methodCategories.empty')}
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
          <DialogTitle>
            {editingId ? t('lims.methodCategories.edit') : t('lims.methodCategories.create')}
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
            <Button onClick={() => setOpen(false)}>{t('lims.methodCategories.cancel')}</Button>
            <Button
              variant='contained'
              onClick={() => saveMutation.mutate()}
            >
              {t('lims.methodCategories.save')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default MethodCategoryPage;
