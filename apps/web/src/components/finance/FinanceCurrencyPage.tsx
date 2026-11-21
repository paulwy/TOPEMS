import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Banknote, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Switch,
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
import { financeApi } from '@/api/finance';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';

import { PageContainer } from '@/components/common';

interface CurrencyRow {
  id: string;
  code: string;
  name: string;
  symbol?: string | null;
  exchange_rate: number;
  is_active: boolean;
}

interface CurrencyForm {
  code: string;
  name: string;
  symbol: string;
  exchange_rate: string;
}

const emptyForm: CurrencyForm = { code: '', name: '', symbol: '', exchange_rate: '1' };

const FinanceCurrencyPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CurrencyRow | null>(null);
  const [form, setForm] = useState<CurrencyForm>(emptyForm);

  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.FINANCE.CURRENCIES, page, pageSize, search],
    queryFn: () =>
      financeApi.currency.list({
        page: page + 1,
        page_size: pageSize,
        search: search || undefined,
      }),
    placeholderData: (prev) => prev,
    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FINANCE.CURRENCIES] });

  const createMutation = useMutation({
    mutationFn: (payload: { code: string; name: string; symbol?: string; exchange_rate: number }) =>
      financeApi.currency.create(payload),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('finance.currency_page.created') });
      setOpen(false);
      invalidate();
    },
    onError: () =>
      addNotification({ type: 'error', message: t('finance.currency_page.create_failed') }),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      data: { name?: string; symbol?: string; exchange_rate?: number; is_active?: boolean };
    }) => financeApi.currency.update(payload.id, payload.data),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('finance.currency_page.updated') });
      setOpen(false);
      invalidate();
    },
    onError: () =>
      addNotification({ type: 'error', message: t('finance.currency_page.update_failed') }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.currency.remove(id),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('finance.currency_page.deleted') });
      invalidate();
    },
    onError: () =>
      addNotification({ type: 'error', message: t('finance.currency_page.delete_failed') }),
  });

  const items = data?.data?.items ?? [];
  const total = data?.data?.total ?? 0;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (row: CurrencyRow) => {
    setEditing(row);
    setForm({
      code: row.code,
      name: row.name,
      symbol: row.symbol ?? '',
      exchange_rate: String(row.exchange_rate),
    });
    setOpen(true);
  };

  const toggleActive = (row: CurrencyRow) => {
    updateMutation.mutate({ id: row.id, data: { is_active: !row.is_active } });
  };

  const handleSave = () => {
    const rate = Number(form.exchange_rate);
    if (!form.code.trim() || !form.name.trim() || Number.isNaN(rate)) {
      addNotification({ type: 'error', message: t('finance.currency_page.invalid_form') });
      return;
    }
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        data: {
          name: form.name.trim(),
          symbol: form.symbol.trim() || undefined,
          exchange_rate: rate,
        },
      });
    } else {
      createMutation.mutate({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        symbol: form.symbol.trim() || undefined,
        exchange_rate: rate,
      });
    }
  };

  return (
    <PageContainer autoTitle>
      <Box sx={{ p: 3 }}>
        <Stack
          direction='row'
          sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Stack
            direction='row'
            sx={{ alignItems: 'center' }}
            spacing={1}
          >
            <Banknote size={22} />
            <Typography variant='h5'>{t('finance.currency_page.title')}</Typography>
          </Stack>
          <Stack
            direction='row'
            spacing={1}
          >
            <TextField
              size='small'
              placeholder={t('finance.currency_page.search_placeholder')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
            <Button
              variant='contained'
              startIcon={<Plus size={16} />}
              onClick={openCreate}
            >
              {t('finance.currency_page.add')}
            </Button>
          </Stack>
        </Stack>

        <Card>
          <CardContent>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('finance.currency_page.col_code')}</TableCell>
                    <TableCell>{t('finance.currency_page.col_name')}</TableCell>
                    <TableCell>{t('finance.currency_page.col_symbol')}</TableCell>
                    <TableCell align='right'>{t('finance.currency_page.col_rate')}</TableCell>
                    <TableCell>{t('finance.currency_page.col_status')}</TableCell>
                    <TableCell align='right'>{t('finance.currency_page.col_actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        align='center'
                      >
                        {t('common.loading')}
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        align='center'
                      >
                        {t('common.no_data')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((row: CurrencyRow) => (
                      <TableRow
                        key={row.id}
                        hover
                      >
                        <TableCell>
                          <Typography sx={{ fontWeight: 600 }}>{row.code}</Typography>
                        </TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.symbol ?? '-'}</TableCell>
                        <TableCell align='right'>{Number(row.exchange_rate).toFixed(4)}</TableCell>
                        <TableCell>
                          <Switch
                            size='small'
                            checked={row.is_active}
                            onChange={() => toggleActive(row)}
                          />
                          {row.is_active ? (
                            <Chip
                              size='small'
                              label={t('finance.currency_page.active')}
                              color='success'
                              sx={{ ml: 1 }}
                            />
                          ) : (
                            <Chip
                              size='small'
                              label={t('finance.currency_page.inactive')}
                              color='default'
                              sx={{ ml: 1 }}
                            />
                          )}
                        </TableCell>
                        <TableCell align='right'>
                          <IconButton
                            size='small'
                            onClick={() => openEdit(row)}
                          >
                            <Pencil size={16} />
                          </IconButton>
                          <IconButton
                            size='small'
                            color='error'
                            onClick={() => deleteMutation.mutate(row.id)}
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
              rowsPerPageOptions={[5, 10, 20, 50]}
              onPageChange={(_, p) => setPage(p)}
              onRowsPerPageChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
            />
          </CardContent>
        </Card>

        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          maxWidth='xs'
          fullWidth
        >
          <DialogTitle>
            {editing ? t('finance.currency_page.edit_title') : t('finance.currency_page.add_title')}
          </DialogTitle>
          <DialogContent>
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              <TextField
                label={t('finance.currency_page.col_code')}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                disabled={!!editing}
                size='small'
              />
              <TextField
                label={t('finance.currency_page.col_name')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                size='small'
              />
              <TextField
                label={t('finance.currency_page.col_symbol')}
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                size='small'
              />
              <TextField
                label={t('finance.currency_page.col_rate')}
                value={form.exchange_rate}
                onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })}
                size='small'
                type='number'
                slotProps={{ htmlInput: { step: '0.0001' } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button
              variant='contained'
              onClick={handleSave}
            >
              {t('common.confirm')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default FinanceCurrencyPage;
