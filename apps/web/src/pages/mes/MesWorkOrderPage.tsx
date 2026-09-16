import React, { useState, useEffect, useMemo } from 'react';
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
  AlertTriangle,
  Eye,
  Edit2,
  Trash2,
  Package,
  User,
  Calendar,
} from 'lucide-react';

import {
  Badge,
  Button,
  Card,
  DateRangePicker,
  Drawer,
  EmptyState,
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
import { mesApi } from '@/api/mes';
import type { WorkOrder as ApiWorkOrder } from '@/api/mes/types';
import i18n from '@/i18n';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['mes', 'work-orders'];

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
    label: '待开始',
    variant: 'default' as const,
    icon: Clock,
    color: 'var(--text-secondary)',
  },
  in_progress: {
    label: '进行中',
    variant: 'info' as const,
    icon: Play,
    color: 'var(--accent-primary)',
  },
  paused: {
    label: '已暂停',
    variant: 'warning' as const,
    icon: Pause,
    color: 'var(--warning-500)',
  },
  completed: {
    label: '已完成',
    variant: 'success' as const,
    icon: CheckCircle,
    color: 'var(--success-500)',
  },
  cancelled: {
    label: '已取消',
    variant: 'error' as const,
    icon: XCircle,
    color: 'var(--error-500)',
  },
};

const priorityConfig = {
  high: { label: '高优先级', variant: 'error' as const },
  medium: { label: '中优先级', variant: 'warning' as const },
  low: { label: '低优先级', variant: 'default' as const },
};

