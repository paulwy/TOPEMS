import React, { useState } from 'react';
import cx from 'clsx';
import styles from './RedesignDemo.module.css';
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

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

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
import { useTranslation } from 'react-i18next';

const modules = [
  {
    id: 'mes',
    name: 'demo.modules.mes_name',
    desc: 'demo.modules.mes_desc',
    icon: Factory,
    status: 'running' as const,
    stat: '87.3%',
  },
  {
    id: 'erp',
    name: 'demo.modules.erp_name',
    desc: 'demo.modules.erp_desc',
    icon: Box,
    status: 'running' as const,
    stat: 'demo.modules.erp_stat',
  },
  {
    id: 'scm',
    name: 'demo.modules.scm_name',
    desc: 'demo.modules.scm_desc',
    icon: Truck,
    status: 'warning' as const,
    stat: 'demo.modules.scm_stat',
  },
  {
    id: 'qms',
    name: 'demo.modules.qms_name',
    desc: 'demo.modules.qms_desc',
    icon: CheckCircle2,
    status: 'running' as const,
    stat: '99.2%',
  },
  {
    id: 'wms',
    name: 'demo.modules.wms_name',
    desc: 'demo.modules.wms_desc',
    icon: Package,
    status: 'idle' as const,
    stat: 'demo.modules.wms_stat',
  },
  {
    id: 'bi',
    name: 'demo.modules.bi_name',
    desc: 'demo.modules.bi_desc',
    icon: TrendingUp,
    status: 'running' as const,
    stat: 'demo.modules.bi_stat',
  },
];

const alerts = [
  { id: 1, level: 'error' as const, message: 'demo.alerts.a1_msg', time: '2 min ago' },
  { id: 2, level: 'warning' as const, message: 'demo.alerts.a2_msg', time: '15 min ago' },
  { id: 3, level: 'info' as const, message: 'demo.alerts.a3_msg', time: '1 h ago' },
];

const tasks = [
  { id: 1, title: 'demo.tasks.t1_title', priority: 'high' as const, due: 'demo.tasks.t1_due' },
  { id: 2, title: 'demo.tasks.t2_title', priority: 'medium' as const, due: 'demo.tasks.t2_due' },
  { id: 3, title: 'demo.tasks.t3_title', priority: 'low' as const, due: 'demo.tasks.t3_due' },
];

const tabs = [
  { id: 'overview', label: 'demo.tabs.overview' },
  { id: 'modules', label: 'demo.tabs.modules', badge: 6 },
  { id: 'alerts', label: 'demo.tabs.alerts', badge: 3 },
  { id: 'empty', label: 'demo.tabs.empty' },
  { id: 'error', label: 'demo.tabs.error' },
];

const timeRangeOptions = [
  { value: '1h', label: 'demo.time_range.1h' },
  { value: '24h', label: 'demo.time_range.24h' },
  { value: '7d', label: 'demo.time_range.7d' },
  { value: '30d', label: 'demo.time_range.30d' },
];

const lineOptions = [
  { value: 'all', label: 'demo.line.all' },
  { value: 'a', label: 'demo.line.a' },
  { value: 'b', label: 'demo.line.b' },
  { value: 'c', label: 'demo.line.c' },
];

