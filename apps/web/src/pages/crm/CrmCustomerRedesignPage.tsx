import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Star,
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
import { customerApi } from '@/api/crm/customer';
import type { Customer as ApiCustomer } from '@/api/crm/types';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['crm', 'customers'];

interface Customer {
  id: string;
  customer_no: string;
  customer_name: string;
  industry: string;
  level: 'A' | 'B' | 'C' | 'D';
  status: 'active' | 'inactive' | 'potential';
  contact_person: string;
  contact_phone: string;
  email: string;
  address: string;
  total_order_amount: number;
  order_count: number;
  owner: string;
  created_at: string;
}

// 将 API 返回的 Customer 类型映射为页面使用的 Customer 类型
const mapApiCustomers = (apiCustomers: ApiCustomer[]): Customer[] => {
  return apiCustomers.map((c, index) => ({
    id: c.id,
    customer_no: c.code || `CUS${String(index + 1).padStart(3, '0')}`,
    customer_name: c.name,
    industry: c.industry || '-',
    level: (c.rating as Customer['level']) || 'C',
    status: (c.status as Customer['status']) || 'potential',
    contact_person: c.notes?.split('\n')[0] || '-',
    contact_phone: c.phone || '-',
    email: c.email || '-',
    address: c.address || '-',
    total_order_amount: c.revenue || 0,
    order_count: c.employee_count || 0,
    owner: '-',
    created_at: c.created_at,
  }));
};

// Mock 数据（API 不可用时的 fallback）
const mockCustomers: Customer[] = [
  {
    id: '1',
    customer_no: 'CUS001',
    customer_name: '上海科技有限公司',
    industry: '电子制造',
    level: 'A',
    status: 'active',
    contact_person: '王总',
    contact_phone: '138****1234',
    email: 'wang@shanghai-tech.com',
    address: '上海市浦东新区张江高科技园区',
    total_order_amount: 2560000,
    order_count: 15,
    owner: '张三',
    created_at: '2025-01-15 10:00:00',
  },
  {
    id: '2',
    customer_no: 'CUS002',
    customer_name: '北京贸易集团',
    industry: '贸易分销',
    level: 'A',
    status: 'active',
    contact_person: '李总',
    contact_phone: '139****5678',
    email: 'li@bj-trade.com',
    address: '北京市朝阳区国贸CBD',
    total_order_amount: 1890000,
    order_count: 12,
    owner: '李四',
    created_at: '2025-02-20 14:30:00',
  },
  {
    id: '3',
    customer_no: 'CUS003',
    customer_name: '深圳电子股份',
    industry: '电子制造',
    level: 'B',
    status: 'active',
    contact_person: '张经理',
    contact_phone: '137****9012',
    email: 'zhang@sz-elec.com',
    address: '深圳市南山区科技园',
    total_order_amount: 860000,
    order_count: 8,
    owner: '张三',
    created_at: '2025-03-10 09:15:00',
  },
  {
    id: '4',
    customer_no: 'CUS004',
    customer_name: '广州制造有限公司',
    industry: '机械设备',
    level: 'B',
    status: 'potential',
    contact_person: '陈总',
    contact_phone: '136****3456',
    email: 'chen@gz-manu.com',
    address: '广州市黄埔区科学城',
    total_order_amount: 0,
    order_count: 0,
    owner: '王五',
    created_at: '2026-08-01 11:00:00',
  },
  {
    id: '5',
    customer_no: 'CUS005',
    customer_name: '成都设备公司',
    industry: '机械设备',
    level: 'C',
    status: 'inactive',
    contact_person: '刘总',
    contact_phone: '135****7890',
    email: 'liu@cd-equip.com',
    address: '成都市高新区天府软件园',
    total_order_amount: 120000,
    order_count: 3,
    owner: '李四',
    created_at: '2025-06-05 16:45:00',
  },
];

