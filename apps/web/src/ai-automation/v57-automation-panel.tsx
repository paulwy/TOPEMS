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
} from '@mui/material';
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
import { V51Card, V51Tabs, V51Button, V51Badge } from '../design-system/components';
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
        bgcolor: 'rgba(0,0,0,0.5)',
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
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <V57PanelHeader onClose={onClose} />

        <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'grey.50' }}>
          <V51Tabs
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as TabId)}
            variant='fullWidth'
            tabs={[
              {
                id: 'tests',
                label: '智能测试',
                icon: <TestTube size={16} />,
                content: <TestsTab />,
              },
              {
                id: 'ci',
                label: 'CI 流水线',
                icon: <GitBranch size={16} />,
                content: <CITab />,
              },
              {
                id: 'quality',
                label: '质量门禁',
                icon: <Shield size={16} />,
                content: <QualityTab />,
              },
              {
                id: 'trends',
                label: '趋势分析',
                icon: <TrendingUp size={16} />,
                content: <TrendsTab />,
              },
            ]}
          />
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
      background: 'linear-gradient(135deg, #10b981, #059669, #0d9488)',
      color: 'white',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Zap size={20} />
      <Typography
        variant='h6'
        sx={{ fontWeight: 600 }}
      >
        V57.0 AI 前端自动化
      </Typography>
      <V51Badge
        label={V57_BADGE}
        variant='success'
        size='sm'
      />
      <Typography
        variant='caption'
        sx={{ opacity: 0.8 }}
      >
        智能测试 · CI/CD · 质量门禁 · 趋势分析
      </Typography>
    </Box>
    <IconButton
      size='small'
      onClick={onClose}
      sx={{ color: 'white' }}
    >
      <XIcon size={20} />
    </IconButton>
  </Box>
);

