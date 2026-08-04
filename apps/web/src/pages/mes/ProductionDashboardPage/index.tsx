import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardWebSocket } from '@/hooks/useDashboardWebSocket';
import { MES_PATHS } from '@/modules/mes/config';
import {
  Box,
  Divider,
  FormControlLabel,
  Switch,
  Button,
  Stack,
  Tooltip,
  Typography,
  Paper,
} from '@mui/material';
import {
  Activity,
  Clock,
  Factory,
  Gauge,
  Package,
  RefreshCw,
  Settings2,
  TrendingUp,
  Wifi,
  WifiOff,
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
import { PageContainer } from '@/components/common/PageContainer';

import type {
  RealtimeAlarm,
  WorkStationUtilization,
  EquipmentStatusBucket,
  RefreshStatus,
} from './types';
import { ct, REFRESH_INTERVAL_MS, TREND_HOURS, EQUIPMENT_STATUS_META } from './constants';
import { safeNumber, formatTime, formatPercent, buildHourlyTrend, buildDailyTarget } from './utils';
import StatCard from './components/StatCard';
import AlarmList from './components/AlarmList';
import WorkStationUtilizationCard from './components/WorkStationUtilizationCard';
import EquipmentStatusPanel from './components/EquipmentStatusPanel';
import ProductionGantt from './components/ProductionGantt';

export const ProductionDashboardPage: React.FC = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus>('idle');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [workStations, setWorkStations] = useState<WorkStation[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [schedules, setSchedules] = useState<ProductionSchedule[]>([]);
  const [alarms, setAlarms] = useState<RealtimeAlarm[]>([]);

  const [wsSupported] = useState(typeof window !== 'undefined' && 'WebSocket' in window);

  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    isConnected: wsConnected,
    connectionStatus: wsStatus,
    reconnectCount: wsReconnectCount,
    connect: connectWs,
    disconnect: disconnectWs,
  } = useDashboardWebSocket({
    module: 'mes',
    reconnectAttempts: 10,
    maxReconnectDelay: 30000,
    minReconnectDelay: 1000,
    connectionTimeout: 15000,
    enabled: autoRefresh && wsSupported && !!token,
    onMessage: (message) => {
      try {
        const payload = typeof message === 'string' ? JSON.parse(message) : message;
        if (payload?.type === 'alarms' && payload.data?.alarms) {
          setAlarms(payload.data.alarms);
        }
      } catch (err) {
        apiLogger.warn('解析 MES WS 消息失败', err);
      }
    },
  });

  const loadAll = useCallback(async () => {
    setRefreshStatus('loading');
    try {
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
      setOrders(orderData);

      const recordData =
        recordRes.status === 'fulfilled' && recordRes.value.success && recordRes.value.data
          ? (recordRes.value.data as { records?: ProductionRecord[] }).records || []
          : [];
      setRecords(recordData);

      const workStationData =
        workStationRes.status === 'fulfilled' &&
        workStationRes.value.success &&
        workStationRes.value.data
          ? (workStationRes.value.data as { workstations?: WorkStation[] }).workstations || []
          : [];
      setWorkStations(workStationData);

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
      setEquipment(equipmentListData);

      const scheduleData =
        scheduleRes.status === 'fulfilled' && scheduleRes.value.success && scheduleRes.value.data
          ? (scheduleRes.value.data as { schedules?: ProductionSchedule[] }).schedules || []
          : [];
      setSchedules(scheduleData);

      const stats =
        equipmentStatsRes.status === 'fulfilled' &&
        equipmentStatsRes.value.success &&
        equipmentStatsRes.value.data
          ? equipmentStatsRes.value.data
          : null;
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
      const abnormalOrders = orderData.filter(
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

      setLastUpdated(new Date());
      setRefreshStatus('success');
    } catch (err) {
      apiLogger.error('加载生产看板数据失败:', err);
      setRefreshStatus('error');
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!autoRefresh) {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      return;
    }
    refreshTimerRef.current = setInterval(() => {
      void loadAll();
    }, REFRESH_INTERVAL_MS);
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [autoRefresh, loadAll]);

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
              onClick={() => {
                setLoading(true);
                void loadAll();
              }}
              disabled={refreshStatus === 'loading'}
            >
              立即刷新
            </Button>
          </Stack>
        ),
      }}
    >
      <Box sx={{ p: { xs: 2, md: 3 }, backgroundColor: 'grey.50', minHeight: '100vh' }}>
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
