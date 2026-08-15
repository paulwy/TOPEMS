/**
 * V40.0 Track D: BFF 性能面板组件（开发模式下）
 *
 * 显示:
 * - 查询性能排名（按平均耗时排序）
 * - 慢查询列表（高亮显示）
 * - 缓存命中率统计
 * - 成功率统计
 * - 最近 10 个查询的实时时间线
 *
 * 可折叠面板，支持导出性能数据。
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';
import i18n from '@/i18n';
import {
  ChevronUp,
  ChevronDown,
  Download,
  Trash2,
  TrendingUp,
  CheckCircle,
  XCircle,
  Database,
  Clock,
  AlertTriangle,
  BarChart3,
  Zap,
  Brain,
  Layers,
  Lightbulb,
} from 'lucide-react';
import { useBffPerformance } from '@/hooks/bff/useBffPerformance';
import { formatDuration } from '@/utils/graphql-performance';
import type { QueryPerformanceStats, QueryPerformanceRecord } from '@/utils/graphql-performance';
import {
  analyzeQueryCost,
  getCostLevelColor,
  getCostLevelLabel,
  type QueryCostAnalysis,
} from '@/utils/query-cost-analyzer';
import {
  getSuspenseStats,
  onSuspenseStatsChange,
  type SuspenseMountRecord,
} from '@/hooks/bff/useBffSuspense';
import { getPPRStats, onPPRStatsChange, type PPRSlotRecord } from '@/hooks/bff/usePartialPreRender';
import {
  getHydrationStats,
  onHydrationStatsChange,
  type HydrationRecord,
} from '@/components/bff/ProgressiveHydration';

/** PerformancePanel Props */
export interface PerformancePanelProps {
  /** 默认是否展开，默认 false */
  defaultExpanded?: boolean;
  /** 面板位置，默认右下角 */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  /** 仅开发模式下显示，默认 true */
  devOnly?: boolean;
}

const positionStyles: Record<string, React.CSSProperties> = {
  'bottom-right': { bottom: 16, right: 16 },
  'bottom-left': { bottom: 16, left: 16 },
  'top-right': { top: 16, right: 16 },
  'top-left': { top: 16, left: 16 },
};

function isDevMode(): boolean {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return (import.meta.env as unknown as Record<string, unknown>).DEV === true;
    }
  } catch {
    // ignore
  }
  return process.env.NODE_ENV !== 'production';
}

/**
 * 状态颜色
 */
function getDurationColor(duration: number, threshold: number): 'success' | 'warning' | 'error' {
  if (duration >= threshold) return 'error';
  if (duration >= threshold * 0.7) return 'warning';
  return 'success';
}

/**
 * 查询性能排名表格
 */
