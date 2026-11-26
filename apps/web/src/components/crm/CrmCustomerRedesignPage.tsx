import React, { useState, useEffect, useMemo } from 'react';
import styles from './CrmCustomerRedesignPage.module.css';
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
  status: 'active' | 'inactive' | 'archived';
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
    status:
      c.status === 'active' || c.status === 'inactive' || c.status === 'archived'
        ? c.status
        : 'active',
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
    archived: { label: t('crm.customer_list_page.status_archived'), variant: 'default' as const },
  };

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive' | 'archived'>('all');
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
  // A-08：新建/编辑弹窗的行内校验错误（key 对应 field-N 的 id）
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, currentPage, pageSize, debouncedSearch, levelFilter],
    queryFn: async () => {
      try {
        // 尝试调用真实 API（服务端分页）
        const params: { page: number; pageSize: number; search?: string; level?: string } = {
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
          const dataObj = resData.data as {
            list?: ApiCustomer[];
            items?: ApiCustomer[];
            total?: number;
          };
          apiCustomers = Array.isArray(resData.data)
            ? resData.data
            : dataObj.list || dataObj.items || [];
          total = dataObj.total || apiCustomers.length;
        }
        if (Array.isArray(apiCustomers)) {
          return { customers: mapApiCustomers(apiCustomers), total };
        }
      } catch (e) {
        const detail = e instanceof Error && e.message ? `: ${e.message}` : '';
        throw new Error(t('crm.customer_list_page.error_load') + detail);
      }
      throw new Error(t('crm.customer_list_page.error_load'));
    },
  });

  const customers = data?.customers || [];

  const pushToast = (type: Toast['variant'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, variant: type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customerApi.delete(id),
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
      // 请求体含 API 契约外的扩展字段，先赋变量再传参：保持 payload 形状不变
      const payload = {
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
      };
      await customerApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      setFormErrors({});
      pushToast('success', t('crm.customer_list_page.toast_create_success'));
    },
    onError: (error: unknown) => {
      // A-08：把服务端原因带出来，避免“创建失败请重试”这种无信息提示
      const detail = error instanceof Error && error.message ? `：${error.message}` : '';
      pushToast('error', `${t('crm.customer_list_page.toast_create_fail')}${detail}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Customer> }) => {
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
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      setFormErrors({});
      pushToast('success', t('crm.customer_list_page.toast_update_success'));
    },
    onError: (error: unknown) => {
      const detail = error instanceof Error && error.message ? `：${error.message}` : '';
      pushToast('error', `${t('crm.customer_list_page.toast_update_fail')}${detail}`);
    },
  });

  // ── 新建/编辑弹窗：取值 + 校验 + 提交（A-08/A-09） ──
  // 该页沿用 DOM id 取值的历史实现（不改布局），但提交前必须做客户端校验：
  // 必填项为空时给行内红字 + toast，而不是把空值直接打到后端再只落一条控制台日志。
  const readCustomerForm = (): Partial<Customer> => ({
    customer_name: (document.getElementById('field-1') as HTMLInputElement)?.value || '',
    contact_phone: (document.getElementById('field-5') as HTMLInputElement)?.value || '',
    email: (document.getElementById('field-6') as HTMLInputElement)?.value || '',
    address: (document.getElementById('field-7') as HTMLInputElement)?.value || '',
    industry: (document.getElementById('field-2') as HTMLInputElement)?.value || '',
    level:
      ((document.getElementById('field-3') as HTMLSelectElement)?.value as Customer['level']) ||
      'C',
    customer_type: (document.getElementById('field-8') as HTMLSelectElement)?.value || 'enterprise',
    status: 'active',
  });

  const validateCustomerForm = (data: Partial<Customer>): Record<string, string> => {
    const errors: Record<string, string> = {};
    const name = String(data.customer_name ?? '').trim();
    if (!name) {
      errors['field-1'] = t('crm.customer_list_page.err_customer_name_required');
    } else if (name.length < 2) {
      errors['field-1'] = t('crm.customer_list_page.err_customer_name_too_short');
    }
    if (!String(data.level ?? '').trim()) {
      errors['field-3'] = t('crm.customer_list_page.err_level_required');
    }
    const email = String(data.email ?? '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors['field-6'] = t('crm.customer_list_page.err_email_invalid');
    }
    return errors;
  };

  const submitPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmitCustomer = async () => {
    // 提交中直接忽略（连点两次会造两条客户记录）
    if (submitPending) return;
    const formData = readCustomerForm();
    const errors = validateCustomerForm(formData);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      pushToast('error', t('crm.customer_list_page.toast_form_invalid'));
      return;
    }
    try {
      if (selectedCustomer) {
        await updateMutation.mutateAsync({ id: selectedCustomer.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
    } catch {
      // 失败提示由 mutation.onError 统一 toast；弹窗保持打开、输入不丢
    }
  };

  // 服务端分页：直接使用 API 返回的数据，不再本地筛选和分页
  const filteredCustomers = customers;
  const totalItems = data?.total || 0;
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
        id: 'archived',
        label: t('crm.customer_list_page.status_archived'),
        badge: customers.filter((c) => c.status === 'archived').length,
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
        render: (row) => <span className={styles.il1}>{row.customer_no}</span>,
      },
      {
        key: 'customer_name',
        header: t('crm.customer_list_page.col_customer_name'),
        render: (row) => (
          <div className={styles.il2}>{localizedName(row.customer_name, row.customer_name_en)}</div>
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
            <div className={styles.il3}>{row.contact_person}</div>
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
          <span className={styles.il4}>{formatAmount(row.total_order_amount, t)}</span>
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
          <div className={styles.il5}>
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
                setFormErrors({});
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
            <div className={styles.il6}>
              <Input
                placeholder={t('crm.customer_list_page.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                className={styles.il7}
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
                className={styles.il8}
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
                  setFormErrors({});
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
          onChange={(id) => setActiveTab(id as 'all' | 'active' | 'inactive' | 'archived')}
        />
      </ListPageTemplate>

      {filteredCustomers.length > 0 && (
        <div className={styles.il9}>
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
              <div className={styles.il10}>
                <div>
                  <div style={detailLabel}>{selectedCustomer.customer_no}</div>
                  <div className={styles.il11}>
                    {localizedName(
                      selectedCustomer.customer_name,
                      selectedCustomer.customer_name_en
                    )}
                  </div>
                  <div className={styles.il12}>{selectedCustomer.industry}</div>
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
                  <div className={styles.il13}>{selectedCustomer.contact_phone}</div>
                </div>
                <div>
                  <div style={detailLabel}>{t('crm.customer_list_page.field_email')}</div>
                  <div className={styles.il14}>{selectedCustomer.email}</div>
                </div>
                <div>
                  <div style={detailLabel}>{t('crm.customer_list_page.field_address')}</div>
                  <div className={styles.il15}>{selectedCustomer.address}</div>
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
                  <div className={styles.il16}>{formatDateTime(selectedCustomer.created_at)}</div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      {/* 新建/编辑客户弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setFormErrors({});
        }}
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
              onClick={handleSubmitCustomer}
              disabled={submitPending}
              aria-busy={submitPending}
            >
              {submitPending
                ? t('crm.customer_list_page.btn_submitting')
                : selectedCustomer
                  ? t('crm.customer_list_page.btn_save')
                  : t('crm.customer_list_page.btn_submit_create')}
            </Button>
          </>
        }
      >
        <div style={colGap4}>
          <div className={styles.il17}>
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
                error={formErrors['field-1']}
                onChange={() => setFormErrors((prev) => ({ ...prev, 'field-1': '' }))}
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
                error={formErrors['field-3']}
                onChange={() => setFormErrors((prev) => ({ ...prev, 'field-3': '' }))}
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
                error={formErrors['field-6']}
                onChange={() => setFormErrors((prev) => ({ ...prev, 'field-6': '' }))}
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
        <p className={styles.il18}>
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
