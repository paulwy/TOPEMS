import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FileText, Plus, Pencil, Trash2 } from 'lucide-react';
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
import { drawingApi } from '@/api/pdm/pdmDrawing';
import type { PdmDrawing } from '@/api/pdm/pdmDrawing';
import { useNotificationStore } from '@/store';

interface ListLike {
  items?: unknown[];
  total?: number;
  page?: number;
  page_size?: number;
}

const emptyForm = {
  drawing_no: '',
  name: '',
  name_en: '',
  drawing_type: '',
  description: '',
  file_path: '',
};

const PdmDrawingPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['pdm-drawings', page, pageSize],
    queryFn: async () => (await drawingApi.list({ page: page + 1, page_size: pageSize })).data.data,
  });

  const listData = (data as unknown as ListLike) ?? { items: [], total: 0 };
  const rows = (listData.items ?? []) as PdmDrawing[];
  const total = listData.total ?? 0;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['pdm-drawings'] });
  };

  const createMutation = useMutation<void, Error>({
    mutationFn: async () => {
      await drawingApi.create({
        drawing_no: form.drawing_no,
        name: form.name,
        name_en: form.name_en || null,
        drawing_type: form.drawing_type || null,
        description: form.description || null,
        file_path: form.file_path || null,
      });
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('pdm.drawing.saveSuccess') });
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      invalidate();
    },
    onError: () => {
      addNotification({ type: 'error', message: t('pdm.drawing.saveFailed') });
    },
  });

  const updateMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await drawingApi.update(id, {
        name: form.name,
        name_en: form.name_en || null,
        drawing_type: form.drawing_type || null,
        description: form.description || null,
        file_path: form.file_path || null,
      });
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('pdm.drawing.saveSuccess') });
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      invalidate();
    },
    onError: () => {
      addNotification({ type: 'error', message: t('pdm.drawing.saveFailed') });
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await drawingApi.remove(id);
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('pdm.drawing.deleteSuccess') });
      invalidate();
    },
    onError: () => {
      addNotification({ type: 'error', message: t('pdm.drawing.deleteFailed') });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row: PdmDrawing) => {
    setEditingId(row.id);
    setForm({
      drawing_no: row.drawing_no ?? '',
      name: row.name ?? '',
      name_en: row.name_en ?? '',
      drawing_type: row.drawing_type ?? '',
      description: row.description ?? '',
      file_path: row.file_path ?? '',
    });
    setOpen(true);
  };

  const columns = useMemo(
    () => [
      { key: 'drawing_no', label: t('pdm.drawing.no') },
      { key: 'name', label: t('pdm.drawing.name') },
      { key: 'drawing_type', label: t('pdm.drawing.type') },
      { key: 'version', label: t('pdm.drawing.version') },
      { key: 'status', label: t('pdm.drawing.status') },
    ],
    [t]
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 600 }}
          >
            {t('pdm.drawing.title')}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mt: 0.5 }}
          >
            {t('pdm.drawing.subtitle')}
          </Typography>
        </Box>
        <Button
          variant='contained'
          startIcon={<Plus size={18} />}
          onClick={openCreate}
        >
          {t('pdm.drawing.create')}
        </Button>
      </Box>

      <Card sx={{ p: 2 }}>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                {columns.map((c) => (
                  <TableCell key={c.key}>{c.label}</TableCell>
                ))}
                <TableCell>{t('pdm.drawing.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1}>{t('pdm.drawing.loading')}</TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1}>{t('pdm.drawing.empty')}</TableCell>
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
                          ((row as unknown as Record<string, string | null | number | undefined>)[
                            c.key
                          ] ?? '-')
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
                        onClick={() => {
                          void deleteMutation.mutate(row.id);
                        }}
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
          rowsPerPage={pageSize}
          onPageChange={(_e, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{editingId ? t('pdm.drawing.edit') : t('pdm.drawing.create')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            {!editingId && (
              <TextField
                label={t('pdm.drawing.no')}
                value={form.drawing_no}
                onChange={(e) => setForm({ ...form, drawing_no: e.target.value })}
                size='small'
              />
            )}
            <TextField
              label={t('pdm.drawing.name')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              size='small'
            />
            <TextField
              label={t('pdm.drawing.nameEn')}
              value={form.name_en}
              onChange={(e) => setForm({ ...form, name_en: e.target.value })}
              size='small'
            />
            <TextField
              label={t('pdm.drawing.type')}
              value={form.drawing_type}
              onChange={(e) => setForm({ ...form, drawing_type: e.target.value })}
              size='small'
            />
            <TextField
              label={t('pdm.drawing.filePath')}
              value={form.file_path}
              onChange={(e) => setForm({ ...form, file_path: e.target.value })}
              size='small'
            />
            <TextField
              label={t('pdm.drawing.description')}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              size='small'
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('pdm.drawing.cancel')}</Button>
          <Button
            variant='contained'
            startIcon={<FileText size={16} />}
            onClick={() => {
              if (editingId) void updateMutation.mutate(editingId);
              else void createMutation.mutate();
            }}
          >
            {t('pdm.drawing.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PdmDrawingPage;
