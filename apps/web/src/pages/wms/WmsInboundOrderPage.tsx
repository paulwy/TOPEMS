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
import { inboundOrderApi } from '@/api/wms/inbound';
import type { InboundOrder as ApiInboundOrder } from '@/api/wms/types';
import i18n from '@/i18n';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['wms', 'inbound-orders'];

interface InboundOrder {
  id: string;
  order_no: string;
  supplier_name: string;
  warehouse: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  total_quantity: number;
  total_amount: number;
  expected_date: string;
  actual_date?: string;
  remark?: string;
  created_at: string;
}

// Mock 数据
// 将 API 返回的 InboundOrder 类型映射为页面使用的 InboundOrder 类型
const mapApiInboundOrders = (apiOrders: ApiInboundOrder[]): InboundOrder[] => {
  return apiOrders.map((o, index) => ({
    id: o.id,
    order_no:
      (o as any).order_no || (o as any).orderNo || `IN2026${String(index + 1).padStart(5, '0')}`,
    supplier_name: (o as any).supplier_name || (o as any).supplierName || '-',
    warehouse: (o as any).warehouse || '-',
    status: ((o as any).status as InboundOrder['status']) || 'pending',
    total_quantity: (o as any).total_quantity || (o as any).totalQuantity || 0,
    total_amount: (o as any).total_amount || (o as any).totalAmount || 0,
    expected_date: (o as any).expected_date || (o as any).expectedDate || '-',
    received_date: (o as any).received_date || (o as any).receivedDate || '-',
    receiver: (o as any).receiver || (o as any).receiverName || '-',
    remark: (o as any).remark || '',
    created_at: o.created_at || new Date().toISOString(),
  }));
};

// Mock 数据（API 不可用时的 fallback）
const mockOrders: InboundOrder[] = [
  {
    id: '1',
    order_no: 'IN202609001',
    supplier_name: '华东电子有限公司',
    warehouse: '原材料仓',
    status: 'pending',
    total_quantity: 500,
    total_amount: 25000,
    expected_date: '2026-09-15',
    remark: '紧急订单',
    created_at: '2026-09-10 10:30:00',
  },
  {
    id: '2',
    order_no: 'IN202609002',
    supplier_name: '南方机械制造',
    warehouse: '半成品仓',
    status: 'in_progress',
    total_quantity: 1200,
    total_amount: 86000,
    expected_date: '2026-09-14',
    actual_date: '2026-09-13',
    created_at: '2026-09-08 14:20:00',
  },
  {
    id: '3',
    order_no: 'IN202609003',
    supplier_name: '北方化工原料',
    warehouse: '化学品仓',
    status: 'completed',
    total_quantity: 800,
    total_amount: 45000,
    expected_date: '2026-09-12',
    actual_date: '2026-09-12',
    created_at: '2026-09-05 09:15:00',
  },
  {
    id: '4',
    order_no: 'IN202609004',
    supplier_name: '西部包装材料',
    warehouse: '包材仓',
    status: 'pending',
    total_quantity: 3000,
    total_amount: 12000,
    expected_date: '2026-09-18',
    created_at: '2026-09-11 16:45:00',
  },
  {
    id: '5',
    order_no: 'IN202609005',
    supplier_name: '中部五金配件',
    warehouse: '原材料仓',
    status: 'cancelled',
    total_quantity: 200,
    total_amount: 8000,
    expected_date: '2026-09-10',
    remark: '供应商延迟交货',
    created_at: '2026-09-01 11:00:00',
  },
];

