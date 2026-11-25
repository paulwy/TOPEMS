import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Boxes, Plus, Pencil, Trash2, Ruler, TestTube } from 'lucide-react';
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
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { materialApi, uomApi, sampleApi } from '@/api/master/masterData';
import { useNotificationStore } from '@/store';

interface ListLike {
  items?: unknown[];
  total?: number;
  page?: number;
  page_size?: number;
}

interface CrudEntity {
  id: string;
  status?: string;
  [key: string]: unknown;
}

const emptyForm = {
  code: '',
  name: '',
  type: '',
  specification: '',
  unit: '',
  source: '',
  description: '',
};

const PublicMasterDataPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const tabKey = ['materials', 'uoms', 'samples'][tab];
  const queryKey = ['master-data', tabKey, page, pageSize];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = { page: page + 1, page_size: pageSize };
      if (tab === 0) return (await materialApi.list(params)).data;
      if (tab === 1) return (await uomApi.list(params)).data;
      return (await sampleApi.list(params)).data;
    },
  });

  const listData = (data as unknown as ListLike) ?? { items: [], total: 0 };
  const rows = (listData.items ?? []) as CrudEntity[];
  const total = listData.total ?? 0;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['master-data'] });
  };

  const createMutation = useMutation<void, Error>({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {};
      if (tab === 0) {
        payload.material_code = form.code;
        payload.material_name = form.name;
        payload.material_type = form.type || null;
        payload.specification = form.specification || null;
        payload.unit = form.unit || null;
        payload.description = form.description || null;
      } else if (tab === 1) {
        payload.uom_code = form.code;
        payload.uom_name = form.name;
        payload.uom_type = form.type || null;
        payload.description = form.description || null;
      } else {
        payload.sample_code = form.code;
        payload.sample_name = form.name;
        payload.sample_type = form.type || null;
        payload.source = form.source || null;
        payload.description = form.description || null;
      }
      payload.status = 'active';
      if (tab === 0) await materialApi.create(payload);
      else if (tab === 1) await uomApi.create(payload);
      else await sampleApi.create(payload);
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.public_master_data.saveSuccess') });
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      invalidate();
    },
    onError: () => {
      addNotification({ type: 'error', message: t('master.public_master_data.saveFailed') });
    },
  });

  const updateMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const payload: Record<string, unknown> = {};
      if (tab === 0) {
        payload.material_name = form.name;
        payload.material_type = form.type || null;
        payload.specification = form.specification || null;
        payload.unit = form.unit || null;
        payload.description = form.description || null;
      } else if (tab === 1) {
        payload.uom_name = form.name;
        payload.uom_type = form.type || null;
        payload.description = form.description || null;
      } else {
        payload.sample_name = form.name;
        payload.sample_type = form.type || null;
        payload.source = form.source || null;
        payload.description = form.description || null;
      }
      if (tab === 0) await materialApi.update(id, payload);
      else if (tab === 1) await uomApi.update(id, payload);
      else await sampleApi.update(id, payload);
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.public_master_data.saveSuccess') });
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      invalidate();
    },
    onError: () => {
      addNotification({ type: 'error', message: t('master.public_master_data.saveFailed') });
    },
  });

  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      if (tab === 0) await materialApi.remove(id);
      else if (tab === 1) await uomApi.remove(id);
      else await sampleApi.remove(id);
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.public_master_data.deleteSuccess') });
      invalidate();
    },
    onError: () => {
      addNotification({ type: 'error', message: t('master.public_master_data.deleteFailed') });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row: CrudEntity) => {
    setEditingId(row.id);
    setForm({
      code:
        (row as unknown as Record<string, string>)[
          tabKey === 'materials' ? 'material_code' : tabKey === 'uoms' ? 'uom_code' : 'sample_code'
        ] ?? '',
      name:
        (row as unknown as Record<string, string>)[
          tabKey === 'materials' ? 'material_name' : tabKey === 'uoms' ? 'uom_name' : 'sample_name'
        ] ?? '',
      type:
        (row as unknown as Record<string, string>)[
          tabKey === 'materials' ? 'material_type' : tabKey === 'uoms' ? 'uom_type' : 'sample_type'
        ] ?? '',
      specification: (row as unknown as Record<string, string>).specification ?? '',
      unit: (row as unknown as Record<string, string>).unit ?? '',
      source: (row as unknown as Record<string, string>).source ?? '',
      description: (row as unknown as Record<string, string>).description ?? '',
    });
    setOpen(true);
  };

  const columns = useMemo(() => {
    if (tab === 0) {
      return [
        { key: 'material_code', label: t('master.public_master_data.code') },
        { key: 'material_name', label: t('master.public_master_data.name') },
        { key: 'material_type', label: t('master.public_master_data.type') },
        { key: 'unit', label: t('master.public_master_data.unit') },
        { key: 'status', label: t('master.public_master_data.status') },
      ];
    }
    if (tab === 1) {
      return [
        { key: 'uom_code', label: t('master.public_master_data.code') },
        { key: 'uom_name', label: t('master.public_master_data.name') },
        { key: 'uom_type', label: t('master.public_master_data.type') },
        { key: 'status', label: t('master.public_master_data.status') },
      ];
    }
    return [
      { key: 'sample_code', label: t('master.public_master_data.code') },
      { key: 'sample_name', label: t('master.public_master_data.name') },
      { key: 'sample_type', label: t('master.public_master_data.type') },
      { key: 'source', label: t('master.public_master_data.source') },
      { key: 'status', label: t('master.public_master_data.status') },
    ];
  }, [tab, t]);

  const title = ['materials', 'uoms', 'samples'][tab] ?? 'materials';

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 600 }}
          >
            {t('master.publicMasterData')}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mt: 0.5 }}
          >
            {t('master.public_master_data.subtitle')}
          </Typography>
        </Box>
        <Button
          variant='contained'
          startIcon={<Plus size={18} />}
          onClick={openCreate}
        >
          {t('master.public_master_data.create')}
        </Button>
      </Box>

      <Card sx={{ p: 2 }}>
        <Tabs
          value={tab}
          onChange={(_e, v: number) => {
            setTab(v);
            setPage(0);
          }}
          sx={{ mb: 2 }}
        >
          <Tab
            icon={<Boxes size={16} />}
            iconPosition='start'
            label={t('master.public_master_data.materials')}
          />
          <Tab
            icon={<Ruler size={16} />}
            iconPosition='start'
            label={t('master.public_master_data.uoms')}
          />
          <Tab
            icon={<TestTube size={16} />}
            iconPosition='start'
            label={t('master.public_master_data.samples')}
          />
        </Tabs>

        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                {columns.map((c) => (
                  <TableCell key={c.key}>{c.label}</TableCell>
                ))}
                <TableCell>{t('master.public_master_data.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1}>
                    {t('master.public_master_data.loading')}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1}>
                    {t('master.public_master_data.empty')}
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
          {editingId ? t('master.public_master_data.edit') : t('master.public_master_data.create')}{' '}
          · {t(`master.public_master_data.${title}`)}
        </DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            {!editingId && (
              <TextField
                label={t('master.public_master_data.code')}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                size='small'
              />
            )}
            <TextField
              label={t('master.public_master_data.name')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              size='small'
            />
            <TextField
              label={t('master.public_master_data.type')}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              size='small'
            />
            {tab === 0 && (
              <TextField
                label={t('master.public_master_data.specification')}
                value={form.specification}
                onChange={(e) => setForm({ ...form, specification: e.target.value })}
                size='small'
              />
            )}
            {tab === 0 && (
              <TextField
                label={t('master.public_master_data.unit')}
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                size='small'
              />
            )}
            {tab === 2 && (
              <TextField
                label={t('master.public_master_data.source')}
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                size='small'
              />
            )}
            <TextField
              label={t('master.public_master_data.description')}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              size='small'
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('master.public_master_data.cancel')}</Button>
          <Button
            variant='contained'
            onClick={() => {
              if (editingId) void updateMutation.mutate(editingId);
              else void createMutation.mutate();
            }}
          >
            {t('master.public_master_data.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PublicMasterDataPage;