const TestsTab: React.FC = () => {
  const [scenarios, setScenarios] = React.useState<TestScenario[]>([]);
  const [results, setResults] = React.useState<TestResult[]>([]);
  const [coverage, setCoverage] = React.useState<CoverageReport | null>(null);
  const [stats, setStats] = React.useState(smartTester.get_stats());
  const [selectedScenario, setSelectedScenario] = React.useState<TestScenario | null>(null);
  const [failureAnalysis, setFailureAnalysis] = React.useState<FailureAnalysis | null>(null);
  const [filterType, setFilterType] = React.useState<TestType | 'all'>('all');
  const [showGenerate, setShowGenerate] = React.useState(false);

  const refresh = React.useCallback(() => {
    setScenarios(smartTester.list_scenarios());
    setResults(smartTester.get_test_results());
    setCoverage(smartTester.get_coverage());
    setStats(smartTester.get_stats());
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
    const all = smartTester.list_scenarios();
    const ids = all.map((s) => s.id);
    await smartTester.run_tests(ids);
    refresh();
  };

  const handleRunScenario = async (id: string) => {
    await smartTester.run_tests([id]);
    refresh();
  };

  const handleSelectScenario = (scenario: TestScenario) => {
    setSelectedScenario(scenario);
    const analysis = smartTester.get_failure_analysis(scenario.id);
    setFailureAnalysis(analysis);
  };

  const handleGenerate = (count: number, module: string) => {
    smartTester.generate_tests({ count, module });
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
            label='测试场景'
            value={stats.total}
            color='#10b981'
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<CheckCircle2 size={20} />}
            label='通过率'
            value={`${passRate.toFixed(1)}%`}
            color='#059669'
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<XCircle size={20} />}
            label='失败数'
            value={failedCount}
            color='#ef4444'
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<Activity size={20} />}
            label='行覆盖率'
            value={coverage ? `${coverage.line_coverage.toFixed(1)}%` : '—'}
            color='#0ea5e9'
          />
        </Grid>
      </Grid>

      <V51Card
        title='测试场景列表'
        subtitle={`${filteredScenarios.length} 个场景 (${stats.by_type.unit} 单元, ${stats.by_type.integration} 集成, ${stats.by_type.e2e} E2E)`}
        headerAction={
          <Stack
            direction='row'
            spacing={1}
          >
            <FormControl
              size='small'
              sx={{ minWidth: 100 }}
            >
              <InputLabel>类型</InputLabel>
              <Select
                value={filterType}
                label='类型'
                onChange={(e) => setFilterType(e.target.value as TestType | 'all')}
              >
                <MenuItem value='all'>全部</MenuItem>
                <MenuItem value='unit'>单元测试</MenuItem>
                <MenuItem value='integration'>集成测试</MenuItem>
                <MenuItem value='e2e'>E2E 测试</MenuItem>
              </Select>
            </FormControl>
            <V51Button
              variant='outline'
              size='sm'
              startIcon={<Plus size={14} />}
              onClick={() => setShowGenerate(true)}
            >
              AI 生成
            </V51Button>
            <V51Button
              variant='primary'
              size='sm'
              startIcon={<Play size={14} />}
              onClick={handleRunAll}
            >
              运行全部
            </V51Button>
          </Stack>
        }
      >
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>优先级</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>步骤</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>模块</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
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
                      暂无测试场景
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
                      <Tooltip title='运行'>
                        <IconButton
                          size='small'
                          onClick={() => handleRunScenario(s.id)}
                        >
                          <Play
                            size={16}
                            color='#10b981'
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
      </V51Card>

      {selectedScenario && (
        <V51Card
          title={`场景详情: ${selectedScenario.name}`}
          subtitle={selectedScenario.expected_result}
          sx={{ mt: 2 }}
        >
          <Typography
            variant='subtitle2'
            sx={{ mb: 1, fontWeight: 600 }}
          >
            执行步骤
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
                    bgcolor: '#10b981',
                    color: 'white',
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
                sx={{ mb: 1, fontWeight: 600, color: '#ef4444' }}
              >
                失败分析
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
        </V51Card>
      )}

      {coverage && (
        <V51Card
          title='覆盖率报告'
          sx={{ mt: 2 }}
        >
          <Grid
            container
            spacing={2}
          >
            <Grid size={{ xs: 12, md: 4 }}>
              <CoverageGauge
                label='行覆盖率'
                value={coverage.line_coverage}
                color='#10b981'
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <CoverageGauge
                label='分支覆盖率'
                value={coverage.branch_coverage}
                color='#0ea5e9'
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <CoverageGauge
                label='函数覆盖率'
                value={coverage.function_coverage}
                color='#8b5cf6'
              />
            </Grid>
          </Grid>
        </V51Card>
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
    setConfigs(ciIntegrator.list_configs());
    setRuns(ciIntegrator.get_run_history());
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
    ciIntegrator.trigger_pipeline(pipelineName, 'manual');
    setTimeout(refresh, 100);
  };

  const handleCancel = (runId: string) => {
    ciIntegrator.cancel_pipeline(runId);
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
            label='流水线'
            value={configs.length}
            color='#6366f1'
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<Activity size={20} />}
            label='运行中'
            value={stats.running}
            color='#0ea5e9'
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<CheckCircle2 size={20} />}
            label='成功'
            value={stats.success}
            color='#10b981'
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<XCircle size={20} />}
            label='失败'
            value={stats.failed}
            color='#ef4444'
          />
        </Grid>
      </Grid>

      <V51Card
        title='CI 流水线配置'
        subtitle={`${configs.length} 个流水线`}
        headerAction={
          <V51Button
            variant='primary'
            size='sm'
            startIcon={<Plus size={14} />}
            onClick={() => setShowConfigDialog(true)}
          >
            新建流水线
          </V51Button>
        }
      >
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>名称</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Provider</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>触发</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>分支</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>阶段</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>环境</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
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
                      暂无流水线配置
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
                      <V51Badge
                        label={c.environment || '—'}
                        size='sm'
                        variant={c.environment === 'production' ? 'error' : 'info'}
                      />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Tooltip title='触发运行'>
                        <IconButton
                          size='small'
                          onClick={() => handleTrigger(c.pipeline)}
                        >
                          <Play
                            size={16}
                            color='#10b981'
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
      </V51Card>

      <V51Card
        title='最近运行记录'
        subtitle={`${runs.length} 条记录`}
        sx={{ mt: 2 }}
      >
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>运行 ID</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>流水线</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>阶段进度</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>耗时</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>产物</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
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
                      暂无运行记录，点击上方"触发"按钮启动流水线
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
                          <Tooltip title='取消'>
                            <IconButton
                              size='small'
                              onClick={() => handleCancel(r.run_id)}
                            >
                              <Square
                                size={16}
                                color='#ef4444'
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
      </V51Card>

      {selectedRun && <RunDetailCard run={selectedRun} />}

      {showConfigDialog && (
        <ConfigPipelineDialog
          onClose={() => setShowConfigDialog(false)}
          onCreated={(config) => {
            ciIntegrator.configure_pipeline(config);
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
  const [summary, setSummary] = React.useState(qualityGate.get_summary());
  const [selectedCriteria, setSelectedCriteria] = React.useState<GateCriteria | null>(null);
  const [showOverride, setShowOverride] = React.useState(false);

  const refresh = React.useCallback(() => {
    setCriteria(qualityGate.list_criteria());
    setResults(qualityGate.get_gate_results());
    setSummary(qualityGate.get_summary());
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleEvaluate = () => {
    qualityGate.evaluate_gate();
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
            label='总规则'
            value={totalCriteria}
            color='#6366f1'
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<CheckCircle2 size={20} />}
            label='通过'
            value={passedCount}
            color='#10b981'
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<AlertTriangle size={20} />}
            label='警告'
            value={warnedCount}
            color='#f59e0b'
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<XCircle size={20} />}
            label='阻塞'
            value={failedCount}
            color='#ef4444'
          />
        </Grid>
      </Grid>

      <V51Card
        title='质量门禁规则'
        subtitle={`${criteria.filter((c) => c.enabled).length}/${totalCriteria} 已启用`}
        headerAction={
          <V51Button
            variant='primary'
            size='sm'
            startIcon={<Gauge size={14} />}
            onClick={handleEvaluate}
          >
            执行门禁
          </V51Button>
        }
      >
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>规则名称</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>指标</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>阈值</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>动作</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>操作</TableCell>
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
                      暂无门禁规则
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
                            未测量
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack
                          direction='row'
                          spacing={0.5}
                        >
                          <Tooltip title='详情'>
                            <IconButton
                              size='small'
                              onClick={() => setSelectedCriteria(c)}
                            >
                              <BarChart3
                                size={16}
                                color='#6366f1'
                              />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='覆盖'>
                            <IconButton
                              size='small'
                              onClick={() => handleOverride(c)}
                            >
                              <Lock
                                size={16}
                                color='#f59e0b'
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
      </V51Card>

      <V51Card
        title='最近门禁结果'
        sx={{ mt: 2 }}
      >
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>规则</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>实际值</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>阈值</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>时间</TableCell>
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
                      暂无门禁结果，点击"执行门禁"开始评估
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
      </V51Card>

      {showOverride && selectedCriteria && (
        <OverrideDialog
          criteria={selectedCriteria}
          onClose={() => {
            setShowOverride(false);
            setSelectedCriteria(null);
          }}
          onOverride={(reason, by) => {
            qualityGate.override_gate(selectedCriteria.id, reason, by);
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
    setCriteria(qualityGate.list_criteria());
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSelectCriteria = (c: GateCriteria) => {
    setSelectedCriteria(c);
    setTrendData(qualityGate.get_trend(c.id, 20));
  };

  const testStats = smartTester.get_stats();
  const ciStats = ciIntegrator.get_stats();
  const gateSummary = qualityGate.get_summary();

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
            label='测试通过'
            value={`${testStats.by_status.passed}/${testStats.total}`}
            color='#10b981'
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<GitBranch size={20} />}
            label='CI 成功率'
            value={`${ciStats.success_rate.toFixed(1)}%`}
            color='#059669'
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<Gauge size={20} />}
            label='CI 平均耗时'
            value={`${Math.round(ciStats.avg_duration_ms / 100) / 10}s`}
            color='#0ea5e9'
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            icon={<Shield size={20} />}
            label='门禁通过率'
            value={`${gateSummary.total_criteria > 0 ? ((gateSummary.status_counts.passed / gateSummary.total_criteria) * 100).toFixed(0) : 0}%`}
            color='#8b5cf6'
          />
        </Grid>
      </Grid>

      <V51Card
        title='质量门禁趋势'
        subtitle={selectedCriteria ? `指标: ${selectedCriteria.name}` : '选择一个门禁规则查看趋势'}
      >
        <Grid
          container
          spacing={2}
        >
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography
              variant='subtitle2'
              sx={{ mb: 1, fontWeight: 600 }}
            >
              门禁规则
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
                    borderColor: selectedCriteria?.id === c.id ? '#10b981' : undefined,
                  }}
                >
                  <GateTypeIcon type={c.type} />
                  <Box sx={{ ml: 1 }}>
                    <Typography variant='body2'>{c.name}</Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      阈值: {c.threshold}
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
                  选择左侧门禁规则查看历史趋势
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </V51Card>

      <V51Card
        title='AI 智能建议'
        sx={{ mt: 2 }}
      >
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
      </V51Card>
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
                stroke='#e5e7eb'
                strokeWidth={1}
              />
              <text
                x={4}
                y={y + 4}
                fontSize={10}
                fill='#9ca3af'
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
          stroke='#ef4444'
          strokeWidth={2}
          strokeDasharray='6,3'
        />
        <text
          x={chartWidth - padding - 60}
          y={thresholdY - 4}
          fontSize={10}
          fill='#ef4444'
        >
          阈值: {data[0]?.threshold}
        </text>

        <path
          d={valuePath}
          fill='none'
          stroke='#10b981'
          strokeWidth={2}
        />

        {data.map((d, i) => (
          <g key={i}>
            <circle
              cx={getX(i)}
              cy={getY(d.value)}
              r={4}
              fill={d.passed ? '#10b981' : '#ef4444'}
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
              fill='#9ca3af'
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
  <V51Card
    title={`运行详情: ${run.run_id.slice(-12)}`}
    subtitle={`${run.pipeline} · ${run.status}`}
    sx={{ mt: 2 }}
  >
    <Grid
      container
      spacing={2}
    >
      <Grid size={{ xs: 12, md: 6 }}>
        <Typography
          variant='subtitle2'
          sx={{ mb: 1, fontWeight: 600 }}
        >
          运行阶段
        </Typography>
        <Typography variant='body2'>
          进度: {run.stages_completed}/{run.total_stages}
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
          耗时: {run.duration_ms > 0 ? `${Math.round(run.duration_ms / 100) / 10}s` : '—'}
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
              暂无产物
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
          构建日志
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
  </V51Card>
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
        bgcolor: 'rgba(0,0,0,0.5)',
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
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          AI 生成测试场景
        </Typography>
        <Stack spacing={2}>
          <TextField
            label='生成数量 (1-20)'
            type='number'
            value={count}
            onChange={(e) => {
              const v = parseInt(e.target.value) || 5;
              setCount(Math.max(1, Math.min(20, v)));
            }}
            fullWidth
          />
          <TextField
            label='模块'
            value={module}
            onChange={(e) => setModule(e.target.value)}
            fullWidth
            placeholder='如：auth, common, api'
          />
        </Stack>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 3 }}>
          <V51Button
            variant='outline'
            onClick={onClose}
          >
            取消
          </V51Button>
          <V51Button
            variant='primary'
            onClick={() => onGenerate(count, module)}
          >
            生成
          </V51Button>
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
        bgcolor: 'rgba(0,0,0,0.5)',
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
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          新建 CI 流水线
        </Typography>
        <Stack spacing={2}>
          <TextField
            label='流水线名称'
            value={pipeline}
            onChange={(e) => setPipeline(e.target.value)}
            fullWidth
            placeholder='如：TOPEMS Frontend CI'
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
          <V51Button
            variant='outline'
            onClick={onClose}
          >
            取消
          </V51Button>
          <V51Button
            variant='primary'
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
            创建
          </V51Button>
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
        bgcolor: 'rgba(0,0,0,0.5)',
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
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600, mb: 2 }}
        >
          覆盖门禁规则
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2 }}
        >
          规则: <strong>{criteria.name}</strong> ({criteria.type})
        </Typography>
        <Stack spacing={2}>
          <TextField
            label='覆盖原因'
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            multiline
            rows={3}
            placeholder='请输入覆盖原因'
          />
          <TextField
            label='审批人'
            value={by}
            onChange={(e) => setBy(e.target.value)}
            fullWidth
          />
        </Stack>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 3 }}>
          <V51Button
            variant='outline'
            onClick={onClose}
          >
            取消
          </V51Button>
          <V51Button
            variant='primary'
            disabled={!reason.trim()}
            onClick={() => onOverride(reason.trim(), by)}
          >
            确认覆盖
          </V51Button>
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
    unit: '单元',
    integration: '集成',
    e2e: 'E2E',
  };
  return (
    <V51Badge
      label={labels[type]}
      size='sm'
      variant='info'
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
    <V51Badge
      label={priority}
      size='sm'
      variant={variants[priority]}
    />
  );
};

