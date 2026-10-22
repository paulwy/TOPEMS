import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  Drawer,
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
import type { DataTableColumn, Toast } from '@/components/redesign';
import { WMS_PATHS } from '@/modules/wms/config';
import { outboundOrderApi } from '@/api/wms/outbound';
import type {
  OutboundOrder as ApiOutboundOrder,
  CreateOutboundOrderRequest,
  UpdateOutboundOrderRequest,
} from '@/api/wms/types';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['wms', 'outbound-orders'];

// 详情/卡片重复样式（等价抽取，值不变）
const detailLabel: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--text-secondary)',
};
const detailValue: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-medium)',
};
const rowGap2: React.CSSProperties = { display: 'flex', gap: 'var(--space-2)' };
const colGap4: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
};
const gridTwoCol: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 'var(--space-4)',
};
const sectionTitle: React.CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: 13,
  fontWeight: 500,
};

interface OutboundOrder {
  id: string;
  order_no: string;
  customer_name: string;
  warehouse: string;
  status: 'pending' | 'picking' | 'shipped' | 'completed' | 'cancelled';
  total_quantity: number;
  total_amount: number;
  expected_date: string;
  actual_date?: string;
  priority: 'high' | 'normal' | 'low';
  remark?: string;
  created_at: string;
}

// Mock 数据
// 将 API 返回的 OutboundOrder 类型映射为页面使用的 OutboundOrder 类型。
// 部分历史接口使用驼峰别名，收窄为可选字段（ApiOutboundOrderCompat），避免 `as any`。
type OutboundTab = 'all' | 'pending' | 'picking' | 'shipped' | 'completed';
type ApiOutboundOrderCompat = ApiOutboundOrder & {
  order_no?: string;
  orderNo?: string;
  customerName?: string;
  warehouse?: string;
  totalQuantity?: number;
  totalAmount?: number;
  expectedDate?: string;
  shipped_date?: string;
  shippedDate?: string;
  shipper?: string;
  shipperName?: string;
  remark?: string;
};

const mapApiOutboundOrders = (apiOrders: ApiOutboundOrderCompat[]): OutboundOrder[] => {
  return apiOrders.map((o, index) => ({
    id: o.id,
    order_no: o.order_no || o.orderNo || `OUT2026${String(index + 1).padStart(5, '0')}`,
    customer_name: o.customer_name || o.customerName || '-',
    warehouse: o.warehouse || '-',
    status: (o.status as OutboundOrder['status']) || 'pending',
    priority: (o.priority as OutboundOrder['priority']) || 'normal',
    total_quantity: o.total_quantity || o.totalQuantity || 0,
    total_amount: o.total_amount || o.totalAmount || 0,
    expected_date: o.expected_date || o.expectedDate || '-',
    shipped_date: o.shipped_date || o.shippedDate || '-',
    shipper: o.shipper || o.shipperName || '-',
    remark: o.remark || '',
    created_at: o.created_at || new Date().toISOString(),
  }));
};

// Mock 数据（API 不可用时的 fallback）在组件内用 t() 构造，见 mockOrders

const buildStatusConfig = (t: (k: string) => string) => ({
  pending: {
    label: t('wms.outbound_order_page.status_pending'),
    variant: 'warning' as const,
    icon: Clock,
  },
  picking: {
    label: t('wms.outbound_order_page.status_picking'),
    variant: 'info' as const,
    icon: Package,
  },
  shipped: {
    label: t('wms.outbound_order_page.status_shipped'),
    variant: 'cyan' as const,
    icon: Truck,
  },
  completed: {
    label: t('wms.outbound_order_page.status_completed'),
    variant: 'success' as const,
    icon: CheckCircle,
  },
  cancelled: {
    label: t('wms.outbound_order_page.status_cancelled'),
    variant: 'default' as const,
    icon: AlertCircle,
  },
});

const buildPriorityConfig = (t: (k: string) => string) => ({
  high: { label: t('wms.outbound_order_page.priority_high'), variant: 'error' as const },
  normal: { label: t('wms.outbound_order_page.priority_normal'), variant: 'default' as const },
  low: { label: t('wms.outbound_order_page.priority_low'), variant: 'default' as const },
});

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const formatAmount = (value: number) => {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
};

const WmsOutboundOrderPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const statusConfig = useMemo(() => buildStatusConfig(t), [t]);
  const priorityConfig = useMemo(() => buildPriorityConfig(t), [t]);

  const mockOrders: OutboundOrder[] = [
    {
      id: '1',
      order_no: 'OUT202609001',
      customer_name: t('wms.demo.company_a_name'),
      warehouse: t('wms.outbound_order_page.wh_finished'),
      status: 'pending',
      total_quantity: 200,
      total_amount: 56000,
      expected_date: '2026-09-16',
      priority: 'high',
      remark: t('wms.demo.out_remark_urgent'),
      created_at: '2026-09-10 10:30:00',
    },
    {
      id: '2',
      order_no: 'OUT202609002',
      customer_name: t('wms.demo.company_b_name'),
      warehouse: t('wms.outbound_order_page.wh_finished'),
      status: 'picking',
      total_quantity: 500,
      total_amount: 128000,
      expected_date: '2026-09-14',
      priority: 'normal',
      created_at: '2026-09-09 14:20:00',
    },
    {
      id: '3',
      order_no: 'OUT202609003',
      customer_name: t('wms.demo.company_c_name'),
      warehouse: t('wms.outbound_order_page.wh_semi_finished'),
      status: 'shipped',
      total_quantity: 800,
      total_amount: 96000,
      expected_date: '2026-09-13',
      actual_date: '2026-09-13',
      priority: 'normal',
      created_at: '2026-09-07 09:15:00',
    },
    {
      id: '4',
      order_no: 'OUT202609004',
      customer_name: t('wms.demo.company_d_name'),
      warehouse: t('wms.outbound_order_page.wh_finished'),
      status: 'completed',
      total_quantity: 1000,
      total_amount: 256000,
      expected_date: '2026-09-10',
      actual_date: '2026-09-10',
      priority: 'high',
      created_at: '2026-09-05 16:45:00',
    },
    {
      id: '5',
      order_no: 'OUT202609005',
      customer_name: t('wms.demo.company_e_name'),
      warehouse: t('wms.outbound_order_page.wh_raw_material'),
      status: 'cancelled',
      total_quantity: 50,
      total_amount: 4500,
      expected_date: '2026-09-08',
      priority: 'low',
      remark: t('wms.demo.out_remark_cancelled'),
      created_at: '2026-09-01 11:00:00',
    },
  ];

  const [activeTab, setActiveTab] = useState<OutboundTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OutboundOrder | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OutboundOrder | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // 客户选项（从现有列表数据去重，供新建/编辑弹窗选择）
  const customerOptions = useMemo(() => {
    const seen = new Set<string>();
    return mockOrders
      .map((o) => o.customer_name)
      .filter((s) => s && s !== '-' && !seen.has(s) && seen.add(s))
      .map((s) => ({ value: s, label: s }));
  }, [mockOrders, t]);
  const [isMockData, setIsMockData] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, currentPage, pageSize, debouncedSearch, warehouseFilter],
    queryFn: async () => {
      try {
        // 尝试调用真实 API（服务端分页）
        const params: { page: number; pageSize: number; search?: string; warehouse?: string } = {
          page: currentPage,
          pageSize,
        };
        if (debouncedSearch) {
          params.search = debouncedSearch;
        }
        if (warehouseFilter !== 'all') {
          params.warehouse = warehouseFilter;
        }
        const res = await outboundOrderApi.list(params);
        const resData = res as unknown as {
          data?:
            | { list?: ApiOutboundOrder[]; items?: ApiOutboundOrder[]; total?: number }
            | ApiOutboundOrder[];
        };
        let apiOrders: ApiOutboundOrder[] = [];
        let total = 0;
        if (Array.isArray(resData)) {
          apiOrders = resData;
          total = resData.length;
        } else if (resData.data) {
          const dataObj = resData.data as {
            list?: ApiOutboundOrder[];
            items?: ApiOutboundOrder[];
            total?: number;
          };
          apiOrders = Array.isArray(resData.data)
            ? resData.data
            : dataObj.list || dataObj.items || [];
          total = dataObj.total || apiOrders.length;
        }
        if (Array.isArray(apiOrders)) {
          setIsMockData(false);
          return { orders: mapApiOutboundOrders(apiOrders), total };
        }
      } catch (e) {
        console.warn('[WMS Outbound Orders] API unavailable, using mock data:', e);
        setIsMockData(true);
      }
      // Mock fallback：本地分页
      let filtered = mockOrders;
      if (debouncedSearch) {
        filtered = filtered.filter(
          (o) => o.order_no.includes(debouncedSearch) || o.customer_name.includes(debouncedSearch)
        );
      }
      if (warehouseFilter !== 'all') {
        filtered = filtered.filter((o) => o.warehouse === warehouseFilter);
      }
      const start = (currentPage - 1) * pageSize;
      return { orders: filtered.slice(start, start + pageSize), total: filtered.length };
    },
  });

  const orders = data?.orders || [];

  const pushToast = (type: Toast['variant'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, variant: type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDeleteTarget(null);
      pushToast('success', t('wms.outbound_order_page.toast_delete_success'));
    },
    onError: () => {
      pushToast('error', t('wms.outbound_order_page.toast_delete_error'));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<OutboundOrder>) => {
      // S1：真实 API 创建失败时不再静默假成功——记录降级标记，由 onSuccess 给出醒目警示
      let apiFailed = false;
      try {
        await outboundOrderApi.create({
          order_no: data.order_no,
          customer_name: data.customer_name,
          warehouse: data.warehouse,
          status: data.status,
          expected_date: data.expected_date,
          total_amount: data.total_amount,
        } as unknown as CreateOutboundOrderRequest);
      } catch (e) {
        console.warn('[WMS Outbound Orders] Create API unavailable, using mock create:', e);
        apiFailed = true;
        setIsMockData(true);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { data, apiFailed };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      if (result.apiFailed) {
        // 降级 mock：明确告知未写入数据库，禁止静默假成功
        pushToast(
          'warning',
          t('wms.outbound_order_page.mock_create_fallback', '⚠️ 已降级为本地模拟数据，未写入数据库')
        );
      } else {
        pushToast('success', t('wms.outbound_order_page.toast_create_success'));
      }
    },
    onError: () => {
      pushToast('error', t('wms.outbound_order_page.toast_create_error'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OutboundOrder> }) => {
      let apiFailed = false;
      try {
        await outboundOrderApi.update(id, {
          status: data.status,
          actual_date: data.actual_date,
        } as unknown as UpdateOutboundOrderRequest);
      } catch (e) {
        console.warn('[WMS Outbound Orders] Update API unavailable, using mock update:', e);
        apiFailed = true;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id, data, apiFailed };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      if (result.apiFailed) {
        pushToast(
          'warning',
          t('wms.outbound_order_page.mock_update_fallback', '⚠️ 已降级为本地模拟数据，未写入数据库')
        );
      } else {
        pushToast('success', t('wms.outbound_order_page.toast_update_success'));
      }
    },
    onError: () => {
      pushToast('error', t('wms.outbound_order_page.toast_update_error'));
    },
  });

  // 服务端分页：直接使用 API 返回的数据，不再本地筛选和分页
  const filteredOrders = orders;
  const totalItems = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedOrders = filteredOrders;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, warehouseFilter, debouncedSearch]);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      picking: orders.filter((o) => o.status === 'picking').length,
      shipped: orders.filter((o) => o.status === 'shipped').length,
      completed: orders.filter((o) => o.status === 'completed').length,
    };
  }, [orders]);

  const tabsConfig = useMemo(
    () => [
      { id: 'all', label: t('wms.outbound_order_page.tab_all') },
      { id: 'pending', label: t('wms.outbound_order_page.status_pending'), badge: stats.pending },
      { id: 'picking', label: t('wms.outbound_order_page.status_picking'), badge: stats.picking },
      { id: 'shipped', label: t('wms.outbound_order_page.status_shipped'), badge: stats.shipped },
      { id: 'completed', label: t('wms.outbound_order_page.status_completed') },
    ],
    [stats, t]
  );

  const columns: DataTableColumn<OutboundOrder>[] = useMemo(
    () => [
      {
        key: 'order_no',
        header: t('wms.outbound_order_page.col_order_no'),
        sortable: true,
        render: (row) => (
          <span style={{ fontWeight: 'var(--font-semibold)', color: 'var(--accent-primary)' }}>
            {row.order_no}
          </span>
        ),
      },
      {
        key: 'customer_name',
        header: t('wms.outbound_order_page.col_customer'),
        sortable: true,
      },
      {
        key: 'warehouse',
        header: t('wms.outbound_order_page.col_warehouse'),
        render: (row) => <Tag variant='default'>{row.warehouse}</Tag>,
      },
      {
        key: 'priority',
        header: t('wms.outbound_order_page.col_priority'),
        align: 'center',
        render: (row) => {
          const config = priorityConfig[row.priority] || priorityConfig.normal;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'total_quantity',
        header: t('wms.outbound_order_page.col_quantity'),
        align: 'right',
        render: (row) => <span>{row.total_quantity.toLocaleString()}</span>,
      },
      {
        key: 'total_amount',
        header: t('wms.outbound_order_page.col_amount'),
        align: 'right',
        render: (row) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-semibold)' }}>
            {formatAmount(row.total_amount)}
          </span>
        ),
      },
      {
        key: 'expected_date',
        header: t('wms.outbound_order_page.col_expected_date'),
        sortable: true,
      },
      {
        key: 'status',
        header: t('wms.outbound_order_page.col_status'),
        align: 'center',
        render: (row) => {
          const config = statusConfig[row.status] || statusConfig.pending;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'actions',
        header: t('wms.outbound_order_page.col_actions'),
        align: 'right',
        render: (row) => (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Eye size={14} />}
              onClick={() => {
                setSelectedOrder(row);
                setDetailDrawerOpen(true);
              }}
            >
              {t('wms.outbound_order_page.action_detail')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Edit2 size={14} />}
              onClick={() => {
                setSelectedOrder(row);
                setCreateModalOpen(true);
              }}
            >
              {t('wms.outbound_order_page.action_edit')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Trash2 size={14} />}
              onClick={() => setDeleteTarget(row)}
            >
              {t('wms.outbound_order_page.action_delete')}
            </Button>
          </div>
        ),
      },
    ],
    [setSelectedOrder, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget, t]
  );

  return (
    <>
      {isMockData && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            color: 'var(--warning-700)',
            backgroundColor: 'color-mix(in srgb, var(--warning-500) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--warning-500) 30%, transparent)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-sm)',
            marginBottom: 'var(--space-4)',
          }}
        >
          {t('wms.outbound_order_page.demo_banner')}
        </div>
      )}
      <ListPageTemplate<OutboundOrder>
        header={{
          title: t('wms.outbound_order_page.title'),
          subtitle: t('wms.outbound_order_page.subtitle'),
          breadcrumbs: [
            { label: t('wms.outbound_order_page.breadcrumb_home'), href: '/dashboard' },
            { label: t('wms.outbound_order_page.breadcrumb_warehouse'), href: WMS_PATHS.root },
            { label: t('wms.outbound_order_page.title') },
          ],
        }}
        toolbar={
          <>
            <div
              style={{
                display: 'flex',
                gap: 'var(--space-3)',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <Input
                placeholder={t('wms.outbound_order_page.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                options={[
                  { value: 'all', label: t('wms.outbound_order_page.filter_all_warehouse') },
                  {
                    value: t('wms.outbound_order_page.wh_raw_material'),
                    label: t('wms.outbound_order_page.wh_raw_material'),
                  },
                  {
                    value: t('wms.outbound_order_page.wh_semi_finished'),
                    label: t('wms.outbound_order_page.wh_semi_finished'),
                  },
                  {
                    value: t('wms.outbound_order_page.wh_finished'),
                    label: t('wms.outbound_order_page.wh_finished'),
                  },
                ]}
                style={{ width: 140 }}
              />
            </div>
            <div style={rowGap2}>
              <Button
                variant='ghost'
                leftIcon={<RefreshCw size={16} />}
                onClick={() => refetch()}
              >
                {t('wms.outbound_order_page.action_refresh')}
              </Button>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={() => {
                  setSelectedOrder(null);
                  setCreateModalOpen(true);
                }}
              >
                {t('wms.outbound_order_page.action_new')}
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedOrders}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle={t('wms.outbound_order_page.empty_title')}
        emptyDescription={t('wms.outbound_order_page.empty_description')}
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label={t('wms.outbound_order_page.stat_total')}
              value={stats.total}
              icon={Package}
              accent='cyan'
            />
            <StatTile
              label={t('wms.outbound_order_page.status_pending')}
              value={stats.pending}
              icon={Clock}
              accent='warning'
            />
            <StatTile
              label={t('wms.outbound_order_page.status_picking')}
              value={stats.picking}
              icon={ArrowRight}
              accent='amber'
            />
            <StatTile
              label={t('wms.outbound_order_page.status_shipped')}
              value={stats.shipped}
              icon={Truck}
              accent='success'
            />
          </div>
        }
      >
        <Tabs
          tabs={tabsConfig}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as OutboundTab)}
        />
      </ListPageTemplate>

      {filteredOrders.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Pagination
            current={currentPage}
            total={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
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

      {/* 出库单详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedOrder(null);
        }}
        title={t('wms.outbound_order_page.drawer_title')}
        size='lg'
      >
        {selectedOrder && (
          <div style={colGap4}>
            <Card>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={detailLabel}>{t('wms.outbound_order_page.col_order_no')}</div>
                  <div
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-bold)',
                      color: 'var(--accent-primary)',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    {selectedOrder.order_no}
                  </div>
                </div>
                <div style={rowGap2}>
                  <Badge variant={priorityConfig[selectedOrder.priority]?.variant || 'default'}>
                    {priorityConfig[selectedOrder.priority]?.label ||
                      t('wms.outbound_order_page.priority_normal')}
                  </Badge>
                  <Badge variant={statusConfig[selectedOrder.status]?.variant || 'default'}>
                    {statusConfig[selectedOrder.status]?.label ||
                      t('wms.outbound_order_page.status_unknown')}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card title={t('wms.outbound_order_page.section_basic_info')}>
              <div style={gridTwoCol}>
                <div>
                  <div style={detailLabel}>{t('wms.outbound_order_page.col_customer')}</div>
                  <div style={detailValue}>{selectedOrder.customer_name}</div>
                </div>
                <div>
                  <div style={detailLabel}>{t('wms.outbound_order_page.col_warehouse')}</div>
                  <div style={detailValue}>{selectedOrder.warehouse}</div>
                </div>
                <div>
                  <div style={detailLabel}>{t('wms.outbound_order_page.label_total_quantity')}</div>
                  <div style={detailValue}>{selectedOrder.total_quantity.toLocaleString()}</div>
                </div>
                <div>
                  <div style={detailLabel}>{t('wms.outbound_order_page.label_total_amount')}</div>
                  <div
                    style={{
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-semibold)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {formatAmount(selectedOrder.total_amount)}
                  </div>
                </div>
              </div>
            </Card>

            <Card title={t('wms.outbound_order_page.section_time_info')}>
              <div style={gridTwoCol}>
                <div>
                  <div style={detailLabel}>{t('wms.outbound_order_page.label_expected_date')}</div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedOrder.expected_date}</div>
                </div>
                <div>
                  <div style={detailLabel}>{t('wms.outbound_order_page.label_actual_date')}</div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {selectedOrder.actual_date || '-'}
                  </div>
                </div>
                <div>
                  <div style={detailLabel}>{t('wms.outbound_order_page.label_created_at')}</div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {formatDateTime(selectedOrder.created_at)}
                  </div>
                </div>
              </div>
            </Card>

            {selectedOrder.remark && (
              <Card title={t('wms.outbound_order_page.section_remark')}>
                <p
                  style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}
                >
                  {selectedOrder.remark}
                </p>
              </Card>
            )}
          </div>
        )}
      </Drawer>

      {/* 新建/编辑出库单弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={
          selectedOrder
            ? t('wms.outbound_order_page.modal_edit_title')
            : t('wms.outbound_order_page.action_new')
        }
        size='lg'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setCreateModalOpen(false)}
            >
              {t('wms.outbound_order_page.button_cancel')}
            </Button>
            <Button
              variant='primary'
              onClick={() => {
                const customerEl = document.getElementById('field-1') as HTMLSelectElement | null;
                const warehouseEl = document.getElementById('field-2') as HTMLSelectElement | null;
                const expectedEl = document.getElementById('field-3') as HTMLInputElement | null;
                const formData: Partial<OutboundOrder> = {
                  customer_name: customerEl?.value || '',
                  warehouse: warehouseEl?.value || '',
                  expected_date: expectedEl?.value || '',
                };
                if (selectedOrder) {
                  updateMutation.mutate({ id: selectedOrder.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedOrder
                ? t('wms.outbound_order_page.button_save')
                : t('wms.outbound_order_page.button_create')}
            </Button>
          </>
        }
      >
        <div style={colGap4}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor='field-1'
                style={sectionTitle}
              >
                {t('wms.outbound_order_page.field_customer')}{' '}
                <span style={{ color: 'var(--text-error, #e5484d)' }}>*</span>
              </label>
              <Select
                id='field-1'
                placeholder={t('wms.outbound_order_page.placeholder_customer')}
                defaultValue={selectedOrder?.customer_name}
                options={customerOptions}
              />
            </div>
            <div>
              <label
                htmlFor='field-2'
                style={sectionTitle}
              >
                {t('wms.outbound_order_page.field_warehouse')}
              </label>
              <Select
                id='field-2'
                defaultValue={selectedOrder?.warehouse || t('wms.outbound_order_page.wh_finished')}
                options={[
                  {
                    value: t('wms.outbound_order_page.wh_raw_material'),
                    label: t('wms.outbound_order_page.wh_raw_material'),
                  },
                  {
                    value: t('wms.outbound_order_page.wh_semi_finished'),
                    label: t('wms.outbound_order_page.wh_semi_finished'),
                  },
                  {
                    value: t('wms.outbound_order_page.wh_finished'),
                    label: t('wms.outbound_order_page.wh_finished'),
                  },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={sectionTitle}
              >
                {t('wms.outbound_order_page.label_expected_date')}
              </label>
              <Input
                id='field-3'
                type='date'
                defaultValue={selectedOrder?.expected_date}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={sectionTitle}
              >
                {t('wms.outbound_order_page.col_priority')}
              </label>
              <Select
                id='field-4'
                defaultValue={selectedOrder?.priority || 'normal'}
                options={[
                  { value: 'high', label: t('wms.outbound_order_page.priority_high') },
                  { value: 'normal', label: t('wms.outbound_order_page.priority_normal') },
                  { value: 'low', label: t('wms.outbound_order_page.priority_low') },
                ]}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor='field-5'
              style={sectionTitle}
            >
              {t('wms.outbound_order_page.section_remark')}
            </label>
            <textarea
              id='field-5'
              rows={3}
              placeholder={t('wms.outbound_order_page.placeholder_remark')}
              defaultValue={selectedOrder?.remark}
              style={{
                width: '100%',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--surface-1)',
                color: 'var(--text-primary)',
                fontSize: 14,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('wms.outbound_order_page.delete_modal_title')}
        size='sm'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setDeleteTarget(null)}
            >
              {t('wms.outbound_order_page.button_cancel')}
            </Button>
            <Button
              variant='danger'
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {t('wms.outbound_order_page.button_confirm_delete')}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          {t('wms.outbound_order_page.delete_confirm_message', {
            order_no: deleteTarget?.order_no,
          })}
        </p>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

export default WmsOutboundOrderPage;
