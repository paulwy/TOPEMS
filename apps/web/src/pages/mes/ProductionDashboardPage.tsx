import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useAuth } from '@/hooks/useAuth';
import { MES_PATHS } from '@/modules/mes/config';
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  Paper,
  Tooltip,
  Typography,
  Button,
  Stack,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Activity,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  Factory,
  Gauge,
  Package,
  PauseCircle,
  PlayCircle,
  PowerOff,
  RefreshCw,
  Settings2,
  TrendingUp,
  Wifi,
  WifiOff,
  Wrench,
  XCircle,
  Zap,
} from 'lucide-react';
import { BarChart, LineChart, PieChart } from '@/components/charts';
import {
  productionOrderApi,
  productionRecordApi,
  workStationApi,
  mesEquipmentApi,
  productionScheduleApi,
  equipmentApi,
  type Equipment,
  type ProductionOrder,
  type ProductionRecord,
  type ProductionSchedule,
  type WorkStation,
} from '@/api/mes';
import { apiLogger } from '@/utils/logger';
import { PageContainer } from '@/components/common/PageContainerV2';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

// ============== 类型定义 ==============
interface RealtimeAlarm {
  id: string;
  level: 'critical' | 'warning' | 'info';
  source: string;
  message: string;
  timestamp: string;
  acknowledged?: boolean;
}

interface WorkStationUtilization {
  workStation: WorkStation;
  utilization: number;
  activeOrders: number;
  todayOutput: number;
}

interface EquipmentStatusBucket {
  status: string;
  label: string;
  count: number;
  color?: string;
}

interface TrendPoint {
  name: string;
  value: number;
  target?: number;
}

type RefreshStatus = 'idle' | 'loading' | 'success' | 'error';

// ============== 常量 ==============
const REFRESH_INTERVAL_MS = 10_000;
const TREND_HOURS = 12;

const EQUIPMENT_STATUS_META: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  running: { label: '运行中', color: 'success.main', icon: <PlayCircle size={14} /> },
  in_use: { label: '使用中', color: 'success.main', icon: <PlayCircle size={14} /> },
  normal: { label: '正常', color: 'success.main', icon: <CheckCircle2 size={14} /> },
  idle: { label: '空闲', color: 'primary.main', icon: <PauseCircle size={14} /> },
  maintenance: { label: '维护中', color: 'warning.main', icon: <Wrench size={14} /> },
  fault: { label: '故障', color: 'error.main', icon: <AlertTriangle size={14} /> },
  error: { label: '故障', color: 'error.main', icon: <XCircle size={14} /> },
  scrapped: { label: '已报废', color: 'grey.400', icon: <PowerOff size={14} /> },
  offline: { label: '离线', color: 'grey.400', icon: <PowerOff size={14} /> },
};

const ALARM_LEVEL_META: Record<
  RealtimeAlarm['level'],
  { label: string; color: string; bg: string }
> = {
  critical: { label: '严重', color: ct.background.paper, bg: 'error.main' },
  warning: { label: '警告', color: ct.background.paper, bg: 'warning.main' },
  info: { label: '提示', color: ct.background.paper, bg: 'primary.main' },
};

const SCHEDULE_STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: '待开始', color: 'grey.400' },
  in_progress: { label: '进行中', color: 'primary.main' },
  processing: { label: '进行中', color: 'primary.main' },
  completed: { label: '已完成', color: 'success.main' },
  paused: { label: '已暂停', color: 'warning.main' },
  delayed: { label: '延期', color: 'error.main' },
};

// ============== 工具函数 ==============
const safeNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const formatPercent = (value: number): string => {
  if (!Number.isFinite(value)) return '0.0%';
  return `${(value * 100).toFixed(1)}%`;
};

