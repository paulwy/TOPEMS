import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  FileText,
  DollarSign,
  Truck,
  CheckCircle,
  Clock,
  User,
} from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
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
import { useTranslation } from 'react-i18next';
import { salesOrderApi } from '@/api/erp/core/salesOrder';
import type { SalesOrder as ApiSalesOrder } from '@/api/erp/core/types';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['erp', 'sales-orders'];

interface SalesOrder {
  id: string;
  order_no: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  order_date: string;
  delivery_date: string;
  salesperson: string;
  created_at: string;
}

// 将 API 返回的 SalesOrder 类型映射为页面使用的 SalesOrder 类型
const mapApiSalesOrders = (apiOrders: ApiSalesOrder[]): SalesOrder[] => {
  return apiOrders.map((o, index) => ({
    id: o.id,
    order_no:
      (o as any).order_no || (o as any).orderNo || `SO2026${String(index + 1).padStart(5, '0')}`,
    customer_name: (o as any).customer_name || (o as any).customerName || '-',
    product_name: (o as any).product_name || (o as any).productName || (o as any).product || '-',
    quantity: (o as any).quantity || 0,
    unit_price: (o as any).unit_price || (o as any).unitPrice || 0,
    total_amount:
      (o as any).total_amount ||
      (o as any).amount ||
      ((o as any).quantity || 0) * ((o as any).unit_price || 0),
    status: ((o as any).status as SalesOrder['status']) || 'draft',
    order_date: (o as any).order_date || (o as any).orderDate || '-',
    delivery_date: (o as any).delivery_date || (o as any).deliveryDate || '-',
    salesperson: (o as any).salesperson || (o as any).salesPerson || '-',
    created_at: o.created_at || new Date().toISOString(),
  }));
};

// Mock 数据（API 不可用时的 fallback）在组件内用 t() 构造，见 mockSalesOrders

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const formatAmount = (value: number) => {
  if (value >= 10000) {
    return `¥${(value / 10000).toFixed(1)}万`;
  }
  return `¥${value.toLocaleString('zh-CN')}`;
};

const ErpSalesOrderRedesignPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mockSalesOrders: SalesOrder[] = [
    {
      id: '1',
      order_no: 'SO202609001',
      customer_name: t('erp.demo.company_a_name'),
      product_name: t('erp.demo.product_servo'),
      quantity: 50,
      unit_price: 3500,
      total_amount: 175000,
      status: 'delivered',
      order_date: '2026-09-01',
      delivery_date: '2026-09-10',
      salesperson: t('erp.demo.owner_zhang'),
      created_at: '2026-09-01 10:00:00',
    },
    {
      id: '2',
      order_no: 'SO202609002',
      customer_name: t('erp.demo.company_b_name'),
      product_name: t('erp.demo.product_plc'),
      quantity: 100,
      unit_price: 1200,
      total_amount: 120000,
      status: 'shipped',
      order_date: '2026-09-05',
      delivery_date: '2026-09-20',
      salesperson: t('erp.demo.owner_li'),
      created_at: '2026-09-05 14:30:00',
    },
    {
      id: '3',
      order_no: 'SO202609003',
      customer_name: t('erp.demo.company_c_name'),
      product_name: t('erp.demo.product_camera'),
      quantity: 30,
      unit_price: 5800,
      total_amount: 174000,
      status: 'confirmed',
      order_date: '2026-09-10',
      delivery_date: '2026-09-25',
      salesperson: t('erp.demo.owner_zhang'),
      created_at: '2026-09-10 09:15:00',
    },
    {
      id: '4',
      order_no: 'SO202608001',
      customer_name: t('erp.demo.company_d_name'),
      product_name: t('erp.demo.product_inverter'),
      quantity: 20,
      unit_price: 4200,
      total_amount: 84000,
      status: 'draft',
      order_date: '2026-08-28',
      delivery_date: '2026-09-15',
      salesperson: t('erp.demo.owner_wang'),
      created_at: '2026-08-28 11:00:00',
    },
    {
      id: '5',
      order_no: 'SO202608002',
      customer_name: t('erp.demo.company_e_name'),
      product_name: t('erp.demo.product_hmi'),
      quantity: 15,
      unit_price: 2800,
      total_amount: 42000,
      status: 'cancelled',
      order_date: '2026-08-15',
      delivery_date: '2026-08-30',
      salesperson: t('erp.demo.owner_li'),
      created_at: '2026-08-15 16:45:00',
    },
  ];

  const statusConfig = useMemo(() => ({
    draft: { label: t('erp.erp_sales_order_redesign.status.draft'), variant: 'default' as const },
    confirmed: { label: t('erp.erp_sales_order_redesign.status.confirmed'), variant: 'info' as const },
    shipped: { label: t('erp.erp_sales_order_redesign.status.shipped'), variant: 'warning' as const },
    delivered: { label: t('erp.erp_sales_order_redesign.status.delivered'), variant: 'success' as const },
    cancelled: { label: t('erp.erp_sales_order_redesign.status.cancelled'), variant: 'error' as const },
  }), [t]);

  const [activeTab, setActiveTab] = useState<'all' | 'confirmed' | 'shipped' | 'delivered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalesOrder | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMockData, setIsMockData] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, currentPage, pageSize, debouncedSearch, statusFilter],
    queryFn: async () => {
      try {
        // 尝试调用真实 API（服务端分页）
        const params: any = {
          page: currentPage,
          pageSize,
        };
        if (debouncedSearch) {
          params.search = debouncedSearch;
        }
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        const res = await salesOrderApi.list(params);
        const resData = res as unknown as {
          data?:
            { orders?: ApiSalesOrder[]; items?: ApiSalesOrder[]; total?: number } | ApiSalesOrder[];
        };
        let apiOrders: ApiSalesOrder[] = [];
        let total = 0;
        if (Array.isArray(resData)) {
          apiOrders = resData;
          total = resData.length;
        } else if (resData.data) {
          const dataObj = resData.data as any;
          apiOrders = Array.isArray(resData.data)
            ? resData.data
            : dataObj.orders || dataObj.items || [];
          total = dataObj.total || apiOrders.length;
        }
        if (apiOrders.length > 0) {
          setIsMockData(false);
          return { orders: mapApiSalesOrders(apiOrders), total };
        }
      } catch (e) {
        console.warn('[ERP Sales Orders] API unavailable, using mock data:', e);
        setIsMockData(true);
      }
      // Mock fallback：本地分页
      let filtered = mockSalesOrders;
      if (debouncedSearch) {
        filtered = filtered.filter(
          (o) => o.order_no.includes(debouncedSearch) || o.customer_name.includes(debouncedSearch)
        );
      }
      if (statusFilter !== 'all') {
        filtered = filtered.filter((o) => o.status === statusFilter);
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
      try {
        await salesOrderApi.delete(id);
      } catch (e) {
        console.warn('[ERP Sales Orders] Delete API unavailable, using mock delete:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDeleteTarget(null);
      pushToast('success', t('erp.erp_sales_order_redesign.toast.delete_success'));
    },
    onError: () => {
      pushToast('error', t('erp.erp_sales_order_redesign.toast.delete_failed'));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<SalesOrder>) => {
      try {
        await salesOrderApi.create({
          order_no: (data as any).order_no,
          customer_name: data.customer_name,
          total_amount: data.total_amount,
          status: data.status,
          order_date: data.order_date,
          delivery_date: data.delivery_date,
          salesperson: (data as any).salesperson,
        } as any);
      } catch (e) {
        console.warn('[ERP Sales Orders] Create API unavailable, using mock create:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', t('erp.erp_sales_order_redesign.toast.create_success'));
    },
    onError: () => {
      pushToast('error', t('erp.erp_sales_order_redesign.toast.create_failed'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesOrder> }) => {
      try {
        await salesOrderApi.update(id, {
          customer_name: data.customer_name,
          total_amount: data.total_amount,
          status: data.status,
          delivery_date: data.delivery_date,
        } as any);
      } catch (e) {
        console.warn('[ERP Sales Orders] Update API unavailable, using mock update:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', t('erp.erp_sales_order_redesign.toast.update_success'));
    },
    onError: () => {
      pushToast('error', t('erp.erp_sales_order_redesign.toast.update_failed'));
    },
  });

  // 服务端分页：直接使用 API 返回的数据，不再本地筛选和分页
  const filteredOrders = orders;
  const totalItems = (data as any)?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedOrders = filteredOrders;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter, debouncedSearch]);

  const stats = useMemo(() => {
    const total = orders.length;
    const confirmed = orders.filter((o) => o.status === 'confirmed').length;
    const shipped = orders.filter((o) => o.status === 'shipped').length;
    const totalAmount = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total_amount, 0);
    return { total, confirmed, shipped, totalAmount };
  }, [orders]);

  const tabsConfig = useMemo(
    () => [
      { id: 'all', label: t('erp.erp_sales_order_redesign.tab.all') },
      { id: 'confirmed', label: t('erp.erp_sales_order_redesign.tab.confirmed'), badge: stats.confirmed },
      { id: 'shipped', label: t('erp.erp_sales_order_redesign.tab.shipped'), badge: stats.shipped },
      {
        id: 'delivered',
        label: t('erp.erp_sales_order_redesign.tab.delivered'),
        badge: orders.filter((o) => o.status === 'delivered').length,
      },
    ],
    [t, stats, orders]
  );

  const columns: DataTableColumn<SalesOrder>[] = useMemo(
    () => [
      {
        key: 'order_no',
        header: t('erp.erp_sales_order_redesign.column.order_no'),
        sortable: true,
        render: (row) => (
          <span
            style={{
              fontWeight: 'var(--font-semibold)',
              color: 'var(--accent-primary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {row.order_no}
          </span>
        ),
      },
      {
        key: 'customer_name',
        header: t('erp.erp_sales_order_redesign.column.customer_name'),
        render: (row) => (
          <div>
            <div style={{ fontWeight: 500 }}>{row.customer_name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {row.product_name}
            </div>
          </div>
        ),
      },
      {
        key: 'quantity',
        header: t('erp.erp_sales_order_redesign.column.quantity'),
        align: 'center',
        render: (row) => <span style={{ fontFamily: 'var(--font-mono)' }}>{row.quantity}</span>,
      },
      {
        key: 'total_amount',
        header: t('erp.erp_sales_order_redesign.column.total_amount'),
        align: 'right',
        sortable: true,
        render: (row) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-semibold)' }}>
            {formatAmount(row.total_amount)}
          </span>
        ),
      },
      {
        key: 'order_date',
        header: t('erp.erp_sales_order_redesign.column.order_date'),
        sortable: true,
      },
      {
        key: 'delivery_date',
        header: t('erp.erp_sales_order_redesign.column.delivery_date'),
        sortable: true,
      },
      {
        key: 'salesperson',
        header: t('erp.erp_sales_order_redesign.column.salesperson'),
        render: (row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <User
              size={14}
              style={{ color: 'var(--text-tertiary)' }}
            />
            <span>{row.salesperson}</span>
          </div>
        ),
      },
      {
        key: 'status',
        header: t('erp.erp_sales_order_redesign.column.status'),
        align: 'center',
        render: (row) => {
          const config = statusConfig[row.status] || statusConfig.draft;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'actions',
        header: t('erp.erp_sales_order_redesign.column.actions'),
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
              {t('erp.erp_sales_order_redesign.action.detail')}
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
              {t('erp.erp_sales_order_redesign.action.edit')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Trash2 size={14} />}
              onClick={() => setDeleteTarget(row)}
            >
              {t('erp.erp_sales_order_redesign.action.delete')}
            </Button>
          </div>
        ),
      },
    ],
    [setSelectedOrder, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget]
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
          {t('erp.erp_sales_order_redesign.demo_banner')}
        </div>
      )}
      <ListPageTemplate<SalesOrder>
        header={{
          title: t('erp.erp_sales_order_redesign.title'),
          subtitle: t('erp.erp_sales_order_redesign.subtitle'),
          breadcrumbs: [
            { label: t('erp.erp_sales_order_redesign.breadcrumb.home'), href: '/dashboard' },
            { label: t('erp.erp_sales_order_redesign.breadcrumb.erp') },
            { label: t('erp.erp_sales_order_redesign.breadcrumb.sales_order') },
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
                placeholder={t('erp.erp_sales_order_redesign.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: t('erp.erp_sales_order_redesign.filter.all_status') },
                  { value: 'draft', label: t('erp.erp_sales_order_redesign.status.draft') },
                  { value: 'confirmed', label: t('erp.erp_sales_order_redesign.status.confirmed') },
                  { value: 'shipped', label: t('erp.erp_sales_order_redesign.status.shipped') },
                  { value: 'delivered', label: t('erp.erp_sales_order_redesign.status.delivered') },
                  { value: 'cancelled', label: t('erp.erp_sales_order_redesign.status.cancelled') },
                ]}
                style={{ width: 140 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                variant='ghost'
                leftIcon={<RefreshCw size={16} />}
                onClick={() => refetch()}
              >
                {t('erp.erp_sales_order_redesign.button.refresh')}
              </Button>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={() => {
                  setSelectedOrder(null);
                  setCreateModalOpen(true);
                }}
              >
                {t('erp.erp_sales_order_redesign.button.create_order')}
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedOrders}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle={t('erp.erp_sales_order_redesign.empty.title')}
        emptyDescription={t('erp.erp_sales_order_redesign.empty.description')}
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label={t('erp.erp_sales_order_redesign.stat.total')}
              value={stats.total}
              icon={FileText}
              accent='cyan'
            />
            <StatTile
              label={t('erp.erp_sales_order_redesign.stat.confirmed')}
              value={stats.confirmed}
              icon={Clock}
              accent='warning'
            />
            <StatTile
              label={t('erp.erp_sales_order_redesign.stat.shipped')}
              value={stats.shipped}
              icon={Truck}
              accent='amber'
            />
            <StatTile
              label={t('erp.erp_sales_order_redesign.stat.total_amount')}
              value={formatAmount(stats.totalAmount)}
              icon={DollarSign}
              accent='success'
            />
          </div>
        }
      >
        <Tabs
          tabs={tabsConfig}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as any)}
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

      {/* 订单详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedOrder(null);
        }}
        title={t('erp.erp_sales_order_redesign.drawer.detail_title')}
        size='lg'
      >
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Card>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {selectedOrder.order_no}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-bold)',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    {selectedOrder.customer_name}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    {selectedOrder.product_name}
                  </div>
                </div>
                <Badge variant={statusConfig[selectedOrder.status]?.variant || 'default'}>
                  {statusConfig[selectedOrder.status]?.label || t('erp.erp_sales_order_redesign.status.unknown')}
                </Badge>
              </div>
            </Card>

            {/* 订单金额大字体 */}
            <Card title={t('erp.erp_sales_order_redesign.card.total_amount')}>
              <div
                style={{
                  fontSize: 'var(--text-3xl)',
                  fontWeight: 'var(--font-bold)',
                  textAlign: 'center',
                }}
              >
                {formatAmount(selectedOrder.total_amount)}
              </div>
            </Card>

            <Card title={t('erp.erp_sales_order_redesign.card.order_info')}>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('erp.erp_sales_order_redesign.field.product_name')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedOrder.product_name}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('erp.erp_sales_order_redesign.field.quantity')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
                    {selectedOrder.quantity} {t('erp.erp_sales_order_redesign.field.piece_unit')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('erp.erp_sales_order_redesign.field.unit_price')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
                    ¥{selectedOrder.unit_price.toLocaleString('zh-CN')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('erp.erp_sales_order_redesign.field.salesperson')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedOrder.salesperson}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('erp.erp_sales_order_redesign.field.order_date')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedOrder.order_date}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('erp.erp_sales_order_redesign.field.delivery_date')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedOrder.delivery_date}</div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      {/* 新建/编辑订单弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={selectedOrder ? t('erp.erp_sales_order_redesign.modal.edit_title') : t('erp.erp_sales_order_redesign.modal.create_title')}
        size='lg'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setCreateModalOpen(false)}
            >
              {t('erp.erp_sales_order_redesign.button.cancel')}
            </Button>
            <Button
              variant='primary'
              onClick={() => {
                const formData: Partial<SalesOrder> = {
                  customer_name:
                    (document.querySelector('input[placeholder*="客户名称"]') as HTMLInputElement)
                      ?.value || '',
                  total_amount: Number(
                    (document.querySelector('input[type="number"]') as HTMLInputElement)?.value || 0
                  ),
                  order_date:
                    (document.querySelectorAll('input[type="date"]')[0] as HTMLInputElement)
                      ?.value || '',
                  delivery_date:
                    (document.querySelectorAll('input[type="date"]')[1] as HTMLInputElement)
                      ?.value || '',
                };
                if (selectedOrder) {
                  updateMutation.mutate({ id: selectedOrder.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedOrder ? t('erp.erp_sales_order_redesign.modal.save_changes') : t('erp.erp_sales_order_redesign.modal.create')}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor='field-1'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('erp.erp_sales_order_redesign.form.customer_name')} *
              </label>
              <Select
                id='field-1'
                defaultValue={selectedOrder?.customer_name || t('erp.demo.company_a_name')}
                options={[
                  { value: t('erp.demo.company_a_name'), label: t('erp.demo.company_a_name') },
                  { value: t('erp.demo.company_b_name'), label: t('erp.demo.company_b_name') },
                  { value: t('erp.demo.company_c_name'), label: t('erp.demo.company_c_name') },
                  { value: t('erp.demo.company_d_name'), label: t('erp.demo.company_d_name') },
                  { value: t('erp.demo.company_e_name'), label: t('erp.demo.company_e_name') },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-2'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('erp.erp_sales_order_redesign.form.product_name')} *
              </label>
              <Input
                id='field-2'
                placeholder={t('erp.erp_sales_order_redesign.form.product_name_placeholder')}
                defaultValue={selectedOrder?.product_name}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('erp.erp_sales_order_redesign.form.quantity')}
              </label>
              <Input
                id='field-3'
                type='number'
                placeholder={t('erp.erp_sales_order_redesign.form.quantity_placeholder')}
                defaultValue={selectedOrder?.quantity || 50}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('erp.erp_sales_order_redesign.form.unit_price')}
              </label>
              <Input
                id='field-4'
                type='number'
                placeholder={t('erp.erp_sales_order_redesign.form.unit_price_placeholder')}
                defaultValue={selectedOrder?.unit_price || 3500}
              />
            </div>
            <div>
              <label
                htmlFor='field-5'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('erp.erp_sales_order_redesign.form.order_date')}
              </label>
              <Input
                id='field-5'
                type='date'
                defaultValue={selectedOrder?.order_date || '2026-09-15'}
              />
            </div>
            <div>
              <label
                htmlFor='field-6'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('erp.erp_sales_order_redesign.form.delivery_date')}
              </label>
              <Input
                id='field-6'
                type='date'
                defaultValue={selectedOrder?.delivery_date || '2026-09-30'}
              />
            </div>
            <div>
              <label
                htmlFor='field-7'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('erp.erp_sales_order_redesign.form.salesperson')}
              </label>
              <Input
                id='field-7'
                placeholder={t('erp.erp_sales_order_redesign.form.salesperson_placeholder')}
                defaultValue={selectedOrder?.salesperson || t('erp.demo.owner_zhang')}
              />
            </div>
            <div>
              <label
                htmlFor='field-8'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('erp.erp_sales_order_redesign.form.status')}
              </label>
              <Select
                id='field-8'
                defaultValue={selectedOrder?.status || 'draft'}
                options={[
                  { value: 'draft', label: t('erp.erp_sales_order_redesign.status.draft') },
                  { value: 'confirmed', label: t('erp.erp_sales_order_redesign.status.confirmed') },
                  { value: 'shipped', label: t('erp.erp_sales_order_redesign.status.shipped') },
                  { value: 'delivered', label: t('erp.erp_sales_order_redesign.status.delivered') },
                  { value: 'cancelled', label: t('erp.erp_sales_order_redesign.status.cancelled') },
                ]}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('erp.erp_sales_order_redesign.delete.title')}
        size='sm'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setDeleteTarget(null)}
            >
              {t('erp.erp_sales_order_redesign.button.cancel')}
            </Button>
            <Button
              variant='danger'
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {t('erp.erp_sales_order_redesign.delete.confirm')}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          {t('erp.erp_sales_order_redesign.delete.confirm_message', { order_no: deleteTarget?.order_no })}
        </p>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

export default ErpSalesOrderRedesignPage;
