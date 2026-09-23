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
import type { DataTableColumn, Toast, UploadFile } from '@/components/redesign';
import { erpApi } from '@/api/erp';
import type { PurchaseOrder as ApiPurchaseOrder } from '@/api/erp/core/types';
import { useTranslation } from 'react-i18next';

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

const PurchaseOrderPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const statusConfig = useMemo(
    () => ({
      draft: {
        label: t('erp.purchase_order.status.draft'),
        variant: 'default' as const,
        color: 'var(--text-secondary)',
      },
      pending_approval: {
        label: t('erp.purchase_order.status.pending_approval'),
        variant: 'warning' as const,
        color: 'var(--warning-500)',
      },
      approved: {
        label: t('erp.purchase_order.status.approved'),
        variant: 'info' as const,
        color: 'var(--info-500)',
      },
      rejected: {
        label: t('erp.purchase_order.status.rejected'),
        variant: 'error' as const,
        color: 'var(--error-500)',
      },
      ordered: {
        label: t('erp.purchase_order.status.ordered'),
        variant: 'cyan' as const,
        color: 'var(--accent-primary)',
      },
      received: {
        label: t('erp.purchase_order.status.received'),
        variant: 'success' as const,
        color: 'var(--success-500)',
      },
      cancelled: {
        label: t('erp.purchase_order.status.cancelled'),
        variant: 'default' as const,
        color: 'var(--text-secondary)',
      },
    }),
    [t]
  );

  const priorityConfig = useMemo(
    () => ({
      high: { label: t('erp.purchase_order.priority.high'), variant: 'error' as const },
      medium: { label: t('erp.purchase_order.priority.medium'), variant: 'warning' as const },
      low: { label: t('erp.purchase_order.priority.low'), variant: 'default' as const },
    }),
    [t]
  );

  const [activeTab, setActiveTab] = useState<
    'all' | 'pending_approval' | 'approved' | 'ordered' | 'received'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
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
  const mockOrders: PurchaseOrder[] = useMemo(
    () => [
      {
        id: '1',
        order_no: 'PO-2026-0914-001',
        supplier_name: t('erp.demo.supplier_precision'),
        supplier_code: 'SUP-001',
        total_amount: 125000,
        currency: 'CNY',
        status: 'pending_approval',
        priority: 'high',
        buyer: t('erp.demo.owner_zhang'),
        department: t('erp.purchase_order.department.purchase'),
        created_at: '2026-09-14 09:30',
        expected_date: '2026-09-25',
        items_count: 5,
        remark: t('erp.demo.remark_urgent'),
      },
      {
        id: '2',
        order_no: 'PO-2026-0914-002',
        supplier_name: t('erp.demo.supplier_jiangsu'),
        supplier_code: 'SUP-002',
        total_amount: 86500,
        currency: 'CNY',
        status: 'approved',
        priority: 'medium',
        buyer: t('erp.demo.owner_li'),
        department: t('erp.purchase_order.department.purchase'),
        created_at: '2026-09-13 14:20',
        expected_date: '2026-09-28',
        items_count: 8,
      },
      {
        id: '3',
        order_no: 'PO-2026-0914-003',
        supplier_name: t('erp.demo.supplier_zhejiang'),
        supplier_code: 'SUP-003',
        total_amount: 45200,
        currency: 'CNY',
        status: 'ordered',
        priority: 'low',
        buyer: t('erp.demo.owner_wang'),
        department: t('erp.purchase_order.department.production'),
        created_at: '2026-09-12 10:15',
        expected_date: '2026-09-22',
        items_count: 12,
      },
      {
        id: '4',
        order_no: 'PO-2026-0914-004',
        supplier_name: t('erp.demo.supplier_guangdong'),
        supplier_code: 'SUP-004',
        total_amount: 230000,
        currency: 'CNY',
        status: 'received',
        priority: 'high',
        buyer: t('erp.demo.buyer_zhao'),
        department: t('erp.purchase_order.department.purchase'),
        created_at: '2026-09-10 16:45',
        expected_date: '2026-09-20',
        items_count: 3,
      },
      {
        id: '5',
        order_no: 'PO-2026-0914-005',
        supplier_name: t('erp.demo.supplier_beijing'),
        supplier_code: 'SUP-005',
        total_amount: 8500,
        currency: 'CNY',
        status: 'rejected',
        priority: 'low',
        buyer: t('erp.demo.buyer_sun'),
        department: t('erp.purchase_order.department.admin'),
        created_at: '2026-09-11 11:30',
        expected_date: '2026-09-18',
        items_count: 20,
        remark: t('erp.demo.remark_overbudget'),
      },
      {
        id: '6',
        order_no: 'PO-2026-0914-006',
        supplier_name: t('erp.demo.supplier_shandong'),
        supplier_code: 'SUP-006',
        total_amount: 32000,
        currency: 'CNY',
        status: 'draft',
        priority: 'medium',
        buyer: t('erp.demo.buyer_zhou'),
        department: t('erp.purchase_order.department.production'),
        created_at: '2026-09-14 15:00',
        expected_date: '2026-09-30',
        items_count: 6,
      },
    ],
    [t]
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
            department: t('erp.purchase_order.department.unassigned'),
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
      pushToast('success', t('erp.purchase_order.toast.deleted'));
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', t('erp.purchase_order.toast.deleted'));
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

  // 分页数据计算
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const pagedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 筛选变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, departmentFilter, debouncedSearch]);

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
    { id: 'all', label: t('erp.purchase_order.tab.all') },
    {
      id: 'pending_approval',
      label: t('erp.purchase_order.tab.pending_approval'),
      badge: stats.pendingApproval,
    },
    { id: 'approved', label: t('erp.purchase_order.tab.approved') },
    { id: 'ordered', label: t('erp.purchase_order.tab.ordered') },
    { id: 'received', label: t('erp.purchase_order.tab.received') },
  ];

  const formatAmount = (amount: number, currency: string) => {
    const symbol = currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : '';
    return `${symbol} ${amount.toLocaleString()}`;
  };

  const columns: DataTableColumn<PurchaseOrder>[] = [
    {
      key: 'order_no',
      header: t('erp.purchase_order.column.order_no'),
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--accent-primary)', marginBottom: 2 }}>
            {row.order_no}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {row.items_count} {t('erp.purchase_order.column.items_count_unit')}
          </div>
        </div>
      ),
    },
    {
      key: 'supplier',
      header: t('erp.purchase_order.column.supplier'),
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
      header: t('erp.purchase_order.column.amount'),
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
      header: t('erp.purchase_order.column.status'),
      render: (row) => {
        const config = statusConfig[row.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      key: 'priority',
      header: t('erp.purchase_order.column.priority'),
      render: (row) => {
        const config = priorityConfig[row.priority];
        return <Tag variant={config.variant}>{config.label}</Tag>;
      },
    },
    {
      key: 'buyer',
      header: t('erp.purchase_order.column.buyer'),
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
      header: t('erp.purchase_order.column.department'),
      render: (row) => (
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{row.department}</span>
      ),
    },
    {
      key: 'expected_date',
      header: t('erp.purchase_order.column.expected_date'),
      sortable: true,
      render: (row) => (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{row.expected_date}</span>
      ),
    },
    {
      key: 'actions',
      header: t('erp.purchase_order.column.actions'),
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
            {t('erp.purchase_order.action.detail')}
          </Button>
          <Button
            size='sm'
            variant='ghost'
            leftIcon={<Edit2 size={14} />}
            onClick={() => pushToast('info', t('erp.purchase_order.toast.edit_in_progress'))}
          >
            {t('erp.purchase_order.action.edit')}
          </Button>
          <Button
            size='sm'
            variant='ghost'
            leftIcon={<Trash2 size={14} />}
            onClick={() => deleteMutation.mutate(row.id)}
            style={{ color: 'var(--error-500)' }}
          >
            {t('erp.purchase_order.action.delete')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <ListPageTemplate<PurchaseOrder>
        header={{
          title: t('erp.purchase_order.title'),
          subtitle: t('erp.purchase_order.subtitle'),
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
                placeholder={t('erp.purchase_order.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                options={[
                  { value: 'all', label: t('erp.purchase_order.filter.all_departments') },
                  {
                    value: t('erp.purchase_order.department.purchase'),
                    label: t('erp.purchase_order.department.purchase'),
                  },
                  {
                    value: t('erp.purchase_order.department.production'),
                    label: t('erp.purchase_order.department.production'),
                  },
                  {
                    value: t('erp.purchase_order.department.admin'),
                    label: t('erp.purchase_order.department.admin'),
                  },
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
                {t('erp.purchase_order.button.refresh')}
              </Button>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={() => setCreateModalOpen(true)}
              >
                {t('erp.purchase_order.button.create')}
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedOrders}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle={t('erp.purchase_order.empty.title')}
        emptyDescription={t('erp.purchase_order.empty.description')}
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
              label={t('erp.purchase_order.stat.total')}
              value={stats.total}
              icon={FileText}
              accent='amber'
            />
            <StatTile
              label={t('erp.purchase_order.stat.pending_approval')}
              value={stats.pendingApproval}
              icon={Clock}
              accent='warning'
            />
            <StatTile
              label={t('erp.purchase_order.stat.total_amount')}
              value={formatAmount(stats.totalAmount, 'CNY')}
              icon={DollarSign}
              accent='cyan'
            />
            <StatTile
              label={t('erp.purchase_order.stat.received')}
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

      {/* 采购订单详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedOrder(null);
        }}
        title={t('erp.purchase_order.drawer.detail_title')}
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
            <Card title={t('erp.purchase_order.drawer.basic_info')}>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <InfoItem
                  label={t('"+K+".drawer.supplier_name')}
                  value={selectedOrder.supplier_name}
                />
                <InfoItem
                  label={t('"+K+".drawer.supplier_code')}
                  value={selectedOrder.supplier_code}
                />
                <InfoItem
                  label={t('"+K+".drawer.buyer')}
                  value={selectedOrder.buyer}
                />
                <InfoItem
                  label={t('"+K+".drawer.department')}
                  value={selectedOrder.department}
                />
                <InfoItem
                  label={t('"+K+".drawer.item_count')}
                  value={`${selectedOrder.items_count} ${t('"+K+".drawer.item_unit')}`}
                />
                <InfoItem
                  label={t('"+K+".drawer.amount')}
                  value={formatAmount(selectedOrder.total_amount, selectedOrder.currency)}
                />
                <InfoItem
                  label={t('"+K+".drawer.created_at')}
                  value={selectedOrder.created_at}
                />
                <InfoItem
                  label={t('"+K+".drawer.expected_date')}
                  value={selectedOrder.expected_date}
                />
              </div>
            </Card>

            {/* 备注 */}
            {selectedOrder.remark && (
              <Card title={t('erp.purchase_order.drawer.remark')}>
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
                  onClick={() => pushToast('info', t('erp.purchase_order.toast.rejected'))}
                  style={{ color: 'var(--error-500)' }}
                >
                  {t('erp.purchase_order.action.reject')}
                </Button>
                <Button
                  variant='primary'
                  leftIcon={<CheckCircle size={16} />}
                  onClick={() => pushToast('success', t('erp.purchase_order.toast.approved'))}
                >
                  {t('erp.purchase_order.action.approve')}
                </Button>
              </div>
            )}
            {selectedOrder.status === 'approved' && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <Button
                  variant='primary'
                  leftIcon={<Truck size={16} />}
                  onClick={() => pushToast('success', t('erp.purchase_order.toast.ordered'))}
                >
                  {t('erp.purchase_order.action.place_order')}
                </Button>
              </div>
            )}
            {selectedOrder.status === 'ordered' && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <Button
                  variant='primary'
                  leftIcon={<CheckCircle size={16} />}
                  onClick={() =>
                    pushToast('success', t('erp.purchase_order.toast.confirm_received'))
                  }
                >
                  {t('erp.purchase_order.action.confirm_receipt')}
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
        title={t('erp.purchase_order.modal.title')}
        size='lg'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setCreateModalOpen(false)}
            >
              {t('"+K+".button.cancel')}
            </Button>
            <Button
              variant='primary'
              onClick={() => {
                setCreateModalOpen(false);
                pushToast('success', t('erp.purchase_order.toast.created'));
              }}
            >
              {t('erp.purchase_order.modal.create')}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor='po-supplier'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('erp.purchase_order.form.supplier')} *
              </label>
              <Input
                id='po-supplier'
                placeholder={t('erp.purchase_order.form.supplier_placeholder')}
              />
            </div>
            <div>
              <label
                htmlFor='po-buyer'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('erp.purchase_order.form.buyer')}
              </label>
              <Input
                id='po-buyer'
                placeholder={t('erp.purchase_order.form.buyer_placeholder')}
              />
            </div>
            <div>
              <label
                htmlFor='po-department'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('erp.purchase_order.form.department')}
              </label>
              <Select
                id='po-department'
                defaultValue={t('erp.purchase_order.department.purchase')}
                options={[
                  {
                    value: t('erp.purchase_order.department.purchase'),
                    label: t('erp.purchase_order.department.purchase'),
                  },
                  {
                    value: t('erp.purchase_order.department.production'),
                    label: t('erp.purchase_order.department.production'),
                  },
                  {
                    value: t('erp.purchase_order.department.admin'),
                    label: t('erp.purchase_order.department.admin'),
                  },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='po-priority'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('erp.purchase_order.form.priority')}
              </label>
              <Select
                id='po-priority'
                defaultValue='medium'
                options={[
                  { value: 'high', label: t('erp.purchase_order.priority.high') },
                  { value: 'medium', label: t('erp.purchase_order.priority.medium') },
                  { value: 'low', label: t('erp.purchase_order.priority.low') },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='po-expected-date'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('erp.purchase_order.form.expected_date')}
              </label>
              <Input
                id='po-expected-date'
                type='date'
              />
            </div>
            <div>
              <label
                htmlFor='po-currency'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('erp.purchase_order.form.currency')}
              </label>
              <Select
                id='po-currency'
                defaultValue='CNY'
                options={[
                  { value: 'CNY', label: t('erp.purchase_order.form.currency_cny') },
                  { value: 'USD', label: t('erp.purchase_order.form.currency_usd') },
                ]}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor='po-remark'
              style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
            >
              {t('"+K+".form.remark')}
            </label>
            <textarea
              id='po-remark'
              rows={3}
              placeholder={t('erp.purchase_order.form.remark_placeholder')}
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
              {t('"+K+".form.attachment')}
            </label>
            <FileUpload
              id='field-1'
              value={attachments}
              onChange={setAttachments}
              multiple
              maxSize={20}
              accept='.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar'
              hint={t('"+K+".form.attachment_hint')}
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