const TestStatusChip: React.FC<{ status: TestStatus }> = ({ status }) => {
  const configs: Record<
    TestStatus,
    { label: string; variant: 'success' | 'error' | 'warning' | 'neutral' }
  > = {
    pending: { label: '等待', variant: 'neutral' },
    running: { label: '运行中', variant: 'warning' },
    passed: { label: '通过', variant: 'success' },
    failed: { label: '失败', variant: 'error' },
    skipped: { label: '跳过', variant: 'neutral' },
  };
  const config = configs[status];
  return (
    <V51Badge
      label={config.label}
      size='sm'
      variant={config.variant}
    />
  );
};

const CIStatusChip: React.FC<{ status: CIStatus }> = ({ status }) => {
  const configs: Record<
    CIStatus,
    { label: string; variant: 'success' | 'error' | 'warning' | 'neutral' }
  > = {
    idle: { label: '空闲', variant: 'neutral' },
    running: { label: '运行中', variant: 'warning' },
    success: { label: '成功', variant: 'success' },
    failed: { label: '失败', variant: 'error' },
    cancelled: { label: '已取消', variant: 'neutral' },
    pending: { label: '等待', variant: 'neutral' },
  };
  const config = configs[status];
  return (
    <V51Badge
      label={config.label}
      size='sm'
      variant={config.variant}
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
    <V51Badge
      label={labels[provider]}
      size='sm'
      variant='info'
    />
  );
};