const PerformanceRankingTable: React.FC<{
  stats: QueryPerformanceStats[];
  threshold: number;
}> = ({ stats, threshold }) => {
  if (stats.length === 0) {
    return (
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ py: 4, textAlign: 'center' }}
      >
        {i18n.t('components.performance_panel.k0')}
      </Typography>
    );
  }

  return (
    <TableContainer sx={{ maxHeight: 300 }}>
      <Table
        size='small'
        stickyHeader
      >
        <TableHead>
          <TableRow>
            <TableCell>{i18n.t('components.performance_panel.k0')}</TableCell>
            <TableCell align='right'>{i18n.t('components.performance_panel.k1')}</TableCell>
            <TableCell align='right'>{i18n.t('components.performance_panel.k2')}</TableCell>
            <TableCell align='right'>P95</TableCell>
            <TableCell align='right'>{i18n.t('components.performance_panel.k3')}</TableCell>
            <TableCell align='right'>{i18n.t('components.performance_panel.k4')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {stats.map((stat) => {
            const successRate =
              stat.totalCount > 0 ? (stat.successCount / stat.totalCount) * 100 : 0;
            const cacheRate =
              stat.totalCount > 0 ? (stat.cacheHitCount / stat.totalCount) * 100 : 0;
            const color = getDurationColor(stat.avgDuration, threshold);

            return (
              <TableRow
                key={stat.operationName}
                hover
              >
                <TableCell
                  component='th'
                  scope='row'
                >
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 500 }}
                  >
                    {stat.operationName}
                  </Typography>
                </TableCell>
                <TableCell align='right'>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {stat.totalCount}
                  </Typography>
                </TableCell>
                <TableCell align='right'>
                  <Chip
                    size='small'
                    color={color}
                    variant='outlined'
                    label={formatDuration(stat.avgDuration)}
                    sx={{ minWidth: 60 }}
                  />
                </TableCell>
                <TableCell align='right'>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {formatDuration(stat.p95Duration)}
                  </Typography>
                </TableCell>
                <TableCell align='right'>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      justifyContent: 'flex-end',
                    }}
                  >
                    {successRate >= 95 ? (
                      <CheckCircle
                        size={14}
                        color='success'
                      />
                    ) : successRate >= 80 ? (
                      <AlertTriangle
                        size={14}
                        color='warning'
                      />
                    ) : (
                      <XCircle
                        size={14}
                        color='error'
                      />
                    )}
                    <Typography variant='body2'>{successRate.toFixed(1)}%</Typography>
                  </Box>
                </TableCell>
                <TableCell align='right'>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      justifyContent: 'flex-end',
                    }}
                  >
                    <Database
                      size={14}
                      color='info'
                    />
                    <Typography variant='body2'>{cacheRate.toFixed(1)}%</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

/**
 * 慢查询列表
 */
const SlowQueryList: React.FC<{
  slowQueries: QueryPerformanceRecord[];
  threshold: number;
}> = ({ slowQueries, threshold }) => {
  if (slowQueries.length === 0) {
    return (
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ py: 4, textAlign: 'center' }}
      >
        {i18n.t('components.performance_panel.k1')}
      </Typography>
    );
  }

  return (
    <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
      {slowQueries.slice(0, 50).map((record, index) => (
        <Paper
          key={`${record.timestamp}-${index}`}
          variant='outlined'
          sx={{
            p: 1.5,
            mb: 1,
            borderColor: 'error.main',
            bgcolor: 'error.50',
          }}
        >
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}
          >
            <Typography
              variant='body2'
              sx={{ fontWeight: 600 }}
              color='error.dark'
            >
              {record.operationName}
            </Typography>
            <Chip
              size='small'
              color='error'
              label={formatDuration(record.duration)}
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {new Date(record.timestamp).toLocaleTimeString()}
            </Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              [i18n.t('components.performance_panel.k2')]: {formatDuration(threshold)}
            </Typography>
            {!record.success && (
              <Chip
                size='small'
                color='error'
                label={i18n.t('components.performance_panel.k5')}
                variant='outlined'
              />
            )}
          </Box>
        </Paper>
      ))}
    </Box>
  );
};

/**
 * 实时时间线
 */
const RealtimeTimeline: React.FC<{
  recentRecords: QueryPerformanceRecord[];
  threshold: number;
}> = ({ recentRecords, threshold }) => {
  const last10 = recentRecords.slice(0, 10);

  if (last10.length === 0) {
    return (
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ py: 4, textAlign: 'center' }}
      >
        {i18n.t('components.performance_panel.k3')}
      </Typography>
    );
  }

  const maxDuration = Math.max(...last10.map((r) => r.duration), threshold);

  return (
    <Box sx={{ py: 2 }}>
      {last10.map((record, index) => {
        const widthPercent = Math.min((record.duration / maxDuration) * 100, 100);
        const isSlow = record.duration >= threshold;
        const color = isSlow ? 'error' : record.success ? 'success' : 'warning';

        return (
          <Box
            key={`${record.timestamp}-${index}`}
            sx={{ mb: 1 }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
              <Typography
                variant='caption'
                noWrap
                sx={{ maxWidth: '60%' }}
              >
                {record.operationName}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {formatDuration(record.duration)}
              </Typography>
            </Box>
            <LinearProgress
              variant='determinate'
              value={widthPercent}
              color={color}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        );
      })}
    </Box>
  );
};