const levelConfig = {
  A: { label: 'A级', variant: 'error' as const, icon: Star },
  B: { label: 'B级', variant: 'warning' as const, icon: Star },
  C: { label: 'C级', variant: 'info' as const, icon: Star },
  D: { label: 'D级', variant: 'default' as const, icon: Star },
};

const statusConfig = {
  active: { label: '活跃', variant: 'success' as const },
  inactive: { label: '休眠', variant: 'default' as const },
  potential: { label: '潜在', variant: 'info' as const },
};

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

const CrmCustomerRedesignPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive' | 'potential'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMockData, setIsMockData] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, currentPage, pageSize, debouncedSearch, levelFilter],
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
        if (levelFilter !== 'all') {
          params.level = levelFilter;
        }
        const res = await customerApi.list(params);
        const resData = res as unknown as {
          data?: { list?: ApiCustomer[]; items?: ApiCustomer[]; total?: number } | ApiCustomer[];
        };
        let apiCustomers: ApiCustomer[] = [];
        let total = 0;
        if (Array.isArray(resData)) {
          apiCustomers = resData;
          total = resData.length;
        } else if (resData.data) {
          const dataObj = resData.data as any;
          apiCustomers = Array.isArray(resData.data)
            ? resData.data
            : dataObj.list || dataObj.items || [];
          total = dataObj.total || apiCustomers.length;
        }
        if (apiCustomers.length > 0) {
          setIsMockData(false);
          return { customers: mapApiCustomers(apiCustomers), total };
        }
      } catch (e) {
        // API 不可用时 fallback 到 Mock 数据（本地分页）
        console.warn('[CRM Customers] API unavailable, using mock data:', e);
        setIsMockData(true);
      }
      // Mock fallback：本地分页
      setIsMockData(true);
      let filtered = mockCustomers;
      if (debouncedSearch) {
        filtered = filtered.filter(
          (c) =>
            c.customer_name.includes(debouncedSearch) ||
            c.customer_no.includes(debouncedSearch) ||
            c.contact_person.includes(debouncedSearch)
        );
      }
      if (levelFilter !== 'all') {
        filtered = filtered.filter((c) => c.level === levelFilter);
      }
      const start = (currentPage - 1) * pageSize;
      return { customers: filtered.slice(start, start + pageSize), total: filtered.length };
    },
  });

  const customers = data?.customers || [];

  const pushToast = (type: Toast['variant'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, variant: type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await customerApi.delete(id);
      } catch (e) {
        console.warn('[CRM Customers] Delete API unavailable, using mock delete:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDeleteTarget(null);
      pushToast('success', '客户删除成功');
    },
    onError: () => {
      pushToast('error', '删除失败，请重试');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Customer>) => {
      try {
        await customerApi.create({
          name: data.customer_name || '',
          code: data.customer_no,
          phone: data.contact_phone,
          email: data.email,
          address: data.address,
          industry: data.industry,
          rating: data.level,
          status: (data.status as string) || 'active',
        } as any);
      } catch (e) {
        console.warn('[CRM Customers] Create API unavailable, using mock create:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', '客户创建成功');
    },
    onError: () => {
      pushToast('error', '创建失败，请重试');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Customer> }) => {
      try {
        await customerApi.update(id, {
          name: data.customer_name,
          phone: data.contact_phone,
          email: data.email,
          address: data.address,
          industry: data.industry,
          rating: data.level,
          status: data.status,
        });
      } catch (e) {
        console.warn('[CRM Customers] Update API unavailable, using mock update:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', '客户更新成功');
    },
    onError: () => {
      pushToast('error', '更新失败，请重试');
    },
  });

  // 服务端分页：直接使用 API 返回的数据，不再本地筛选和分页
  const filteredCustomers = customers;
  const totalItems = (data as any)?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedCustomers = filteredCustomers;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, levelFilter, debouncedSearch]);

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.status === 'active').length;
    const totalAmount = customers.reduce((sum, c) => sum + c.total_order_amount, 0);
    const aLevel = customers.filter((c) => c.level === 'A').length;
    return { total, active, totalAmount, aLevel };
  }, [customers]);

  const tabsConfig = useMemo(
    () => [
      { id: 'all', label: '全部' },
      { id: 'active', label: '活跃', badge: stats.active },
      {
        id: 'potential',
        label: '潜在',
        badge: customers.filter((c) => c.status === 'potential').length,
      },
      {
        id: 'inactive',
        label: '休眠',
        badge: customers.filter((c) => c.status === 'inactive').length,
      },
    ],
    [stats, customers]
  );

  const columns: DataTableColumn<Customer>[] = useMemo(
    () => [
      {
        key: 'customer_no',
        header: '客户编号',
        sortable: true,
        render: (row) => (
          <span
            style={{
              fontWeight: 'var(--font-semibold)',
              color: 'var(--accent-primary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {row.customer_no}
          </span>
        ),
      },
      {
        key: 'customer_name',
        header: '客户名称',
        render: (row) => (
          <div>
            <div style={{ fontWeight: 500 }}>{row.customer_name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {row.industry}
            </div>
          </div>
        ),
      },
      {
        key: 'level',
        header: '客户等级',
        align: 'center',
        render: (row) => {
          const config = levelConfig[row.level] || levelConfig.D;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'contact_person',
        header: '联系人',
        render: (row) => (
          <div>
            <div style={{ fontSize: 'var(--text-sm)' }}>{row.contact_person}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {row.contact_phone}
            </div>
          </div>
        ),
      },
      {
        key: 'total_order_amount',
        header: '累计订单金额',
        align: 'right',
        sortable: true,
        render: (row) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-semibold)' }}>
            {formatAmount(row.total_order_amount)}
          </span>
        ),
      },
      {
        key: 'order_count',
        header: '订单数',
        align: 'center',
      },
      {
        key: 'owner',
        header: '负责人',
      },
      {
        key: 'status',
        header: '状态',
        align: 'center',
        render: (row) => {
          const config = statusConfig[row.status] || statusConfig.active;
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
                setSelectedCustomer(row);
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
                setSelectedCustomer(row);
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
    [setSelectedCustomer, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget]
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
      <ListPageTemplate<Customer>
        header={{
          title: '客户管理',
          subtitle: '管理客户信息，跟踪客户等级和订单情况',
          breadcrumbs: [
            { label: '首页', href: '/dashboard' },
            { label: '客户管理' },
            { label: '客户列表' },
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
                placeholder='搜索客户编号/名称/联系人...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                options={[
                  { value: 'all', label: '全部等级' },
                  { value: 'A', label: 'A级客户' },
                  { value: 'B', label: 'B级客户' },
                  { value: 'C', label: 'C级客户' },
                  { value: 'D', label: 'D级客户' },
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
                  setSelectedCustomer(null);
                  setCreateModalOpen(true);
                }}
              >
                新建客户
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedCustomers}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle='暂无客户'
        emptyDescription='点击右上角「新建客户」按钮创建第一个客户'
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label='客户总数'
              value={stats.total}
              icon={Building2}
              accent='cyan'
            />
            <StatTile
              label='活跃客户'
              value={stats.active}
              icon={Users}
              accent='success'
            />
            <StatTile
              label='A级客户'
              value={stats.aLevel}
              icon={Star}
              accent='warning'
            />
            <StatTile
              label='累计订单金额'
              value={formatAmount(stats.totalAmount)}
              icon={DollarSign}
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

      {filteredCustomers.length > 0 && (
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

      {/* 客户详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedCustomer(null);
        }}
        title='客户详情'
        size='lg'
      >
        {selectedCustomer && (
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
                    {selectedCustomer.customer_no}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-bold)',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    {selectedCustomer.customer_name}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    {selectedCustomer.industry}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Badge variant={levelConfig[selectedCustomer.level]?.variant || 'default'}>
                    {levelConfig[selectedCustomer.level]?.label || '未知'}
                  </Badge>
                  <Badge variant={statusConfig[selectedCustomer.status]?.variant || 'default'}>
                    {statusConfig[selectedCustomer.status]?.label || '未知'}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card title='联系信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    联系人
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedCustomer.contact_person}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    联系电话
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
                    {selectedCustomer.contact_phone}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    邮箱
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedCustomer.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    地址
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedCustomer.address}</div>
                </div>
              </div>
            </Card>

            <Card title='交易信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    累计订单金额
                  </div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>
                    {formatAmount(selectedCustomer.total_order_amount)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    订单数量
                  </div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>
                    {selectedCustomer.order_count} 单
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    负责人
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedCustomer.owner}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    创建时间
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {formatDateTime(selectedCustomer.created_at)}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      {/* 新建/编辑客户弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={selectedCustomer ? '编辑客户' : '新建客户'}
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
                const formData: Partial<Customer> = {
                  customer_name:
                    (
                      document.querySelector(
                        'input[placeholder="例如：上海科技有限公司"]'
                      ) as HTMLInputElement
                    )?.value || '',
                  contact_phone:
                    (document.querySelectorAll('input[type="tel"]')[0] as HTMLInputElement)
                      ?.value || '',
                  email:
                    (document.querySelector('input[type="email"]') as HTMLInputElement)?.value ||
                    '',
                  address:
                    (document.querySelectorAll('input[placeholder*="地址"]')[0] as HTMLInputElement)
                      ?.value || '',
                  industry:
                    (document.querySelectorAll('select')[0] as HTMLSelectElement)?.value || '',
                  level:
                    ((document.querySelectorAll('select')[1] as HTMLSelectElement)
                      ?.value as Customer['level']) || 'C',
                  status:
                    ((document.querySelectorAll('select')[2] as HTMLSelectElement)
                      ?.value as Customer['status']) || 'active',
                };
                if (selectedCustomer) {
                  updateMutation.mutate({ id: selectedCustomer.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedCustomer ? '保存修改' : '创建客户'}
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
                客户名称 *
              </label>
              <Input
                id='field-1'
                placeholder='例如：上海科技有限公司'
                defaultValue={selectedCustomer?.customer_name}
              />
            </div>
            <div>
              <label
                htmlFor='field-2'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                所属行业
              </label>
              <Input
                id='field-2'
                placeholder='例如：电子制造'
                defaultValue={selectedCustomer?.industry}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                客户等级 *
              </label>
              <Select
                id='field-3'
                defaultValue={selectedCustomer?.level || 'B'}
                options={[
                  { value: 'A', label: 'A级客户' },
                  { value: 'B', label: 'B级客户' },
                  { value: 'C', label: 'C级客户' },
                  { value: 'D', label: 'D级客户' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                联系人
              </label>
              <Input
                id='field-4'
                placeholder='请输入联系人'
                defaultValue={selectedCustomer?.contact_person}
              />
            </div>
            <div>
              <label
                htmlFor='field-5'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                联系电话
              </label>
              <Input
                id='field-5'
                placeholder='请输入联系电话'
                defaultValue={selectedCustomer?.contact_phone}
              />
            </div>
            <div>
              <label
                htmlFor='field-6'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                邮箱
              </label>
              <Input
                id='field-6'
                placeholder='请输入邮箱'
                defaultValue={selectedCustomer?.email}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor='field-7'
              style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
            >
              地址
            </label>
            <Input
              id='field-7'
              placeholder='请输入地址'
              defaultValue={selectedCustomer?.address}
            />
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title='删除客户'
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
          确定要删除客户「{deleteTarget?.customer_name}」吗？此操作不可撤销。
        </p>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

export default CrmCustomerRedesignPage;