const RedesignDemo: React.FC = () => {
  const { t } = useTranslation();
  const [activeNav, setActiveNav] = useState('home');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('24h');
  const [line, setLine] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(true);

  const filteredModules = modules.filter((m) =>
    t(m.name).toLowerCase().includes(searchQuery.toLowerCase())
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
            label={t('demo.stat.oee')}
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
            label={t('demo.stat.monthly_output')}
            value='124,582'
            unit={t('demo.stat.unit_piece')}
            trend='up'
            trendValue='+5.1%'
            icon={Factory}
            accent='cyan'
          />
        </div>
        <div className='animate-fade-in-up stagger-3'>
          <StatTile
            label={t('demo.stat.delivery_rate')}
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
            label={t('demo.stat.quality_rate')}
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
                <div className={styles.il1}>
                  <div
                    style={{
                      display: 'inline-flex',
                      padding: 'var(--space-2)',
                      color: 'var(--accent-primary-text)',
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
                <h3 className={styles.il2}>{t(m.name)}</h3>
                <p className={styles.il3}>{t(m.desc)}</p>
                <div className={styles.il4}>
                  <span className={styles.il5}>{t(m.stat)}</span>
                  <Button
                    variant='ghost'
                    size='sm'
                  >
                    {t('demo.enter')}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        <div className={cx('r-col-12 r-col-lg-4', styles.il6)}>
          <Card
            className='animate-fade-in-up stagger-6'
            accent='error'
          >
            <div className={styles.il7}>
              <AlertTriangle
                size={18}
                color='var(--error-500)'
              />
              <h2 className={styles.il8}>{t('demo.section.realtime_alerts')}</h2>
              <Badge
                variant='error'
                dot
                pulse
              >
                3
              </Badge>
            </div>
            <div className={styles.il9}>
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={styles.il10}
                >
                  <div className={styles.il11}>
                    <Badge
                      variant={alert.level}
                      dot={alert.level === 'error' || alert.level === 'warning'}
                    >
                      {alert.level === 'error'
                        ? t('demo.alert_level.error')
                        : alert.level === 'warning'
                          ? t('demo.alert_level.warning')
                          : t('demo.alert_level.info')}
                    </Badge>
                    <span className={styles.il12}>{alert.time}</span>
                  </div>
                  <span className={styles.il13}>{t(alert.message)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card
            className='animate-fade-in-up stagger-7'
            accent='cyan'
          >
            <div className={styles.il14}>
              <Clock
                size={18}
                color='var(--cyan-400)'
              />
              <h2 className={styles.il15}>{t('demo.section.todo')}</h2>
            </div>
            <div className={styles.il16}>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={styles.il17}
                >
                  <div className={styles.il18}>
                    <span className={styles.il19}>{t(task.title)}</span>
                    <span className={styles.il20}>{t('demo.task_due', { due: t(task.due) })}</span>
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
                    {task.priority === 'high'
                      ? t('demo.priority.high')
                      : task.priority === 'medium'
                        ? t('demo.priority.medium')
                        : t('demo.priority.low')}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card
            className='animate-fade-in-up stagger-8'
            accent='success'
          >
            <div className={styles.il21}>
              <Cpu
                size={18}
                color='var(--success-500)'
              />
              <h2 className={styles.il22}>{t('demo.section.system_health')}</h2>
            </div>
            <div className={styles.il23}>
              {[
                { label: t('demo.svc.api'), status: 'running' as const },
                { label: t('demo.svc.mq'), status: 'running' as const },
                { label: t('demo.svc.db'), status: 'idle' as const },
                { label: t('demo.svc.storage'), status: 'running' as const },
              ].map((svc) => (
                <div
                  key={svc.label}
                  className={styles.il24}
                >
                  <span className={styles.il25}>{svc.label}</span>
                  <StatusLight
                    state={svc.status}
                    label={
                      svc.status === 'running'
                        ? t('demo.svc_status.running')
                        : t('demo.svc_status.idle')
                    }
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
            <div className={styles.il26}>
              <div
                style={{
                  display: 'inline-flex',
                  padding: 'var(--space-3)',
                  color: 'var(--accent-primary-text)',
                  backgroundColor: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <Icon size={24} />
              </div>
              <div className={styles.il27}>
                <div className={styles.il28}>
                  <h3 className={styles.il29}>{t(m.name)}</h3>
                  <StatusLight
                    state={m.status}
                    pulse={m.status === 'running'}
                  />
                </div>
                <p className={styles.il30}>{t(m.desc)}</p>
                <span className={styles.il31}>{t(m.stat)}</span>
              </div>
            </div>
          </Card>
        );
      })}
      {filteredModules.length === 0 && (
        <EmptyState
          variant='search'
          title={t('demo.modules.empty_title')}
          description={t('demo.modules.empty_desc', { query: searchQuery })}
          action={{
            label: t('demo.modules.clear_search'),
            onClick: () => setSearchQuery(''),
            icon: <Search size={16} />,
          }}
        />
      )}
    </section>
  );

  const renderAlerts = () => (
    <section className={cx('animate-fade-in-up', styles.il32)}>
      <Alert
        variant='info'
        title={t('demo.banner_notification.title')}
        dismissible
        onDismiss={() => {}}
      >
        {t('demo.banner_notification.body')}
      </Alert>
      <Alert
        variant='success'
        title={t('demo.banner_sync.title')}
        dismissible
        onDismiss={() => {}}
      >
        {t('demo.banner_sync.body')}
      </Alert>
      <Alert
        variant='warning'
        title={t('demo.banner_stock.title')}
      >
        {t('demo.banner_stock.body')}
      </Alert>
      <Alert
        variant='error'
        title={t('demo.banner_equipment.title')}
      >
        {t('demo.banner_equipment.body')}
      </Alert>

      <Card className={styles.il33}>
        <h3 className={styles.il34}>{t('demo.section.realtime_alert_stream')}</h3>
        <div className={styles.il35}>
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              variant={alert.level}
            >
              <strong>{alert.time}</strong> — {t(alert.message)}
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
          title={t('demo.empty.todo_title')}
          description={t('demo.empty.todo_desc')}
          action={{
            label: t('demo.empty.new_task'),
            onClick: () => setIsCreateModalOpen(true),
            icon: <Plus size={16} />,
          }}
        />
      </Card>
      <Card>
        <EmptyState
          variant='search'
          title={t('demo.empty.no_result_title')}
          description={t('demo.empty.no_result_desc')}
          action={{
            label: t('demo.empty.clear_filter'),
            onClick: () => setSearchQuery(''),
            icon: <Search size={16} />,
          }}
        />
      </Card>
      <Card>
        <EmptyState
          variant='data'
          title={t('demo.empty.no_record_title')}
          description={t('demo.empty.no_record_desc')}
          action={{
            label: t('demo.empty.help'),
            onClick: () => {},
            icon: <FileQuestion size={16} />,
          }}
        />
      </Card>
      <Card>
        <EmptyState
          variant='default'
          icon={Inbox}
          title={t('demo.empty.custom_title')}
          description={t('demo.empty.custom_desc')}
        >
          <div className={styles.il36}>
            <Tag variant='amber'>{t('demo.tag.a')}</Tag>
            <Tag variant='cyan'>{t('demo.tag.b')}</Tag>
          </div>
        </EmptyState>
      </Card>
    </section>
  );

  const renderError = () => (
    <section className='animate-fade-in-up'>
      <ErrorState
        code={500}
        title={t('demo.error.title')}
        message={t('demo.error.message')}
        traceId='trace-20260914-8f3a2c1d'
        onRetry={() => window.location.reload()}
        onFeedback={() => alert(t('demo.error_feedback'))}
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
          subtitle={t('demo.page_subtitle')}
          breadcrumbs={[{ label: t('demo.breadcrumb.workbench') }, { label: 'Industrial OS' }]}
          secondaryActions={[
            { label: t('demo.refresh_data'), onClick: () => {}, icon: <RefreshCw size={16} /> },
          ]}
          primaryAction={{
            label: t('demo.new_workorder'),
            onClick: () => setIsCreateModalOpen(true),
            icon: <Zap size={16} />,
          }}
        />

        {showSuccessAlert && (
          <div className={cx('animate-fade-in-up', styles.il37)}>
            <Alert
              variant='success'
              dismissible
              onDismiss={() => setShowSuccessAlert(false)}
            >
              {t('demo.success_banner')}
            </Alert>
          </div>
        )}

        <div className={cx('animate-fade-in-up stagger-1', styles.il38)}>
          <Tabs
            tabs={tabs.map((tab) => ({ ...tab, label: t(tab.label) }))}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
          <div className={styles.il39}>
            <div className={styles.il40}>
              <Select
                label={t('demo.select.time_range')}
                options={timeRangeOptions.map((o) => ({ value: o.value, label: t(o.label) }))}
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              />
            </div>
            <div className={styles.il41}>
              <Select
                label={t('demo.select.line')}
                options={lineOptions.map((o) => ({ value: o.value, label: t(o.label) }))}
                value={line}
                onChange={(e) => setLine(e.target.value)}
              />
            </div>
            <div className={styles.il42}>
              <Input
                placeholder={t('demo.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={
                  <Search
                    size={16}
                    className={styles.il43}
                  />
                }
              />
            </div>
            <div className={styles.il44}>
              <Tag variant='amber'>{t('demo.tag.today_line')}</Tag>
              <Tag variant='cyan'>{t('demo.tag.today_shift')}</Tag>
              <Tag
                variant='success'
                onRemove={() => {}}
              >
                {t('demo.tag.running')}
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
        title={t('demo.modal.title')}
        description={t('demo.modal.description')}
        size='md'
        footer={
          <>
            <Button
              variant='secondary'
              onClick={() => setIsCreateModalOpen(false)}
            >
              {t('demo.modal.cancel')}
            </Button>
            <Button
              variant='primary'
              onClick={() => setIsCreateModalOpen(false)}
            >
              {t('demo.modal.confirm_create')}
            </Button>
          </>
        }
      >
        <div className={styles.il45}>
          <Input
            label={t('demo.modal.wo_title')}
            placeholder={t('demo.modal.wo_title_ph')}
          />
          <Select
            label={t('demo.modal.module')}
            options={[
              { value: 'mes', label: t('demo.modules.mes_name') },
              { value: 'erp', label: t('demo.modules.erp_name') },
              { value: 'scm', label: t('demo.modules.scm_name') },
              { value: 'qms', label: t('demo.modules.qms_name') },
            ]}
          />
          <Input
            label={t('demo.modal.plan_qty')}
            placeholder={t('demo.modal.qty_ph')}
          />
          <Alert variant='info'>{t('demo.modal.note')}</Alert>
        </div>
      </Modal>
    </AppShell>
  );
};

export default RedesignDemo;
