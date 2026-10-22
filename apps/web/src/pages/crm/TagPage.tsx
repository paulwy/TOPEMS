import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Tags, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  Box,
  Button,
  Card,
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
import { tagApi } from '@/api/crm/tags';
import type { CrmTag } from '@/api/crm/tags';
import { useNotificationStore } from '@/store';

import { PageContainer } from '@/components/common';

interface ListLike {
  items?: unknown[];
  total?: number;
  page?: number;
  page_size?: number;
}

const TagPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const pageSize = 10;
  const queryKey = 'crm-tags';

  const { data } = useQuery({
    queryKey: [queryKey, page, search],
    queryFn: () =>
      tagApi.list({ page: page + 1, page_size: pageSize, search: search || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['crm-tags'] });

  const saveMutation = useMutation<void, Error>({
    mutationFn: async () => {
      if (editingId) {
        await tagApi.update(editingId, form);
      } else {
        await tagApi.create(form as never);
      }
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('crm.tags.saveSuccess') });
      setOpen(false);
      invalidate();
    },
    onError: () => {
      addNotification({ type: 'error', message: t('crm.tags.saveFailed') });
    },
  });

  const removeMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await tagApi.remove(id);
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('crm.tags.deleteSuccess') });
      invalidate();
    },
    onError: () => addNotification({ type: 'error', message: t('crm.tags.deleteFailed') }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({});
    setOpen(true);
  };

  const openEdit = (row: CrmTag) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      color: row.color ?? '',
      description: row.description ?? '',
    });
    setOpen(true);
  };

  const columns = useMemo(
    () => [
      { key: 'name', label: t('crm.tags.name') },
      { key: 'color', label: t('crm.tags.color') },
      { key: 'description', label: t('crm.tags.description') },
    ],
    [t]
  );

  const listData = data?.data as ListLike | undefined;
  const rows = (listData?.items ?? []) as CrmTag[];
  const total = listData?.total ?? 0;

  const formFields = useMemo(
    () => [
      { key: 'name', label: t('crm.tags.name') },
      { key: 'color', label: t('crm.tags.color') },
      { key: 'description', label: t('crm.tags.description') },
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
          {t('crm.tags.title')}
        </Typography>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary', mt: 0.5 }}
        >
          {t('crm.tags.titleDesc')}
        </Typography>
        <Stack
          direction='row'
          spacing={2}
          sx={{ mt: 2, mb: 2 }}
        >
          <TextField
            size='small'
            placeholder={t('crm.tags.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            variant='contained'
            startIcon={<Plus size={18} />}
            onClick={openCreate}
          >
            {t('crm.tags.create')}
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
                  <TableCell>{t('crm.tags.actions')}</TableCell>
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
                        {(row as unknown as Record<string, string | number | null>)[c.key] ?? '-'}
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
          <DialogTitle>{editingId ? t('crm.tags.edit') : t('crm.tags.create')}</DialogTitle>
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
            <Button onClick={() => setOpen(false)}>{t('crm.tags.cancel')}</Button>
            <Button
              variant='contained'
              onClick={() => saveMutation.mutate()}
            >
              {t('crm.tags.save')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default TagPage;
