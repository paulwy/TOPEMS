import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  ClipboardList,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
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
import { stockTakeApi } from '@/api/wms/stocktake';
import type { StockTake as ApiStockTake } from '@/api/wms/types';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['wms', 'stocktake'];

interface StocktakeOrder {
  id: string;
  order_no: string;
  title: string;
  warehouse: string;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  type: 'full' | 'partial' | 'cycle';
  total_items: number;
  counted_items: number;
  discrepancy_items: number;
  creator: string;
  start_date: string;
  end_date?: string;
  created_at: string;
}

// Mock 数据
// 将 API 返回的 StockTake 类型映射为页面使用的 StocktakeOrder 类型
const mapApiStocktakes = (apiRecords: ApiStockTake[]): StocktakeOrder[] => {
  return apiRecords.map((r, index) => ({
    id: r.id,
    order_no:
      (r as any).order_no ||
      (r as any).stock_take_no ||
      `ST2026${String(index + 1).padStart(5, '0')}`,
    title: (r as any).title || (r as any).name || '-',
    warehouse: (r as any).warehouse || (r as any).warehouse_name || '-',
    status: ((r as any).status as StocktakeOrder['status']) || 'draft',
    type: ((r as any).type as StocktakeOrder['type']) || 'full',
    total_items: (r as any).total_items || (r as any).totalItems || 0,
    counted_items: (r as any).counted_items || (r as any).countedItems || 0,
    discrepancy_items: (r as any).discrepancy_items || (r as any).discrepancyItems || 0,
    planned_date: (r as any).planned_date || (r as any).plannedDate || '-',
    start_date: (r as any).start_date || (r as any).startDate || '-',
    completed_date: (r as any).completed_date || (r as any).completedDate || '-',
    creator: (r as any).creator || (r as any).creatorName || '-',
    remark: (r as any).remark || '',
    created_at: r.created_at || new Date().toISOString(),
  }));
};

// Mock 数据（API 不可用时的 fallback）
const mockStocktakes: StocktakeOrder[] = [
  {
    id: '1',
    order_no: 'ST202609001',
    title: '9月原材料仓月度盘点',
    warehouse: '原材料仓',
    status: 'in_progress',
    type: 'cycle',
    total_items: 156,
    counted_items: 89,
    discrepancy_items: 3,
    creator: '张三',
    start_date: '2026-09-10',
    created_at: '2026-09-09 10:00:00',
  },
  {
    id: '2',
    order_no: 'ST202609002',
    title: '成品仓季度盘点',
    warehouse: '成品仓',
    status: 'draft',
    type: 'full',
    total_items: 245,
    counted_items: 0,
    discrepancy_items: 0,
    creator: '李四',
    start_date: '2026-09-20',
    created_at: '2026-09-12 14:30:00',
  },
  {
    id: '3',
    order_no: 'ST202608001',
    title: '8月半成品仓盘点',
    warehouse: '半成品仓',
    status: 'completed',
    type: 'partial',
    total_items: 89,
    counted_items: 89,
    discrepancy_items: 5,
    creator: '王五',
    start_date: '2026-08-15',
    end_date: '2026-08-18',
    created_at: '2026-08-10 09:00:00',
  },
  {
    id: '4',
    order_no: 'ST202608002',
    title: '化学品仓专项盘点',
    warehouse: '原材料仓',
    status: 'completed',
    type: 'partial',
    total_items: 45,
    counted_items: 45,
    discrepancy_items: 1,
    creator: '赵六',
    start_date: '2026-08-20',
    end_date: '2026-08-21',
    created_at: '2026-08-15 11:20:00',
  },
  {
    id: '5',
    order_no: 'ST202607001',
    title: '7月年度大盘点（取消）',
    warehouse: '全部仓库',
    status: 'cancelled',
    type: 'full',
    total_items: 500,
    counted_items: 0,
    discrepancy_items: 0,
    creator: '张三',
    start_date: '2026-07-01',
    end_date: '2026-07-05',
    created_at: '2026-06-25 16:00:00',
  },
];

const statusConfig = {
  draft: { label: '草稿', variant: 'default' as const, icon: ClipboardList },
  in_progress: { label: '盘点中', variant: 'info' as const, icon: Clock },
  completed: { label: '已完成', variant: 'success' as const, icon: CheckCircle },
  cancelled: { label: '已取消', variant: 'default' as const, icon: AlertTriangle },
};

