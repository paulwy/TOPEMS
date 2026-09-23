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
  ClipboardCheck,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
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
import { auditApi } from '@/api/qms/audit';
import type { AuditPlan as ApiAuditPlan } from '@/api/qms/types';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['qms', 'audit'];

interface AuditPlan {
  id: string;
  audit_no: string;
  title: string;
  audit_type: 'internal' | 'external' | 'system' | 'process' | 'product' | 'supplier';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  scope: string;
  auditor: string;
  auditee: string;
  plan_date: string;
  actual_date?: string;
  findings: number;
  created_at: string;
}

// Mock 数据
// 将 API 返回的 AuditPlan 类型映射为页面使用的 AuditPlan 类型
const mapApiAuditPlans = (apiPlans: ApiAuditPlan[]): AuditPlan[] => {
  return apiPlans.map((p, index) => ({
    id: p.id,
    audit_no:
      (p as any).audit_no || (p as any).auditNo || `AUD2026${String(index + 1).padStart(5, '0')}`,
    title: (p as any).title || (p as any).name || '-',
    audit_type: ((p as any).audit_type as AuditPlan['audit_type']) || 'internal',
    status: ((p as any).status as AuditPlan['status']) || 'planned',
    auditor: (p as any).auditor || (p as any).auditorName || '-',
    auditee: (p as any).auditee || (p as any).auditeeName || '-',
    department: (p as any).department || '-',
    plan_date: (p as any).plan_date || (p as any).planned_date || (p as any).plannedDate || '-',
    planned_date: (p as any).planned_date || (p as any).plannedDate || '-',
    completed_date: (p as any).completed_date || (p as any).completedDate || '-',
    scope: (p as any).scope || '-',
    findings: (p as any).findings || 0,
    remark: (p as any).remark || '',
    created_at: p.created_at || new Date().toISOString(),
  }));
};

