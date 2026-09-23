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
  FileText,
  DollarSign,
  User,
  Clock,
  CheckCircle,
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
import { apiClient } from '@/api/client';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['crm', 'contracts'];

interface Contract {
  id: string;
  contract_no: string;
  title: string;
  customer_name: string;
  type: 'sales' | 'purchase' | 'service' | 'framework';
  status: 'draft' | 'pending' | 'active' | 'completed' | 'expired' | 'terminated';
  amount: number;
  start_date: string;
  end_date: string;
  owner: string;
  sign_date: string;
  created_at: string;
}

// Mock 数据
// 将 API 返回的合同数据映射为页面使用的 Contract 类型
const mapApiContracts = (apiContracts: any[]): Contract[] => {
  return apiContracts.map((c, index) => ({
    id: c.id,
    contract_no: c.contract_no || c.contractNo || `CON2026${String(index + 1).padStart(5, '0')}`,
    title: c.title || c.name || '-',
    customer_name: c.customer_name || c.customerName || '-',
    amount: c.amount || c.total_amount || 0,
    status: (c.status as Contract['status']) || 'draft',
    sign_date: c.sign_date || c.signDate || '-',
    start_date: c.start_date || c.startDate || '-',
    end_date: c.end_date || c.endDate || '-',
    owner: c.owner || c.ownerName || '-',
    type: (c.type as Contract['type']) || 'sales',
    created_at: c.created_at || new Date().toISOString(),
  }));
};

// Mock 数据（API 不可用时的 fallback）在组件内用 t() 构造，见 mockContracts

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

const CrmContractRedesignPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mockContracts: Contract[] = [
    {
      id: '1',
      contract_no: 'CON202609001',
      title: t('crm.demo.contract_1_title'),
      customer_name: t('crm.demo.company_a_name'),
      type: 'sales',
      status: 'active',
      amount: 2560000,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      owner: t('crm.demo.owner_zhang'),
      sign_date: '2026-01-05',
      created_at: '2026-01-05 10:00:00',
    },
    {
      id: '2',
      contract_no: 'CON202609002',
      title: t('crm.demo.contract_2_title'),
      customer_name: t('crm.demo.company_b_name'),
      type: 'framework',
      status: 'pending',
      amount: 1280000,
      start_date: '2026-10-01',
      end_date: '2027-09-30',
      owner: t('crm.demo.owner_li'),
      sign_date: '',
      created_at: '2026-09-01 14:30:00',
    },
    {
      id: '3',
      contract_no: 'CON202608001',
      title: t('crm.demo.contract_3_title'),
      customer_name: t('crm.demo.company_c_name'),
      type: 'service',
      status: 'active',
      amount: 350000,
      start_date: '2026-08-01',
      end_date: '2027-07-31',
      owner: t('crm.demo.owner_zhang'),
      sign_date: '2026-08-05',
      created_at: '2026-08-05 09:15:00',
    },
    {
      id: '4',
      contract_no: 'CON202512001',
      title: t('crm.demo.contract_4_title'),
      customer_name: t('crm.demo.company_d_name'),
      type: 'sales',
      status: 'completed',
      amount: 256000,
      start_date: '2025-12-01',
      end_date: '2026-06-30',
      owner: t('crm.demo.owner_wang'),
      sign_date: '2025-12-10',
      created_at: '2025-12-10 11:00:00',
    },
    {
      id: '5',
      contract_no: 'CON202506001',
      title: t('crm.demo.contract_5_title'),
      customer_name: t('crm.demo.company_e_name'),
      type: 'sales',
      status: 'expired',
      amount: 89000,
      start_date: '2025-06-01',
      end_date: '2026-05-31',
      owner: t('crm.demo.owner_li'),
      sign_date: '2025-06-15',
      created_at: '2025-06-15 16:45:00',
    },
  ];

  const typeConfig = {
    sales: { label: t('crm.contract_redesign.type_sales'), variant: 'success' as const },
    purchase: { label: t('crm.contract_redesign.type_purchase'), variant: 'info' as const },
    service: { label: t('crm.contract_redesign.type_service'), variant: 'cyan' as const },
    framework: { label: t('crm.contract_redesign.type_framework'), variant: 'amber' as const },
  };

  const statusConfig = {
    draft: { label: t('crm.contract_redesign.status_draft'), variant: 'default' as const },
    pending: { label: t('crm.contract_redesign.status_pending'), variant: 'warning' as const },
    active: { label: t('crm.contract_redesign.status_active'), variant: 'success' as const },
    completed: { label: t('crm.contract_redesign.status_completed'), variant: 'info' as const },
    expired: { label: t('crm.contract_redesign.status_expired'), variant: 'default' as const },
    terminated: { label: t('crm.contract_redesign.status_terminated'), variant: 'error' as const },
  };

  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Contract | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMockData, setIsMockData] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, currentPage, pageSize, debouncedSearch, typeFilter],
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
        if (typeFilter !== 'all') {
          params.type = typeFilter;
        }
        const res = await apiClient.crm.get('/contracts', { params });
        const resData = res as unknown as { data?: unknown };
        let apiContracts: any[] = [];
        let total = 0;
        const data = resData.data;
        if (Array.isArray(data)) {
          apiContracts = data;
          total = data.length;
        } else if (data && typeof data === 'object') {
          const obj = data as Record<string, any>;
          apiContracts = Array.isArray(obj.list)
            ? obj.list
            : Array.isArray(obj.items)
              ? obj.items
              : [];
          total = obj.total || apiContracts.length;
        }
        if (apiContracts.length > 0) {
          setIsMockData(false);
          return { contracts: mapApiContracts(apiContracts), total };
        }
      } catch (e) {
        console.warn('[CRM Contracts] API unavailable, using mock data:', e);
        setIsMockData(true);
      }
      // Mock fallback：本地分页
      let filtered = mockContracts;
      if (debouncedSearch) {
        filtered = filtered.filter(
          (c) => c.contract_no.includes(debouncedSearch) || c.title.includes(debouncedSearch)
        );
      }
      if (typeFilter !== 'all') {
        filtered = filtered.filter((c) => c.type === typeFilter);
      }
      const start = (currentPage - 1) * pageSize;
      return { contracts: filtered.slice(start, start + pageSize), total: filtered.length };
    },
  });

  const contracts = data?.contracts || [];

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
      pushToast('success', t('crm.contract_redesign.toast_delete_success'));
    },
    onError: () => {
      pushToast('error', t('crm.contract_redesign.toast_delete_fail'));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Contract>) => {
      try {
        await apiClient.crm.post('/contracts', {
          contract_no: data.contract_no,
          title: data.title,
          customer_name: data.customer_name,
          amount: data.amount,
          status: data.status,
          sign_date: data.sign_date,
          start_date: data.start_date,
          end_date: data.end_date,
          owner: data.owner,
          type: data.type,
        });
      } catch (e) {
        console.warn('[CRM Contracts] Create API unavailable, using mock create:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', t('crm.contract_redesign.toast_create_success'));
    },
    onError: () => {
      pushToast('error', t('crm.contract_redesign.toast_create_fail'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Contract> }) => {
      try {
        await apiClient.crm.put(`/contracts/${id}`, data);
      } catch (e) {
        console.warn('[CRM Contracts] Update API unavailable, using mock update:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', t('crm.contract_redesign.toast_update_success'));
    },
    onError: () => {
      pushToast('error', t('crm.contract_redesign.toast_update_fail'));
    },
  });

  // 服务端分页：直接使用 API 返回的数据，不再本地筛选和分页
  const filteredContracts = contracts;
  const totalItems = (data as any)?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedContracts = filteredContracts;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, typeFilter, debouncedSearch]);

  const stats = useMemo(() => {
    const total = contracts.length;
    const active = contracts.filter((c) => c.status === 'active').length;
    const pending = contracts.filter((c) => c.status === 'pending').length;
    const activeAmount = contracts
      .filter((c) => c.status === 'active')
      .reduce((sum, c) => sum + c.amount, 0);
    return { total, active, pending, activeAmount };
  }, [contracts]);

  const tabsConfig = useMemo(
    () => [
      { id: 'all', label: t('crm.contract_redesign.tab_all') },
      { id: 'active', label: t('crm.contract_redesign.status_active'), badge: stats.active },
      { id: 'pending', label: t('crm.contract_redesign.status_pending'), badge: stats.pending },
      {
        id: 'completed',
        label: t('crm.contract_redesign.status_completed'),
        badge: contracts.filter((c) => c.status === 'completed').length,
      },
    ],
    [stats, contracts, t]
  );

  const columns: DataTableColumn<Contract>[] = useMemo(
    () => [
      {
        key: 'contract_no',
        header: t('crm.contract_redesign.col_contract_no'),
        sortable: true,
        render: (row) => (
          <span
            style={{
              fontWeight: 'var(--font-semibold)',
              color: 'var(--accent-primary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {row.contract_no}
          </span>
        ),
      },
      {
        key: 'title',
        header: t('crm.contract_redesign.col_title'),
        render: (row) => (
          <div>
            <div style={{ fontWeight: 500 }}>{row.title}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {row.customer_name}
            </div>
          </div>
        ),
      },
      {
        key: 'type',
        header: t('crm.contract_redesign.col_type'),
        align: 'center',
        render: (row) => {
          const config = typeConfig[row.type] || typeConfig.sales;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'amount',
        header: t('crm.contract_redesign.col_amount'),
        align: 'right',
        sortable: true,
        render: (row) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-semibold)' }}>
            {formatAmount(row.amount)}
          </span>
        ),
      },
      {
        key: 'start_date',
        header: t('crm.contract_redesign.col_start_date'),
        sortable: true,
      },
      {
        key: 'end_date',
        header: t('crm.contract_redesign.col_end_date'),
        sortable: true,
      },
      {
        key: 'owner',
        header: t('crm.contract_redesign.field_owner'),
        render: (row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <User
              size={14}
              style={{ color: 'var(--text-tertiary)' }}
            />
            <span>{row.owner}</span>
          </div>
        ),
      },
      {
        key: 'status',
        header: t('crm.contract_redesign.col_status'),
        align: 'center',
        render: (row) => {
          const config = statusConfig[row.status] || statusConfig.draft;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'actions',
        header: t('crm.contract_redesign.col_actions'),
        align: 'right',
        render: (row) => (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Eye size={14} />}
              onClick={() => {
                setSelectedContract(row);
                setDetailDrawerOpen(true);
              }}
            >
              {t('crm.contract_redesign.action_detail')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Edit2 size={14} />}
              onClick={() => {
                setSelectedContract(row);
                setCreateModalOpen(true);
              }}
            >
              {t('crm.contract_redesign.action_edit')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Trash2 size={14} />}
              onClick={() => setDeleteTarget(row)}
            >
              {t('crm.contract_redesign.action_delete')}
            </Button>
          </div>
        ),
      },
    ],
    [setSelectedContract, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget, t]
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
          {t('crm.contract_redesign.mock_banner')}
        </div>
      )}
      <ListPageTemplate<Contract>
        header={{
          title: t('crm.contract_redesign.title'),
          subtitle: t('crm.contract_redesign.subtitle'),
          breadcrumbs: [
            { label: t('crm.contract_redesign.breadcrumb_home'), href: '/dashboard' },
            { label: t('crm.contract_redesign.breadcrumb_crm') },
            { label: t('crm.contract_redesign.title') },
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
                placeholder={t('crm.contract_redesign.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: 'all', label: t('crm.contract_redesign.filter_type_all') },
                  { value: 'sales', label: t('crm.contract_redesign.type_sales') },
                  { value: 'purchase', label: t('crm.contract_redesign.type_purchase') },
                  { value: 'service', label: t('crm.contract_redesign.type_service') },
                  { value: 'framework', label: t('crm.contract_redesign.type_framework') },
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
                {t('crm.contract_redesign.btn_refresh')}
              </Button>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={() => {
                  setSelectedContract(null);
                  setCreateModalOpen(true);
                }}
              >
                {t('crm.contract_redesign.btn_create')}
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedContracts}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle={t('crm.contract_redesign.empty_title')}
        emptyDescription={t('crm.contract_redesign.empty_description')}
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label={t('crm.contract_redesign.stat_total')}
              value={stats.total}
              icon={FileText}
              accent='cyan'
            />
            <StatTile
              label={t('crm.contract_redesign.stat_active')}
              value={stats.active}
              icon={CheckCircle}
              accent='success'
            />
            <StatTile
              label={t('crm.contract_redesign.stat_pending')}
              value={stats.pending}
              icon={Clock}
              accent='warning'
            />
            <StatTile
              label={t('crm.contract_redesign.stat_active_amount')}
              value={formatAmount(stats.activeAmount)}
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

      {filteredContracts.length > 0 && (
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

      {/* 合同详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedContract(null);
        }}
        title={t('crm.contract_redesign.drawer_title')}
        size='lg'
      >
        {selectedContract && (
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
                    {selectedContract.contract_no}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-bold)',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    {selectedContract.title}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    {selectedContract.customer_name}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Badge variant={typeConfig[selectedContract.type]?.variant || 'default'}>
                    {typeConfig[selectedContract.type]?.label ||
                      t('crm.contract_redesign.label_unknown')}
                  </Badge>
                  <Badge variant={statusConfig[selectedContract.status]?.variant || 'default'}>
                    {statusConfig[selectedContract.status]?.label ||
                      t('crm.contract_redesign.label_unknown')}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card title={t('crm.contract_redesign.section_amount')}>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }}>
                {formatAmount(selectedContract.amount)}
              </div>
            </Card>

            <Card title={t('crm.contract_redesign.section_info')}>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('crm.contract_redesign.field_sign_date')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedContract.sign_date || t('crm.contract_redesign.not_signed')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('crm.contract_redesign.field_owner')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedContract.owner}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('crm.contract_redesign.col_start_date')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedContract.start_date}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('crm.contract_redesign.col_end_date')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedContract.end_date}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('crm.contract_redesign.field_create_time')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {formatDateTime(selectedContract.created_at)}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      {/* 新建/编辑合同弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={
          selectedContract
            ? t('crm.contract_redesign.modal_edit_title')
            : t('crm.contract_redesign.modal_create_title')
        }
        size='lg'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setCreateModalOpen(false)}
            >
              {t('crm.contract_redesign.btn_cancel')}
            </Button>
            <Button
              variant='primary'
              onClick={() => {
                const formData: Partial<Contract> = {
                  title: (document.getElementById('field-1') as HTMLInputElement)?.value || '',
                  customer_name:
                    (document.getElementById('field-2') as HTMLInputElement)?.value || '',
                  amount: Number(
                    (document.getElementById('field-4') as HTMLInputElement)?.value || 0
                  ),
                  sign_date: (document.getElementById('field-6') as HTMLInputElement)?.value || '',
                  end_date: (document.getElementById('field-7') as HTMLInputElement)?.value || '',
                  owner: '',
                };
                if (selectedContract) {
                  updateMutation.mutate({ id: selectedContract.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedContract
                ? t('crm.contract_redesign.btn_save')
                : t('crm.contract_redesign.btn_submit_create')}
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
              {t('crm.contract_redesign.field_title_required')}
            </label>
            <Input
              id='field-1'
              placeholder={t('crm.contract_redesign.ph_title_example')}
              defaultValue={selectedContract?.title}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor='field-2'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('crm.contract_redesign.field_customer_name_required')}
              </label>
              <Input
                id='field-2'
                placeholder={t('crm.contract_redesign.ph_customer_name')}
                defaultValue={selectedContract?.customer_name}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('crm.contract_redesign.field_type_required')}
              </label>
              <Select
                id='field-3'
                defaultValue={selectedContract?.type || 'sales'}
                options={[
                  { value: 'sales', label: t('crm.contract_redesign.type_sales') },
                  { value: 'purchase', label: t('crm.contract_redesign.type_purchase') },
                  { value: 'service', label: t('crm.contract_redesign.type_service') },
                  { value: 'framework', label: t('crm.contract_redesign.type_framework') },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('crm.contract_redesign.field_amount')}
              </label>
              <Input
                id='field-4'
                type='number'
                placeholder={t('crm.contract_redesign.ph_amount_example')}
                defaultValue={selectedContract?.amount}
              />
            </div>
            <div>
              <label
                htmlFor='field-5'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('crm.contract_redesign.field_status')}
              </label>
              <Select
                id='field-5'
                defaultValue={selectedContract?.status || 'draft'}
                options={[
                  { value: 'draft', label: t('crm.contract_redesign.status_draft') },
                  { value: 'pending', label: t('crm.contract_redesign.status_pending') },
                  { value: 'active', label: t('crm.contract_redesign.status_active') },
                  { value: 'completed', label: t('crm.contract_redesign.status_completed') },
                  { value: 'expired', label: t('crm.contract_redesign.status_expired') },
                  { value: 'terminated', label: t('crm.contract_redesign.status_terminated') },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-6'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('crm.contract_redesign.col_start_date')}
              </label>
              <Input
                id='field-6'
                type='date'
                defaultValue={selectedContract?.start_date}
              />
            </div>
            <div>
              <label
                htmlFor='field-7'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('crm.contract_redesign.col_end_date')}
              </label>
              <Input
                id='field-7'
                type='date'
                defaultValue={selectedContract?.end_date}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('crm.contract_redesign.delete_title')}
        size='sm'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setDeleteTarget(null)}
            >
              {t('crm.contract_redesign.btn_cancel')}
            </Button>
            <Button
              variant='danger'
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {t('crm.contract_redesign.btn_confirm_delete')}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          {t('crm.contract_redesign.delete_confirm_message', { name: deleteTarget?.title })}
        </p>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

export default CrmContractRedesignPage;
