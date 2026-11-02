import React, { useMemo, useState } from 'react';
import styles from './MasterDisasterRecoveryPage.module.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { LifeBuoy, History, ShieldAlert, Database } from 'lucide-react';
import {
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  useTheme,
} from '@mui/material';
import { disasterRecoveryApi } from '@/api/master/disasterRecovery';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';

interface ListLike {
  items?: unknown[];
  total?: number;
}

const MasterDisasterRecoveryPage: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pointOpen, setPointOpen] = useState(false);
  const [pointForm, setPointForm] = useState({
    snapshot_type: 'full' as 'full' | 'incremental' | 'differential',
    note: '',
  });
  const [restorePointId, setRestorePointId] = useState('');
  const [planOpen, setPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: '',
    priority: 'P1',
    snapshot_type: 'full',
    description: '',
  });
  const [continuityOpen, setContinuityOpen] = useState(false);
  const [continuityForm, setContinuityForm] = useState({
    name: '',
    critical_function: '',
    rto_minutes: 60,
    rpo_minutes: 30,
  });
  const [failoverOpen, setFailoverOpen] = useState(false);
  const [failoverForm, setFailoverForm] = useState({ from_region: '', to_region: '', reason: '' });

  const { data: statusResp } = useQuery({
    queryKey: ['master-dr-status'],
    queryFn: () => disasterRecoveryApi.getRecoveryStatus(),
  });
  const drStatus = statusResp?.data as
    { state?: string; last_recovery_at?: string; pending_jobs?: number } | undefined;

  const { data: pointsResp } = useQuery({
    queryKey: ['master-dr-points', page, pageSize],
    queryFn: () => disasterRecoveryApi.listRecoveryPoints({ page: page + 1, pageSize }),
  });
  const points = useMemo(
    () => ((pointsResp?.data as ListLike)?.items as Record<string, unknown>[] | undefined) ?? [],
    [pointsResp]
  );
  const pointsTotal = useMemo(
    () => ((pointsResp?.data as ListLike)?.total as number) ?? 0,
    [pointsResp]
  );

  const { data: planResp } = useQuery({
    queryKey: ['master-dr-plan-progress'],
    queryFn: () => disasterRecoveryApi.getPlanProgress('current'),
  });
  const planProgress = planResp?.data as
    { current_step?: number; total_steps?: number; status?: string; error?: string } | undefined;

  const { data: scoreResp } = useQuery({
    queryKey: ['master-dr-continuity-score'],
    queryFn: () => disasterRecoveryApi.getContinuityScore(),
  });
  const score = scoreResp?.data as
    | {
        score?: number;
        total_plans?: number;
        tested_plans?: number;
        coverage_percentage?: number;
        risk_level?: string;
      }
    | undefined;

  const { data: continuityResp } = useQuery({
    queryKey: ['master-dr-continuity'],
    queryFn: () => disasterRecoveryApi.listContinuityPlans(),
  });
  const continuity = useMemo(
    () =>
      ((continuityResp?.data as ListLike)?.items as Record<string, unknown>[] | undefined) ?? [],
    [continuityResp]
  );

  const { data: replResp } = useQuery({
    queryKey: ['master-dr-replication'],
    queryFn: () => disasterRecoveryApi.getReplicationStatus(),
  });
  const replication = replResp?.data as
    | { source_region?: string; target_region?: string; lag_seconds?: number; status?: string }
    | undefined;

  const { data: healthResp } = useQuery({
    queryKey: ['master-dr-region-health'],
    queryFn: () => disasterRecoveryApi.getRegionHealth(),
  });
  const regions = useMemo(
    () =>
      Array.isArray(healthResp?.data)
        ? (healthResp.data as unknown as Record<string, unknown>[])
        : [],
    [healthResp]
  );

  const { data: failoverResp } = useQuery({
    queryKey: ['master-dr-failovers'],
    queryFn: () => disasterRecoveryApi.getFailoverHistory(),
  });
  const failovers = useMemo(
    () =>
      Array.isArray(failoverResp?.data)
        ? (failoverResp.data as unknown as Record<string, unknown>[])
        : [],
    [failoverResp]
  );

  const createPoint = useMutation({
    mutationFn: () => disasterRecoveryApi.createRecoveryPoint(pointForm as never),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.disasterRecovery.k0') });
      setPointOpen(false);
      setPointForm({ snapshot_type: 'full', note: '' });
      qc.invalidateQueries({ queryKey: ['master-dr-points'] });
    },
  });
  const restore = useMutation({
    mutationFn: () => disasterRecoveryApi.restoreFromPoint({ recovery_point_id: restorePointId }),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.disasterRecovery.k1') });
      setRestorePointId('');
    },
  });
  const createPlan = useMutation({
    mutationFn: () => disasterRecoveryApi.createRecoveryPlan(planForm as never),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.disasterRecovery.k2') });
      setPlanOpen(false);
      setPlanForm({ name: '', priority: 'P1', snapshot_type: 'full', description: '' });
    },
  });
  const executePlan = useMutation({
    mutationFn: () => disasterRecoveryApi.executeRecoveryPlan(),
    onSuccess: () => addNotification({ type: 'success', message: t('master.disasterRecovery.k3') }),
  });
  const testPlan = useMutation({
    mutationFn: () => disasterRecoveryApi.testRecovery(),
    onSuccess: () => addNotification({ type: 'success', message: t('master.disasterRecovery.k4') }),
  });
  const createContinuity = useMutation({
    mutationFn: () => disasterRecoveryApi.createContinuityPlan(continuityForm as never),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.disasterRecovery.k5') });
      setContinuityOpen(false);
      setContinuityForm({ name: '', critical_function: '', rto_minutes: 60, rpo_minutes: 30 });
    },
  });
  const testContinuity = useMutation({
    mutationFn: (id: string) => disasterRecoveryApi.testContinuityPlan(id),
    onSuccess: () => addNotification({ type: 'success', message: t('master.disasterRecovery.k4') }),
  });
  const initiateFailover = useMutation({
    mutationFn: () => disasterRecoveryApi.initiateFailover(failoverForm as never),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.disasterRecovery.k6') });
      setFailoverOpen(false);
      setFailoverForm({ from_region: '', to_region: '', reason: '' });
    },
  });

  const statusChip = (status: unknown) => {
    const map: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      healthy: 'success',
      active: 'success',
      completed: 'success',
      degraded: 'warning',
      in_progress: 'warning',
      paused: 'warning',
      down: 'error',
      failed: 'error',
      standby: 'info',
    };
    return (
      <Chip
        size='small'
        label={String(status ?? '-')}
        color={map[String(status)] || 'default'}
      />
    );
  };

  const tabStyle = { textTransform: 'none', fontWeight: 600 };
  const cellStyle = {
    color: 'text.secondary',
    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
  };
  const emptyRow = (colspan: number) => (
    <TableRow>
      <TableCell
        colSpan={colspan}
        sx={{ textAlign: 'center', color: 'text.secondary' }}
      >
        {t('master.disasterRecovery.k7')}
      </TableCell>
    </TableRow>
  );

  const metric = (label: string, value: unknown, color = theme.palette.info[600]) => (
    <Card sx={{ p: 2.5, minWidth: 150, flex: 1 }}>
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {label}
      </Typography>
      <Typography
        variant='h5'
        sx={{ fontWeight: 700, color }}
      >
        {String(value ?? '-')}
      </Typography>
    </Card>
  );

  const renderPoints = () => (
    <Stack spacing={2}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ flexWrap: 'wrap' }}
      >
        {metric(t('master.disasterRecovery.k8'), drStatus?.state)}
        {metric(t('master.disasterRecovery.k9'), drStatus?.pending_jobs)}
        {metric(t('master.disasterRecovery.k10'), drStatus?.last_recovery_at)}
      </Stack>
      <Stack
        direction='row'
        spacing={2}
        sx={{ alignItems: 'center' }}
      >
        <Button
          variant='contained'
          onClick={() => setPointOpen(true)}
        >
          {t('master.disasterRecovery.k11')}
        </Button>
        <TextField
          label={t('master.disasterRecovery.k12')}
          size='small'
          value={restorePointId}
          onChange={(e) => setRestorePointId(e.target.value)}
          sx={{ width: 200 }}
        />
        <Button
          variant='outlined'
          onClick={() => restore.mutate()}
          disabled={!restorePointId}
        >
          {t('master.disasterRecovery.k13')}
        </Button>
      </Stack>
      <Card>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('master.disasterRecovery.k14')}</TableCell>
                <TableCell>{t('master.disasterRecovery.k15')}</TableCell>
                <TableCell>{t('master.disasterRecovery.k16')}</TableCell>
                <TableCell>{t('master.disasterRecovery.k17')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {points.length === 0 && emptyRow(4)}
              {points.map((p) => (
                <TableRow key={String(p.id)}>
                  <TableCell sx={cellStyle}>{String(p.created_at || '-')}</TableCell>
                  <TableCell>{String(p.snapshot_type)}</TableCell>
                  <TableCell>{String(p.size_bytes)}</TableCell>
                  <TableCell sx={cellStyle}>{String(p.created_by || '-')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component='div'
          count={pointsTotal}
          page={page}
          rowsPerPage={pageSize}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          labelRowsPerPage={t('master.disasterRecovery.k18')}
        />
      </Card>
    </Stack>
  );

  const renderPlans = () => (
    <Stack spacing={2}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ alignItems: 'center' }}
      >
        <Button
          variant='contained'
          onClick={() => setPlanOpen(true)}
        >
          {t('master.disasterRecovery.k19')}
        </Button>
        <Button
          variant='outlined'
          onClick={() => executePlan.mutate()}
        >
          {t('master.disasterRecovery.k20')}
        </Button>
        <Button
          variant='outlined'
          onClick={() => testPlan.mutate()}
        >
          {t('master.disasterRecovery.k21')}
        </Button>
      </Stack>
      <Card sx={{ p: 3 }}>
        <Typography
          variant='subtitle2'
          sx={{ mb: 1 }}
        >
          {t('master.disasterRecovery.k22')}
        </Typography>
        {planProgress ? (
          <>
            <Typography variant='body2'>
              {t('master.disasterRecovery.k23')}: {planProgress.current_step ?? 0} /{' '}
              {planProgress.total_steps ?? 0}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('master.disasterRecovery.k24')}: {planProgress.status}
            </Typography>
            {planProgress.error && (
              <Typography
                variant='body2'
                color='error.main'
              >
                {planProgress.error}
              </Typography>
            )}
          </>
        ) : (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {t('master.disasterRecovery.k7')}
          </Typography>
        )}
      </Card>
    </Stack>
  );

  const renderContinuity = () => (
    <Stack spacing={2}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ flexWrap: 'wrap' }}
      >
        {metric(t('master.disasterRecovery.k25'), score?.score)}
        {metric(
          t('master.disasterRecovery.k26'),
          score?.coverage_percentage,
          theme.palette.warning[600]
        )}
        {metric(
          t('master.disasterRecovery.k27'),
          score?.risk_level,
          score?.risk_level === 'high' ? theme.palette.error[600] : theme.palette.success[600]
        )}
      </Stack>
      <Button
        variant='contained'
        onClick={() => setContinuityOpen(true)}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('master.disasterRecovery.k28')}
      </Button>
      <Card>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('master.disasterRecovery.k29')}</TableCell>
                <TableCell>{t('master.disasterRecovery.k30')}</TableCell>
                <TableCell>{t('master.disasterRecovery.k31')}</TableCell>
                <TableCell>{t('master.disasterRecovery.k32')}</TableCell>
                <TableCell>{t('master.disasterRecovery.k33')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {continuity.length === 0 && emptyRow(5)}
              {continuity.map((c) => (
                <TableRow key={String(c.id)}>
                  <TableCell>{String(c.name)}</TableCell>
                  <TableCell sx={cellStyle}>{String(c.critical_function)}</TableCell>
                  <TableCell>
                    {String(c.rto_minutes)}/{String(c.rpo_minutes)}
                  </TableCell>
                  <TableCell>{statusChip(c.status)}</TableCell>
                  <TableCell>
                    <Button
                      size='small'
                      variant='outlined'
                      onClick={() => testContinuity.mutate(String(c.id))}
                    >
                      {t('master.disasterRecovery.k21')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );

  const renderFailover = () => (
    <Stack spacing={2}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ flexWrap: 'wrap' }}
      >
        {metric(t('master.disasterRecovery.k34'), replication?.source_region)}
        {metric(t('master.disasterRecovery.k35'), replication?.target_region)}
        {metric(t('master.disasterRecovery.k36'), replication?.status)}
      </Stack>
      <Stack
        direction='row'
        spacing={2}
        sx={{ alignItems: 'center' }}
      >
        <Button
          variant='contained'
          onClick={() => setFailoverOpen(true)}
        >
          {t('master.disasterRecovery.k37')}
        </Button>
      </Stack>
      <Card>
        <Typography
          variant='subtitle2'
          sx={{ p: 2 }}
        >
          {t('master.disasterRecovery.k38')}
        </Typography>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('master.disasterRecovery.k39')}</TableCell>
                <TableCell>{t('master.disasterRecovery.k40')}</TableCell>
                <TableCell>{t('master.disasterRecovery.k41')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {regions.length === 0 && emptyRow(3)}
              {regions.map((r) => (
                <TableRow key={String(r.region)}>
                  <TableCell>{String(r.region)}</TableCell>
                  <TableCell>{statusChip(r.status)}</TableCell>
                  <TableCell sx={cellStyle}>{String(r.latency_ms)}ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      <Card>
        <Typography
          variant='subtitle2'
          sx={{ p: 2 }}
        >
          {t('master.disasterRecovery.k42')}
        </Typography>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('master.disasterRecovery.k43')}</TableCell>
                <TableCell>{t('master.disasterRecovery.k44')}</TableCell>
                <TableCell>{t('master.disasterRecovery.k45')}</TableCell>
                <TableCell>{t('master.disasterRecovery.k46')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {failovers.length === 0 && emptyRow(4)}
              {failovers.map((f) => (
                <TableRow key={String(f.id)}>
                  <TableCell sx={cellStyle}>
                    {String(f.from_region)} → {String(f.to_region)}
                  </TableCell>
                  <TableCell>{statusChip(f.status)}</TableCell>
                  <TableCell sx={cellStyle}>{String(f.triggered_by || '-')}</TableCell>
                  <TableCell sx={cellStyle}>{String(f.started_at || '-')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <LifeBuoy sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${theme.palette.info[500]} 0%, ${theme.palette.info[600]} 100%)`,
      }}
      maxWidth='xl'
    >
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          sx={tabStyle}
          icon={<Database className={styles.il1} />}
          iconPosition='start'
          label={t('master.disasterRecovery.k47')}
        />
        <Tab
          sx={tabStyle}
          icon={<History className={styles.il2} />}
          iconPosition='start'
          label={t('master.disasterRecovery.k48')}
        />
        <Tab
          sx={tabStyle}
          icon={<ShieldAlert className={styles.il3} />}
          iconPosition='start'
          label={t('master.disasterRecovery.k49')}
        />
        <Tab
          sx={tabStyle}
          icon={<LifeBuoy className={styles.il4} />}
          iconPosition='start'
          label={t('master.disasterRecovery.k50')}
        />
      </Tabs>

      {tab === 0 && renderPoints()}
      {tab === 1 && renderPlans()}
      {tab === 2 && renderContinuity()}
      {tab === 3 && renderFailover()}

      <Dialog
        open={pointOpen}
        onClose={() => setPointOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('master.disasterRecovery.k11')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('master.disasterRecovery.k51')}
              size='small'
              value={pointForm.note}
              onChange={(e) => setPointForm({ ...pointForm, note: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPointOpen(false)}>{t('master.disasterRecovery.k52')}</Button>
          <Button
            variant='contained'
            onClick={() => createPoint.mutate()}
          >
            {t('master.disasterRecovery.k53')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('master.disasterRecovery.k19')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('master.disasterRecovery.k54')}
              size='small'
              value={planForm.name}
              onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
            />
            <TextField
              label={t('master.disasterRecovery.k55')}
              size='small'
              value={planForm.priority}
              onChange={(e) => setPlanForm({ ...planForm, priority: e.target.value })}
            />
            <TextField
              label={t('master.disasterRecovery.k56')}
              size='small'
              value={planForm.description}
              onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanOpen(false)}>{t('master.disasterRecovery.k52')}</Button>
          <Button
            variant='contained'
            onClick={() => createPlan.mutate()}
          >
            {t('master.disasterRecovery.k53')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={continuityOpen}
        onClose={() => setContinuityOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('master.disasterRecovery.k28')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('master.disasterRecovery.k54')}
              size='small'
              value={continuityForm.name}
              onChange={(e) => setContinuityForm({ ...continuityForm, name: e.target.value })}
            />
            <TextField
              label={t('master.disasterRecovery.k30')}
              size='small'
              value={continuityForm.critical_function}
              onChange={(e) =>
                setContinuityForm({ ...continuityForm, critical_function: e.target.value })
              }
            />
            <TextField
              label={t('master.disasterRecovery.k57')}
              size='small'
              type='number'
              value={continuityForm.rto_minutes}
              onChange={(e) =>
                setContinuityForm({ ...continuityForm, rto_minutes: Number(e.target.value) })
              }
            />
            <TextField
              label={t('master.disasterRecovery.k58')}
              size='small'
              type='number'
              value={continuityForm.rpo_minutes}
              onChange={(e) =>
                setContinuityForm({ ...continuityForm, rpo_minutes: Number(e.target.value) })
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContinuityOpen(false)}>
            {t('master.disasterRecovery.k52')}
          </Button>
          <Button
            variant='contained'
            onClick={() => createContinuity.mutate()}
          >
            {t('master.disasterRecovery.k53')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={failoverOpen}
        onClose={() => setFailoverOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('master.disasterRecovery.k37')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('master.disasterRecovery.k43')}
              size='small'
              value={failoverForm.from_region}
              onChange={(e) => setFailoverForm({ ...failoverForm, from_region: e.target.value })}
            />
            <TextField
              label={t('master.disasterRecovery.k44')}
              size='small'
              value={failoverForm.to_region}
              onChange={(e) => setFailoverForm({ ...failoverForm, to_region: e.target.value })}
            />
            <TextField
              label={t('master.disasterRecovery.k59')}
              size='small'
              value={failoverForm.reason}
              onChange={(e) => setFailoverForm({ ...failoverForm, reason: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFailoverOpen(false)}>{t('master.disasterRecovery.k52')}</Button>
          <Button
            variant='contained'
            onClick={() => initiateFailover.mutate()}
          >
            {t('master.disasterRecovery.k53')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default MasterDisasterRecoveryPage;
