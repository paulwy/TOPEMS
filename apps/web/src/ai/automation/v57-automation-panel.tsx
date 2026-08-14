import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  LinearProgress,
  Grid,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TextField,
  Divider,
  Alert,
  Card,
  CardHeader,
  CardContent,
  Tabs,
  Tab,
} from '@mui/material';
import i18n from '@/i18n';
import {
  X as XIcon,
  Play,
  Square,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Shield,
  GitBranch,
  Gauge,
  TrendingUp,
  BarChart3,
  FileText,
  Zap,
  Lock,
  TestTube,
  HardDrive,
  Package,
} from 'lucide-react';
import {
  smartTester,
  type TestScenario,
  type TestResult,
  type TestType,
  type TestStatus,
  type TestPriority,
  type CoverageReport,
  type FailureAnalysis,
} from './smart-testing';
import {
  ciIntegrator,
  type CIConfig,
  type CIResult,
  type CIStatus,
  type CIProvider,
} from './ci-integration';
import {
  qualityGate,
  type GateCriteria,
  type GateResult,
  type GateType,
  type GateAction,
  type GateStatus,
  type TrendPoint,
} from './quality-gate';
import { designTokens, semanticTokens } from '@topems/tokens';

type TabId = 'tests' | 'ci' | 'quality' | 'trends';

const V57_BADGE = 'V57';

export const V57AutomationPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = React.useState<TabId>('tests');

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'action.active',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          width: '98%',
          maxWidth: 1600,
          height: '95vh',
          bgcolor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: designTokens.darkShadows.xl,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <V57PanelHeader onClose={onClose} />

        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'grey.50' }}>
          <Tabs
            value={activeTab}
            onChange={(_, tab) => setActiveTab(tab as TabId)}
            variant='fullWidth'
          >
            <Tab value='tests' label={i18n.t('ai.v57-automation-panel.k0')} icon={<TestTube size={16} />} iconPosition='start' />
            <Tab value='ci' label={i18n.t('ai.v57-automation-panel.ci_0')} icon={<GitBranch size={16} />} iconPosition='start' />
            <Tab value='quality' label={i18n.t('ai.v57-automation-panel.k1')} icon={<Shield size={16} />} iconPosition='start' />
            <Tab value='trends' label={i18n.t('ai.v57-automation-panel.k2')} icon={<TrendingUp size={16} />} iconPosition='start' />
          </Tabs>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {activeTab === 'tests' && <TestsTab />}
            {activeTab === 'ci' && <CITab />}
            {activeTab === 'quality' && <QualityTab />}
            {activeTab === 'trends' && <TrendsTab />}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

const V57PanelHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Box
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: `linear-gradient(135deg, ${designTokens.colors.success.dark}, ${designTokens.colors.success.dark}, ${designTokens.colors.teal['600']})`,
      color: 'common.white',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Zap size={20} />
      <Typography
        variant='h6'
        sx={{ fontWeight: 600 }}
      >
        {i18n.t('ai.v57-automation-panel.v570ai_1')}
      </Typography>
      <Chip
        label={V57_BADGE}
        color='success'
        size='small'
      />
      <Typography
        variant='caption'
        sx={{ opacity: 0.8 }}
      >
        {i18n.t('ai.v57-automation-panel.k2')}
      </Typography>
    </Box>
    <IconButton
      size='small'
      onClick={onClose}
      sx={{ color: 'common.white' }}
    >
      <XIcon size={20} />
    </IconButton>
  </Box>
);

