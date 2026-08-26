import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Grid,
  Tooltip,
  Divider,
  Alert,
  Card,
  CardHeader,
  CardContent,
  Tabs,
  Tab,
  useTheme,
} from '@mui/material';
import i18n from '@/i18n';
import {
  X as XIcon,
  GitBranch,
  Rocket,
  RotateCcw,
  Activity,
  Play,
  Square,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  HardDrive,
  Cpu,
  RefreshCw,
  Settings,
  Zap,
  Shield,
  TrendingUp,
  Server,
  Layers,
} from 'lucide-react';
import {
  ciPipeline,
  type Pipeline,
  type PipelineRun,
  type PipelineStage,
  type PipelineEvent,
  type Environment,
} from './ci-cd-pipeline';
import {
  intelligentDeployer,
  type DeploymentRecord,
  type DeploymentStrategyType,
  type HealthCheckStatus,
} from './intelligent-deployment';
import {
  autoRollback,
  type RollbackCondition,
  type RollbackEvent,
  type RollbackMetric,
} from './auto-rollback';
import { designTokens } from '@topems/tokens';
import { alpha } from '@mui/material/styles';

type TabId = 'pipelines' | 'deployments' | 'rollbacks' | 'health';

const V55_BADGE = 'V55';

export const V55AutomationPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = React.useState<TabId>('pipelines');
  const [pipelines, setPipelines] = React.useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = React.useState<Pipeline | null>(null);
  const [runs, setRuns] = React.useState<PipelineRun[]>([]);
  const [deployments, setDeployments] = React.useState<DeploymentRecord[]>([]);
  const [rollbackEvents, setRollbackEvents] = React.useState<RollbackEvent[]>([]);
  const [healthStatus, setHealthStatus] = React.useState<
    Record<
      string,
      {
        status: HealthCheckStatus;
        last_check: string;
      }
    >
  >({});
  const [showCreatePipeline, setShowCreatePipeline] = React.useState(false);
  const [showDeployDialog, setShowDeployDialog] = React.useState(false);
  const [autoRollbackEnabled, setAutoRollbackEnabled] = React.useState(autoRollback.isEnabled());
  const [metrics, setMetrics] = React.useState<Record<string, number>>({
    error_rate: 0.5,
    latency_p99: 120,
    cpu_usage: 45,
    memory_usage: 62,
    request_rate: 1200,
  });

  const refreshAll = React.useCallback(() => {
    setPipelines(ciPipeline.listPipelines());
    setRuns(ciPipeline.getRunHistory(undefined, 50));
    setDeployments(intelligentDeployer.getDeploymentHistory(undefined, 50));
    setRollbackEvents(autoRollback.getRollbackHistory(undefined, 50));

    const statusMap: Record<string, { status: HealthCheckStatus; last_check: string }> = {};
    for (const dep of intelligentDeployer.getDeploymentHistory()) {
      const hs = autoRollback.getHealthStatus(dep.id);
      statusMap[dep.id] = { status: hs.status, last_check: hs.last_check };
    }
    setHealthStatus(statusMap);
  }, []);

  React.useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 3000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  React.useEffect(() => {
    const unsubs: Array<() => void> = [];
    const eventTypes: PipelineEvent['type'][] = [
      'pipeline_created',
      'pipeline_started',
      'stage_completed',
      'stage_failed',
      'pipeline_completed',
      'pipeline_failed',
      'run_cancelled',
    ];
    for (const type of eventTypes) {
      unsubs.push(ciPipeline.on(type, () => refreshAll()));
    }
    return () => unsubs.forEach((fn) => fn());
  }, [refreshAll]);

  const handleRunPipeline = async (pipelineId: string) => {
    try {
      await ciPipeline.runPipeline(pipelineId, 'manual');
      setTimeout(refreshAll, 100);
    } catch (err) {
      console.error('Failed to run pipeline:', err);
    }
  };

  const handleCancelRun = (runId: string) => {
    ciPipeline.cancelRun(runId);
    refreshAll();
  };

  const handleDeploy = async (params: {
    name: string;
    version: string;
    environment: Environment;
    strategy?: DeploymentStrategyType;
  }) => {
    await intelligentDeployer.deploy(params);
    setShowDeployDialog(false);
    setTimeout(refreshAll, 2000);
  };

  const handleRollback = async (deploymentId: string) => {
    await intelligentDeployer.rollback(deploymentId);
    refreshAll();
  };

  const handleSetAutoRollback = (enabled: boolean) => {
    if (enabled) {
      autoRollback.enableAutoRollback();
    } else {
      autoRollback.disableAutoRollback();
    }
    setAutoRollbackEnabled(enabled);
  };

  const handleSimulateMetric = (metric: RollbackMetric, value: number) => {
    autoRollback.setMetricValue(metric, value);
    setMetrics((prev) => ({ ...prev, [metric]: value }));
  };

  const configureDefaultConditions = () => {
    const conditions: RollbackCondition[] = [
      { metric: 'error_rate', threshold: 5, comparison: 'gt', duration_window: 5, enabled: true },
      {
        metric: 'latency_p99',
        threshold: 500,
        comparison: 'gt',
        duration_window: 5,
        enabled: true,
      },
      { metric: 'cpu_usage', threshold: 90, comparison: 'gt', duration_window: 3, enabled: true },
      {
        metric: 'memory_usage',
        threshold: 85,
        comparison: 'gt',
        duration_window: 5,
        enabled: true,
      },
    ];
    autoRollback.configureConditions(conditions);
  };

  React.useEffect(() => {
    configureDefaultConditions();
  }, []);

  const pipelineStats = React.useMemo(() => {
    const total = pipelines.length;
    const running = pipelines.filter((p) => p.status === 'running').length;
    const completed = runs.filter((r) => r.status === 'completed').length;
    const failed = runs.filter((r) => r.status === 'failed').length;
    return { total, running, completed, failed };
  }, [pipelines, runs]);

  const deploymentStats = React.useMemo(() => {
    const total = deployments.length;
    const active = deployments.filter(
      (d) => d.status === 'deploying' || d.status === 'verifying'
    ).length;
    const rolled = deployments.filter((d) => d.rollback_count > 0).length;
    return { total, active, rolled };
  }, [deployments]);

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
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <V55PanelHeader onClose={onClose} />

        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'grey.50' }}>
          <Tabs
            value={activeTab}
            onChange={(_, tab) => setActiveTab(tab as TabId)}
            variant='fullWidth'
          >
            <Tab
              value='pipelines'
              label={i18n.t('fullstack_automation.v55_automation_panel.cicd_0')}
              icon={<GitBranch size={16} />}
              iconPosition='start'
            />
            <Tab
              value='deployments'
              label={i18n.t('pages.v55_automation_panel.k0')}
              icon={<Rocket size={16} />}
              iconPosition='start'
            />
            <Tab
              value='rollbacks'
              label={i18n.t('pages.v55_automation_panel.k1')}
              icon={<RotateCcw size={16} />}
              iconPosition='start'
            />
            <Tab
              value='health'
              label={i18n.t('pages.v55_automation_panel.k2')}
              icon={<Activity size={16} />}
              iconPosition='start'
            />
          </Tabs>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            {activeTab === 'pipelines' && (
              <PipelinesTab
                pipelines={pipelines}
                runs={runs}
                selectedPipeline={selectedPipeline}
                setSelectedPipeline={setSelectedPipeline}
                onRunPipeline={handleRunPipeline}
                onCancelRun={handleCancelRun}
                onCreatePipeline={() => setShowCreatePipeline(true)}
                stats={pipelineStats}
              />
            )}
            {activeTab === 'deployments' && (
              <DeploymentsTab
                deployments={deployments}
                onDeploy={() => setShowDeployDialog(true)}
                onRollback={handleRollback}
                stats={deploymentStats}
              />
            )}
            {activeTab === 'rollbacks' && (
              <RollbacksTab
                events={rollbackEvents}
                autoEnabled={autoRollbackEnabled}
                onToggleAuto={handleSetAutoRollback}
                onConfigure={configureDefaultConditions}
              />
            )}
            {activeTab === 'health' && (
              <HealthTab
                metrics={metrics}
                onSimulateMetric={handleSimulateMetric}
                healthStatus={healthStatus}
                deployments={deployments}
              />
            )}
          </Box>
        </Box>
      </Box>

      {showCreatePipeline && (
        <CreatePipelineDialog
          onClose={() => setShowCreatePipeline(false)}
          onCreated={(pipeline) => {
            setShowCreatePipeline(false);
            ciPipeline.createPipeline(pipeline);
            setTimeout(refreshAll, 100);
          }}
        />
      )}

      {showDeployDialog && (
        <DeployDialog
          onClose={() => setShowDeployDialog(false)}
          onDeploy={handleDeploy}
        />
      )}
    </Box>
  );
};