/**
 * 概览统计卡片
 */
const OverviewStats: React.FC<{
  totalQueries: number;
  totalSuccess: number;
  totalErrors: number;
  cacheHitRate: number;
  slowQueryCount: number;
}> = ({ totalQueries, totalSuccess, cacheHitRate, slowQueryCount }) => {
  const successRate = totalQueries > 0 ? (totalSuccess / totalQueries) * 100 : 0;

  const stats = [
    {
      label: i18n.t('components.performance_panel.k6'),
      value: totalQueries.toString(),
      icon: <TrendingUp size={18} />,
      color: 'primary.main',
    },
    {
      label: i18n.t('components.performance_panel.k7'),
      value: `${successRate.toFixed(1)}%`,
      icon: <CheckCircle size={18} />,
      color: successRate >= 95 ? 'success.main' : successRate >= 80 ? 'warning.main' : 'error.main',
    },
    {
      label: i18n.t('components.performance_panel.k8'),
      value: `${cacheHitRate.toFixed(1)}%`,
      icon: <Database size={18} />,
      color: 'info.main',
    },
    {
      label: i18n.t('components.performance_panel.k9'),
      value: slowQueryCount.toString(),
      icon: <Clock size={18} />,
      color: slowQueryCount > 0 ? 'error.main' : 'success.main',
    },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
      {stats.map((stat) => (
        <Paper
          key={stat.label}
          variant='outlined'
          sx={{ p: 1.5, textAlign: 'center' }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              mb: 0.5,
            }}
          >
            <Box sx={{ color: stat.color }}>{stat.icon}</Box>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {stat.label}
            </Typography>
          </Box>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600, color: stat.color }}
          >
            {stat.value}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
};

/**
 * BFF 性能面板组件
 */
const QueryCostPanel: React.FC<{ recentRecords: QueryPerformanceRecord[] }> = ({
  recentRecords,
}) => {
  const costAnalyses = useMemo(() => {
    const uniqueQueries = new Map<string, { query: string; record: QueryPerformanceRecord }>();
    for (const record of recentRecords.slice(0, 50)) {
      const key = record.operationName;
      if (!uniqueQueries.has(key)) {
        uniqueQueries.set(key, { query: record.operationName, record });
      }
    }

    return Array.from(uniqueQueries.values()).map(({ query, record }) => {
      let analysis: QueryCostAnalysis | null = null;
      try {
        analysis = analyzeQueryCost(record.operationName);
      } catch {
        // ignore
      }
      return {
        operationName: record.operationName,
        duration: record.duration,
        analysis,
        timestamp: record.timestamp,
      };
    });
  }, [recentRecords]);

  const highCostCount = costAnalyses.filter(
    (c) => c.analysis && (c.analysis.level === 'high' || c.analysis.level === 'critical')
  ).length;

  if (costAnalyses.length === 0) {
    return (
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ py: 4, textAlign: 'center' }}
      >
        {i18n.t('components.performance_panel.k4')}
      </Typography>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Paper
          variant='outlined'
          sx={{ p: 1.5, flex: 1, minWidth: 100, textAlign: 'center' }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              mb: 0.5,
            }}
          >
            <BarChart3
              size={16}
              color='primary.main'
            />
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('components.performance_panel.k5')}
            </Typography>
          </Box>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
            color='primary.main'
          >
            {costAnalyses.length}
          </Typography>
        </Paper>
        <Paper
          variant='outlined'
          sx={{ p: 1.5, flex: 1, minWidth: 100, textAlign: 'center' }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              mb: 0.5,
            }}
          >
            <AlertTriangle
              size={16}
              color='error.main'
            />
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {i18n.t('components.performance_panel.k6')}
            </Typography>
          </Box>
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
            color='error.main'
          >
            {highCostCount}
          </Typography>
        </Paper>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
        {costAnalyses.map((item) => {
          const analysis = item.analysis;
          if (!analysis) return null;

          const color = getCostLevelColor(analysis.level);
          const label = getCostLevelLabel(analysis.level);

          return (
            <Paper
              key={item.operationName}
              variant='outlined'
              sx={{
                p: 1.5,
                mb: 1,
                borderLeft: `4px solid ${color}`,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                }}
              >
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 600 }}
                >
                  {item.operationName}
                </Typography>
                <Chip
                  size='small'
                  label={label}
                  sx={{
                    bgcolor: color,
                    color: 'common.white',
                    fontWeight: 600,
                  }}
                />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 1 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('components.performance_panel.k7')}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 600 }}
                  >
                    {analysis.score}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('components.performance_panel.k8')}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 600 }}
                  >
                    {analysis.fieldCount}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('components.performance_panel.k9')}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 600 }}
                  >
                    {analysis.depth}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('components.performance_panel.k10')}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{ fontWeight: 600 }}
                  >
                    {analysis.estimatedSizeKB.toFixed(1)}KB
                  </Typography>
                </Box>
              </Box>

              {analysis.suggestions.length > 0 &&
                analysis.suggestions[0] !== i18n.t('components.performance_panel.k10') && (
                  <Box sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Lightbulb
                        size={14}
                        color='warning.main'
                      />
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {i18n.t('components.performance_panel.k11')}
                      </Typography>
                    </Box>
                    {analysis.suggestions.map((suggestion, idx) => (
                      <Typography
                        key={idx}
                        variant='caption'
                        color='text.secondary'
                        sx={{ display: 'block' }}
                      >
                        • {suggestion}
                      </Typography>
                    ))}
                  </Box>
                )}
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
};