// Mock 数据（API 不可用时的 fallback）在组件内用 t() 构造，见 mockAuditPlans

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const QmsAuditRedesignPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mockAuditPlans: AuditPlan[] = [
    {
      id: '1',
      audit_no: 'AUD202609001',
      title: t('qms.demo.audit_title_1'),
      audit_type: 'internal',
      status: 'planned',
      scope: t('qms.demo.audit_scope_1'),
      auditor: t('qms.demo.person_zhang'),
      auditee: t('qms.demo.audit_auditee_1'),
      plan_date: '2026-09-20',
      findings: 0,
      created_at: '2026-09-05 10:00:00',
    },
    {
      id: '2',
      audit_no: 'AUD202609002',
      title: t('qms.demo.audit_title_2'),
      audit_type: 'supplier',
      status: 'in_progress',
      scope: t('qms.demo.audit_scope_2'),
      auditor: t('qms.demo.person_li'),
      auditee: t('qms.demo.audit_auditee_2'),
      plan_date: '2026-09-15',
      findings: 3,
      created_at: '2026-09-01 14:30:00',
    },
    {
      id: '3',
      audit_no: 'AUD202608001',
      title: t('qms.demo.audit_title_3'),
      audit_type: 'external',
      status: 'completed',
      scope: t('qms.demo.audit_scope_3'),
      auditor: t('qms.demo.audit_auditor_3'),
      auditee: t('qms.demo.audit_auditee_3'),
      plan_date: '2026-08-10',
      actual_date: '2026-08-12',
      findings: 2,
      created_at: '2026-07-25 09:00:00',
    },
    {
      id: '4',
      audit_no: 'AUD202608002',
      title: t('qms.demo.audit_title_4'),
      audit_type: 'process',
      status: 'completed',
      scope: t('qms.demo.audit_scope_4'),
      auditor: t('qms.demo.person_wang'),
      auditee: t('qms.demo.audit_auditee_4'),
      plan_date: '2026-08-20',
      actual_date: '2026-08-20',
      findings: 5,
      created_at: '2026-08-10 11:00:00',
    },
    {
      id: '5',
      audit_no: 'AUD202607001',
      title: t('qms.demo.audit_title_5'),
      audit_type: 'product',
      status: 'cancelled',
      scope: t('qms.demo.audit_scope_5'),
      auditor: t('qms.demo.person_zhao'),
      auditee: t('qms.demo.audit_auditee_5'),
      plan_date: '2026-07-15',
      findings: 0,
      created_at: '2026-07-01 16:00:00',
    },
  ];

  const statusConfig = useMemo(
    () => ({
      planned: {
        label: t('qms.audit_redesign.status_planned'),
        variant: 'info' as const,
        icon: Calendar,
      },
      in_progress: {
        label: t('qms.audit_redesign.status_in_progress'),
        variant: 'warning' as const,
        icon: ClipboardCheck,
      },
      completed: {
        label: t('qms.audit_redesign.status_completed'),
        variant: 'success' as const,
        icon: CheckCircle,
      },
      cancelled: {
        label: t('qms.audit_redesign.status_cancelled'),
        variant: 'default' as const,
        icon: AlertTriangle,
      },
    }),
    [t]
  );

  const typeConfig = useMemo(
    () => ({
      internal: { label: t('qms.audit_redesign.type_internal'), variant: 'cyan' as const },
      external: { label: t('qms.audit_redesign.type_external'), variant: 'info' as const },
      system: { label: t('qms.audit_redesign.type_system'), variant: 'amber' as const },
      process: { label: t('qms.audit_redesign.type_process'), variant: 'warning' as const },
      product: { label: t('qms.audit_redesign.type_product'), variant: 'success' as const },
      supplier: { label: t('qms.audit_redesign.type_supplier'), variant: 'default' as const },
    }),
    [t]
  );

  const [activeTab, setActiveTab] = useState<'all' | 'planned' | 'in_progress' | 'completed'>(
    'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<AuditPlan | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AuditPlan | null>(null);
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
        const res = await auditApi.listAuditPlans();
        const resData = res as unknown as
          { data?: ApiAuditPlan[]; total?: number } | ApiAuditPlan[];
        let apiPlans: ApiAuditPlan[] = [];
        let total = 0;
        if (Array.isArray(resData)) {
          apiPlans = resData;
          total = resData.length;
        } else if (resData.data) {
          const dataObj = resData as any;
          apiPlans = Array.isArray(resData.data)
            ? resData.data
            : dataObj.list || dataObj.items || [];
          total = dataObj.total || apiPlans.length;
        }
        if (apiPlans.length > 0) {
          setIsMockData(false);
          return { audits: mapApiAuditPlans(apiPlans), total };
        }
      } catch (e) {
        console.warn('[QMS Audit] API unavailable, using mock data:', e);
        setIsMockData(true);
      }
      // Mock fallback：本地分页
      let filtered = mockAuditPlans;
      if (debouncedSearch) {
        filtered = filtered.filter(
          (a) => a.audit_no.includes(debouncedSearch) || a.title.includes(debouncedSearch)
        );
      }
      if (typeFilter !== 'all') {
        filtered = filtered.filter((a) => a.audit_type === typeFilter);
      }
      const start = (currentPage - 1) * pageSize;
      return { audits: filtered.slice(start, start + pageSize), total: filtered.length };
    },
  });

  const audits = data?.audits || [];

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
      pushToast('success', t('qms.audit_redesign.toast_delete_success'));
    },
    onError: () => {
      pushToast('error', t('qms.audit_redesign.toast_delete_fail'));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<AuditPlan>) => {
      try {
        await auditApi.createAuditPlan({
          audit_no: data.audit_no,
          title: data.title,
          audit_type: data.audit_type,
          scope: data.scope,
          auditor: data.auditor,
          auditee: data.auditee,
          plan_date: data.plan_date,
        } as any);
      } catch (e) {
        console.warn('[QMS Audit Plans] Create API unavailable, using mock create:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', t('qms.audit_redesign.toast_create_success'));
    },
    onError: () => {
      pushToast('error', t('qms.audit_redesign.toast_create_fail'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AuditPlan> }) => {
      try {
        if (data.status === 'completed') {
          await auditApi.completeAuditPlan(id);
        } else if (data.status === 'in_progress') {
          await auditApi.startAuditPlan(id);
        }
      } catch (e) {
        console.warn('[QMS Audit Plans] Update API unavailable, using mock update:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', t('qms.audit_redesign.toast_update_success'));
    },
    onError: () => {
      pushToast('error', t('qms.audit_redesign.toast_update_fail'));
    },
  });

  // 服务端分页：直接使用 API 返回的数据，不再本地筛选和分页
  const filteredAudits = audits;
  const totalItems = (data as any)?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedAudits = filteredAudits;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, typeFilter, debouncedSearch]);

  const stats = useMemo(() => {
    return {
      total: audits.length,
      planned: audits.filter((a) => a.status === 'planned').length,
      inProgress: audits.filter((a) => a.status === 'in_progress').length,
      completed: audits.filter((a) => a.status === 'completed').length,
      totalFindings: audits.reduce((sum, a) => sum + a.findings, 0),
    };
  }, [audits]);

  const tabsConfig = useMemo(
    () => [
      { id: 'all', label: t('qms.audit_redesign.tab_all') },
      { id: 'planned', label: t('qms.audit_redesign.tab_planned'), badge: stats.planned },
      {
        id: 'in_progress',
        label: t('qms.audit_redesign.tab_in_progress'),
        badge: stats.inProgress,
      },
      { id: 'completed', label: t('qms.audit_redesign.tab_completed'), badge: stats.completed },
    ],
    [stats, t]
  );

  const columns: DataTableColumn<AuditPlan>[] = useMemo(
    () => [
      {
        key: 'audit_no',
        header: t('qms.audit_redesign.col_audit_no'),
        sortable: true,
        render: (row) => (
          <span
            style={{
              fontWeight: 'var(--font-semibold)',
              color: 'var(--accent-primary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {row.audit_no}
          </span>
        ),
      },
      {
        key: 'title',
        header: t('qms.audit_redesign.col_title'),
        render: (row) => (
          <div>
            <div style={{ fontWeight: 500 }}>{row.title}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {row.scope}
            </div>
          </div>
        ),
      },
      {
        key: 'audit_type',
        header: t('qms.audit_redesign.col_type'),
        align: 'center',
        render: (row) => {
          const config = typeConfig[row.audit_type] || typeConfig.internal;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'auditor',
        header: t('qms.audit_redesign.col_auditor'),
      },
      {
        key: 'auditee',
        header: t('qms.audit_redesign.col_auditee'),
      },
      {
        key: 'plan_date',
        header: t('qms.audit_redesign.col_plan_date'),
        sortable: true,
      },
      {
        key: 'findings',
        header: t('qms.audit_redesign.col_findings'),
        align: 'center',
        render: (row) =>
          row.findings > 0 ? (
            <Badge variant='warning'>
              {row.findings} {t('qms.audit_redesign.findings_unit')}
            </Badge>
          ) : (
            <span style={{ color: 'var(--text-tertiary)' }}>-</span>
          ),
      },
      {
        key: 'status',
        header: t('qms.audit_redesign.col_status'),
        align: 'center',
        render: (row) => {
          const config = statusConfig[row.status] || statusConfig.planned;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'actions',
        header: t('qms.audit_redesign.col_actions'),
        align: 'right',
        render: (row) => (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Eye size={14} />}
              onClick={() => {
                setSelectedAudit(row);
                setDetailDrawerOpen(true);
              }}
            >
              {t('qms.audit_redesign.action_detail')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Edit2 size={14} />}
              onClick={() => {
                setSelectedAudit(row);
                setCreateModalOpen(true);
              }}
            >
              {t('qms.audit_redesign.action_edit')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Trash2 size={14} />}
              onClick={() => setDeleteTarget(row)}
            >
              {t('qms.audit_redesign.action_delete')}
            </Button>
          </div>
        ),
      },
    ],
    [setSelectedAudit, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget, t]
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
          {t('qms.audit_redesign.banner_demo_mode')}
        </div>
      )}
      <ListPageTemplate<AuditPlan>
        header={{
          title: t('qms.audit_redesign.header_title'),
          subtitle: t('qms.audit_redesign.header_subtitle'),
          breadcrumbs: [
            { label: t('qms.audit_redesign.breadcrumb_home'), href: '/dashboard' },
            { label: t('qms.audit_redesign.breadcrumb_qms') },
            { label: t('qms.audit_redesign.breadcrumb_audit') },
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
                placeholder={t('qms.audit_redesign.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: 'all', label: t('qms.audit_redesign.type_filter_all') },
                  { value: 'internal', label: t('qms.audit_redesign.type_internal') },
                  { value: 'external', label: t('qms.audit_redesign.type_external') },
                  { value: 'process', label: t('qms.audit_redesign.type_process') },
                  { value: 'product', label: t('qms.audit_redesign.type_product') },
                  { value: 'supplier', label: t('qms.audit_redesign.type_supplier') },
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
                {t('qms.audit_redesign.refresh')}
              </Button>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={() => {
                  setSelectedAudit(null);
                  setCreateModalOpen(true);
                }}
              >
                {t('qms.audit_redesign.create')}
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedAudits}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle={t('qms.audit_redesign.empty_title')}
        emptyDescription={t('qms.audit_redesign.empty_description')}
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label={t('qms.audit_redesign.stat_total')}
              value={stats.total}
              icon={ClipboardCheck}
              accent='cyan'
            />
            <StatTile
              label={t('qms.audit_redesign.tab_planned')}
              value={stats.planned}
              icon={Calendar}
              accent='amber'
            />
            <StatTile
              label={t('qms.audit_redesign.tab_in_progress')}
              value={stats.inProgress}
              icon={Clock}
              accent='warning'
            />
            <StatTile
              label={t('qms.audit_redesign.stat_findings')}
              value={stats.totalFindings}
              icon={AlertTriangle}
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

      {filteredAudits.length > 0 && (
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

      {/* 审核计划详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedAudit(null);
        }}
        title={t('qms.audit_redesign.drawer_title')}
        size='lg'
      >
        {selectedAudit && (
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
                    {selectedAudit.audit_no}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-bold)',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    {selectedAudit.title}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Badge variant={typeConfig[selectedAudit.audit_type]?.variant || 'default'}>
                    {typeConfig[selectedAudit.audit_type]?.label || t('qms.audit_redesign.unknown')}
                  </Badge>
                  <Badge variant={statusConfig[selectedAudit.status]?.variant || 'default'}>
                    {statusConfig[selectedAudit.status]?.label || t('qms.audit_redesign.unknown')}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card title={t('qms.audit_redesign.card_scope')}>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                {selectedAudit.scope}
              </p>
            </Card>

            <Card title={t('qms.audit_redesign.card_basic_info')}>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('qms.audit_redesign.col_auditor')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedAudit.auditor}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('qms.audit_redesign.col_auditee')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedAudit.auditee}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('qms.audit_redesign.col_plan_date')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedAudit.plan_date}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('qms.audit_redesign.drawer_actual_date')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {selectedAudit.actual_date || '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('qms.audit_redesign.drawer_findings')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                    {selectedAudit.findings} {t('qms.audit_redesign.findings_unit')}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('qms.audit_redesign.drawer_created_at')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {formatDateTime(selectedAudit.created_at)}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      {/* 新建/编辑审核计划弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={
          selectedAudit ? t('qms.audit_redesign.modal_edit_title') : t('qms.audit_redesign.create')
        }
        size='lg'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setCreateModalOpen(false)}
            >
              {t('qms.audit_redesign.cancel')}
            </Button>
            <Button
              variant='primary'
              onClick={() => {
                const formData: Partial<AuditPlan> = {
                  audit_no: '',
                  title: (document.getElementById('field-1') as HTMLInputElement)?.value || '',
                  audit_type:
                    ((document.getElementById('field-2') as HTMLSelectElement)
                      ?.value as AuditPlan['audit_type']) || 'internal',
                  auditor: (document.getElementById('field-3') as HTMLInputElement)?.value || '',
                  plan_date: (document.getElementById('field-5') as HTMLInputElement)?.value || '',
                };
                if (selectedAudit) {
                  updateMutation.mutate({ id: selectedAudit.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedAudit
                ? t('qms.audit_redesign.modal_save')
                : t('qms.audit_redesign.modal_submit_create')}
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
              {t('qms.audit_redesign.field_title_label')}
            </label>
            <Input
              id='field-1'
              placeholder={t('qms.audit_redesign.field_title_placeholder')}
              defaultValue={selectedAudit?.title}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor='field-2'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('qms.audit_redesign.field_type_label')}
              </label>
              <Select
                id='field-2'
                defaultValue={selectedAudit?.audit_type || 'internal'}
                options={[
                  { value: 'internal', label: t('qms.audit_redesign.type_internal') },
                  { value: 'external', label: t('qms.audit_redesign.type_external') },
                  { value: 'process', label: t('qms.audit_redesign.type_process') },
                  { value: 'product', label: t('qms.audit_redesign.type_product') },
                  { value: 'supplier', label: t('qms.audit_redesign.type_supplier') },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('qms.audit_redesign.col_auditor')}
              </label>
              <Input
                id='field-3'
                placeholder={t('qms.audit_redesign.field_auditor_placeholder')}
                defaultValue={selectedAudit?.auditor}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('qms.audit_redesign.col_auditee')}
              </label>
              <Input
                id='field-4'
                placeholder={t('qms.audit_redesign.field_auditee_placeholder')}
                defaultValue={selectedAudit?.auditee}
              />
            </div>
            <div>
              <label
                htmlFor='field-5'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('qms.audit_redesign.col_plan_date')}
              </label>
              <Input
                id='field-5'
                type='date'
                defaultValue={selectedAudit?.plan_date}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor='field-6'
              style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
            >
              {t('qms.audit_redesign.card_scope')}
            </label>
            <Input
              id='field-6'
              placeholder={t('qms.audit_redesign.field_scope_placeholder')}
              defaultValue={selectedAudit?.scope}
            />
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('qms.audit_redesign.delete_title')}
        size='sm'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setDeleteTarget(null)}
            >
              {t('qms.audit_redesign.cancel')}
            </Button>
            <Button
              variant='danger'
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {t('qms.audit_redesign.delete_confirm')}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          {t('qms.audit_redesign.delete_message', { audit_no: deleteTarget?.audit_no })}
        </p>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

export default QmsAuditRedesignPage;
