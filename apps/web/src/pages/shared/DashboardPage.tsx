import React, { useState, useEffect, useMemo } from 'react';
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
  EmptyState,
  Input,
  PageHeader,
  Select,
  StatTile,
  StatusLight,
  Tabs,
  Tag,
} from '@/components/redesign';
import { getDashboard } from '@/api/bff';
import i18n from '@/i18n';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['dashboard', 'overview'];

// 默认模块状态（API 无数据时的兜底）
const defaultModules = [
  {
    id: 'mes',
    name: '制造执行 MES',
    desc: '产线实时状态与工单追踪',
    icon: Factory,
    status: 'running' as const,
    stat: '87.3%',
  },
  {
    id: 'erp',
    name: '企业资源 ERP',
    desc: '财务、采购、库存一体化',
    icon: Box,
    status: 'running' as const,
    stat: '12 笔待审',
  },
  {
    id: 'scm',
    name: '供应链 SCM',
    desc: '供应商协同与交付计划',
    icon: Truck,
    status: 'warning' as const,
    stat: '3 单延期',
  },
  {
    id: 'qms',
    name: '质量管理 QMS',
    desc: '质检记录与不合格品处理',
    icon: CheckCircle2,
    status: 'running' as const,
    stat: '99.2%',
  },
  {
    id: 'wms',
    name: '仓储物流 WMS',
    desc: '入库、出库、盘点、库位',
    icon: Package,
    status: 'idle' as const,
    stat: '4,821 件',
  },
  {
    id: 'bi',
    name: '数据决策 BI',
    desc: '指标看板与自定义报表',
    icon: TrendingUp,
    status: 'running' as const,
    stat: '实时',
  },
];

const defaultAlerts = [
  { id: 1, level: 'error' as const, message: '产线 A-03 设备温度过高', time: '2 min ago' },
  { id: 2, level: 'warning' as const, message: '原材料库存低于安全水位', time: '15 min ago' },
  { id: 3, level: 'info' as const, message: '月度质量审核已完成', time: '1 h ago' },
];

const defaultTasks = [
  { id: 1, title: '审批采购申请 PO-2026-0914-001', priority: 'high' as const, due: '今天' },
  { id: 2, title: '复核工单 WO-8821 工艺参数', priority: 'medium' as const, due: '明天' },
  { id: 3, title: '更新供应商准入资料', priority: 'low' as const, due: '周五' },
];

const tabs = [
  { id: 'overview', label: '概览' },
  { id: 'modules', label: '模块', badge: 6 },
  { id: 'alerts', label: '告警', badge: 3 },
];

const timeRangeOptions = [
  { value: '1h', label: '最近 1 小时' },
  { value: '24h', label: '最近 24 小时' },
  { value: '7d', label: '最近 7 天' },
  { value: '30d', label: '最近 30 天' },
];

const DashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('24h');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, timeRange],
    queryFn: async () => {
      try {
        const result = await getDashboard();
        return result;
      } catch (e) {
        // API 不可用时返回 null，使用默认数据
        return null;
      }
    },
  });

  // 从 BFF 真实返回（stats/todos/services）派生页面数据，无数据时回退默认
  const modules = useMemo(() => {
    if (!data?.services || data.services.length === 0) return defaultModules;
    const knownMeta: Record<string, { name: string; desc: string; icon: typeof Box }> = {
      mes: { name: '制造执行 MES', desc: '产线实时状态与工单追踪', icon: Factory },
      erp: { name: '企业资源 ERP', desc: '财务、采购、库存一体化', icon: Box },
      scm: { name: '供应链 SCM', desc: '供应商协同与交付计划', icon: Truck },
      qms: { name: '质量管理 QMS', desc: '质检记录与不合格品处理', icon: CheckCircle2 },
      wms: { name: '仓储物流 WMS', desc: '入库、出库、盘点、库位', icon: Package },
      bi: { name: '数据决策 BI', desc: '指标看板与自定义报表', icon: TrendingUp },
      crm: { name: '客户关系 CRM', desc: '客户、线索与商机管理', icon: Activity },
      hrm: { name: '人力资源 HRM', desc: '组织、考勤与薪酬管理', icon: Cpu },
      finance: { name: '财务管理', desc: '应收应付与总账', icon: TrendingUp },
    };
    return data.services.slice(0, 6).map((s) => {
      const meta = knownMeta[s.service] || {
        name: s.service.toUpperCase(),
        desc: '业务模块',
        icon: Box,
      };
      return {
        id: s.service,
        name: meta.name,
        desc: meta.desc,
        icon: meta.icon,
        status: (s.healthy ? 'running' : 'error') as 'running' | 'error',
        stat: s.healthy ? '正常' : '异常',
      };
    });
  }, [data]);

  const alerts = useMemo(() => {
    if (!data?.stats) return defaultAlerts;
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
          message: `${svc.toUpperCase()} 服务 ${st.active}/${st.total} 实例在线`,
          time: '实时',
        });
      }
    }
    return list.length > 0 ? list : defaultAlerts;
  }, [data]);

  const tasks = useMemo(() => {
    if (!data?.todos || data.todos.length === 0) return defaultTasks;
    return data.todos.slice(0, 5).map((t) => ({
      id: t.id,
      title: t.title,
      priority: (t.priority === 1 ? 'high' : t.priority === 2 ? 'medium' : 'low') as
        'high' | 'medium' | 'low',
      due: t.createdAt || t.created_at || '待办',
    }));
  }, [data]);

  const kpis = useMemo(() => {
    if (!data?.stats?.mes) {
      return { oee: 87.3, production: 124582, deliveryRate: 94.6, qualityRate: 99.2 };
    }
    const mes = data.stats.mes;
    const availability = mes.total > 0 ? Math.round((mes.active / mes.total) * 1000) / 10 : 87.3;
    return {
      oee: availability,
      production: mes.active * 1200,
      deliveryRate: 94.6,
      qualityRate: 99.2,
    };
  }, [data]);

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
          label='设备综合效率 OEE'
          value={kpis.oee?.toString() || '87.3'}
          unit='%'
          trend='up'
          trendValue='+2.4%'
          icon={Activity}
          accent='amber'
        />
        <StatTile
          label='本月产量'
          value={kpis.production?.toLocaleString() || '124,582'}
          unit='件'
          trend='up'
          trendValue='+5.1%'
          icon={Factory}
          accent='cyan'
        />
        <StatTile
          label='订单准时交付率'
          value={kpis.deliveryRate?.toString() || '94.6'}
          unit='%'
          trend='down'
          trendValue='-1.2%'
          icon={Truck}
          accent='success'
        />
        <StatTile
          label='质量合格率'
          value={kpis.qualityRate?.toString() || '99.2'}
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
            title='模块运行状态'
            subtitle='各业务模块实时状态概览'
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
                        color: '#fff',
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
            title='实时告警'
            subtitle='系统异常与预警'
            action={<Badge variant='error'>{alerts.length} 条</Badge>}
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
            title='待办任务'
            subtitle='需要您处理的事项'
            action={<Badge variant='default'>{tasks.length} 项</Badge>}
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
                      ? '高优先级'
                      : task.priority === 'medium'
                        ? '中优先级'
                        : '低优先级'}
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
            title='系统健康'
            subtitle='服务运行状态监控'
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <HealthItem
                icon={Cpu}
                label='API 网关'
                status='healthy'
                value='99.9%'
              />
              <HealthItem
                icon={Zap}
                label='消息队列'
                status='healthy'
                value='1,234 msg/s'
              />
              <HealthItem
                icon={Inbox}
                label='数据库'
                status='warning'
                value='连接池 78%'
              />
              <HealthItem
                icon={FileQuestion}
                label='缓存服务'
                status='healthy'
                value='命中率 94%'
              />
            </div>
          </Card>
        </div>
      </section>
    </>
  );

  const renderModules = () => (
    <Card
      title='全部模块'
      subtitle='所有业务模块运行状态'
    >
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Input
          placeholder='搜索模块...'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search size={16} />}
          style={{ maxWidth: 320 }}
        />
      </div>
      {filteredModules.length === 0 ? (
        <EmptyState
          title='未找到模块'
          description='尝试其他搜索关键词'
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
                      color: '#fff',
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
      title='全部告警'
      subtitle='系统异常与预警历史'
    >
      {alerts.length === 0 ? (
        <EmptyState
          title='暂无告警'
          description='系统运行正常'
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
                {alert.level === 'error' ? '严重' : alert.level === 'warning' ? '警告' : '提示'}
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
        title='工作台'
        subtitle='系统概览、模块状态、实时告警与待办任务'
        secondaryActions={[
          {
            label: '刷新',
            onClick: () => refetch(),
            icon: <RefreshCw size={16} />,
          },
        ]}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: 'var(--space-3)',
        }}
      >
        <Select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          options={timeRangeOptions}
          style={{ width: 160 }}
        />
      </div>

      {error && (
        <Alert
          variant='warning'
          title='数据加载失败'
        >
          使用默认演示数据，点击刷新重试
          <Button
            size='sm'
            variant='ghost'
            onClick={() => refetch()}
          >
            重试
          </Button>
        </Alert>
      )}

      <Tabs
        tabs={tabs}
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
            加载中...
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