const SmartOptimizationPanel: React.FC = () => {
  const features = [
    {
      icon: <Layers size={20} />,
      title: i18n.t('components.performance_panel.k11'),
      description: i18n.t('components.performance_panel.k12'),
      status: 'available',
    },
    {
      icon: <Zap size={20} />,
      title: i18n.t('components.performance_panel.k13'),
      description: i18n.t('components.performance_panel.k14'),
      status: 'available',
    },
    {
      icon: <Brain size={20} />,
      title: i18n.t('components.performance_panel.k15'),
      description: i18n.t('components.performance_panel.k16'),
      status: 'available',
    },
  ];

  return (
    <Box>
      <Typography
        variant='subtitle2'
        sx={{ mb: 2, fontWeight: 600 }}
      >
        {i18n.t('components.performance_panel.v410_12')}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {features.map((feature) => (
          <Paper
            key={feature.title}
            variant='outlined'
            sx={{
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: 'primary.50',
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {feature.icon}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant='body2'
                sx={{ fontWeight: 600 }}
              >
                {feature.title}
              </Typography>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {feature.description}
              </Typography>
            </Box>
            <Chip
              size='small'
              label={i18n.t('components.performance_panel.k17')}
              color='success'
              variant='outlined'
            />
          </Paper>
        ))}
      </Box>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 2 }}>
        <Typography
          variant='caption'
          color='info.dark'
        >
          {i18n.t('components.performance_panel.k13')}
          {i18n.t('components.performance_panel.k14')}
        </Typography>
      </Box>
    </Box>
  );
};

/**
 * V42.0 Track D: Suspense / PPR / 渐进式水合 统计面板
 *
 * 显示数据加载层级、Suspense 边界挂载、PPR slot 流式填充、渐进式水合状态。
 */
