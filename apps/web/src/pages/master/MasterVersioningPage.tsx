import React, { useMemo, useState } from 'react';
import styles from './MasterVersioningPage.module.css';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { GitBranch, History, ShieldCheck, ClipboardList, KeyRound } from 'lucide-react';
import {
  Box,
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
  Select,
  MenuItem,
  useTheme,
} from '@mui/material';
import { versioningApi } from '@/api/master/versioning';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';

interface ListLike {
  items?: unknown[];
  total?: number;
}

const emptyEntity = { entity_type: 'mdm_material', entity_id: 'MAT-001' };

const MasterVersioningPage: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [tab, setTab] = useState(0);
  const [entity, setEntity] = useState(emptyEntity);
  const [query, setQuery] = useState(emptyEntity);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [auditPage, setAuditPage] = useState(0);

  // 快照 Dialog
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [snapshotForm, setSnapshotForm] = useState({
    entity_type: '',
    entity_id: '',
    snapshot_type: 'full' as 'full' | 'incremental' | 'differential',
    note: '',
  });
  // 分支 Dialog
  const [branchOpen, setBranchOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({
    name: '',
    entity_type: '',
    entity_id: '',
    source_version: '',
  });
  // 合并 Dialog
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeForm, setMergeForm] = useState({
    branch_id: '',
    target_version: '',
    strategy: 'auto' as 'auto' | 'manual' | 'ours' | 'theirs',
  });

  const { data: historyResp, isLoading: historyLoading } = useQuery({
    queryKey: ['master-version-history', query, page, pageSize],
    queryFn: () =>
      versioningApi.listHistory(query.entity_type, query.entity_id, {
        page: page + 1,
        pageSize,
      }),
    enabled: Boolean(query.entity_type && query.entity_id),
  });
  const history = useMemo(
    () => ((historyResp?.data as ListLike)?.items as Record<string, unknown>[] | undefined) ?? [],
    [historyResp]
  );
  const historyTotal = useMemo(
    () => ((historyResp?.data as ListLike)?.total as number) ?? 0,
    [historyResp]
  );

  const { data: auditResp } = useQuery({
    queryKey: ['master-audit-log', auditPage, pageSize],
    queryFn: () => versioningApi.queryAuditLog({ page: auditPage + 1, pageSize }),
  });
  const auditRows = useMemo(
    () => ((auditResp?.data as ListLike)?.items as Record<string, unknown>[] | undefined) ?? [],
    [auditResp]
  );
  const auditTotal = useMemo(
    () => ((auditResp?.data as ListLike)?.total as number) ?? 0,
    [auditResp]
  );

  const { data: permResp } = useQuery({
    queryKey: ['master-permissions'],
    queryFn: () => versioningApi.getResourcePermissions(),
  });
  const permRows = useMemo(
    () =>
      Array.isArray(permResp?.data) ? (permResp.data as unknown as Record<string, unknown>[]) : [],
    [permResp]
  );

  const { data: complianceResp } = useQuery({
    queryKey: ['master-compliance-audit', query],
    queryFn: () => versioningApi.getComplianceAudit(query.entity_type, query.entity_id),
    enabled: Boolean(query.entity_type && query.entity_id),
  });

  const createSnapshot = useMutation({
    mutationFn: () =>
      versioningApi.createSnapshot({
        entity_type: snapshotForm.entity_type || query.entity_type,
        entity_id: snapshotForm.entity_id || query.entity_id,
        snapshot_type: snapshotForm.snapshot_type,
        note: snapshotForm.note || undefined,
      }),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.versioning.k0') });
      setSnapshotOpen(false);
      setSnapshotForm({ entity_type: '', entity_id: '', snapshot_type: 'full', note: '' });
    },
  });

  const createBranch = useMutation({
    mutationFn: () => versioningApi.createBranch(branchForm),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.versioning.k1') });
      setBranchOpen(false);
      setBranchForm({ name: '', entity_type: '', entity_id: '', source_version: '' });
    },
  });

  const mergeBranch = useMutation({
    mutationFn: () => versioningApi.mergeBranch(mergeForm),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.versioning.k2') });
      setMergeOpen(false);
      setMergeForm({ branch_id: '', target_version: '', strategy: 'auto' });
    },
  });

  const actionLabel = (action: unknown) => {
    const map: Record<string, string> = {
      create: t('master.versioning.k3'),
      update: t('master.versioning.k4'),
      restore: t('master.versioning.k5'),
      merge: t('master.versioning.k6'),
    };
    return map[String(action)] || String(action || '-');
  };

  const tabStyle = { textTransform: 'none', fontWeight: 600 };
  const cellStyle = {
    color: 'text.secondary',
    fontSize: designTokens.typography.fontSize.scale['0.875rem'],
  };

  const renderHistory = () => (
    <>
      <Stack
        direction='row'
        spacing={2}
        sx={{ mb: 2, alignItems: 'center' }}
      >
        <TextField
          label={t('master.versioning.k7')}
          size='small'
          value={entity.entity_type}
          onChange={(e) => setEntity({ ...entity, entity_type: e.target.value })}
          sx={{ width: 180 }}
        />
        <TextField
          label={t('master.versioning.k8')}
          size='small'
          value={entity.entity_id}
          onChange={(e) => setEntity({ ...entity, entity_id: e.target.value })}
          sx={{ width: 180 }}
        />
        <Button
          variant='contained'
          onClick={() => {
            setQuery(entity);
            setPage(0);
          }}
        >
          {t('master.versioning.k9')}
        </Button>
        <Button
          variant='outlined'
          onClick={() => setSnapshotOpen(true)}
        >
          {t('master.versioning.k10')}
        </Button>
      </Stack>
      <Card>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('master.versioning.k11')}</TableCell>
                <TableCell>{t('master.versioning.k12')}</TableCell>
                <TableCell>{t('master.versioning.k13')}</TableCell>
                <TableCell>{t('master.versioning.k14')}</TableCell>
                <TableCell>{t('master.versioning.k15')}</TableCell>
                <TableCell>{t('master.versioning.k16')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historyLoading && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    sx={{ textAlign: 'center' }}
                  >
                    {t('master.versioning.k17')}
                  </TableCell>
                </TableRow>
              )}
              {!historyLoading && history.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    sx={{ textAlign: 'center', color: 'text.secondary' }}
                  >
                    {t('master.versioning.k18')}
                  </TableCell>
                </TableRow>
              )}
              {history.map((r) => (
                <TableRow key={String(r.id)}>
                  <TableCell>{String(r.version)}</TableCell>
                  <TableCell sx={cellStyle}>{String(r.entity_type)}</TableCell>
                  <TableCell>
                    <Chip
                      size='small'
                      label={actionLabel(r.action)}
                    />
                  </TableCell>
                  <TableCell>{String(r.changed_by)}</TableCell>
                  <TableCell sx={cellStyle}>{String(r.changed_at || '-')}</TableCell>
                  <TableCell sx={cellStyle}>{String(r.summary || '-')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component='div'
          count={historyTotal}
          page={page}
          rowsPerPage={pageSize}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          labelRowsPerPage={t('master.versioning.k19')}
        />
      </Card>
    </>
  );

  const renderBranch = () => (
    <Stack spacing={2}>
      <Stack
        direction='row'
        spacing={2}
      >
        <Button
          variant='contained'
          onClick={() => setBranchOpen(true)}
        >
          {t('master.versioning.k20')}
        </Button>
        <Button
          variant='outlined'
          onClick={() => setMergeOpen(true)}
        >
          {t('master.versioning.k21')}
        </Button>
      </Stack>
      <Card sx={{ p: 3 }}>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {t('master.versioning.k22')}
        </Typography>
      </Card>
    </Stack>
  );

  const renderAudit = () => (
    <Card>
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>{t('master.versioning.k23')}</TableCell>
              <TableCell>{t('master.versioning.k24')}</TableCell>
              <TableCell>{t('master.versioning.k25')}</TableCell>
              <TableCell>{t('master.versioning.k26')}</TableCell>
              <TableCell>{t('master.versioning.k27')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {auditRows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  sx={{ textAlign: 'center', color: 'text.secondary' }}
                >
                  {t('master.versioning.k18')}
                </TableCell>
              </TableRow>
            )}
            {auditRows.map((r) => (
              <TableRow key={String(r.id)}>
                <TableCell sx={cellStyle}>{String(r.timestamp || '-')}</TableCell>
                <TableCell>{String(r.user_id)}</TableCell>
                <TableCell>{String(r.action)}</TableCell>
                <TableCell sx={cellStyle}>{String(r.resource_type)}</TableCell>
                <TableCell sx={cellStyle}>{String(r.resource_id || '-')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component='div'
        count={auditTotal}
        page={auditPage}
        rowsPerPage={pageSize}
        onPageChange={(_, p) => setAuditPage(p)}
        onRowsPerPageChange={(e) => {
          setPageSize(Number(e.target.value));
          setAuditPage(0);
        }}
        labelRowsPerPage={t('master.versioning.k19')}
      />
    </Card>
  );

  const renderPermissions = () => (
    <Card>
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>{t('master.versioning.k24')}</TableCell>
              <TableCell>{t('master.versioning.k26')}</TableCell>
              <TableCell>{t('master.versioning.k28')}</TableCell>
              <TableCell>{t('master.versioning.k29')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {permRows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  sx={{ textAlign: 'center', color: 'text.secondary' }}
                >
                  {t('master.versioning.k18')}
                </TableCell>
              </TableRow>
            )}
            {permRows.map((r) => (
              <TableRow key={String(r.id)}>
                <TableCell>{String(r.user_id)}</TableCell>
                <TableCell sx={cellStyle}>{String(r.resource_type)}</TableCell>
                <TableCell>
                  <Chip
                    size='small'
                    label={String(r.action)}
                  />
                </TableCell>
                <TableCell sx={cellStyle}>{String(r.granted_at || '-')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );

  const renderCompliance = () => {
    const c = complianceResp?.data as
      | {
          compliance_status?: string;
          total_changes?: number;
          retained_days?: number;
          violations?: Array<{ type: string; detail: string; severity: string }>;
        }
      | undefined;
    const statusColor: Record<string, string> = {
      compliant: 'success',
      warning: 'warning',
      non_compliant: 'error',
    };
    return (
      <Card sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {t('master.versioning.k30')}（{query.entity_type} / {query.entity_id}）
          </Typography>
          {c ? (
            <>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('master.versioning.k31')}: {c.total_changes ?? 0}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {t('master.versioning.k32')}: {c.retained_days ?? 0}
                </Typography>
                <Chip
                  size='small'
                  label={String(c.compliance_status || '-')}
                  color={
                    (statusColor[String(c.compliance_status)] as 'success' | 'warning' | 'error') ||
                    'default'
                  }
                />
              </Box>
              <Box>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mb: 1 }}
                >
                  {t('master.versioning.k33')}
                </Typography>
                {Array.isArray(c.violations) && c.violations.length === 0 && (
                  <Typography
                    variant='body2'
                    color='success.main'
                  >
                    {t('master.versioning.k34')}
                  </Typography>
                )}
                {Array.isArray(c.violations) &&
                  c.violations.map((v, i) => (
                    <Box
                      key={i}
                      sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}
                    >
                      <Chip
                        size='small'
                        label={v.severity}
                        color={
                          v.severity === 'high'
                            ? 'error'
                            : v.severity === 'medium'
                              ? 'warning'
                              : 'info'
                        }
                      />
                      <Typography variant='body2'>
                        {v.type}: {v.detail}
                      </Typography>
                    </Box>
                  ))}
              </Box>
            </>
          ) : (
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('master.versioning.k35')}
            </Typography>
          )}
        </Stack>
      </Card>
    );
  };

  return (
    <PageContainer
      headerProps={{
        pageIcon: <History sx={{ width: 20, height: 20 }} />,
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
          icon={<History className={styles.il1} />}
          iconPosition='start'
          label={t('master.versioning.k36')}
        />
        <Tab
          sx={tabStyle}
          icon={<GitBranch className={styles.il2} />}
          iconPosition='start'
          label={t('master.versioning.k37')}
        />
        <Tab
          sx={tabStyle}
          icon={<ClipboardList className={styles.il3} />}
          iconPosition='start'
          label={t('master.versioning.k38')}
        />
        <Tab
          sx={tabStyle}
          icon={<KeyRound className={styles.il4} />}
          iconPosition='start'
          label={t('master.versioning.k39')}
        />
        <Tab
          sx={tabStyle}
          icon={<ShieldCheck className={styles.il5} />}
          iconPosition='start'
          label={t('master.versioning.k40')}
        />
      </Tabs>

      {tab === 0 && renderHistory()}
      {tab === 1 && renderBranch()}
      {tab === 2 && renderAudit()}
      {tab === 3 && renderPermissions()}
      {tab === 4 && renderCompliance()}

      {/* 创建快照 */}
      <Dialog
        open={snapshotOpen}
        onClose={() => setSnapshotOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('master.versioning.k10')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('master.versioning.k7')}
              size='small'
              value={snapshotForm.entity_type}
              placeholder={query.entity_type}
              onChange={(e) => setSnapshotForm({ ...snapshotForm, entity_type: e.target.value })}
            />
            <TextField
              label={t('master.versioning.k8')}
              size='small'
              value={snapshotForm.entity_id}
              placeholder={query.entity_id}
              onChange={(e) => setSnapshotForm({ ...snapshotForm, entity_id: e.target.value })}
            />
            <Select
              size='small'
              value={snapshotForm.snapshot_type}
              onChange={(e) =>
                setSnapshotForm({
                  ...snapshotForm,
                  snapshot_type: e.target.value as 'full' | 'incremental' | 'differential',
                })
              }
            >
              <MenuItem value='full'>{t('master.versioning.k41')}</MenuItem>
              <MenuItem value='incremental'>{t('master.versioning.k42')}</MenuItem>
              <MenuItem value='differential'>{t('master.versioning.k43')}</MenuItem>
            </Select>
            <TextField
              label={t('master.versioning.k44')}
              size='small'
              multiline
              rows={2}
              value={snapshotForm.note}
              onChange={(e) => setSnapshotForm({ ...snapshotForm, note: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSnapshotOpen(false)}>{t('master.versioning.k45')}</Button>
          <Button
            variant='contained'
            onClick={() => createSnapshot.mutate()}
          >
            {t('master.versioning.k46')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 创建分支 */}
      <Dialog
        open={branchOpen}
        onClose={() => setBranchOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('master.versioning.k20')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('master.versioning.k47')}
              size='small'
              value={branchForm.name}
              onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
            />
            <TextField
              label={t('master.versioning.k7')}
              size='small'
              value={branchForm.entity_type}
              onChange={(e) => setBranchForm({ ...branchForm, entity_type: e.target.value })}
            />
            <TextField
              label={t('master.versioning.k8')}
              size='small'
              value={branchForm.entity_id}
              onChange={(e) => setBranchForm({ ...branchForm, entity_id: e.target.value })}
            />
            <TextField
              label={t('master.versioning.k48')}
              size='small'
              value={branchForm.source_version}
              onChange={(e) => setBranchForm({ ...branchForm, source_version: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBranchOpen(false)}>{t('master.versioning.k45')}</Button>
          <Button
            variant='contained'
            onClick={() => createBranch.mutate()}
          >
            {t('master.versioning.k46')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 合并分支 */}
      <Dialog
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('master.versioning.k21')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('master.versioning.k49')}
              size='small'
              value={mergeForm.branch_id}
              onChange={(e) => setMergeForm({ ...mergeForm, branch_id: e.target.value })}
            />
            <TextField
              label={t('master.versioning.k48')}
              size='small'
              value={mergeForm.target_version}
              onChange={(e) => setMergeForm({ ...mergeForm, target_version: e.target.value })}
            />
            <Select
              size='small'
              value={mergeForm.strategy}
              onChange={(e) =>
                setMergeForm({
                  ...mergeForm,
                  strategy: e.target.value as 'auto' | 'manual' | 'ours' | 'theirs',
                })
              }
            >
              <MenuItem value='auto'>{t('master.versioning.k50')}</MenuItem>
              <MenuItem value='manual'>{t('master.versioning.k51')}</MenuItem>
              <MenuItem value='ours'>{t('master.versioning.k52')}</MenuItem>
              <MenuItem value='theirs'>{t('master.versioning.k53')}</MenuItem>
            </Select>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeOpen(false)}>{t('master.versioning.k45')}</Button>
          <Button
            variant='contained'
            onClick={() => mergeBranch.mutate()}
          >
            {t('master.versioning.k46')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default MasterVersioningPage;
