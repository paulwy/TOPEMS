import React, { useState } from 'react';
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
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
  Truck,
  Zap,
} from 'lucide-react';

import '../theme/redesign-tokens.css';
import '../theme/redesign-global.css';

import {
  Alert,
  AppShell,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Modal,
  PageHeader,
  Select,
  StatTile,
  StatusLight,
  Tabs,
  Tag,
} from '@/components/redesign';

const modules = [
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

const alerts = [
  { id: 1, level: 'error' as const, message: '产线 A-03 设备温度过高', time: '2 min ago' },
  { id: 2, level: 'warning' as const, message: '原材料库存低于安全水位', time: '15 min ago' },
  { id: 3, level: 'info' as const, message: '月度质量审核已完成', time: '1 h ago' },
];

const tasks = [
  { id: 1, title: '审批采购申请 PO-2026-0914-001', priority: 'high' as const, due: '今天' },
  { id: 2, title: '复核工单 WO-8821 工艺参数', priority: 'medium' as const, due: '明天' },
  { id: 3, title: '更新供应商准入资料', priority: 'low' as const, due: '周五' },
];

const tabs = [
  { id: 'overview', label: '概览' },
  { id: 'modules', label: '模块', badge: 6 },
  { id: 'alerts', label: '告警', badge: 3 },
  { id: 'empty', label: '空态' },
  { id: 'error', label: '错误' },
];

const timeRangeOptions = [
  { value: '1h', label: '最近 1 小时' },
  { value: '24h', label: '最近 24 小时' },
  { value: '7d', label: '最近 7 天' },
  { value: '30d', label: '最近 30 天' },
];

const lineOptions = [
  { value: 'all', label: '全部产线' },
  { value: 'a', label: '产线 A' },
  { value: 'b', label: '产线 B' },
  { value: 'c', label: '产线 C' },
];

const RedesignDemo: React.FC = () => {
  const [activeNav, setActiveNav] = useState('home');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  const [line, setLine] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(true);

  const filteredModules = modules.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderOverview = () => (
    <>
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div className='animate-fade-in-up stagger-1'>
          <StatTile
            label='设备综合效率 OEE'
            value='87.3'
            unit='%'
            trend='up'
            trendValue='+2.4%'
            icon={Activity}
            accent='amber'
          />
        </div>
        <div className='animate-fade-in-up stagger-2'>
          <StatTile
            label='本月产量'
            value='124,582'
            unit='件'
            trend='up'
            trendValue='+5.1%'
            icon={Factory}
            accent='cyan'
          />
        </div>
        <div className='animate-fade-in-up stagger-3'>
          <StatTile
            label='订单准时交付率'
            value='94.6'
            unit='%'
            trend='down'
            trendValue='-1.2%'
            icon={Truck}
            accent='success'
          />
        </div>
        <div className='animate-fade-in-up stagger-4'>
          <StatTile
            label='质量合格率'
            value='99.2'
            unit='%'
            trend='neutral'
            trendValue='0.0%'
            icon={CheckCircle2}
            accent='warning'
          />
        </div>
      </section>

      <section className='r-grid-12'>
        <div
          className='animate-fade-in-up stagger-5 r-col-12 r-col-lg-8'
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {filteredModules.map((m) => {
            const Icon = m.icon;
            return (
              <Card
                key={m.id}
                interactive
                accent={
                  m.status === 'running' ? 'amber' : m.status === 'warning' ? 'warning' : 'cyan'
                }
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      padding: 'var(--space-2)',
                      color: 'var(--accent-primary)',
                      backgroundColor: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <StatusLight
                    state={m.status}
                    pulse={m.status === 'running'}
                  />
                </div>
                <h3
                  style={{
                    margin: '0 0 var(--space-1)',
                    fontFamily: 'var(--font-brand)',
                    fontSize: 'var(--text-lg)',
                    fontWeight: 'var(--font-semibold)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {m.name}
                </h3>
                <p
                  style={{
                    margin: '0 0 var(--space-3)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {m.desc}
                </p>
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-xl)',
                      fontWeight: 'var(--font-bold)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {m.stat}
                  </span>
                  <Button
                    variant='ghost'
                    size='sm'
                  >
                    进入 →
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <div
          className='r-col-12 r-col-lg-4'
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          <Card
            className='animate-fade-in-up stagger-6'
            accent='error'
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <AlertTriangle
                size={18}
                color='var(--error-500)'
              />
              <h2
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-brand)',
                  fontSize: 'var(--text-md)',
                  fontWeight: 'var(--font-semibold)',
                  color: 'var(--text-primary)',
                }}
              >
                实时告警
              </h2>
              <Badge
                variant='error'
                dot
                pulse
              >
                3
              </Badge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-1)',
                    padding: 'var(--space-3)',
                    backgroundColor: 'var(--surface-2)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Badge
                      variant={alert.level}
                      dot={alert.level === 'error' || alert.level === 'warning'}
                    >
                      {alert.level === 'error'
                        ? '错误'
                        : alert.level === 'warning'
                          ? '警告'
                          : '信息'}
                    </Badge>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      {alert.time}
                    </span>
                  </div>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                    {alert.message}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card
            className='animate-fade-in-up stagger-7'
            accent='cyan'
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <Clock
                size={18}
                color='var(--cyan-400)'
              />
              <h2
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-brand)',
                  fontSize: 'var(--text-md)',
                  fontWeight: 'var(--font-semibold)',
                  color: 'var(--text-primary)',
                }}
              >
                待办任务
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                    paddingBottom: 'var(--space-3)',
                    borderBottom: '1px solid var(--border-default)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      {task.title}
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      截止：{task.due}
                    </span>
                  </div>
                  <Badge
                    variant={
                      task.priority === 'high'
                        ? 'error'
                        : task.priority === 'medium'
                          ? 'warning'
                          : 'default'
                    }
                  >
                    {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card
            className='animate-fade-in-up stagger-8'
            accent='success'
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <Cpu
                size={18}
                color='var(--success-500)'
              />
              <h2
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-brand)',
                  fontSize: 'var(--text-md)',
                  fontWeight: 'var(--font-semibold)',
                  color: 'var(--text-primary)',
                }}
              >
                系统健康
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[
                { label: 'API 服务', status: 'running' as const },
                { label: '消息队列', status: 'running' as const },
                { label: '数据库集群', status: 'idle' as const },
                { label: '文件存储', status: 'running' as const },
              ].map((svc) => (
                <div
                  key={svc.label}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    {svc.label}
                  </span>
                  <StatusLight
                    state={svc.status}
                    label={svc.status === 'running' ? '正常' : '空闲'}
                    pulse={svc.status === 'running'}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </>
  );

  const renderModules = () => (
    <section
      className='animate-fade-in-up'
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 'var(--space-4)',
      }}
    >
      {filteredModules.map((m) => {
        const Icon = m.icon;
        return (
          <Card
            key={m.id}
            interactive
            accent={m.status === 'running' ? 'amber' : m.status === 'warning' ? 'warning' : 'cyan'}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
              <div
                style={{
                  display: 'inline-flex',
                  padding: 'var(--space-3)',
                  color: 'var(--accent-primary)',
                  backgroundColor: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <Icon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-brand)',
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-semibold)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {m.name}
                  </h3>
                  <StatusLight
                    state={m.status}
                    pulse={m.status === 'running'}
                  />
                </div>
                <p
                  style={{
                    margin: '0 0 var(--space-3)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {m.desc}
                </p>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 'var(--font-bold)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {m.stat}
                </span>
              </div>
            </div>
          </Card>
        );
      })}
      {filteredModules.length === 0 && (
        <EmptyState
          variant='search'
          title='未找到模块'
          description={`没有匹配 "${searchQuery}" 的业务模块，请尝试其他关键词。`}
          action={{
            label: '清除搜索',
            onClick: () => setSearchQuery(''),
            icon: <Search size={16} />,
          }}
        />
      )}
    </section>
  );

  const renderAlerts = () => (
    <section
      className='animate-fade-in-up'
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
    >
      <Alert
        variant='info'
        title='系统通知'
        dismissible
        onDismiss={() => {}}
      >
        Industrial OS 新界面已进入灰度阶段，旧版入口将于下月下线。
      </Alert>
      <Alert
        variant='success'
        title='数据同步完成'
        dismissible
        onDismiss={() => {}}
      >
        所有制造数据已成功同步至数仓，耗时 12.4 秒。
      </Alert>
      <Alert
        variant='warning'
        title='库存预警'
      >
        原材料库存低于安全水位，建议尽快发起采购申请。
      </Alert>
      <Alert
        variant='error'
        title='设备故障'
      >
        产线 A-03 温度传感器读数异常，请立即检查。
      </Alert>

      <Card style={{ marginTop: 'var(--space-4)' }}>
        <h3
          style={{
            margin: '0 0 var(--space-4)',
            fontFamily: 'var(--font-brand)',
            fontSize: 'var(--text-md)',
            fontWeight: 'var(--font-semibold)',
            color: 'var(--text-primary)',
          }}
        >
          实时告警流
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              variant={alert.level}
            >
              <strong>{alert.time}</strong> — {alert.message}
            </Alert>
          ))}
        </div>
      </Card>
    </section>
  );

  const renderEmpty = () => (
    <section
      className='animate-fade-in-up'
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 'var(--space-6)',
      }}
    >
      <Card>
        <EmptyState
          variant='default'
          title='暂无待办'
          description='当前没有需要处理的审批或任务。'
          action={{
            label: '新建任务',
            onClick: () => setIsCreateModalOpen(true),
            icon: <Plus size={16} />,
          }}
        />
      </Card>
      <Card>
        <EmptyState
          variant='search'
          title='未找到结果'
          description='请调整筛选条件或搜索关键词后重试。'
          action={{
            label: '清除筛选',
            onClick: () => setSearchQuery(''),
            icon: <Search size={16} />,
          }}
        />
      </Card>
      <Card>
        <EmptyState
          variant='data'
          title='没有相关记录'
          description='该时间段内未产生任何数据记录。'
          action={{ label: '查看帮助', onClick: () => {}, icon: <FileQuestion size={16} /> }}
        />
      </Card>
      <Card>
        <EmptyState
          variant='default'
          icon={Inbox}
          title='自定义空态'
          description='通过 children 传入任意补充内容。'
        >
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
            <Tag variant='amber'>标签 A</Tag>
            <Tag variant='cyan'>标签 B</Tag>
          </div>
        </EmptyState>
      </Card>
    </section>
  );

  const renderError = () => (
    <section className='animate-fade-in-up'>
      <ErrorState
        code={500}
        title='服务暂时不可用'
        message='Industrial OS 核心服务响应超时，请稍后重试或联系运维团队。'
        traceId='trace-20260914-8f3a2c1d'
        onRetry={() => window.location.reload()}
        onFeedback={() => alert('反馈功能（演示）')}
      />
    </section>
  );

  return (
    <AppShell
      activeId={activeNav}
      onItemClick={setActiveNav}
      onCommandOpen={() => alert('Command palette (demo)')}
      onNotificationsOpen={() => alert('Notifications (demo)')}
    >
      <div
        className='bg-radial-glow'
        style={{
          minHeight: 'calc(100vh - var(--topbar-height) - var(--space-12))',
          margin: 'calc(var(--space-6) * -1)',
          padding: 'var(--space-6)',
        }}
      >
        <PageHeader
          title='Industrial OS Dashboard'
          subtitle='实时监控生产、供应链与质量数据，统一运营决策入口。'
          breadcrumbs={[{ label: '工作台' }, { label: 'Industrial OS' }]}
          secondaryActions={[
            { label: '刷新数据', onClick: () => {}, icon: <RefreshCw size={16} /> },
          ]}
          primaryAction={{
            label: '新建工单',
            onClick: () => setIsCreateModalOpen(true),
            icon: <Zap size={16} />,
          }}
        />

        {showSuccessAlert && (
          <div
            className='animate-fade-in-up'
            style={{ marginBottom: 'var(--space-4)' }}
          >
            <Alert
              variant='success'
              dismissible
              onDismiss={() => setShowSuccessAlert(false)}
            >
              新设计语言已应用至当前演示环境，所有组件均来自 redesign 组件库。
            </Alert>
          </div>
        )}

        <div
          className='animate-fade-in-up stagger-1'
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
          }}
        >
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
            }}
          >
            <div style={{ width: '160px' }}>
              <Select
                label='时间范围'
                options={timeRangeOptions}
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              />
            </div>
            <div style={{ width: '140px' }}>
              <Select
                label='产线'
                options={lineOptions}
                value={line}
                onChange={(e) => setLine(e.target.value)}
              />
            </div>
            <div style={{ width: '260px' }}>
              <Input
                placeholder='搜索订单、工单、物料、设备...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={
                  <Search
                    size={16}
                    style={{ color: 'var(--text-tertiary)' }}
                  />
                }
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <Tag variant='amber'>产线 A</Tag>
              <Tag variant='cyan'>今日班次</Tag>
              <Tag
                variant='success'
                onRemove={() => {}}
              >
                正常运行
              </Tag>
            </div>
          </div>
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'modules' && renderModules()}
        {activeTab === 'alerts' && renderAlerts()}
        {activeTab === 'empty' && renderEmpty()}
        {activeTab === 'error' && renderError()}
      </div>

      <Modal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title='新建工单'
        description='填写基础信息后，系统将自动生成工单并下发至对应产线。'
        size='md'
        footer={
          <>
            <Button
              variant='secondary'
              onClick={() => setIsCreateModalOpen(false)}
            >
              取消
            </Button>
            <Button
              variant='primary'
              onClick={() => setIsCreateModalOpen(false)}
            >
              确认创建
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input
            label='工单标题'
            placeholder='例如：WO-2026-0914-001'
          />
          <Select
            label='所属模块'
            options={[
              { value: 'mes', label: '制造执行 MES' },
              { value: 'erp', label: '企业资源 ERP' },
              { value: 'scm', label: '供应链 SCM' },
              { value: 'qms', label: '质量管理 QMS' },
            ]}
          />
          <Input
            label='计划产量'
            placeholder='输入数字'
          />
          <Alert variant='info'>工单创建后将触发 MES 排程与 ERP 成本核算流程。</Alert>
        </div>
      </Modal>
    </AppShell>
  );
};

export default RedesignDemo;