const SuspenseStatsPanel: React.FC = () => {
  const [suspenseRecords, setSuspenseRecords] = useState<SuspenseMountRecord[]>([]);
  const [pprRecords, setPprRecords] = useState<PPRSlotRecord[]>([]);
  const [hydrationRecords, setHydrationRecords] = useState<HydrationRecord[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    const off1 = onSuspenseStatsChange(() => {
      setSuspenseRecords(getSuspenseStats().records);
      setTick((t) => t + 1);
    });
    const off2 = onPPRStatsChange(() => {
      setPprRecords(getPPRStats().records);
      setTick((t) => t + 1);
    });
    const off3 = onHydrationStatsChange(() => {
      setHydrationRecords(getHydrationStats().records);
      setTick((t) => t + 1);
    });
    // 初始拉取
    setSuspenseRecords(getSuspenseStats().records);
    setPprRecords(getPPRStats().records);
    setHydrationRecords(getHydrationStats().records);
    return () => {
      off1();
      off2();
      off3();
    };
  }, []);

  const suspenseStats = getSuspenseStats();
  const pprStats = getPPRStats();
  const hydrationStats = getHydrationStats();

  const overviewItems = [
    {
      label: i18n.t('components.performance_panel.suspense_0'),
      value: suspenseStats.totalMounts,
      sub: `${suspenseStats.uniqueBoundaries}${i18n.t('components.performance_panel.k1')}`,
      color: 'primary.main',
    },
    {
      label: 'PPR Slot',
      value: pprStats.totalSlots,
      sub: `${pprStats.loadedSlots}/${pprStats.totalSlots}${i18n.t('components.performance_panel.k2')}`,
      color: pprStats.pendingSlots > 0 ? 'warning.main' : 'success.main',
    },
    {
      label: i18n.t('components.performance_panel.k18'),
      value: hydrationStats.totalComponents,
      sub: `${hydrationStats.hydratedCount}/${hydrationStats.totalComponents}${i18n.t('components.performance_panel.k3')}`,
      color: hydrationStats.pendingCount > 0 ? 'warning.main' : 'success.main',
    },
    {
      label: i18n.t('components.performance_panel.k19'),
      value: `${hydrationStats.avgDuration.toFixed(0)}ms`,
      sub: `${i18n.t('components.performance_panel.suspense_4')}${suspenseStats.avgDuration.toFixed(0)}ms`,
      color: 'info.main',
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 2 }}>
        {overviewItems.map((item) => (
          <Paper
            key={item.label}
            variant='outlined'
            sx={{ p: 1.5, textAlign: 'center' }}
          >
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {item.label}
            </Typography>
            <Typography
              variant='h6'
              sx={{ color: item.color }}
            >
              {item.value}
            </Typography>
            <Typography
              variant='caption'
              color='text.secondary'
            >
              {item.sub}
            </Typography>
          </Paper>
        ))}
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Suspense 挂载记录 */}
      <Typography
        variant='subtitle2'
        sx={{ mb: 1, fontWeight: 600 }}
      >
        {i18n.t('components.performance_panel.suspense_15')}
      </Typography>
      <Box sx={{ maxHeight: 150, overflow: 'auto', mb: 2 }}>
        {suspenseRecords.length === 0 ? (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ py: 2, textAlign: 'center' }}
          >
            {i18n.t('components.performance_panel.k16')}
          </Typography>
        ) : (
          suspenseRecords.slice(0, 10).map((record, index) => (
            <Paper
              key={`${record.name}-${index}`}
              variant='outlined'
              sx={{ p: 1, mb: 0.5, display: 'flex', justifyContent: 'space-between' }}
            >
              <Typography
                variant='caption'
                sx={{ fontWeight: 500 }}
              >
                {record.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  size='small'
                  variant='outlined'
                  color={record.duration !== null ? 'success' : 'warning'}
                  label={record.duration !== null ? `${record.duration}ms` : i18n.t('components.performance_panel.k20')}
                />
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {new Date(record.mountedAt).toLocaleTimeString()}
                </Typography>
              </Box>
            </Paper>
          ))
        )}
      </Box>

      {/* PPR Slot 记录 */}
      <Typography
        variant='subtitle2'
        sx={{ mb: 1, fontWeight: 600 }}
      >
        {i18n.t('components.performance_panel.pprslot_17')}
      </Typography>
      <Box sx={{ maxHeight: 150, overflow: 'auto', mb: 2 }}>
        {pprRecords.length === 0 ? (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ py: 2, textAlign: 'center' }}
          >
            {i18n.t('components.performance_panel.pprslot_18')}
          </Typography>
        ) : (
          pprRecords.slice(0, 10).map((record, index) => (
            <Paper
              key={`${record.name}-${index}`}
              variant='outlined'
              sx={{
                p: 1,
                mb: 0.5,
                display: 'flex',
                justifyContent: 'space-between',
                borderLeft: `4px solid ${record.loaded ? 'success.main' : 'warning.main'}`,
              }}
            >
              <Box>
                <Typography
                  variant='caption'
                  sx={{ fontWeight: 500 }}
                >
                  {record.name}
                </Typography>
                {record.route && (
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ display: 'block' }}
                  >
                    {record.route} {i18n.t('components.performance_panel.k0')} {record.priority}
                  </Typography>
                )}
              </Box>
              <Chip
                size='small'
                color={record.loaded ? 'success' : 'warning'}
                label={record.loaded ? `${i18n.t('components.performance_panel.k5')}${record.duration ?? 0}ms` : i18n.t('components.performance_panel.k21')}
                variant='outlined'
              />
            </Paper>
          ))
        )}
      </Box>

      {/* 渐进式水合记录 */}
      <Typography
        variant='subtitle2'
        sx={{ mb: 1, fontWeight: 600 }}
      >
        {i18n.t('components.performance_panel.k19')}
      </Typography>
      <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
        {hydrationRecords.length === 0 ? (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ py: 2, textAlign: 'center' }}
          >
            {i18n.t('components.performance_panel.k20')}
          </Typography>
        ) : (
          hydrationRecords.slice(0, 10).map((record, index) => (
            <Paper
              key={`${record.id}-${index}`}
              variant='outlined'
              sx={{
                p: 1,
                mb: 0.5,
                display: 'flex',
                justifyContent: 'space-between',
                borderLeft: `4px solid ${
                  record.status === 'hydrated'
                    ? 'success.main'
                    : record.status === 'hydrating'
                      ? 'info.main'
                      : 'warning.main'
                }`,
              }}
            >
              <Box>
                <Typography
                  variant='caption'
                  sx={{ fontWeight: 500 }}
                >
                  {record.id}
                </Typography>
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ display: 'block' }}
                >
                  {record.priority} · {record.trigger}
                </Typography>
              </Box>
              <Chip
                size='small'
                color={
                  record.status === 'hydrated'
                    ? 'success'
                    : record.status === 'hydrating'
                      ? 'info'
                      : 'warning'
                }
                label={
                  record.status === 'hydrated'
                    ? `${record.duration ?? 0}ms`
                    : record.status === 'hydrating'
                      ? i18n.t('components.performance_panel.k22')
                      : i18n.t('components.performance_panel.k23')
                }
                variant='outlined'
              />
            </Paper>
          ))
        )}
      </Box>
    </Box>
  );
};

