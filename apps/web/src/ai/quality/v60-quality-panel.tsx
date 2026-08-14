import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Stack,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  LinearProgress,
  Divider,
  Alert,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Badge,
  TextField,
} from '@mui/material';
import {
  X as XIcon,
  Play,
  Sparkles,
  Activity,
  Gauge,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Zap,
  Layers,
  BarChart3,
  Brain,
  Eye,
  Lightbulb,
  RefreshCw,
  Bug,
  Shield,
  Activity as PerformanceIcon,
  Gauge as SpeedIcon,
  Palette,
} from 'lucide-react';
import {
  smartTestV2,
  type TestCase,
  type TestRun,
  type TestSuggestion,
  type TestTrendPoint,
} from './smart-testing-v2';
import {
  continuousPerformance,
  type PerfBaseline,
  type PerfRegression,
  type PerfAlert,
} from './continuous-performance';
import {
  uxMonitor,
  type UXMetric,
  type UXAlert,
  type UXMetricType,
  type FunnelAnalysis,
  type UserSegment,
} from './ux-monitor';
import { designTokens, semanticTokens } from '@topems/tokens';

type PanelTab = 'tests' | 'performance' | 'ux' | 'overview';

const METRIC_LABELS: Record<UXMetricType, string> = {
  CLS: '累积布局偏移',
  LCP: '最大内容渲染',
  INP: '交互到响应',
  FCP: '首次内容渲染',
};

const QUALITY_COLORS = {
  success: designTokens.colors.success.dark,
  warning: designTokens.colors.warning.main,
  error: designTokens.colors.error.main,
  info: designTokens.colors.primary.main,
  primary: designTokens.colors.secondary.dark,
  gradient: `linear-gradient(135deg, ${designTokens.colors.primary.dark}, ${designTokens.colors.secondary.main}, ${designTokens.colors.pink['500']})`,
};