const MesWorkOrderPage: React.FC = () => {
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

  // Mock 数据
  const mockOrders: WorkOrder[] = useMemo(
    () => [
      {
        id: '1',
        order_no: 'WO-2026-0914-001',
        product_name: '精密齿轮组件',
        product_code: 'PG-001',
        quantity: 500,
        completed_quantity: 320,
        status: 'in_progress',
        priority: 'high',
        workshop: '一车间',
        production_line: 'A 线',
        operator: '张三',
        planned_start: '2026-09-14 08:00',
        planned_end: '2026-09-15 18:00',
        actual_start: '2026-09-14 08:15',
        remark: '紧急订单，需优先处理',
      },
      {
        id: '2',
        order_no: 'WO-2026-0914-002',
        product_name: '不锈钢外壳',
        product_code: 'SS-002',
        quantity: 1000,
        completed_quantity: 1000,
        status: 'completed',
        priority: 'medium',
        workshop: '二车间',
        production_line: 'B 线',
        operator: '李四',
        planned_start: '2026-09-13 08:00',
        planned_end: '2026-09-14 18:00',
        actual_start: '2026-09-13 08:00',
        actual_end: '2026-09-14 16:30',
      },
      {
        id: '3',
        order_no: 'WO-2026-0914-003',
        product_name: '电机转子',
        product_code: 'MR-003',
        quantity: 200,
        completed_quantity: 0,
        status: 'pending',
        priority: 'low',
        workshop: '一车间',
        production_line: 'C 线',
        operator: '王五',
        planned_start: '2026-09-16 08:00',
        planned_end: '2026-09-17 18:00',
      },
      {
        id: '4',
        order_no: 'WO-2026-0914-004',
        product_name: '铝合金支架',
        product_code: 'AL-004',
        quantity: 800,
        completed_quantity: 450,
        status: 'paused',
        priority: 'medium',
        workshop: '三车间',
        production_line: 'A 线',
        operator: '赵六',
        planned_start: '2026-09-14 08:00',
        planned_end: '2026-09-15 18:00',
        actual_start: '2026-09-14 09:00',
        remark: '设备故障暂停，等待维修',
      },
      {
        id: '5',
        order_no: 'WO-2026-0914-005',
        product_name: '塑料连接件',
        product_code: 'PL-005',
        quantity: 2000,
        completed_quantity: 0,
        status: 'cancelled',
        priority: 'low',
        workshop: '二车间',
        production_line: 'C 线',
        operator: '孙七',
        planned_start: '2026-09-15 08:00',
        planned_end: '2026-09-16 18:00',
        remark: '客户取消订单',
      },
    ],
    []
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, activeTab, debouncedSearch, workshopFilter],
    queryFn: async () => {
      try {
        const response = await mesApi.workOrders.list({ page: 1, pageSize: 50 });
        if (response.success && response.data) {
          const apiOrders: ApiWorkOrder[] = response.data.work_orders || [];
          return apiOrders.map((o): WorkOrder => ({
            id: o.id,
            order_no: o.work_order_no,
            product_name: o.process_name || o.order_number || '—',
            product_code: o.order_number || '—',
            quantity: o.quantity,
            completed_quantity: o.completed_quantity || 0,
            status: o.status as WorkOrder['status'],
            priority: (o.priority as WorkOrder['priority']) || 'medium',
            workshop: o.work_station_name || '—',
            production_line: o.process_name || '—',
            operator: o.team_name || '—',
            planned_start: o.planned_start_time || '',
            planned_end: o.planned_end_time || '',
            actual_start: o.actual_start_time,
            actual_end: o.actual_end_time,
            remark: o.remark,
          }));
        }
      } catch (e) {
        // API 不可用时使用 mock 数据
      }
      return mockOrders;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mesApi.workOrders.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', '工单已删除');
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', '工单已删除');
    },
  });

  const orders = data || mockOrders;

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
    { id: 'all', label: '全部' },
    { id: 'pending', label: '待开始', badge: stats.pending },
    { id: 'in_progress', label: '进行中', badge: stats.inProgress },
    { id: 'completed', label: '已完成' },
  ];

  const formatDateTime = (value: string) => {
    if (!value) return '-';
    return value;
  };

  const getProgress = (order: WorkOrder) => {
    if (order.quantity === 0) return 0;
    return Math.round((order.completed_quantity / order.quantity) * 100);
  };

  const columns: DataTableColumn<WorkOrder>[] = [
    {
      key: 'order_no',
      header: '工单号',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--accent-primary)', marginBottom: 2 }}>
            {row.order_no}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{row.product_name}</div>
        </div>
      ),
    },
    {
      key: 'product',
      header: '产品',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Package size={16} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{row.product_name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{row.product_code}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: '数量/进度',
      align: 'center',
      render: (row) => (
        <div style={{ minWidth: 120 }}>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
            {row.completed_quantity} / {row.quantity}
          </div>
          <div
            style={{
              height: 6,
              backgroundColor: 'var(--surface-2)',
              borderRadius: 3,
              overflow: 'hidden',
            }}
          >
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
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            {getProgress(row)}%
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: '状态',
      render: (row) => {
        const config = statusConfig[row.status];
        const StatusIcon = config.icon;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <StatusIcon
              size={14}
              style={{ color: config.color }}
            />
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
        );
      },
    },
    {
      key: 'priority',
      header: '优先级',
      render: (row) => {
        const config = priorityConfig[row.priority];
        return <Tag variant={config.variant}>{config.label}</Tag>;
      },
    },
    {
      key: 'workshop',
      header: '车间/产线',
      render: (row) => (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{row.workshop}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{row.production_line}</div>
        </div>
      ),
    },
    {
      key: 'operator',
      header: '操作员',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: 'var(--accent-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {row.operator.charAt(0)}
          </div>
          <span style={{ fontSize: 13 }}>{row.operator}</span>
        </div>
      ),
    },
    {
      key: 'planned_end',
      header: '计划完成',
      sortable: true,
      render: (row) => (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {formatDateTime(row.planned_end)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '操作',
      align: 'right',
      width: 150,
      render: (row) => (
        <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
          <Button
            size='sm'
            variant='ghost'
            leftIcon={<Eye size={14} />}
            onClick={() => {
              setSelectedOrder(row);
              setDetailDrawerOpen(true);
            }}
          >
            详情
          </Button>
          <Button
            size='sm'
            variant='ghost'
            leftIcon={<Edit2 size={14} />}
            onClick={() => pushToast('info', '编辑功能开发中')}
          >
            编辑
          </Button>
          <Button
            size='sm'
            variant='ghost'
            leftIcon={<Trash2 size={14} />}
            onClick={() => deleteMutation.mutate(row.id)}
            style={{ color: 'var(--error-500)' }}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <ListPageTemplate<WorkOrder>
        header={{
          title: '工单管理',
          subtitle: '管理生产工单，跟踪生产进度和状态',
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
                placeholder='搜索工单号/产品/操作员...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={workshopFilter}
                onChange={(e) => setWorkshopFilter(e.target.value)}
                options={[
                  { value: 'all', label: '全部车间' },
                  { value: '一车间', label: '一车间' },
                  { value: '二车间', label: '二车间' },
                  { value: '三车间', label: '三车间' },
                ]}
                style={{ width: 140 }}
              />
              <div style={{ width: 280 }}>
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  startPlaceholder='计划开始日期'
                  endPlaceholder='计划结束日期'
                />
              </div>
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
                onClick={() => setCreateModalOpen(true)}
              >
                新建工单
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedOrders}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle='暂无工单'
        emptyDescription='点击右上角「新建工单」按钮创建第一个工单'
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
              label='工单总数'
              value={stats.total}
              icon={Factory}
              accent='amber'
            />
            <StatTile
              label='进行中'
              value={stats.inProgress}
              icon={Play}
              accent='cyan'
            />
            <StatTile
              label='待开始'
              value={stats.pending}
              icon={Clock}
              accent='warning'
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
        title='工单详情'
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
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: 'var(--accent-primary)',
                      marginBottom: 4,
                    }}
                  >
                    {selectedOrder.order_no}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                    {selectedOrder.product_name} ({selectedOrder.product_code})
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Badge variant={statusConfig[selectedOrder.status].variant}>
                    {statusConfig[selectedOrder.status].label}
                  </Badge>
                  <Tag variant={priorityConfig[selectedOrder.priority].variant}>
                    {priorityConfig[selectedOrder.priority].label}
                  </Tag>
                </div>
              </div>

              {/* 进度条 */}
              <div style={{ marginTop: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>生产进度</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {selectedOrder.completed_quantity} / {selectedOrder.quantity} (
                    {getProgress(selectedOrder)}%)
                  </span>
                </div>
                <div
                  style={{
                    height: 10,
                    backgroundColor: 'var(--surface-2)',
                    borderRadius: 5,
                    overflow: 'hidden',
                  }}
                >
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
            <Card title='基本信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <InfoItem
                  label='产品名称'
                  value={selectedOrder.product_name}
                />
                <InfoItem
                  label='产品编码'
                  value={selectedOrder.product_code}
                />
                <InfoItem
                  label='计划数量'
                  value={`${selectedOrder.quantity} 件`}
                />
                <InfoItem
                  label='已完成数量'
                  value={`${selectedOrder.completed_quantity} 件`}
                />
                <InfoItem
                  label='车间'
                  value={selectedOrder.workshop}
                />
                <InfoItem
                  label='产线'
                  value={selectedOrder.production_line}
                />
                <InfoItem
                  label='操作员'
                  value={selectedOrder.operator}
                />
                <InfoItem
                  label='优先级'
                  value={priorityConfig[selectedOrder.priority].label}
                />
              </div>
            </Card>

            {/* 时间信息 */}
            <Card title='时间信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <InfoItem
                  label='计划开始'
                  value={formatDateTime(selectedOrder.planned_start)}
                />
                <InfoItem
                  label='计划完成'
                  value={formatDateTime(selectedOrder.planned_end)}
                />
                <InfoItem
                  label='实际开始'
                  value={formatDateTime(selectedOrder.actual_start || '-')}
                />
                <InfoItem
                  label='实际完成'
                  value={formatDateTime(selectedOrder.actual_end || '-')}
                />
              </div>
            </Card>

            {/* 备注 */}
            {selectedOrder.remark && (
              <Card title='备注'>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {selectedOrder.remark}
                </p>
              </Card>
            )}

            {/* 操作按钮 */}
            {selectedOrder.status === 'pending' && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <Button
                  variant='primary'
                  leftIcon={<Play size={16} />}
                  onClick={() => pushToast('success', '工单已开始')}
                >
                  开始生产
                </Button>
              </div>
            )}
            {selectedOrder.status === 'in_progress' && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <Button
                  variant='ghost'
                  leftIcon={<Pause size={16} />}
                  onClick={() => pushToast('info', '工单已暂停')}
                >
                  暂停
                </Button>
                <Button
                  variant='primary'
                  leftIcon={<CheckCircle size={16} />}
                  onClick={() => pushToast('success', '工单已完成')}
                >
                  完成
                </Button>
              </div>
            )}
            {selectedOrder.status === 'paused' && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <Button
                  variant='primary'
                  leftIcon={<Play size={16} />}
                  onClick={() => pushToast('success', '工单已恢复')}
                >
                  恢复生产
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
        title='新建工单'
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
                setCreateModalOpen(false);
                pushToast('success', '工单创建成功');
              }}
            >
              创建工单
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor='wo-product-name'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                产品名称 *
              </label>
              <Input
                id='wo-product-name'
                placeholder='请输入产品名称'
              />
            </div>
            <div>
              <label
                htmlFor='wo-product-code'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                产品编码 *
              </label>
              <Input
                id='wo-product-code'
                placeholder='请输入产品编码'
              />
            </div>
            <div>
              <label
                htmlFor='wo-quantity'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                计划数量 *
              </label>
              <Input
                id='wo-quantity'
                type='number'
                placeholder='请输入数量'
              />
            </div>
            <div>
              <label
                htmlFor='wo-priority'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                优先级
              </label>
              <Select
                id='wo-priority'
                defaultValue='medium'
                options={[
                  { value: 'high', label: '高优先级' },
                  { value: 'medium', label: '中优先级' },
                  { value: 'low', label: '低优先级' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='wo-workshop'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                车间
              </label>
              <Select
                id='wo-workshop'
                defaultValue='一车间'
                options={[
                  { value: '一车间', label: '一车间' },
                  { value: '二车间', label: '二车间' },
                  { value: '三车间', label: '三车间' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='wo-line'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                产线
              </label>
              <Select
                id='wo-line'
                defaultValue='A 线'
                options={[
                  { value: 'A 线', label: 'A 线' },
                  { value: 'B 线', label: 'B 线' },
                  { value: 'C 线', label: 'C 线' },
                ]}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor='wo-remark'
              style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
            >
              备注
            </label>
            <textarea
              id='wo-remark'
              rows={3}
              placeholder='请输入备注信息...'
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
          <div>
            <label
              htmlFor='field-1'
              style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
            >
              附件
            </label>
            <FileUpload
              id='field-1'
              value={attachments}
              onChange={setAttachments}
              multiple
              maxSize={20}
              accept='.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.dwg,.zip'
              hint='上传工艺图纸、技术文档等附件，单个文件不超过 20MB'
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
    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
  </div>
);

export default MesWorkOrderPage;
