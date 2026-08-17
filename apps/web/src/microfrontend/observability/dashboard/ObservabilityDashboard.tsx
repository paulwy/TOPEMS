import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import i18n from '@/i18n';
import {
  Activity as ActivityIcon,
  Zap as ZapIcon,
  AlertTriangle as AlertIcon,
  Eye as EyeIcon,
  Download as DownloadIcon,
  X as XIcon,
  Clock as ClockIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  RefreshCw as RefreshIcon,
  Layers as LayersIcon,
} from 'lucide-react';
import {
  modulePerformanceMetrics,
  type ModulePerformanceMetrics,
} from '../module-performance-metrics';
import { errorTracker, type ErrorStats, type TrackedError } from '../error-tracker';
import {
  userBehaviorAnalytics,
  type ModuleVisitStats,
  type NavigationPath,
} from '../user-behavior-analytics';
import { moduleRegistry, type ModuleRegistration } from '../../registry/module-registry';
import { designTokens, semanticTokens } from '@topems/tokens';

type TabType = 'overview' | 'performance' | 'errors' | 'behavior' | 'modules';

const SLOW_MODULE_THRESHOLD = 3000;

interface DashboardProps {
  onClose?: () => void;
  refreshInterval?: number;
}

const ObservabilityDashboard: React.FC<DashboardProps> = ({ onClose, refreshInterval = 3000 }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [performanceData, setPerformanceData] = useState<ModulePerformanceMetrics[]>([]);
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [behaviorStats, setBehaviorStats] = useState<ModuleVisitStats[]>([]);
  const [registeredModules, setRegisteredModules] = useState<ModuleRegistration[]>([]);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const refreshData = useCallback(() => {
    setPerformanceData(modulePerformanceMetrics.getAllModulePerformance());
    setErrorStats(errorTracker.getErrorStats());
    setBehaviorStats(userBehaviorAnalytics.getModuleVisitStats() as ModuleVisitStats[]);
    setRegisteredModules(moduleRegistry.listModules());
  }, []);

  useEffect(() => {
    refreshData();
    if (!autoRefresh) return;

    const interval = setInterval(refreshData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshData]);

  const handleExport = () => {
    const data = {
      performance: performanceData,
      errors: errorStats,
      behavior: behaviorStats,
      registry: registeredModules,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `observability-dashboard-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const totalModules = registeredModules.length;
  const activeModules = registeredModules.filter((m) => m.status === 'active').length;
  const errorModules = registeredModules.filter((m) => m.status === 'error').length;
  const avgLoadTime =
    performanceData.length > 0
      ? performanceData.reduce((sum, m) => sum + m.totalLoadTime, 0) / performanceData.length
      : 0;
  const successRate =
    performanceData.length > 0
      ? (performanceData.filter((m) => m.success).length / performanceData.length) * 100
      : 100;
  const totalErrors = errorStats?.totalErrors || 0;
  const totalVisits = behaviorStats.reduce((sum, s) => sum + s.visitCount, 0);

  const sortedPerformance = [...performanceData].sort((a, b) => b.totalLoadTime - a.totalLoadTime);
  const slowModules = sortedPerformance.filter((m) => m.totalLoadTime > SLOW_MODULE_THRESHOLD);
  const sortedBehavior = [...behaviorStats].sort((a, b) => b.visitCount - a.visitCount);

  const StatCard: React.FC<{
    label: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    trend?: string;
  }> = ({ label, value, icon, color, trend }) => (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 1 }}
            >
              {label}
            </Typography>
            <Typography
              variant='h4'
              sx={{ fontWeight: 700, color }}
            >
              {value}
            </Typography>
            {trend && (
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <TrendingUpIcon size={12} />
                {trend}
              </Typography>
            )}
          </Box>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}15`, color }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );

  const BarChartSimple: React.FC<{
    data: { label: string; value: number; color?: string }[];
    maxValue?: number;
    height?: number;
  }> = ({ data, maxValue, height = 200 }) => {
    const max = maxValue || Math.max(...data.map((d) => d.value), 1);
    return (
      <Box sx={{ display: 'flex', alignItems: 'flex-end', height, gap: 2, pt: 2 }}>
        {data.map((d, i) => (
          <Box
            key={i}
            sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <Typography
              variant='caption'
              sx={{ mb: 0.5, fontWeight: 600 }}
            >
              {d.value}
            </Typography>
            <Box
              sx={{
                width: '100%',
                bgcolor: d.color || 'primary.main',
                borderRadius: 1,
                transition: 'height 0.3s ease',
                minHeight: 4,
              }}
              style={{ height: `${(d.value / max) * (height - 40)}px` }}
            />
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ mt: 0.5, fontSize: 10, textAlign: 'center', wordBreak: 'break-all' }}
            >
              {d.label}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };

  const renderOverview = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.observability_dashboard.k0')}
            value={totalModules}
            icon={<LayersIcon size={24} />}
            color={designTokens.colors.primary.dark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.observability_dashboard.k1')}
            value={activeModules}
            icon={<CheckCircleIcon size={24} />}
            color={designTokens.colors.success.dark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.observability_dashboard.k2')}
            value={errorModules}
            icon={<XCircleIcon size={24} />}
            color={designTokens.colors.error.dark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.observability_dashboard.k3')}
            value={formatDuration(avgLoadTime)}
            icon={<ClockIcon size={24} />}
            color='colors.orange.700'
          />
        </Grid>
      </Grid>

      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            label={i18n.t('microfrontend.observability_dashboard.k4')}
            value={`${successRate.toFixed(1)}%`}
            icon={<ZapIcon size={24} />}
            color={designTokens.colors.purple['700']}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            label={i18n.t('microfrontend.observability_dashboard.k5')}
            value={totalErrors}
            icon={<AlertIcon size={24} />}
            color='colors.error.800'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            label={i18n.t('microfrontend.observability_dashboard.k6')}
            value={totalVisits}
            icon={<EyeIcon size={24} />}
            color={designTokens.colors.teal['700']}
          />
        </Grid>
      </Grid>

      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {i18n.t('microfrontend.observability_dashboard.top5_0')}
              </Typography>
              {sortedPerformance.length === 0 ? (
                <Typography color='text.secondary'>
                  {i18n.t('microfrontend.observability_dashboard.k7')}
                </Typography>
              ) : (
                <BarChartSimple
                  data={sortedPerformance.slice(0, 5).map((m) => ({
                    label: m.moduleId.split('/')[0]?.slice(0, 10) || m.moduleId,
                    value: Math.round(m.totalLoadTime),
                    color:
                      m.totalLoadTime > SLOW_MODULE_THRESHOLD
                        ? 'colors.orange.700'
                        : designTokens.colors.primary.dark,
                  }))}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600, mb: 2 }}
              >
                {i18n.t('microfrontend.observability_dashboard.top5_1')}
              </Typography>
              {sortedBehavior.length === 0 ? (
                <Typography color='text.secondary'>
                  {i18n.t('microfrontend.observability_dashboard.k8')}
                </Typography>
              ) : (
                <BarChartSimple
                  data={sortedBehavior.slice(0, 5).map((s) => ({
                    label: s.moduleId.slice(0, 10),
                    value: s.visitCount,
                    color: 'cyan.700',
                  }))}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {slowModules.length > 0 && (
        <Card sx={{ bgcolor: 'warning.lighter', border: 1, borderColor: 'warning.light' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AlertIcon
                color='colors.orange.700'
                size={20}
              />
              <Typography
                variant='body1'
                sx={{ fontWeight: 600, color: 'warning.dark' }}
              >
                {i18n.t('microfrontend.observability_dashboard.k2')}
              </Typography>
            </Box>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {slowModules.length} {i18n.t('microfrontend.observability_dashboard.k0')}{' '}
              {SLOW_MODULE_THRESHOLD}ms
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {slowModules.map((m) => (
                <Chip
                  key={m.moduleId}
                  label={`${m.moduleId} (${formatDuration(m.totalLoadTime)})`}
                  size='small'
                  color='warning'
                  variant='outlined'
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );

  const renderPerformance = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('microfrontend.observability_dashboard.k3')}
          </Typography>
          <TableContainer
            component={Paper}
            variant='outlined'
          >
            <Table size='small'>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('microfrontend.observability_dashboard.k9')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('microfrontend.observability_dashboard.k10')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('microfrontend.observability_dashboard.k11')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('microfrontend.observability_dashboard.k12')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>FCP</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>TTI</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('microfrontend.observability_dashboard.k13')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedPerformance.map((m, idx) => (
                  <TableRow
                    key={m.moduleId}
                    hover
                  >
                    <TableCell>
                      <Chip
                        label={`#${idx + 1}`}
                        size='small'
                        color={idx < 3 ? 'primary' : 'default'}
                        variant={idx < 3 ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {m.moduleId}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        color:
                          m.totalLoadTime > SLOW_MODULE_THRESHOLD ? 'warning.main' : 'success.main',
                      }}
                    >
                      {formatDuration(m.totalLoadTime)}
                    </TableCell>
                    <TableCell>{formatDuration(m.whiteScreenTime)}</TableCell>
                    <TableCell>{formatDuration(m.fcp)}</TableCell>
                    <TableCell>{formatDuration(m.tti)}</TableCell>
                    <TableCell>
                      {m.success ? (
                        <Chip
                          icon={<CheckCircleIcon size={14} />}
                          label={i18n.t('microfrontend.observability_dashboard.k14')}
                          size='small'
                          color='success'
                          variant='outlined'
                        />
                      ) : (
                        <Chip
                          icon={<XCircleIcon size={14} />}
                          label={i18n.t('microfrontend.observability_dashboard.k15')}
                          size='small'
                          color='error'
                          variant='outlined'
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {sortedPerformance.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      align='center'
                    >
                      <Typography
                        color='text.secondary'
                        sx={{ py: 3 }}
                      >
                        {i18n.t('microfrontend.observability_dashboard.k4')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('microfrontend.observability_dashboard.k5')}
          </Typography>
          {sortedPerformance.length === 0 ? (
            <Typography color='text.secondary'>
              {i18n.t('microfrontend.observability_dashboard.k16')}
            </Typography>
          ) : (
            <BarChartSimple
              data={sortedPerformance.slice(0, 10).map((m) => ({
                label: m.moduleId.split('/')[0]?.slice(0, 8) || m.moduleId,
                value: Math.round(m.totalLoadTime),
                color:
                  m.totalLoadTime > SLOW_MODULE_THRESHOLD
                    ? 'colors.orange.700'
                    : designTokens.colors.primary.dark,
              }))}
              height={250}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('microfrontend.observability_dashboard.k6')}
          </Typography>
          <Grid
            container
            spacing={2}
          >
            {sortedPerformance.slice(0, 6).map((m) => (
              <Grid
                size={{ xs: 12, sm: 6, md: 4 }}
                key={m.moduleId}
              >
                <Paper
                  variant='outlined'
                  sx={{ p: 2 }}
                >
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600, mb: 1 }}
                  >
                    {m.moduleId}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant='caption'>
                          {i18n.t('microfrontend.observability_dashboard.k17')}
                        </Typography>
                        <Typography variant='caption'>
                          {formatDuration(m.remoteEntryLoadTime)}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant='determinate'
                        value={Math.min((m.remoteEntryLoadTime / m.totalLoadTime) * 100, 100)}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant='caption'>
                          {i18n.t('microfrontend.observability_dashboard.hunk_0')}
                        </Typography>
                        <Typography variant='caption'>{formatDuration(m.chunkLoadTime)}</Typography>
                      </Box>
                      <LinearProgress
                        variant='determinate'
                        value={Math.min((m.chunkLoadTime / m.totalLoadTime) * 100, 100)}
                        color='secondary'
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant='caption'>
                          {i18n.t('microfrontend.observability_dashboard.k18')}
                        </Typography>
                        <Typography variant='caption'>
                          {formatDuration(m.firstScreenRenderTime)}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant='determinate'
                        value={Math.min((m.firstScreenRenderTime / m.totalLoadTime) * 100, 100)}
                        color='warning'
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );

  const renderErrors = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.observability_dashboard.k19')}
            value={totalErrors}
            icon={<AlertIcon size={24} />}
            color={designTokens.colors.error.dark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.observability_dashboard.k20')}
            value={errorStats?.totalErrorTypes || 0}
            icon={<XCircleIcon size={24} />}
            color='colors.error.800'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.observability_dashboard.k21')}
            value={Object.keys(errorStats?.errorsByModule || {}).length}
            icon={<LayersIcon size={24} />}
            color={designTokens.colors.warning[700]}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label={i18n.t('microfrontend.observability_dashboard.k22')}
            value={totalVisits > 0 ? `${((totalErrors / totalVisits) * 100).toFixed(2)}%` : '0%'}
            icon={<TrendingUpIcon size={24} />}
            color='#ad1457'
          />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('microfrontend.observability_dashboard.k7')}
          </Typography>
          {errorStats && Object.keys(errorStats.errorsByModule).length > 0 ? (
            <BarChartSimple
              data={Object.entries(errorStats.errorsByModule)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10)
                .map(([moduleId, count]) => ({
                  label: moduleId.slice(0, 10),
                  value: count,
                  color: 'error.600',
                }))}
            />
          ) : (
            <Typography color='text.secondary'>
              {i18n.t('microfrontend.observability_dashboard.k23')}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('microfrontend.observability_dashboard.k8')}
          </Typography>
          <TableContainer
            component={Paper}
            variant='outlined'
          >
            <Table size='small'>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('microfrontend.observability_dashboard.k24')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('microfrontend.observability_dashboard.k25')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('microfrontend.observability_dashboard.k26')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('microfrontend.observability_dashboard.k27')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('microfrontend.observability_dashboard.k28')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {errorStats?.topErrors?.slice(0, 20).map((err: TrackedError) => (
                  <TableRow
                    key={err.id}
                    hover
                  >
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {err.moduleId || '-'}
                    </TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 300,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {err.message}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={err.type}
                        size='small'
                        color='error'
                        variant='outlined'
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{err.count}</TableCell>
                    <TableCell>{formatDate(err.lastSeen)}</TableCell>
                  </TableRow>
                ))}
                {(!errorStats?.topErrors || errorStats.topErrors.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align='center'
                    >
                      <Typography
                        color='text.secondary'
                        sx={{ py: 3 }}
                      >
                        {i18n.t('microfrontend.observability_dashboard.k9')}
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

  const renderBehavior = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Grid
        container
        spacing={2}
      >
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            label={i18n.t('microfrontend.observability_dashboard.k29')}
            value={totalVisits}
            icon={<EyeIcon size={24} />}
            color={designTokens.colors.teal['700']}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            label={i18n.t('microfrontend.observability_dashboard.k30')}
            value={behaviorStats.length}
            icon={<LayersIcon size={24} />}
            color={designTokens.colors.primary.dark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            label={i18n.t('microfrontend.observability_dashboard.k31')}
            value={formatDuration(
              behaviorStats.length > 0
                ? behaviorStats.reduce((s, m) => s + m.averageDuration, 0) / behaviorStats.length
                : 0
            )}
            icon={<ClockIcon size={24} />}
            color={designTokens.colors.purple['700']}
          />
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('microfrontend.observability_dashboard.k10')}
          </Typography>
          <TableContainer
            component={Paper}
            variant='outlined'
          >
            <Table size='small'>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('microfrontend.observability_dashboard.k32')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('microfrontend.observability_dashboard.k33')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('microfrontend.observability_dashboard.k34')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('microfrontend.observability_dashboard.k35')}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>
                    {i18n.t('microfrontend.observability_dashboard.k36')}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedBehavior.map((s, idx) => (
                  <TableRow
                    key={s.moduleId}
                    hover
                  >
                    <TableCell>
                      <Chip
                        label={`#${idx + 1}`}
                        size='small'
                        color={idx < 3 ? 'primary' : 'default'}
                        variant={idx < 3 ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {s.moduleId}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{s.visitCount}</TableCell>
                    <TableCell>{formatDuration(s.averageDuration)}</TableCell>
                    <TableCell>{s.actionCount}</TableCell>
                  </TableRow>
                ))}
                {sortedBehavior.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      align='center'
                    >
                      <Typography
                        color='text.secondary'
                        sx={{ py: 3 }}
                      >
                        {i18n.t('microfrontend.observability_dashboard.k11')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {i18n.t('microfrontend.observability_dashboard.k12')}
          </Typography>
          {(() => {
            const paths = (userBehaviorAnalytics as any).getPopularPaths?.() || [];
            if (paths.length === 0) {
              return (
                <Typography color='text.secondary'>
                  {i18n.t('microfrontend.observability_dashboard.k37')}
                </Typography>
              );
            }
            return (
              <TableContainer
                component={Paper}
                variant='outlined'
              >
                <Table size='small'>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {i18n.t('microfrontend.observability_dashboard.k38')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {i18n.t('microfrontend.observability_dashboard.k39')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {i18n.t('microfrontend.observability_dashboard.k40')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paths.slice(0, 10).map((p: NavigationPath, idx: number) => (
                      <TableRow
                        key={idx}
                        hover
                      >
                        <TableCell>
                          <Chip
                            label={`#${idx + 1}`}
                            size='small'
                            color={idx < 3 ? 'primary' : 'default'}
                            variant={idx < 3 ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                          {p.path}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{p.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            );
          })()}
        </CardContent>
      </Card>
    </Box>
  );

  const renderModules = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card>
        <CardContent>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography
              variant='h6'
              sx={{ fontWeight: 600 }}
            >
              {i18n.t('microfrontend.observability_dashboard.k13')}
            </Typography>
            <FormControl
              size='small'
              sx={{ minWidth: 200 }}
            >
              <InputLabel>{i18n.t('microfrontend.observability_dashboard.k41')}</InputLabel>
              <Select
                value={selectedModule || ''}
                onChange={(e) => setSelectedModule(e.target.value || null)}
                label={i18n.t('microfrontend.observability_dashboard.k42')}
              >
                {sortedPerformance.map((m) => (
                  <MenuItem
                    key={m.moduleId}
                    value={m.moduleId}
                  >
                    {m.moduleId}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {selectedModule ? (
            (() => {
              const perf = performanceData.find((m) => m.moduleId === selectedModule);
              const visit = behaviorStats.find((s) => s.moduleId === selectedModule);
              const reg = registeredModules.find((m) => m.id === selectedModule.split('/')[0]);

              if (!perf) {
                return (
                  <Typography color='text.secondary'>
                    {i18n.t('microfrontend.observability_dashboard.k43')}
                  </Typography>
                );
              }

              return (
                <Grid
                  container
                  spacing={2}
                >
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography
                      variant='subtitle1'
                      sx={{ fontWeight: 600, mb: 1 }}
                    >
                      {i18n.t('microfrontend.observability_dashboard.k14')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Paper
                        variant='outlined'
                        sx={{ p: 2 }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant='body2'>
                            {i18n.t('microfrontend.observability_dashboard.k44')}
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {formatDuration(perf.totalLoadTime)}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant='determinate'
                          value={100}
                          sx={{ height: 4, borderRadius: 2 }}
                        />
                      </Paper>
                      <Paper
                        variant='outlined'
                        sx={{ p: 2 }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant='body2'>
                            {i18n.t('microfrontend.observability_dashboard.k45')}
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {formatDuration(perf.whiteScreenTime)}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant='determinate'
                          value={Math.min((perf.whiteScreenTime / perf.totalLoadTime) * 100, 100)}
                          color='primary'
                          sx={{ height: 4, borderRadius: 2 }}
                        />
                      </Paper>
                      <Paper
                        variant='outlined'
                        sx={{ p: 2 }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant='body2'>FCP</Typography>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {formatDuration(perf.fcp)}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant='determinate'
                          value={Math.min((perf.fcp / perf.totalLoadTime) * 100, 100)}
                          color='secondary'
                          sx={{ height: 4, borderRadius: 2 }}
                        />
                      </Paper>
                      <Paper
                        variant='outlined'
                        sx={{ p: 2 }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant='body2'>TTI</Typography>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {formatDuration(perf.tti)}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant='determinate'
                          value={Math.min((perf.tti / perf.totalLoadTime) * 100, 100)}
                          color='warning'
                          sx={{ height: 4, borderRadius: 2 }}
                        />
                      </Paper>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography
                      variant='subtitle1'
                      sx={{ fontWeight: 600, mb: 1 }}
                    >
                      {i18n.t('microfrontend.observability_dashboard.k15')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Paper
                        variant='outlined'
                        sx={{ p: 2 }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant='body2'>
                            {i18n.t('microfrontend.observability_dashboard.k46')}
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {visit?.visitCount || 0}
                          </Typography>
                        </Box>
                      </Paper>
                      <Paper
                        variant='outlined'
                        sx={{ p: 2 }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant='body2'>
                            {i18n.t('microfrontend.observability_dashboard.k47')}
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {formatDuration(visit?.averageDuration || 0)}
                          </Typography>
                        </Box>
                      </Paper>
                      <Paper
                        variant='outlined'
                        sx={{ p: 2 }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant='body2'>
                            {i18n.t('microfrontend.observability_dashboard.k48')}
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600 }}
                          >
                            {visit?.actionCount || 0}
                          </Typography>
                        </Box>
                      </Paper>
                      <Paper
                        variant='outlined'
                        sx={{ p: 2 }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant='body2'>
                            {i18n.t('microfrontend.observability_dashboard.k49')}
                          </Typography>
                          <Chip
                            label={
                              reg?.status || i18n.t('microfrontend.observability_dashboard.k50')
                            }
                            size='small'
                            color={
                              reg?.status === 'active'
                                ? 'success'
                                : reg?.status === 'error'
                                  ? 'error'
                                  : 'default'
                            }
                          />
                        </Box>
                      </Paper>
                    </Box>
                  </Grid>

                  {perf.resources && perf.resources.length > 0 && (
                    <Grid size={{ xs: 12 }}>
                      <Typography
                        variant='subtitle1'
                        sx={{ fontWeight: 600, mb: 1 }}
                      >
                        {i18n.t('microfrontend.observability_dashboard.k1')}
                        {perf.resources.length})
                      </Typography>
                      <TableContainer
                        component={Paper}
                        variant='outlined'
                      >
                        <Table size='small'>
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                              <TableCell sx={{ fontWeight: 600 }}>
                                {i18n.t('microfrontend.observability_dashboard.k51')}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                {i18n.t('microfrontend.observability_dashboard.k52')}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                {i18n.t('microfrontend.observability_dashboard.k53')}
                              </TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>
                                {i18n.t('microfrontend.observability_dashboard.k54')}
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {perf.resources.slice(0, 10).map((r, i) => (
                              <TableRow key={i}>
                                <TableCell
                                  sx={{
                                    fontFamily: 'monospace',
                                    fontSize: 12,
                                    maxWidth: 400,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {r.name}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={r.type}
                                    size='small'
                                  />
                                </TableCell>
                                <TableCell>{formatDuration(r.duration)}</TableCell>
                                <TableCell>
                                  {r.size ? `${(r.size / 1024).toFixed(2)}KB` : '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>
                  )}
                </Grid>
              );
            })()
          ) : (
            <Typography color='text.secondary'>
              {i18n.t('microfrontend.observability_dashboard.k55')}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'background.default',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ActivityIcon size={24} />
          <Typography
            variant='h6'
            sx={{ fontWeight: 700 }}
          >
            {i18n.t('microfrontend.observability_dashboard.k16')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            size='small'
            onClick={() => setAutoRefresh(!autoRefresh)}
            startIcon={<RefreshIcon size={16} />}
            sx={{ color: 'common.white', borderColor: 'action.disabledBackground' }}
            variant={autoRefresh ? 'contained' : 'outlined'}
          >
            {autoRefresh
              ? i18n.t('microfrontend.observability_dashboard.k57')
              : i18n.t('microfrontend.observability_dashboard.k56')}
          </Button>
          <Button
            size='small'
            onClick={refreshData}
            startIcon={<RefreshIcon size={16} />}
            sx={{ color: 'common.white', borderColor: 'action.disabledBackground' }}
            variant='outlined'
          >
            {i18n.t('microfrontend.observability_dashboard.k17')}
          </Button>
          <Button
            size='small'
            onClick={handleExport}
            startIcon={<DownloadIcon size={16} />}
            sx={{ color: 'common.white', borderColor: 'action.disabledBackground' }}
            variant='outlined'
          >
            {i18n.t('microfrontend.observability_dashboard.k18')}
          </Button>
          {onClose && (
            <IconButton
              onClick={onClose}
              sx={{ color: 'common.white' }}
            >
              <XIcon size={20} />
            </IconButton>
          )}
        </Box>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', px: 2 }}
      >
        <Tab
          label={i18n.t('microfrontend.observability_dashboard.k58')}
          value='overview'
          icon={<ActivityIcon size={16} />}
          iconPosition='start'
        />
        <Tab
          label={i18n.t('microfrontend.observability_dashboard.k59')}
          value='performance'
          icon={<ZapIcon size={16} />}
          iconPosition='start'
        />
        <Tab
          label={i18n.t('microfrontend.observability_dashboard.k60')}
          value='errors'
          icon={<AlertIcon size={16} />}
          iconPosition='start'
        />
        <Tab
          label={i18n.t('microfrontend.observability_dashboard.k61')}
          value='behavior'
          icon={<EyeIcon size={16} />}
          iconPosition='start'
        />
        <Tab
          label={i18n.t('microfrontend.observability_dashboard.k62')}
          value='modules'
          icon={<LayersIcon size={16} />}
          iconPosition='start'
        />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'performance' && renderPerformance()}
        {activeTab === 'errors' && renderErrors()}
        {activeTab === 'behavior' && renderBehavior()}
        {activeTab === 'modules' && renderModules()}
      </Box>
    </Box>
  );
};

export default ObservabilityDashboard;
