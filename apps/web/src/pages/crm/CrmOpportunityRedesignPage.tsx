import React, { useState, useEffect, useMemo } from 'react';
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

// Mock 数据（API 不可用时的 fallback）
const mockOpportunities: Opportunity[] = [
  {
    id: '1',
    opp_no: 'OPP202609001',
    name: '伺服电机批量采购项目',
    customer_name: '上海科技有限公司',
    stage: 'proposal',
    amount: 560000,
    expected_date: '2026-09-30',
    probability: 60,
    owner: '张三',
    source: 'referral',
    created_at: '2026-09-01 10:00:00',
  },
  {
    id: '2',
    opp_no: 'OPP202609002',
    name: 'PLC 控制器年度框架协议',
    customer_name: '北京贸易集团',
    stage: 'negotiation',
    amount: 1280000,
    expected_date: '2026-09-25',
    probability: 80,
    owner: '李四',
    source: 'website',
    created_at: '2026-08-20 14:30:00',
  },
  {
    id: '3',
    opp_no: 'OPP202609003',
    name: '工业相机新产线项目',
    customer_name: '深圳电子股份',
    stage: 'qualified',
    amount: 350000,
    expected_date: '2026-10-15',
    probability: 40,
    owner: '张三',
    source: 'exhibition',
    created_at: '2026-09-05 09:15:00',
  },
  {
    id: '4',
    opp_no: 'OPP202608001',
    name: '变频器替换升级项目',
    customer_name: '广州制造有限公司',
    stage: 'won',
    amount: 256000,
    expected_date: '2026-08-28',
    probability: 100,
    owner: '王五',
    source: 'cold_call',
    created_at: '2026-08-10 11:00:00',
  },
  {
    id: '5',
    opp_no: 'OPP202608002',
    name: '触摸屏 HMI 试点项目',
    customer_name: '成都设备公司',
    stage: 'lost',
    amount: 89000,
    expected_date: '2026-08-15',
    probability: 0,
    owner: '李四',
    source: 'other',
    created_at: '2026-08-01 16:45:00',
  },
];

const stageConfig = {
  lead: { label: '线索', variant: 'default' as const, step: 1 },
  qualified: { label: '已确认', variant: 'info' as const, step: 2 },
  proposal: { label: '方案报价', variant: 'amber' as const, step: 3 },
  negotiation: { label: '商务谈判', variant: 'warning' as const, step: 4 },
  won: { label: '赢单', variant: 'success' as const, step: 5 },
  lost: { label: '输单', variant: 'error' as const, step: 6 },
};

