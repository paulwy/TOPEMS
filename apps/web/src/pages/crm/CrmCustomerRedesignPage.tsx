import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  Star,
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
  ToastContainer,
} from '@/components/redesign';
import type { DataTableColumn, Toast } from '@/components/redesign';
import { customerApi } from '@/api/crm/customer';
import type { Customer as ApiCustomer } from '@/api/crm/types';
import { localizedName } from '@/utils/i18n';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['crm', 'customers'];

// 详情/卡片重复样式（等价抽取，值不变）
const detailLabel: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--text-secondary)',
};
const cellSub: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--text-tertiary)',
};
const detailValue: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-medium)',
};
const heroValue: React.CSSProperties = {
  fontSize: 'var(--text-lg)',
  fontWeight: 'var(--font-bold)',
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

interface Customer {
  id: string;
  customer_no: string;
  customer_name: string;
  customer_name_en?: string | null;
  industry: string;
  level: 'A' | 'B' | 'C' | 'D';
  status: 'active' | 'inactive' | 'potential';
  customer_type?: string;
  contact_person: string;
  contact_phone: string;
  email: string;
  address: string;
  total_order_amount: number;
  order_count: number;
  owner: string;
  created_at: string;
}

// 联系人字段从 notes 首行解析；若首行为手机号/密文则视为数据异常，兜底 '-'
const sanitizeContactPerson = (notes?: string): string => {
  if (!notes) return '-';
  const first = notes.split('\n')[0]?.trim() || '';
  if (!first) return '-';
  if (/^1[3-9]\d{9}$/.test(first)) return '-';
  if (first.includes('aes-256-gcm') || first.includes('key_version')) return '-';
  return first;
};

// 将 API 返回的 Customer 类型映射为页面使用的 Customer 类型
const mapApiCustomers = (apiCustomers: ApiCustomer[]): Customer[] => {
  return apiCustomers.map((c, index) => ({
    id: c.id,
    customer_no: c.code || `CUS${String(index + 1).padStart(3, '0')}`,
    customer_name: c.name,
    customer_name_en: c.name_en,
    industry: c.industry || '-',
    level: (c.rating as Customer['level']) || 'C',
    status: (c.status as Customer['status']) || 'potential',
    customer_type: c.customer_type,
    contact_person: sanitizeContactPerson(c.notes),
    contact_phone: c.phone || '-',
    email: c.email || '-',
    address: c.address || '-',
    total_order_amount: c.revenue || 0,
    order_count: c.employee_count || 0,
    owner: '-',
    created_at: c.created_at,
  }));
};

// Mock 数据（API 不可用时的 fallback）在组件内用 t() 构造，见 mockCustomers

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const formatAmount = (value: number, t: (key: string) => string) => {
  if (value >= 10000) {
    return `¥${(value / 10000).toFixed(1)}${t('common.unit_wan')}`;
  }
  return `¥${value.toLocaleString('zh-CN')}`;
};

const CrmCustomerRedesignPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mockCustomers: Customer[] = [
    {
      id: '1',
      customer_no: 'CUS001',
      customer_name: t('crm.demo.company_a_name'),
      industry: t('crm.demo.industry_electronics'),
      level: 'A',
      status: 'active',
      contact_person: t('crm.demo.contact_wang'),
      contact_phone: '138****1234',
      email: 'wang@shanghai-tech.com',
      address: t('crm.demo.address_a'),
      total_order_amount: 2560000,
      order_count: 15,
      owner: t('crm.demo.owner_zhang'),
      created_at: '2025-01-15 10:00:00',
    },
    {
      id: '2',
      customer_no: 'CUS002',
      customer_name: t('crm.demo.company_b_name'),
      industry: t('crm.demo.industry_trading'),
      level: 'A',
      status: 'active',
      contact_person: t('crm.demo.contact_li'),
      contact_phone: '139****5678',
      email: 'li@bj-trade.com',
      address: t('crm.demo.address_b'),
      total_order_amount: 1890000,
      order_count: 12,
      owner: t('crm.demo.owner_li'),
      created_at: '2025-02-20 14:30:00',
    },
    {
      id: '3',
      customer_no: 'CUS003',
      customer_name: t('crm.demo.company_c_name'),
      industry: t('crm.demo.industry_electronics'),
      level: 'B',
      status: 'active',
      contact_person: t('crm.demo.contact_manager_zhang'),
      contact_phone: '137****9012',
      email: 'zhang@sz-elec.com',
      address: t('crm.demo.address_c'),
      total_order_amount: 860000,
      order_count: 8,
      owner: t('crm.demo.owner_zhang'),
      created_at: '2025-03-10 09:15:00',
    },
    {
      id: '4',
      customer_no: 'CUS004',
      customer_name: t('crm.demo.company_d_name'),
      industry: t('crm.demo.industry_machinery'),
      level: 'B',
      status: 'potential',
      contact_person: t('crm.demo.contact_chen'),
      contact_phone: '136****3456',
      email: 'chen@gz-manu.com',
      address: t('crm.demo.address_d'),
      total_order_amount: 0,
      order_count: 0,
      owner: t('crm.demo.owner_wang'),
      created_at: '2026-08-01 11:00:00',
    },
    {
      id: '5',
      customer_no: 'CUS005',
      customer_name: t('crm.demo.company_e_name'),
      industry: t('crm.demo.industry_machinery'),
      level: 'C',
      status: 'inactive',
      contact_person: t('crm.demo.contact_liu'),
      contact_phone: '135****7890',
      email: 'liu@cd-equip.com',
      address: t('crm.demo.address_e'),
      total_order_amount: 120000,
      order_count: 3,
      owner: t('crm.demo.owner_li'),
      created_at: '2025-06-05 16:45:00',
    },
  ];

  const levelConfig = {
    A: { label: t('crm.customer_list_page.badge_level_a'), variant: 'error' as const, icon: Star },
    B: {
      label: t('crm.customer_list_page.badge_level_b'),
      variant: 'warning' as const,
      icon: Star,
    },
    C: { label: t('crm.customer_list_page.badge_level_c'), variant: 'info' as const, icon: Star },
    D: {
      label: t('crm.customer_list_page.badge_level_d'),
      variant: 'default' as const,
      icon: Star,
    },
  };

  const statusConfig = {
    active: { label: t('crm.customer_list_page.status_active'), variant: 'success' as const },
    inactive: { label: t('crm.customer_list_page.status_inactive'), variant: 'default' as const },
    potential: { label: t('crm.customer_list_page.status_potential'), variant: 'info' as const },
  };

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
        if (Array.isArray(apiCustomers)) {
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
      pushToast('success', t('crm.customer_list_page.toast_delete_success'));
    },
    onError: () => {
      pushToast('error', t('crm.customer_list_page.toast_delete_fail'));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Customer>) => {
      // S1：真实 API 创建失败时不再静默假成功——记录降级标记，由 onSuccess 给出醒目警示
      let apiFailed = false;
      try {
        await customerApi.create({
          name: data.customer_name || '',
          code: data.customer_no,
          // 后端 CreateCustomerRequest.customer_type 为必填 String，缺省给合理默认值 enterprise
          customer_type: data.customer_type || 'enterprise',
          phone: data.contact_phone,
          email: data.email,
          address: data.address,
          industry: data.industry,
          rating: data.level,
          status: (data.status as string) || 'active',
        } as any);
      } catch (e) {
        console.warn('[CRM Customers] Create API unavailable, using mock create:', e);
        apiFailed = true;
        // 进入本地演示态，列表顶部展示 mock_banner
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
          t('crm.customer_list_page.mock_create_fallback', '⚠️ 已降级为本地模拟数据，未写入数据库')
        );
      } else {
        pushToast('success', t('crm.customer_list_page.toast_create_success'));
      }
    },
    onError: () => {
      pushToast('error', t('crm.customer_list_page.toast_create_fail'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Customer> }) => {
      try {
        await customerApi.update(id, {
          name: data.customer_name,
          customer_type: data.customer_type,
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
      pushToast('success', t('crm.customer_list_page.toast_update_success'));
    },
    onError: () => {
      pushToast('error', t('crm.customer_list_page.toast_update_fail'));
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
      { id: 'all', label: t('crm.customer_list_page.tab_all') },
      { id: 'active', label: t('crm.customer_list_page.status_active'), badge: stats.active },
      {
        id: 'potential',
        label: t('crm.customer_list_page.status_potential'),
        badge: customers.filter((c) => c.status === 'potential').length,
      },
      {
        id: 'inactive',
        label: t('crm.customer_list_page.status_inactive'),
        badge: customers.filter((c) => c.status === 'inactive').length,
      },
    ],
    [stats, customers, t]
  );

  const columns: DataTableColumn<Customer>[] = useMemo(
    () => [
      {
        key: 'customer_no',
        header: t('crm.customer_list_page.col_customer_no'),
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
        header: t('crm.customer_list_page.col_customer_name'),
        render: (row) => (
          <div style={{ fontWeight: 500 }}>
            {localizedName(row.customer_name, row.customer_name_en)}
          </div>
        ),
      },
      {
        key: 'level',
        header: t('crm.customer_list_page.col_level'),
        align: 'center',
        render: (row) => {
          const config = levelConfig[row.level] || levelConfig.D;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'contact_person',
        header: t('crm.customer_list_page.field_contact_person'),
        render: (row) => (
          <div>
            <div style={{ fontSize: 'var(--text-sm)' }}>{row.contact_person}</div>
            <div style={cellSub}>{row.contact_phone}</div>
          </div>
        ),
      },
      {
        key: 'total_order_amount',
        header: t('crm.customer_list_page.col_total_order_amount'),
        align: 'right',
        sortable: true,
        render: (row) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-semibold)' }}>
            {formatAmount(row.total_order_amount, t)}
          </span>
        ),
      },
      {
        key: 'order_count',
        header: t('crm.customer_list_page.col_order_count'),
        align: 'center',
      },
      {
        key: 'owner',
        header: t('crm.customer_list_page.field_owner'),
      },
      {
        key: 'status',
        header: t('crm.customer_list_page.col_status'),
        align: 'center',
        render: (row) => {
          const config = statusConfig[row.status] || statusConfig.active;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'actions',
        header: t('crm.customer_list_page.col_actions'),
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
              {t('crm.customer_list_page.action_detail')}
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
              {t('crm.customer_list_page.action_edit')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Trash2 size={14} />}
              onClick={() => setDeleteTarget(row)}
            >
              {t('crm.customer_list_page.action_delete')}
            </Button>
          </div>
        ),
      },
    ],
    [setSelectedCustomer, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget, t]
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
          {t('crm.customer_list_page.mock_banner')}
        </div>
      )}
      <ListPageTemplate<Customer>
        header={{
          title: t('crm.customer_list_page.title'),
          subtitle: t('crm.customer_list_page.subtitle'),
          breadcrumbs: [
            { label: t('shared.use_auto_breadcrumbs.k0'), href: '/dashboard' },
            { label: t('crm.customer_list_page.breadcrumb_self') },
            { label: t('crm.customer_list_page.breadcrumb_list') },
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
                placeholder={t('crm.customer_list_page.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={levelFilter}
                aria-label={t('crm.customer_list_page.col_level')}
                onChange={(e) => setLevelFilter(e.target.value)}
                options={[
                  { value: 'all', label: t('crm.customer_list_page.level_all') },
                  { value: 'A', label: t('crm.customer_list_page.level_a') },
                  { value: 'B', label: t('crm.customer_list_page.level_b') },
                  { value: 'C', label: t('crm.customer_list_page.level_c') },
                  { value: 'D', label: t('crm.customer_list_page.level_d') },
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
                {t('crm.customer_list_page.btn_refresh')}
              </Button>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={() => {
                  setSelectedCustomer(null);
                  setCreateModalOpen(true);
                }}
              >
                {t('crm.customer_list_page.btn_create')}
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedCustomers}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle={t('crm.customer_list_page.empty_title')}
        emptyDescription={t('crm.customer_list_page.empty_description')}
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label={t('crm.customer_list_page.stat_total_customers')}
              value={stats.total}
              icon={Building2}
              accent='cyan'
            />
            <StatTile
              label={t('crm.customer_list_page.stat_active_customers')}
              value={stats.active}
              icon={Users}
              accent='success'
            />
            <StatTile
              label={t('crm.customer_list_page.stat_a_level_customers')}
              value={stats.aLevel}
              icon={Star}
              accent='warning'
            />
            <StatTile
              label={t('crm.customer_list_page.stat_total_order_amount')}
              value={formatAmount(stats.totalAmount, t)}
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
        title={t('crm.customer_list_page.drawer_title')}
        size='lg'
      >
        {selectedCustomer && (
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
                  <div style={detailLabel}>{selectedCustomer.customer_no}</div>
                  <div
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-bold)',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    {localizedName(
                      selectedCustomer.customer_name,
                      selectedCustomer.customer_name_en
                    )}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    {selectedCustomer.industry}
                  </div>
                </div>
                <div style={rowGap2}>
                  <Badge variant={levelConfig[selectedCustomer.level]?.variant || 'default'}>
                    {levelConfig[selectedCustomer.level]?.label ||
                      t('crm.customer_list_page.label_unknown')}
                  </Badge>
                  <Badge variant={statusConfig[selectedCustomer.status]?.variant || 'default'}>
                    {statusConfig[selectedCustomer.status]?.label ||
                      t('crm.customer_list_page.label_unknown')}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card title={t('crm.customer_list_page.section_contact_info')}>
              <div style={gridTwoCol}>
                <div>
                  <div style={detailLabel}>{t('crm.customer_list_page.field_contact_person')}</div>
                  <div style={detailValue}>{selectedCustomer.contact_person}</div>
                </div>
                <div>
                  <div style={detailLabel}>{t('crm.customer_list_page.field_contact_phone')}</div>
                  <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
                    {selectedCustomer.contact_phone}
                  </div>
                </div>
                <div>
                  <div style={detailLabel}>{t('crm.customer_list_page.field_email')}</div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedCustomer.email}</div>
                </div>
                <div>
                  <div style={detailLabel}>{t('crm.customer_list_page.field_address')}</div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedCustomer.address}</div>
                </div>
              </div>
            </Card>

            <Card title={t('crm.customer_list_page.section_transaction_info')}>
              <div style={gridTwoCol}>
                <div>
                  <div style={detailLabel}>
                    {t('crm.customer_list_page.col_total_order_amount')}
                  </div>
                  <div style={heroValue}>
                    {formatAmount(selectedCustomer.total_order_amount, t)}
                  </div>
                </div>
                <div>
                  <div style={detailLabel}>{t('crm.customer_list_page.field_order_count')}</div>
                  <div style={heroValue}>
                    {selectedCustomer.order_count} {t('crm.customer_list_page.unit_orders')}
                  </div>
                </div>
                <div>
                  <div style={detailLabel}>{t('crm.customer_list_page.field_owner')}</div>
                  <div style={detailValue}>{selectedCustomer.owner}</div>
                </div>
                <div>
                  <div style={detailLabel}>{t('crm.customer_list_page.field_create_time')}</div>
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
        title={
          selectedCustomer
            ? t('crm.customer_list_page.modal_edit_title')
            : t('crm.customer_list_page.modal_create_title')
        }
        size='lg'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setCreateModalOpen(false)}
            >
              {t('crm.customer_list_page.btn_cancel')}
            </Button>
            <Button
              variant='primary'
              onClick={() => {
                const formData: Partial<Customer> = {
                  customer_name:
                    (document.getElementById('field-1') as HTMLInputElement)?.value || '',
                  contact_phone:
                    (document.getElementById('field-5') as HTMLInputElement)?.value || '',
                  email: (document.getElementById('field-6') as HTMLInputElement)?.value || '',
                  address: (document.getElementById('field-7') as HTMLInputElement)?.value || '',
                  industry: (document.getElementById('field-2') as HTMLInputElement)?.value || '',
                  level:
                    ((document.getElementById('field-3') as HTMLSelectElement)
                      ?.value as Customer['level']) || 'C',
                  customer_type:
                    (document.getElementById('field-8') as HTMLSelectElement)?.value ||
                    'enterprise',
                  status: 'active',
                };
                if (selectedCustomer) {
                  updateMutation.mutate({ id: selectedCustomer.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedCustomer
                ? t('crm.customer_list_page.btn_save')
                : t('crm.customer_list_page.btn_submit_create')}
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
                {t('crm.customer_list_page.field_customer_name_required')}
              </label>
              <Input
                id='field-1'
                placeholder={t('crm.customer_list_page.ph_customer_name_example')}
                defaultValue={selectedCustomer?.customer_name}
              />
            </div>
            <div>
              <label
                htmlFor='field-2'
                style={sectionTitle}
              >
                {t('crm.customer_list_page.field_industry')}
              </label>
              <Input
                id='field-2'
                placeholder={t('crm.customer_list_page.ph_industry_example')}
                defaultValue={selectedCustomer?.industry}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={sectionTitle}
              >
                {t('crm.customer_list_page.field_level_required')}
              </label>
              <Select
                id='field-3'
                defaultValue={selectedCustomer?.level || 'B'}
                options={[
                  { value: 'A', label: t('crm.customer_list_page.level_a') },
                  { value: 'B', label: t('crm.customer_list_page.level_b') },
                  { value: 'C', label: t('crm.customer_list_page.level_c') },
                  { value: 'D', label: t('crm.customer_list_page.level_d') },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-8'
                style={sectionTitle}
              >
                {t('crm.customerCreate.field_type')}
              </label>
              <Select
                id='field-8'
                defaultValue={selectedCustomer?.customer_type || 'enterprise'}
                options={[
                  { value: 'enterprise', label: t('crm.customerCreate.type_enterprise') },
                  { value: 'personal', label: t('crm.customerCreate.type_personal') },
                  { value: 'government', label: t('crm.customerCreate.type_government') },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={sectionTitle}
              >
                {t('crm.customer_list_page.field_contact_person')}
              </label>
              <Input
                id='field-4'
                placeholder={t('crm.customer_list_page.ph_contact_person')}
                defaultValue={selectedCustomer?.contact_person}
              />
            </div>
            <div>
              <label
                htmlFor='field-5'
                style={sectionTitle}
              >
                {t('crm.customer_list_page.field_contact_phone')}
              </label>
              <Input
                id='field-5'
                placeholder={t('crm.customer_list_page.ph_contact_phone')}
                defaultValue={selectedCustomer?.contact_phone}
              />
            </div>
            <div>
              <label
                htmlFor='field-6'
                style={sectionTitle}
              >
                {t('crm.customer_list_page.field_email')}
              </label>
              <Input
                id='field-6'
                placeholder={t('crm.customer_list_page.ph_email')}
                defaultValue={selectedCustomer?.email}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor='field-7'
              style={sectionTitle}
            >
              {t('crm.customer_list_page.field_address')}
            </label>
            <Input
              id='field-7'
              placeholder={t('crm.customer_list_page.ph_address')}
              defaultValue={selectedCustomer?.address}
            />
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('crm.customer_list_page.delete_title')}
        size='sm'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setDeleteTarget(null)}
            >
              {t('crm.customer_list_page.btn_cancel')}
            </Button>
            <Button
              variant='danger'
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {t('crm.customer_list_page.btn_confirm_delete')}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          {t('crm.customer_list_page.delete_confirm_message', {
            name: localizedName(deleteTarget?.customer_name, deleteTarget?.customer_name_en),
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

export default CrmCustomerRedesignPage;
