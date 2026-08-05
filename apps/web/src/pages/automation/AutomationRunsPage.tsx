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
  success: '成功',
  failed: '失败',
  running: '运行中',
  pending: '等待',
  cancelled: '已取消',
  timeout: '超时',
};

export const AutomationRunsPage: React.FC = () => {
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
      setError(err instanceof Error ? err.message : '加载执行历史失败');
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
      setError(err instanceof Error ? err.message : '重试失败');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await automationRunsApi.cancel(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消失败');
    }
  };

  const handleViewDetail = async (run: AutomationRun) => {
    try {
      const res = await automationRunsApi.get(run.id);
      if (res.data) setDetailRun(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载详情失败');
    }
  };

  return (
    <PageContainer title='执行历史'>
      <Box sx={{ p: 3 }}>
        <Stack
          direction='row'
          spacing={2}
          sx={{ mb: 2, justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant='h5'>执行历史</Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={load}
            size='small'
          >
            刷新
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
                  <TableCell>规则</TableCell>
                  <TableCell>触发方式</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>开始时间</TableCell>
                  <TableCell>结束时间</TableCell>
                  <TableCell align='right'>耗时</TableCell>
                  <TableCell>重试</TableCell>
                  <TableCell align='right'>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align='center'
                    >
                      暂无执行记录
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
                          aria-label='查看详情'
                          title='查看详情'
                        >
                          <ChevronRightIcon size={18} />
                        </IconButton>
                        {(run.status === 'failed' || run.status === 'timeout') && (
                          <IconButton
                            size='small'
                            onClick={() => handleRetry(run.id)}
                            aria-label='重试'
                            title='重试'
                          >
                            <RefreshIcon size={18} />
                          </IconButton>
                        )}
                        {(run.status === 'running' || run.status === 'pending') && (
                          <IconButton
                            size='small'
                            color='error'
                            onClick={() => handleCancel(run.id)}
                            aria-label='取消'
                            title='取消'
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
          <DialogTitle>运行详情</DialogTitle>
          <DialogContent>
            {detailRun && (
              <Stack
                spacing={2}
                sx={{ mt: 1 }}
              >
                <Box>
                  <Typography variant='subtitle2'>规则</Typography>
                  <Typography variant='body2'>
                    {detailRun.rule_name ?? detailRun.rule_code ?? detailRun.rule_id}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant='subtitle2'>状态</Typography>
                  <Chip
                    size='small'
                    color={RUN_STATUS_COLOR[detailRun.status]}
                    label={RUN_STATUS_LABEL[detailRun.status]}
                  />
                </Box>
                <Box>
                  <Typography variant='subtitle2'>时间</Typography>
                  <Typography variant='body2'>
                    开始：{detailRun.started_at}
                    <br />
                    结束：{detailRun.finished_at ?? '-'}
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
                        错误信息
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
                    <Typography variant='subtitle2'>步骤明细</Typography>
                    <TableContainer
                      component={Paper}
                      variant='outlined'
                      sx={{ mt: 0.5 }}
                    >
                      <Table size='small'>
                        <TableHead>
                          <TableRow>
                            <TableCell>#</TableCell>
                            <TableCell>步骤</TableCell>
                            <TableCell>类型</TableCell>
                            <TableCell>状态</TableCell>
                            <TableCell align='right'>耗时</TableCell>
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
            <Button onClick={() => setDetailRun(null)}>关闭</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageContainer>
  );
};

export default AutomationRunsPage;
