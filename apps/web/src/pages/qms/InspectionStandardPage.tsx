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
import {
  inspectionItemApi,
  inspectionPlanApi,
  samplingPlanApi,
} from '@/api/qms/inspectionStandard';
import type { InspectionItem, InspectionPlan, SamplingPlan } from '@/api/qms/inspectionStandard';
import { useNotificationStore } from '@/store';

import { PageContainer } from '@/components/common';

type TabKey = 'items' | 'plans' | 'samplingPlans';

interface ListLike {
  items?: unknown[];
  total?: number;
  page?: number;
  page_size?: number;
}

const InspectionStandardPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [tab, setTab] = useState<TabKey>('items');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const pageSize = 10;
  const queryKey = 'qms-inspection-standard';

  const queries = {
    items: useQuery({
      queryKey: [queryKey, 'items', page, search],
      queryFn: () =>
        inspectionItemApi.list({
          page: page + 1,
          page_size: pageSize,
          search: search || undefined,
        }),
    }),
    plans: useQuery({
      queryKey: [queryKey, 'plans', page, search],
      queryFn: () =>
        inspectionPlanApi.list({
          page: page + 1,
          page_size: pageSize,
          search: search || undefined,
        }),
    }),
    samplingPlans: useQuery({
      queryKey: [queryKey, 'samplingPlans', page, search],
      queryFn: () =>
        samplingPlanApi.list({ page: page + 1, page_size: pageSize, search: search || undefined }),
    }),
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['qms-inspection-standard'] });

  const saveMutation = useMutation<void, Error>({
    mutationFn: async () => {
      if (tab === 'items') {
        if (editingId) {
          await inspectionItemApi.update(editingId, form);
        } else {
          await inspectionItemApi.create(form as never);
        }
      } else if (tab === 'plans') {
        if (editingId) {
          await inspectionPlanApi.update(editingId, form);
        } else {
          await inspectionPlanApi.create(form as never);
        }
      } else if (editingId) {
        await samplingPlanApi.update(editingId, form);
      } else {
        await samplingPlanApi.create(form as never);
      }
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('qms.inspectionStandard.saveSuccess') });
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => {
      addNotification({ type: 'error', message: t('qms.inspectionStandard.saveFailed') });
      console.error(e);
    },
  });

  const removeMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      if (tab === 'items') await inspectionItemApi.remove(id);
      else if (tab === 'plans') await inspectionPlanApi.remove(id);
      else await samplingPlanApi.remove(id);
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('qms.inspectionStandard.deleteSuccess') });
      invalidate();
    },
    onError: () =>
      addNotification({ type: 'error', message: t('qms.inspectionStandard.deleteFailed') }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({});
    setOpen(true);
  };

  const openEdit = (row: InspectionItem | InspectionPlan | SamplingPlan) => {
    setEditingId(row.id);
    const r = row as unknown as Record<string, string>;
    setForm({
      code: r.code,
      name: r.name,
      status: r.status,
      category: r.category ?? '',
      specification: r.specification ?? '',
      method: r.method ?? '',
      unit: r.unit ?? '',
      standard_value: r.standard_value ?? '',
      tolerance: r.tolerance ?? '',
      level: r.level ?? '',
      sample_size: r.sample_size ?? '',
      aql: r.aql ?? '',
      inspection_level: r.inspection_level ?? '',
      product_code: r.product_code ?? '',
      product_name: r.product_name ?? '',
      sampling_plan_id: r.sampling_plan_id ?? '',
      description: r.description ?? '',
    });
    setOpen(true);
  };

  const columns = useMemo(() => {
    const cols: Record<TabKey, { key: string; label: string }[]> = {
      items: [
        { key: 'code', label: t('qms.inspectionStandard.code') },
        { key: 'name', label: t('qms.inspectionStandard.name') },
        { key: 'category', label: t('qms.inspectionStandard.category') },
        { key: 'unit', label: t('qms.inspectionStandard.unit') },
        { key: 'status', label: t('qms.inspectionStandard.status') },
      ],
      plans: [
        { key: 'code', label: t('qms.inspectionStandard.code') },
        { key: 'name', label: t('qms.inspectionStandard.name') },
        { key: 'product_code', label: t('qms.inspectionStandard.productCode') },
        { key: 'status', label: t('qms.inspectionStandard.status') },
      ],
      samplingPlans: [
        { key: 'code', label: t('qms.inspectionStandard.code') },
        { key: 'name', label: t('qms.inspectionStandard.name') },
        { key: 'level', label: t('qms.inspectionStandard.level') },
        { key: 'sample_size', label: t('qms.inspectionStandard.sampleSize') },
        { key: 'aql', label: t('qms.inspectionStandard.aql') },
      ],
    };
    return cols;
  }, [t]);

  const listData = queries[tab].data?.data as ListLike | undefined;
  const rows = (listData?.items ?? []) as Array<InspectionItem | InspectionPlan | SamplingPlan>;
  const total = listData?.total ?? 0;

  const formFields: { key: string; label: string; type?: string }[] = useMemo(() => {
    if (tab === 'items') {
      return [
        { key: 'code', label: t('qms.inspectionStandard.code') },
        { key: 'name', label: t('qms.inspectionStandard.name') },
        { key: 'category', label: t('qms.inspectionStandard.category') },
        { key: 'unit', label: t('qms.inspectionStandard.unit') },
        { key: 'standard_value', label: t('qms.inspectionStandard.standardValue') },
        { key: 'tolerance', label: t('qms.inspectionStandard.tolerance') },
        { key: 'method', label: t('qms.inspectionStandard.method') },
        { key: 'status', label: t('qms.inspectionStandard.status') },
      ];
    }
    if (tab === 'plans') {
      return [
        { key: 'code', label: t('qms.inspectionStandard.code') },
        { key: 'name', label: t('qms.inspectionStandard.name') },
        { key: 'product_code', label: t('qms.inspectionStandard.productCode') },
        { key: 'product_name', label: t('qms.inspectionStandard.productName') },
        { key: 'sampling_plan_id', label: t('qms.inspectionStandard.samplingPlanId') },
        { key: 'status', label: t('qms.inspectionStandard.status') },
      ];
    }
    return [
      { key: 'code', label: t('qms.inspectionStandard.code') },
      { key: 'name', label: t('qms.inspectionStandard.name') },
      { key: 'level', label: t('qms.inspectionStandard.level') },
      { key: 'sample_size', label: t('qms.inspectionStandard.sampleSize') },
      { key: 'aql', label: t('qms.inspectionStandard.aql') },
      { key: 'inspection_level', label: t('qms.inspectionStandard.inspectionLevel') },
      { key: 'status', label: t('qms.inspectionStandard.status') },
    ];
  }, [tab, t]);

  return (
    <PageContainer autoTitle>
      <Box sx={{ p: 3 }}>
        <Typography
          variant='h5'
          sx={{ fontWeight: 600 }}
        >
          {t('qms.inspectionStandard.title')}
        </Typography>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary', mt: 0.5 }}
        >
          {t('qms.inspectionStandard.titleDesc')}
        </Typography>
        <Tabs
          value={tab}
          onChange={(_e, v: TabKey) => {
            setTab(v);
            setPage(0);
          }}
          sx={{ mt: 2 }}
        >
          <Tab
            value='items'
            label={t('qms.inspectionStandard.tabItems')}
          />
          <Tab
            value='plans'
            label={t('qms.inspectionStandard.tabPlans')}
          />
          <Tab
            value='samplingPlans'
            label={t('qms.inspectionStandard.tabSamplingPlans')}
          />
        </Tabs>
        <Stack
          direction='row'
          spacing={2}
          sx={{ mt: 2, mb: 2 }}
        >
          <TextField
            size='small'
            placeholder={t('qms.inspectionStandard.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button
            variant='contained'
            startIcon={<Plus size={18} />}
            onClick={openCreate}
          >
            {t('qms.inspectionStandard.create')}
          </Button>
        </Stack>
        <Card variant='outlined'>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  {columns[tab].map((c) => (
                    <TableCell key={c.key}>{c.label}</TableCell>
                  ))}
                  <TableCell>{t('qms.inspectionStandard.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                  >
                    {columns[tab].map((c) => (
                      <TableCell key={c.key}>
                        {c.key === 'status' ? (
                          <Chip
                            size='small'
                            label={(row as unknown as Record<string, string>)[c.key]}
                            color={
                              (row as unknown as Record<string, string>)[c.key] === 'active'
                                ? 'success'
                                : 'default'
                            }
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
            {editingId ? t('qms.inspectionStandard.edit') : t('qms.inspectionStandard.create')}
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
                  type={f.type ?? 'text'}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                />
              ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>{t('qms.inspectionStandard.cancel')}</Button>
            <Button
              variant='contained'
              onClick={() => saveMutation.mutate()}
            >
              {t('qms.inspectionStandard.save')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default InspectionStandardPage;
