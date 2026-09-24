import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Box,
  CheckCircle2,
  Clock,
  Cpu,
  Factory,
  FileQuestion,
  Inbox,
  Package,
  RefreshCw,
  Search,
  TrendingUp,
  Truck,
  Zap,
} from 'lucide-react';

import {
  Alert,
  Badge,
  Button,
  Card,
  DateRangePicker,
  EmptyState,
  Input,
  PageHeader,
  Select,
  StatTile,
  StatusLight,
  Tabs,
  Tag,
} from '@/components/redesign';
import type { DateRange } from '@/components/redesign';
import { getDashboard } from '@/api/bff';
import { mesAnalyticsApi } from '@/api/mes/analytics';
import i18n from '@/i18n';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['dashboard', 'overview'];

// 默认模块状态（API 无数据时的兜底）
const getDefaultModules = (): Array<{
  id: string;
  name: string;
  desc: string;
  icon: any;
  status: 'running' | 'warning' | 'idle' | 'error';
  stat: string;
}> => [
  {
    id: 'mes',
    name: i18n.t('dashboard.dash_mes_name'),
    desc: i18n.t('dashboard.dash_mes_desc'),
    icon: Factory,
    status: 'running' as const,
    stat: '',
  },
  {
    id: 'erp',
    name: i18n.t('dashboard.dash_erp_name'),
    desc: i18n.t('dashboard.dash_erp_desc'),
    icon: Box,
    status: 'running' as const,
    stat: '',
  },
  {
    id: 'scm',
    name: i18n.t('dashboard.dash_scm_name'),
    desc: i18n.t('dashboard.dash_scm_desc'),
    icon: Truck,
    status: 'warning' as const,
    stat: '',
  },
  {
    id: 'qms',
    name: i18n.t('dashboard.dash_qms_name'),
    desc: i18n.t('dashboard.dash_qms_desc'),
    icon: CheckCircle2,
    status: 'running' as const,
    stat: '',
  },
  {
    id: 'wms',
    name: i18n.t('dashboard.dash_wms_name'),
    desc: i18n.t('dashboard.dash_wms_desc'),
    icon: Package,
    status: 'idle' as const,
    stat: '',
  },
  {
    id: 'bi',
    name: i18n.t('dashboard.dash_bi_name'),
    desc: i18n.t('dashboard.dash_bi_desc'),
    icon: TrendingUp,
    status: 'running' as const,
    stat: '',
  },
];

const tabs = [
  { id: 'overview', labelKey: 'dashboard.dash_overview' },
  { id: 'modules', labelKey: 'dashboard.dash_modules', badge: 6 },
  { id: 'alerts', labelKey: 'dashboard.dash_alerts', badge: 3 },
];

const timeRangeOptions = [
  { value: '1h', labelKey: 'dashboard.dash_time_1h' },
  { value: '24h', labelKey: 'dashboard.dash_time_24h' },
  { value: '7d', labelKey: 'dashboard.dash_time_7d' },
  { value: '30d', labelKey: 'dashboard.dash_time_30d' },
];