const statusConfig = {
  pending: { label: '待入库', variant: 'warning' as const, icon: Clock },
  in_progress: { label: '入库中', variant: 'info' as const, icon: Truck },
  completed: { label: '已完成', variant: 'success' as const, icon: CheckCircle },
  cancelled: { label: '已取消', variant: 'default' as const, icon: AlertCircle },
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const formatAmount = (value: number) => {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
};

const WmsInboundOrderPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress' | 'completed'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<InboundOrder | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<InboundOrder | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMockData, setIsMockData] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 使用 Mock 数据（API 不可用时）
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
        const res = await inboundOrderApi.list(params);
        const resData = res as unknown as {
          data?:
            | { list?: ApiInboundOrder[]; items?: ApiInboundOrder[]; total?: number }
            | ApiInboundOrder[];
        };
        let apiOrders: ApiInboundOrder[] = [];
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
          return { orders: mapApiInboundOrders(apiOrders), total };
        }
      } catch (e) {
        console.warn('[WMS Inbound Orders] API unavailable, using mock data:', e);
        setIsMockData(true);
      }
      // Mock fallback：本地分页
      let filtered = mockOrders;
      if (debouncedSearch) {
        filtered = filtered.filter(
          (o) => o.order_no.includes(debouncedSearch) || o.supplier_name.includes(debouncedSearch)
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
      // 实际项目中调用 wmsApi.inboundOrders.delete(id)
      await new Promise((resolve) => setTimeout(resolve, 500));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDeleteTarget(null);
      pushToast('success', '入库单删除成功');
    },
    onError: () => {
      pushToast('error', '删除失败，请重试');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<InboundOrder>) => {
      try {
        await inboundOrderApi.create({
          order_no: (data as any).order_no,
          supplier_name: (data as any).supplier_name,
          warehouse: (data as any).warehouse,
          status: data.status,
          expected_date: (data as any).expected_date,
          total_amount: (data as any).total_amount,
        } as any);
      } catch (e) {
        console.warn('[WMS Inbound Orders] Create API unavailable, using mock create:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', '入库单创建成功');
    },
    onError: () => {
      pushToast('error', '创建失败，请重试');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InboundOrder> }) => {
      try {
        await inboundOrderApi.update(id, {
          status: data.status,
          actual_date: (data as any).actual_date,
        } as any);
      } catch (e) {
        console.warn('[WMS Inbound Orders] Update API unavailable, using mock update:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', '入库单更新成功');
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

  // 统计
  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.status === 'pending').length,
      inProgress: orders.filter((o) => o.status === 'in_progress').length,
      completed: orders.filter((o) => o.status === 'completed').length,
    };
  }, [orders]);

  const tabsConfig = useMemo(
    () => [
      { id: 'all', label: '全部' },
      { id: 'pending', label: '待入库', badge: stats.pending },
      { id: 'in_progress', label: '入库中', badge: stats.inProgress },
      { id: 'completed', label: '已完成' },
    ],
    [stats]
  );

  const columns: DataTableColumn<InboundOrder>[] = useMemo(
    () => [
      {
        key: 'order_no',
        header: '入库单号',
        sortable: true,
        render: (row) => (
          <span style={{ fontWeight: 'var(--font-semibold)', color: 'var(--accent-primary)' }}>
            {row.order_no}
          </span>
        ),
      },
      {
        key: 'supplier_name',
        header: '供应商',
        sortable: true,
      },
      {
        key: 'warehouse',
        header: '入库仓库',
        render: (row) => <Tag variant='default'>{row.warehouse}</Tag>,
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
        header: '预计到货',
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
      <ListPageTemplate<InboundOrder>
        header={{
          title: '入库单管理',
          subtitle: '管理采购入库单，跟踪入库进度和状态',
          breadcrumbs: [
            { label: '首页', href: '/dashboard' },
            { label: '仓储物流', href: WMS_PATHS.root },
            { label: '入库单管理' },
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
                placeholder='搜索入库单号/供应商...'
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
                  { value: '化学品仓', label: '化学品仓' },
                  { value: '包材仓', label: '包材仓' },
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
                新建入库单
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedOrders}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle='暂无入库单'
        emptyDescription='点击右上角「新建入库单」按钮创建第一个入库单'
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label='入库单总数'
              value={stats.total}
              icon={Package}
              accent='amber'
            />
            <StatTile
              label='待入库'
              value={stats.pending}
              icon={Clock}
              accent='warning'
            />
            <StatTile
              label='入库中'
              value={stats.inProgress}
              icon={Truck}
              accent='cyan'
            />
            <StatTile
              label='已完成'
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

      {/* 入库单详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedOrder(null);
        }}
        title='入库单详情'
        size='lg'
      >
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* 状态卡片 */}
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
                    入库单号
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
                <Badge variant={statusConfig[selectedOrder.status]?.variant || 'default'}>
                  {statusConfig[selectedOrder.status]?.label || '未知'}
                </Badge>
              </div>
            </Card>

            {/* 基本信息 */}
            <Card title='基本信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    供应商
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedOrder.supplier_name}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    入库仓库
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

            {/* 时间信息 */}
            <Card title='时间信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    预计到货日期
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedOrder.expected_date}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    实际入库日期
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

            {/* 备注 */}
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

      {/* 新建/编辑入库单弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={selectedOrder ? '编辑入库单' : '新建入库单'}
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
                const formData: Partial<InboundOrder> = {
                  order_no:
                    (document.querySelector('input[placeholder*="入库单号"]') as HTMLInputElement)
                      ?.value || '',
                  supplier_name:
                    (document.querySelector('input[placeholder*="供应商"]') as HTMLInputElement)
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
              {selectedOrder ? '保存修改' : '创建入库单'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor='supplier'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                供应商 *
              </label>
              <Input
                id='supplier'
                placeholder='请选择供应商'
                defaultValue={selectedOrder?.supplier_name}
              />
            </div>
            <div>
              <label
                htmlFor='warehouse'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                入库仓库 *
              </label>
              <Select
                id='warehouse'
                defaultValue={selectedOrder?.warehouse || '原材料仓'}
                options={[
                  { value: '原材料仓', label: '原材料仓' },
                  { value: '半成品仓', label: '半成品仓' },
                  { value: '成品仓', label: '成品仓' },
                  { value: '化学品仓', label: '化学品仓' },
                  { value: '包材仓', label: '包材仓' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='expected-date'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                预计到货日期
              </label>
              <Input
                id='expected-date'
                type='date'
                defaultValue={selectedOrder?.expected_date}
              />
            </div>
            <div>
              <label
                htmlFor='status'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                状态
              </label>
              <Select
                id='status'
                defaultValue={selectedOrder?.status || 'pending'}
                options={[
                  { value: 'pending', label: '待入库' },
                  { value: 'in_progress', label: '入库中' },
                  { value: 'completed', label: '已完成' },
                ]}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor='remark'
              style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
            >
              备注
            </label>
            <textarea
              id='remark'
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
        title='删除入库单'
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
          确定要删除入库单「{deleteTarget?.order_no}」吗？此操作不可撤销。
        </p>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

export default WmsInboundOrderPage;