const TestsTab: React.FC = () => {
  const [scenarios, setScenarios] = React.useState<TestScenario[]>([]);
  const [results, setResults] = React.useState<TestResult[]>([]);
  const [coverage, setCoverage] = React.useState<CoverageReport | null>(null);
  const [stats, setStats] = React.useState(smartTester.getStats());
  const [selectedScenario, setSelectedScenario] = React.useState<TestScenario | null>(null);
  const [failureAnalysis, setFailureAnalysis] = React.useState<FailureAnalysis | null>(null);
  const [filterType, setFilterType] = React.useState<TestType | 'all'>('all');
  const [showGenerate, setShowGenerate] = React.useState(false);

  const refresh = React.useCallback(() => {
    setScenarios(smartTester.listScenarios());
    setResults(smartTester.getTestResults());
    setCoverage(smartTester.getCoverage());
    setStats(smartTester.getStats());
  }, []);

  React.useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  React.useEffect(() => {
    const unsub = smartTester.on(() => refresh());
    return unsub;
  }, [refresh]);

  const filteredScenarios = React.useMemo(() => {
    if (filterType === 'all') return scenarios;
    return scenarios.filter((s) => s.type === filterType);
  }, [scenarios, filterType]);

  const handleRunAll = async () => {
    const all = smartTester.listScenarios();
    const ids = all.map((s) => s.id);
    await smartTester.runTests(ids);
    refresh();
  };

  const handleRunScenario = async (id: string) => {
    await smartTester.runTests([id]);
    refresh();
  };

  const handleSelectScenario = (scenario: TestScenario) => {
    setSelectedScenario(scenario);
    const analysis = smartTester.getFailureAnalysis(scenario.id);
    setFailureAnalysis(analysis);
  };

  const handleGenerate = (count: number, module: string) => {
    smartTester.generateTests({ count, module });
    setShowGenerate(false);
    refresh();
  };

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const passRate = results.length > 0 ? (passedCount / results.length) * 100 : 0;

  return (
    <Box sx={{ p: 3 }}>
      <Grid
        container
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<TestTube size={20} />}
            label={i18n.t('ai.v57-automation-panel.k3')}
            value={stats.total}
            color={designTokens.colors.success.dark}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<CheckCircle2 size={20} />}
            label={i18n.t('ai.v57-automation-panel.k4')}
            value={`${passRate.toFixed(1)}%`}
            color={designTokens.colors.success.dark}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<XCircle size={20} />}
            label={i18n.t('ai.v57-automation-panel.k5')}
            value={failedCount}
            color={designTokens.colors.error.main}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<Activity size={20} />}
            label={i18n.t('ai.v57-automation-panel.k6')}
            value={coverage ? `${coverage.line_coverage.toFixed(1)}%` : '—'}
            color={`${designTokens.colors.info.main}`}
          />
        </Grid>
      </Grid>

      <Card variant='outlined'>
        <CardHeader
          title={i18n.t('ai.v57-automation-panel.k7')}
          subheader={`${filteredScenarios.length} ${i18n.t('ai.v57-automation-panel.k3')}${stats.byType.unit} ${i18n.t('ai.v57-automation-panel.k4')} ${stats.byType.integration} ${i18n.t('ai.v57-automation-panel.k5')} ${stats.byType.e2e} E2E)`}
          action={
            <Stack
              direction='row'
              spacing={1}
            >
              <FormControl
                size='small'
                sx={{ minWidth: 100 }}
              >
                <InputLabel>{i18n.t('ai.v57-automation-panel.k8')}</InputLabel>
                <Select
                  value={filterType}
                  label={i18n.t('ai.v57-automation-panel.k9')}
                  onChange={(e) => setFilterType(e.target.value as TestType | 'all')}
                >
                  <MenuItem value='all'>{i18n.t('ai.v57-automation-panel.k10')}</MenuItem>
                  <MenuItem value='unit'>{i18n.t('ai.v57-automation-panel.k11')}</MenuItem>
                  <MenuItem value='integration'>{i18n.t('ai.v57-automation-panel.k12')}</MenuItem>
                  <MenuItem value='e2e'>E2E 测试</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant='outlined'
                size='small'
                startIcon={<Plus size={14} />}
                onClick={() => setShowGenerate(true)}
              >
                {i18n.t('ai.v57-automation-panel.ai_6')}
              </Button>
              <Button
                variant='contained'
                size='small'
                startIcon={<Play size={14} />}
                onClick={handleRunAll}
              >
                {i18n.t('ai.v57-automation-panel.k7')}
              </Button>
            </Stack>
          }
        />
        <CardContent>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k13')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k14')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k15')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k16')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k17')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k18')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k19')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredScenarios.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align='center'
                    sx={{ py: 4 }}
                  >
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('ai.v57-automation-panel.k8')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredScenarios.map((s) => (
                  <TableRow
                    key={s.id}
                    hover
                    onClick={() => handleSelectScenario(s)}
                    sx={{ cursor: 'pointer' }}
                    selected={selectedScenario?.id === s.id}
                  >
                    <TableCell>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {s.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <TestTypeBadge type={s.type} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={s.priority} />
                    </TableCell>
                    <TableCell>
                      <TestStatusChip status={s.status} />
                    </TableCell>
                    <TableCell>{s.steps.length}</TableCell>
                    <TableCell>
                      <Typography variant='caption'>{s.module || '—'}</Typography>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Tooltip title={i18n.t('ai.v57-automation-panel.k20')}>
                        <IconButton
                          size='small'
                          onClick={() => handleRunScenario(s.id)}
                        >
                          <Play
                            size={16}
                            color={designTokens.colors.success.dark}
                          />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
      </Card>

      {selectedScenario && (
        <Card variant='outlined' sx={{ mt: 2 }}>
          <CardHeader
            title={`${i18n.t('ai.v57-automation-panel.k9')} ${selectedScenario.name}`}
            subheader={selectedScenario.expected_result}
          />
          <CardContent>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1, fontWeight: 600 }}
          >
            {i18n.t('ai.v57-automation-panel.k10')}
          </Typography>
          <Stack
            spacing={1}
            sx={{ mb: 2 }}
          >
            {selectedScenario.steps.map((step, idx) => (
              <Paper
                key={idx}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'grey.50',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: 'teal.500',
                    color: 'common.white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {idx + 1}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {step.name}
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                  >
                    {step.action}
                  </Typography>
                </Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  → {step.expected}
                </Typography>
              </Paper>
            ))}
          </Stack>

          {failureAnalysis && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography
                variant='subtitle2'
                sx={{ mb: 1, fontWeight: 600, color: 'error.500' }}
              >
                {i18n.t('ai.v57-automation-panel.k11')}
              </Typography>
              <Alert
                severity='error'
                variant='outlined'
                sx={{ mb: 1 }}
              >
                <strong>失败类型:</strong> {failureAnalysis.failure_type}
              </Alert>
              <Alert
                severity='warning'
                variant='outlined'
                sx={{ mb: 1 }}
              >
                <strong>根因:</strong> {failureAnalysis.root_cause}
              </Alert>
              <Alert
                severity='info'
                variant='outlined'
              >
                <strong>建议:</strong> {failureAnalysis.suggestion}
              </Alert>
              {failureAnalysis.stack_trace && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    bgcolor: 'grey.900',
                    color: 'grey.100',
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: 11,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {failureAnalysis.stack_trace}
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>
      )}

      {coverage && (
        <Card variant='outlined' sx={{ mt: 2 }}>
          <CardHeader title={i18n.t('ai.v57-automation-panel.k21')} />
          <CardContent>
          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 12, md: 4 }}>
              <CoverageGauge
                label={i18n.t('ai.v57-automation-panel.k22')}
                value={coverage.line_coverage}
                color={designTokens.colors.success.dark}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <CoverageGauge
                label={i18n.t('ai.v57-automation-panel.k23')}
                value={coverage.branch_coverage}
                color={`${designTokens.colors.info.main}`}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <CoverageGauge
                label={i18n.t('ai.v57-automation-panel.k24')}
                value={coverage.function_coverage}
                color={designTokens.colors.secondary.main}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      )}

      {showGenerate && (
        <GenerateTestDialog
          onClose={() => setShowGenerate(false)}
          onGenerate={handleGenerate}
        />
      )}
    </Box>
  );
};