const GateTypeBadge: React.FC<{ type: GateType }> = ({ type }) => {
  const labels: Record<GateType, { label: string; icon: React.ReactNode }> = {
    coverage: { label: '覆盖率', icon: <TestTube size={12} /> },
    bundle: { label: '打包', icon: <Package size={12} /> },
    size: { label: '体积', icon: <HardDrive size={12} /> },
    performance: { label: '性能', icon: <Gauge size={12} /> },
    security: { label: '安全', icon: <Shield size={12} /> },
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
        color='#0ea5e9'
      />
    ),
    bundle: (
      <BarChart3
        size={14}
        color='#8b5cf6'
      />
    ),
    size: (
      <HardDrive
        size={14}
        color='#f59e0b'
      />
    ),
    performance: (
      <Gauge
        size={14}
        color='#10b981'
      />
    ),
    security: (
      <Shield
        size={14}
        color='#ef4444'
      />
    ),
  };
  return <>{icons[type]}</>;
};

const GateActionBadge: React.FC<{ action: GateAction }> = ({ action }) => {
  const configs: Record<GateAction, { label: string; variant: 'error' | 'warning' | 'info' }> = {
    block: { label: '阻塞', variant: 'error' },
    warn: { label: '警告', variant: 'warning' },
    info: { label: '提示', variant: 'info' },
  };
  const config = configs[action];
  return (
    <V51Badge
      label={config.label}
      size='sm'
      variant={config.variant}
    />
  );
};

const GateStatusChip: React.FC<{ status: GateStatus }> = ({ status }) => {
  const configs: Record<
    GateStatus,
    { label: string; variant: 'success' | 'error' | 'warning' | 'neutral' }
  > = {
    passed: { label: '通过', variant: 'success' },
    failed: { label: '阻塞', variant: 'error' },
    warned: { label: '警告', variant: 'warning' },
    skipped: { label: '跳过', variant: 'neutral' },
  };
  const config = configs[status];
  return (
    <V51Badge
      label={config.label}
      size='sm'
      variant={config.variant}
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
