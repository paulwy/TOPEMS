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
            label='模块总数'
            value={totalModules}
            icon={<LayersIcon size={24} />}
            color={designTokens.colors.primary.dark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='活跃模块'
            value={activeModules}
            icon={<CheckCircleIcon size={24} />}
            color={designTokens.colors.success.dark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='错误模块'
            value={errorModules}
            icon={<XCircleIcon size={24} />}
            color={designTokens.colors.error.dark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='平均加载时间'
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
            label='加载成功率'
            value={`${successRate.toFixed(1)}%`}
            icon={<ZapIcon size={24} />}
            color={designTokens.colors.purple['700']}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            label='今日错误数'
            value={totalErrors}
            icon={<AlertIcon size={24} />}
            color='colors.error.800'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            label='今日访问量'
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
                加载时间排名 (Top 5)
              </Typography>
              {sortedPerformance.length === 0 ? (
                <Typography color='text.secondary'>暂无数据</Typography>
              ) : (
                <BarChartSimple
                  data={sortedPerformance.slice(0, 5).map((m) => ({
                    label: m.moduleId.split('/')[0]?.slice(0, 10) || m.moduleId,
                    value: Math.round(m.totalLoadTime),
                    color: m.totalLoadTime > SLOW_MODULE_THRESHOLD ? 'colors.orange.700' : designTokens.colors.primary.dark,
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
                模块访问排名 (Top 5)
              </Typography>
              {sortedBehavior.length === 0 ? (
                <Typography color='text.secondary'>暂无数据</Typography>
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
                慢加载模块警告
              </Typography>
            </Box>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {slowModules.length} 个模块加载超过 {SLOW_MODULE_THRESHOLD}ms
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
            模块加载性能排名
          </Typography>
          <TableContainer
            component={Paper}
            variant='outlined'
          >
            <Table size='small'>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 600 }}>排名</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>模块</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>总加载时间</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>白屏时间</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>FCP</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>TTI</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>状态</TableCell>
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
                          label='成功'
                          size='small'
                          color='success'
                          variant='outlined'
                        />
                      ) : (
                        <Chip
                          icon={<XCircleIcon size={14} />}
                          label='失败'
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
                        暂无性能数据
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
            加载时间趋势
          </Typography>
          {sortedPerformance.length === 0 ? (
            <Typography color='text.secondary'>暂无数据</Typography>
          ) : (
            <BarChartSimple
              data={sortedPerformance.slice(0, 10).map((m) => ({
                label: m.moduleId.split('/')[0]?.slice(0, 8) || m.moduleId,
                value: Math.round(m.totalLoadTime),
                color: m.totalLoadTime > SLOW_MODULE_THRESHOLD ? 'colors.orange.700' : designTokens.colors.primary.dark,
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
            资源加载分解
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
                        <Typography variant='caption'>远程入口</Typography>
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
                        <Typography variant='caption'>Chunk加载</Typography>
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
                        <Typography variant='caption'>首屏渲染</Typography>
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
            label='总错误数'
            value={totalErrors}
            icon={<AlertIcon size={24} />}
            color={designTokens.colors.error.dark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='错误类型'
            value={errorStats?.totalErrorTypes || 0}
            icon={<XCircleIcon size={24} />}
            color='colors.error.800'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='影响模块'
            value={Object.keys(errorStats?.errorsByModule || {}).length}
            icon={<LayersIcon size={24} />}
            color='#ef6c00'
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label='错误率'
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
            各模块错误数
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
            <Typography color='text.secondary'>暂无错误数据</Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            错误列表
          </Typography>
          <TableContainer
            component={Paper}
            variant='outlined'
          >
            <Table size='small'>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 600 }}>模块</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>错误信息</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>次数</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>最近发生</TableCell>
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
                        暂无错误
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
            label='总访问量'
            value={totalVisits}
            icon={<EyeIcon size={24} />}
            color={designTokens.colors.teal['700']}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            label='访问模块数'
            value={behaviorStats.length}
            icon={<LayersIcon size={24} />}
            color={designTokens.colors.primary.dark}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <StatCard
            label='平均停留时长'
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
            模块访问排名
          </Typography>
          <TableContainer
            component={Paper}
            variant='outlined'
          >
            <Table size='small'>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 600 }}>排名</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>模块</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>访问次数</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>平均停留</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>操作次数</TableCell>
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
                        暂无行为数据
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
            热门访问路径
          </Typography>
          {(() => {
            const paths = (userBehaviorAnalytics as any).getPopularPaths?.() || [];
            if (paths.length === 0) {
              return <Typography color='text.secondary'>暂无路径数据</Typography>;
            }
            return (
              <TableContainer
                component={Paper}
                variant='outlined'
              >
                <Table size='small'>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell sx={{ fontWeight: 600 }}>排名</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>路径</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>访问次数</TableCell>
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
              模块详情
            </Typography>
            <FormControl
              size='small'
              sx={{ minWidth: 200 }}
            >
              <InputLabel>选择模块</InputLabel>
              <Select
                value={selectedModule || ''}
                onChange={(e) => setSelectedModule(e.target.value || null)}
                label='选择模块'
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
                return <Typography color='text.secondary'>未找到该模块数据</Typography>;
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
                      性能指标
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Paper
                        variant='outlined'
                        sx={{ p: 2 }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant='body2'>总加载时间</Typography>
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
                          <Typography variant='body2'>白屏时间</Typography>
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
                      行为指标
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Paper
                        variant='outlined'
                        sx={{ p: 2 }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant='body2'>访问次数</Typography>
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
                          <Typography variant='body2'>平均停留时长</Typography>
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
                          <Typography variant='body2'>操作次数</Typography>
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
                          <Typography variant='body2'>注册状态</Typography>
                          <Chip
                            label={reg?.status || '未注册'}
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
                        资源列表 ({perf.resources.length})
                      </Typography>
                      <TableContainer
                        component={Paper}
                        variant='outlined'
                      >
                        <Table size='small'>
                          <TableHead>
                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                              <TableCell sx={{ fontWeight: 600 }}>资源名称</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>类型</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>耗时</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>大小</TableCell>
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
            <Typography color='text.secondary'>请选择一个模块查看详情</Typography>
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
            微前端可观测性仪表盘
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
            {autoRefresh ? '自动刷新' : '已暂停'}
          </Button>
          <Button
            size='small'
            onClick={refreshData}
            startIcon={<RefreshIcon size={16} />}
            sx={{ color: 'common.white', borderColor: 'action.disabledBackground' }}
            variant='outlined'
          >
            刷新
          </Button>
          <Button
            size='small'
            onClick={handleExport}
            startIcon={<DownloadIcon size={16} />}
            sx={{ color: 'common.white', borderColor: 'action.disabledBackground' }}
            variant='outlined'
          >
            导出
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
          label='概览'
          value='overview'
          icon={<ActivityIcon size={16} />}
          iconPosition='start'
        />
        <Tab
          label='性能'
          value='performance'
          icon={<ZapIcon size={16} />}
          iconPosition='start'
        />
        <Tab
          label='错误'
          value='errors'
          icon={<AlertIcon size={16} />}
          iconPosition='start'
        />
        <Tab
          label='行为'
          value='behavior'
          icon={<EyeIcon size={16} />}
          iconPosition='start'
        />
        <Tab
          label='模块详情'
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
