import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Lock, Unlock, XCircle } from 'lucide-react';
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
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { financeApi } from '@/api/finance';
import type { ApiResponse } from '@/api/client';
import { useNotificationStore } from '@/store';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';

interface PeriodRow {
  period: string;
  year: number;
  month: number;
  status?: string;
  closed_at?: string | null;
  opened_at?: string | null;
}

const FinancePeriodPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((s) => s.addNotification);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'open' | 'close' | 'close-income' | 'year-end';
    period: string;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.FINANCE.PERIODS, search],
    queryFn: () => financeApi.period.list(),
    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FINANCE.PERIODS] });

  const runAction = useMutation({
    mutationFn: async (action: {
      type: 'open' | 'close' | 'close-income' | 'year-end';
      period: string;
    }): Promise<ApiResponse<unknown>> => {
      switch (action.type) {
        case 'open':
          return financeApi.period.open(action.period);
        case 'close':
          return financeApi.period.close(action.period);
        case 'close-income':
          return financeApi.period.closePeriodIncome(action.period);
        case 'year-end':
          return financeApi.period.yearEndClose(Number(action.period.slice(0, 4)));
      }
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('finance.period_page.action_done') });
      setConfirmAction(null);
      invalidate();
    },
    onError: () => {
      addNotification({ type: 'error', message: t('finance.period_page.action_failed') });
      setConfirmAction(null);
    },
  });

  // 后端返回 items 数组（[{period,year,month,status,...}]）
  const raw = data?.data;
  const allItems: PeriodRow[] = Array.isArray(raw) ? (raw as PeriodRow[]) : (raw?.items ?? []);
  const items = search
    ? allItems.filter((r) => r.period.includes(search) || String(r.year).includes(search))
    : allItems;

  const actionLabel = (type: string) => t(`finance.period_page.action_${type}`);

  return (
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
          <CalendarDays size={22} />
          <Typography variant='h5'>{t('finance.period_page.title')}</Typography>
        </Stack>
        <TextField
          size='small'
          placeholder={t('finance.period_page.search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Stack>

      <Card>
        <CardContent>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{t('finance.period_page.col_period')}</TableCell>
                  <TableCell>{t('finance.period_page.col_year')}</TableCell>
                  <TableCell>{t('finance.period_page.col_month')}</TableCell>
                  <TableCell>{t('finance.period_page.col_status')}</TableCell>
                  <TableCell align='right'>{t('finance.period_page.col_actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align='center'
                    >
                      {t('common.loading')}
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align='center'
                    >
                      {t('common.no_data')}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row: PeriodRow) => {
                    const isClosed = row.status === 'closed' || !!row.closed_at;
                    const isYearEnd = row.status === 'year-end-closed';
                    return (
                      <TableRow
                        key={row.period}
                        hover
                      >
                        <TableCell>
                          <Typography sx={{ fontWeight: 600 }}>{row.period}</Typography>
                        </TableCell>
                        <TableCell>{row.year}</TableCell>
                        <TableCell>{row.month}</TableCell>
                        <TableCell>
                          {isYearEnd ? (
                            <Chip
                              size='small'
                              label={t('finance.period_page.status_year_end')}
                              color='secondary'
                            />
                          ) : isClosed ? (
                            <Chip
                              size='small'
                              label={t('finance.period_page.status_closed')}
                              color='default'
                            />
                          ) : (
                            <Chip
                              size='small'
                              label={t('finance.period_page.status_open')}
                              color='success'
                            />
                          )}
                        </TableCell>
                        <TableCell align='right'>
                          {!isClosed && (
                            <Button
                              size='small'
                              startIcon={<Lock size={14} />}
                              onClick={() =>
                                setConfirmAction({ type: 'close', period: row.period })
                              }
                            >
                              {actionLabel('close')}
                            </Button>
                          )}
                          {!isClosed && (
                            <Button
                              size='small'
                              color='warning'
                              startIcon={<XCircle size={14} />}
                              onClick={() =>
                                setConfirmAction({ type: 'close-income', period: row.period })
                              }
                            >
                              {actionLabel('close-income')}
                            </Button>
                          )}
                          {!isYearEnd && (
                            <Button
                              size='small'
                              color='secondary'
                              startIcon={<XCircle size={14} />}
                              onClick={() =>
                                setConfirmAction({ type: 'year-end', period: row.period })
                              }
                            >
                              {actionLabel('year-end')}
                            </Button>
                          )}
                          {isClosed && !isYearEnd && (
                            <Button
                              size='small'
                              color='primary'
                              startIcon={<Unlock size={14} />}
                              onClick={() => setConfirmAction({ type: 'open', period: row.period })}
                            >
                              {actionLabel('open')}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>{confirmAction ? actionLabel(confirmAction.type) : ''}</DialogTitle>
        <DialogContent>
          <Typography variant='body2'>
            {t('finance.period_page.confirm_text', { period: confirmAction?.period ?? '' })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAction(null)}>{t('common.cancel')}</Button>
          <Button
            variant='contained'
            color={confirmAction?.type === 'close' ? 'error' : 'primary'}
            onClick={() => confirmAction && runAction.mutate(confirmAction)}
          >
            {t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinancePeriodPage;
