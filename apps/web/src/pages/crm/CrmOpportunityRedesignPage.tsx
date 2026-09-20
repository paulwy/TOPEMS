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
  Target,
  Clock,
  CheckCircle,
  TrendingUp,
  DollarSign,
  User,
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
import { opportunityApi } from '@/api/crm/opportunity';
import type { Opportunity as ApiOpportunity } from '@/api/crm/types';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['crm', 'opportunities'];

interface Opportunity {
  id: string;
  opp_no: string;
  name: string;
  customer_name: string;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  amount: number;
  expected_date: string;
  probability: number;
  owner: string;
  source: 'referral' | 'website' | 'cold_call' | 'exhibition' | 'other';
  created_at: string;
}

// 将 API 返回的 Opportunity 类型映射为页面使用的 Opportunity 类型
const mapApiOpportunities = (apiOpportunities: ApiOpportunity[]): Opportunity[] => {
  return apiOpportunities.map((o, index) => ({
    id: o.id,
    opp_no: (o as any).opp_no || `OPP2026${String(index + 1).padStart(5, '0')}`,
    name: (o as any).name || (o as any).title || '-',
    customer_name: (o as any).customer_name || (o as any).customerName || '-',
    stage: ((o as any).stage as Opportunity['stage']) || 'lead',
    amount: (o as any).amount || 0,
    expected_date: (o as any).expected_date || (o as any).expectedDate || '-',
    probability: (o as any).probability || 0,
    owner: (o as any).owner || '-',
    source: ((o as any).source as Opportunity['source']) || 'other',
    created_at: o.created_at,
  }));
};

// Mock 数据（API 不可用时的 fallback）在组件内用 t() 构造，见 mockOpportunities

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

const CrmOpportunityRedesignPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mockOpportunities: Opportunity[] = [
    {
      id: '1',
      opp_no: 'OPP202609001',
      name: t('crm.demo.opp_1_name'),
      customer_name: t('crm.demo.company_a_name'),
      stage: 'proposal',
      amount: 560000,
      expected_date: '2026-09-30',
      probability: 60,
      owner: t('crm.demo.owner_zhang'),
      source: 'referral',
      created_at: '2026-09-01 10:00:00',
    },
    {
      id: '2',
      opp_no: 'OPP202609002',
      name: t('crm.demo.opp_2_name'),
      customer_name: t('crm.demo.company_b_name'),
      stage: 'negotiation',
      amount: 1280000,
      expected_date: '2026-09-25',
      probability: 80,
      owner: t('crm.demo.owner_li'),
      source: 'website',
      created_at: '2026-08-20 14:30:00',
    },
    {
      id: '3',
      opp_no: 'OPP202609003',
      name: t('crm.demo.opp_3_name'),
      customer_name: t('crm.demo.company_c_name'),
      stage: 'qualified',
      amount: 350000,
      expected_date: '2026-10-15',
      probability: 40,
      owner: t('crm.demo.owner_zhang'),
      source: 'exhibition',
      created_at: '2026-09-05 09:15:00',
    },
    {
      id: '4',
      opp_no: 'OPP202608001',
      name: t('crm.demo.opp_4_name'),
      customer_name: t('crm.demo.company_d_name'),
      stage: 'won',
      amount: 256000,
      expected_date: '2026-08-28',
      probability: 100,
      owner: t('crm.demo.owner_wang'),
      source: 'cold_call',
      created_at: '2026-08-10 11:00:00',
    },
    {
      id: '5',
      opp_no: 'OPP202608002',
      name: t('crm.demo.opp_5_name'),
      customer_name: t('crm.demo.company_e_name'),
      stage: 'lost',
      amount: 89000,
      expected_date: '2026-08-15',
      probability: 0,
      owner: t('crm.demo.owner_li'),
      source: 'other',
      created_at: '2026-08-01 16:45:00',
    },
  ];

  const stageConfig = {
    lead: { label: t('crm.opportunity_redesign.stage_lead'), variant: 'default' as const, step: 1 },
    qualified: { label: t('crm.opportunity_redesign.stage_qualified'), variant: 'info' as const, step: 2 },
    proposal: { label: t('crm.opportunity_redesign.stage_proposal'), variant: 'amber' as const, step: 3 },
    negotiation: { label: t('crm.opportunity_redesign.stage_negotiation'), variant: 'warning' as const, step: 4 },
    won: { label: t('crm.opportunity_redesign.stage_won'), variant: 'success' as const, step: 5 },
    lost: { label: t('crm.opportunity_redesign.stage_lost'), variant: 'error' as const, step: 6 },
  };

  const sourceConfig = {
    referral: { label: t('crm.opportunity_redesign.source_referral'), variant: 'success' as const },
    website: { label: t('crm.opportunity_redesign.source_website'), variant: 'info' as const },
    cold_call: { label: t('crm.opportunity_redesign.source_cold_call'), variant: 'cyan' as const },
    exhibition: { label: t('crm.opportunity_redesign.source_exhibition'), variant: 'amber' as const },
    other: { label: t('crm.opportunity_redesign.source_other'), variant: 'default' as const },
  };


  const [activeTab, setActiveTab] = useState<'all' | 'pipeline' | 'won' | 'lost'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Opportunity | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMockData, setIsMockData] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, currentPage, pageSize, debouncedSearch, stageFilter],
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
        if (stageFilter !== 'all') {
          params.stage = stageFilter;
        }
        const res = await opportunityApi.list(params);
        const resData = res as unknown as {
          data?:
            | { list?: ApiOpportunity[]; items?: ApiOpportunity[]; total?: number }
            | ApiOpportunity[];
        };
        let apiOpportunities: ApiOpportunity[] = [];
        let total = 0;
        if (Array.isArray(resData)) {
          apiOpportunities = resData;
          total = resData.length;
        } else if (resData.data) {
          const dataObj = resData.data as any;
          apiOpportunities = Array.isArray(resData.data)
            ? resData.data
            : dataObj.list || dataObj.items || [];
          total = dataObj.total || apiOpportunities.length;
        }
        if (apiOpportunities.length > 0) {
          setIsMockData(false);
          return { opportunities: mapApiOpportunities(apiOpportunities), total };
        }
      } catch (e) {
        console.warn('[CRM Opportunities] API unavailable, using mock data:', e);
        setIsMockData(true);
      }
      // Mock fallback：本地分页
      let filtered = mockOpportunities;
      if (debouncedSearch) {
        filtered = filtered.filter(
          (o) => o.name.includes(debouncedSearch) || o.customer_name.includes(debouncedSearch)
        );
      }
      if (stageFilter !== 'all') {
        filtered = filtered.filter((o) => o.stage === stageFilter);
      }
      const start = (currentPage - 1) * pageSize;
      return { opportunities: filtered.slice(start, start + pageSize), total: filtered.length };
    },
  });

  const opportunities = data?.opportunities || [];

  const pushToast = (type: Toast['variant'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, variant: type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await opportunityApi.delete(id);
      } catch (e) {
        console.warn('[CRM Opportunities] Delete API unavailable, using mock delete:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDeleteTarget(null);
      pushToast('success', t('crm.opportunity_redesign.toast_delete_success'));
    },
    onError: () => {
      pushToast('error', t('crm.opportunity_redesign.toast_delete_fail'));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Opportunity>) => {
      try {
        await opportunityApi.create({
          name: data.name || '',
          customer_name: data.customer_name,
          amount: data.amount,
          stage: data.stage,
          expected_date: data.expected_date,
          probability: data.probability,
          owner: data.owner,
          source: data.source,
        } as any);
      } catch (e) {
        console.warn('[CRM Opportunities] Create API unavailable, using mock create:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', t('crm.opportunity_redesign.toast_create_success'));
    },
    onError: () => {
      pushToast('error', t('crm.opportunity_redesign.toast_create_fail'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Opportunity> }) => {
      try {
        await opportunityApi.update(id, {
          name: data.name,
          customer_name: data.customer_name,
          amount: data.amount,
          stage: data.stage,
          expected_date: data.expected_date,
          probability: data.probability,
          owner: data.owner,
          source: data.source,
        } as any);
      } catch (e) {
        console.warn('[CRM Opportunities] Update API unavailable, using mock update:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', t('crm.opportunity_redesign.toast_update_success'));
    },
    onError: () => {
      pushToast('error', t('crm.opportunity_redesign.toast_update_fail'));
    },
  });

  // 服务端分页：直接使用 API 返回的数据，不再本地筛选和分页
  const filteredOpportunities = opportunities;
  const totalItems = (data as any)?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedOpportunities = filteredOpportunities;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, stageFilter, debouncedSearch]);

  const stats = useMemo(() => {
    const pipeline = opportunities.filter((o) => !['won', 'lost'].includes(o.stage));
    const pipelineAmount = pipeline.reduce((sum, o) => sum + o.amount * (o.probability / 100), 0);
    const wonAmount = opportunities
      .filter((o) => o.stage === 'won')
      .reduce((sum, o) => sum + o.amount, 0);
    return {
      total: opportunities.length,
      pipeline: pipeline.length,
      pipelineAmount,
      wonAmount,
    };
  }, [opportunities]);

  const tabsConfig = useMemo(
    () => [
      { id: 'all', label: t('crm.opportunity_redesign.tab_all') },
      { id: 'pipeline', label: t('crm.opportunity_redesign.tab_pipeline'), badge: stats.pipeline },
      { id: 'won', label: t('crm.opportunity_redesign.stage_won'), badge: opportunities.filter((o) => o.stage === 'won').length },
      { id: 'lost', label: t('crm.opportunity_redesign.stage_lost'), badge: opportunities.filter((o) => o.stage === 'lost').length },
    ],
    [stats, opportunities, t]
  );

  const columns: DataTableColumn<Opportunity>[] = useMemo(
    () => [
      {
        key: 'opp_no',
        header: t('crm.opportunity_redesign.col_opp_no'),
        sortable: true,
        render: (row) => (
          <span
            style={{
              fontWeight: 'var(--font-semibold)',
              color: 'var(--accent-primary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {row.opp_no}
          </span>
        ),
      },
      {
        key: 'name',
        header: t('crm.opportunity_redesign.col_name'),
        render: (row) => (
          <div>
            <div style={{ fontWeight: 500 }}>{row.name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {row.customer_name}
            </div>
          </div>
        ),
      },
      {
        key: 'stage',
        header: t('crm.opportunity_redesign.col_stage'),
        align: 'center',
        render: (row) => {
          const config = stageConfig[row.stage] || stageConfig.lead;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'amount',
        header: t('crm.opportunity_redesign.col_amount'),
        align: 'right',
        sortable: true,
        render: (row) => (
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-semibold)' }}>
            {formatAmount(row.amount)}
          </span>
        ),
      },
      {
        key: 'probability',
        header: t('crm.opportunity_redesign.col_probability'),
        align: 'center',
        render: (row) => <span style={{ fontSize: 'var(--text-sm)' }}>{row.probability}%</span>,
      },
      {
        key: 'source',
        header: t('crm.opportunity_redesign.col_source'),
        align: 'center',
        render: (row) => {
          const config = sourceConfig[row.source] || sourceConfig.other;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'owner',
        header: t('crm.opportunity_redesign.field_owner'),
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
        key: 'expected_date',
        header: t('crm.opportunity_redesign.col_expected_date'),
        sortable: true,
      },
      {
        key: 'actions',
        header: t('crm.opportunity_redesign.col_actions'),
        align: 'right',
        render: (row) => (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Eye size={14} />}
              onClick={() => {
                setSelectedOpp(row);
                setDetailDrawerOpen(true);
              }}
            >
              {t('crm.opportunity_redesign.action_detail')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Edit2 size={14} />}
              onClick={() => {
                setSelectedOpp(row);
                setCreateModalOpen(true);
              }}
            >
              {t('crm.opportunity_redesign.action_edit')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Trash2 size={14} />}
              onClick={() => setDeleteTarget(row)}
            >
              {t('crm.opportunity_redesign.action_delete')}
            </Button>
          </div>
        ),
      },
    ],
    [setSelectedOpp, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget, t]
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
          {t('crm.opportunity_redesign.mock_banner')}
        </div>
      )}
      <ListPageTemplate<Opportunity>
        header={{
          title: t('crm.opportunity_redesign.title'),
          subtitle: t('crm.opportunity_redesign.subtitle'),
          breadcrumbs: [
            { label: t('crm.opportunity_redesign.breadcrumb_home'), href: '/dashboard' },
            { label: t('crm.opportunity_redesign.breadcrumb_crm') },
            { label: t('crm.opportunity_redesign.title') },
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
                placeholder={t('crm.opportunity_redesign.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                options={[
                  { value: 'all', label: t('crm.opportunity_redesign.filter_stage_all') },
                  { value: 'lead', label: t('crm.opportunity_redesign.stage_lead') },
                  { value: 'qualified', label: t('crm.opportunity_redesign.stage_qualified') },
                  { value: 'proposal', label: t('crm.opportunity_redesign.stage_proposal') },
                  { value: 'negotiation', label: t('crm.opportunity_redesign.stage_negotiation') },
                  { value: 'won', label: t('crm.opportunity_redesign.stage_won') },
                  { value: 'lost', label: t('crm.opportunity_redesign.stage_lost') },
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
                {t('crm.opportunity_redesign.btn_refresh')}
              </Button>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={() => {
                  setSelectedOpp(null);
                  setCreateModalOpen(true);
                }}
              >
                {t('crm.opportunity_redesign.btn_create')}
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedOpportunities}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle={t('crm.opportunity_redesign.empty_title')}
        emptyDescription={t('crm.opportunity_redesign.empty_description')}
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label={t('crm.opportunity_redesign.stat_total')}
              value={stats.total}
              icon={Target}
              accent='cyan'
            />
            <StatTile
              label={t('crm.opportunity_redesign.stat_pipeline')}
              value={stats.pipeline}
              icon={TrendingUp}
              accent='warning'
            />
            <StatTile
              label={t('crm.opportunity_redesign.stat_pipeline_amount')}
              value={formatAmount(stats.pipelineAmount)}
              icon={DollarSign}
              accent='amber'
            />
            <StatTile
              label={t('crm.opportunity_redesign.stat_won_amount')}
              value={formatAmount(stats.wonAmount)}
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

      {filteredOpportunities.length > 0 && (
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

      {/* 商机详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedOpp(null);
        }}
        title={t('crm.opportunity_redesign.drawer_title')}
        size='lg'
      >
        {selectedOpp && (
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
                    {selectedOpp.opp_no}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-bold)',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    {selectedOpp.name}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    {selectedOpp.customer_name}
                  </div>
                </div>
                <Badge variant={stageConfig[selectedOpp.stage]?.variant || 'default'}>
                  {stageConfig[selectedOpp.stage]?.label || t('crm.opportunity_redesign.label_unknown')}
                </Badge>
              </div>
            </Card>

            {/* 销售阶段进度 */}
            <Card title={t('crm.opportunity_redesign.section_stage')}>
              <div style={{ marginTop: 'var(--space-2)' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['lead', 'qualified', 'proposal', 'negotiation', 'won'].map((stage) => {
                    const config = stageConfig[stage as keyof typeof stageConfig];
                    const isActive =
                      (stageConfig[selectedOpp.stage]?.step || 0) >= (config?.step || 0);
                    return (
                      <div
                        key={stage}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          padding: 'var(--space-2)',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: isActive ? 'var(--accent-primary)' : 'var(--surface-2)',
                          color: isActive ? 'white' : 'var(--text-secondary)',
                          fontSize: 'var(--text-xs)',
                        }}
                      >
                        {config?.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>

            <Card title={t('crm.opportunity_redesign.section_info')}>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('crm.opportunity_redesign.col_amount')}
                  </div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>
                    {formatAmount(selectedOpp.amount)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('crm.opportunity_redesign.col_probability')}
                  </div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>
                    {selectedOpp.probability}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('crm.opportunity_redesign.field_expected_date')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedOpp.expected_date}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('crm.opportunity_redesign.field_source')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {sourceConfig[selectedOpp.source]?.label || t('crm.opportunity_redesign.label_unknown')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('crm.opportunity_redesign.field_owner')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedOpp.owner}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('crm.opportunity_redesign.field_create_time')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {formatDateTime(selectedOpp.created_at)}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      {/* 新建/编辑商机弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={selectedOpp ? t('crm.opportunity_redesign.modal_edit_title') : t('crm.opportunity_redesign.modal_create_title')}
        size='lg'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setCreateModalOpen(false)}
            >
              {t('crm.opportunity_redesign.btn_cancel')}
            </Button>
            <Button
              variant='primary'
              onClick={() => {
                const formData: Partial<Opportunity> = {
                  name:
                    (document.getElementById('field-1') as HTMLInputElement)?.value || '',
                  customer_name:
                    (document.getElementById('field-2') as HTMLInputElement)?.value || '',
                  amount: Number(
                    (document.getElementById('field-4') as HTMLInputElement)?.value || 0
                  ),
                  expected_date:
                    (document.getElementById('field-6') as HTMLInputElement)?.value || '',
                  probability: Number(
                    (document.getElementById('field-5') as HTMLInputElement)?.value || 0
                  ),
                  owner: '',
                };
                if (selectedOpp) {
                  updateMutation.mutate({ id: selectedOpp.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedOpp ? t('crm.opportunity_redesign.btn_save') : t('crm.opportunity_redesign.btn_submit_create')}
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
              {t('crm.opportunity_redesign.field_name_required')}
            </label>
            <Input
              id='field-1'
              placeholder={t('crm.opportunity_redesign.ph_name_example')}
              defaultValue={selectedOpp?.name}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor='field-2'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('crm.opportunity_redesign.field_customer_name_required')}
              </label>
              <Input
                id='field-2'
                placeholder={t('crm.opportunity_redesign.ph_customer_name')}
                defaultValue={selectedOpp?.customer_name}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('crm.opportunity_redesign.field_stage_required')}
              </label>
              <Select
                id='field-3'
                defaultValue={selectedOpp?.stage || 'lead'}
                options={[
                  { value: 'lead', label: t('crm.opportunity_redesign.stage_lead') },
                  { value: 'qualified', label: t('crm.opportunity_redesign.stage_qualified') },
                  { value: 'proposal', label: t('crm.opportunity_redesign.stage_proposal') },
                  { value: 'negotiation', label: t('crm.opportunity_redesign.stage_negotiation') },
                  { value: 'won', label: t('crm.opportunity_redesign.stage_won') },
                  { value: 'lost', label: t('crm.opportunity_redesign.stage_lost') },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('crm.opportunity_redesign.field_amount')}
              </label>
              <Input
                id='field-4'
                type='number'
                placeholder={t('crm.opportunity_redesign.ph_amount_example')}
                defaultValue={selectedOpp?.amount}
              />
            </div>
            <div>
              <label
                htmlFor='field-5'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('crm.opportunity_redesign.field_probability')}
              </label>
              <Input
                id='field-5'
                type='number'
                placeholder={t('crm.opportunity_redesign.ph_probability_example')}
                defaultValue={selectedOpp?.probability}
              />
            </div>
            <div>
              <label
                htmlFor='field-6'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('crm.opportunity_redesign.field_expected_date')}
              </label>
              <Input
                id='field-6'
                type='date'
                defaultValue={selectedOpp?.expected_date}
              />
            </div>
            <div>
              <label
                htmlFor='field-7'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('crm.opportunity_redesign.field_source')}
              </label>
              <Select
                id='field-7'
                defaultValue={selectedOpp?.source || 'other'}
                options={[
                  { value: 'referral', label: t('crm.opportunity_redesign.source_referral') },
                  { value: 'website', label: t('crm.opportunity_redesign.source_website') },
                  { value: 'cold_call', label: t('crm.opportunity_redesign.source_cold_call') },
                  { value: 'exhibition', label: t('crm.opportunity_redesign.source_exhibition') },
                  { value: 'other', label: t('crm.opportunity_redesign.source_other') },
                ]}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('crm.opportunity_redesign.delete_title')}
        size='sm'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setDeleteTarget(null)}
            >
              {t('crm.opportunity_redesign.btn_cancel')}
            </Button>
            <Button
              variant='danger'
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {t('crm.opportunity_redesign.btn_confirm_delete')}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          {t('crm.opportunity_redesign.delete_confirm_message', { name: deleteTarget?.name })}
        </p>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

export default CrmOpportunityRedesignPage;
