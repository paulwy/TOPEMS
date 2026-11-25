import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ClipboardList, Plus, Pencil, Trash2 } from 'lucide-react';
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
import { projectTypeConfigApi } from '@/api/pm/projectTypeConfig';
import type { ProjectTypeConfig } from '@/api/pm/projectTypeConfig';
import { useNotificationStore } from '@/store';

import { PageContainer } from '@/components/common';

interface ListLike {
  items?: unknown[];
  total?: number;
  page?: number;
  page_size?: number;
}

const emptyForm = {
  type_code: '',
  type_name: '',
  name_en: '',
  description: '',
  default_phases: '',
  default_milestones: '',
};

const PmProjectTypeConfigPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: ['pm-project-types', page, pageSize],
    queryFn: async () =>
      (await projectTypeConfigApi.list({ page: page + 1, page_size: pageSize })).data,
  });

  const listData = (data as unknown as ListLike) ?? { items: [], total: 0 };
  const rows = (listData.items ?? []) as ProjectTypeConfig[];
  const total = listData.total ?? 0;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['pm-project-types'] });
  };

  const createMutation = useMutation<void, Error>({
    mutationFn: async () => {
      await projectTypeConfigApi.create({
        type_code: form.type_code,
        type_name: form.type_name,
        name_en: form.name_en || null,
        description: form.description || null,
        default_phases: form.default_phases || null,
        default_milestones: form.default_milestones || null,
      });
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('pm.project_type_config.saveSuccess') });
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      invalidate();
    },
    onError: () => {
      addNotification({ type: 'error', message: t('pm.project_type_config.saveFailed') });
    },
  });

  const updateMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await projectTypeConfigApi.update(id, {
        type_name: form.type_name,
        name_en: form.name_en || null,
        description: form.description || null,
        default_phases: form.default_phases || null,
        default_milestones: form.default_milestones || null,
      });
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('pm.project_type_config.saveSuccess') });
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      invalidate();
    },
    onError: () => {
      addNotification({ type: 'error', message: t('pm.project_type_config.saveFailed') });
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      await projectTypeConfigApi.remove(id);
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('pm.project_type_config.deleteSuccess') });
      invalidate();
    },
    onError: () => {
      addNotification({ type: 'error', message: t('pm.project_type_config.deleteFailed') });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row: ProjectTypeConfig) => {
    setEditingId(row.id);
    setForm({
      type_code: row.type_code ?? '',
      type_name: row.type_name ?? '',
      name_en: row.name_en ?? '',
      description: row.description ?? '',
      default_phases: row.default_phases ?? '',
      default_milestones: row.default_milestones ?? '',
    });
    setOpen(true);
  };

  const columns = useMemo(
    () => [
      { key: 'type_code', label: t('pm.project_type_config.code') },
      { key: 'type_name', label: t('pm.project_type_config.name') },
      { key: 'name_en', label: t('pm.project_type_config.nameEn') },
      { key: 'description', label: t('pm.project_type_config.description') },
      { key: 'is_active', label: t('pm.project_type_config.status') },
    ],
    [t]
  );

  return (
    <PageContainer autoTitle>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 600 }}
            >
              {t('pm.project_type_config.title')}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mt: 0.5 }}
            >
              {t('pm.project_type_config.subtitle')}
            </Typography>
          </Box>
          <Button
            variant='contained'
            startIcon={<Plus size={18} />}
            onClick={openCreate}
          >
            {t('pm.project_type_config.create')}
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
                  <TableCell>{t('pm.project_type_config.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1}>
                      {t('pm.project_type_config.loading')}
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1}>
                      {t('pm.project_type_config.empty')}
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
                          {c.key === 'is_active' ? (
                            <Chip
                              size='small'
                              label={String(row.is_active)}
                              color={row.is_active ? 'success' : 'default'}
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
                          aria-label={t('pm.project_type_config.edit')}
                          onClick={() => openEdit(row)}
                        >
                          <Pencil size={16} />
                        </IconButton>
                        <IconButton
                          size='small'
                          color='error'
                          aria-label={t('common.delete')}
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
          <DialogTitle>
            {editingId ? t('pm.project_type_config.edit') : t('pm.project_type_config.create')}
          </DialogTitle>
          <DialogContent>
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              {!editingId && (
                <TextField
                  label={t('pm.project_type_config.code')}
                  value={form.type_code}
                  onChange={(e) => setForm({ ...form, type_code: e.target.value })}
                  size='small'
                />
              )}
              <TextField
                label={t('pm.project_type_config.name')}
                value={form.type_name}
                onChange={(e) => setForm({ ...form, type_name: e.target.value })}
                size='small'
              />
              <TextField
                label={t('pm.project_type_config.nameEn')}
                value={form.name_en}
                onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                size='small'
              />
              <TextField
                label={t('pm.project_type_config.description')}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                size='small'
                multiline
                rows={2}
              />
              <TextField
                label={t('pm.project_type_config.defaultPhases')}
                value={form.default_phases}
                onChange={(e) => setForm({ ...form, default_phases: e.target.value })}
                size='small'
                multiline
                rows={2}
                placeholder={t('pm.project_type_config.defaultPhasesPlaceholder')}
              />
              <TextField
                label={t('pm.project_type_config.defaultMilestones')}
                value={form.default_milestones}
                onChange={(e) => setForm({ ...form, default_milestones: e.target.value })}
                size='small'
                multiline
                rows={2}
                placeholder={t('pm.project_type_config.defaultMilestonesPlaceholder')}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>{t('pm.project_type_config.cancel')}</Button>
            <Button
              variant='contained'
              startIcon={<ClipboardList size={16} />}
              onClick={() => {
                if (editingId) void updateMutation.mutate(editingId);
                else void createMutation.mutate();
              }}
            >
              {t('pm.project_type_config.save')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default PmProjectTypeConfigPage;