export const V60QualityPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('overview');

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [suggestions, setSuggestions] = useState<TestSuggestion[]>([]);
  const [trends, setTrends] = useState<TestTrendPoint[]>([]);
  const [coverage, setCoverage] = useState<ReturnType<typeof smartTestV2.getCoverage> | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(0);

  const [baselines, setBaselines] = useState<PerfBaseline[]>([]);
  const [regressions, setRegressions] = useState<PerfRegression[]>([]);
  const [perfAlerts, setPerfAlerts] = useState<PerfAlert[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<
    ReturnType<typeof continuousPerformance.getCurrentMetrics>
  >([]);

  const [uxMetrics, setUxMetrics] = useState<UXMetric[]>([]);
  const [uxAlerts, setUxAlerts] = useState<UXAlert[]>([]);
  const [uxDashboard, setUxDashboard] = useState<ReturnType<
    typeof uxMonitor.getUxDashboard
  > | null>(null);
  const [funnel, setFunnel] = useState<FunnelAnalysis | null>(null);

  const loadTestData = useCallback(() => {
    setTestCases(smartTestV2.getTestCases());
    setTestRuns(smartTestV2.getAllRuns());
    setSuggestions(smartTestV2.getTestSuggestions());
    setTrends(smartTestV2.getTestTrends());
    setCoverage(smartTestV2.getCoverage());
  }, []);

  const loadPerformanceData = useCallback(() => {
    setBaselines(continuousPerformance.getBaselines());
    setRegressions(continuousPerformance.getRegressions());
    setPerfAlerts(continuousPerformance.getAlerts());
    setCurrentMetrics(continuousPerformance.getCurrentMetrics());
  }, []);

  const loadUXData = useCallback(() => {
    setUxMetrics(uxMonitor.getMetrics({ limit: 20 }));
    setUxAlerts(uxMonitor.getAlerts());
    setUxDashboard(uxMonitor.getUxDashboard());
    setFunnel(uxMonitor.getFunnelAnalysis());
  }, []);

  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setRunProgress(0);

    const listener = smartTestV2.on((event) => {
      if (event.type === 'test_started') {
        setRunProgress((prev) => Math.min(99, prev + 2));
      }
    });

    try {
      setRunProgress(100);

      setTimeout(() => {
        loadTestData();
        setIsRunning(false);
        setRunProgress(0);
        listener();
      }, 500);
    } catch {
      setIsRunning(false);
      setRunProgress(0);
      listener();
    }
  }, [loadTestData]);

  const runSelectedTests = useCallback(
    async (ids: string[]) => {
      setIsRunning(true);
      setRunProgress(0);
      try {
        await smartTestV2.runTests(ids);
        loadTestData();
      } finally {
        setIsRunning(false);
        setRunProgress(0);
      }
    },
    [loadTestData]
  );

  const generateTests = useCallback(() => {
    smartTestV2.generateTests({ count: 3 });
    loadTestData();
  }, [loadTestData]);

  const regenerateFailed = useCallback(() => {
    smartTestV2.regenerateFailed();
    loadTestData();
  }, [loadTestData]);

  const runPerformanceCheck = useCallback(() => {
    continuousPerformance.measurePerformance();
    const regs = continuousPerformance.detectRegression();
    if (regs.length > 0) {
      for (const r of regs) {
        continuousPerformance.alertOnRegression(r.id);
      }
    }
    loadPerformanceData();
  }, [loadPerformanceData]);

  const setNewBaseline = useCallback(() => {
    const metrics: Record<string, number> = {};
    const current = continuousPerformance.getCurrentMetrics();
    for (const m of current) {
      metrics[m.name] = m.value;
    }
    continuousPerformance.setBaseline(metrics, `v${Date.now()}`, '新基线');
    loadPerformanceData();
  }, [loadPerformanceData]);

  const recordUXMetric = useCallback(() => {
    const types: UXMetricType[] = ['CLS', 'LCP', 'INP', 'FCP'];
    const segments: UserSegment[] = ['desktop', 'mobile', 'tablet'];
    for (const type of types) {
      for (const segment of segments) {
        const value =
          type === 'CLS'
            ? Math.random() * 0.4
            : type === 'LCP'
              ? 1000 + Math.random() * 3000
              : type === 'INP'
                ? 50 + Math.random() * 400
                : 500 + Math.random() * 2500;
        uxMonitor.recordMetric(type, value, segment, '/dashboard');
      }
    }
    loadUXData();
  }, [loadUXData]);

  useEffect(() => {
    loadTestData();
    loadPerformanceData();
    loadUXData();
  }, [loadTestData, loadPerformanceData, loadUXData]);

  const qualityScore = coverage
    ? Math.round(
        (coverage.overall * 0.4 +
          (coverage.total_test_cases > 0
            ? (coverage.passed / coverage.total_test_cases) * 100
            : 0) *
            0.3 +
          (1 - regressions.length * 0.1) * 100 * 0.3) *
          10
      ) / 10
    : 0;

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
          width: '97%',
          maxWidth: 1500,
          maxHeight: '95vh',
          bgcolor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: QUALITY_COLORS.gradient,
            bgcolor: QUALITY_COLORS.gradient,
            color: 'common.white',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Brain size={24} />
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              V60.0 AI Quality — 智能测试 · 持续性能 · UX 监控
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              size='small'
              label={`质量评分: ${qualityScore}`}
              sx={{
                bgcolor: 'action.disabledBackground',
                color: 'common.white',
                fontWeight: 600,
              }}
            />
            <IconButton
              size='small'
              onClick={onClose}
              sx={{ color: 'common.white' }}
            >
              <XIcon size={20} />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v as PanelTab)}
            variant='scrollable'
            scrollButtons='auto'
          >
            <Tab
              icon={<Gauge size={16} />}
              iconPosition='start'
              label='质量总览'
              value='overview'
            />
            <Tab
              icon={<Play size={16} />}
              iconPosition='start'
              label='测试运行'
              value='tests'
            />
            <Tab
              icon={<SpeedIcon size={16} />}
              iconPosition='start'
              label='性能回归'
              value='performance'
            />
            <Tab
              icon={<Eye size={16} />}
              iconPosition='start'
              label='UX 监控'
              value='ux'
            />
          </Tabs>
        </Box>

        <Box sx={{ overflow: 'auto', flex: 1, p: 2 }}>
          {activeTab === 'overview' && (
            <OverviewTab
              coverage={coverage}
              regressions={regressions}
              uxDashboard={uxDashboard}
              trends={trends}
              qualityScore={qualityScore}
              testCases={testCases}
            />
          )}

          {activeTab === 'tests' && (
            <TestsTab
              testCases={testCases}
              testRuns={testRuns}
              suggestions={suggestions}
              trends={trends}
              coverage={coverage}
              isRunning={isRunning}
              runProgress={runProgress}
              onRunAll={runAllTests}
              onRunSelected={runSelectedTests}
              onGenerate={generateTests}
              onRegenerate={regenerateFailed}
            />
          )}

          {activeTab === 'performance' && (
            <PerformanceTab
              baselines={baselines}
              regressions={regressions}
              alerts={perfAlerts}
              currentMetrics={currentMetrics}
              onMeasure={runPerformanceCheck}
              onSetBaseline={setNewBaseline}
            />
          )}

          {activeTab === 'ux' && (
            <UXTab
              metrics={uxMetrics}
              alerts={uxAlerts}
              dashboard={uxDashboard}
              funnel={funnel}
              onRecord={recordUXMetric}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

const OverviewTab: React.FC<{
  coverage: ReturnType<typeof smartTestV2.getCoverage> | null;
  regressions: PerfRegression[];
  uxDashboard: ReturnType<typeof uxMonitor.getUxDashboard> | null;
  trends: TestTrendPoint[];
  qualityScore: number;
  testCases: TestCase[];
}> = ({ coverage, regressions, uxDashboard, trends, qualityScore, testCases }) => (
  <Grid
    container
    spacing={2}
  >
    <Grid size={{ xs: 12, md: 4 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, alignItems: 'center' }}
          >
            <Gauge
              size={18}
              color={QUALITY_COLORS.primary}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              质量评分
            </Typography>
          </Stack>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography
              variant='h3'
              sx={{
                fontWeight: 700,
                color:
                  qualityScore >= 80
                    ? QUALITY_COLORS.success
                    : qualityScore >= 60
                      ? QUALITY_COLORS.warning
                      : QUALITY_COLORS.error,
              }}
            >
              {qualityScore}
            </Typography>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary' }}
            >
              综合评分 (0-100)
            </Typography>
          </Box>
          {coverage && (
            <Grid
              container
              spacing={1}
            >
              <Grid size={4}>
                <StatItem
                  label='测试总数'
                  value={coverage.total_test_cases}
                />
              </Grid>
              <Grid size={4}>
                <StatItem
                  label='通过'
                  value={coverage.passed}
                  color={QUALITY_COLORS.success}
                />
              </Grid>
              <Grid size={4}>
                <StatItem
                  label='失败'
                  value={coverage.failed}
                  color={QUALITY_COLORS.error}
                />
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12, md: 4 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, alignItems: 'center' }}
          >
            <CheckCircle
              size={18}
              color={QUALITY_COLORS.success}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              测试覆盖率
            </Typography>
          </Stack>
          {coverage && (
            <>
              <Box sx={{ textAlign: 'center', py: 1 }}>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700 }}
                >
                  {(coverage.overall * 100).toFixed(1)}%
                </Typography>
                <LinearProgress
                  variant='determinate'
                  value={coverage.overall * 100}
                  sx={{ height: 8, borderRadius: 4, mt: 1 }}
                />
              </Box>
              <Divider sx={{ my: 1 }} />
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}
              >
                按类型分布
              </Typography>
              <Grid
                container
                spacing={1}
              >
                {(Object.entries(coverage.byType) as Array<[string, number]>).map(([type, val]) => (
                  <Grid
                    size={4}
                    key={type}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 600 }}
                      >
                        {(val * 100).toFixed(0)}%
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ color: 'text.secondary' }}
                      >
                        {type}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12, md: 4 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, alignItems: 'center' }}
          >
            <AlertTriangle
              size={18}
              color={QUALITY_COLORS.warning}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              性能告警
            </Typography>
          </Stack>
          <Box sx={{ textAlign: 'center', py: 1 }}>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, color: QUALITY_COLORS.warning }}
            >
              {regressions.length}
            </Typography>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary' }}
            >
              活跃性能回归
            </Typography>
          </Box>
          {regressions.length > 0 && (
            <List dense>
              {regressions.slice(0, 3).map((r) => (
                <ListItem
                  key={r.id}
                  sx={{ py: 0.5 }}
                >
                  <ListItemText
                    primary={
                      <Typography
                        variant='body2'
                        noWrap
                      >
                        {r.metric}
                      </Typography>
                    }
                    secondary={`${(r.delta * 100).toFixed(1)}% ${r.severity}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12, md: 6 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, alignItems: 'center' }}
          >
            <TrendingUp
              size={18}
              color={QUALITY_COLORS.info}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              测试趋势 (最近 7 天)
            </Typography>
          </Stack>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end', height: 100, py: 1 }}>
            {trends.slice(-7).map((t, i) => {
              const maxTotal = Math.max(...trends.map((tr) => tr.total), 1);
              const height = (t.total / maxTotal) * 100;
              return (
                <Box
                  key={i}
                  sx={{
                    flex: 1,
                    height: `${height}%`,
                    bgcolor: t.failed > 0 ? QUALITY_COLORS.warning : QUALITY_COLORS.success,
                    borderRadius: '4px 4px 0 0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    pt: 0.5,
                  }}
                >
                  <Typography
                    variant='caption'
                    sx={{ color: 'common.white', fontSize: 10 }}
                  >
                    {t.passed}
                  </Typography>
                </Box>
              );
            })}
          </Box>
          <Stack
            direction='row'
            spacing={2}
            sx={{ mt: 1, justifyContent: 'center' }}
          >
            <Chip
              size='small'
              label='通过'
              color='success'
              variant='outlined'
            />
            <Chip
              size='small'
              label='失败'
              color='warning'
              variant='outlined'
            />
          </Stack>
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12, md: 6 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, alignItems: 'center' }}
          >
            <Palette
              size={18}
              color={QUALITY_COLORS.primary}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              UX 核心指标
            </Typography>
          </Stack>
          {uxDashboard && (
            <Grid
              container
              spacing={1}
            >
              {(
                Object.entries(uxDashboard.scores) as Array<
                  [UXMetricType, { value: number; rating: string }]
                >
              ).map(([type, score]) => (
                <Grid
                  size={6}
                  key={type}
                >
                  <Box sx={{ textAlign: 'center', py: 0.5 }}>
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 600, fontSize: 18 }}
                    >
                      {score.value}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary', display: 'block' }}
                    >
                      {METRIC_LABELS[type]}
                    </Typography>
                    <Chip
                      size='small'
                      label={score.rating}
                      color={
                        score.rating === 'good'
                          ? 'success'
                          : score.rating === 'poor'
                            ? 'error'
                            : 'warning'
                      }
                      sx={{ mt: 0.5, height: 18, fontSize: 10 }}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>
    </Grid>
  </Grid>
);

const StatItem: React.FC<{ label: string; value: string | number; color?: string }> = ({
  label,
  value,
  color = 'text.primary',
}) => (
  <Box sx={{ textAlign: 'center', py: 0.5 }}>
    <Typography
      variant='h6'
      sx={{ color, fontWeight: 600, lineHeight: 1.2 }}
    >
      {value}
    </Typography>
    <Typography
      variant='caption'
      sx={{ color: 'text.secondary' }}
    >
      {label}
    </Typography>
  </Box>
);

const TestsTab: React.FC<{
  testCases: TestCase[];
  testRuns: TestRun[];
  suggestions: TestSuggestion[];
  trends: TestTrendPoint[];
  coverage: ReturnType<typeof smartTestV2.getCoverage> | null;
  isRunning: boolean;
  runProgress: number;
  onRunAll: () => void;
  onRunSelected: (ids: string[]) => void;
  onGenerate: () => void;
  onRegenerate: () => void;
}> = ({
  testCases,
  testRuns,
  suggestions,
  coverage,
  isRunning,
  runProgress,
  onRunAll,
  onGenerate,
  onRegenerate,
}) => {
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? testCases : testCases.filter((tc) => tc.type === filter);

  return (
    <Grid
      container
      spacing={2}
    >
      <Grid size={{ xs: 12 }}>
        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={2}
              sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }}
            >
              <Stack
                direction='row'
                spacing={1}
                sx={{ alignItems: 'center' }}
              >
                <Target
                  size={18}
                  color={QUALITY_COLORS.primary}
                />
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  测试用例管理
                </Typography>
              </Stack>
              <Box sx={{ flex: 1 }} />
              <FormControl
                size='small'
                sx={{ minWidth: 120 }}
              >
                <InputLabel>筛选</InputLabel>
                <Select
                  value={filter}
                  label='筛选'
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <MenuItem value='all'>全部</MenuItem>
                  <MenuItem value='Unit'>单元测试</MenuItem>
                  <MenuItem value='Integration'>集成测试</MenuItem>
                  <MenuItem value='E2E'>端到端</MenuItem>
                </Select>
              </FormControl>
              <Button
                size='small'
                variant='contained'
                startIcon={<Sparkles size={14} />}
                onClick={onGenerate}
              >
                AI 生成
              </Button>
              <Button
                size='small'
                variant='contained'
                color='success'
                startIcon={<Play size={14} />}
                onClick={onRunAll}
                disabled={isRunning}
              >
                {isRunning ? '运行中...' : '全部运行'}
              </Button>
              <Button
                size='small'
                variant='outlined'
                startIcon={<RefreshCw size={14} />}
                onClick={onRegenerate}
              >
                重新生成失败
              </Button>
            </Stack>

            {isRunning && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress
                  variant='determinate'
                  value={runProgress}
                />
              </Box>
            )}

            {coverage && (
              <Grid
                container
                spacing={1}
                sx={{ mb: 2 }}
              >
                <Grid size={3}>
                  <StatItem
                    label='总数'
                    value={coverage.total_test_cases}
                  />
                </Grid>
                <Grid size={3}>
                  <StatItem
                    label='通过'
                    value={coverage.passed}
                    color={QUALITY_COLORS.success}
                  />
                </Grid>
                <Grid size={3}>
                  <StatItem
                    label='失败'
                    value={coverage.failed}
                    color={QUALITY_COLORS.error}
                  />
                </Grid>
                <Grid size={3}>
                  <StatItem
                    label='覆盖率'
                    value={`${(coverage.overall * 100).toFixed(1)}%`}
                    color={QUALITY_COLORS.info}
                  />
                </Grid>
              </Grid>
            )}

            <List
              dense
              sx={{ maxHeight: 300, overflow: 'auto' }}
            >
              {filtered.map((tc) => (
                <ListItem
                  key={tc.id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 0.5,
                    alignItems: 'flex-start',
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ alignItems: 'center', mb: 0.5 }}
                    >
                      <Chip
                        size='small'
                        label={tc.type}
                        color='primary'
                        sx={{ height: 20, fontSize: 10 }}
                      />
                      <Chip
                        size='small'
                        label={tc.priority}
                        color={
                          tc.priority === 'critical'
                            ? 'error'
                            : tc.priority === 'high'
                              ? 'warning'
                              : 'default'
                        }
                        sx={{ height: 20, fontSize: 10 }}
                      />
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {tc.name}
                      </Typography>
                    </Stack>
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      {tc.status === 'passed' && (
                        <CheckCircle
                          size={14}
                          color={QUALITY_COLORS.success}
                        />
                      )}
                      {tc.status === 'failed' && (
                        <XCircle
                          size={14}
                          color={QUALITY_COLORS.error}
                        />
                      )}
                      {tc.status === 'pending' && (
                        <Clock
                          size={14}
                          color='text.secondary'
                        />
                      )}
                      <Typography
                        variant='caption'
                        sx={{ color: 'text.secondary' }}
                      >
                        {tc.status}
                      </Typography>
                      <Typography
                        variant='caption'
                        sx={{ color: 'text.secondary', ml: 1 }}
                      >
                        覆盖率: {(tc.coverage * 100).toFixed(1)}%
                      </Typography>
                    </Stack>
                  </Box>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <Lightbulb
                size={18}
                color={QUALITY_COLORS.warning}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                AI 智能建议
              </Typography>
            </Stack>
            {suggestions.length === 0 ? (
              <Alert
                severity='info'
                variant='outlined'
              >
                暂无建议
              </Alert>
            ) : (
              <List dense>
                {suggestions.map((s) => (
                  <ListItem
                    key={s.id}
                    sx={{ py: 0.5 }}
                  >
                    <ListItemText
                      primary={
                        <Stack
                          direction='row'
                          spacing={1}
                          sx={{ alignItems: 'center' }}
                        >
                          <Chip
                            size='small'
                            label={s.type}
                            color={
                              s.type === 'coverage'
                                ? 'info'
                                : s.type === 'edge-case'
                                  ? 'warning'
                                  : 'default'
                            }
                            sx={{ height: 18, fontSize: 10 }}
                          />
                          <Typography
                            variant='body2'
                            noWrap
                          >
                            {s.message}
                          </Typography>
                        </Stack>
                      }
                      secondary={s.suggestion}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card variant='outlined'>
          <CardContent>
            <Stack
              direction='row'
              spacing={1}
              sx={{ mb: 2, alignItems: 'center' }}
            >
              <BarChart3
                size={18}
                color={QUALITY_COLORS.info}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                最近测试运行
              </Typography>
            </Stack>
            {testRuns.length === 0 ? (
              <Alert
                severity='info'
                variant='outlined'
              >
                暂无测试运行记录
              </Alert>
            ) : (
              <List dense>
                {testRuns.slice(0, 5).map((run) => (
                  <ListItem
                    key={run.id}
                    sx={{ py: 0.5 }}
                  >
                    <ListItemText
                      primary={
                        <Stack
                          direction='row'
                          spacing={1}
                          sx={{ alignItems: 'center' }}
                        >
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {run.testCaseIds.length} 测试
                          </Typography>
                          <Chip
                            size='small'
                            label={`通过 ${run.results.filter((r) => r.passed).length}`}
                            color='success'
                            variant='outlined'
                            sx={{ height: 18, fontSize: 10 }}
                          />
                          <Chip
                            size='small'
                            label={`耗时 ${(run.total_duration_ms / 1000).toFixed(1)}s`}
                            variant='outlined'
                            sx={{ height: 18, fontSize: 10 }}
                          />
                        </Stack>
                      }
                      secondary={new Date(run.endTime).toLocaleString()}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

const PerformanceTab: React.FC<{
  baselines: PerfBaseline[];
  regressions: PerfRegression[];
  alerts: PerfAlert[];
  currentMetrics: ReturnType<typeof continuousPerformance.getCurrentMetrics>;
  onMeasure: () => void;
  onSetBaseline: () => void;
}> = ({ baselines, regressions, alerts, currentMetrics, onMeasure, onSetBaseline }) => (
  <Grid
    container
    spacing={2}
  >
    <Grid size={{ xs: 12 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={2}
            sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Stack
              direction='row'
              spacing={1}
              sx={{ alignItems: 'center' }}
            >
              <SpeedIcon
                size={18}
                color={QUALITY_COLORS.info}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                性能监控
              </Typography>
            </Stack>
            <Box sx={{ flex: 1 }} />
            <Button
              size='small'
              variant='contained'
              startIcon={<Zap size={14} />}
              onClick={onMeasure}
            >
              测量 + 检测
            </Button>
            <Button
              size='small'
              variant='outlined'
              startIcon={<Target size={14} />}
              onClick={onSetBaseline}
            >
              设为基线
            </Button>
          </Stack>

          <Grid
            container
            spacing={1}
          >
            {currentMetrics.map((m) => (
              <Grid
                size={{ xs: 12, md: 6, lg: 3 }}
                key={m.name}
              >
                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    p: 1,
                  }}
                >
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary', display: 'block' }}
                  >
                    {m.name}
                  </Typography>
                  <Stack
                    direction='row'
                    spacing={1}
                    sx={{ alignItems: 'baseline' }}
                  >
                    <Typography
                      variant='h6'
                      sx={{ fontWeight: 600 }}
                    >
                      {m.value.toFixed(2)}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary' }}
                    >
                      {m.unit}
                    </Typography>
                  </Stack>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12, md: 6 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, alignItems: 'center' }}
          >
            <AlertTriangle
              size={18}
              color={QUALITY_COLORS.warning}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              性能回归检测
            </Typography>
            {regressions.length > 0 && (
              <Badge
                badgeContent={regressions.length}
                color={regressions.some((r) => r.severity === 'critical') ? 'error' : 'warning'}
                sx={{ ml: 'auto' }}
              >
                <Chip
                  size='small'
                  label='回归'
                  variant='outlined'
                />
              </Badge>
            )}
          </Stack>

          {regressions.length === 0 ? (
            <Alert
              severity='success'
              variant='outlined'
            >
              无性能回归，系统表现良好
            </Alert>
          ) : (
            <List dense>
              {regressions.map((r) => (
                <ListItem
                  key={r.id}
                  sx={{
                    border: '1px solid',
                    borderColor:
                      r.severity === 'critical' ? QUALITY_COLORS.error : QUALITY_COLORS.warning,
                    borderRadius: 1,
                    mb: 0.5,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <Chip
                        size='small'
                        label={r.metric}
                        color={r.severity === 'critical' ? 'error' : 'warning'}
                        sx={{ height: 20, fontSize: 10 }}
                      />
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 600 }}
                      >
                        {(r.delta * 100).toFixed(1)}%
                      </Typography>
                      <Chip
                        size='small'
                        label={r.severity}
                        color={r.severity === 'critical' ? 'error' : 'warning'}
                        variant='outlined'
                        sx={{ height: 20, fontSize: 10 }}
                      />
                    </Stack>
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary' }}
                    >
                      基线: {r.baseline.toFixed(2)} → 当前: {r.current.toFixed(2)}
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12, md: 6 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, alignItems: 'center' }}
          >
            <Shield
              size={18}
              color={QUALITY_COLORS.primary}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              性能基线
            </Typography>
          </Stack>

          {baselines.length === 0 ? (
            <Alert
              severity='info'
              variant='outlined'
            >
              暂无性能基线
            </Alert>
          ) : (
            <List dense>
              {baselines
                .slice(-5)
                .reverse()
                .map((b) => (
                  <ListItem
                    key={b.id}
                    sx={{ py: 0.5 }}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {b.name || b.version}
                        </Typography>
                      }
                      secondary={`${Object.keys(b.metrics).length} 指标 · ${new Date(b.createdAt).toLocaleString()}`}
                    />
                  </ListItem>
                ))}
            </List>
          )}

          <Divider sx={{ my: 1.5 }} />

          <Typography
            variant='caption'
            sx={{ color: 'text.secondary', mb: 1, display: 'block' }}
          >
            性能告警
          </Typography>
          {alerts.length === 0 ? (
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              无活跃告警
            </Typography>
          ) : (
            <List dense>
              {alerts.slice(0, 3).map((a) => (
                <ListItem
                  key={a.id}
                  sx={{ py: 0.5 }}
                >
                  <ListItemText
                    primary={
                      <Typography
                        variant='body2'
                        noWrap
                      >
                        {a.message}
                      </Typography>
                    }
                    secondary={`${a.severity} · ${new Date(a.createdAt).toLocaleTimeString()}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Grid>
  </Grid>
);

const UXTab: React.FC<{
  metrics: UXMetric[];
  alerts: UXAlert[];
  dashboard: ReturnType<typeof uxMonitor.getUxDashboard> | null;
  funnel: FunnelAnalysis | null;
  onRecord: () => void;
}> = ({ metrics, alerts, dashboard, funnel, onRecord }) => (
  <Grid
    container
    spacing={2}
  >
    <Grid size={{ xs: 12 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={2}
            sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Stack
              direction='row'
              spacing={1}
              sx={{ alignItems: 'center' }}
            >
              <Eye
                size={18}
                color={QUALITY_COLORS.primary}
              />
              <Typography
                variant='subtitle2'
                sx={{ fontWeight: 600 }}
              >
                真实用户体验监控 (RUM)
              </Typography>
            </Stack>
            <Box sx={{ flex: 1 }} />
            <Button
              size='small'
              variant='contained'
              startIcon={<Activity size={14} />}
              onClick={onRecord}
            >
              模拟指标数据
            </Button>
          </Stack>

          {dashboard && (
            <Grid
              container
              spacing={2}
            >
              {(
                Object.entries(dashboard.scores) as Array<
                  [UXMetricType, { value: number; rating: string; threshold: number }]
                >
              ).map(([type, score]) => (
                <Grid
                  size={{ xs: 12, md: 6, lg: 3 }}
                  key={type}
                >
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor:
                        score.rating === 'good'
                          ? QUALITY_COLORS.success
                          : score.rating === 'poor'
                            ? QUALITY_COLORS.error
                            : QUALITY_COLORS.warning,
                      borderRadius: 1,
                      p: 1.5,
                      textAlign: 'center',
                    }}
                  >
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary', display: 'block' }}
                    >
                      {METRIC_LABELS[type]} ({type})
                    </Typography>
                    <Typography
                      variant='h5'
                      sx={{
                        fontWeight: 700,
                        color:
                          score.rating === 'good'
                            ? QUALITY_COLORS.success
                            : score.rating === 'poor'
                              ? QUALITY_COLORS.error
                              : QUALITY_COLORS.warning,
                      }}
                    >
                      {score.value}
                    </Typography>
                    <Chip
                      size='small'
                      label={score.rating}
                      color={
                        score.rating === 'good'
                          ? 'success'
                          : score.rating === 'poor'
                            ? 'error'
                            : 'warning'
                      }
                      sx={{ mt: 0.5 }}
                    />
                    <LinearProgress
                      variant='determinate'
                      value={Math.min(
                        100,
                        (score.value / (type === 'CLS' ? 0.5 : type === 'INP' ? 800 : 6000)) * 100
                      )}
                      sx={{ mt: 1, height: 4, borderRadius: 2 }}
                    />
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12, md: 6 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, alignItems: 'center' }}
          >
            <AlertTriangle
              size={18}
              color={QUALITY_COLORS.warning}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              UX 告警
            </Typography>
            {alerts.length > 0 && (
              <Chip
                size='small'
                label={`${alerts.length} 活跃`}
                color='error'
                sx={{ ml: 'auto' }}
              />
            )}
          </Stack>

          {alerts.length === 0 ? (
            <Alert
              severity='success'
              variant='outlined'
            >
              无活跃 UX 告警
            </Alert>
          ) : (
            <List dense>
              {alerts.slice(0, 5).map((a) => (
                <ListItem
                  key={a.id}
                  sx={{
                    border: '1px solid',
                    borderColor: a.status === 'active' ? QUALITY_COLORS.error : 'divider',
                    borderRadius: 1,
                    mb: 0.5,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <Chip
                        size='small'
                        label={METRIC_LABELS[a.metric]}
                        color='error'
                        sx={{ height: 20, fontSize: 10 }}
                      />
                      <Chip
                        size='small'
                        label={a.userImpact}
                        color={
                          a.userImpact === 'critical'
                            ? 'error'
                            : a.userImpact === 'high'
                              ? 'warning'
                              : 'default'
                        }
                        sx={{ height: 20, fontSize: 10 }}
                      />
                    </Stack>
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary' }}
                    >
                      当前: {a.currentValue.toFixed(2)} · 阈值: {a.threshold}
                    </Typography>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12, md: 6 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, alignItems: 'center' }}
          >
            <Layers
              size={18}
              color={QUALITY_COLORS.info}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              用户转化漏斗
            </Typography>
          </Stack>

          {funnel && (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 1 }}>
                {funnel.steps.map((step, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant='caption'
                      sx={{ minWidth: 80 }}
                    >
                      {step.name}
                    </Typography>
                    <Box
                      sx={{
                        flex: 1,
                        height: 24,
                        bgcolor: QUALITY_COLORS.primary,
                        borderRadius: 1,
                        width: `${step.percentage}%`,
                        minWidth: 20,
                      }}
                    />
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 600, minWidth: 60, textAlign: 'right' }}
                    >
                      {step.value}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary', minWidth: 40 }}
                    >
                      {step.percentage.toFixed(1)}%
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 1 }} />

              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}
              >
                流失分析
              </Typography>
              <Stack
                direction='row'
                spacing={1}
                sx={{ flexWrap: 'wrap' }}
              >
                {funnel.dropOff.map((d, i) => (
                  <Chip
                    key={i}
                    size='small'
                    label={`${d.from} → ${d.to}: ${d.rate.toFixed(1)}%`}
                    color={d.rate > 20 ? 'error' : d.rate > 10 ? 'warning' : 'default'}
                    variant='outlined'
                    sx={{ fontSize: 10 }}
                  />
                ))}
              </Stack>
            </>
          )}
        </CardContent>
      </Card>
    </Grid>

    <Grid size={{ xs: 12 }}>
      <Card variant='outlined'>
        <CardContent>
          <Stack
            direction='row'
            spacing={1}
            sx={{ mb: 2, alignItems: 'center' }}
          >
            <Bug
              size={18}
              color={QUALITY_COLORS.warning}
            />
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600 }}
            >
              最近指标记录
            </Typography>
          </Stack>

          <List
            dense
            sx={{ maxHeight: 200, overflow: 'auto' }}
          >
            {metrics.slice(0, 15).map((m) => (
              <ListItem
                key={m.id}
                sx={{ py: 0.5 }}
              >
                <ListItemText
                  primary={
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <Chip
                        size='small'
                        label={m.type}
                        color='primary'
                        sx={{ height: 18, fontSize: 10 }}
                      />
                      <Typography variant='body2'>{METRIC_LABELS[m.type]}</Typography>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 600 }}
                      >
                        {m.value.toFixed(2)}
                      </Typography>
                    </Stack>
                  }
                  secondary={`${m.userSegment} · ${new Date(m.timestamp).toLocaleTimeString()}`}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
);