const CITab: React.FC = () => {
  const [configs, setConfigs] = React.useState<CIConfig[]>([]);
  const [runs, setRuns] = React.useState<CIResult[]>([]);
  const [selectedConfig, setSelectedConfig] = React.useState<CIConfig | null>(null);
  const [selectedRun, setSelectedRun] = React.useState<CIResult | null>(null);
  const [showConfigDialog, setShowConfigDialog] = React.useState(false);

  const refresh = React.useCallback(() => {
    setConfigs(ciIntegrator.listConfigs());
    setRuns(ciIntegrator.getRunHistory());
  }, []);

  React.useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  React.useEffect(() => {
    const unsubs = [ciIntegrator.on(() => refresh())];
    return () => unsubs.forEach((fn) => fn());
  }, [refresh]);

  const stats = React.useMemo(() => {
    const totalRuns = runs.length;
    const running = runs.filter((r) => r.status === 'running').length;
    const success = runs.filter((r) => r.status === 'success').length;
    const failed = runs.filter((r) => r.status === 'failed').length;
    return { totalRuns, running, success, failed };
  }, [runs]);

  const handleTrigger = (pipelineName: string) => {
    ciIntegrator.triggerPipeline(pipelineName, 'manual');
    setTimeout(refresh, 100);
  };

  const handleCancel = (runId: string) => {
    ciIntegrator.cancelPipeline(runId);
    refresh();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid
        container
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<GitBranch size={20} />}
            label={i18n.t('ai.v57-automation-panel.k25')}
            value={configs.length}
            color={designTokens.colors.secondary.dark}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<Activity size={20} />}
            label={i18n.t('ai.v57-automation-panel.k26')}
            value={stats.running}
            color={`${designTokens.colors.info.main}`}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<CheckCircle2 size={20} />}
            label={i18n.t('ai.v57-automation-panel.k27')}
            value={stats.success}
            color={designTokens.colors.success.dark}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<XCircle size={20} />}
            label={i18n.t('ai.v57-automation-panel.k28')}
            value={stats.failed}
            color={designTokens.colors.error.main}
          />
        </Grid>
      </Grid>

      <Card variant='outlined'>
        <CardHeader
          title={i18n.t('ai.v57-automation-panel.ci_12')}
          subheader={`${configs.length} ${i18n.t('ai.v57-automation-panel.k13')}`}
          action={
            <Button
              variant='contained'
              size='small'
              startIcon={<Plus size={14} />}
              onClick={() => setShowConfigDialog(true)}
            >
              {i18n.t('ai.v57-automation-panel.k14')}
            </Button>
          }
        />
        <CardContent>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k29')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Provider</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k30')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k31')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k32')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k33')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k34')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align='center'
                    sx={{ py: 4 }}
                  >
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('ai.v57-automation-panel.k15')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                configs.map((c) => (
                  <TableRow
                    key={c.pipeline}
                    hover
                    onClick={() => setSelectedConfig(c)}
                    sx={{ cursor: 'pointer' }}
                    selected={selectedConfig?.pipeline === c.pipeline}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>{c.pipeline}</TableCell>
                    <TableCell>
                      <ProviderBadge provider={c.provider} />
                    </TableCell>
                    <TableCell>
                      <Stack
                        direction='row'
                        spacing={0.5}
                        sx={{ flexWrap: 'wrap' }}
                      >
                        {c.triggers.slice(0, 3).map((t) => (
                          <Chip
                            key={t}
                            label={t}
                            size='small'
                            variant='outlined'
                          />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant='caption'>
                        {c.branches.slice(0, 2).join(', ')}
                        {c.branches.length > 2 ? ` +${c.branches.length - 2}` : ''}
                      </Typography>
                    </TableCell>
                    <TableCell>{c.stages.length}</TableCell>
                    <TableCell>
                      <Chip
                        label={c.environment || '—'}
                        size='small'
                        color={c.environment === 'production' ? 'error' : 'info'}
                      />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Tooltip title={i18n.t('ai.v57-automation-panel.k35')}>
                        <IconButton
                          size='small'
                          onClick={() => handleTrigger(c.pipeline)}
                        >
                          <Play
                            size={16}
                            color={designTokens.colors.success.dark}
                          />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
      </Card>

      <Card variant='outlined' sx={{ mt: 2 }}>
        <CardHeader
          title={i18n.t('ai.v57-automation-panel.k36')}
          subheader={`${runs.length} ${i18n.t('ai.v57-automation-panel.k16')}`}
        />
        <CardContent>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.id_37')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k38')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k39')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k40')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k41')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k42')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k43')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {runs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align='center'
                    sx={{ py: 4 }}
                  >
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('ai.v57-automation-panel.i18n_17')}.t('ai.v57-automation-panel.k44')按钮启动流水线
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                runs.slice(0, 15).map((r) => {
                  const progress =
                    r.total_stages > 0 ? (r.stages_completed / r.total_stages) * 100 : 0;
                  return (
                    <TableRow
                      key={r.run_id}
                      hover
                      onClick={() => setSelectedRun(r)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Typography
                          variant='caption'
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {r.run_id.slice(-12)}
                        </Typography>
                      </TableCell>
                      <TableCell>{r.pipeline}</TableCell>
                      <TableCell>
                        <CIStatusChip status={r.status} />
                      </TableCell>
                      <TableCell sx={{ minWidth: 120 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant='determinate'
                            value={progress}
                            sx={{ flex: 1, height: 6, borderRadius: 3 }}
                            color={
                              r.status === 'failed'
                                ? 'error'
                                : r.status === 'success'
                                  ? 'success'
                                  : 'primary'
                            }
                          />
                          <Typography variant='caption'>{Math.round(progress)}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption'>
                          {r.duration_ms > 0 ? `${Math.round(r.duration_ms / 100) / 10}s` : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{r.artifacts.length}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {r.status === 'running' && (
                          <Tooltip title={i18n.t('ai.v57-automation-panel.k45')}>
                            <IconButton
                              size='small'
                              onClick={() => handleCancel(r.run_id)}
                            >
                              <Square
                                size={16}
                                color={designTokens.colors.error.main}
                              />
                            </IconButton>
                          </Tooltip>
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

      {selectedRun && <RunDetailCard run={selectedRun} />}

      {showConfigDialog && (
        <ConfigPipelineDialog
          onClose={() => setShowConfigDialog(false)}
          onCreated={(config) => {
            ciIntegrator.configurePipeline(config);
            setShowConfigDialog(false);
            refresh();
          }}
        />
      )}
    </Box>
  );
};

const QualityTab: React.FC = () => {
  const [criteria, setCriteria] = React.useState<GateCriteria[]>([]);
  const [results, setResults] = React.useState<GateResult[]>([]);
  const [summary, setSummary] = React.useState(qualityGate.getSummary());
  const [selectedCriteria, setSelectedCriteria] = React.useState<GateCriteria | null>(null);
  const [showOverride, setShowOverride] = React.useState(false);

  const refresh = React.useCallback(() => {
    setCriteria(qualityGate.listCriteria());
    setResults(qualityGate.getGateResults());
    setSummary(qualityGate.getSummary());
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleEvaluate = () => {
    qualityGate.evaluateGate();
    refresh();
  };

  const handleOverride = (criteria: GateCriteria) => {
    setSelectedCriteria(criteria);
    setShowOverride(true);
  };

  const totalCriteria = summary.total_criteria;
  const passedCount = summary.status_counts.passed;
  const failedCount = summary.status_counts.failed;
  const warnedCount = summary.status_counts.warned;

  return (
    <Box sx={{ p: 3 }}>
      <Grid
        container
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<Shield size={20} />}
            label={i18n.t('ai.v57-automation-panel.k46')}
            value={totalCriteria}
            color={designTokens.colors.secondary.dark}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<CheckCircle2 size={20} />}
            label={i18n.t('ai.v57-automation-panel.k47')}
            value={passedCount}
            color={designTokens.colors.success.dark}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<AlertTriangle size={20} />}
            label={i18n.t('ai.v57-automation-panel.k48')}
            value={warnedCount}
            color={designTokens.colors.warning.main}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<XCircle size={20} />}
            label={i18n.t('ai.v57-automation-panel.k49')}
            value={failedCount}
            color={designTokens.colors.error.main}
          />
        </Grid>
      </Grid>

      <Card variant='outlined'>
        <CardHeader
          title={i18n.t('ai.v57-automation-panel.k50')}
          subheader={`${criteria.filter((c) => c.enabled).length}/${totalCriteria} ${i18n.t('ai.v57-automation-panel.k19')}`}
          action={
            <Button
              variant='contained'
              size='small'
              startIcon={<Gauge size={14} />}
              onClick={handleEvaluate}
            >
              {i18n.t('ai.v57-automation-panel.k20')}
            </Button>
          }
        />
        <CardContent>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k51')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k52')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k53')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k54')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k55')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k56')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k57')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {criteria.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align='center'
                    sx={{ py: 4 }}
                  >
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('ai.v57-automation-panel.k21')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                criteria.map((c) => {
                  const lastResult = summary.last_results.find((r) => r.criteria_id === c.id);
                  return (
                    <TableRow
                      key={c.id}
                      hover
                    >
                      <TableCell sx={{ fontWeight: 500 }}>{c.name}</TableCell>
                      <TableCell>
                        <GateTypeBadge type={c.type} />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant='caption'
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {c.metric_key}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant='caption'
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {c.threshold} {c.comparison}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <GateActionBadge action={c.action} />
                      </TableCell>
                      <TableCell>
                        {lastResult ? (
                          <GateStatusChip status={lastResult.status} />
                        ) : (
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {i18n.t('ai.v57-automation-panel.k22')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack
                          direction='row'
                          spacing={0.5}
                        >
                          <Tooltip title={i18n.t('ai.v57-automation-panel.k58')}>
                            <IconButton
                              size='small'
                              onClick={() => setSelectedCriteria(c)}
                            >
                              <BarChart3
                                size={16}
                                color={designTokens.colors.secondary.dark}
                              />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={i18n.t('ai.v57-automation-panel.k59')}>
                            <IconButton
                              size='small'
                              onClick={() => handleOverride(c)}
                            >
                              <Lock
                                size={16}
                                color={designTokens.colors.warning.main}
                              />
                            </IconButton>
                          </Tooltip>
                        </Stack>
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

      <Card variant='outlined' sx={{ mt: 2 }}>
        <CardHeader title={i18n.t('ai.v57-automation-panel.k60')} />
        <CardContent>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k61')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k62')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k63')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k64')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{i18n.t('ai.v57-automation-panel.k65')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align='center'
                    sx={{ py: 4 }}
                  >
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('ai.v57-automation-panel.i18n_23')}.t('ai.v57-automation-panel.k66')开始评估
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                results.slice(0, 10).map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{r.criteria_name}</TableCell>
                    <TableCell>
                      <Typography
                        variant='caption'
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {r.actual}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant='caption'
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {r.threshold}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <GateStatusChip status={r.status} />
                    </TableCell>
                    <TableCell>
                      <Typography variant='caption'>
                        {new Date(r.measured_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
      </Card>

      {showOverride && selectedCriteria && (
        <OverrideDialog
          criteria={selectedCriteria}
          onClose={() => {
            setShowOverride(false);
            setSelectedCriteria(null);
          }}
          onOverride={(reason, by) => {
            qualityGate.overrideGate(selectedCriteria.id, reason, by);
            setShowOverride(false);
            setSelectedCriteria(null);
            refresh();
          }}
        />
      )}
    </Box>
  );
};

const TrendsTab: React.FC = () => {
  const [criteria, setCriteria] = React.useState<GateCriteria[]>([]);
  const [selectedCriteria, setSelectedCriteria] = React.useState<GateCriteria | null>(null);
  const [trendData, setTrendData] = React.useState<TrendPoint[]>([]);

  const refresh = React.useCallback(() => {
    setCriteria(qualityGate.listCriteria());
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSelectCriteria = (c: GateCriteria) => {
    setSelectedCriteria(c);
    setTrendData(qualityGate.getTrend(c.id, 20));
  };

  const testStats = smartTester.getStats();
  const ciStats = ciIntegrator.getStats();
  const gateSummary = qualityGate.getSummary();

  return (
    <Box sx={{ p: 3 }}>
      <Grid
        container
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<TestTube size={20} />}
            label={i18n.t('ai.v57-automation-panel.k67')}
            value={`${testStats.by_status.passed}/${testStats.total}`}
            color={designTokens.colors.success.dark}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<GitBranch size={20} />}
            label={i18n.t('ai.v57-automation-panel.ci_25')}
            value={`${ciStats.success_rate.toFixed(1)}%`}
            color={designTokens.colors.success.dark}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<Gauge size={20} />}
            label={i18n.t('ai.v57-automation-panel.ci_26')}
            value={`${Math.round(ciStats.avg_duration_ms / 100) / 10}s`}
            color={`${designTokens.colors.info.main}`}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<Shield size={20} />}
            label={i18n.t('ai.v57-automation-panel.k68')}
            value={`${gateSummary.total_criteria > 0 ? ((gateSummary.status_counts.passed / gateSummary.total_criteria) * 100).toFixed(0) : 0}%`}
            color={designTokens.colors.secondary.main}
          />
        </Grid>
      </Grid>

      <Card variant='outlined'>
        <CardHeader
          title={i18n.t('ai.v57-automation-panel.k69')}
          subheader={selectedCriteria ? `${i18n.t('ai.v57-automation-panel.k27')} ${selectedCriteria.name}` : i18n.t('ai.v57-automation-panel.k70')}
        />
        <CardContent>
        <Grid
          container
          spacing={2}
        >
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography
              variant='subtitle2'
              sx={{ mb: 1, fontWeight: 600 }}
            >
              {i18n.t('ai.v57-automation-panel.k28')}
            </Typography>
            <Stack spacing={1}>
              {criteria.map((c) => (
                <Button
                  key={c.id}
                  variant={selectedCriteria?.id === c.id ? 'contained' : 'outlined'}
                  size='small'
                  onClick={() => handleSelectCriteria(c)}
                  sx={{
                    justifyContent: 'flex-start',
                    textTransform: 'none',
                    borderColor: selectedCriteria?.id === c.id ? designTokens.colors.success.dark : undefined,
                  }}
                >
                  <GateTypeIcon type={c.type} />
                  <Box sx={{ ml: 1 }}>
                    <Typography variant='body2'>{c.name}</Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      [i18n.t('ai.v57-automation-panel.k29')]: {c.threshold}
                    </Typography>
                  </Box>
                </Button>
              ))}
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            {trendData.length > 0 ? (
              <TrendChart
                data={trendData}
                criteria={selectedCriteria}
              />
            ) : (
              <Box
                sx={{
                  height: 300,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {i18n.t('ai.v57-automation-panel.k30')}
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </CardContent>
      </Card>

      <Card variant='outlined' sx={{ mt: 2 }}>
        <CardHeader title={i18n.t('ai.v57-automation-panel.ai_31')} />
        <CardContent>
        <Stack spacing={2}>
          <Alert
            severity='info'
            variant='outlined'
          >
            <strong>覆盖率建议:</strong> 当前行覆盖率偏低，建议优先补充单元测试覆盖核心业务逻辑。
          </Alert>
          <Alert
            severity='warning'
            variant='outlined'
          >
            <strong>性能警告:</strong> 部分构建产物超出预期，建议检查依赖引入和代码分割策略。
          </Alert>
          <Alert
            severity='success'
            variant='outlined'
          >
            <strong>安全状态:</strong> 当前无严重安全漏洞，所有依赖均在维护期内。
          </Alert>
        </Stack>
      </CardContent>
      </Card>
    </Box>
  );
};

const TrendChart: React.FC<{ data: TrendPoint[]; criteria: GateCriteria | null }> = ({
  data,
  criteria: _criteria,
}) => {
  const maxValue = Math.max(...data.map((d) => d.value), ...data.map((d) => d.threshold)) * 1.2;
  const minValue = Math.min(...data.map((d) => d.value), ...data.map((d) => d.threshold)) * 0.8;
  const range = maxValue - minValue || 1;

  const chartHeight = 280;
  const chartWidth = 600;
  const padding = 40;
  const plotHeight = chartHeight - padding * 2;
  const plotWidth = chartWidth - padding * 2;

  const getY = (val: number) => padding + plotHeight - ((val - minValue) / range) * plotHeight;
  const getX = (idx: number) => padding + (idx / Math.max(data.length - 1, 1)) * plotWidth;

  const valuePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}`)
    .join(' ');
  const thresholdY = getY(data[0]?.threshold || 0);

  return (
    <Box sx={{ overflow: 'auto' }}>
      <svg
        width={chartWidth}
        height={chartHeight}
        style={{ maxWidth: '100%' }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding + plotHeight * ratio;
          const val = maxValue - ratio * range;
          return (
            <g key={ratio}>
              <line
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                stroke={designTokens.colors.grey['200']}
                strokeWidth={1}
              />
              <text
                x={4}
                y={y + 4}
                fontSize={10}
                fill={`${designTokens.colors.grey['400']}`}
              >
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}

        <line
          x1={padding}
          y1={thresholdY}
          x2={chartWidth - padding}
          y2={thresholdY}
          stroke={designTokens.colors.error.main}
          strokeWidth={2}
          strokeDasharray='6,3'
        />
        <text
          x={chartWidth - padding - 60}
          y={thresholdY - 4}
          fontSize={10}
          fill={designTokens.colors.error.main}
        >
          [i18n.t('ai.v57-automation-panel.k32')]: {data[0]?.threshold}
        </text>

        <path
          d={valuePath}
          fill='none'
          stroke={designTokens.colors.success.dark}
          strokeWidth={2}
        />

        {data.map((d, i) => (
          <g key={i}>
            <circle
              cx={getX(i)}
              cy={getY(d.value)}
              r={4}
              fill={d.passed ? designTokens.colors.success.dark : designTokens.colors.error.main}
              stroke='white'
              strokeWidth={2}
            />
          </g>
        ))}

        {data.map((d, i) =>
          i % Math.ceil(data.length / 8) === 0 ? (
            <text
              key={`label-${i}`}
              x={getX(i)}
              y={chartHeight - 10}
              fontSize={9}
              fill={`${designTokens.colors.grey['400']}`}
              textAnchor='middle'
            >
              {new Date(d.timestamp).toLocaleDateString()}
            </text>
          ) : null
        )}
      </svg>
    </Box>
  );
};

const RunDetailCard: React.FC<{ run: CIResult }> = ({ run }) => (
  <Card variant='outlined' sx={{ mt: 2 }}>
    <CardHeader
      title={`${i18n.t('ai.v57-automation-panel.k33')} ${run.run_id.slice(-12)}`}
      subheader={`${run.pipeline} · ${run.status}`}
    />
    <CardContent>
    <Grid
      container
      spacing={2}
    >
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography
          variant='subtitle2'
          sx={{ mb: 1, fontWeight: 600 }}
        >
          {i18n.t('ai.v57-automation-panel.k34')}
        </Typography>
        <Typography variant='body2'>
          [i18n.t('ai.v57-automation-panel.k35')]: {run.stages_completed}/{run.total_stages}
        </Typography>
        <LinearProgress
          variant='determinate'
          value={run.total_stages > 0 ? (run.stages_completed / run.total_stages) * 100 : 0}
          sx={{ height: 8, borderRadius: 4, mt: 1 }}
          color={
            run.status === 'failed' ? 'error' : run.status === 'success' ? 'success' : 'primary'
          }
        />
        <Typography
          variant='caption'
          color='text.secondary'
          sx={{ mt: 0.5 }}
        >
          [i18n.t('ai.v57-automation-panel.k36')]: {run.duration_ms > 0 ? `${Math.round(run.duration_ms / 100) / 10}s` : '—'}
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography
          variant='subtitle2'
          sx={{ mb: 1, fontWeight: 600 }}
        >
          构建产物 ({run.artifacts.length})
        </Typography>
        <Stack
          direction='column'
          spacing={0.5}
        >
          {run.artifacts.length === 0 ? (
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('ai.v57-automation-panel.k37')}
            </Typography>
          ) : (
            run.artifacts.map((a, i) => (
              <Box
                key={i}
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <FileText size={14} />
                <Typography variant='caption'>{a.name}</Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  ({(a.size / 1024).toFixed(1)} KB)
                </Typography>
              </Box>
            ))
          )}
        </Stack>
      </Grid>
    </Grid>

    {run.logs.length > 0 && (
      <>
        <Divider sx={{ my: 2 }} />
        <Typography
          variant='subtitle2'
          sx={{ mb: 1, fontWeight: 600 }}
        >
          {i18n.t('ai.v57-automation-panel.k38')}
        </Typography>
        <Box
          sx={{
            maxHeight: 200,
            overflow: 'auto',
            bgcolor: 'grey.900',
            color: 'grey.100',
            borderRadius: 1,
            p: 1.5,
            fontFamily: 'monospace',
            fontSize: 11,
          }}
        >
          {run.logs.slice(-20).map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </Box>
      </>
    )}
  </CardContent>
      </Card>
);

const GenerateTestDialog: React.FC<{
  onClose: () => void;
  onGenerate: (count: number, module: string) => void;
}> = ({ onClose, onGenerate }) => {
  const [count, setCount] = React.useState(5);
  const [module, setModule] = React.useState('all');

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'action.active',
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 2,
          p: 3,
          width: 400,
          boxShadow: designTokens.darkShadows.xl,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('ai.v57-automation-panel.ai_39')}
        </Typography>
        <Stack spacing={2}>
          <TextField
            label={i18n.t('ai.v57-automation-panel.120_71')}
            type='number'
            value={count}
            onChange={(e) => {
              const v = parseInt(e.target.value) || 5;
              setCount(Math.max(1, Math.min(20, v)));
            }}
            fullWidth
          />
          <TextField
            label={i18n.t('ai.v57-automation-panel.k72')}
            value={module}
            onChange={(e) => setModule(e.target.value)}
            fullWidth
            placeholder={i18n.t('ai.v57-automation-panel.k40')}
          />
        </Stack>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant='outlined'
            onClick={onClose}
          >
            {i18n.t('ai.v57-automation-panel.k41')}
          </Button>
          <Button
            variant='contained'
            onClick={() => onGenerate(count, module)}
          >
            {i18n.t('ai.v57-automation-panel.k42')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

const ConfigPipelineDialog: React.FC<{
  onClose: () => void;
  onCreated: (config: CIConfig) => void;
}> = ({ onClose, onCreated }) => {
  const [pipeline, setPipeline] = React.useState('');
  const [provider, setProvider] = React.useState<CIProvider>('github');

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'action.active',
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 2,
          p: 3,
          width: 450,
          boxShadow: designTokens.darkShadows.xl,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('ai.v57-automation-panel.ci_43')}
        </Typography>
        <Stack spacing={2}>
          <TextField
            label={i18n.t('ai.v57-automation-panel.k73')}
            value={pipeline}
            onChange={(e) => setPipeline(e.target.value)}
            fullWidth
            placeholder={i18n.t('ai.v57-automation-panel.topemsfrontendci_74')}
          />
          <FormControl fullWidth>
            <InputLabel>CI Provider</InputLabel>
            <Select
              value={provider}
              label='CI Provider'
              onChange={(e) => setProvider(e.target.value as CIProvider)}
            >
              <MenuItem value='github'>GitHub Actions</MenuItem>
              <MenuItem value='gitlab'>GitLab CI</MenuItem>
              <MenuItem value='jenkins'>Jenkins</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant='outlined'
            onClick={onClose}
          >
            {i18n.t('ai.v57-automation-panel.k44')}
          </Button>
          <Button
            variant='contained'
            disabled={!pipeline.trim()}
            onClick={() =>
              onCreated({
                pipeline: pipeline.trim(),
                provider,
                triggers: ['manual', 'push'],
                branches: ['main'],
                stages: [
                  {
                    name: 'build',
                    type: 'build',
                    status: 'idle',
                    steps: [{ name: 'Build', command: 'npm run build', status: 'idle' }],
                  },
                  {
                    name: 'test',
                    type: 'test',
                    status: 'idle',
                    steps: [{ name: 'Test', command: 'npm test', status: 'idle' }],
                  },
                ],
                notifications: {},
                environment: 'staging',
              })
            }
          >
            {i18n.t('ai.v57-automation-panel.k45')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

const OverrideDialog: React.FC<{
  criteria: GateCriteria;
  onClose: () => void;
  onOverride: (reason: string, by: string) => void;
}> = ({ criteria, onClose, onOverride }) => {
  const [reason, setReason] = React.useState('');
  const [by, setBy] = React.useState('admin');

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'action.active',
        zIndex: 10001,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 2,
          p: 3,
          width: 450,
          boxShadow: designTokens.darkShadows.xl,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          {i18n.t('ai.v57-automation-panel.k46')}
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2 }}
        >
          [i18n.t('ai.v57-automation-panel.k47')]: <strong>{criteria.name}</strong> ({criteria.type})
        </Typography>
        <Stack spacing={2}>
          <TextField
            label={i18n.t('ai.v57-automation-panel.k75')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            multiline
            rows={3}
            placeholder={i18n.t('ai.v57-automation-panel.k76')}
          />
          <TextField
            label={i18n.t('ai.v57-automation-panel.k77')}
            value={by}
            onChange={(e) => setBy(e.target.value)}
            fullWidth
          />
        </Stack>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant='outlined'
            onClick={onClose}
          >
            {i18n.t('ai.v57-automation-panel.k48')}
          </Button>
          <Button
            variant='contained'
            disabled={!reason.trim()}
            onClick={() => onOverride(reason.trim(), by)}
          >
            {i18n.t('ai.v57-automation-panel.k49')}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}> = ({ icon, label, value, color }) => (
  <Paper sx={{ p: 2, borderRadius: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Box sx={{ color }}>{icon}</Box>
      <Typography
        variant='caption'
        color='text.secondary'
      >
        {label}
      </Typography>
    </Box>
    <Typography
      variant='h5'
      sx={{ fontWeight: 700 }}
    >
      {value}
    </Typography>
  </Paper>
);

const TestTypeBadge: React.FC<{ type: TestType }> = ({ type }) => {
  const labels: Record<TestType, string> = {
    unit: i18n.t('ai.v57-automation-panel.k78'),
    integration: i18n.t('ai.v57-automation-panel.k79'),
    e2e: 'E2E',
  };
  return (
    <Chip
      label={labels[type]}
      size='small'
      color='info'
    />
  );
};

const PriorityBadge: React.FC<{ priority: TestPriority }> = ({ priority }) => {
  const variants: Record<TestPriority, 'error' | 'warning' | 'info' | 'success'> = {
    critical: 'error',
    high: 'warning',
    medium: 'info',
    low: 'success',
  };
  return (
    <Chip
      label={priority}
      size='small'
      color={variants[priority]}
    />
  );
};

const TestStatusChip: React.FC<{ status: TestStatus }> = ({ status }) => {
  const configs: Record<
    TestStatus,
    { label: string; color: 'success' | 'error' | 'warning' | 'default' }
  > = {
    pending: { label: i18n.t('ai.v57-automation-panel.k80'), color: 'default' },
    running: { label: i18n.t('ai.v57-automation-panel.k81'), color: 'warning' },
    passed: { label: i18n.t('ai.v57-automation-panel.k82'), color: 'success' },
    failed: { label: i18n.t('ai.v57-automation-panel.k83'), color: 'error' },
    skipped: { label: i18n.t('ai.v57-automation-panel.k84'), color: 'default' },
  };
  const config = configs[status];
  return (
    <Chip
      label={config.label}
      size='small'
      color={config.color}
    />
  );
};

const CIStatusChip: React.FC<{ status: CIStatus }> = ({ status }) => {
  const configs: Record<
    CIStatus,
    { label: string; color: 'success' | 'error' | 'warning' | 'default' }
  > = {
    idle: { label: i18n.t('ai.v57-automation-panel.k85'), color: 'default' },
    running: { label: i18n.t('ai.v57-automation-panel.k86'), color: 'warning' },
    success: { label: i18n.t('ai.v57-automation-panel.k87'), color: 'success' },
    failed: { label: i18n.t('ai.v57-automation-panel.k88'), color: 'error' },
    cancelled: { label: i18n.t('ai.v57-automation-panel.k89'), color: 'default' },
    pending: { label: i18n.t('ai.v57-automation-panel.k90'), color: 'default' },
  };
  const config = configs[status];
  return (
    <Chip
      label={config.label}
      size='small'
      color={config.color}
    />
  );
};

const ProviderBadge: React.FC<{ provider: CIProvider }> = ({ provider }) => {
  const labels: Record<CIProvider, string> = {
    github: 'GitHub',
    gitlab: 'GitLab',
    jenkins: 'Jenkins',
  };
  return (
    <Chip
      label={labels[provider]}
      size='small'
      color='info'
    />
  );
};

const GateTypeBadge: React.FC<{ type: GateType }> = ({ type }) => {
  const labels: Record<GateType, { label: string; icon: React.ReactNode }> = {
    coverage: { label: i18n.t('ai.v57-automation-panel.k91'), icon: <TestTube size={12} /> },
    bundle: { label: i18n.t('ai.v57-automation-panel.k92'), icon: <Package size={12} /> },
    size: { label: i18n.t('ai.v57-automation-panel.k93'), icon: <HardDrive size={12} /> },
    performance: { label: i18n.t('ai.v57-automation-panel.k94'), icon: <Gauge size={12} /> },
    security: { label: i18n.t('ai.v57-automation-panel.k95'), icon: <Shield size={12} /> },
  };
  const config = labels[type];
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      {config.icon}
      <Typography variant='caption'>{config.label}</Typography>
    </Box>
  );
};

const GateTypeIcon: React.FC<{ type: GateType }> = ({ type }) => {
  const icons: Record<GateType, React.ReactNode> = {
    coverage: (
      <TestTube
        size={14}
        color={`${designTokens.colors.info.main}`}
      />
    ),
    bundle: (
      <BarChart3
        size={14}
        color={designTokens.colors.secondary.main}
      />
    ),
    size: (
      <HardDrive
        size={14}
        color={designTokens.colors.warning.main}
      />
    ),
    performance: (
      <Gauge
        size={14}
        color={designTokens.colors.success.dark}
      />
    ),
    security: (
      <Shield
        size={14}
        color={designTokens.colors.error.main}
      />
    ),
  };
  return <>{icons[type]}</>;
};

const GateActionBadge: React.FC<{ action: GateAction }> = ({ action }) => {
  const configs: Record<GateAction, { label: string; color: 'error' | 'warning' | 'info' }> = {
    block: { label: i18n.t('ai.v57-automation-panel.k96'), color: 'error' },
    warn: { label: i18n.t('ai.v57-automation-panel.k97'), color: 'warning' },
    info: { label: i18n.t('ai.v57-automation-panel.k98'), color: 'info' },
  };
  const config = configs[action];
  return (
    <Chip
      label={config.label}
      size='small'
      color={config.color}
    />
  );
};

const GateStatusChip: React.FC<{ status: GateStatus }> = ({ status }) => {
  const configs: Record<
    GateStatus,
    { label: string; color: 'success' | 'error' | 'warning' | 'default' }
  > = {
    passed: { label: i18n.t('ai.v57-automation-panel.k99'), color: 'success' },
    failed: { label: i18n.t('ai.v57-automation-panel.k100'), color: 'error' },
    warned: { label: i18n.t('ai.v57-automation-panel.k101'), color: 'warning' },
    skipped: { label: i18n.t('ai.v57-automation-panel.k102'), color: 'default' },
  };
  const config = configs[status];
  return (
    <Chip
      label={config.label}
      size='small'
      color={config.color}
    />
  );
};

const CoverageGauge: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
    <Typography
      variant='caption'
      color='text.secondary'
      sx={{ mb: 1 }}
    >
      {label}
    </Typography>
    <Typography
      variant='h4'
      sx={{ fontWeight: 700, color, mb: 1 }}
    >
      {value.toFixed(1)}%
    </Typography>
    <LinearProgress
      variant='determinate'
      value={Math.min(value, 100)}
      sx={{ height: 8, borderRadius: 4, bgcolor: `${color}20`, color }}
    />
  </Paper>
);
