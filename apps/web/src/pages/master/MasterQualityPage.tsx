import React, { useMemo, useState } from 'react';
import styles from './MasterQualityPage.module.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Gauge, ShieldCheck, ListChecks, Sparkles } from 'lucide-react';
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
  TableRow,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { qualityApi } from '@/api/master/quality';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { designTokens } from '@/theme/tokens';

const MasterQualityPage: React.FC = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [tab, setTab] = useState(0);
  const [checkOpen, setCheckOpen] = useState(false);
  const [checkForm, setCheckForm] = useState({ entity_type: '', entity_id: '', rule_id: '' });
  const [ruleOpen, setRuleOpen] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    entity_type: '',
    rule_type: 'uniqueness',
    severity: 'medium',
    enabled: true,
  });

  const { data: dashResp } = useQuery({
    queryKey: ['master-quality-dashboard'],
    queryFn: () => qualityApi.getDashboard(),
  });
  const dash = dashResp?.data as
    | {
        total_entities?: number;
        passed_checks?: number;
        failed_checks?: number;
        warning_checks?: number;
        pass_rate?: number;
        checks_by_entity_type?: Array<{
          entity_type: string;
          total: number;
          passed: number;
          failed: number;
        }>;
      }
    | undefined;

  const { data: scoreResp } = useQuery({
    queryKey: ['master-quality-score'],
    queryFn: () => qualityApi.getScore(),
  });
  const score = scoreResp?.data as
    | {
        overall_score?: number;
        total_checks?: number;
        passed_checks?: number;
        failed_checks?: number;
      }
    | undefined;

  const { data: checksResp } = useQuery({
    queryKey: ['master-quality-checks'],
    queryFn: () => qualityApi.listChecks(),
  });
  const checks = useMemo(
    () =>
      Array.isArray(checksResp?.data)
        ? (checksResp.data as unknown as Record<string, unknown>[])
        : [],
    [checksResp]
  );

  const { data: rulesResp } = useQuery({
    queryKey: ['master-quality-rules'],
    queryFn: () => qualityApi.listRules(),
  });
  const rules = useMemo(
    () =>
      Array.isArray(rulesResp?.data)
        ? (rulesResp.data as unknown as Record<string, unknown>[])
        : [],
    [rulesResp]
  );

  const { data: suggResp } = useQuery({
    queryKey: ['master-quality-suggestions'],
    queryFn: () => qualityApi.getSuggestions(),
  });
  const suggestions = useMemo(
    () =>
      Array.isArray(suggResp?.data) ? (suggResp.data as unknown as Record<string, unknown>[]) : [],
    [suggResp]
  );

  const { data: fixResp } = useQuery({
    queryKey: ['master-quality-fix-history'],
    queryFn: () => qualityApi.getFixHistory(),
  });
  const fixHistory = useMemo(
    () =>
      Array.isArray(fixResp?.data) ? (fixResp.data as unknown as Record<string, unknown>[]) : [],
    [fixResp]
  );

  const runCheck = useMutation({
    mutationFn: () => qualityApi.runCheck(checkForm as never),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.quality.k0') });
      setCheckOpen(false);
      setCheckForm({ entity_type: '', entity_id: '', rule_id: '' });
      qc.invalidateQueries({ queryKey: ['master-quality-checks'] });
    },
  });

  const createRule = useMutation({
    mutationFn: () => qualityApi.createRule(ruleForm as never),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.quality.k1') });
      setRuleOpen(false);
      setRuleForm({
        name: '',
        entity_type: '',
        rule_type: 'uniqueness',
        severity: 'medium',
        enabled: true,
      });
    },
  });

  const deleteRule = useMutation({
    mutationFn: (id: string) => qualityApi.deleteRule(id),
    onSuccess: () => {
      addNotification({ type: 'success', message: t('master.quality.k2') });
      qc.invalidateQueries({ queryKey: ['master-quality-rules'] });
    },
  });

  const approveSugg = useMutation({
    mutationFn: (id: string) => qualityApi.approveSuggestion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-quality-suggestions'] }),
  });
  const rejectSugg = useMutation({
    mutationFn: (id: string) => qualityApi.rejectSuggestion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['master-quality-suggestions'] }),
  });

  const statusChip = (status: unknown) => {
    const map: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
      passed: 'success',
      failed: 'error',
      warning: 'warning',
      pending: 'warning',
      approved: 'success',
      rejected: 'error',
      applied: 'success',
      verified: 'info',
      active: 'success',
      true: 'success',
      false: 'default',
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
        {t('master.quality.k3')}
      </TableCell>
    </TableRow>
  );

  const metric = (label: string, value: unknown, color: string) => (
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

  const renderDashboard = () => (
    <Stack spacing={2}>
      <Stack
        direction='row'
        spacing={2}
        sx={{ flexWrap: 'wrap' }}
      >
        {metric(t('master.quality.k4'), dash?.total_entities, theme.palette.info[600])}
        {metric(t('master.quality.k5'), dash?.passed_checks, theme.palette.success[600])}
        {metric(t('master.quality.k6'), dash?.failed_checks, theme.palette.error[600])}
        {metric(t('master.quality.k7'), `${dash?.pass_rate ?? '-'}%`, theme.palette.warning[600])}
      </Stack>
      <Card sx={{ p: 3 }}>
        <Typography
          variant='subtitle2'
          sx={{ mb: 1 }}
        >
          {t('master.quality.k8')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {t('master.quality.k9')}: {score?.overall_score ?? '-'} / {t('master.quality.k10')}:{' '}
          {score?.total_checks ?? '-'}（{t('master.quality.k5')} {score?.passed_checks ?? 0} /{' '}
          {t('master.quality.k6')} {score?.failed_checks ?? 0}）
        </Typography>
      </Card>
      {Array.isArray(dash?.checks_by_entity_type) && dash.checks_by_entity_type.length > 0 && (
        <Card>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>{t('master.quality.k11')}</TableCell>
                  <TableCell>{t('master.quality.k12')}</TableCell>
                  <TableCell>{t('master.quality.k5')}</TableCell>
                  <TableCell>{t('master.quality.k6')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dash.checks_by_entity_type.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>{c.entity_type}</TableCell>
                    <TableCell>{c.total}</TableCell>
                    <TableCell>{c.passed}</TableCell>
                    <TableCell>{c.failed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Stack>
  );

  const renderChecks = () => (
    <Stack spacing={2}>
      <Button
        variant='contained'
        onClick={() => setCheckOpen(true)}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('master.quality.k13')}
      </Button>
      <Card>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('master.quality.k14')}</TableCell>
                <TableCell>{t('master.quality.k15')}</TableCell>
                <TableCell>{t('master.quality.k16')}</TableCell>
                <TableCell>{t('master.quality.k17')}</TableCell>
                <TableCell>{t('master.quality.k18')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {checks.length === 0 && emptyRow(5)}
              {checks.map((c) => (
                <TableRow key={String(c.id)}>
                  <TableCell>{String(c.entity_type)}</TableCell>
                  <TableCell>{String(c.entity_id)}</TableCell>
                  <TableCell>{String(c.rule_id)}</TableCell>
                  <TableCell>{statusChip(c.status)}</TableCell>
                  <TableCell sx={cellStyle}>{String(c.checked_at || '-')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );

  const renderRules = () => (
    <Stack spacing={2}>
      <Button
        variant='contained'
        onClick={() => setRuleOpen(true)}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('master.quality.k19')}
      </Button>
      <Card>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('master.quality.k20')}</TableCell>
                <TableCell>{t('master.quality.k11')}</TableCell>
                <TableCell>{t('master.quality.k21')}</TableCell>
                <TableCell>{t('master.quality.k22')}</TableCell>
                <TableCell>{t('master.quality.k23')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.length === 0 && emptyRow(5)}
              {rules.map((r) => (
                <TableRow key={String(r.id)}>
                  <TableCell>{String(r.name)}</TableCell>
                  <TableCell sx={cellStyle}>{String(r.entity_type)}</TableCell>
                  <TableCell>{String(r.rule_type)}</TableCell>
                  <TableCell>
                    {statusChip(r.severity === 'high' ? 'warning' : r.severity)}
                  </TableCell>
                  <TableCell>
                    <Button
                      size='small'
                      color='error'
                      onClick={() => deleteRule.mutate(String(r.id))}
                    >
                      {t('master.quality.k24')}
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

  const renderSuggestions = () => (
    <Stack spacing={2}>
      <Card>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>{t('master.quality.k11')}</TableCell>
                <TableCell>{t('master.quality.k25')}</TableCell>
                <TableCell>{t('master.quality.k26')}</TableCell>
                <TableCell>{t('master.quality.k27')}</TableCell>
                <TableCell>{t('master.quality.k28')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suggestions.length === 0 && emptyRow(5)}
              {suggestions.map((s) => (
                <TableRow key={String(s.id)}>
                  <TableCell sx={cellStyle}>{String(s.entity_type)}</TableCell>
                  <TableCell>{String(s.suggestion_type)}</TableCell>
                  <TableCell>{String(s.reason || '-')}</TableCell>
                  <TableCell>{statusChip(s.status)}</TableCell>
                  <TableCell>
                    <Stack
                      direction='row'
                      spacing={1}
                    >
                      <Button
                        size='small'
                        variant='outlined'
                        onClick={() => approveSugg.mutate(String(s.id))}
                      >
                        {t('master.quality.k29')}
                      </Button>
                      <Button
                        size='small'
                        color='error'
                        onClick={() => rejectSugg.mutate(String(s.id))}
                      >
                        {t('master.quality.k30')}
                      </Button>
                    </Stack>
                  </TableCell>
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
          {t('master.quality.k31')}
        </Typography>
        {fixHistory.length === 0 && (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {t('master.quality.k3')}
          </Typography>
        )}
        {fixHistory.map((f, i) => (
          <Typography
            key={i}
            variant='body2'
            sx={cellStyle}
          >
            {String(f.entity_type)}/{String(f.entity_id)} · {String(f.action_type)} ·{' '}
            {statusChip(f.status)}
          </Typography>
        ))}
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
          label={t('master.quality.k32')}
        />
        <Tab
          sx={tabStyle}
          icon={<ListChecks className={styles.il2} />}
          iconPosition='start'
          label={t('master.quality.k33')}
        />
        <Tab
          sx={tabStyle}
          icon={<ShieldCheck className={styles.il3} />}
          iconPosition='start'
          label={t('master.quality.k34')}
        />
        <Tab
          sx={tabStyle}
          icon={<Sparkles className={styles.il4} />}
          iconPosition='start'
          label={t('master.quality.k35')}
        />
      </Tabs>

      {tab === 0 && renderDashboard()}
      {tab === 1 && renderChecks()}
      {tab === 2 && renderRules()}
      {tab === 3 && renderSuggestions()}

      <Dialog
        open={checkOpen}
        onClose={() => setCheckOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('master.quality.k13')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('master.quality.k11')}
              size='small'
              value={checkForm.entity_type}
              onChange={(e) => setCheckForm({ ...checkForm, entity_type: e.target.value })}
            />
            <TextField
              label={t('master.quality.k36')}
              size='small'
              value={checkForm.entity_id}
              onChange={(e) => setCheckForm({ ...checkForm, entity_id: e.target.value })}
            />
            <TextField
              label={t('master.quality.k37')}
              size='small'
              value={checkForm.rule_id}
              onChange={(e) => setCheckForm({ ...checkForm, rule_id: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckOpen(false)}>{t('master.quality.k38')}</Button>
          <Button
            variant='contained'
            onClick={() => runCheck.mutate()}
          >
            {t('master.quality.k39')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={ruleOpen}
        onClose={() => setRuleOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{t('master.quality.k19')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 1 }}
          >
            <TextField
              label={t('master.quality.k20')}
              size='small'
              value={ruleForm.name}
              onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
            />
            <TextField
              label={t('master.quality.k11')}
              size='small'
              value={ruleForm.entity_type}
              onChange={(e) => setRuleForm({ ...ruleForm, entity_type: e.target.value })}
            />
            <TextField
              label={t('master.quality.k21')}
              size='small'
              value={ruleForm.rule_type}
              onChange={(e) => setRuleForm({ ...ruleForm, rule_type: e.target.value })}
            />
            <TextField
              label={t('master.quality.k22')}
              size='small'
              value={ruleForm.severity}
              onChange={(e) => setRuleForm({ ...ruleForm, severity: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleOpen(false)}>{t('master.quality.k38')}</Button>
          <Button
            variant='contained'
            onClick={() => createRule.mutate()}
          >
            {t('master.quality.k39')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default MasterQualityPage;