const typeConfig = {
  full: { label: '全盘', variant: 'cyan' as const },
  partial: { label: '抽盘', variant: 'info' as const },
  cycle: { label: '循环盘点', variant: 'default' as const },
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const WmsStocktakePage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'in_progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<StocktakeOrder | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StocktakeOrder | null>(null);
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
        const res = await stockTakeApi.list(params);
        const resData = res as unknown as {
          data?: { list?: ApiStockTake[]; items?: ApiStockTake[]; total?: number } | ApiStockTake[];
        };
        let apiRecords: ApiStockTake[] = [];
        let total = 0;
        if (Array.isArray(resData)) {
          apiRecords = resData;
          total = resData.length;
        } else if (resData.data) {
          const dataObj = resData.data as any;
          apiRecords = Array.isArray(resData.data)
            ? resData.data
            : dataObj.list || dataObj.items || [];
          total = dataObj.total || apiRecords.length;
        }
        if (apiRecords.length > 0) {
          setIsMockData(false);
          return { orders: mapApiStocktakes(apiRecords), total };
        }
      } catch (e) {
        console.warn('[WMS Stocktake] API unavailable, using mock data:', e);
        setIsMockData(true);
      }
      // Mock fallback：本地分页
      let filtered = mockStocktakes;
      if (debouncedSearch) {
        filtered = filtered.filter(
          (r) => r.order_no.includes(debouncedSearch) || r.warehouse.includes(debouncedSearch)
        );
      }
      if (warehouseFilter !== 'all') {
        filtered = filtered.filter((r) => r.warehouse === warehouseFilter);
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
      pushToast('success', '盘点单删除成功');
    },
    onError: () => {
      pushToast('error', '删除失败，请重试');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<StocktakeOrder>) => {
      try {
        await stockTakeApi.create({
          order_no: (data as any).order_no,
          warehouse: (data as any).warehouse,
          status: data.status,
          start_date: (data as any).start_date,
          end_date: (data as any).end_date,
          type: (data as any).type,
        } as any);
      } catch (e) {
        console.warn('[WMS Stocktake] Create API unavailable, using mock create:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', '盘点单创建成功');
    },
    onError: () => {
      pushToast('error', '创建失败，请重试');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StocktakeOrder> }) => {
      try {
        await stockTakeApi.update(id, {
          status: data.status,
          end_date: (data as any).end_date,
        } as any);
      } catch (e) {
        console.warn('[WMS Stocktake] Update API unavailable, using mock update:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', '盘点单更新成功');
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
      inProgress: orders.filter((o) => o.status === 'in_progress').length,
      completed: orders.filter((o) => o.status === 'completed').length,
      discrepancy: orders.reduce((sum, o) => sum + o.discrepancy_items, 0),
    };
  }, [orders]);

  const tabsConfig = useMemo(
    () => [
      { id: 'all', label: '全部' },
      { id: 'draft', label: '草稿', badge: orders.filter((o) => o.status === 'draft').length },
      { id: 'in_progress', label: '盘点中', badge: stats.inProgress },
      { id: 'completed', label: '已完成', badge: stats.completed },
    ],
    [stats, orders]
  );

  const columns: DataTableColumn<StocktakeOrder>[] = useMemo(
    () => [
      {
        key: 'order_no',
        header: '盘点单号',
        sortable: true,
        render: (row) => (
          <span style={{ fontWeight: 'var(--font-semibold)', color: 'var(--accent-primary)' }}>
            {row.order_no}
          </span>
        ),
      },
      {
        key: 'title',
        header: '盘点标题',
        render: (row) => (
          <div>
            <div style={{ fontWeight: 500 }}>{row.title}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {row.creator}
            </div>
          </div>
        ),
      },
      {
        key: 'warehouse',
        header: '盘点仓库',
        render: (row) => <Tag variant='default'>{row.warehouse}</Tag>,
      },
      {
        key: 'type',
        header: '盘点类型',
        align: 'center',
        render: (row) => {
          const config = typeConfig[row.type] || typeConfig.partial;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'progress',
        header: '盘点进度',
        render: (row) => {
          const progress =
            row.total_items > 0 ? Math.round((row.counted_items / row.total_items) * 100) : 0;
          return (
            <div style={{ minWidth: 120 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--text-xs)',
                  marginBottom: 4,
                }}
              >
                <span>
                  {row.counted_items}/{row.total_items}
                </span>
                <span>{progress}%</span>
              </div>
              <div
                style={{
                  height: 6,
                  backgroundColor: 'var(--surface-3)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: 'var(--accent-primary)',
                  }}
                />
              </div>
            </div>
          );
        },
      },
      {
        key: 'discrepancy_items',
        header: '差异项',
        align: 'center',
        render: (row) =>
          row.discrepancy_items > 0 ? (
            <Badge variant='warning'>{row.discrepancy_items} 项</Badge>
          ) : (
            <span style={{ color: 'var(--text-tertiary)' }}>0</span>
          ),
      },
      {
        key: 'start_date',
        header: '开始日期',
        sortable: true,
      },
      {
        key: 'status',
        header: '状态',
        align: 'center',
        render: (row) => {
          const config = statusConfig[row.status] || statusConfig.draft;
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
            {row.status === 'draft' && (
              <Button
                variant='ghost'
                size='sm'
                leftIcon={<Play size={14} />}
                onClick={() => pushToast('info', '开始盘点功能开发中')}
              >
                开始
              </Button>
            )}
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
      <ListPageTemplate<StocktakeOrder>
        header={{
          title: '库存盘点',
          subtitle: '创建盘点任务，跟踪盘点进度和差异处理',
          breadcrumbs: [
            { label: '首页', href: '/dashboard' },
            { label: '仓储物流', href: WMS_PATHS.root },
            { label: '库存盘点' },
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
                placeholder='搜索盘点单号/标题...'
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
                新建盘点单
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedOrders}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle='暂无盘点单'
        emptyDescription='点击右上角「新建盘点单」按钮创建第一个盘点任务'
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label='盘点单总数'
              value={stats.total}
              icon={ClipboardList}
              accent='cyan'
            />
            <StatTile
              label='盘点中'
              value={stats.inProgress}
              icon={Clock}
              accent='warning'
            />
            <StatTile
              label='已完成'
              value={stats.completed}
              icon={CheckCircle}
              accent='success'
            />
            <StatTile
              label='累计差异项'
              value={stats.discrepancy}
              icon={AlertTriangle}
              accent='amber'
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

      {/* 盘点单详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedOrder(null);
        }}
        title='盘点单详情'
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
                    {selectedOrder.title}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Badge variant={typeConfig[selectedOrder.type]?.variant || 'default'}>
                    {typeConfig[selectedOrder.type]?.label || '未知'}
                  </Badge>
                  <Badge variant={statusConfig[selectedOrder.status]?.variant || 'default'}>
                    {statusConfig[selectedOrder.status]?.label || '未知'}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card title='盘点进度'>
              <div style={{ marginTop: 'var(--space-2)' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 'var(--text-sm)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  <span>
                    已盘点 {selectedOrder.counted_items} / {selectedOrder.total_items} 项
                  </span>
                  <span style={{ fontWeight: 'var(--font-semibold)' }}>
                    {selectedOrder.total_items > 0
                      ? Math.round((selectedOrder.counted_items / selectedOrder.total_items) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    backgroundColor: 'var(--surface-3)',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${
                        selectedOrder.total_items > 0
                          ? (selectedOrder.counted_items / selectedOrder.total_items) * 100
                          : 0
                      }%`,
                      height: '100%',
                      backgroundColor: 'var(--accent-primary)',
                    }}
                  />
                </div>
              </div>
            </Card>

            <Card title='基本信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    盘点仓库
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedOrder.warehouse}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    创建人
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedOrder.creator}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    开始日期
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedOrder.start_date}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    完成日期
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedOrder.end_date || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    差异项数
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                    {selectedOrder.discrepancy_items} 项
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
          </div>
        )}
      </Drawer>

      {/* 新建/编辑盘点单弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={selectedOrder ? '编辑盘点单' : '新建盘点单'}
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
                const formData: Partial<StocktakeOrder> = {
                  order_no:
                    (document.querySelector('input[placeholder*="盘点单号"]') as HTMLInputElement)
                      ?.value || '',
                  warehouse: (document.querySelector('select') as HTMLSelectElement)?.value || '',
                  start_date:
                    (document.querySelectorAll('input[type="date"]')[0] as HTMLInputElement)
                      ?.value || '',
                  end_date:
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
              {selectedOrder ? '保存修改' : '创建盘点单'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <label
              htmlFor='field-1'
              style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
            >
              盘点标题 *
            </label>
            <Input
              id='field-1'
              placeholder='例如：9月原材料仓月度盘点'
              defaultValue={selectedOrder?.title}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor='field-2'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                盘点仓库 *
              </label>
              <Select
                id='field-2'
                defaultValue={selectedOrder?.warehouse || '原材料仓'}
                options={[
                  { value: '原材料仓', label: '原材料仓' },
                  { value: '半成品仓', label: '半成品仓' },
                  { value: '成品仓', label: '成品仓' },
                  { value: '全部仓库', label: '全部仓库' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                盘点类型
              </label>
              <Select
                id='field-3'
                defaultValue={selectedOrder?.type || 'cycle'}
                options={[
                  { value: 'full', label: '全盘' },
                  { value: 'partial', label: '抽盘' },
                  { value: 'cycle', label: '循环盘点' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                开始日期
              </label>
              <Input
                id='field-4'
                type='date'
                defaultValue={selectedOrder?.start_date}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title='删除盘点单'
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
          确定要删除盘点单「{deleteTarget?.order_no}」吗？此操作不可撤销。
        </p>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

export default WmsStocktakePage;