export const PerformancePanel: React.FC<PerformancePanelProps> = ({
  defaultExpanded = false,
  position = 'bottom-right',
  devOnly = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState(0);

  const {
    stats,
    recentRecords,
    slowQueries,
    slowQueryThreshold,
    setSlowQueryThreshold,
    totalQueries,
    totalSuccess,
    totalErrors,
    cacheHitRate,
    clearPerformanceStats,
  } = useBffPerformance();

  const showPanel = !devOnly || isDevMode();

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      threshold: slowQueryThreshold,
      stats,
      recentRecords: recentRecords.slice(0, 100),
      slowQueries,
      summary: {
        totalQueries,
        totalSuccess,
        totalErrors,
        cacheHitRate,
        slowQueryCount: slowQueries.length,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bff-performance-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!showPanel) {
    return null;
  }

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        zIndex: 9999,
        width: expanded ? 640 : 200,
        maxWidth: '90vw',
        maxHeight: expanded ? '80vh' : 'auto',
        ...positionStyles[position],
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 标题栏 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp size={18} />
          <Typography
            variant='subtitle2'
            sx={{ fontWeight: 600 }}
          >
            {i18n.t('components.performance_panel.bff_21')}
          </Typography>
          {!expanded && slowQueries.length > 0 && (
            <Chip
              size='small'
              color='error'
              label={slowQueries.length}
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Box>
        <IconButton
          size='small'
          sx={{ color: 'inherit' }}
          aria-label={i18n.t('components.performance_panel.k24')}
        >
          {expanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </IconButton>
      </Box>

      {/* 展开内容 */}
      <Collapse
        in={expanded}
        sx={{ flex: 1, overflow: 'hidden' }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* 概览统计 */}
          <Box sx={{ p: 2, pb: 1 }}>
            <OverviewStats
              totalQueries={totalQueries}
              totalSuccess={totalSuccess}
              totalErrors={totalErrors}
              cacheHitRate={cacheHitRate}
              slowQueryCount={slowQueries.length}
            />
          </Box>

          {/* 工具栏 */}
          <Box
            sx={{ px: 2, pb: 1, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}
          >
            <FormControl
              size='small'
              sx={{ minWidth: 120 }}
            >
              <InputLabel>{i18n.t('components.performance_panel.k25')}</InputLabel>
              <Select
                value={slowQueryThreshold}
                label={i18n.t('components.performance_panel.k26')}
                onChange={(e) => setSlowQueryThreshold(e.target.value as number)}
              >
                <MenuItem value={500}>500ms</MenuItem>
                <MenuItem value={1000}>1000ms</MenuItem>
                <MenuItem value={2000}>2000ms</MenuItem>
                <MenuItem value={5000}>5000ms</MenuItem>
                <MenuItem value={10000}>10000ms</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ flex: 1 }} />

            <Tooltip title={i18n.t('components.performance_panel.k27')}>
              <IconButton
                size='small'
                onClick={handleExport}
                aria-label={i18n.t('components.performance_panel.k28')}
              >
                <Download size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title={i18n.t('components.performance_panel.k29')}>
              <IconButton
                size='small'
                onClick={clearPerformanceStats}
                color='error'
                aria-label={i18n.t('components.performance_panel.k30')}
              >
                <Trash2 size={18} />
              </IconButton>
            </Tooltip>
          </Box>

          <Divider />

          {/* 标签页 */}
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ px: 1 }}
          >
            <Tab label={i18n.t('components.performance_panel.k31')} />
            <Tab label={`${i18n.t('components.performance_panel.k6')}${slowQueries.length})`} />
            <Tab label={i18n.t('components.performance_panel.k32')} />
            <Tab label={i18n.t('components.performance_panel.k33')} />
            <Tab label={i18n.t('components.performance_panel.k34')} />
            <Tab label='Suspense' />
          </Tabs>

          {/* 标签页内容 */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2, pt: 1 }}>
            {activeTab === 0 && (
              <PerformanceRankingTable
                stats={stats}
                threshold={slowQueryThreshold}
              />
            )}
            {activeTab === 1 && (
              <SlowQueryList
                slowQueries={slowQueries}
                threshold={slowQueryThreshold}
              />
            )}
            {activeTab === 2 && (
              <RealtimeTimeline
                recentRecords={recentRecords}
                threshold={slowQueryThreshold}
              />
            )}
            {activeTab === 3 && <QueryCostPanel recentRecords={recentRecords} />}
            {activeTab === 4 && <SmartOptimizationPanel />}
            {activeTab === 5 && <SuspenseStatsPanel />}
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default PerformancePanel;
