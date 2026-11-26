import React, { useState, useEffect, useMemo } from 'react';
import css from './MesWorkOrderPage.module.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Factory,
  Plus,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Eye,
  Edit2,
  Trash2,
  Package,
} from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  DateRangePicker,
  Drawer,
  FileUpload,
  Input,
  ListPageTemplate,
  Modal,
  Pagination,
  Select,
  StatTile,
  Tabs,
  Tag,
  ToastContainer,
} from '@/components/redesign';
import type { DataTableColumn, Toast, UploadFile, DateRange } from '@/components/redesign';
import { useOptionalPermission } from '@/hooks/useOptionalPermission';
import { mesApi } from '@/api/mes';
import type { WorkOrder as ApiWorkOrder } from '@/api/mes/types';
import { useTranslation } from 'react-i18next';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['mes', 'work-orders'];

// L14 B类：文件内同构重复布局等价抽常量，值逐字不变，视觉零差异
const styles: Record<string, React.CSSProperties> = {
  fieldLabel: { display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 },
  footerRow: { display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' },
  gridTwoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' },
  columnStack: { display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' },
  inlineRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)' },
};

interface WorkOrder {
  id: string;
  order_no: string;
  product_name: string;
  product_code: string;
  quantity: number;
  completed_quantity: number;
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  workshop: string;
  production_line: string;
  operator: string;
  planned_start: string;
  planned_end: string;
  actual_start?: string;
  actual_end?: string;
  remark?: string;
}

const statusConfig = {
  pending: {
    labelKey: 'mes.work_order.k25',
    variant: 'default' as const,
    icon: Clock,
    color: 'var(--text-secondary)',
  },
  in_progress: {
    labelKey: 'mes.work_order.k26',
    variant: 'info' as const,
    icon: Play,
    color: 'var(--accent-primary-text)',
  },
  paused: {
    labelKey: 'mes.work_order.k27',
    variant: 'warning' as const,
    icon: Pause,
    color: 'var(--warning-text)',
  },
  completed: {
    labelKey: 'mes.work_order.k28',
    variant: 'success' as const,
    icon: CheckCircle,
    color: 'var(--success-text)',
  },
  cancelled: {
    labelKey: 'mes.work_order.k29',
    variant: 'error' as const,
    icon: XCircle,
    color: 'var(--error-text)',
  },
};

const priorityConfig = {
  high: { labelKey: 'mes.work_order_page.priority_high', variant: 'error' as const },
  medium: { labelKey: 'mes.work_order_page.priority_medium', variant: 'warning' as const },
  low: { labelKey: 'mes.work_order_page.priority_low', variant: 'default' as const },
};

type PriorityKey = keyof typeof priorityConfig;
type StatusKey = keyof typeof statusConfig;

// 后端 priority 列为整数（0=常规/未设置，1=高，2=低），也可能是 high/medium/low 字符串；
// 统一归一，避免 priorityConfig[未知值] 取到 undefined 后读 .variant 抛异常导致整页渲染失败。
const normalizePriority = (raw: unknown): PriorityKey => {
  if (typeof raw === 'number') raw = String(raw);
  if (typeof raw === 'string') {
    const key = raw.trim().toLowerCase();
    if (key === 'high' || key === 'medium' || key === 'low') return key;
    if (key === '1') return 'high';
    if (key === '2') return 'low';
    if (key === '0' || key === '' || key === 'normal') return 'medium';
  }
  return 'medium';
};

// 状态值同样可能超出前端枚举（如后端新增状态），未知值降级为待开始，而不是崩溃。
const normalizeStatus = (raw: unknown): StatusKey =>
  typeof raw === 'string' && Object.prototype.hasOwnProperty.call(statusConfig, raw)
    ? (raw as StatusKey)
    : 'pending';

const MesWorkOrderPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress' | 'completed'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [workshopFilter, setWorkshopFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [attachments, setAttachments] = useState<UploadFile[]>([]);
  // 批 12：写操作权限（操作列 + 开工/完工按钮）
  // 批 14：改为无 Provider 依赖判定（无权限信息时放行），避免页面测试需挂 Provider
  const checkPermission = useOptionalPermission();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const pushToast = (type: Toast['variant'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, variant: type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, activeTab, debouncedSearch, workshopFilter],
    queryFn: async () => {
      const response = await mesApi.workOrders.list({ page: 1, pageSize: 50 });
      if (!response.success || !response.data) {
        throw new Error(response.message || t('mes.work_order_page.error_load'));
      }
      const apiOrders: ApiWorkOrder[] = response.data.work_orders || [];
      return apiOrders.map((o): WorkOrder => ({
        id: o.id,
        order_no: o.work_order_no,
        product_name: o.product_name || o.process_name || '—',
        product_code: o.product_code || '—',
        quantity: o.quantity ?? 0,
        completed_quantity: o.completed_quantity || 0,
        status: normalizeStatus(o.status) as WorkOrder['status'],
        priority: normalizePriority(o.priority),
        workshop: o.work_station_name || '—',
        production_line: o.process_name || '—',
        operator: o.operator || o.team_name || '—',
        planned_start: o.planned_start_time || '',
        planned_end: o.planned_end_time || '',
        actual_start: o.actual_start_time,
        actual_end: o.actual_end_time,
        remark: o.remark,
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mesApi.workOrders.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', t('mes.work_order_page.toast_deleted'));
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast(
        'error',
        t('mes.work_order_page.toast_delete_failed') +
          (err instanceof Error && err.message ? `: ${err.message}` : '')
      );
    },
  });

  const orders = data ?? [];

  // 筛选
  const filteredOrders = useMemo(() => {
    let result = orders;
    if (activeTab !== 'all') {
      result = result.filter((o) => o.status === activeTab);
    }
    if (workshopFilter !== 'all') {
      result = result.filter((o) => o.workshop === workshopFilter);
    }
    if (dateRange?.start) {
      result = result.filter((o) => o.planned_start >= dateRange.start);
    }
    if (dateRange?.end) {
      result = result.filter((o) => o.planned_start <= dateRange.end);
    }
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (o) =>
          o.order_no.toLowerCase().includes(query) ||
          o.product_name.toLowerCase().includes(query) ||
          o.product_code.toLowerCase().includes(query) ||
          o.operator.toLowerCase().includes(query)
      );
    }
    return result;
  }, [orders, activeTab, workshopFilter, dateRange, debouncedSearch]);

  // 分页数据计算
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const pagedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 筛选变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, workshopFilter, dateRange, debouncedSearch]);

  // 统计
  const stats = useMemo(() => {
    return {
      total: orders.length,
      inProgress: orders.filter((o) => o.status === 'in_progress').length,
      completed: orders.filter((o) => o.status === 'completed').length,
      pending: orders.filter((o) => o.status === 'pending').length,
    };
  }, [orders]);

  const tabsConfig = [
    { id: 'all', label: t('mes.work_order_page.tab_all') },
    { id: 'pending', label: t('mes.work_order.k25'), badge: stats.pending },
    { id: 'in_progress', label: t('mes.work_order.k26'), badge: stats.inProgress },
    { id: 'completed', label: t('mes.work_order.k28') },
  ];

  // 后端时间为 RFC3339（如 2026-11-27T09:00:00+00:00），统一格式化为本地“YYYY-MM-DD HH:mm”
  const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  const getProgress = (order: WorkOrder) => {
    if (order.quantity === 0) return 0;
    return Math.round((order.completed_quantity / order.quantity) * 100);
  };

  const columns: DataTableColumn<WorkOrder>[] = [
    {
      key: 'order_no',
      header: t('mes.work_order.k2'),
      sortable: true,
      render: (row) => (
        <div>
          <div className={css.il1}>{row.order_no}</div>
          <div className={css.il2}>{row.product_name}</div>
        </div>
      ),
    },
    {
      key: 'product',
      header: t('mes.work_order_page.col_product'),
      render: (row) => (
        <div style={styles.inlineRow}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
              color: 'var(--accent-primary-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Package size={16} />
          </div>
          <div>
            <div className={css.il3}>{row.product_name}</div>
            <div className={css.il4}>{row.product_code}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: t('mes.work_order_page.col_qty_progress'),
      align: 'center',
      render: (row) => (
        <div className={css.il5}>
          <div className={css.il6}>
            {row.completed_quantity} / {row.quantity}
          </div>
          <div className={css.il7}>
            <div
              style={{
                height: '100%',
                width: `${getProgress(row)}%`,
                backgroundColor:
                  row.status === 'completed'
                    ? 'var(--success-500)'
                    : row.status === 'in_progress'
                      ? 'var(--accent-primary)'
                      : 'var(--text-secondary)',
                borderRadius: 3,
                transition: 'width 0.3s',
              }}
            />
          </div>
          <div className={css.il8}>{getProgress(row)}%</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('mes.work_order.k24'),
      render: (row) => {
        const config = statusConfig[normalizeStatus(row.status)];
        const StatusIcon = config.icon;
        return (
          <div className={css.il9}>
            <StatusIcon
              size={14}
              style={{ color: config.color }}
            />
            <Badge variant={config.variant}>{t(config.labelKey)}</Badge>
          </div>
        );
      },
    },
    {
      key: 'priority',
      header: t('mes.work_order.k15'),
      render: (row) => {
        const config = priorityConfig[normalizePriority(row.priority)];
        return <Tag variant={config.variant}>{t(config.labelKey)}</Tag>;
      },
    },
    {
      key: 'workshop',
      header: t('mes.work_order_page.col_workshop_line'),
      render: (row) => (
        <div>
          <div className={css.il10}>{row.workshop}</div>
          <div className={css.il11}>{row.production_line}</div>
        </div>
      ),
    },
    {
      key: 'operator',
      header: t('mes.work_order_page.operator'),
      render: (row) => (
        <div style={styles.inlineRow}>
          <div className={css.il12}>{(row.operator || '—').charAt(0)}</div>
          <span className={css.il13}>{row.operator}</span>
        </div>
      ),
    },
    {
      key: 'planned_end',
      header: t('mes.work_order_page.planned_end'),
      sortable: true,
      render: (row) => <span className={css.il14}>{formatDateTime(row.planned_end)}</span>,
    },
    {
      key: 'actions',
      header: t('mes.work_order_page.actions'),
      align: 'right',
      width: 150,
      // 批 12：写操作列由 ListPageTemplate 按 writePermission 整列隐藏
      writeOnly: true,
      render: (row) => (
        <div className={css.il15}>
          <Button
            size='sm'
            variant='ghost'
            leftIcon={<Eye size={14} />}
            onClick={() => {
              setSelectedOrder(row);
              setDetailDrawerOpen(true);
            }}
          >
            {t('mes.work_order_page.action_detail')}
          </Button>
          <Button
            size='sm'
            variant='ghost'
            leftIcon={<Edit2 size={14} />}
            onClick={() => pushToast('info', t('mes.work_order_page.toast_editing_soon'))}
          >
            {t('mes.work_order_page.action_edit')}
          </Button>
          <Button
            size='sm'
            variant='ghost'
            leftIcon={<Trash2 size={14} />}
            onClick={() => deleteMutation.mutate(row.id)}
            className={css.il16}
          >
            {t('mes.work_order_page.action_delete')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <ListPageTemplate<WorkOrder>
        header={{
          title: t('mes.work_order_page.k10'),
          subtitle: t('mes.work_order_page.subtitle'),
        }}
        writePermission='mes:work_order:write'
        toolbar={
          <>
            <div className={css.il17}>
              <Input
                placeholder={t('mes.work_order_page.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                className={css.il18}
              />
              <Select
                value={workshopFilter}
                onChange={(e) => setWorkshopFilter(e.target.value)}
                options={[
                  { value: 'all', label: t('mes.work_order_page.workshop_all') },
                  {
                    value: t('mes.work_order_page.workshop_1'),
                    label: t('mes.work_order_page.workshop_1'),
                  },
                  {
                    value: t('mes.work_order_page.workshop_2'),
                    label: t('mes.work_order_page.workshop_2'),
                  },
                  {
                    value: t('mes.work_order_page.workshop_3'),
                    label: t('mes.work_order_page.workshop_3'),
                  },
                ]}
                className={css.il19}
              />
              <div className={css.il20}>
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  startPlaceholder={t('mes.work_order_page.date_start_placeholder')}
                  endPlaceholder={t('mes.work_order_page.date_end_placeholder')}
                />
              </div>
            </div>
            <div className={css.il21}>
              <Button
                variant='ghost'
                leftIcon={<RefreshCw size={16} />}
                onClick={() => refetch()}
              >
                {t('mes.work_order_page.btn_refresh')}
              </Button>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={() => setCreateModalOpen(true)}
              >
                {t('mes.work_order_page.btn_new')}
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedOrders}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle={t('mes.work_order_page.empty_title')}
        emptyDescription={t('mes.work_order_page.empty_description')}
        tableProps={{
          onRowClick: (row) => {
            setSelectedOrder(row);
            setDetailDrawerOpen(true);
          },
        }}
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label={t('mes.work_order_page.stat_total')}
              value={stats.total}
              icon={Factory}
              accent='amber'
            />
            <StatTile
              label={t('mes.work_order.k26')}
              value={stats.inProgress}
              icon={Play}
              accent='cyan'
            />
            <StatTile
              label={t('mes.work_order.k25')}
              value={stats.pending}
              icon={Clock}
              accent='warning'
            />
            <StatTile
              label={t('mes.work_order.k28')}
              value={stats.completed}
              icon={CheckCircle}
              accent='success'
            />
          </div>
        }
      >
        <Tabs
          tabs={tabsConfig}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as 'all' | 'pending' | 'in_progress' | 'completed')}
        />
      </ListPageTemplate>

      {filteredOrders.length > 0 && (
        <div className={css.il22}>
          <Pagination
            current={currentPage}
            total={totalPages}
            pageSize={pageSize}
            totalItems={filteredOrders.length}
            onChange={setCurrentPage}
            showSizeChanger
            pageSizeOptions={[10, 20, 50]}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      )}

      {/* 工单详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedOrder(null);
        }}
        title={t('mes.work_order.k55')}
        size='lg'
      >
        {selectedOrder && (
          <div style={styles.columnStack}>
            {/* 状态卡片 */}
            <Card>
              <div className={css.il23}>
                <div>
                  <div className={css.il24}>{selectedOrder.order_no}</div>
                  <div className={css.il25}>
                    {selectedOrder.product_name} ({selectedOrder.product_code})
                  </div>
                </div>
                <div className={css.il26}>
                  <Badge variant={statusConfig[normalizeStatus(selectedOrder.status)].variant}>
                    {t(statusConfig[normalizeStatus(selectedOrder.status)].labelKey)}
                  </Badge>
                  <Tag variant={priorityConfig[normalizePriority(selectedOrder.priority)].variant}>
                    {t(priorityConfig[normalizePriority(selectedOrder.priority)].labelKey)}
                  </Tag>
                </div>
              </div>

              {/* 进度条 */}
              <div className={css.il27}>
                <div className={css.il28}>
                  <span className={css.il29}>{t('mes.work_order_page.progress_label')}</span>
                  <span className={css.il30}>
                    {selectedOrder.completed_quantity} / {selectedOrder.quantity} (
                    {getProgress(selectedOrder)}%)
                  </span>
                </div>
                <div className={css.il31}>
                  <div
                    style={{
                      height: '100%',
                      width: `${getProgress(selectedOrder)}%`,
                      backgroundColor:
                        selectedOrder.status === 'completed'
                          ? 'var(--success-500)'
                          : selectedOrder.status === 'in_progress'
                            ? 'var(--accent-primary)'
                            : 'var(--text-secondary)',
                      borderRadius: 5,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
              </div>
            </Card>

            {/* 基本信息 */}
            <Card title={t('mes.work_order.k49')}>
              <div style={styles.gridTwoCol}>
                <InfoItem
                  label={t('mes.work_order_page.product_name')}
                  value={selectedOrder.product_name}
                />
                <InfoItem
                  label={t('mes.work_order_page.product_code')}
                  value={selectedOrder.product_code}
                />
                <InfoItem
                  label={t('mes.work_order.k7')}
                  value={`${selectedOrder.quantity} ${t('mes.work_order_page.unit_piece')}`}
                />
                <InfoItem
                  label={t('mes.work_order.k8')}
                  value={`${selectedOrder.completed_quantity} ${t('mes.work_order_page.unit_piece')}`}
                />
                <InfoItem
                  label={t('mes.work_order_page.workshop')}
                  value={selectedOrder.workshop}
                />
                <InfoItem
                  label={t('mes.work_order_page.line')}
                  value={selectedOrder.production_line}
                />
                <InfoItem
                  label={t('mes.work_order_page.operator')}
                  value={selectedOrder.operator}
                />
                <InfoItem
                  label={t('mes.work_order.k15')}
                  value={t(priorityConfig[normalizePriority(selectedOrder.priority)].labelKey)}
                />
              </div>
            </Card>

            {/* 时间信息 */}
            <Card title={t('mes.work_order_page.card_time_info')}>
              <div style={styles.gridTwoCol}>
                <InfoItem
                  label={t('mes.work_order.k11')}
                  value={formatDateTime(selectedOrder.planned_start)}
                />
                <InfoItem
                  label={t('mes.work_order_page.planned_end')}
                  value={formatDateTime(selectedOrder.planned_end)}
                />
                <InfoItem
                  label={t('mes.work_order.k13')}
                  value={formatDateTime(selectedOrder.actual_start || '-')}
                />
                <InfoItem
                  label={t('mes.work_order_page.actual_end')}
                  value={formatDateTime(selectedOrder.actual_end || '-')}
                />
              </div>
            </Card>

            {/* 备注 */}
            {selectedOrder.remark && (
              <Card title={t('mes.work_order.k30')}>
                <p className={css.il32}>{selectedOrder.remark}</p>
              </Card>
            )}

            {/* 操作按钮 */}
            {selectedOrder.status === 'pending' &&
              checkPermission('mes:production_order:start') && (
                <div style={styles.footerRow}>
                  <Button
                    variant='primary'
                    leftIcon={<Play size={16} />}
                    onClick={() => pushToast('success', t('mes.work_order_page.toast_started'))}
                  >
                    {t('mes.work_order_page.btn_start_prod')}
                  </Button>
                </div>
              )}
            {selectedOrder.status === 'in_progress' && (
              <div style={styles.footerRow}>
                <Button
                  variant='ghost'
                  leftIcon={<Pause size={16} />}
                  onClick={() => pushToast('info', t('mes.work_order_page.toast_paused'))}
                >
                  {t('mes.work_order_page.k6')}
                </Button>
                {checkPermission('mes:production_order:complete') && (
                  <Button
                    variant='primary'
                    leftIcon={<CheckCircle size={16} />}
                    onClick={() => pushToast('success', t('mes.work_order_page.toast_completed'))}
                  >
                    {t('mes.work_order_page.btn_complete')}
                  </Button>
                )}
              </div>
            )}
            {selectedOrder.status === 'paused' && (
              <div style={styles.footerRow}>
                <Button
                  variant='primary'
                  leftIcon={<Play size={16} />}
                  onClick={() => pushToast('success', t('mes.work_order_page.toast_resumed'))}
                >
                  {t('mes.work_order_page.btn_resume_prod')}
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* 新建工单弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={t('mes.work_order_page.btn_new')}
        size='lg'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setCreateModalOpen(false)}
            >
              {t('mes.work_order_page.btn_cancel')}
            </Button>
            <Button
              variant='primary'
              onClick={() => {
                setCreateModalOpen(false);
                pushToast('success', t('mes.work_order_page.toast_created'));
              }}
            >
              {t('mes.work_order_page.btn_create_order')}
            </Button>
          </>
        }
      >
        <div style={styles.columnStack}>
          <div className={css.il33}>
            <div>
              <label
                htmlFor='wo-product-name'
                style={styles.fieldLabel}
              >
                {t('mes.work_order_page.product_name')} *
              </label>
              <Input
                id='wo-product-name'
                placeholder={t('mes.work_order_page.ph_product_name')}
              />
            </div>
            <div>
              <label
                htmlFor='wo-product-code'
                style={styles.fieldLabel}
              >
                {t('mes.work_order_page.product_code')} *
              </label>
              <Input
                id='wo-product-code'
                placeholder={t('mes.work_order_page.ph_product_code')}
              />
            </div>
            <div>
              <label
                htmlFor='wo-quantity'
                style={styles.fieldLabel}
              >
                {t('mes.work_order.k7')} *
              </label>
              <Input
                id='wo-quantity'
                type='number'
                placeholder={t('mes.work_order_page.ph_quantity')}
              />
            </div>
            <div>
              <label
                htmlFor='wo-priority'
                style={styles.fieldLabel}
              >
                {t('mes.work_order.k15')}
              </label>
              <Select
                id='wo-priority'
                defaultValue='medium'
                options={[
                  { value: 'high', label: t('mes.work_order_page.priority_high') },
                  { value: 'medium', label: t('mes.work_order_page.priority_medium') },
                  { value: 'low', label: t('mes.work_order_page.priority_low') },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='wo-workshop'
                style={styles.fieldLabel}
              >
                {t('mes.work_order_page.workshop')}
              </label>
              <Select
                id='wo-workshop'
                defaultValue={t('mes.work_order_page.workshop_1')}
                options={[
                  {
                    value: t('mes.work_order_page.workshop_1'),
                    label: t('mes.work_order_page.workshop_1'),
                  },
                  {
                    value: t('mes.work_order_page.workshop_2'),
                    label: t('mes.work_order_page.workshop_2'),
                  },
                  {
                    value: t('mes.work_order_page.workshop_3'),
                    label: t('mes.work_order_page.workshop_3'),
                  },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='wo-line'
                style={styles.fieldLabel}
              >
                {t('mes.work_order_page.line')}
              </label>
              <Select
                id='wo-line'
                defaultValue={t('mes.work_order_page.line_a')}
                options={[
                  {
                    value: t('mes.work_order_page.line_a'),
                    label: t('mes.work_order_page.line_a'),
                  },
                  {
                    value: t('mes.work_order_page.line_b'),
                    label: t('mes.work_order_page.line_b'),
                  },
                  {
                    value: t('mes.work_order_page.line_c'),
                    label: t('mes.work_order_page.line_c'),
                  },
                ]}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor='wo-remark'
              style={styles.fieldLabel}
            >
              {t('mes.work_order.k30')}
            </label>
            <textarea
              id='wo-remark'
              rows={3}
              placeholder={t('mes.work_order_page.ph_remark')}
              className={css.il34}
            />
          </div>
          <div>
            <label
              htmlFor='field-1'
              style={styles.fieldLabel}
            >
              {t('mes.work_order_page.attachments')}
            </label>
            <FileUpload
              id='field-1'
              value={attachments}
              onChange={setAttachments}
              multiple
              maxSize={20}
              accept='.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.dwg,.zip'
              hint={t('mes.work_order_page.attachment_hint')}
            />
          </div>
        </div>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

// 信息项组件
const InfoItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div className={css.il35}>{label}</div>
    <div className={css.il36}>{value}</div>
  </div>
);

export default MesWorkOrderPage;