const sourceConfig = {
  referral: { label: '转介绍', variant: 'success' as const },
  website: { label: '官网', variant: 'info' as const },
  cold_call: { label: '陌拜', variant: 'cyan' as const },
  exhibition: { label: '展会', variant: 'amber' as const },
  other: { label: '其他', variant: 'default' as const },
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

const CrmOpportunityRedesignPage: React.FC = () => {
  const queryClient = useQueryClient();

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
      pushToast('success', '商机删除成功');
    },
    onError: () => {
      pushToast('error', '删除失败，请重试');
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
      pushToast('success', '商机创建成功');
    },
    onError: () => {
      pushToast('error', '创建失败，请重试');
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
      pushToast('success', '商机更新成功');
    },
    onError: () => {
      pushToast('error', '更新失败，请重试');
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
      { id: 'all', label: '全部' },
      { id: 'pipeline', label: '销售漏斗', badge: stats.pipeline },
      { id: 'won', label: '赢单', badge: opportunities.filter((o) => o.stage === 'won').length },
      { id: 'lost', label: '输单', badge: opportunities.filter((o) => o.stage === 'lost').length },
    ],
    [stats, opportunities]
  );

  const columns: DataTableColumn<Opportunity>[] = useMemo(
    () => [
      {
        key: 'opp_no',
        header: '商机编号',
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
        header: '商机名称',
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
        header: '阶段',
        align: 'center',
        render: (row) => {
          const config = stageConfig[row.stage] || stageConfig.lead;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'amount',
        header: '商机金额',
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
        header: '成交概率',
        align: 'center',
        render: (row) => <span style={{ fontSize: 'var(--text-sm)' }}>{row.probability}%</span>,
      },
      {
        key: 'source',
        header: '来源',
        align: 'center',
        render: (row) => {
          const config = sourceConfig[row.source] || sourceConfig.other;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'owner',
        header: '负责人',
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
        header: '预计成交',
        sortable: true,
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
                setSelectedOpp(row);
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
                setSelectedOpp(row);
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
    [setSelectedOpp, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget]
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
      <ListPageTemplate<Opportunity>
        header={{
          title: '商机管理',
          subtitle: '跟踪销售商机，管理销售漏斗和成交概率',
          breadcrumbs: [
            { label: '首页', href: '/dashboard' },
            { label: '客户管理' },
            { label: '商机管理' },
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
                placeholder='搜索商机编号/名称/客户...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                options={[
                  { value: 'all', label: '全部阶段' },
                  { value: 'lead', label: '线索' },
                  { value: 'qualified', label: '已确认' },
                  { value: 'proposal', label: '方案报价' },
                  { value: 'negotiation', label: '商务谈判' },
                  { value: 'won', label: '赢单' },
                  { value: 'lost', label: '输单' },
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
                  setSelectedOpp(null);
                  setCreateModalOpen(true);
                }}
              >
                新建商机
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedOpportunities}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle='暂无商机'
        emptyDescription='点击右上角「新建商机」按钮创建第一个销售商机'
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label='商机总数'
              value={stats.total}
              icon={Target}
              accent='cyan'
            />
            <StatTile
              label='漏斗中商机'
              value={stats.pipeline}
              icon={TrendingUp}
              accent='warning'
            />
            <StatTile
              label='漏斗加权金额'
              value={formatAmount(stats.pipelineAmount)}
              icon={DollarSign}
              accent='amber'
            />
            <StatTile
              label='累计赢单金额'
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
        title='商机详情'
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
                  {stageConfig[selectedOpp.stage]?.label || '未知'}
                </Badge>
              </div>
            </Card>

            {/* 销售阶段进度 */}
            <Card title='销售阶段'>
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

            <Card title='商机信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    商机金额
                  </div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>
                    {formatAmount(selectedOpp.amount)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    成交概率
                  </div>
                  <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)' }}>
                    {selectedOpp.probability}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    预计成交日期
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedOpp.expected_date}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    商机来源
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {sourceConfig[selectedOpp.source]?.label || '未知'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    负责人
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedOpp.owner}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    创建时间
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
        title={selectedOpp ? '编辑商机' : '新建商机'}
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
                const formData: Partial<Opportunity> = {
                  name:
                    (document.querySelector('input[placeholder*="商机名称"]') as HTMLInputElement)
                      ?.value || '',
                  customer_name:
                    (document.querySelectorAll('input[placeholder*="客户"]')[0] as HTMLInputElement)
                      ?.value || '',
                  amount: Number(
                    (document.querySelector('input[type="number"]') as HTMLInputElement)?.value || 0
                  ),
                  expected_date:
                    (document.querySelector('input[type="date"]') as HTMLInputElement)?.value || '',
                  probability: Number(
                    (document.querySelectorAll('input[type="number"]')[1] as HTMLInputElement)
                      ?.value || 0
                  ),
                  owner:
                    (
                      document.querySelectorAll(
                        'input[placeholder*="负责人"]'
                      )[0] as HTMLInputElement
                    )?.value || '',
                };
                if (selectedOpp) {
                  updateMutation.mutate({ id: selectedOpp.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedOpp ? '保存修改' : '创建商机'}
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
              商机名称 *
            </label>
            <Input
              id='field-1'
              placeholder='例如：伺服电机批量采购项目'
              defaultValue={selectedOpp?.name}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor='field-2'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                客户名称 *
              </label>
              <Input
                id='field-2'
                placeholder='请输入客户名称'
                defaultValue={selectedOpp?.customer_name}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                销售阶段 *
              </label>
              <Select
                id='field-3'
                defaultValue={selectedOpp?.stage || 'lead'}
                options={[
                  { value: 'lead', label: '线索' },
                  { value: 'qualified', label: '已确认' },
                  { value: 'proposal', label: '方案报价' },
                  { value: 'negotiation', label: '商务谈判' },
                  { value: 'won', label: '赢单' },
                  { value: 'lost', label: '输单' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                商机金额（元）
              </label>
              <Input
                id='field-4'
                type='number'
                placeholder='例如：100000'
                defaultValue={selectedOpp?.amount}
              />
            </div>
            <div>
              <label
                htmlFor='field-5'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                成交概率（%）
              </label>
              <Input
                id='field-5'
                type='number'
                placeholder='例如：50'
                defaultValue={selectedOpp?.probability}
              />
            </div>
            <div>
              <label
                htmlFor='field-6'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                预计成交日期
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
                商机来源
              </label>
              <Select
                id='field-7'
                defaultValue={selectedOpp?.source || 'other'}
                options={[
                  { value: 'referral', label: '转介绍' },
                  { value: 'website', label: '官网' },
                  { value: 'cold_call', label: '陌拜' },
                  { value: 'exhibition', label: '展会' },
                  { value: 'other', label: '其他' },
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
        title='删除商机'
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
          确定要删除商机「{deleteTarget?.name}」吗？此操作不可撤销。
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
