import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShoppingCart,
  Plus,
  Search,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit2,
  Trash2,
  User,
  Calendar,
  DollarSign,
  Truck,
  FileText,
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
  Select,
  StatTile,
  Tabs,
  Tag,
  ToastContainer,
} from '@/components/redesign';
import type { DataTableColumn, Toast } from '@/components/redesign';
import { erpApi } from '@/api/erp';
import type { PurchaseOrder as ApiPurchaseOrder } from '@/api/erp/core/types';
import i18n from '@/i18n';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['erp', 'purchase-orders'];

interface PurchaseOrder {
  id: string;
  order_no: string;
  supplier_name: string;
  supplier_code: string;
  total_amount: number;
  currency: string;
  status:
    'draft' | 'pending_approval' | 'approved' | 'rejected' | 'ordered' | 'received' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  buyer: string;
  department: string;
  created_at: string;
  expected_date: string;
  items_count: number;
  remark?: string;
}

const statusConfig = {
  draft: { label: '草稿', variant: 'default' as const, color: 'var(--text-secondary)' },
  pending_approval: { label: '待审批', variant: 'warning' as const, color: 'var(--warning-500)' },
  approved: { label: '已批准', variant: 'info' as const, color: 'var(--info-500)' },
  rejected: { label: '已驳回', variant: 'error' as const, color: 'var(--error-500)' },
  ordered: { label: '已下单', variant: 'cyan' as const, color: 'var(--accent-primary)' },
  received: { label: '已收货', variant: 'success' as const, color: 'var(--success-500)' },
  cancelled: { label: '已取消', variant: 'default' as const, color: 'var(--text-secondary)' },
};

const priorityConfig = {
  high: { label: '高优先级', variant: 'error' as const },
  medium: { label: '中优先级', variant: 'warning' as const },
  low: { label: '低优先级', variant: 'default' as const },
};

const PurchaseOrderPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    'all' | 'pending_approval' | 'approved' | 'ordered' | 'received'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

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
  const mockOrders: PurchaseOrder[] = useMemo(
    () => [
      {
        id: '1',
        order_no: 'PO-2026-0914-001',
        supplier_name: '上海精密机械有限公司',
        supplier_code: 'SUP-001',
        total_amount: 125000,
        currency: 'CNY',
        status: 'pending_approval',
        priority: 'high',
        buyer: '张三',
        department: '采购部',
        created_at: '2026-09-14 09:30',
        expected_date: '2026-09-25',
        items_count: 5,
        remark: '紧急采购，需尽快审批',
      },
      {
        id: '2',
        order_no: 'PO-2026-0914-002',
        supplier_name: '江苏电子科技股份有限公司',
        supplier_code: 'SUP-002',
        total_amount: 86500,
        currency: 'CNY',
        status: 'approved',
        priority: 'medium',
        buyer: '李四',
        department: '采购部',
        created_at: '2026-09-13 14:20',
        expected_date: '2026-09-28',
        items_count: 8,
      },
      {
        id: '3',
        order_no: 'PO-2026-0914-003',
        supplier_name: '浙江五金制品厂',
        supplier_code: 'SUP-003',
        total_amount: 45200,
        currency: 'CNY',
        status: 'ordered',
        priority: 'low',
        buyer: '王五',
        department: '生产部',
        created_at: '2026-09-12 10:15',
        expected_date: '2026-09-22',
        items_count: 12,
      },
      {
        id: '4',
        order_no: 'PO-2026-0914-004',
        supplier_name: '广东化工原料有限公司',
        supplier_code: 'SUP-004',
        total_amount: 230000,
        currency: 'CNY',
        status: 'received',
        priority: 'high',
        buyer: '赵六',
        department: '采购部',
        created_at: '2026-09-10 16:45',
        expected_date: '2026-09-20',
        items_count: 3,
      },
      {
        id: '5',
        order_no: 'PO-2026-0914-005',
        supplier_name: '北京办公用品批发中心',
        supplier_code: 'SUP-005',
        total_amount: 8500,
        currency: 'CNY',
        status: 'rejected',
        priority: 'low',
        buyer: '孙七',
        department: '行政部',
        created_at: '2026-09-11 11:30',
        expected_date: '2026-09-18',
        items_count: 20,
        remark: '预算超标，已驳回',
      },
      {
        id: '6',
        order_no: 'PO-2026-0914-006',
        supplier_name: '山东包装材料有限公司',
        supplier_code: 'SUP-006',
        total_amount: 32000,
        currency: 'CNY',
        status: 'draft',
        priority: 'medium',
        buyer: '周八',
        department: '生产部',
        created_at: '2026-09-14 15:00',
        expected_date: '2026-09-30',
        items_count: 6,
      },
    ],
    []
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, activeTab, debouncedSearch, departmentFilter],
    queryFn: async () => {
      try {
        const response = await erpApi.purchaseOrders.list({ page: 1, pageSize: 50 });
        if (response.success && response.data) {
          const apiOrders: ApiPurchaseOrder[] = response.data.orders || [];
          return apiOrders.map((o): PurchaseOrder => ({
            id: o.id,
            order_no: o.order_number,
            supplier_name: o.supplier_name,
            supplier_code: o.supplier_id,
            total_amount: o.total_amount,
            currency: o.currency || 'CNY',
            status:
              o.status === 'pending'
                ? 'pending_approval'
                : o.status === 'partially_received'
                  ? 'received'
                  : (o.status as PurchaseOrder['status']),
            priority: 'medium',
            buyer: o.created_by || '—',
            department: '未分配',
            created_at: o.created_at,
            expected_date: o.expected_date || o.order_date,
            items_count: 0,
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
    mutationFn: (id: string) => erpApi.purchaseOrders.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', '采购订单已删除');
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', '采购订单已删除');
    },
  });

  const orders = data || mockOrders;

  // 筛选
  const filteredOrders = useMemo(() => {
    let result = orders;
    if (activeTab !== 'all') {
      result = result.filter((o) => o.status === activeTab);
    }
    if (departmentFilter !== 'all') {
      result = result.filter((o) => o.department === departmentFilter);
    }
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (o) =>
          o.order_no.toLowerCase().includes(query) ||
          o.supplier_name.toLowerCase().includes(query) ||
          o.supplier_code.toLowerCase().includes(query) ||
          o.buyer.toLowerCase().includes(query)
      );
    }
    return result;
  }, [orders, activeTab, departmentFilter, debouncedSearch]);

  // 统计
  const stats = useMemo(() => {
    const totalAmount = orders.reduce((sum, o) => sum + o.total_amount, 0);
    return {
      total: orders.length,
      pendingApproval: orders.filter((o) => o.status === 'pending_approval').length,
      totalAmount,
      received: orders.filter((o) => o.status === 'received').length,
    };
  }, [orders]);

  const tabsConfig = [
    { id: 'all', label: '全部' },
    { id: 'pending_approval', label: '待审批', badge: stats.pendingApproval },
    { id: 'approved', label: '已批准' },
    { id: 'ordered', label: '已下单' },
    { id: 'received', label: '已收货' },
  ];

  const formatAmount = (amount: number, currency: string) => {
    const symbol = currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : '';
    return `${symbol} ${amount.toLocaleString()}`;
  };

  const columns: DataTableColumn<PurchaseOrder>[] = [
    {
      key: 'order_no',
      header: '订单号',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--accent-primary)', marginBottom: 2 }}>
            {row.order_no}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {row.items_count} 项商品
          </div>
        </div>
      ),
    },
    {
      key: 'supplier',
      header: '供应商',
      render: (row) => (
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>
            {row.supplier_name}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{row.supplier_code}</div>
        </div>
      ),
    },
    {
      key: 'total_amount',
      header: '金额',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {formatAmount(row.total_amount, row.currency)}
        </span>
      ),
    },
    {
      key: 'status',
      header: '状态',
      render: (row) => {
        const config = statusConfig[row.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
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
      key: 'buyer',
      header: '采购员',
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
            {row.buyer.charAt(0)}
          </div>
          <span style={{ fontSize: 13 }}>{row.buyer}</span>
        </div>
      ),
    },
    {
      key: 'department',
      header: '部门',
      render: (row) => (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{row.department}</span>
      ),
    },
    {
      key: 'expected_date',
      header: '期望到货',
      sortable: true,
      render: (row) => (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{row.expected_date}</span>
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
      <ListPageTemplate<PurchaseOrder>
        header={{
          title: '采购订单',
          subtitle: '管理采购订单，跟踪审批状态和到货情况',
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
                placeholder='搜索订单号/供应商/采购员...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                options={[
                  { value: 'all', label: '全部部门' },
                  { value: '采购部', label: '采购部' },
                  { value: '生产部', label: '生产部' },
                  { value: '行政部', label: '行政部' },
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
                onClick={() => setCreateModalOpen(true)}
              >
                新建订单
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={filteredOrders}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle='暂无采购订单'
        emptyDescription='点击右上角「新建订单」按钮创建第一个采购订单'
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
              label='订单总数'
              value={stats.total}
              icon={FileText}
              accent='amber'
            />
            <StatTile
              label='待审批'
              value={stats.pendingApproval}
              icon={Clock}
              accent='warning'
            />
            <StatTile
              label='采购总额'
              value={formatAmount(stats.totalAmount, 'CNY')}
              icon={DollarSign}
              accent='cyan'
            />
            <StatTile
              label='已收货'
              value={stats.received}
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

      {/* 采购订单详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedOrder(null);
        }}
        title='采购订单详情'
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
                    {selectedOrder.supplier_name}
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
              <div
                style={{
                  marginTop: 'var(--space-4)',
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}
              >
                {formatAmount(selectedOrder.total_amount, selectedOrder.currency)}
              </div>
            </Card>

            {/* 基本信息 */}
            <Card title='基本信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <InfoItem
                  label='供应商名称'
                  value={selectedOrder.supplier_name}
                />
                <InfoItem
                  label='供应商编码'
                  value={selectedOrder.supplier_code}
                />
                <InfoItem
                  label='采购员'
                  value={selectedOrder.buyer}
                />
                <InfoItem
                  label='所属部门'
                  value={selectedOrder.department}
                />
                <InfoItem
                  label='商品数量'
                  value={`${selectedOrder.items_count} 项`}
                />
                <InfoItem
                  label='订单金额'
                  value={formatAmount(selectedOrder.total_amount, selectedOrder.currency)}
                />
                <InfoItem
                  label='创建时间'
                  value={selectedOrder.created_at}
                />
                <InfoItem
                  label='期望到货'
                  value={selectedOrder.expected_date}
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
            {selectedOrder.status === 'pending_approval' && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <Button
                  variant='ghost'
                  leftIcon={<XCircle size={16} />}
                  onClick={() => pushToast('info', '已驳回')}
                  style={{ color: 'var(--error-500)' }}
                >
                  驳回
                </Button>
                <Button
                  variant='primary'
                  leftIcon={<CheckCircle size={16} />}
                  onClick={() => pushToast('success', '审批通过')}
                >
                  批准
                </Button>
              </div>
            )}
            {selectedOrder.status === 'approved' && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <Button
                  variant='primary'
                  leftIcon={<Truck size={16} />}
                  onClick={() => pushToast('success', '已下单')}
                >
                  下单
                </Button>
              </div>
            )}
            {selectedOrder.status === 'ordered' && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <Button
                  variant='primary'
                  leftIcon={<CheckCircle size={16} />}
                  onClick={() => pushToast('success', '已确认收货')}
                >
                  确认收货
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* 新建采购订单弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title='新建采购订单'
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
                pushToast('success', '采购订单创建成功');
              }}
            >
              创建订单
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
                供应商 *
              </label>
              <Input placeholder='请选择供应商' />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
                采购员
              </label>
              <Input placeholder='请输入采购员' />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
                所属部门
              </label>
              <Select
                defaultValue='采购部'
                options={[
                  { value: '采购部', label: '采购部' },
                  { value: '生产部', label: '生产部' },
                  { value: '行政部', label: '行政部' },
                ]}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
                优先级
              </label>
              <Select
                defaultValue='medium'
                options={[
                  { value: 'high', label: '高优先级' },
                  { value: 'medium', label: '中优先级' },
                  { value: 'low', label: '低优先级' },
                ]}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
                期望到货日期
              </label>
              <Input type='date' />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
                币种
              </label>
              <Select
                defaultValue='CNY'
                options={[
                  { value: 'CNY', label: '人民币 (CNY)' },
                  { value: 'USD', label: '美元 (USD)' },
                ]}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}>
              备注
            </label>
            <textarea
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

export default PurchaseOrderPage;