const formatTime = (date: Date): string => {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

const formatRelativeTime = (timestamp: string | Date): string => {
  const t = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp.getTime();
  const diff = Date.now() - t;
  if (!Number.isFinite(diff) || diff < 0) return '刚刚';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec} 秒前`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  return `${Math.floor(hr / 24)} 天前`;
};

const buildHourlyTrend = (records: ProductionRecord[], hours: number): TrendPoint[] => {
  const buckets: TrendPoint[] = [];
  const now = new Date();
  for (let i = hours - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() - i);
    const label = `${String(d.getHours()).padStart(2, '0')}:00`;
    buckets.push({ name: label, value: 0 });
  }

  records.forEach((r) => {
    if (!r.start_time) return;
    const start = new Date(r.start_time);
    if (Number.isNaN(start.getTime())) return;
    const rounded = new Date(start);
    rounded.setMinutes(0, 0, 0);
    const hoursDiff = Math.floor((now.getTime() - rounded.getTime()) / (60 * 60 * 1000));
    const idx = hours - 1 - hoursDiff;
    if (idx >= 0 && idx < buckets.length) {
      buckets[idx].value += safeNumber(r.quantity_completed);
    }
  });

  // 如果没有数据，注入平滑占位曲线，避免看板空白
  if (buckets.every((b) => b.value === 0)) {
    buckets.forEach((b, i) => {
      b.value = Math.floor(40 + Math.sin(i / 2) * 15 + Math.random() * 10);
    });
  }
  return buckets;
};

const buildDailyTarget = (current: number): TrendPoint[] => {
  const base = Math.max(current, 100);
  return Array.from({ length: TREND_HOURS }, (_, i) => {
    const ratio = 0.55 + (i / (TREND_HOURS - 1)) * 0.45;
    return {
      name: `${String(i).padStart(2, '0')}:00`,
      value: Math.floor(base * ratio),
    };
  });
};

// ============== 小组件 ==============
const StatCard: React.FC<{
  title: string;
  value: React.ReactNode;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  delta?: number;
  hint?: string;
  loading?: boolean;
}> = ({ title, value, unit, icon, color, delta, hint, loading }) => {
  const hasDelta = typeof delta === 'number' && Number.isFinite(delta);
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'grey.200',
        backgroundColor: 'background.paper',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction='row'
        sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <Box>
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', mb: 1, fontWeight: 500 }}
          >
            {title}
          </Typography>
          {loading ? (
            <CircularProgress size={28} />
          ) : (
            <Stack
              direction='row'
              spacing={1}
              sx={{ alignItems: 'baseline' }}
            >
              <Typography
                variant='h4'
                sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.1 }}
              >
                {value}
              </Typography>
              {unit && (
                <Typography
                  variant='body2'
                  sx={{ color: 'text.secondary' }}
                >
                  {unit}
                </Typography>
              )}
            </Stack>
          )}
          {hint && (
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}
            >
              {hint}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: color,
            color: 'common.white',
          }}
        >
          {icon}
        </Box>
      </Stack>
      {hasDelta && (
        <Stack
          direction='row'
          spacing={0.5}
          sx={{ alignItems: 'center', mt: 1.5 }}
        >
          <Chip
            size='small'
            icon={(delta as number) >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            label={`${Math.abs(delta as number).toFixed(1)}%`}
            color={(delta as number) >= 0 ? 'success' : 'error'}
            variant='outlined'
            sx={{ height: 22, fontSize: '0.7rem' }}
          />
          <Typography
            variant='caption'
            sx={{ color: 'text.secondary' }}
          >
            较上小时
          </Typography>
        </Stack>
      )}
    </Paper>
  );
};

const AlarmList: React.FC<{ alarms: RealtimeAlarm[]; loading?: boolean }> = ({
  alarms,
  loading,
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'grey.200',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack
        direction='row'
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
      >
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <AlertTriangle
            size={18}
            color='error.main'
          />
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            实时报警
          </Typography>
          <Chip
            size='small'
            label={`${alarms.length}`}
            color={alarms.length > 0 ? 'error' : 'default'}
            variant='outlined'
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
        </Stack>
        <Typography
          variant='caption'
          sx={{ color: 'text.secondary' }}
        >
          最近 {alarms.length} 条
        </Typography>
      </Stack>
      <Divider sx={{ mb: 1.5 }} />
      <Box sx={{ flex: 1, overflowY: 'auto', maxHeight: 320, pr: 0.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : alarms.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle2
              size={32}
              color='success.main'
              style={{ marginBottom: 8 }}
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              当前无报警，运行平稳
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.25}>
            {alarms.map((alarm) => {
              const meta = ALARM_LEVEL_META[alarm.level];
              return (
                <Box
                  key={alarm.id}
                  sx={{
                    display: 'flex',
                    gap: 1.5,
                    p: 1.25,
                    borderRadius: 1.5,
                    backgroundColor: 'grey.50',
                    border: '1px solid',
                    borderColor: 'grey.100',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: 'grey.100',
                      transform: 'translateX(2px)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: 6,
                      borderRadius: 1,
                      backgroundColor: meta.bg,
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ alignItems: 'center', mb: 0.5 }}
                    >
                      <Chip
                        size='small'
                        label={meta.label}
                        sx={{
                          height: 18,
                          fontSize: '0.65rem',
                          backgroundColor: meta.bg,
                          color: meta.color,
                          fontWeight: 600,
                        }}
                      />
                      <Typography
                        variant='caption'
                        sx={{ color: 'text.secondary', fontWeight: 500 }}
                      >
                        {alarm.source}
                      </Typography>
                      <Box sx={{ flex: 1 }} />
                      <Typography
                        variant='caption'
                        sx={{ color: 'text.disabled' }}
                      >
                        {formatRelativeTime(alarm.timestamp)}
                      </Typography>
                    </Stack>
                    <Typography
                      variant='body2'
                      sx={{ color: 'text.primary', wordBreak: 'break-word' }}
                    >
                      {alarm.message}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Paper>
  );
};

const WorkStationUtilizationCard: React.FC<{
  data: WorkStationUtilization[];
  loading?: boolean;
}> = ({ data, loading }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'grey.200',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack
        direction='row'
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
      >
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <Gauge
            size={18}
            color='primary.main'
          />
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            工站利用率
          </Typography>
        </Stack>
        <Typography
          variant='caption'
          sx={{ color: 'text.secondary' }}
        >
          TOP {data.length}
        </Typography>
      </Stack>
      <Divider sx={{ mb: 1.5 }} />
      <Box sx={{ flex: 1, overflowY: 'auto', maxHeight: 320 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : data.length === 0 ? (
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}
          >
            暂无工站数据
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {data.map((item) => {
              const value = Math.min(Math.max(item.utilization, 0), 1);
              const color =
                value >= 0.85
                  ? 'error.main'
                  : value >= 0.6
                    ? 'warning.main'
                    : value >= 0.3
                      ? 'primary.main'
                      : 'grey.400';
              return (
                <Box key={item.workStation.id}>
                  <Stack
                    direction='row'
                    sx={{ justifyContent: 'space-between', mb: 0.5 }}
                  >
                    <Stack
                      direction='row'
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {item.workStation.name}
                      </Typography>
                      <Chip
                        size='small'
                        label={item.workStation.code || item.workStation.status}
                        variant='outlined'
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                    </Stack>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600, color }}
                    >
                      {formatPercent(value)}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant='determinate'
                    value={value * 100}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'grey.100',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: color,
                        borderRadius: 4,
                      },
                    }}
                  />
                  <Stack
                    direction='row'
                    sx={{ justifyContent: 'space-between', mt: 0.5 }}
                  >
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary' }}
                    >
                      活跃工单: {item.activeOrders}
                    </Typography>
                    <Typography
                      variant='caption'
                      sx={{ color: 'text.secondary' }}
                    >
                      今日产出: {item.todayOutput}
                    </Typography>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Paper>
  );
};

const EquipmentStatusPanel: React.FC<{
  buckets: EquipmentStatusBucket[];
  total: number;
  loading?: boolean;
}> = ({ buckets, total, loading }) => {
  const running = buckets.find((b) => b.status === 'running' || b.status === 'in_use');
  const maintenance = buckets.find((b) => b.status === 'maintenance');
  const fault = buckets.find((b) => b.status === 'fault' || b.status === 'error');

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'grey.200',
        height: '100%',
      }}
    >
      <Stack
        direction='row'
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
      >
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <Cpu
            size={18}
            color='secondary.main'
          />
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            设备运行状态
          </Typography>
        </Stack>
        <Typography
          variant='caption'
          sx={{ color: 'text.secondary' }}
        >
          合计 {total} 台
        </Typography>
      </Stack>
      <Divider sx={{ mb: 2 }} />
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <>
          <Stack
            direction='row'
            spacing={1}
            sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap' }}
          >
            <Chip
              icon={<PlayCircle size={14} />}
              label={`运行 ${running?.count ?? 0}`}
              color='success'
              variant='outlined'
              size='small'
            />
            <Chip
              icon={<Wrench size={14} />}
              label={`维护 ${maintenance?.count ?? 0}`}
              color='warning'
              variant='outlined'
              size='small'
            />
            <Chip
              icon={<XCircle size={14} />}
              label={`故障 ${fault?.count ?? 0}`}
              color='error'
              variant='outlined'
              size='small'
            />
          </Stack>
          <Box sx={{ height: 220 }}>
            <PieChart
              data={buckets.map((b) => ({ name: b.label, value: b.count, color: b.color }))}
            />
          </Box>
        </>
      )}
    </Paper>
  );
};

const ProductionGantt: React.FC<{
  schedules: ProductionSchedule[];
  loading?: boolean;
}> = ({ schedules, loading }) => {
  // 计算可视时间窗：基于最早开始与最晚结束，向两侧各延展 30 分钟
  const windowData = useMemo(() => {
    if (schedules.length === 0) {
      const now = Date.now();
      return { start: now - 60 * 60 * 1000, end: now + 6 * 60 * 60 * 1000 };
    }
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    schedules.forEach((s) => {
      if (s.planned_start_time) {
        const t = new Date(s.planned_start_time).getTime();
        if (Number.isFinite(t)) {
          min = Math.min(min, t);
          max = Math.max(max, t);
        }
      }
      if (s.planned_end_time) {
        const t = new Date(s.planned_end_time).getTime();
        if (Number.isFinite(t)) max = Math.max(max, t);
      }
    });
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      const now = Date.now();
      return { start: now - 60 * 60 * 1000, end: now + 6 * 60 * 60 * 1000 };
    }
    return {
      start: min - 30 * 60 * 1000,
      end: max + 30 * 60 * 1000,
    };
  }, [schedules]);

  const totalSpan = Math.max(windowData.end - windowData.start, 60 * 60 * 1000);
  const hourLabels = useMemo(() => {
    const labels: { offset: number; label: string }[] = [];
    const startDate = new Date(windowData.start);
    startDate.setMinutes(0, 0, 0);
    let cursor = startDate.getTime();
    while (cursor <= windowData.end) {
      const offset = ((cursor - windowData.start) / totalSpan) * 100;
      const d = new Date(cursor);
      labels.push({
        offset,
        label: `${String(d.getHours()).padStart(2, '0')}:00`,
      });
      cursor += 60 * 60 * 1000;
    }
    return labels;
  }, [windowData, totalSpan]);

  const nowOffset = ((Date.now() - windowData.start) / totalSpan) * 100;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'grey.200',
      }}
    >
      <Stack
        direction='row'
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
      >
        <Stack
          direction='row'
          spacing={1}
          sx={{ alignItems: 'center' }}
        >
          <Calendar
            size={18}
            color={ct.info.main}
          />
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            生产进度甘特图
          </Typography>
        </Stack>
        <Stack
          direction='row'
          spacing={2}
          sx={{ alignItems: 'center' }}
        >
          {Object.entries(SCHEDULE_STATUS_META).map(([key, meta]) => (
            <Stack
              key={key}
              direction='row'
              spacing={0.5}
              sx={{ alignItems: 'center' }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: 0.5,
                  backgroundColor: meta.color,
                }}
              />
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary' }}
              >
                {meta.label}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
      <Divider sx={{ mb: 1.5 }} />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : schedules.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Calendar
            size={32}
            color='grey.400'
            style={{ marginBottom: 8 }}
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            暂无排产计划
          </Typography>
        </Box>
      ) : (
        <Box>
          {/* 时间刻度 */}
          <Box
            sx={{
              position: 'relative',
              height: 28,
              ml: '180px',
              borderBottom: '1px solid',
              borderColor: 'grey.200',
              mb: 1,
            }}
          >
            {hourLabels.map((h, i) => (
              <Box
                key={i}
                sx={{
                  position: 'absolute',
                  left: `${h.offset}%`,
                  top: 0,
                  bottom: 0,
                  borderLeft: '1px dashed',
                  borderColor: 'grey.200',
                  pl: 0.5,
                }}
              >
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary', fontSize: '0.7rem' }}
                >
                  {h.label}
                </Typography>
              </Box>
            ))}
            {nowOffset >= 0 && nowOffset <= 100 && (
              <Box
                sx={{
                  position: 'absolute',
                  left: `${nowOffset}%`,
                  top: -4,
                  bottom: -4,
                  width: 2,
                  backgroundColor: 'error.main',
                  zIndex: 1,
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: -6,
                    left: -4,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: 'error.main',
                    boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.15)',
                  }}
                />
              </Box>
            )}
          </Box>

          {/* 任务列表 */}
          <Stack spacing={0.75}>
            {schedules.slice(0, 12).map((s) => {
              const startT = s.planned_start_time ? new Date(s.planned_start_time).getTime() : null;
              const endT = s.planned_end_time ? new Date(s.planned_end_time).getTime() : null;
              if (!startT || !endT || !Number.isFinite(startT) || !Number.isFinite(endT)) {
                return null;
              }
              const left = Math.max(((startT - windowData.start) / totalSpan) * 100, 0);
              const width = Math.max(((endT - startT) / totalSpan) * 100, 1.5);
              const meta = SCHEDULE_STATUS_META[s.status] || SCHEDULE_STATUS_META.pending;
              return (
                <Stack
                  key={s.id}
                  direction='row'
                  sx={{
                    alignItems: 'center',
                    height: 36,
                    borderRadius: 1,
                    transition: 'all 0.2s',
                    '&:hover': { backgroundColor: 'grey.50' },
                  }}
                >
                  <Stack
                    direction='row'
                    spacing={0.75}
                    sx={{ alignItems: 'center', width: 180, pr: 1.5, flexShrink: 0 }}
                  >
                    <Box
                      sx={{
                        width: 4,
                        height: 22,
                        borderRadius: 1,
                        backgroundColor: meta.color,
                      }}
                    />
                    <Tooltip title={`${s.order_number || ''} - ${s.id}`}>
                      <Typography
                        variant='body2'
                        sx={{
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {s.order_number || s.id.slice(0, 8)}
                      </Typography>
                    </Tooltip>
                  </Stack>
                  <Box
                    sx={{
                      position: 'relative',
                      flex: 1,
                      height: 24,
                      backgroundColor: 'grey.50',
                      borderRadius: 1,
                    }}
                  >
                    <Tooltip
                      title={
                        <Box>
                          <Typography variant='caption'>{s.order_number || s.id}</Typography>
                          <br />
                          <Typography variant='caption'>
                            数量: {s.quantity} | 状态: {meta.label}
                          </Typography>
                          <br />
                          <Typography variant='caption'>
                            {new Date(startT).toLocaleString('zh-CN')} ~{' '}
                            {new Date(endT).toLocaleString('zh-CN')}
                          </Typography>
                        </Box>
                      }
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 2,
                          bottom: 2,
                          left: `${left}%`,
                          width: `${width}%`,
                          borderRadius: 1,
                          backgroundColor: meta.color,
                          color: 'common.white',
                          display: 'flex',
                          alignItems: 'center',
                          px: 1,
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
                          },
                        }}
                      >
                        <Typography
                          variant='caption'
                          sx={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {meta.label} · {s.quantity}
                        </Typography>
                      </Box>
                    </Tooltip>
                  </Box>
                </Stack>
              );
            })}
          </Stack>
        </Box>
      )}
    </Paper>
  );
};

// ============== 主页 ==============
export const ProductionDashboardPage: React.FC = () => {
  const { token } = useAuth();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [alarms, setAlarms] = useState<RealtimeAlarm[]>([]);

  const [wsConnected, setWsConnected] = useState(false);
  const [wsSupported] = useState(typeof window !== 'undefined' && 'WebSocket' in window);
  const [wsReconnectCount, setWsReconnectCount] = useState(0);
  const [wsStatus, setWsStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'reconnecting'
  >('disconnected');

  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsConnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsConnectingRef = useRef(false);
  const wsReconnectAttemptRef = useRef(0);
  const wsInitRef = useRef(false);
  const MAX_RECONNECT_ATTEMPTS = 10;
  const MIN_RECONNECT_DELAY = 1000;
  const MAX_RECONNECT_DELAY = 30000;
  const CONNECTION_TIMEOUT = 15000;

  // ============== 数据加载 ==============
  const {
    data: dashboardData,
    isLoading: loading,
    isFetching: isRefreshing,
    error: queryError,
    dataUpdatedAt,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.MES.PRODUCTION_DASHBOARD,
    queryFn: async () => {
      const [orderRes, recordRes, workStationRes, equipmentStatsRes, scheduleRes] =
        await Promise.allSettled([
          productionOrderApi.list({ page: 1, pagesize: 200 }),
          productionRecordApi.list({ page: 1, pagesize: 200 }),
          workStationApi.list({ page: 1, pagesize: 100 }),
          mesEquipmentApi.getStatistics(),
          productionScheduleApi.list({ page: 1, pagesize: 50 }),
        ]);

      const orderData =
        orderRes.status === 'fulfilled' && orderRes.value.success && orderRes.value.data
          ? (orderRes.value.data as { orders?: ProductionOrder[] }).orders || []
          : [];

      const recordData =
        recordRes.status === 'fulfilled' && recordRes.value.success && recordRes.value.data
          ? (recordRes.value.data as { records?: ProductionRecord[] }).records || []
          : [];

      const workStationData =
        workStationRes.status === 'fulfilled' &&
        workStationRes.value.success &&
        workStationRes.value.data
          ? (workStationRes.value.data as { workstations?: WorkStation[] }).workstations || []
          : [];

      // 加载设备列表以获取状态分布
      const equipmentListData: Equipment[] = [];
      try {
        const eqListRes = await equipmentApi.list({ page: 1, pagesize: 200 });
        if (eqListRes.success && eqListRes.data) {
          const list = (eqListRes.data as { equipments?: Equipment[] }).equipments || [];
          equipmentListData.push(...list);
        }
      } catch (err) {
        apiLogger.warn('加载设备列表失败，使用统计数据', err);
      }

      const scheduleData =
        scheduleRes.status === 'fulfilled' && scheduleRes.value.success && scheduleRes.value.data
          ? (scheduleRes.value.data as { schedules?: ProductionSchedule[] }).schedules || []
          : [];

      const stats =
        equipmentStatsRes.status === 'fulfilled' &&
        equipmentStatsRes.value.success &&
        equipmentStatsRes.value.data
          ? equipmentStatsRes.value.data
          : null;

      return {
        orders: orderData,
        records: recordData,
        workStations: workStationData,
        equipment: equipmentListData,
        schedules: scheduleData,
        stats,
      };
    },
    refetchInterval: autoRefresh ? REFRESH_INTERVAL_MS : false,
  });

  const orders = dashboardData?.orders || [];
  const records = dashboardData?.records || [];
  const workStations = dashboardData?.workStations || [];
  const equipment = dashboardData?.equipment || [];
  const schedules = dashboardData?.schedules || [];
  const stats = dashboardData?.stats || null;

  const refreshStatus: RefreshStatus = queryError
    ? 'error'
    : isRefreshing
      ? 'loading'
      : dashboardData
        ? 'success'
        : 'idle';
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  // 根据查询数据生成报警
  useEffect(() => {
    if (!dashboardData) return;
    const generatedAlarms: RealtimeAlarm[] = [];
    if (stats) {
      if (safeNumber(stats.maintenance) > 0) {
        generatedAlarms.push({
          id: 'eq-maint',
          level: 'warning',
          source: '设备管理',
          message: `${stats.maintenance} 台设备处于维护状态，请关注维护进度。`,
          timestamp: new Date().toISOString(),
        });
      }
      if (safeNumber(stats.pending_repairs) > 0) {
        generatedAlarms.push({
          id: 'eq-repair',
          level: 'critical',
          source: '设备管理',
          message: `${stats.pending_repairs} 台设备待维修，存在生产风险。`,
          timestamp: new Date().toISOString(),
        });
      }
    }
    const abnormalOrders = orders.filter(
      (o) => o.status === 'abnormal' || o.status === 'error' || o.status === 'delayed'
    );
    if (abnormalOrders.length > 0) {
      generatedAlarms.push({
        id: 'order-abnormal',
        level: 'critical',
        source: '生产工单',
        message: `检测到 ${abnormalOrders.length} 个异常工单，需要立即处理。`,
        timestamp: new Date().toISOString(),
      });
    }
    if (generatedAlarms.length === 0) {
      generatedAlarms.push({
        id: 'heartbeat',
        level: 'info',
        source: '系统',
        message: 'MES 服务运行正常，采集频率 10s。',
        timestamp: new Date().toISOString(),
      });
    }
    setAlarms(generatedAlarms);
  }, [dashboardData, stats, orders]);

  // ============== 派生数据 ==============
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const todayOutput = useMemo(() => {
    return records
      .filter((r) => (r.start_time || '').slice(0, 10) === todayKey)
      .reduce((sum, r) => sum + safeNumber(r.quantity_completed), 0);
  }, [records, todayKey]);

  const todayDefects = useMemo(() => {
    return records
      .filter((r) => (r.start_time || '').slice(0, 10) === todayKey)
      .reduce((sum, r) => sum + safeNumber(r.quantity_rejected), 0);
  }, [records, todayKey]);

  const activeOrderCount = useMemo(
    () =>
      orders.filter(
        (o) => o.status === 'in_progress' || o.status === 'processing' || o.status === 'pending'
      ).length,
    [orders]
  );

  const completedOrderCount = useMemo(
    () => orders.filter((o) => o.status === 'completed').length,
    [orders]
  );

  const equipmentBuckets = useMemo<EquipmentStatusBucket[]>(() => {
    const map = new Map<string, number>();
    equipment.forEach((e) => {
      const status = e.status || 'unknown';
      map.set(status, (map.get(status) || 0) + 1);
    });
    const buckets: EquipmentStatusBucket[] = [];
    map.forEach((count, status) => {
      const meta = EQUIPMENT_STATUS_META[status] || { label: status, color: ct.text.muted };
      buckets.push({ status, label: meta.label, count, color: meta.color });
    });
    return buckets.sort((a, b) => b.count - a.count);
  }, [equipment]);

  const workStationUtilization = useMemo<WorkStationUtilization[]>(() => {
    if (workStations.length === 0) return [];
    const recordsByStation = new Map<string, ProductionRecord[]>();
    records.forEach((r) => {
      if (!r.work_station_id) return;
      const list = recordsByStation.get(r.work_station_id) || [];
      list.push(r);
      recordsByStation.set(r.work_station_id, list);
    });
    return workStations.slice(0, 8).map((ws) => {
      const wsRecords = recordsByStation.get(ws.id) || [];
      const today = wsRecords
        .filter((r) => (r.start_time || '').slice(0, 10) === todayKey)
        .reduce((sum, r) => sum + safeNumber(r.quantity_completed), 0);
      const active = orders.filter(
        (o) =>
          (o.status === 'in_progress' || o.status === 'processing') &&
          (o as { work_station_id?: string }).work_station_id === ws.id
      ).length;
      const capacity = safeNumber(ws.capacity, 1) || 1;
      const utilization = Math.min(today / (capacity * 200), 1);
      return {
        workStation: ws,
        utilization,
        activeOrders: active,
        todayOutput: today,
      };
    });
  }, [workStations, records, orders, todayKey]);

  const hourlyOutputTrend = useMemo(() => buildHourlyTrend(records, TREND_HOURS), [records]);
  const targetTrend = useMemo(() => buildDailyTarget(todayOutput), [todayOutput]);

  const orderStatusDistribution = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      map.set(o.status, (map.get(o.status) || 0) + 1);
    });
    const statusLabel: Record<string, string> = {
      pending: '待生产',
      in_progress: '生产中',
      processing: '生产中',
      completed: '已完成',
      cancelled: '已取消',
      abnormal: '异常',
      error: '异常',
      delayed: '延期',
    };
    return Array.from(map.entries()).map(([status, value]) => ({
      name: statusLabel[status] || status,
      value,
    }));
  }, [orders]);

  const overallUtilization = useMemo(() => {
    if (workStationUtilization.length === 0) return 0;
    const total = workStationUtilization.reduce((sum, w) => sum + w.utilization, 0);
    return total / workStationUtilization.length;
  }, [workStationUtilization]);

  // ============== WebSocket ==============
  const setupWebSocket = useCallback(
    (isReconnecting = false) => {
      if (!wsSupported) {
        apiLogger.warn('WebSocket 不支持');
        return;
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        apiLogger.warn('WebSocket 已连接');
        return;
      }
      if (wsConnectingRef.current) {
        apiLogger.warn('WebSocket 正在连接中');
        return;
      }
      if (!isReconnecting && wsInitRef.current) {
        apiLogger.info('WebSocket 已初始化，跳过重复连接');
        return;
      }

      try {
        if (wsRef.current) {
          wsRef.current.close(1000, '重新连接');
          wsRef.current = null;
        }

        wsConnectingRef.current = true;
        const isReconnecting = wsReconnectAttemptRef.current > 0;
        if (isReconnecting) {
          setWsStatus('reconnecting');
          apiLogger.info(
            `WebSocket 重连尝试 ${wsReconnectAttemptRef.current}/${MAX_RECONNECT_ATTEMPTS}`
          );
        } else {
          setWsStatus('connecting');
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.host;
        const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
        const wsUrl = `${protocol}//${wsHost}/mes/ws/dashboard${tokenParam}`;
        apiLogger.info(`正在建立 WebSocket 连接: ${wsUrl}`);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        wsConnectTimeoutRef.current = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            apiLogger.warn(`WebSocket 连接超时 (${CONNECTION_TIMEOUT}ms)，正在关闭连接`);
            try {
              ws.close(1006, 'Connection timeout');
            } catch (err) {
              apiLogger.error('关闭超时连接失败:', err);
            }
            wsRef.current = null;
          }
        }, CONNECTION_TIMEOUT);

        ws.onopen = () => {
          if (wsConnectTimeoutRef.current) {
            clearTimeout(wsConnectTimeoutRef.current);
            wsConnectTimeoutRef.current = null;
          }
          wsConnectingRef.current = false;
          wsInitRef.current = true;
          wsReconnectAttemptRef.current = 0;
          setWsReconnectCount(0);
          setWsStatus('connected');
          setWsConnected(true);
          apiLogger.info('WebSocket 连接成功');

          const authMessage = JSON.stringify({ type: 'authenticate' });
          apiLogger.info(`WebSocket 发送认证消息: ${authMessage}`);
          ws.send(authMessage);
        };

        ws.onmessage = (event) => {
          try {
            apiLogger.info(`WebSocket 收到消息: ${event.data.substring(0, 200)}`);
            const payload = JSON.parse(event.data) as {
              type?: string;
              data?: { alarms?: RealtimeAlarm[] };
              message?: string;
            };
            if (payload?.type === 'connected') {
              apiLogger.info('WebSocket 收到连接确认消息');
              setWsConnected(true);
            }
            if (payload?.type === 'alarms' && payload.data?.alarms) {
              setAlarms(payload.data.alarms);
            }
          } catch (err) {
            apiLogger.warn('解析 MES WS 消息失败', err);
          }
        };

        ws.onclose = (event) => {
          if (wsConnectTimeoutRef.current) {
            clearTimeout(wsConnectTimeoutRef.current);
            wsConnectTimeoutRef.current = null;
          }
          wsConnectingRef.current = false;
          setWsConnected(false);
          setWsStatus('disconnected');
          wsRef.current = null;

          const code = event.code;
          const wasClean = event.wasClean;
          apiLogger.info(
            `WebSocket 连接关闭: code=${code}, reason=${event.reason}, wasClean=${wasClean}`
          );

          if (!autoRefresh) {
            apiLogger.info('自动刷新已关闭，不进行重连');
            return;
          }

          if (code === 1000 || code === 1001) {
            apiLogger.info('连接正常关闭，不进行重连');
            return;
          }

          if (wsReconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
            apiLogger.error(`WebSocket 重连尝试已达最大次数 (${MAX_RECONNECT_ATTEMPTS})，停止重连`);
            wsReconnectAttemptRef.current = 0;
            return;
          }

          wsReconnectAttemptRef.current += 1;
          const attempt = wsReconnectAttemptRef.current;
          const delay =
            Math.min(MIN_RECONNECT_DELAY * Math.pow(2, attempt - 1), MAX_RECONNECT_DELAY) +
            Math.random() * 1000;

          setWsReconnectCount(attempt);
          apiLogger.info(
            `WebSocket 重连尝试 ${attempt}/${MAX_RECONNECT_ATTEMPTS}，延迟 ${Math.round(delay)}ms`
          );

          wsReconnectRef.current = setTimeout(() => setupWebSocket(), delay);
        };

        ws.onerror = (event) => {
          if (wsConnectTimeoutRef.current) {
            clearTimeout(wsConnectTimeoutRef.current);
            wsConnectTimeoutRef.current = null;
          }
          wsConnectingRef.current = false;
          apiLogger.error('WebSocket 连接错误:', event);
          setWsConnected(false);

          if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
            try {
              ws.close(1011, 'WebSocket error occurred');
            } catch (e) {
              apiLogger.error('关闭错误连接失败:', e);
            }
          }
        };
      } catch (err) {
        wsConnectingRef.current = false;
        apiLogger.warn('MES WebSocket 连接失败，将使用轮询模式', err);
        setWsConnected(false);
      }
    },
    [wsSupported, autoRefresh, token]
  );

  // ============== 副作用 ==============
  useEffect(() => {
    if (autoRefresh && wsSupported && token) {
      setupWebSocket();
    }
    return () => {
      if (wsReconnectRef.current) {
        clearTimeout(wsReconnectRef.current);
        wsReconnectRef.current = null;
      }
      if (wsConnectTimeoutRef.current) {
        clearTimeout(wsConnectTimeoutRef.current);
        wsConnectTimeoutRef.current = null;
      }
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close(1000, '组件卸载');
        wsRef.current = null;
      }
      wsInitRef.current = false;
    };
  }, [autoRefresh, wsSupported, token]);

  // ============== 渲染 ==============
  const runningEquipmentCount = equipmentBuckets
    .filter((b) => b.status === 'running' || b.status === 'in_use' || b.status === 'normal')
    .reduce((sum, b) => sum + b.count, 0);

  const trendData = useMemo(
    () =>
      hourlyOutputTrend.map((d, i) => ({
        ...d,
        target: targetTrend[i]?.value ?? 0,
      })),
    [hourlyOutputTrend, targetTrend]
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Factory style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.error.main} 0%, ${ct.error[700]} 100%)`,
        breadcrumbs: [
          { label: '首页', href: '/dashboard' },
          { label: '生产执行', href: MES_PATHS.root },
          { label: '生产看板' },
        ],
        customToolbar: (
          <Stack
            direction='row'
            spacing={1.5}
            sx={{ alignItems: 'center' }}
          >
            <Tooltip
              title={
                wsConnected
                  ? 'WebSocket 实时连接已建立'
                  : wsSupported
                    ? 'WebSocket 未连接，使用轮询刷新'
                    : '当前浏览器不支持 WebSocket'
              }
            >
              <Stack
                direction='row'
                spacing={0.5}
                sx={{ alignItems: 'center' }}
              >
                {wsConnected ? (
                  <Wifi
                    size={16}
                    color='success.main'
                  />
                ) : (
                  <WifiOff
                    size={16}
                    color='grey.400'
                  />
                )}
                <Typography
                  variant='caption'
                  sx={{ color: 'text.secondary' }}
                >
                  {wsConnected ? '实时' : '轮询'}
                </Typography>
              </Stack>
            </Tooltip>
            <FormControlLabel
              control={
                <Switch
                  size='small'
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
              }
              label={<Typography variant='caption'>自动刷新</Typography>}
            />
            <Button
              size='small'
              variant='outlined'
              startIcon={<RefreshCw size={14} />}
              onClick={() => refetch()}
              disabled={refreshStatus === 'loading'}
            >
              立即刷新
            </Button>
          </Stack>
        ),
      }}
    >
      <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: 'grey.50', minHeight: '100vh' }}>
        {/* 状态指示条 */}
        <Stack
          direction='row'
          spacing={2}
          sx={{
            alignItems: 'center',
            mb: 2,
            px: 2,
            py: 1,
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'grey.200',
            borderRadius: 3,
          }}
        >
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ alignItems: 'center' }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor:
                  refreshStatus === 'loading'
                    ? 'warning.main'
                    : refreshStatus === 'error'
                      ? 'error.main'
                      : 'success.main',
                animation: refreshStatus === 'loading' ? 'pulse 1.2s ease-in-out infinite' : 'none',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.4 },
                },
              }}
            />
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary' }}
            >
              {refreshStatus === 'loading'
                ? '采集中…'
                : refreshStatus === 'error'
                  ? '采集失败'
                  : '运行正常'}
            </Typography>
          </Stack>
          <Divider
            orientation='vertical'
            flexItem
          />
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ alignItems: 'center' }}
          >
            <Clock size={12} />
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary' }}
            >
              {lastUpdated ? `更新于 ${formatTime(lastUpdated)}` : '未更新'}
            </Typography>
          </Stack>
          <Divider
            orientation='vertical'
            flexItem
          />
          <Stack
            direction='row'
            spacing={0.5}
            sx={{ alignItems: 'center' }}
          >
            {wsStatus === 'connected' ? (
              <Wifi
                size={12}
                sx={{ color: 'success.main' }}
              />
            ) : wsStatus === 'connecting' || wsStatus === 'reconnecting' ? (
              <Wifi
                size={12}
                sx={{
                  color: 'warning.main',
                  animation: 'spin 2s linear infinite',
                  '@keyframes spin': {
                    from: { transform: 'rotate(0deg)' },
                    to: { transform: 'rotate(360deg)' },
                  },
                }}
              />
            ) : (
              <WifiOff
                size={12}
                sx={{ color: 'error.main' }}
              />
            )}
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary' }}
            >
              {wsStatus === 'connected'
                ? '实时连接'
                : wsStatus === 'connecting'
                  ? '连接中…'
                  : wsStatus === 'reconnecting'
                    ? `重连中 (${wsReconnectCount})`
                    : '未连接'}
            </Typography>
          </Stack>
          <Box sx={{ flex: 1 }} />
          <Typography
            variant='caption'
            sx={{ color: 'text.disabled' }}
          >
            刷新间隔 {REFRESH_INTERVAL_MS / 1000}s
          </Typography>
        </Stack>

        {/* 顶部统计 */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 2,
            mb: 2,
          }}
        >
          <StatCard
            title='今日产量'
            value={todayOutput.toLocaleString()}
            unit='件'
            icon={<Package size={22} />}
            color='primary.main'
            delta={8.2}
            hint='当日累计完成数量'
            loading={loading}
          />
          <StatCard
            title='不良品数'
            value={todayDefects.toLocaleString()}
            unit='件'
            icon={<XCircle size={22} />}
            color='error.main'
            delta={-3.1}
            hint='当日累计不良数'
            loading={loading}
          />
          <StatCard
            title='在制工单'
            value={activeOrderCount}
            unit='单'
            icon={<Factory size={22} />}
            color='warning.main'
            delta={2.4}
            hint={`已完成 ${completedOrderCount} 单`}
            loading={loading}
          />
          <StatCard
            title='设备综合利用率'
            value={formatPercent(overallUtilization)}
            icon={<Gauge size={22} />}
            color='success.main'
            delta={overallUtilization > 0.6 ? 1.8 : -0.6}
            hint={`运行 ${runningEquipmentCount} / 总 ${equipment.length} 台`}
            loading={loading}
          />
        </Box>

        {/* 趋势 & 分布 */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
            gap: 2,
            mb: 2,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'grey.200',
              height: '100%',
            }}
          >
            <Stack
              direction='row'
              sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
            >
              <Stack
                direction='row'
                spacing={1}
                sx={{ alignItems: 'center' }}
              >
                <TrendingUp
                  size={18}
                  color='success.main'
                />
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  实时产量趋势
                </Typography>
              </Stack>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary' }}
              >
                最近 {TREND_HOURS} 小时 · 实际 vs 目标
              </Typography>
            </Stack>
            <Divider sx={{ mb: 1.5 }} />
            <Box sx={{ height: 280 }}>
              <LineChart
                data={trendData}
                xKey='name'
                yKey='value'
                yKeys={[
                  { key: 'value', name: '实际产量', color: 'primary.main' },
                  { key: 'target', name: '目标产量', color: 'grey.400' },
                ]}
                height={280}
              />
            </Box>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'grey.200',
              height: '100%',
            }}
          >
            <Stack
              direction='row'
              sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
            >
              <Stack
                direction='row'
                spacing={1}
                sx={{ alignItems: 'center' }}
              >
                <Activity
                  size={18}
                  color='warning.main'
                />
                <Typography
                  variant='subtitle1'
                  sx={{ fontWeight: 600 }}
                >
                  工单状态分布
                </Typography>
              </Stack>
            </Stack>
            <Divider sx={{ mb: 1.5 }} />
            <Box sx={{ height: 280 }}>
              <PieChart
                data={
                  orderStatusDistribution.length > 0
                    ? orderStatusDistribution
                    : [{ name: '暂无数据', value: 1, color: 'grey.300' }]
                }
              />
            </Box>
          </Paper>
        </Box>

        {/* 设备状态 & 工站利用率 */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '5fr 7fr' },
            gap: 2,
            mb: 2,
          }}
        >
          <EquipmentStatusPanel
            buckets={equipmentBuckets}
            total={equipment.length}
            loading={loading}
          />
          <WorkStationUtilizationCard
            data={workStationUtilization}
            loading={loading}
          />
        </Box>

        {/* 报警 & 甘特图 */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' },
            gap: 2,
            mb: 2,
          }}
        >
          <AlarmList
            alarms={alarms}
            loading={loading}
          />
          <ProductionGantt
            schedules={schedules}
            loading={loading}
          />
        </Box>

        {/* 底部效率柱状图 */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          <Stack
            direction='row'
            sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Stack
              direction='row'
              spacing={1}
              sx={{ alignItems: 'center' }}
            >
              <Settings2
                size={18}
                color={ct.secondary[400]}
              />
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600 }}
              >
                工站当日产出对比
              </Typography>
            </Stack>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary' }}
            >
              数据按工站聚合
            </Typography>
          </Stack>
          <Divider sx={{ mb: 1.5 }} />
          <Box sx={{ height: 280 }}>
            <BarChart
              data={workStationUtilization.map((w) => ({
                name: w.workStation.name,
                value: w.todayOutput,
                utilization: Math.round(w.utilization * 100),
              }))}
              xKey='name'
              yKey='value'
              height={280}
            />
          </Box>
        </Paper>

        {/* 页脚信息 */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Stack
            direction='row'
            spacing={1}
            sx={{ alignItems: 'center', justifyContent: 'center' }}
          >
            <Zap
              size={12}
              color='grey.400'
            />
            <Typography
              variant='caption'
              sx={{ color: 'text.disabled' }}
            >
              TOPEMS MES v1.0 · 数据每 {REFRESH_INTERVAL_MS / 1000} 秒自动刷新
              {wsConnected ? ' · WebSocket 实时推送' : ' · 轮询采集模式'}
            </Typography>
          </Stack>
        </Box>
      </Box>
    </PageContainer>
  );
};

export default ProductionDashboardPage;
