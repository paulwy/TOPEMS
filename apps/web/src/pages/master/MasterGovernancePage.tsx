import React, { useMemo, useState } from 'react';
import styles from './MasterGovernancePage.module.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Gauge, ListChecks, Workflow, Boxes } from 'lucide-react';
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
  TableRow,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { governanceApi } from '@/api/master/governance';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';

const MasterGovernancePage: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [tab, setTab] = useState(0);
  const [planOpen, setPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    title: '',
    dimension: '',
    target_score: 80,
    current_score: 50,
    status: 'draft' as 'draft' | 'in_progress' | 'completed' | 'cancelled',
  });
  const [productOpen, setProductOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    owner: '',
    domain: '',
    status: 'proposed' as 'proposed' | 'active' | 'deprecated' | 'retired',
  });
  const [workflowId, setWorkflowId] = useState('');

  const { data: dimResp } = useQuery({
    queryKey: ['master-gov-dimensions'],
    queryFn: () => governanceApi.getDimensionScores(),
  });
  const dims = useMemo(
    () =>
      Array.isArray(dimResp?.data) ? (dimResp.data as unknown as Record<string, unknown>[]) : [],
    [dimResp]
  );

  const { data: historyResp } = useQuery({
    queryKey: ['master-gov-history'],
    queryFn: () => governanceApi.getMaturityHistory({ limit: 10 }),
  });
  const history = useMemo(
    () =>
      Array.isArray(historyResp?.data)
        ? (historyResp.data as unknown as Record<string, unknown>[])
        : [],
    [historyResp]
  );

  const { data: progressResp } = useQuery({
    queryKey: ['master-gov-progress'],
    queryFn: () => governanceApi.trackProgress(),
  });

  const { data: wfResp } = useQuery({
    queryKey: ['master-gov-workflows'],
    queryFn: () => governanceApi.listWorkflows(),
  });
  const workflows = useMemo(
    () =>
      Array.isArray(wfResp?.data) ? (wfResp.data as unknown as Record<string, unknown>[]) : [],
    [wfResp]
  );

  const { data: prodResp } = useQuery({
    queryKey: ['master-gov-products'],
    queryFn: () => governanceApi.listDataProducts(),
  });
  const products = useMemo(
    () =>
      Array.isArray(prodResp?.data) ? (prodResp.data as unknown as Record<string, unknown>[]) : [],
    [prodResp]
  );

  const assess = useMutation({
    mutationFn: () => governanceApi.assessMaturity(),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.governance.k0') });
      qc.invalidateQueries({ queryKey: ['master-gov-dimensions'] });
    },
  });

  const createPlan = useMutation({
    mutationFn: () => governanceApi.createImprovementPlan(planForm as never),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.governance.k1') });
      setPlanOpen(false);
      setPlanForm({
        title: '',
        dimension: '',
        target_score: 80,
        current_score: 50,
        status: 'draft',
      });
    },
  });

  const startWf = useMutation({
    mutationFn: (id: string) => governanceApi.startWorkflow(id),
    onSuccess: () => addNotification({ type: 'success', message: t('master.governance.k2') }),
  });

  const approveStep = useMutation({
    mutationFn: () => governanceApi.approveStep(workflowId),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.governance.k3') });
      setWorkflowId('');
    },
  });

  const createProduct = useMutation({
    mutationFn: () => governanceApi.createDataProduct(productForm as never),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.governance.k4') });
      setProductOpen(false);
      setProductForm({ name: '', owner: '', domain: '', status: 'proposed' });
    },
  });

  const statusChip = (status: unknown) => {
    const colorMap: Record<string, 'success' | 'warning' | 'info' | 'default' | 'error'> = {
      active: 'success',
      in_progress: 'warning',
      proposed: 'info',
      draft: 'default',
      completed: 'success',
      paused: 'warning',
      deprecated: 'default',
      retired: 'default',
    };
    return (
      <Chip
        size='small'
        label={String(status || '-')}
        color={colorMap[String(status)] || 'default'}
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
        {t('master.governance.k5')}
      </TableCell>
    </TableRow>
  );

  const renderMaturity = () => (
    <Stack spacing={2}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ alignItems: 'center' }}
      >
        <Button
          variant='contained'
          onClick={() => assess.mutate()}
        >
          {t('master.governance.k6')}
        </Button>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {t('master.governance.k7')}
        </Typography>
      </Stack>
      <Card>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('master.governance.k8')}</TableCell>
                <TableCell>{t('master.governance.k9')}</TableCell>
                <TableCell>{t('master.governance.k10')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dims.length === 0 && emptyRow(3)}
              {dims.map((d, i) => (
                <TableRow key={i}>
                  <TableCell>{String(d.name ?? d.dimension ?? d.key ?? '-')}</TableCell>
                  <TableCell>{String(d.score ?? 0)}</TableCell>
                  <TableCell>{String(d.weight ?? 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      <Card sx={{ p: 2 }}>
        <Typography
          variant='subtitle2'
          sx={{ mb: 1 }}
        >
          {t('master.governance.k11')}
        </Typography>
        {history.length === 0 && (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {t('master.governance.k5')}
          </Typography>
        )}
        {history.map((h, i) => (
          <Typography
            key={i}
            variant='body2'
            sx={cellStyle}
          >
            {String(h.assessed_at || '-')} · {String(h.level)} · {String(h.overall_score)}
          </Typography>
        ))}
      </Card>
    </Stack>
  );

  const renderPlan = () => {
    const p = progressResp?.data as
      | {
          current_score?: number;
          target_score?: number;
          progress_percentage?: number;
          milestones?: Array<{ date: string; score: number }>;
        }
      | undefined;
    return (
      <Stack spacing={2}>
        <Button
          variant='contained'
          onClick={() => setPlanOpen(true)}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('master.governance.k12')}
        </Button>
        <Card sx={{ p: 3 }}>
          <Stack spacing={1}>
            <Typography variant='subtitle2'>{t('master.governance.k13')}</Typography>
            {p ? (
              <>
                <Typography variant='body2'>
                  {t('master.governance.k14')}: {p.current_score ?? '-'} / {p.target_score ?? '-'}（
                  {p.progress_percentage ?? 0}%）
                </Typography>
                {Array.isArray(p.milestones) && p.milestones.length > 0 && (
                  <Box>
                    {p.milestones.map((m, i) => (
                      <Typography
                        key={i}
                        variant='body2'
                        sx={cellStyle}
                      >
                        {m.date}: {m.score}
                      </Typography>
                    ))}
                  </Box>
                )}
              </>
            ) : (
              <Typography
                variant='body2'
                color='text.secondary'
              >
                {t('master.governance.k5')}
              </Typography>
            )}
          </Stack>
        </Card>
      </Stack>
    );
  };

  const renderWorkflow = () => (
    <Card>
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>{t('master.governance.k15')}</TableCell>
              <TableCell>{t('master.governance.k16')}</TableCell>
              <TableCell>{t('master.governance.k17')}</TableCell>
              <TableCell>{t('master.governance.k18')}</TableCell>
              <TableCell>{t('master.governance.k19')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workflows.length === 0 && emptyRow(5)}
            {workflows.map((w) => (
              <TableRow key={String(w.id)}>
                <TableCell>{String(w.name)}</TableCell>
                <TableCell sx={cellStyle}>{String(w.description || '-')}</TableCell>
                <TableCell>{statusChip(w.status)}</TableCell>
                <TableCell sx={cellStyle}>{String(w.created_at || '-')}</TableCell>
                <TableCell>
                  <Stack
                    direction='row'
                    spacing={1}
                  >
                    <Button
                      size='small'
                      variant='outlined'
                      onClick={() => startWf.mutate(String(w.id))}
                    >
                      {t('master.governance.k20')}
                    </Button>
                    <Button
                      size='small'
                      onClick={() => {
                        setWorkflowId(String(w.id));
                        approveStep.mutate();
                      }}
                    >
                      {t('master.governance.k21')}
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );

  const renderProducts = () => (
    <Stack spacing={2}>
      <Button
        variant='contained'
        onClick={() => setProductOpen(true)}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('master.governance.k22')}
      </Button>
      <Card>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('master.governance.k23')}</TableCell>
                <TableCell>{t('master.governance.k24')}</TableCell>
                <TableCell>{t('master.governance.k25')}</TableCell>
                <TableCell>{t('master.governance.k26')}</TableCell>
                <TableCell>{t('master.governance.k27')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.length === 0 && emptyRow(5)}
              {products.map((pr) => (
                <TableRow key={String(pr.id)}>
                  <TableCell>{String(pr.name)}</TableCell>
                  <TableCell>{String(pr.owner)}</TableCell>
                  <TableCell sx={cellStyle}>{String(pr.domain)}</TableCell>
                  <TableCell>{statusChip(pr.status)}</TableCell>
                  <TableCell sx={cellStyle}>{String(pr.updated_at || '-')}</TableCell>
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
        pageIcon: <Gauge sx={{ width: 20, height: 20 }} />,
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
          icon={<Gauge className={styles.il1} />}
          iconPosition='start'
          label={t('master.governance.k28')}
        />
        <Tab
          sx={tabStyle}
          icon={<ListChecks className={styles.il2} />}
          iconPosition='start'
          label={t('master.governance.k29')}
        />
        <Tab
          sx={tabStyle}
          icon={<Workflow className={styles.il3} />}
          iconPosition='start'
          label={t('master.governance.k30')}
        />
        <Tab
          sx={tabStyle}
          icon={<Boxes className={styles.il4} />}
          iconPosition='start'
          label={t('master.governance.k31')}
        />
      </Tabs>

      {tab === 0 && renderMaturity()}
      {tab === 1 && renderPlan()}
      {tab === 2 && renderWorkflow()}
      {tab === 3 && renderProducts()}

      <Dialog
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('master.governance.k12')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('master.governance.k32')}
              size='small'
              value={planForm.title}
              onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
            />
            <TextField
              label={t('master.governance.k33')}
              size='small'
              value={planForm.dimension}
              onChange={(e) => setPlanForm({ ...planForm, dimension: e.target.value })}
            />
            <TextField
              label={t('master.governance.k34')}
              size='small'
              type='number'
              value={planForm.target_score}
              onChange={(e) => setPlanForm({ ...planForm, target_score: Number(e.target.value) })}
            />
            <TextField
              label={t('master.governance.k35')}
              size='small'
              type='number'
              value={planForm.current_score}
              onChange={(e) => setPlanForm({ ...planForm, current_score: Number(e.target.value) })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanOpen(false)}>{t('master.governance.k36')}</Button>
          <Button
            variant='contained'
            onClick={() => createPlan.mutate()}
          >
            {t('master.governance.k37')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={productOpen}
        onClose={() => setProductOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('master.governance.k22')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('master.governance.k23')}
              size='small'
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
            />
            <TextField
              label={t('master.governance.k24')}
              size='small'
              value={productForm.owner}
              onChange={(e) => setProductForm({ ...productForm, owner: e.target.value })}
            />
            <TextField
              label={t('master.governance.k25')}
              size='small'
              value={productForm.domain}
              onChange={(e) => setProductForm({ ...productForm, domain: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProductOpen(false)}>{t('master.governance.k36')}</Button>
          <Button
            variant='contained'
            onClick={() => createProduct.mutate()}
          >
            {t('master.governance.k37')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default MasterGovernancePage;
