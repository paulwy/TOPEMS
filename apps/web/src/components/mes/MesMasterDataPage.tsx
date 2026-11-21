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
import { workshopApi, productionLineApi, shiftApi, workCalendarApi } from '@/api/mes';
import type { Workshop, ProductionLine, Shift, WorkCalendar } from '@/api/mes';
import { useNotificationStore } from '@/store';

import { PageContainer } from '@/components/common';
import { EmptyState } from '@/components';

type TabKey = 'workshops' | 'productionLines' | 'shifts' | 'workCalendars';

interface ListLike {
  items?: unknown[];
  total?: number;
  page?: number;
  page_size?: number;
}

const MesMasterDataPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const [tab, setTab] = useState<TabKey>('workshops');
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const pageSize = 10;

  const queryKey = 'mes-master-data';

  const queries = {
    workshops: useQuery({
      queryKey: [queryKey, 'workshops', page, search],
      queryFn: () =>
        workshopApi.list({ page: page + 1, page_size: pageSize, search: search || undefined }),
    }),
    productionLines: useQuery({
      queryKey: [queryKey, 'productionLines', page, search],
      queryFn: () =>
        productionLineApi.list({
          page: page + 1,
          page_size: pageSize,
          search: search || undefined,
        }),
    }),
    shifts: useQuery({
      queryKey: [queryKey, 'shifts', page, search],
      queryFn: () =>
        shiftApi.list({ page: page + 1, page_size: pageSize, search: search || undefined }),
    }),
    workCalendars: useQuery({
      queryKey: [queryKey, 'workCalendars', page, search],
      queryFn: () =>
        workCalendarApi.list({ page: page + 1, page_size: pageSize, search: search || undefined }),
    }),
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['mes-master-data'] });

  const saveMutation = useMutation<void, Error>({
    mutationFn: async () => {
      if (tab === 'workshops') {
        if (editingId) {
          await workshopApi.update(editingId, form);
        } else {
          await workshopApi.create(form as never);
        }
      } else if (tab === 'productionLines') {
        if (editingId) {
          await productionLineApi.update(editingId, form);
        } else {
          await productionLineApi.create(form as never);
        }
      } else if (tab === 'shifts') {
        if (editingId) {
          await shiftApi.update(editingId, form);
        } else {
          await shiftApi.create(form as never);
        }
      } else if (editingId) {
        await workCalendarApi.update(editingId, form);
      } else {
        await workCalendarApi.create(form as never);
      }
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('mes.masterData.saveSuccess') });
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => {
      addNotification({ type: 'error', message: t('mes.masterData.saveFailed') });
      console.error(e);
    },
  });

  const removeMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      if (tab === 'workshops') await workshopApi.remove(id);
      else if (tab === 'productionLines') await productionLineApi.remove(id);
      else if (tab === 'shifts') await shiftApi.remove(id);
      else await workCalendarApi.remove(id);
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('mes.masterData.deleteSuccess') });
      invalidate();
    },
    onError: () => addNotification({ type: 'error', message: t('mes.masterData.deleteFailed') }),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({});
    setOpen(true);
  };

  const openEdit = (row: Workshop | ProductionLine | Shift | WorkCalendar) => {
    setEditingId(row.id);
    const r = row as unknown as Record<string, string>;
    setForm({
      code: r.code,
      name: r.name,
      status: r.status,
      location: r.location ?? '',
      manager: r.manager ?? '',
      description: r.description ?? '',
      workshop_id: r.workshop_id ?? '',
      start_time: r.start_time ?? '',
      end_time: r.end_time ?? '',
      work_date: r.work_date ?? '',
      calendar_type: r.calendar_type ?? '',
      shift_id: r.shift_id ?? '',
      remark: r.remark ?? '',
    });
    setOpen(true);
  };

  const columns = useMemo(() => {
    const cols: Record<TabKey, { key: string; label: string }[]> = {
      workshops: [
        { key: 'code', label: t('mes.masterData.code') },
        { key: 'name', label: t('mes.masterData.name') },
        { key: 'location', label: t('mes.masterData.location') },
        { key: 'manager', label: t('mes.masterData.manager') },
        { key: 'status', label: t('mes.masterData.status') },
      ],
      productionLines: [
        { key: 'code', label: t('mes.masterData.code') },
        { key: 'name', label: t('mes.masterData.name') },
        { key: 'workshop_id', label: t('mes.masterData.workshopId') },
        { key: 'status', label: t('mes.masterData.status') },
      ],
      shifts: [
        { key: 'code', label: t('mes.masterData.code') },
        { key: 'name', label: t('mes.masterData.name') },
        { key: 'start_time', label: t('mes.masterData.startTime') },
        { key: 'end_time', label: t('mes.masterData.endTime') },
        { key: 'is_overnight', label: t('mes.masterData.overnight') },
      ],
      workCalendars: [
        { key: 'code', label: t('mes.masterData.code') },
        { key: 'name', label: t('mes.masterData.name') },
        { key: 'work_date', label: t('mes.masterData.workDate') },
        { key: 'calendar_type', label: t('mes.masterData.calendarType') },
        { key: 'is_working', label: t('mes.masterData.isWorking') },
      ],
    };
    return cols;
  }, [t]);

  const listData = queries[tab].data?.data as ListLike | undefined;
  const rows = (listData?.items ?? []) as Array<Workshop | ProductionLine | Shift | WorkCalendar>;
  const total = listData?.total ?? 0;

  const formFields: { key: string; label: string; type?: string }[] = useMemo(() => {
    if (tab === 'workshops') {
      return [
        { key: 'code', label: t('mes.masterData.code') },
        { key: 'name', label: t('mes.masterData.name') },
        { key: 'location', label: t('mes.masterData.location') },
        { key: 'manager', label: t('mes.masterData.manager') },
        { key: 'status', label: t('mes.masterData.status') },
      ];
    }
    if (tab === 'productionLines') {
      return [
        { key: 'code', label: t('mes.masterData.code') },
        { key: 'name', label: t('mes.masterData.name') },
        { key: 'workshop_id', label: t('mes.masterData.workshopId') },
        { key: 'status', label: t('mes.masterData.status') },
      ];
    }
    if (tab === 'shifts') {
      return [
        { key: 'code', label: t('mes.masterData.code') },
        { key: 'name', label: t('mes.masterData.name') },
        { key: 'start_time', label: t('mes.masterData.startTime'), type: 'time' },
        { key: 'end_time', label: t('mes.masterData.endTime'), type: 'time' },
        { key: 'status', label: t('mes.masterData.status') },
      ];
    }
    return [
      { key: 'code', label: t('mes.masterData.code') },
      { key: 'name', label: t('mes.masterData.name') },
      { key: 'work_date', label: t('mes.masterData.workDate'), type: 'date' },
      { key: 'calendar_type', label: t('mes.masterData.calendarType') },
      { key: 'shift_id', label: t('mes.masterData.shiftId') },
    ];
  }, [tab, t]);

  return (
    <PageContainer autoTitle>
      <Box sx={{ p: 3 }}>
        <Typography
          variant='h5'
          sx={{ fontWeight: 600 }}
          gutterBottom
        >
          {t('mes.masterData.title')}
        </Typography>
        <Card>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              pt: 1,
            }}
          >
            <Tabs
              value={tab}
              onChange={(_, v: TabKey) => {
                setTab(v);
                setPage(0);
                setSearch('');
              }}
            >
              <Tab
                value='workshops'
                label={t('mes.masterData.tabWorkshops')}
              />
              <Tab
                value='productionLines'
                label={t('mes.masterData.tabProductionLines')}
              />
              <Tab
                value='shifts'
                label={t('mes.masterData.tabShifts')}
              />
              <Tab
                value='workCalendars'
                label={t('mes.masterData.tabWorkCalendars')}
              />
            </Tabs>
            <Stack
              direction='row'
              spacing={1}
              sx={{ alignItems: 'center' }}
            >
              <TextField
                size='small'
                placeholder={t('mes.masterData.searchPlaceholder')}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
              <Button
                startIcon={<Plus size={16} />}
                variant='contained'
                onClick={openCreate}
              >
                {t('mes.masterData.create')}
              </Button>
            </Stack>
          </Box>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  {columns[tab].map((c) => (
                    <TableCell key={c.key}>{c.label}</TableCell>
                  ))}
                  <TableCell align='right'>{t('mes.masterData.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns[tab].length + 1}
                      align='center'
                      sx={{ py: 4 }}
                    >
                      <EmptyState
                        emoji='🗂️'
                        title={t('mes.masterData.empty')}
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
                      {columns[tab].map((c) => {
                        const v = (row as unknown as Record<string, unknown>)[c.key];
                        return (
                          <TableCell key={c.key}>
                            {c.key === 'status' ? (
                              <Chip
                                size='small'
                                color={(v as string) === 'active' ? 'success' : 'default'}
                                label={v as string}
                              />
                            ) : typeof v === 'boolean' ? (
                              <Chip
                                size='small'
                                color={v ? 'success' : 'default'}
                                label={v ? '✓' : '—'}
                              />
                            ) : (
                              ((v as string) ?? '—')
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell align='right'>
                        <IconButton
                          size='small'
                          onClick={() => openEdit(row)}
                        >
                          <Pencil size={16} />
                        </IconButton>
                        <IconButton
                          size='small'
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
            rowsPerPage={pageSize}
            rowsPerPageOptions={[10]}
            onPageChange={(_, p) => setPage(p)}
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
            {editingId ? t('mes.masterData.edit') : t('mes.masterData.create')}
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
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  fullWidth
                />
              ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>{t('mes.masterData.cancel')}</Button>
            <Button
              variant='contained'
              onClick={() => saveMutation.mutate()}
            >
              {t('mes.masterData.save')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default MesMasterDataPage;
