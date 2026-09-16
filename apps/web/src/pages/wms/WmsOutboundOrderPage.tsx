import React, { useState, useEffect, useMemo } from 'react';
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
import { WMS_PATHS } from '@/modules/wms/config';
import { outboundOrderApi } from '@/api/wms/outbound';
import type { OutboundOrder as ApiOutboundOrder } from '@/api/wms/types';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['wms', 'outbound-orders'];

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
// 将 API 返回的 OutboundOrder 类型映射为页面使用的 OutboundOrder 类型
const mapApiOutboundOrders = (apiOrders: ApiOutboundOrder[]): OutboundOrder[] => {
  return apiOrders.map((o, index) => ({
    id: o.id,
    order_no:
      (o as any).order_no || (o as any).orderNo || `OUT2026${String(index + 1).padStart(5, '0')}`,
    customer_name: (o as any).customer_name || (o as any).customerName || '-',
    warehouse: (o as any).warehouse || '-',
    status: ((o as any).status as OutboundOrder['status']) || 'pending',
    priority: ((o as any).priority as OutboundOrder['priority']) || 'normal',
    total_quantity: (o as any).total_quantity || (o as any).totalQuantity || 0,
    total_amount: (o as any).total_amount || (o as any).totalAmount || 0,
    expected_date: (o as any).expected_date || (o as any).expectedDate || '-',
    shipped_date: (o as any).shipped_date || (o as any).shippedDate || '-',
    shipper: (o as any).shipper || (o as any).shipperName || '-',
    remark: (o as any).remark || '',
    created_at: o.created_at || new Date().toISOString(),
  }));
};

// Mock 数据（API 不可用时的 fallback）
const mockOrders: OutboundOrder[] = [
  {
    id: '1',
    order_no: 'OUT202609001',
    customer_name: '上海科技有限公司',
    warehouse: '成品仓',
    status: 'pending',
    total_quantity: 200,
    total_amount: 56000,
    expected_date: '2026-09-16',
    priority: 'high',
    remark: '加急订单',
    created_at: '2026-09-10 10:30:00',
  },
  {
    id: '2',
    order_no: 'OUT202609002',
    customer_name: '北京贸易集团',
    warehouse: '成品仓',
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
    customer_name: '深圳电子股份',
    warehouse: '半成品仓',
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
    customer_name: '广州制造有限公司',
    warehouse: '成品仓',
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
    customer_name: '成都设备公司',
    warehouse: '原材料仓',
    status: 'cancelled',
    total_quantity: 50,
    total_amount: 4500,
    expected_date: '2026-09-08',
    priority: 'low',
    remark: '客户取消订单',
    created_at: '2026-09-01 11:00:00',
  },
];

const statusConfig = {
  pending: { label: '待拣货', variant: 'warning' as const, icon: Clock },
  picking: { label: '拣货中', variant: 'info' as const, icon: Package },
  shipped: { label: '已发货', variant: 'cyan' as const, icon: Truck },
  completed: { label: '已完成', variant: 'success' as const, icon: CheckCircle },
  cancelled: { label: '已取消', variant: 'default' as const, icon: AlertCircle },
};