const V55PanelHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Box
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: `linear-gradient(135deg, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.main}, ${designTokens.colors.pink['500']})`,
      color: 'common.white',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Zap size={20} />
      <Typography
        variant='h6'
        sx={{ fontWeight: 600 }}
      >
        {i18n.t('fullstack_automation.v55_automation_panel.v550_1')}
      </Typography>
      <Chip
        label={V55_BADGE}
        color='warning'
        size='small'
      />
      <Typography
        variant='caption'
        sx={{ opacity: 0.8 }}
      >
        {i18n.t('fullstack_automation.v55_automation_panel.k2')}
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

const PipelinesTab: React.FC<{
  pipelines: Pipeline[];
  runs: PipelineRun[];
  selectedPipeline: Pipeline | null;
  setSelectedPipeline: (p: Pipeline | null) => void;
  onRunPipeline: (id: string) => void;
  onCancelRun: (id: string) => void;
  onCreatePipeline: () => void;
  stats: { total: number; running: number; completed: number; failed: number };
}> = ({
  pipelines,
  runs,
  selectedPipeline,
  setSelectedPipeline,
  onRunPipeline,
  onCancelRun,
  onCreatePipeline,
  stats,
}) => (
  <Box sx={{ p: 3 }}>
    <Grid
      container
      spacing={2}
      sx={{ mb: 2 }}
    >
      <Grid size={{ xs: 6, md: 3 }}>
        <StatCard
          icon={<Layers size={20} />}
          label={i18n.t('pages.v55_automation_panel.k3')}
          value={stats.total}
          color={designTokens.colors.secondary.dark}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatCard
          icon={<Play size={20} />}
          label={i18n.t('pages.v55_automation_panel.k4')}
          value={stats.running}
          color={`${designTokens.colors.info.main}`}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatCard
          icon={<CheckCircle2 size={20} />}
          label={i18n.t('pages.v55_automation_panel.k5')}
          value={stats.completed}
          color={designTokens.colors.success.dark}
        />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <StatCard
          icon={<XCircle size={20} />}
          label={i18n.t('pages.v55_automation_panel.k6')}
          value={stats.failed}
          color={designTokens.colors.error.main}
        />
      </Grid>
    </Grid>

    <Card variant='outlined'>
      <CardHeader
        title={i18n.t('fullstack_automation.v55_automation_panel.cicd_3')}
        subheader={`${pipelines.length} ${i18n.t('fullstack_automation.v55_automation_panel.k4')}`}
        action={
          <Button
            variant='contained'
            size='small'
            startIcon={<Plus size={14} />}
            onClick={onCreatePipeline}
          >
            {i18n.t('fullstack_automation.v55_automation_panel.k5')}
          </Button>
        }
      />
      <CardContent>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k7')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k8')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k9')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k10')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k11')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k12')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pipelines.length === 0 ? (
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
                      {i18n.t('fullstack_automation.v55_automation_panel.k6')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                pipelines.map((p) => (
                  <TableRow
                    key={p.id}
                    hover
                    onClick={() => setSelectedPipeline(p)}
                    sx={{ cursor: 'pointer' }}
                    selected={selectedPipeline?.id === p.id}
                  >
                    <TableCell>
                      <Typography
                        variant='caption'
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {p.id}
                      </Typography>
                    </TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={p.environment}
                        color={
                          p.environment === 'prod'
                            ? 'error'
                            : p.environment === 'staging'
                              ? 'warning'
                              : 'info'
                        }
                        size='small'
                      />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={p.status} />
                    </TableCell>
                    <TableCell>{p.stages.length}</TableCell>
                    <TableCell>
                      <Typography variant='caption'>
                        {new Date(p.created_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Stack
                        direction='row'
                        spacing={1}
                      >
                        <Tooltip title={i18n.t('pages.v55_automation_panel.k13')}>
                          <IconButton
                            size='small'
                            onClick={() => onRunPipeline(p.id)}
                          >
                            <Play
                              size={16}
                              color={designTokens.colors.success.dark}
                            />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>

    {selectedPipeline && (
      <Card
        variant='outlined'
        sx={{ mt: 2 }}
      >
        <CardHeader
          title={`${i18n.t('fullstack_automation.v55_automation_panel.k7')} ${selectedPipeline.name}`}
          subheader={selectedPipeline.description || selectedPipeline.id}
        />
        <CardContent>
          <Typography
            variant='subtitle2'
            sx={{ mb: 1, fontWeight: 600 }}
          >
            {i18n.t('fullstack_automation.v55_automation_panel.k8')}
          </Typography>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}
          >
            {selectedPipeline.stages.map((stage) => (
              <Chip
                key={stage.name}
                label={`${stage.name} (${stage.type})`}
                size='small'
                color={
                  stage.status === 'completed'
                    ? 'success'
                    : stage.status === 'running'
                      ? 'primary'
                      : 'default'
                }
                variant={stage.status === 'idle' ? 'outlined' : 'filled'}
              />
            ))}
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Typography
            variant='subtitle2'
            sx={{ mb: 1, fontWeight: 600 }}
          >
            {i18n.t('fullstack_automation.v55_automation_panel.k9')}
          </Typography>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.id_14')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.k15')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.k16')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.k17')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.k18')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {runs
                  .filter((r) => r.pipeline_id === selectedPipeline.id)
                  .slice(0, 10)
                  .map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <Typography
                          variant='caption'
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {run.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={run.status} />
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption'>
                          {new Date(run.started_at).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption'>
                          {run.ended_at
                            ? `${Math.round((new Date(run.ended_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
                            : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {run.status === 'running' && (
                          <Tooltip title={i18n.t('pages.v55_automation_panel.k19')}>
                            <IconButton
                              size='small'
                              onClick={() => onCancelRun(run.id)}
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
                  ))}
                {runs.filter((r) => r.pipeline_id === selectedPipeline.id).length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align='center'
                    >
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('fullstack_automation.v55_automation_panel.k10')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    )}

    <Card
      variant='outlined'
      sx={{ mt: 2 }}
    >
      <CardHeader
        title={i18n.t('pages.v55_automation_panel.k20')}
        subheader={i18n.t('pages.v55_automation_panel.k21')}
      />
      <CardContent>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k22')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k23')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k24')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k25')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k26')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {runs.slice(0, 15).map((run) => {
                const completedCount = run.stages_run.filter(
                  (s) => s.status === 'completed'
                ).length;
                const totalCount = run.stages_run.length;
                const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
                return (
                  <TableRow key={run.id}>
                    <TableCell>{run.pipeline_name}</TableCell>
                    <TableCell>
                      <Chip
                        label={run.environment}
                        size='small'
                      />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={run.status} />
                    </TableCell>
                    <TableCell sx={{ minWidth: 150 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant='determinate'
                          value={progress}
                          sx={{ flex: 1, height: 6, borderRadius: 3 }}
                          color={
                            run.status === 'failed'
                              ? 'error'
                              : run.status === 'completed'
                                ? 'success'
                                : 'primary'
                          }
                        />
                        <Typography variant='caption'>{Math.round(progress)}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant='caption'>
                        {new Date(run.started_at).toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
              {runs.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align='center'
                  >
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('fullstack_automation.v55_automation_panel.k11')}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  </Box>
);

const DeploymentsTab: React.FC<{
  deployments: DeploymentRecord[];
  onDeploy: () => void;
  onRollback: (id: string) => void;
  stats: { total: number; active: number; rolled: number };
}> = ({ deployments, onDeploy, onRollback, stats }) => (
  <Box sx={{ p: 3 }}>
    <Grid
      container
      spacing={2}
      sx={{ mb: 2 }}
    >
      <Grid size={{ xs: 4, md: 4 }}>
        <StatCard
          icon={<Server size={20} />}
          label={i18n.t('pages.v55_automation_panel.k27')}
          value={stats.total}
          color={designTokens.colors.secondary.dark}
        />
      </Grid>
      <Grid size={{ xs: 4, md: 4 }}>
        <StatCard
          icon={<Rocket size={20} />}
          label={i18n.t('pages.v55_automation_panel.k28')}
          value={stats.active}
          color={`${designTokens.colors.info.main}`}
        />
      </Grid>
      <Grid size={{ xs: 4, md: 4 }}>
        <StatCard
          icon={<RotateCcw size={20} />}
          label={i18n.t('pages.v55_automation_panel.k29')}
          value={stats.rolled}
          color={designTokens.colors.warning.main}
        />
      </Grid>
    </Grid>

    <Card variant='outlined'>
      <CardHeader
        title={i18n.t('pages.v55_automation_panel.k30')}
        subheader={i18n.t('pages.v55_automation_panel.k31')}
        action={
          <Button
            variant='contained'
            size='small'
            startIcon={<Rocket size={14} />}
            onClick={onDeploy}
          >
            {i18n.t('fullstack_automation.v55_automation_panel.k12')}
          </Button>
        }
      />
      <CardContent>
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k32')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k33')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k34')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k35')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k36')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k37')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k38')}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {i18n.t('pages.v55_automation_panel.k39')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deployments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    align='center'
                    sx={{ py: 4 }}
                  >
                    <Typography
                      variant='body2'
                      color='text.secondary'
                    >
                      {i18n.t('fullstack_automation.v55_automation_panel.k13')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                deployments.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.name}</TableCell>
                    <TableCell>
                      <Typography
                        variant='caption'
                        sx={{ fontFamily: 'monospace' }}
                      >
                        {d.version}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={d.strategy}
                        color='info'
                        size='small'
                        icon={<GitBranch size={12} />}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={d.environment}
                        size='small'
                      />
                    </TableCell>
                    <TableCell>
                      <DeploymentStatusChip status={d.status} />
                    </TableCell>
                    <TableCell>
                      <Stack
                        direction='column'
                        spacing={0.5}
                      >
                        {d.units.slice(0, 3).map((u) => (
                          <Box
                            key={u.name}
                            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                          >
                            <Typography
                              variant='caption'
                              sx={{ width: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}
                            >
                              {u.name}
                            </Typography>
                            <LinearProgress
                              variant='determinate'
                              value={u.traffic_percentage}
                              sx={{ width: 60, height: 4, borderRadius: 2 }}
                              color={
                                u.health_status === 'healthy'
                                  ? 'success'
                                  : u.health_status === 'unhealthy'
                                    ? 'error'
                                    : 'primary'
                              }
                            />
                            <Typography variant='caption'>{u.traffic_percentage}%</Typography>
                          </Box>
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {d.rollback_count > 0 ? (
                        <Chip
                          label={`${d.rollback_count}${i18n.t('fullstack_automation.v55_automation_panel.k14')}`}
                          color='warning'
                          size='small'
                        />
                      ) : (
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          0
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack
                        direction='row'
                        spacing={1}
                      >
                        {(d.status === 'deploying' || d.status === 'verifying') && (
                          <Tooltip title={i18n.t('pages.v55_automation_panel.k40')}>
                            <IconButton
                              size='small'
                              onClick={() => onRollback(d.id)}
                            >
                              <RotateCcw
                                size={16}
                                color={designTokens.colors.error.main}
                              />
                            </IconButton>
                          </Tooltip>
                        )}
                        {d.status === 'completed' &&
                          d.units.some((u) => u.status === 'deploying') && (
                            <Tooltip title={i18n.t('pages.v55_automation_panel.k41')}>
                              <IconButton size='small'>
                                <TrendingUp
                                  size={16}
                                  color={designTokens.colors.success.dark}
                                />
                              </IconButton>
                            </Tooltip>
                          )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>

    <Card
      variant='outlined'
      sx={{ mt: 2 }}
    >
      <CardHeader title={i18n.t('pages.v55_automation_panel.k42')} />
      <CardContent>
        <Grid
          container
          spacing={2}
        >
          <Grid size={{ xs: 12, md: 4 }}>
            <PolicyCard
              icon={<GitBranch size={24} />}
              color={designTokens.colors.secondary.dark}
              title={i18n.t('pages.v55_automation_panel.k43')}
              description={i18n.t('pages.v55_automation_panel.k44')}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <PolicyCard
              icon={<Activity size={24} />}
              color={`${designTokens.colors.info.main}`}
              title={i18n.t('pages.v55_automation_panel.k45')}
              description={i18n.t('pages.v55_automation_panel.k46')}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <PolicyCard
              icon={<RefreshCw size={24} />}
              color={designTokens.colors.success.dark}
              title={i18n.t('pages.v55_automation_panel.k47')}
              description={i18n.t('pages.v55_automation_panel.k48')}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  </Box>
);

const RollbacksTab: React.FC<{
  events: RollbackEvent[];
  autoEnabled: boolean;
  onToggleAuto: (enabled: boolean) => void;
  onConfigure: () => void;
}> = ({ events, autoEnabled, onToggleAuto, onConfigure }) => {
  const conditions = autoRollback.getConditions();

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
            label={i18n.t('pages.v55_automation_panel.k49')}
            value={
              autoEnabled
                ? i18n.t('pages.v55_automation_panel.k51')
                : i18n.t('pages.v55_automation_panel.k50')
            }
            color={
              autoEnabled ? designTokens.colors.success.dark : `${designTokens.colors.grey['400']}`
            }
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<AlertTriangle size={20} />}
            label={i18n.t('pages.v55_automation_panel.k52')}
            value={conditions.length}
            color={designTokens.colors.warning.main}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<RotateCcw size={20} />}
            label={i18n.t('pages.v55_automation_panel.k53')}
            value={events.length}
            color={designTokens.colors.secondary.dark}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<Clock size={20} />}
            label={i18n.t('pages.v55_automation_panel.k54')}
            value={
              events[0]?.rollback_duration_ms
                ? `${Math.round(events[0].rollback_duration_ms / 1000)}s`
                : '—'
            }
            color={`${designTokens.colors.info.main}`}
          />
        </Grid>
      </Grid>

      <Card variant='outlined'>
        <CardHeader
          title={i18n.t('pages.v55_automation_panel.k55')}
          action={
            <Stack
              direction='row'
              spacing={1}
              sx={{ alignItems: 'center' }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={autoEnabled}
                    onChange={(e) => onToggleAuto(e.target.checked)}
                    size='small'
                  />
                }
                label={
                  <Typography variant='body2'>
                    {i18n.t('pages.v55_automation_panel.k56')}
                  </Typography>
                }
              />
              <Button
                variant='outlined'
                size='small'
                startIcon={<Settings size={14} />}
                onClick={onConfigure}
              >
                {i18n.t('fullstack_automation.v55_automation_panel.k15')}
              </Button>
            </Stack>
          }
        />
        <CardContent>
          <Typography
            variant='subtitle2'
            sx={{ mb: 2, fontWeight: 600 }}
          >
            {i18n.t('fullstack_automation.v55_automation_panel.k16')}
          </Typography>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.k57')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.k58')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.k59')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.k60')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.k61')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {conditions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align='center'
                    >
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('fullstack_automation.v55_automation_panel.k17')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  conditions.map((c, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Chip
                          label={c.metric}
                          size='small'
                          variant='outlined'
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption'>
                          {c.comparison === 'gt'
                            ? i18n.t('pages.v55_automation_panel.k64')
                            : c.comparison === 'lt'
                              ? i18n.t('pages.v55_automation_panel.k63')
                              : i18n.t('pages.v55_automation_panel.k62')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant='caption'
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {c.threshold}
                        </Typography>
                      </TableCell>
                      <TableCell>{c.duration_window}</TableCell>
                      <TableCell>
                        <Chip
                          label={
                            c.enabled
                              ? i18n.t('pages.v55_automation_panel.k66')
                              : i18n.t('pages.v55_automation_panel.k65')
                          }
                          color={c.enabled ? 'success' : 'default'}
                          size='small'
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card
        variant='outlined'
        sx={{ mt: 2 }}
      >
        <CardHeader title={i18n.t('pages.v55_automation_panel.k67')} />
        <CardContent>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.id_68')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.id_69')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.k70')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.k71')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.k72')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.k73')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      align='center'
                    >
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('fullstack_automation.v55_automation_panel.k18')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Typography
                          variant='caption'
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {e.id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant='caption'
                          sx={{ fontFamily: 'monospace' }}
                        >
                          {e.deployment_id}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack
                          direction='column'
                          spacing={0}
                        >
                          <Chip
                            label={e.trigger.type}
                            color={e.trigger.type === 'manual' ? 'info' : 'warning'}
                            size='small'
                          />
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            sx={{ mt: 0.5 }}
                          >
                            {e.trigger.message}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={e.status}
                          color={
                            e.status === 'completed'
                              ? 'success'
                              : e.status === 'failed'
                                ? 'error'
                                : 'warning'
                          }
                          size='small'
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption'>
                          {e.rollback_duration_ms
                            ? `${Math.round(e.rollback_duration_ms / 1000)}s`
                            : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='caption'>
                          {new Date(e.initiated_at).toLocaleString()}
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
    </Box>
  );
};

const HealthTab: React.FC<{
  metrics: Record<string, number>;
  onSimulateMetric: (metric: RollbackMetric, value: number) => void;
  healthStatus: Record<string, { status: HealthCheckStatus; last_check: string }>;
  deployments: DeploymentRecord[];
}> = ({ metrics, onSimulateMetric, healthStatus, deployments }) => {
  const theme = useTheme();
  const [simulatedValues, setSimulatedValues] = React.useState<Record<string, number>>(metrics);

  React.useEffect(() => {
    setSimulatedValues(metrics);
  }, [metrics]);

  const metricConfigs: Array<{
    key: RollbackMetric;
    label: string;
    unit: string;
    icon: React.ReactNode;
    color: string;
    thresholds: { warning: number; critical: number };
  }> = [
    {
      key: 'error_rate',
      label: i18n.t('pages.v55_automation_panel.k74'),
      unit: '%',
      icon: <XCircle size={18} />,
      color: 'error.500',
      thresholds: { warning: 2, critical: 5 },
    },
    {
      key: 'latency_p99',
      label: i18n.t('fullstack_automation.v55_automation_panel.p99_19'),
      unit: 'ms',
      icon: <Clock size={18} />,
      color: 'warning.500',
      thresholds: { warning: 300, critical: 500 },
    },
    {
      key: 'cpu_usage',
      label: i18n.t('fullstack_automation.v55_automation_panel.cpu_20'),
      unit: '%',
      icon: <Cpu size={18} />,
      color: 'info.500',
      thresholds: { warning: 70, critical: 90 },
    },
    {
      key: 'memory_usage',
      label: i18n.t('pages.v55_automation_panel.k75'),
      unit: '%',
      icon: <HardDrive size={18} />,
      color: 'secondary.500',
      thresholds: { warning: 75, critical: 85 },
    },
    {
      key: 'request_rate',
      label: i18n.t('pages.v55_automation_panel.k76'),
      unit: '/s',
      icon: <Zap size={18} />,
      color: 'teal.500',
      thresholds: { warning: 2000, critical: 5000 },
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Card variant='outlined'>
        <CardHeader
          title={i18n.t('pages.v55_automation_panel.k77')}
          subheader={i18n.t('pages.v55_automation_panel.k78')}
        />
        <CardContent>
          <Grid
            container
            spacing={2}
          >
            {metricConfigs.map((config) => {
              const value = simulatedValues[config.key] ?? 0;
              const isCritical = value >= config.thresholds.critical;
              const isWarning = value >= config.thresholds.warning && !isCritical;
              return (
                <Grid
                  size={{ xs: 12, md: 6, lg: 4 }}
                  key={config.key}
                >
                  <Paper
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: `2px solid ${isCritical ? designTokens.colors.error.main : isWarning ? designTokens.colors.warning.main : 'transparent'}`,
                      bgcolor: isCritical
                        ? alpha(theme.palette.error.main, 0.05)
                        : isWarning
                          ? alpha(theme.palette.warning.main, 0.05)
                          : 'transparent',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Box sx={{ color: config.color }}>{config.icon}</Box>
                      <Typography
                        variant='subtitle2'
                        sx={{ fontWeight: 600 }}
                      >
                        {config.label}
                      </Typography>
                      {isCritical && (
                        <Chip
                          label={i18n.t('pages.v55_automation_panel.k79')}
                          color='error'
                          size='small'
                        />
                      )}
                      {isWarning && (
                        <Chip
                          label={i18n.t('pages.v55_automation_panel.k80')}
                          color='warning'
                          size='small'
                        />
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
                      <Typography
                        variant='h4'
                        sx={{
                          fontWeight: 700,
                          color: isCritical ? designTokens.colors.error.main : 'text.primary',
                        }}
                      >
                        {value.toFixed(config.key === 'error_rate' ? 2 : 0)}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {config.unit}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant='determinate'
                      value={Math.min((value / config.thresholds.critical) * 100, 100)}
                      sx={{ height: 8, borderRadius: 4 }}
                      color={isCritical ? 'error' : isWarning ? 'warning' : 'success'}
                    />
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                      <TextField
                        type='number'
                        size='small'
                        value={value}
                        onChange={(e) => {
                          const newVal = parseFloat(e.target.value) || 0;
                          setSimulatedValues((prev) => ({ ...prev, [config.key]: newVal }));
                          onSimulateMetric(config.key, newVal);
                        }}
                        sx={{ width: 100 }}
                      />
                      <Button
                        size='small'
                        variant='outlined'
                        onClick={() => {
                          const newVal = Math.max(0, value - config.thresholds.critical * 0.1);
                          setSimulatedValues((prev) => ({ ...prev, [config.key]: newVal }));
                          onSimulateMetric(config.key, newVal);
                        }}
                      >
                        ↓
                      </Button>
                      <Button
                        size='small'
                        variant='outlined'
                        onClick={() => {
                          const newVal = value + config.thresholds.critical * 0.1;
                          setSimulatedValues((prev) => ({ ...prev, [config.key]: newVal }));
                          onSimulateMetric(config.key, newVal);
                        }}
                      >
                        ↑
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      <Card
        variant='outlined'
        sx={{ mt: 2 }}
      >
        <CardHeader
          title={i18n.t('pages.v55_automation_panel.k81')}
          subheader={i18n.t('pages.v55_automation_panel.k82')}
        />
        <CardContent>
          <TableContainer>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.k83')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.k84')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.k85')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('pages.v55_automation_panel.k86')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deployments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      align='center'
                    >
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('fullstack_automation.v55_automation_panel.k21')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  deployments.slice(0, 10).map((d) => {
                    const hs = healthStatus[d.id];
                    const overall = hs?.status || 'unknown';
                    return (
                      <TableRow key={d.id}>
                        <TableCell>
                          <Typography variant='body2'>
                            {d.name} v{d.version}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {d.environment} · {d.strategy}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <HealthStatusChip status={overall} />
                        </TableCell>
                        <TableCell>
                          <Typography variant='caption'>
                            {hs?.last_check ? new Date(hs.last_check).toLocaleString() : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack
                            direction='column'
                            spacing={0.5}
                          >
                            {d.units.slice(0, 3).map((u) => (
                              <Box
                                key={u.name}
                                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                              >
                                <HealthStatusDot status={u.health_status} />
                                <Typography variant='caption'>{u.name}</Typography>
                                <Typography
                                  variant='caption'
                                  color='text.secondary'
                                >
                                  · {u.status}
                                </Typography>
                              </Box>
                            ))}
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

      <Card
        variant='outlined'
        sx={{ mt: 2 }}
      >
        <CardHeader title={i18n.t('pages.v55_automation_panel.k87')} />
        <CardContent>
          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 12, md: 4 }}>
              <Alert
                severity='success'
                variant='outlined'
              >
                <strong>{i18n.t('pages.v55_automation_panel.k88')}</strong>所有指标在正常范围内
              </Alert>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Alert
                severity='warning'
                variant='outlined'
              >
                <strong>{i18n.t('pages.v55_automation_panel.k89')}</strong>部分指标接近阈值，需关注
              </Alert>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Alert
                severity='error'
                variant='outlined'
              >
                <strong>{i18n.t('pages.v55_automation_panel.k90')}</strong>
                {i18n.t('pages.v55_automation_panel.k127')}
              </Alert>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

const CreatePipelineDialog: React.FC<{
  onClose: () => void;
  onCreated: (params: {
    name: string;
    stages: Omit<PipelineStage, 'status'>[];
    triggers: string[];
    environment: Environment;
    description?: string;
  }) => void;
}> = ({ onClose, onCreated }) => {
  const [name, setName] = React.useState('');
  const [environment, setEnvironment] = React.useState<Environment>('dev');
  const [description, setDescription] = React.useState('');
  const [stageConfigs, setStageConfigs] = React.useState<
    Array<{
      name: string;
      type: PipelineStage['type'];
      duration: number;
      failRate: number;
      dependsOn: string[];
    }>
  >([
    { name: 'build', type: 'build', duration: 1000, failRate: 0, dependsOn: [] },
    { name: 'test', type: 'test', duration: 1500, failRate: 0, dependsOn: ['build'] },
    { name: 'deploy', type: 'deploy', duration: 2000, failRate: 0, dependsOn: ['test'] },
  ]);

  const addStage = () => {
    setStageConfigs((prev) => [
      ...prev,
      {
        name: `stage_${prev.length + 1}`,
        type: 'build',
        duration: 1000,
        failRate: 0,
        dependsOn: [],
      },
    ]);
  };

  const removeStage = (idx: number) => {
    setStageConfigs((prev) => prev.filter((_, i) => i !== idx));
  };

  const canCreate = name.trim().length > 0 && stageConfigs.length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    onCreated({
      name: name.trim(),
      environment,
      description: description.trim() || undefined,
      triggers: ['manual'],
      stages: stageConfigs.map((s) => ({
        name: s.name,
        type: s.type,
        config: { duration: s.duration, failRate: s.failRate },
        depends_on: s.dependsOn,
      })),
    });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth='md'
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 600 }}>{i18n.t('pages.v55_automation_panel.k91')}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <TextField
            label={i18n.t('pages.v55_automation_panel.k92')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            placeholder={i18n.t('pages.v55_automation_panel.k93')}
          />
          <FormControl fullWidth>
            <InputLabel>{i18n.t('pages.v55_automation_panel.k94')}</InputLabel>
            <Select
              value={environment}
              label={i18n.t('pages.v55_automation_panel.k95')}
              onChange={(e) => setEnvironment(e.target.value as Environment)}
            >
              <MenuItem value='dev'>{i18n.t('pages.v55_automation_panel.dev_96')}</MenuItem>
              <MenuItem value='staging'>{i18n.t('pages.v55_automation_panel.staging_97')}</MenuItem>
              <MenuItem value='prod'>{i18n.t('pages.v55_automation_panel.prod_98')}</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label={i18n.t('pages.v55_automation_panel.k99')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder={i18n.t('pages.v55_automation_panel.k100')}
          />

          <Box>
            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
            >
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                {i18n.t('fullstack_automation.v55_automation_panel.k22')}
              </Typography>
              <Button
                variant='outlined'
                size='small'
                startIcon={<Plus size={14} />}
                onClick={addStage}
              >
                {i18n.t('fullstack_automation.v55_automation_panel.k23')}
              </Button>
            </Box>
            <Stack spacing={1}>
              {stageConfigs.map((stage, idx) => (
                <Paper
                  key={idx}
                  sx={{ p: 2, borderRadius: 2 }}
                >
                  <Grid
                    container
                    spacing={1}
                    sx={{ alignItems: 'center' }}
                  >
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        size='small'
                        label={i18n.t('pages.v55_automation_panel.k101')}
                        value={stage.name}
                        onChange={(e) => {
                          const next = [...stageConfigs];
                          next[idx] = { ...next[idx], name: e.target.value };
                          setStageConfigs(next);
                        }}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <FormControl
                        size='small'
                        fullWidth
                      >
                        <InputLabel>{i18n.t('pages.v55_automation_panel.k102')}</InputLabel>
                        <Select
                          value={stage.type}
                          label={i18n.t('pages.v55_automation_panel.k103')}
                          onChange={(e) => {
                            const next = [...stageConfigs];
                            next[idx] = {
                              ...next[idx],
                              type: e.target.value as PipelineStage['type'],
                            };
                            setStageConfigs(next);
                          }}
                        >
                          <MenuItem value='build'>
                            {i18n.t('pages.v55_automation_panel.k104')}
                          </MenuItem>
                          <MenuItem value='test'>
                            {i18n.t('pages.v55_automation_panel.k105')}
                          </MenuItem>
                          <MenuItem value='deploy'>
                            {i18n.t('pages.v55_automation_panel.k106')}
                          </MenuItem>
                          <MenuItem value='notify'>
                            {i18n.t('pages.v55_automation_panel.k107')}
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField
                        size='small'
                        label={i18n.t('pages.v55_automation_panel.ms_108')}
                        type='number'
                        value={stage.duration}
                        onChange={(e) => {
                          const next = [...stageConfigs];
                          next[idx] = { ...next[idx], duration: parseInt(e.target.value) || 0 };
                          setStageConfigs(next);
                        }}
                        fullWidth
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField
                        size='small'
                        label={i18n.t('pages.v55_automation_panel.k109')}
                        type='number'
                        value={stage.failRate}
                        onChange={(e) => {
                          const next = [...stageConfigs];
                          next[idx] = { ...next[idx], failRate: parseFloat(e.target.value) || 0 };
                          setStageConfigs(next);
                        }}
                        fullWidth
                        slotProps={{ htmlInput: { min: 0, max: 1, step: 0.1 } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }}>
                      <TextField
                        size='small'
                        label={i18n.t('pages.v55_automation_panel.k110')}
                        value={stage.dependsOn.join(',')}
                        onChange={(e) => {
                          const next = [...stageConfigs];
                          next[idx] = {
                            ...next[idx],
                            dependsOn: e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          };
                          setStageConfigs(next);
                        }}
                        fullWidth
                        placeholder={i18n.t('pages.v55_automation_panel.build_111')}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 1 }}>
                      <IconButton
                        onClick={() => removeStage(idx)}
                        color='error'
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          variant='outlined'
          onClick={onClose}
        >
          {i18n.t('fullstack_automation.v55_automation_panel.k24')}
        </Button>
        <Button
          variant='contained'
          onClick={handleCreate}
          disabled={!canCreate}
        >
          {i18n.t('fullstack_automation.v55_automation_panel.k25')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DeployDialog: React.FC<{
  onClose: () => void;
  onDeploy: (params: {
    name: string;
    version: string;
    environment: Environment;
    strategy?: DeploymentStrategyType;
  }) => void;
}> = ({ onClose, onDeploy }) => {
  const [name, setName] = React.useState('');
  const [version, setVersion] = React.useState('');
  const [environment, setEnvironment] = React.useState<Environment>('staging');
  const [strategy, setStrategy] = React.useState<DeploymentStrategyType | ''>('');

  const canDeploy = name.trim().length > 0 && version.trim().length > 0;

  const handleDeploy = () => {
    if (!canDeploy) return;
    onDeploy({
      name: name.trim(),
      version: version.trim(),
      environment,
      strategy: strategy || undefined,
    });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth='sm'
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: 600 }}>
        {i18n.t('pages.v55_automation_panel.k112')}
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          <TextField
            label={i18n.t('pages.v55_automation_panel.k113')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            placeholder={i18n.t('pages.v55_automation_panel.apigateway_114')}
          />
          <TextField
            label={i18n.t('pages.v55_automation_panel.k115')}
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            fullWidth
            placeholder={i18n.t('fullstack_automation.v55_automation_panel.v100_26')}
          />
          <FormControl fullWidth>
            <InputLabel>{i18n.t('pages.v55_automation_panel.k116')}</InputLabel>
            <Select
              value={environment}
              label={i18n.t('pages.v55_automation_panel.k117')}
              onChange={(e) => setEnvironment(e.target.value as Environment)}
            >
              <MenuItem value='dev'>{i18n.t('pages.v55_automation_panel.dev_118')}</MenuItem>
              <MenuItem value='staging'>
                {i18n.t('pages.v55_automation_panel.staging_119')}
              </MenuItem>
              <MenuItem value='prod'>{i18n.t('pages.v55_automation_panel.prod_120')}</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>{i18n.t('pages.v55_automation_panel.k121')}</InputLabel>
            <Select
              value={strategy}
              label={i18n.t('pages.v55_automation_panel.k122')}
              onChange={(e) => setStrategy(e.target.value as DeploymentStrategyType)}
            >
              <MenuItem value=''>{i18n.t('pages.v55_automation_panel.k123')}</MenuItem>
              <MenuItem value='blue-green'>{i18n.t('pages.v55_automation_panel.k124')}</MenuItem>
              <MenuItem value='canary'>{i18n.t('pages.v55_automation_panel.k125')}</MenuItem>
              <MenuItem value='rolling'>{i18n.t('pages.v55_automation_panel.k126')}</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          variant='outlined'
          onClick={onClose}
        >
          {i18n.t('fullstack_automation.v55_automation_panel.k27')}
        </Button>
        <Button
          variant='contained'
          startIcon={<Rocket size={14} />}
          onClick={handleDeploy}
          disabled={!canDeploy}
        >
          {i18n.t('fullstack_automation.v55_automation_panel.k28')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}> = ({ icon, label, value, color }) => (
  <Paper
    sx={{
      p: 2,
      borderRadius: 2,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
    }}
  >
    <Box
      sx={{
        p: 1,
        borderRadius: 2,
        bgcolor: `${color}15`,
        color,
        display: 'flex',
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography
        variant='caption'
        color='text.secondary'
      >
        {label}
      </Typography>
      <Typography
        variant='h5'
        sx={{ fontWeight: 700, lineHeight: 1.2 }}
      >
        {value}
      </Typography>
    </Box>
  </Paper>
);

const PolicyCard: React.FC<{
  icon: React.ReactNode;
  color: string;
  title: string;
  description: string;
}> = ({ icon, color, title, description }) => (
  <Paper
    sx={{
      p: 2,
      borderRadius: 2,
      border: '1px solid',
      borderColor: 'divider',
      display: 'flex',
      gap: 2,
    }}
  >
    <Box sx={{ color, flexShrink: 0 }}>{icon}</Box>
    <Box>
      <Typography
        variant='subtitle2'
        sx={{ fontWeight: 600 }}
      >
        {title}
      </Typography>
      <Typography
        variant='body2'
        color='text.secondary'
      >
        {description}
      </Typography>
    </Box>
  </Paper>
);

const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const colorMap: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
    idle: 'default',
    running: 'info',
    completed: 'success',
    failed: 'error',
    cancelled: 'warning',
    paused: 'warning',
    pending: 'default',
  };
  return (
    <Chip
      label={status}
      color={colorMap[status] || 'default'}
      size='small'
    />
  );
};

const DeploymentStatusChip: React.FC<{ status: string }> = ({ status }) => {
  const colorMap: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
    deploying: 'info',
    verifying: 'warning',
    promoting: 'warning',
    rolling_back: 'error',
    completed: 'success',
    failed: 'error',
  };
  return (
    <Chip
      label={status}
      color={colorMap[status] || 'default'}
      size='small'
    />
  );
};

const HealthStatusChip: React.FC<{ status: HealthCheckStatus }> = ({ status }) => {
  const colorMap: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
    healthy: 'success',
    unhealthy: 'error',
    degraded: 'warning',
    unknown: 'info',
  };
  return (
    <Chip
      label={status}
      color={colorMap[status] || 'info'}
      size='small'
    />
  );
};

const HealthStatusDot: React.FC<{ status: HealthCheckStatus }> = ({ status }) => {
  const colorMap: Record<string, string> = {
    healthy: designTokens.colors.success.dark,
    unhealthy: designTokens.colors.error.main,
    degraded: designTokens.colors.warning.main,
    unknown: `${designTokens.colors.grey['400']}`,
  };
  return (
    <Box
      sx={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        bgcolor: colorMap[status],
      }}
    />
  );
};

export default V55AutomationPanel;
