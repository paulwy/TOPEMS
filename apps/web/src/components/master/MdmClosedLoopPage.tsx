import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { formatDateTime } from '@/utils/date';
import {
  mdmGovernanceApi,
  type MdmApproval,
  type MdmDuplicateRecord,
  type MdmReconciliationLog,
  type MdmReconciliationResult,
  type MdmStaleRecord,
} from '@/api/unified-core/mdmGovernance';

const statusColor = (status: string): 'success' | 'error' | 'warning' => {
  if (status === 'approved' || status === 'active') return 'success';
  if (status === 'rejected' || status === 'deleted') return 'error';
  return 'warning';
};

const MdmClosedLoopPage: React.FC = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [tab, setTab] = useState(0);
  const [historyId, setHistoryId] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [reviewTarget, setReviewTarget] = useState<MdmApproval | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    domain: 'account_subject',
    action: 'update',
    master_data_id: '',
    payload: '{\n  "name": ""\n}',
  });
  const [unresolvedOnly, setUnresolvedOnly] = useState(true);
  const [lastRun, setLastRun] = useState<MdmReconciliationResult | null>(null);

  const pendingQ = useQuery({
    queryKey: ['mdm-pending-approvals'],
    queryFn: () => mdmGovernanceApi.listPendingApprovals(),
  });
  const pending = useMemo(() => pendingQ.data?.data ?? [], [pendingQ.data]);

  const historyQ = useQuery({
    queryKey: ['mdm-approval-history', historyQuery],
    queryFn: () => mdmGovernanceApi.listApprovalHistory(historyQuery),
    enabled: historyQuery.length > 0,
  });
  const history = useMemo(() => historyQ.data?.data ?? [], [historyQ.data]);

  const reportQ = useQuery({
    queryKey: ['mdm-quality-report'],
    queryFn: () => mdmGovernanceApi.getQualityReport(),
    enabled: tab === 1,
  });
  const report = reportQ.data?.data;

  const duplicatesQ = useQuery({
    queryKey: ['mdm-quality-duplicates'],
    queryFn: () => mdmGovernanceApi.listDuplicates(),
    enabled: tab === 1,
  });
  const duplicates = useMemo(
    () => duplicatesQ.data?.data ?? [],
    [duplicatesQ.data]
  ) as MdmDuplicateRecord[];

  const staleQ = useQuery({
    queryKey: ['mdm-quality-stale'],
    queryFn: () => mdmGovernanceApi.listStale(),
    enabled: tab === 1,
  });
  const stale = useMemo(() => staleQ.data?.data ?? [], [staleQ.data]) as MdmStaleRecord[];

  const logsQ = useQuery({
    queryKey: ['mdm-reconciliation-logs', unresolvedOnly],
    queryFn: () =>
      mdmGovernanceApi.listReconciliationLogs({
        unresolved_only: unresolvedOnly,
        limit: 200,
      }),
    enabled: tab === 2,
  });
  const logs = useMemo(() => logsQ.data?.data ?? [], [logsQ.data]) as MdmReconciliationLog[];

  const reviewMut = useMutation({
    mutationFn: (payload: { id: string; approved: boolean; comment?: string }) =>
      mdmGovernanceApi.reviewApproval(payload.id, {
        approved: payload.approved,
        comment: payload.comment,
      }),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.closedLoop.reviewed') });
      setReviewTarget(null);
      setReviewComment('');
      void qc.invalidateQueries({ queryKey: ['mdm-pending-approvals'] });
      if (historyQuery) {
        void qc.invalidateQueries({ queryKey: ['mdm-approval-history', historyQuery] });
      }
      void qc.invalidateQueries({ queryKey: ['mdm-quality-report'] });
    },
    onError: () => {
      addNotification({ type: 'error', message: t('master.closedLoop.failed') });
    },
  });

  const createMut = useMutation({
    mutationFn: () => {
      let payload: Record<string, unknown> | null = null;
      const raw = createForm.payload.trim();
      if (raw) {
        try {
          payload = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          throw new Error(t('master.closedLoop.payloadInvalid'));
        }
      }
      return mdmGovernanceApi.createApproval({
        domain: createForm.domain,
        action: createForm.action as 'create' | 'update' | 'delete',
        master_data_id: createForm.master_data_id.trim(),
        payload,
      });
    },
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.closedLoop.created') });
      setCreateOpen(false);
      void qc.invalidateQueries({ queryKey: ['mdm-pending-approvals'] });
    },
    onError: (error: Error) => {
      addNotification({
        type: 'error',
        message: error.message || t('master.closedLoop.failed'),
      });
    },
  });

  const runMut = useMutation({
    mutationFn: () => mdmGovernanceApi.runReconciliation(),
    onSuccess: (resp) => {
      setLastRun(resp.data);
      addNotification({ type: 'success', message: t('master.closedLoop.ran') });
      void qc.invalidateQueries({ queryKey: ['mdm-reconciliation-logs'] });
      void qc.invalidateQueries({ queryKey: ['mdm-quality-report'] });
    },
    onError: () => {
      addNotification({ type: 'error', message: t('master.closedLoop.failed') });
    },
  });

  const resolveMut = useMutation({
    mutationFn: (id: string) => mdmGovernanceApi.resolveReconciliationIssue(id),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.closedLoop.resolvedOk') });
      void qc.invalidateQueries({ queryKey: ['mdm-reconciliation-logs'] });
    },
    onError: () => {
      addNotification({ type: 'error', message: t('master.closedLoop.failed') });
    },
  });

  const review = (approved: boolean) => {
    if (!reviewTarget) return;
    reviewMut.mutate({
      id: reviewTarget.id,
      approved,
      comment: reviewComment.trim() || undefined,
    });
  };

  return (
    <PageContainer
      title={t('master.closedLoop.title')}
      subtitle={t('master.closedLoop.subtitle')}
    >
      <Tabs
        value={tab}
        onChange={(_, value: number) => setTab(value)}
        sx={{ mb: 2 }}
      >
        <Tab label={t('master.closedLoop.tabApprovals')} />
        <Tab label={t('master.closedLoop.tabQuality')} />
        <Tab label={t('master.closedLoop.tabReconciliation')} />
      </Tabs>

      {tab === 0 && (
        <Stack spacing={2}>
          <Card sx={{ p: 2 }}>
            <Stack
              direction='row'
              sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
            >
              <Typography variant='h6'>{t('master.closedLoop.pending')}</Typography>
              <Button
                variant='contained'
                onClick={() => setCreateOpen(true)}
              >
                {t('master.closedLoop.newApproval')}
              </Button>
            </Stack>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('master.closedLoop.colMasterDataId')}</TableCell>
                    <TableCell>{t('master.closedLoop.colDomain')}</TableCell>
                    <TableCell>{t('master.closedLoop.colAction')}</TableCell>
                    <TableCell>{t('master.closedLoop.colRequestedBy')}</TableCell>
                    <TableCell>{t('master.closedLoop.colRequestedAt')}</TableCell>
                    <TableCell>{t('master.closedLoop.colStatus')}</TableCell>
                    <TableCell align='right'>{t('master.closedLoop.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pending.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.master_data_id}</TableCell>
                      <TableCell>{item.domain}</TableCell>
                      <TableCell>{item.action}</TableCell>
                      <TableCell>{item.requested_by}</TableCell>
                      <TableCell>{formatDateTime(item.requested_at)}</TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          color={statusColor(item.status)}
                          label={t('master.closedLoop.statusPending')}
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <Button
                          size='small'
                          onClick={() => setReviewTarget(item)}
                        >
                          {t('master.closedLoop.review')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pending.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        align='center'
                      >
                        {t('master.closedLoop.noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          <Card sx={{ p: 2 }}>
            <Typography
              variant='h6'
              sx={{ mb: 1 }}
            >
              {t('master.closedLoop.historyTitle')}
            </Typography>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 1 }}
            >
              <TextField
                size='small'
                fullWidth
                value={historyId}
                placeholder={t('master.closedLoop.historyPlaceholder')}
                onChange={(e) => setHistoryId(e.target.value)}
              />
              <Button
                variant='outlined'
                onClick={() => setHistoryQuery(historyId.trim())}
                disabled={!historyId.trim()}
              >
                {t('master.closedLoop.search')}
              </Button>
            </Stack>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('master.closedLoop.colAction')}</TableCell>
                    <TableCell>{t('master.closedLoop.colStatus')}</TableCell>
                    <TableCell>{t('master.closedLoop.colRequestedBy')}</TableCell>
                    <TableCell>{t('master.closedLoop.colReviewedBy')}</TableCell>
                    <TableCell>{t('master.closedLoop.colReviewedAt')}</TableCell>
                    <TableCell>{t('master.closedLoop.colComment')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.action}</TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          color={statusColor(item.status)}
                          label={item.status}
                        />
                      </TableCell>
                      <TableCell>{item.requested_by}</TableCell>
                      <TableCell>{item.reviewed_by ?? '-'}</TableCell>
                      <TableCell>
                        {item.reviewed_at ? formatDateTime(item.reviewed_at) : '-'}
                      </TableCell>
                      <TableCell>{item.review_comment ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        align='center'
                      >
                        {t('master.closedLoop.noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Stack>
      )}

      {tab === 1 && (
        <Stack spacing={2}>
          {reportQ.isError && <Alert severity='error'>{t('master.closedLoop.loadFailed')}</Alert>}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2 }}>
            {[
              ['overallScore', report?.overall_score ?? 0],
              ['totalCount', report?.total_count ?? 0],
              ['duplicateCount', report?.duplicate_count ?? 0],
              ['staleCount', report?.stale_count ?? 0],
              ['inconsistencyCount', report?.inconsistency_count ?? 0],
            ].map(([key, value]) => (
              <Card
                key={String(key)}
                sx={{ p: 2 }}
              >
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t(`master.closedLoop.${key}`)}
                </Typography>
                <Typography variant='h5'>{String(value)}</Typography>
              </Card>
            ))}
          </Box>

          <Card sx={{ p: 2 }}>
            <Typography
              variant='h6'
              sx={{ mb: 1 }}
            >
              {t('master.closedLoop.byDomain')}
            </Typography>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('master.closedLoop.colDomain')}</TableCell>
                    <TableCell>{t('master.closedLoop.totalCount')}</TableCell>
                    <TableCell>{t('master.closedLoop.colActive')}</TableCell>
                    <TableCell>{t('master.closedLoop.duplicateCount')}</TableCell>
                    <TableCell>{t('master.closedLoop.staleCount')}</TableCell>
                    <TableCell>{t('master.closedLoop.inconsistencyCount')}</TableCell>
                    <TableCell>{t('master.closedLoop.overallScore')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(report?.by_domain ?? []).map((row) => (
                    <TableRow key={row.domain}>
                      <TableCell>{row.domain}</TableCell>
                      <TableCell>{row.total}</TableCell>
                      <TableCell>{row.active}</TableCell>
                      <TableCell>{row.duplicates}</TableCell>
                      <TableCell>{row.stale}</TableCell>
                      <TableCell>{row.inconsistencies}</TableCell>
                      <TableCell>{row.quality_score}</TableCell>
                    </TableRow>
                  ))}
                  {(report?.by_domain ?? []).length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        align='center'
                      >
                        {t('master.closedLoop.noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          <Card sx={{ p: 2 }}>
            <Typography
              variant='h6'
              sx={{ mb: 1 }}
            >
              {t('master.closedLoop.duplicates')}
            </Typography>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('master.closedLoop.colDomain')}</TableCell>
                    <TableCell>{t('master.closedLoop.colCode')}</TableCell>
                    <TableCell>{t('master.closedLoop.colCount')}</TableCell>
                    <TableCell>{t('master.closedLoop.colMasterDataId')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {duplicates.map((row) => (
                    <TableRow key={`${row.domain}-${row.code}`}>
                      <TableCell>{row.domain}</TableCell>
                      <TableCell>{row.code}</TableCell>
                      <TableCell>{row.count}</TableCell>
                      <TableCell>{row.master_data_ids.join(', ')}</TableCell>
                    </TableRow>
                  ))}
                  {duplicates.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        align='center'
                      >
                        {t('master.closedLoop.noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          <Card sx={{ p: 2 }}>
            <Typography
              variant='h6'
              sx={{ mb: 1 }}
            >
              {t('master.closedLoop.stale')}
            </Typography>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('master.closedLoop.colMasterDataId')}</TableCell>
                    <TableCell>{t('master.closedLoop.colDomain')}</TableCell>
                    <TableCell>{t('master.closedLoop.colCode')}</TableCell>
                    <TableCell>{t('master.closedLoop.colName')}</TableCell>
                    <TableCell>{t('master.closedLoop.colSourceService')}</TableCell>
                    <TableCell>{t('master.closedLoop.colHoursSinceSync')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stale.map((row) => (
                    <TableRow key={row.master_data_id}>
                      <TableCell>{row.master_data_id}</TableCell>
                      <TableCell>{row.domain}</TableCell>
                      <TableCell>{row.code}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.source_service}</TableCell>
                      <TableCell>{row.hours_since_sync.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                  {stale.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        align='center'
                      >
                        {t('master.closedLoop.noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Stack>
      )}

      {tab === 2 && (
        <Stack spacing={2}>
          <Card sx={{ p: 2 }}>
            <Stack
              direction='row'
              spacing={2}
              sx={{ alignItems: 'center', mb: 1 }}
            >
              <Button
                variant='contained'
                onClick={() => runMut.mutate()}
                disabled={runMut.isPending}
              >
                {t('master.closedLoop.runReconciliation')}
              </Button>
              {lastRun && (
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('master.closedLoop.reconTotal')}: {lastRun.total_checked} /{' '}
                  {t('master.closedLoop.reconConsistent')}: {lastRun.consistent} /{' '}
                  {t('master.closedLoop.reconInconsistent')}: {lastRun.inconsistent}
                </Typography>
              )}
            </Stack>
            {lastRun && (
              <TableContainer>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('master.closedLoop.colDomain')}</TableCell>
                      <TableCell>{t('master.closedLoop.colSourceService')}</TableCell>
                      <TableCell>{t('master.closedLoop.colMdmCount')}</TableCell>
                      <TableCell>{t('master.closedLoop.colCheckedCount')}</TableCell>
                      <TableCell>{t('master.closedLoop.reconConsistent')}</TableCell>
                      <TableCell>{t('master.closedLoop.reconInconsistent')}</TableCell>
                      <TableCell>{t('master.closedLoop.colStatus')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lastRun.details.map((row) => (
                      <TableRow key={row.domain}>
                        <TableCell>{row.domain}</TableCell>
                        <TableCell>{row.source_service}</TableCell>
                        <TableCell>{row.mdm_count}</TableCell>
                        <TableCell>{row.checked_count}</TableCell>
                        <TableCell>{row.consistent}</TableCell>
                        <TableCell>{row.inconsistent}</TableCell>
                        <TableCell>{row.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>

          <Card sx={{ p: 2 }}>
            <Stack
              direction='row'
              sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
            >
              <Typography variant='h6'>{t('master.closedLoop.logs')}</Typography>
              <Button
                size='small'
                variant={unresolvedOnly ? 'contained' : 'outlined'}
                onClick={() => setUnresolvedOnly((value) => !value)}
              >
                {t('master.closedLoop.unresolvedOnly')}
              </Button>
            </Stack>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('master.closedLoop.colDomain')}</TableCell>
                    <TableCell>{t('master.closedLoop.colMasterDataId')}</TableCell>
                    <TableCell>{t('master.closedLoop.colIssueType')}</TableCell>
                    <TableCell>{t('master.closedLoop.colDescription')}</TableCell>
                    <TableCell>{t('master.closedLoop.colDetectedAt')}</TableCell>
                    <TableCell>{t('master.closedLoop.colStatus')}</TableCell>
                    <TableCell align='right'>{t('master.closedLoop.actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.domain}</TableCell>
                      <TableCell>{row.master_data_id}</TableCell>
                      <TableCell>{row.issue_type}</TableCell>
                      <TableCell>{row.description}</TableCell>
                      <TableCell>{formatDateTime(row.detected_at)}</TableCell>
                      <TableCell>
                        <Chip
                          size='small'
                          color={row.resolved ? 'success' : 'warning'}
                          label={
                            row.resolved
                              ? t('master.closedLoop.resolved')
                              : t('master.closedLoop.unresolved')
                          }
                        />
                      </TableCell>
                      <TableCell align='right'>
                        <Button
                          size='small'
                          disabled={row.resolved || resolveMut.isPending}
                          onClick={() => resolveMut.mutate(row.id)}
                        >
                          {t('master.closedLoop.resolve')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        align='center'
                      >
                        {t('master.closedLoop.noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Stack>
      )}

      <Dialog
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('master.closedLoop.reviewTitle')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <Typography variant='body2'>
              {reviewTarget?.domain} / {reviewTarget?.action} / {reviewTarget?.master_data_id}
            </Typography>
            <Box
              component='pre'
              sx={{ bgcolor: 'action.hover', p: 1, borderRadius: 1, fontSize: 12, m: 0 }}
            >
              {JSON.stringify(reviewTarget?.payload ?? {}, null, 2)}
            </Box>
            <TextField
              label={t('master.closedLoop.reviewComment')}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewTarget(null)}>{t('master.closedLoop.cancel')}</Button>
          <Button
            color='error'
            onClick={() => review(false)}
            disabled={reviewMut.isPending}
          >
            {t('master.closedLoop.reject')}
          </Button>
          <Button
            variant='contained'
            onClick={() => review(true)}
            disabled={reviewMut.isPending}
          >
            {t('master.closedLoop.approve')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('master.closedLoop.newApproval')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              select
              label={t('master.closedLoop.colDomain')}
              value={createForm.domain}
              onChange={(e) => setCreateForm((f) => ({ ...f, domain: e.target.value }))}
            >
              <MenuItem value='account_subject'>account_subject</MenuItem>
            </TextField>
            <TextField
              select
              label={t('master.closedLoop.colAction')}
              value={createForm.action}
              onChange={(e) => setCreateForm((f) => ({ ...f, action: e.target.value }))}
            >
              <MenuItem value='create'>{t('master.closedLoop.actionCreate')}</MenuItem>
              <MenuItem value='update'>{t('master.closedLoop.actionUpdate')}</MenuItem>
              <MenuItem value='delete'>{t('master.closedLoop.actionDelete')}</MenuItem>
            </TextField>
            <TextField
              label={t('master.closedLoop.colMasterDataId')}
              value={createForm.master_data_id}
              onChange={(e) => setCreateForm((f) => ({ ...f, master_data_id: e.target.value }))}
              helperText={t('master.closedLoop.createIdHint')}
            />
            <TextField
              label={t('master.closedLoop.payloadHint')}
              value={createForm.payload}
              onChange={(e) => setCreateForm((f) => ({ ...f, payload: e.target.value }))}
              multiline
              minRows={5}
              slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 12 } } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{t('master.closedLoop.cancel')}</Button>
          <Button
            variant='contained'
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending}
          >
            {t('master.closedLoop.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default MdmClosedLoopPage;