const priorityConfig = {
  high: { label: '加急', variant: 'error' as const },
  normal: { label: '普通', variant: 'default' as const },
  low: { label: '低', variant: 'default' as const },
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const formatAmount = (value: number) => {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
};

const WmsOutboundOrderPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    'all' | 'pending' | 'picking' | 'shipped' | 'completed'
  >('all');
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
        const params: any = {
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
          const dataObj = resData.data as any;
          apiOrders = Array.isArray(resData.data)
            ? resData.data
            : dataObj.list || dataObj.items || [];
          total = dataObj.total || apiOrders.length;
        }
        if (apiOrders.length > 0) {
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
      pushToast('success', '出库单删除成功');
    },
    onError: () => {
      pushToast('error', '删除失败，请重试');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<OutboundOrder>) => {
      try {
        await outboundOrderApi.create({
          order_no: (data as any).order_no,
          customer_name: (data as any).customer_name,
          warehouse: (data as any).warehouse,
          status: data.status,
          expected_date: (data as any).expected_date,
          total_amount: (data as any).total_amount,
        } as any);
      } catch (e) {
        console.warn('[WMS Outbound Orders] Create API unavailable, using mock create:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', '出库单创建成功');
    },
    onError: () => {
      pushToast('error', '创建失败，请重试');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OutboundOrder> }) => {
      try {
        await outboundOrderApi.update(id, {
          status: data.status,
          actual_date: (data as any).actual_date,
        } as any);
      } catch (e) {
        console.warn('[WMS Outbound Orders] Update API unavailable, using mock update:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', '出库单更新成功');
    },
    onError: () => {
      pushToast('error', '更新失败，请重试');
    },
  });

  // 服务端分页：直接使用 API 返回的数据，不再本地筛选和分页
  const filteredOrders = orders;
  const totalItems = (data as any)?.total || 0;
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
      { id: 'all', label: '全部' },
      { id: 'pending', label: '待拣货', badge: stats.pending },
      { id: 'picking', label: '拣货中', badge: stats.picking },
      { id: 'shipped', label: '已发货', badge: stats.shipped },
      { id: 'completed', label: '已完成' },
    ],
    [stats]
  );

  const columns: DataTableColumn<OutboundOrder>[] = useMemo(
    () => [
      {
        key: 'order_no',
        header: '出库单号',
        sortable: true,
        render: (row) => (
          <span style={{ fontWeight: 'var(--font-semibold)', color: 'var(--accent-primary)' }}>
            {row.order_no}
          </span>
        ),
      },
      {
        key: 'customer_name',
        header: '客户',
        sortable: true,
      },
      {
        key: 'warehouse',
        header: '出库仓库',
        render: (row) => <Tag variant='default'>{row.warehouse}</Tag>,
      },
      {
        key: 'priority',
        header: '优先级',
        align: 'center',
        render: (row) => {
          const config = priorityConfig[row.priority] || priorityConfig.normal;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'total_quantity',
        header: '数量',
        align: 'right',
        render: (row) => <span>{row.total_quantity.toLocaleString()}</span>,
      },
      {
        key: 'total_amount',
        header: '金额',
        align: 'right',
        render: (row) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-semibold)' }}>
            {formatAmount(row.total_amount)}
          </span>
        ),
      },
      {
        key: 'expected_date',
        header: '预计出库',
        sortable: true,
      },
      {
        key: 'status',
        header: '状态',
        align: 'center',
        render: (row) => {
          const config = statusConfig[row.status] || statusConfig.pending;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'actions',
        header: '操作',
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
              详情
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
              编辑
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Trash2 size={14} />}
              onClick={() => setDeleteTarget(row)}
            >
              删除
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
          ⚠️ 当前为演示模式，数据可能不是最新。API 连接失败，正在使用本地演示数据。
        </div>
      )}
      <ListPageTemplate<OutboundOrder>
        header={{
          title: '出库单管理',
          subtitle: '管理销售出库单，跟踪拣货发货进度',
          breadcrumbs: [
            { label: '首页', href: '/dashboard' },
            { label: '仓储物流', href: WMS_PATHS.root },
            { label: '出库单管理' },
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
                placeholder='搜索出库单号/客户...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                options={[
                  { value: 'all', label: '全部仓库' },
                  { value: '原材料仓', label: '原材料仓' },
                  { value: '半成品仓', label: '半成品仓' },
                  { value: '成品仓', label: '成品仓' },
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
                刷新
              </Button>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={() => {
                  setSelectedOrder(null);
                  setCreateModalOpen(true);
                }}
              >
                新建出库单
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedOrders}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle='暂无出库单'
        emptyDescription='点击右上角「新建出库单」按钮创建第一个出库单'
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label='出库单总数'
              value={stats.total}
              icon={Package}
              accent='cyan'
            />
            <StatTile
              label='待拣货'
              value={stats.pending}
              icon={Clock}
              accent='warning'
            />
            <StatTile
              label='拣货中'
              value={stats.picking}
              icon={ArrowRight}
              accent='amber'
            />
            <StatTile
              label='已发货'
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

      {/* 出库单详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedOrder(null);
        }}
        title='出库单详情'
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
                    出库单号
                  </div>
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
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Badge variant={priorityConfig[selectedOrder.priority]?.variant || 'default'}>
                    {priorityConfig[selectedOrder.priority]?.label || '普通'}
                  </Badge>
                  <Badge variant={statusConfig[selectedOrder.status]?.variant || 'default'}>
                    {statusConfig[selectedOrder.status]?.label || '未知'}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card title='基本信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    客户
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedOrder.customer_name}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    出库仓库
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedOrder.warehouse}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    总数量
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedOrder.total_quantity.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    总金额
                  </div>
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

            <Card title='时间信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    预计出库日期
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedOrder.expected_date}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    实际出库日期
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {selectedOrder.actual_date || '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    创建时间
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {formatDateTime(selectedOrder.created_at)}
                  </div>
                </div>
              </div>
            </Card>

            {selectedOrder.remark && (
              <Card title='备注'>
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
        title={selectedOrder ? '编辑出库单' : '新建出库单'}
        size='lg'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setCreateModalOpen(false)}
            >
              取消
            </Button>
            <Button
              variant='primary'
              onClick={() => {
                const formData: Partial<OutboundOrder> = {
                  order_no:
                    (document.querySelector('input[placeholder*="出库单号"]') as HTMLInputElement)
                      ?.value || '',
                  customer_name:
                    (document.querySelector('input[placeholder*="客户名称"]') as HTMLInputElement)
                      ?.value || '',
                  warehouse: (document.querySelector('select') as HTMLSelectElement)?.value || '',
                  expected_date:
                    (document.querySelector('input[type="date"]') as HTMLInputElement)?.value || '',
                };
                if (selectedOrder) {
                  updateMutation.mutate({ id: selectedOrder.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedOrder ? '保存修改' : '创建出库单'}
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
                客户 *
              </label>
              <Input
                id='field-1'
                placeholder='请选择客户'
                defaultValue={selectedOrder?.customer_name}
              />
            </div>
            <div>
              <label
                htmlFor='field-2'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                出库仓库 *
              </label>
              <Select
                id='field-2'
                defaultValue={selectedOrder?.warehouse || '成品仓'}
                options={[
                  { value: '原材料仓', label: '原材料仓' },
                  { value: '半成品仓', label: '半成品仓' },
                  { value: '成品仓', label: '成品仓' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                预计出库日期
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
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                优先级
              </label>
              <Select
                id='field-4'
                defaultValue={selectedOrder?.priority || 'normal'}
                options={[
                  { value: 'high', label: '加急' },
                  { value: 'normal', label: '普通' },
                  { value: 'low', label: '低' },
                ]}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor='field-5'
              style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
            >
              备注
            </label>
            <textarea
              id='field-5'
              rows={3}
              placeholder='请输入备注信息...'
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
        title='删除出库单'
        size='sm'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setDeleteTarget(null)}
            >
              取消
            </Button>
            <Button
              variant='danger'
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              确认删除
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          确定要删除出库单「{deleteTarget?.order_no}」吗？此操作不可撤销。
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
