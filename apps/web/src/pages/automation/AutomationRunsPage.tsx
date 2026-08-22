import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  RefreshCw as RefreshIcon,
  XCircle as CancelIcon,
  ChevronRight as ChevronRightIcon,
  AlertTriangle as AlertIcon,
} from 'lucide-react';
import { automationRunsApi } from '@/api/automation';
import type { AutomationRun, AutomationRunStatus } from '@/api/automation';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const RUN_STATUS_COLOR: Record<
  AutomationRunStatus,
  'success' | 'error' | 'warning' | 'info' | 'default'
> = {
  success: 'success',
  failed: 'error',
  running: 'info',
  pending: 'warning',
  cancelled: 'default',
  timeout: 'error',
};

function getRunStatusLabel(): Record<AutomationRunStatus, string> {
  return {
    success: i18n.t('automation.automation_runs_page.k0'),
    failed: i18n.t('automation.automation_runs_page.k1'),
    running: i18n.t('automation.automation_runs_page.k2'),
    pending: i18n.t('automation.automation_runs_page.k3'),
    cancelled: i18n.t('automation.automation_runs_page.k4'),
    timeout: i18n.t('automation.automation_runs_page.k5'),
  };
}

export const AutomationRunsPage: React.FC = () => {
  const { t } = useTranslation('automation');
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailRun, setDetailRun] = useState<AutomationRun | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await automationRunsApi.list({ page: 1, pageSize: 50 });
      setRuns(res.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('automation.automation_runs_page.k6'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRetry = useCallback(
    async (id: string) => {
      try {
        await automationRunsApi.retry(id);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('automation.automation_runs_page.k7'));
      }
    },
    [load, t]
  );

  const handleCancel = useCallback(
    async (id: string) => {
      try {
        await automationRunsApi.cancel(id);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('automation.automation_runs_page.k8'));
      }
    },
    [load, t]
  );

  const handleViewDetail = useCallback(
    async (run: AutomationRun) => {
      try {
        const res = await automationRunsApi.get(run.id);
        if (res.data) setDetailRun(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('automation.automation_runs_page.k9'));
      }
    },
    [t]
  );

  const columns: ColumnDef<AutomationRun>[] = useMemo(
    () => [
      {
        id: 'rule',
        label: t('automation.automation_runs_page.k12'),
        render: (run) => (
          <Typography variant='body2'>{run.rule_name ?? run.rule_code ?? run.rule_id}</Typography>
        ),
      },
      {
        id: 'trigger_type',
        label: t('automation.automation_runs_page.k13'),
        render: (run) => <Typography variant='body2'>{run.trigger_type}</Typography>,
      },
      {
        id: 'status',
        label: t('automation.automation_runs_page.k14'),
        render: (run) => (
          <Chip
            size='small'
            color={RUN_STATUS_COLOR[run.status]}
            label={getRunStatusLabel()[run.status]}
          />
        ),
      },
      {
        id: 'started_at',
        label: t('automation.automation_runs_page.k15'),
        render: (run) => <Typography variant='body2'>{run.started_at}</Typography>,
      },
      {
        id: 'finished_at',
        label: t('automation.automation_runs_page.k16'),
        render: (run) => <Typography variant='body2'>{run.finished_at ?? '-'}</Typography>,
      },
      {
        id: 'duration_ms',
        label: t('automation.automation_runs_page.k17'),
        align: 'right',
        render: (run) => (
          <Typography variant='body2'>{run.duration_ms ? `${run.duration_ms}ms` : '-'}</Typography>
        ),
      },
      {
        id: 'retry_count',
        label: t('automation.automation_runs_page.k18'),
        render: (run) => <Typography variant='body2'>{run.retry_count ?? 0}</Typography>,
      },
    ],
    [t]
  );

  const rowActions: RowAction<AutomationRun>[] = useMemo(
    () => [
      {
        key: 'view',
        label: t('automation.automation_runs_page.k21'),
        icon: <ChevronRightIcon size={18} />,
        onClick: (run) => handleViewDetail(run),
      },
      {
        key: 'retry',
        label: t('automation.automation_runs_page.k23'),
        icon: <RefreshIcon size={18} />,
        onClick: (run) => handleRetry(run.id),
        show: (run) => run.status === 'failed' || run.status === 'timeout',
      },
      {
        key: 'cancel',
        label: t('automation.automation_runs_page.k25'),
        icon: <CancelIcon size={18} />,
        color: 'error',
        onClick: (run) => handleCancel(run.id),
        show: (run) => run.status === 'running' || run.status === 'pending',
      },
    ],
    [t, handleViewDetail, handleRetry, handleCancel]
  );

  const actions = useMemo(
    () => [
      {
        label: t('automation.automation_runs_page.e1'),
        icon: <RefreshIcon size={18} />,
        onClick: load,
        variant: 'outlined' as const,
      },
    ],
    [t, load]
  );

  return (
    <>
      <ListPageTemplate<AutomationRun>
        title={t('automation.automation_runs_page.k10')}
        subtitle={t('automation.automation_runs_page.k11')}
        columns={columns}
        data={runs}
        loading={loading}
        error={error ?? undefined}
        actions={actions}
        rowActions={rowActions}
        emptyMessage={t('automation.automation_runs_page.e2')}
      />

      <Dialog
        open={Boolean(detailRun)}
        onClose={() => setDetailRun(null)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{t('automation.automation_runs_page.k26')}</DialogTitle>
        <DialogContent>
          {detailRun && (
            <Stack
              spacing={2}
              sx={{ mt: 1 }}
            >
              <Box>
                <Typography variant='subtitle2'>
                  {t('automation.automation_runs_page.k27')}
                </Typography>
                <Typography variant='body2'>
                  {detailRun.rule_name ?? detailRun.rule_code ?? detailRun.rule_id}
                </Typography>
              </Box>
              <Box>
                <Typography variant='subtitle2'>
                  {t('automation.automation_runs_page.k28')}
                </Typography>
                <Chip
                  size='small'
                  color={RUN_STATUS_COLOR[detailRun.status]}
                  label={getRunStatusLabel()[detailRun.status]}
                />
              </Box>
              <Box>
                <Typography variant='subtitle2'>
                  {t('automation.automation_runs_page.k29')}
                </Typography>
                <Typography variant='body2'>
                  {t('automation.automation_runs_page.r1', { v1: detailRun.started_at })}
                  <br />
                  {t('automation.automation_runs_page.r2', { v1: detailRun.finished_at ?? '-' })}
                  <br />
                  {t('automation.automation_runs_page.e1', {
                    v1: detailRun.duration_ms ? `${detailRun.duration_ms}ms` : '-',
                  })}
                </Typography>
              </Box>
              {detailRun.error && (
                <Box>
                  <Stack
                    direction='row'
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                  >
                    <AlertIcon
                      size={16}
                      color='red'
                    />
                    <Typography
                      variant='subtitle2'
                      color='error.main'
                    >
                      {t('automation.automation_runs_page.e3')}
                    </Typography>
                  </Stack>
                  <Paper
                    variant='outlined'
                    sx={{ p: 1, mt: 0.5, bgcolor: 'grey.50' }}
                  >
                    <Typography
                      variant='body2'
                      component='pre'
                      sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0 }}
                    >
                      {detailRun.error}
                    </Typography>
                  </Paper>
                </Box>
              )}
              {detailRun.steps && detailRun.steps.length > 0 && (
                <Box>
                  <Typography variant='subtitle2'>
                    {t('automation.automation_runs_page.k30')}
                  </Typography>
                  <TableContainer
                    component={Paper}
                    variant='outlined'
                    sx={{ mt: 0.5 }}
                  >
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>{t('automation.automation_runs_page.k31')}</TableCell>
                          <TableCell>{t('automation.automation_runs_page.k32')}</TableCell>
                          <TableCell>{t('automation.automation_runs_page.k33')}</TableCell>
                          <TableCell align='right'>
                            {t('automation.automation_runs_page.k34')}
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detailRun.steps.map((step) => (
                          <TableRow key={step.step}>
                            <TableCell>{step.step}</TableCell>
                            <TableCell>{step.name}</TableCell>
                            <TableCell>{step.type}</TableCell>
                            <TableCell>{step.status}</TableCell>
                            <TableCell align='right'>
                              {step.duration_ms ? `${step.duration_ms}ms` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailRun(null)}>
            {t('automation.automation_runs_page.k35')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AutomationRunsPage;
