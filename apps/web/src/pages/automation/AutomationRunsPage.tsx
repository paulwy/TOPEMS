import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
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
import { PageContainer } from '@/components/common';
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

const RUN_STATUS_LABEL: Record<AutomationRunStatus, string> = {
  success: i18n.t('automation.automation_runs_page.k0'),
  failed: i18n.t('automation.automation_runs_page.k1'),
  running: i18n.t('automation.automation_runs_page.k2'),
  pending: i18n.t('automation.automation_runs_page.k3'),
  cancelled: i18n.t('automation.automation_runs_page.k4'),
  timeout: i18n.t('automation.automation_runs_page.k5'),
};

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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRetry = async (id: string) => {
    try {
      await automationRunsApi.retry(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('automation.automation_runs_page.k7'));
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await automationRunsApi.cancel(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('automation.automation_runs_page.k8'));
    }
  };

  const handleViewDetail = async (run: AutomationRun) => {
    try {
      const res = await automationRunsApi.get(run.id);
      if (res.data) setDetailRun(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('automation.automation_runs_page.k9'));
    }
  };

  return (
    <PageContainer title={t('automation.automation_runs_page.k10')}>
      <Box sx={{ p: 3 }}>
        <Stack
          direction='row'
          spacing={2}
          sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant='h5'>{t('automation.automation_runs_page.k11')}</Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={load}
            size='small'
          >
            {t('automation.automation_runs_page.e1')}
          </Button>
        </Stack>

        {error && (
          <Typography
            color='error'
            variant='body2'
            sx={{ mb: 1 }}
          >
            {error}
          </Typography>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            variant='outlined'
          >
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{t('automation.automation_runs_page.k12')}</TableCell>
                  <TableCell>{t('automation.automation_runs_page.k13')}</TableCell>
                  <TableCell>{t('automation.automation_runs_page.k14')}</TableCell>
                  <TableCell>{t('automation.automation_runs_page.k15')}</TableCell>
                  <TableCell>{t('automation.automation_runs_page.k16')}</TableCell>
                  <TableCell align='right'>{t('automation.automation_runs_page.k17')}</TableCell>
                  <TableCell>{t('automation.automation_runs_page.k18')}</TableCell>
                  <TableCell align='right'>{t('automation.automation_runs_page.k19')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align='center'
                    >
                      {t('automation.automation_runs_page.e2')}
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>{run.rule_name ?? run.rule_code ?? run.rule_id}</TableCell>
                      <TableCell>{run.trigger_type}</TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          color={RUN_STATUS_COLOR[run.status]}
                          label={RUN_STATUS_LABEL[run.status]}
                        />
                      </TableCell>
                      <TableCell>{run.started_at}</TableCell>
                      <TableCell>{run.finished_at ?? '-'}</TableCell>
                      <TableCell align='right'>
                        {run.duration_ms ? `${run.duration_ms}ms` : '-'}
                      </TableCell>
                      <TableCell>{run.retry_count ?? 0}</TableCell>
                      <TableCell align='right'>
                        <IconButton
                          size='small'
                          onClick={() => handleViewDetail(run)}
                          aria-label={t('automation.automation_runs_page.k20')}
                          title={t('automation.automation_runs_page.k21')}
                        >
                          <ChevronRightIcon size={18} />
                        </IconButton>
                        {(run.status === 'failed' || run.status === 'timeout') && (
                          <IconButton
                            size='small'
                            onClick={() => handleRetry(run.id)}
                            aria-label={t('automation.automation_runs_page.k22')}
                            title={t('automation.automation_runs_page.k23')}
                          >
                            <RefreshIcon size={18} />
                          </IconButton>
                        )}
                        {(run.status === 'running' || run.status === 'pending') && (
                          <IconButton
                            size='small'
                            color='error'
                            onClick={() => handleCancel(run.id)}
                            aria-label={t('automation.automation_runs_page.k24')}
                            title={t('automation.automation_runs_page.k25')}
                          >
                            <CancelIcon size={18} />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

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
                    label={RUN_STATUS_LABEL[detailRun.status]}
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
                    耗时：{detailRun.duration_ms ? `${detailRun.duration_ms}ms` : '-'}
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
      </Box>
    </PageContainer>
  );
};

export default AutomationRunsPage;