const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined);
  const [showCustomRange, setShowCustomRange] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, timeRange],
    queryFn: async () => {
      try {
        const result = await getDashboard();
        return result;
      } catch (_e) {
        // API 不可用时返回 null，使用默认数据
        return null;
      }
    },
  });

  // 设备综合效率：mes 真实 OEE 仪表盘（avg_oee）
  const oeeQuery = useQuery({
    queryKey: [...QUERY_KEY, 'oee'],
    queryFn: () => mesAnalyticsApi.getOeeDashboard({ days: 7 }),
    staleTime: 5 * 60 * 1000,
  });

  // 交付准时率 / 质量合格率：mes analytics 真实业务口径
  const deliveryQuery = useQuery({
    queryKey: [...QUERY_KEY, 'delivery'],
    queryFn: () => mesAnalyticsApi.getDeliveryAnalytics({ days: 30 }),
    staleTime: 5 * 60 * 1000,
  });

  const qualityQuery = useQuery({
    queryKey: [...QUERY_KEY, 'quality'],
    queryFn: () => mesAnalyticsApi.getQualityPareto({ days: 30 }),
    staleTime: 5 * 60 * 1000,
  });

  // 基础架构健康四格（API 网关 / 消息队列 / 数据库 / 缓存）
  const healthQuery = useQuery({
    queryKey: [...QUERY_KEY, 'infra-health'],
    queryFn: async () => {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/monitor/infrastructure', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
      });
      const j = await res.json();
      return (j?.data ?? []) as Array<{
        component: string;
        status: string;
        value: string;
        detail: string;
      }>;
    },
    staleTime: 60 * 1000,
  });

  const infra = healthQuery.data ?? [];
  const healthOf = (c: string) =>
    infra.find((i) => i.component === c) ?? { status: 'absent', value: '--', detail: '' };
  const healthStatus = (st: string): 'healthy' | 'warning' | 'error' =>
    st === 'healthy' ? 'healthy' : st === 'error' ? 'error' : 'warning';

  // 生产订单：mes 真实订单量（portal stats 分页口径暂未生效，前端直查）
  const ordersQuery = useQuery({
    queryKey: [...QUERY_KEY, 'orders'],
    queryFn: async () => {
      const token = localStorage.getItem('token') || '';
      const res = await fetch('/api/mes/orders?page=1&page_size=1000', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        },
      });
      const j = await res.json();
      const data = j?.data ?? j;
      return { total: Number(data?.total ?? 0), orders: data?.orders ?? [] };
    },
    staleTime: 5 * 60 * 1000,
  });

  // 从 BFF 真实返回（stats/todos/services）派生页面数据，无数据时回退默认
  const modules = useMemo(() => {
    if (!data?.services || data.services.length === 0) return getDefaultModules();
    const knownMeta: Record<string, { name: string; desc: string; icon: typeof Box }> = {
      mes: {
        name: i18n.t('dashboard.dash_mes_name'),
        desc: i18n.t('dashboard.dash_mes_desc'),
        icon: Factory,
      },
      erp: {
        name: i18n.t('dashboard.dash_erp_name'),
        desc: i18n.t('dashboard.dash_erp_desc'),
        icon: Box,
      },
      scm: {
        name: i18n.t('dashboard.dash_scm_name'),
        desc: i18n.t('dashboard.dash_scm_desc'),
        icon: Truck,
      },
      qms: {
        name: i18n.t('dashboard.dash_qms_name'),
        desc: i18n.t('dashboard.dash_qms_desc'),
        icon: CheckCircle2,
      },
      wms: {
        name: i18n.t('dashboard.dash_wms_name'),
        desc: i18n.t('dashboard.dash_wms_desc'),
        icon: Package,
      },
      bi: {
        name: i18n.t('dashboard.dash_bi_name'),
        desc: i18n.t('dashboard.dash_bi_desc'),
        icon: TrendingUp,
      },
      crm: {
        name: i18n.t('dashboard.dash_crm_name'),
        desc: i18n.t('dashboard.dash_crm_desc'),
        icon: Activity,
      },
      hrm: {
        name: i18n.t('dashboard.dash_hrm_name'),
        desc: i18n.t('dashboard.dash_hrm_desc'),
        icon: Cpu,
      },
      finance: {
        name: i18n.t('dashboard.dash_finance_name'),
        desc: i18n.t('dashboard.dash_finance_desc'),
        icon: TrendingUp,
      },
    };
    return data.services.slice(0, 6).map((s) => {
      const meta = knownMeta[s.service] || {
        name: s.service.toUpperCase(),
        desc: i18n.t('dashboard.dash_business_module'),
        icon: Box,
      };
      return {
        id: s.service,
        name: meta.name,
        desc: meta.desc,
        icon: meta.icon,
        status: (s.healthy ? 'running' : 'error') as 'running' | 'error',
        stat: s.healthy ? i18n.t('dashboard.dash_running') : i18n.t('dashboard.dash_error'),
      };
    });
  }, [data]);

  const alerts = useMemo(() => {
    if (!data?.stats) return [];
    const list: Array<{
      id: string;
      level: 'error' | 'warning' | 'info';
      message: string;
      time: string;
    }> = [];
    const entries = Object.entries(data.stats);
    for (const [svc, st] of entries) {
      if (st.total > 0 && st.active < st.total) {
        list.push({
          id: svc,
          level: 'error',
          message: i18n.t('dashboard.dash_service_online', {
            svc: svc.toUpperCase(),
            active: st.active,
            total: st.total,
          }),
          time: i18n.t('dashboard.dash_realtime'),
        });
      }
    }
    return list;
  }, [data]);

  const tasks = useMemo(() => {
    if (!data?.todos || data.todos.length === 0) return [];
    return data.todos.slice(0, 5).map((t) => ({
      id: t.id,
      title: t.title,
      priority: (t.priority === 1 ? 'high' : t.priority === 2 ? 'medium' : 'low') as
        'high' | 'medium' | 'low',
      due: t.createdAt || t.created_at || i18n.t('dashboard.dash_pending'),
    }));
  }, [data]);

  const kpis = useMemo(() => {
    const avgOee = oeeQuery.data?.avg_oee ?? 0;
    const mesTotal = data?.stats?.mes ? ((data.stats.mes as { total?: number }).total ?? 0) : 0;
    return {
      // OEE：mes OEE 仪表盘真实均值；产量：mes 生产订单总量（真实业务计数，优先直查）
      oee: Math.round(avgOee * 10) / 10,
      production: ordersQuery.data?.total ?? mesTotal,
      deliveryRate: Math.round((deliveryQuery.data?.on_time_rate ?? 0) * 10) / 10,
      qualityRate: Math.round((qualityQuery.data?.pass_rate ?? 0) * 10) / 10,
    };
  }, [data, oeeQuery.data, ordersQuery.data, deliveryQuery.data, qualityQuery.data]);

  const filteredModules = modules.filter((m: any) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderOverview = () => (
    <>
      {/* KPI 统计卡片 */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <StatTile
          label={i18n.t('dashboard.dash_kpi_oee')}
          value={kpis.oee?.toString() || '--'}
          unit='%'
          trend='up'
          trendValue='+2.4%'
          icon={Activity}
          accent='amber'
        />
        <StatTile
          label={i18n.t('dashboard.dash_kpi_production')}
          value={kpis.production?.toLocaleString() || '--'}
          unit={i18n.t('dashboard.dash_unit_pcs')}
          trend='up'
          trendValue='+5.1%'
          icon={Factory}
          accent='cyan'
        />
        <StatTile
          label={i18n.t('dashboard.dash_kpi_delivery')}
          value={kpis.deliveryRate?.toString() || '--'}
          unit='%'
          trend='down'
          trendValue='-1.2%'
          icon={Truck}
          accent='success'
        />
        <StatTile
          label={i18n.t('dashboard.dash_kpi_quality')}
          value={kpis.qualityRate?.toString() || '--'}
          unit='%'
          trend='neutral'
          trendValue='0.0%'
          icon={CheckCircle2}
          accent='warning'
        />
      </section>

      {/* 模块状态 + 告警 */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {/* 模块状态 */}
        <div style={{ gridColumn: 'span 8 / span 8' }}>
          <Card
            title={i18n.t('dashboard.dash_modules_title')}
            subtitle={i18n.t('dashboard.dash_modules_subtitle')}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 'var(--space-3)',
              }}
            >
              {modules.slice(0, 6).map((module: any) => {
                const Icon = module.icon || Box;
                return (
                  <div
                    key={module.id}
                    style={{
                      padding: 'var(--space-3)',
                      backgroundColor: 'var(--surface-2)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-default)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-3)',
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--accent-primary)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-primary)' }}>
                        {module.name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {module.desc}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <StatusLight state={module.status} />
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          marginTop: 4,
                        }}
                      >
                        {module.stat}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* 告警列表 */}
        <div style={{ gridColumn: 'span 4 / span 4' }}>
          <Card
            title={i18n.t('dashboard.dash_alerts_title')}
            subtitle={i18n.t('dashboard.dash_alerts_subtitle')}
            action={
              <Badge variant='error'>
                {alerts.length} {i18n.t('dashboard.dash_count_unit')}
              </Badge>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {alerts.map((alert: any) => (
                <div
                  key={alert.id}
                  style={{
                    padding: 'var(--space-3)',
                    backgroundColor:
                      alert.level === 'error'
                        ? 'color-mix(in srgb, var(--error-500) 8%, transparent)'
                        : alert.level === 'warning'
                          ? 'color-mix(in srgb, var(--warning-500) 8%, transparent)'
                          : 'color-mix(in srgb, var(--info-500) 8%, transparent)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: `3px solid ${
                      alert.level === 'error'
                        ? 'var(--error-500)'
                        : alert.level === 'warning'
                          ? 'var(--warning-500)'
                          : 'var(--info-500)'
                    }`,
                  }}
                >
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {alert.message}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{alert.time}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* 待办任务 + 系统健康 */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: 'var(--space-4)',
        }}
      >
        {/* 待办任务 */}
        <div style={{ gridColumn: 'span 7 / span 7' }}>
          <Card
            title={i18n.t('dashboard.dash_todos_title')}
            subtitle={i18n.t('dashboard.dash_todos_subtitle')}
            action={
              <Badge variant='default'>
                {tasks.length} {i18n.t('dashboard.dash_item_unit')}
              </Badge>
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {tasks.map((task: any) => (
                <div
                  key={task.id}
                  style={{
                    padding: 'var(--space-3)',
                    backgroundColor: 'var(--surface-2)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor:
                        task.priority === 'high'
                          ? 'var(--error-500)'
                          : task.priority === 'medium'
                            ? 'var(--warning-500)'
                            : 'var(--text-secondary)',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)' }}>
                    {task.title}
                  </div>
                  <Tag
                    variant={
                      task.priority === 'high'
                        ? 'error'
                        : task.priority === 'medium'
                          ? 'warning'
                          : 'default'
                    }
                  >
                    {task.priority === 'high'
                      ? i18n.t('dashboard.dash_priority_high')
                      : task.priority === 'medium'
                        ? i18n.t('dashboard.dash_priority_medium')
                        : i18n.t('dashboard.dash_priority_low')}
                  </Tag>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Clock size={12} />
                    {task.due}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 系统健康 */}
        <div style={{ gridColumn: 'span 5 / span 5' }}>
          <Card
            title={i18n.t('dashboard.dash_health_title')}
            subtitle={i18n.t('dashboard.dash_health_subtitle')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <HealthItem
                icon={Cpu}
                label={i18n.t('dashboard.dash_health_api_gateway')}
                status={healthStatus(healthOf('api_gateway').status)}
                value={healthOf('api_gateway').value}
              />
              <HealthItem
                icon={Zap}
                label={i18n.t('dashboard.dash_health_message_queue')}
                status={healthStatus(healthOf('message_queue').status)}
                value={healthOf('message_queue').value}
              />
              <HealthItem
                icon={Inbox}
                label={i18n.t('dashboard.dash_health_database')}
                status={healthStatus(healthOf('database').status)}
                value={healthOf('database').value}
              />
              <HealthItem
                icon={FileQuestion}
                label={i18n.t('dashboard.dash_health_cache')}
                status={healthStatus(healthOf('cache').status)}
                value={healthOf('cache').value}
              />
            </div>
          </Card>
        </div>
      </section>
    </>
  );

  const renderModules = () => (
    <Card
      title={i18n.t('dashboard.dash_all_modules')}
      subtitle={i18n.t('dashboard.dash_all_modules_subtitle')}
    >
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Input
          placeholder={i18n.t('dashboard.dash_search_placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search size={16} />}
          style={{ maxWidth: 320 }}
        />
      </div>
      {filteredModules.length === 0 ? (
        <EmptyState
          title={i18n.t('dashboard.dash_no_modules')}
          description={i18n.t('dashboard.dash_no_modules_desc')}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'var(--space-3)',
          }}
        >
          {filteredModules.map((module: any) => {
            const Icon = module.icon || Box;
            return (
              <div
                key={module.id}
                style={{
                  padding: 'var(--space-4)',
                  backgroundColor: 'var(--surface-2)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-default)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--accent-primary)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {module.name}
                    </div>
                    <StatusLight state={module.status} />
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  {module.desc}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-primary)' }}>
                  {module.stat}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );

  const renderAlerts = () => (
    <Card
      title={i18n.t('dashboard.dash_all_alerts')}
      subtitle={i18n.t('dashboard.dash_alerts_subtitle_hist')}
    >
      {alerts.length === 0 ? (
        <EmptyState
          title={i18n.t('dashboard.dash_no_alerts')}
          description={i18n.t('dashboard.dash_no_alerts_desc')}
          icon={CheckCircle2}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {alerts.map((alert: any) => (
            <div
              key={alert.id}
              style={{
                padding: 'var(--space-4)',
                backgroundColor:
                  alert.level === 'error'
                    ? 'color-mix(in srgb, var(--error-500) 8%, transparent)'
                    : alert.level === 'warning'
                      ? 'color-mix(in srgb, var(--warning-500) 8%, transparent)'
                      : 'color-mix(in srgb, var(--info-500) 8%, transparent)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: `4px solid ${
                  alert.level === 'error'
                    ? 'var(--error-500)'
                    : alert.level === 'warning'
                      ? 'var(--warning-500)'
                      : 'var(--info-500)'
                }`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)',
              }}
            >
              <AlertTriangle
                size={20}
                style={{
                  color:
                    alert.level === 'error'
                      ? 'var(--error-500)'
                      : alert.level === 'warning'
                        ? 'var(--warning-500)'
                        : 'var(--info-500)',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {alert.message}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{alert.time}</div>
              </div>
              <Tag
                variant={
                  alert.level === 'error'
                    ? 'error'
                    : alert.level === 'warning'
                      ? 'warning'
                      : 'default'
                }
              >
                {alert.level === 'error'
                  ? i18n.t('dashboard.dash_level_error')
                  : alert.level === 'warning'
                    ? i18n.t('dashboard.dash_level_warning')
                    : i18n.t('dashboard.dash_level_info')}
              </Tag>
            </div>
          ))}
        </div>
      )}
    </Card>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        title={i18n.t('dashboard.dash_workspace')}
        subtitle={i18n.t('dashboard.dash_workspace_subtitle')}
        secondaryActions={[
          {
            label: i18n.t('dashboard.dash_refresh'),
            onClick: () => refetch(),
            icon: <RefreshCw size={16} />,
          },
        ]}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
          marginBottom: 'var(--space-3)',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
        }}
      >
        {showCustomRange && (
          <div style={{ width: 320 }}>
            <DateRangePicker
              value={customDateRange}
              onChange={setCustomDateRange}
              presets={[
                {
                  label: i18n.t('dashboard.dash_today'),
                  value: () => {
                    const d = new Date().toISOString().split('T')[0];
                    return { start: d, end: d };
                  },
                },
                {
                  label: i18n.t('dashboard.dash_recent_7d'),
                  value: () => {
                    const e = new Date();
                    const s = new Date();
                    s.setDate(s.getDate() - 7);
                    return {
                      start: s.toISOString().split('T')[0],
                      end: e.toISOString().split('T')[0],
                    };
                  },
                },
                {
                  label: i18n.t('dashboard.dash_recent_30d'),
                  value: () => {
                    const e = new Date();
                    const s = new Date();
                    s.setDate(s.getDate() - 30);
                    return {
                      start: s.toISOString().split('T')[0],
                      end: e.toISOString().split('T')[0],
                    };
                  },
                },
              ]}
            />
          </div>
        )}
        <Select
          value={timeRange}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'custom') {
              setShowCustomRange(true);
            } else {
              setShowCustomRange(false);
              setCustomDateRange(undefined);
              setTimeRange(val);
            }
          }}
          options={[
            ...timeRangeOptions.map((o) => ({ ...o, label: i18n.t(o.labelKey) })),
            { value: 'custom', label: i18n.t('dashboard.dash_custom_range') },
          ]}
          style={{ width: 160 }}
        />
      </div>

      {error && (
        <Alert
          variant='warning'
          title={i18n.t('dashboard.dash_load_error')}
        >
          {i18n.t('dashboard.dash_load_error_desc')}
          <Button
            size='sm'
            variant='ghost'
            onClick={() => refetch()}
          >
            {i18n.t('dashboard.dash_retry')}
          </Button>
        </Alert>
      )}

      <Tabs
        tabs={tabs.map((t) => ({
          ...t,
          label: i18n.t(t.labelKey),
          badge: t.id === 'modules' ? modules.length : t.id === 'alerts' ? alerts.length : t.badge,
        }))}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div style={{ marginTop: 'var(--space-2)' }}>
        {isLoading ? (
          <div
            style={{
              padding: 'var(--space-12)',
              textAlign: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            {i18n.t('dashboard.dash_loading')}
          </div>
        ) : activeTab === 'overview' ? (
          renderOverview()
        ) : activeTab === 'modules' ? (
          renderModules()
        ) : (
          renderAlerts()
        )}
      </div>
    </div>
  );
};

// 系统健康项组件
const HealthItem: React.FC<{
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  status: 'healthy' | 'warning' | 'error';
  value: string;
}> = ({ icon: Icon, label, status, value }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: 'var(--space-3)',
      backgroundColor: 'var(--surface-2)',
      borderRadius: 'var(--radius-sm)',
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 'var(--radius-sm)',
        backgroundColor:
          status === 'healthy'
            ? 'color-mix(in srgb, var(--success-500) 15%, transparent)'
            : status === 'warning'
              ? 'color-mix(in srgb, var(--warning-500) 15%, transparent)'
              : 'color-mix(in srgb, var(--error-500) 15%, transparent)',
        color:
          status === 'healthy'
            ? 'var(--success-500)'
            : status === 'warning'
              ? 'var(--warning-500)'
              : 'var(--error-500)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={18} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{value}</div>
    </div>
    <StatusLight
      state={
        (status === 'healthy' ? 'running' : status === 'warning' ? 'warning' : 'error') as
          'running' | 'warning' | 'error'
      }
    />
  </div>
);

export default DashboardPage;
