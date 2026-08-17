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
import i18n from '@/i18n';
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
import { PageContainer } from '@/components/common';
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
        apiLogger.warn(i18n.t('mes.index.mesws_0'), err);
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
        apiLogger.warn(i18n.t('mes.index.k1'), err);
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
            source: i18n.t('mes.index.k2'),
            message: `${stats.maintenance}${i18n.t('pages.index.k0')}`,
            timestamp: new Date().toISOString(),
          });
        }
        if (safeNumber(stats.pending_repairs) > 0) {
          generatedAlarms.push({
            id: 'eq-repair',
            level: 'critical',
            source: i18n.t('mes.index.k3'),
            message: `${stats.pending_repairs}${i18n.t('pages.index.k1')}`,
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
          source: i18n.t('mes.index.k4'),
          message: `${i18n.t('pages.index.k2')}${abnormalOrders.length}${i18n.t('pages.index.k3')}`,
          timestamp: new Date().toISOString(),
        });
      }
      if (generatedAlarms.length === 0) {
        generatedAlarms.push({
          id: 'heartbeat',
          level: 'info',
          source: i18n.t('mes.index.k5'),
          message: i18n.t('pages.index.mes10s_4'),
          timestamp: new Date().toISOString(),
        });
      }
      setAlarms(generatedAlarms);
      setLastUpdated(new Date());
      setRefreshStatus('success');
    } catch (err) {
      apiLogger.error(i18n.t('pages.index.k5'), err);
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
      pending: i18n.t('mes.index.k6'),
      in_progress: i18n.t('mes.index.k7'),
      processing: i18n.t('mes.index.k8'),
      completed: i18n.t('mes.index.k9'),
      cancelled: i18n.t('mes.index.k10'),
      abnormal: i18n.t('mes.index.k11'),
      error: i18n.t('mes.index.k12'),
      delayed: i18n.t('mes.index.k13'),
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
          { label: i18n.t('mes.index.k14'), href: '/dashboard' },
          { label: i18n.t('mes.index.k15'), href: MES_PATHS.root },
          { label: i18n.t('mes.index.k16') },
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
                  ? i18n.t('pages.index.websocket_6')
                  : wsSupported
                    ? i18n.t('pages.index.websocket_7')
                    : i18n.t('mes.index.websocket_17')
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
                  {wsConnected ? i18n.t('mes.index.k19') : i18n.t('mes.index.k18')}
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
              label={<Typography variant='caption'>{i18n.t('mes.index.k20')}</Typography>}
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
              {i18n.t('pages.index.k0')}
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
                ? i18n.t('pages.index.k8')
                : refreshStatus === 'error'
                  ? i18n.t('mes.index.k21')
                  : i18n.t('mes.index.k22')}
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
              {lastUpdated
                ? `${i18n.t('pages.index.k9')}${formatTime(lastUpdated)}`
                : i18n.t('mes.index.k23')}
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
                ? i18n.t('mes.index.k24')
                : wsStatus === 'connecting'
                  ? i18n.t('pages.index.k10')
                  : wsStatus === 'reconnecting'
                    ? `${i18n.t('pages.index.k11')}${wsReconnectCount})`
                    : i18n.t('mes.index.k25')}
            </Typography>
          </Stack>
          <Box sx={{ flex: 1 }} />
          <Typography
            variant='caption'
            sx={{ color: 'text.disabled' }}
          >
            {i18n.t('pages.index.k0')} {REFRESH_INTERVAL_MS / 1000}s
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
            title={i18n.t('mes.index.k26')}
            value={todayOutput.toLocaleString()}
            unit={i18n.t('mes.index.k27')}
            icon={<Package size={22} />}
            color='primary.main'
            delta={8.2}
            hint={i18n.t('mes.index.k28')}
            loading={loading}
          />
          <StatCard
            title={i18n.t('mes.index.k29')}
            value={todayDefects.toLocaleString()}
            unit={i18n.t('mes.index.k30')}
            icon={<XCircle size={22} />}
            color='error.main'
            delta={-3.1}
            hint={i18n.t('mes.index.k31')}
            loading={loading}
          />
          <StatCard
            title={i18n.t('mes.index.k32')}
            value={activeOrderCount}
            unit={i18n.t('mes.index.k33')}
            icon={<Factory size={22} />}
            color='warning.main'
            delta={2.4}
            hint={`${i18n.t('pages.index.k12')}${completedOrderCount}${i18n.t('pages.index.k13')}`}
            loading={loading}
          />
          <StatCard
            title={i18n.t('mes.index.k34')}
            value={formatPercent(overallUtilization)}
            icon={<Gauge size={22} />}
            color='success.main'
            delta={overallUtilization > 0.6 ? 1.8 : -0.6}
            hint={`${i18n.t('pages.index.k14')}${runningEquipmentCount}${i18n.t('pages.index.k15')}${equipment.length}${i18n.t('pages.index.k16')}`}
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
                  {i18n.t('pages.index.k1')}
                </Typography>
              </Stack>
              <Typography
                variant='caption'
                sx={{ color: 'text.secondary' }}
              >
                {i18n.t('pages.index.k1')} {TREND_HOURS} {i18n.t('pages.index.vs_2')}
              </Typography>
            </Stack>
            <Divider sx={{ mb: 1.5 }} />
            <Box sx={{ height: 280 }}>
              <LineChart
                data={trendData}
                xKey='name'
                yKey='value'
                yKeys={[
                  { key: 'value', name: i18n.t('mes.index.k35'), color: 'primary.main' },
                  { key: 'target', name: i18n.t('mes.index.k36'), color: 'grey.400' },
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
                  {i18n.t('pages.index.k2')}
                </Typography>
              </Stack>
            </Stack>
            <Divider sx={{ mb: 1.5 }} />
            <Box sx={{ height: 280 }}>
              <PieChart
                data={
                  orderStatusDistribution.length > 0
                    ? orderStatusDistribution
                    : [{ name: i18n.t('mes.index.k37'), value: 1, color: 'grey.300' }]
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
                {i18n.t('pages.index.k3')}
              </Typography>
            </Stack>
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary' }}
            >
              {i18n.t('pages.index.k4')}
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
              {i18n.t('pages.index.k3')} {REFRESH_INTERVAL_MS / 1000} {i18n.t('pages.index.k4')}
              {wsConnected ? i18n.t('pages.index.websocket_18') : i18n.t('pages.index.k17')}
            </Typography>
          </Stack>
        </Box>
      </Box>
    </PageContainer>
  );
};
export default ProductionDashboardPage;
