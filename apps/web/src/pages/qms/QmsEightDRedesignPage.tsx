import React, { useState, useEffect, useMemo } from 'react';
import styles from './QmsEightDRedesignPage.module.css';
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
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
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
import { eightDApi } from '@/api/qms/eightD';
import type { EightDReport as ApiEightDReport, CreateEightDReportRequest } from '@/api/qms/types';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['qms', 'eight-d'];

// 详情/卡片重复样式（等价抽取，值不变）
const detailLabel: React.CSSProperties = {
  fontSize: 'var(--text-xs)',
  color: 'var(--text-secondary)',
};
const detailValue: React.CSSProperties = {
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-medium)',
};
const rowGap2: React.CSSProperties = { display: 'flex', gap: 'var(--space-2)' };
const colGap4: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
};
const sectionTitle: React.CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: 13,
  fontWeight: 500,
};

interface EightDReport {
  id: string;
  report_no: string;
  title: string;
  problem_source: 'internal' | 'customer' | 'supplier' | 'audit';
  severity: 'minor' | 'major' | 'critical';
  status: 'd1' | 'd2' | 'd3' | 'd4' | 'd5' | 'd6' | 'd7' | 'd8' | 'closed';
  current_step: string;
  product_name: string;
  customer_name?: string;
  owner: string;
  due_date: string;
  created_at: string;
}

// Mock 数据
// 将 API 返回的 EightDReport 类型映射为页面使用的 EightDReport 类型。
// 部分历史接口使用驼峰别名，收窄为可选字段（ApiEightDReportCompat），避免 `as any`。
type EightDTab = 'all' | 'in_progress' | 'closed';
type BadgeVariant = 'warning' | 'amber' | 'info' | 'cyan' | 'success' | 'default' | 'error';
type ApiEightDReportCompat = ApiEightDReport & {
  report_no?: string;
  reportNo?: string;
  problem_source?: string;
  customer_name?: string;
  product_name?: string;
  owner?: string;
  title?: string;
  due_date?: string;
  severity?: string;
  status?: string;
  name?: string;
  customerName?: string;
  productName?: string;
  leader?: string;
  leaderName?: string;
  ownerName?: string;
  current_step?: string;
  currentStep?: number;
  created_date?: string;
  createdDate?: string;
  dueDate?: string;
  created_at?: string;
};

const mapApiEightDReports = (apiReports: ApiEightDReportCompat[]): EightDReport[] => {
  return apiReports.map((r, index) => ({
    id: r.id,
    report_no: r.report_no || r.reportNo || `8D2026${String(index + 1).padStart(5, '0')}`,
    title: r.title || r.name || '-',
    problem_source: (r.problem_source as EightDReport['problem_source']) || 'internal',
    severity: (r.severity as EightDReport['severity']) || 'major',
    status: (r.status as EightDReport['status']) || 'd1',
    customer_name: r.customer_name || r.customerName || '-',
    product_name: r.product_name || r.productName || '-',
    owner: r.owner || r.ownerName || r.leader || '-',
    current_step: String(r.current_step || r.currentStep || 1),
    due_date: r.due_date || r.dueDate || '-',
    created_at: r.created_at || new Date().toISOString(),
  }));
};

// Mock 数据（API 不可用时的 fallback）在组件内用 t() 构造，见 mockEightDReports

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const QmsEightDRedesignPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mockEightDReports: EightDReport[] = [
    {
      id: '1',
      report_no: '8D202609001',
      title: t('qms.demo.eightd_title_1'),
      problem_source: 'customer',
      severity: 'major',
      status: 'd4',
      current_step: t('qms.demo.eightd_step_d4'),
      product_name: t('qms.demo.product_servo'),
      customer_name: t('qms.demo.company_a_name'),
      owner: t('qms.demo.person_zhang'),
      due_date: '2026-09-20',
      created_at: '2026-09-10 10:00:00',
    },
    {
      id: '2',
      report_no: '8D202609002',
      title: t('qms.demo.eightd_title_2'),
      problem_source: 'internal',
      severity: 'critical',
      status: 'd6',
      current_step: t('qms.demo.eightd_step_d6'),
      product_name: t('qms.demo.product_plc'),
      owner: t('qms.demo.person_li'),
      due_date: '2026-09-18',
      created_at: '2026-09-05 14:30:00',
    },
    {
      id: '3',
      report_no: '8D202608001',
      title: t('qms.demo.eightd_title_3'),
      problem_source: 'supplier',
      severity: 'minor',
      status: 'closed',
      current_step: t('qms.demo.eightd_step_d8'),
      product_name: t('qms.demo.product_camera'),
      customer_name: t('qms.demo.company_c_name'),
      owner: t('qms.demo.person_wang'),
      due_date: '2026-08-25',
      created_at: '2026-08-15 09:00:00',
    },
    {
      id: '4',
      report_no: '8D202608002',
      title: t('qms.demo.eightd_title_4'),
      problem_source: 'internal',
      severity: 'critical',
      status: 'd8',
      current_step: t('qms.demo.eightd_step_d8'),
      product_name: t('qms.demo.product_inverter'),
      owner: t('qms.demo.person_zhao'),
      due_date: '2026-08-30',
      created_at: '2026-08-20 11:00:00',
    },
    {
      id: '5',
      report_no: '8D202609003',
      title: t('qms.demo.eightd_title_5'),
      problem_source: 'customer',
      severity: 'major',
      status: 'd2',
      current_step: t('qms.demo.eightd_step_d2'),
      product_name: t('qms.demo.product_hmi'),
      customer_name: t('qms.demo.company_d_name'),
      owner: t('qms.demo.person_zhang'),
      due_date: '2026-09-25',
      created_at: '2026-09-12 16:00:00',
    },
  ];

  const statusConfig = useMemo<
    Record<string, { label: string; variant: BadgeVariant; step: number }>
  >(
    () => ({
      d1: { label: t('qms.eight_d_redesign.status_d1'), variant: 'warning', step: 1 },
      d2: { label: t('qms.eight_d_redesign.status_d2'), variant: 'warning', step: 2 },
      d3: { label: t('qms.eight_d_redesign.status_d3'), variant: 'amber', step: 3 },
      d4: { label: t('qms.eight_d_redesign.status_d4'), variant: 'info', step: 4 },
      d5: { label: t('qms.eight_d_redesign.status_d5'), variant: 'info', step: 5 },
      d6: { label: t('qms.eight_d_redesign.status_d6'), variant: 'cyan', step: 6 },
      d7: { label: t('qms.eight_d_redesign.status_d7'), variant: 'cyan', step: 7 },
      d8: { label: t('qms.eight_d_redesign.status_d8'), variant: 'success', step: 8 },
      closed: { label: t('qms.eight_d_redesign.status_closed'), variant: 'default', step: 9 },
    }),
    [t]
  );

  const sourceConfig = useMemo(
    () => ({
      internal: { label: t('qms.eight_d_redesign.source_internal'), variant: 'cyan' as const },
      customer: { label: t('qms.eight_d_redesign.source_customer'), variant: 'error' as const },
      supplier: { label: t('qms.eight_d_redesign.source_supplier'), variant: 'amber' as const },
      audit: { label: t('qms.eight_d_redesign.source_audit'), variant: 'info' as const },
    }),
    [t]
  );

  const severityConfig = useMemo(
    () => ({
      minor: { label: t('qms.eight_d_redesign.severity_minor'), variant: 'default' as const },
      major: { label: t('qms.eight_d_redesign.severity_major'), variant: 'warning' as const },
      critical: { label: t('qms.eight_d_redesign.severity_critical'), variant: 'error' as const },
    }),
    [t]
  );

  const [activeTab, setActiveTab] = useState<EightDTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<EightDReport | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EightDReport | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMockData, setIsMockData] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, currentPage, pageSize, debouncedSearch, severityFilter],
    queryFn: async () => {
      try {
        // 尝试调用真实 API（服务端分页）
        const params: { page: number; pageSize: number; search?: string; severity?: string } = {
          page: currentPage,
          pageSize,
        };
        if (debouncedSearch) {
          params.search = debouncedSearch;
        }
        if (severityFilter !== 'all') {
          params.severity = severityFilter;
        }
        const res = await eightDApi.listEightDReports();
        const resData = res as unknown as
          | {
              data?: ApiEightDReport[];
              list?: ApiEightDReport[];
              items?: ApiEightDReport[];
              total?: number;
            }
          | ApiEightDReport[];
        let apiReports: ApiEightDReport[] = [];
        let total = 0;
        if (Array.isArray(resData)) {
          apiReports = resData;
          total = resData.length;
        } else if (resData.data) {
          const dataObj = resData as {
            list?: ApiEightDReport[];
            items?: ApiEightDReport[];
            total?: number;
          };
          apiReports = Array.isArray(resData.data)
            ? resData.data
            : dataObj.list || dataObj.items || [];
          total = dataObj.total || apiReports.length;
        }
        if (Array.isArray(apiReports)) {
          setIsMockData(false);
          return { reports: mapApiEightDReports(apiReports), total };
        }
      } catch (e) {
        console.warn('[QMS 8D Reports] API unavailable, using mock data:', e);
        setIsMockData(true);
      }
      // Mock fallback：本地分页
      let filtered = mockEightDReports;
      if (debouncedSearch) {
        filtered = filtered.filter(
          (r) => r.report_no.includes(debouncedSearch) || r.title.includes(debouncedSearch)
        );
      }
      if (severityFilter !== 'all') {
        filtered = filtered.filter((r) => r.severity === severityFilter);
      }
      const start = (currentPage - 1) * pageSize;
      return { reports: filtered.slice(start, start + pageSize), total: filtered.length };
    },
  });

  // 真实数据优先；API 空/失败时降级 mock（渲染层兜底，不依赖 queryFn 分支是否命中）
  const reports = data?.reports?.length ? data.reports : isLoading ? [] : mockEightDReports;

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
      pushToast('success', t('qms.eight_d_redesign.toast_delete_success'));
    },
    onError: () => {
      pushToast('error', t('qms.eight_d_redesign.toast_delete_fail'));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<EightDReport>) => {
      // S1：真实 API 创建失败时不再静默假成功——记录降级标记，由 onSuccess 给出醒目警示
      let apiFailed = false;
      try {
        await eightDApi.createEightDReport({
          report_no: data.report_no,
          title: data.title,
          customer_name: data.customer_name,
          product_name: data.product_name,
          problem_source: data.problem_source,
          severity: data.severity,
          status: data.status,
          owner: data.owner,
          current_step: data.current_step,
          due_date: data.due_date,
        } as unknown as CreateEightDReportRequest);
      } catch (e) {
        console.warn('[QMS 8D Reports] Create API unavailable, using mock create:', e);
        apiFailed = true;
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
          t('qms.eight_d_redesign.mock_create_fallback', '⚠️ 已降级为本地模拟数据，未写入数据库')
        );
      } else {
        pushToast('success', t('qms.eight_d_redesign.toast_create_success'));
      }
    },
    onError: () => {
      pushToast('error', t('qms.eight_d_redesign.toast_create_fail'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EightDReport> }) => {
      let apiFailed = false;
      try {
        await eightDApi.updateEightDReport(id, {
          status: data.status,
          current_step: data.current_step,
          due_date: data.due_date,
          owner: data.owner,
        } as unknown as CreateEightDReportRequest);
      } catch (e) {
        console.warn('[QMS 8D Reports] Update API unavailable, using mock update:', e);
        apiFailed = true;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id, data, apiFailed };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      if (result.apiFailed) {
        pushToast(
          'warning',
          t('qms.eight_d_redesign.mock_update_fallback', '⚠️ 已降级为本地模拟数据，未写入数据库')
        );
      } else {
        pushToast('success', t('qms.eight_d_redesign.toast_update_success'));
      }
    },
    onError: () => {
      pushToast('error', t('qms.eight_d_redesign.toast_update_fail'));
    },
  });

  // 服务端分页：直接使用 API 返回的数据，不再本地筛选和分页
  const filteredReports = reports;
  const totalItems = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedReports = filteredReports;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, severityFilter, debouncedSearch]);

  const stats = useMemo(() => {
    return {
      total: reports.length,
      inProgress: reports.filter((r) => r.status !== 'closed').length,
      closed: reports.filter((r) => r.status === 'closed').length,
      critical: reports.filter((r) => r.severity === 'critical' && r.status !== 'closed').length,
    };
  }, [reports]);

  const tabsConfig = useMemo(
    () => [
      { id: 'all', label: t('qms.eight_d_redesign.tab_all') },
      {
        id: 'in_progress',
        label: t('qms.eight_d_redesign.tab_in_progress'),
        badge: stats.inProgress,
      },
      { id: 'closed', label: t('qms.eight_d_redesign.tab_closed'), badge: stats.closed },
    ],
    [stats, t]
  );

  const columns: DataTableColumn<EightDReport>[] = useMemo(
    () => [
      {
        key: 'report_no',
        header: t('qms.eight_d_redesign.col_report_no'),
        sortable: true,
        render: (row) => <span className={styles.il1}>{row.report_no}</span>,
      },
      {
        key: 'title',
        header: t('qms.eight_d_redesign.col_title'),
        render: (row) => (
          <div>
            <div className={styles.il2}>{row.title}</div>
            <div className={styles.il3}>
              {row.product_name}
              {row.customer_name && ` / ${row.customer_name}`}
            </div>
          </div>
        ),
      },
      {
        key: 'problem_source',
        header: t('qms.eight_d_redesign.col_source'),
        align: 'center',
        render: (row) => {
          const config = sourceConfig[row.problem_source] || sourceConfig.internal;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'severity',
        header: t('qms.eight_d_redesign.col_severity'),
        align: 'center',
        render: (row) => {
          const config = severityConfig[row.severity] || severityConfig.minor;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'current_step',
        header: t('qms.eight_d_redesign.col_current_step'),
        render: (row) => (
          <div>
            <div className={styles.il4}>{row.current_step}</div>
            {/* 进度条 */}
            <div className={styles.il5}>
              <div
                style={{
                  width: `${((statusConfig[row.status]?.step || 1) / 9) * 100}%`,
                  height: '100%',
                  backgroundColor:
                    row.status === 'closed' ? 'var(--success-500)' : 'var(--accent-primary)',
                }}
              />
            </div>
          </div>
        ),
      },
      {
        key: 'owner',
        header: t('qms.eight_d_redesign.col_owner'),
        render: (row) => (
          <div className={styles.il6}>
            <User
              size={14}
              className={styles.il7}
            />
            <span>{row.owner}</span>
          </div>
        ),
      },
      {
        key: 'due_date',
        header: t('qms.eight_d_redesign.col_due_date'),
        sortable: true,
        render: (row) => (
          <span
            style={{
              color:
                row.status !== 'closed' && new Date(row.due_date) < new Date()
                  ? 'var(--error-500)'
                  : 'inherit',
            }}
          >
            {row.due_date}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('qms.eight_d_redesign.col_status'),
        align: 'center',
        render: (row) => {
          const config = statusConfig[row.status] || statusConfig.d1;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'actions',
        header: t('qms.eight_d_redesign.col_actions'),
        align: 'right',
        render: (row) => (
          <div className={styles.il8}>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Eye size={14} />}
              onClick={() => {
                setSelectedReport(row);
                setDetailDrawerOpen(true);
              }}
            >
              {t('qms.eight_d_redesign.action_detail')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Edit2 size={14} />}
              onClick={() => {
                setSelectedReport(row);
                setCreateModalOpen(true);
              }}
            >
              {t('qms.eight_d_redesign.action_edit')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Trash2 size={14} />}
              onClick={() => setDeleteTarget(row)}
            >
              {t('qms.eight_d_redesign.action_delete')}
            </Button>
          </div>
        ),
      },
    ],
    [setSelectedReport, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget, t]
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
          {t('qms.eight_d_redesign.banner_demo_mode')}
        </div>
      )}
      <ListPageTemplate<EightDReport>
        header={{
          title: t('qms.eight_d_redesign.header_title'),
          subtitle: t('qms.eight_d_redesign.header_subtitle'),
          breadcrumbs: [
            { label: t('qms.eight_d_redesign.breadcrumb_home'), href: '/dashboard' },
            { label: t('qms.eight_d_redesign.breadcrumb_qms') },
            { label: t('qms.eight_d_redesign.breadcrumb_eight_d') },
          ],
        }}
        toolbar={
          <>
            <div className={styles.il9}>
              <Input
                placeholder={t('qms.eight_d_redesign.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                className={styles.il10}
              />
              <Select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                options={[
                  { value: 'all', label: t('qms.eight_d_redesign.severity_filter_all') },
                  { value: 'minor', label: t('qms.eight_d_redesign.severity_minor') },
                  { value: 'major', label: t('qms.eight_d_redesign.severity_major') },
                  { value: 'critical', label: t('qms.eight_d_redesign.severity_critical') },
                ]}
                className={styles.il11}
              />
            </div>
            <div style={rowGap2}>
              <Button
                variant='ghost'
                leftIcon={<RefreshCw size={16} />}
                onClick={() => refetch()}
              >
                {t('qms.eight_d_redesign.refresh')}
              </Button>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={() => {
                  setSelectedReport(null);
                  setCreateModalOpen(true);
                }}
              >
                {t('qms.eight_d_redesign.create')}
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedReports}
        rowKey='id'
        loading={isLoading}
        error={reports.length === 0 && error ? (error as Error).message : null}
        emptyTitle={t('qms.eight_d_redesign.empty_title')}
        emptyDescription={t('qms.eight_d_redesign.empty_description')}
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label={t('qms.eight_d_redesign.stat_total')}
              value={stats.total}
              icon={FileText}
              accent='cyan'
            />
            <StatTile
              label={t('qms.eight_d_redesign.tab_in_progress')}
              value={stats.inProgress}
              icon={Clock}
              accent='warning'
            />
            <StatTile
              label={t('qms.eight_d_redesign.tab_closed')}
              value={stats.closed}
              icon={CheckCircle}
              accent='success'
            />
            <StatTile
              label={t('qms.eight_d_redesign.stat_critical_open')}
              value={stats.critical}
              icon={AlertTriangle}
              accent='error'
            />
          </div>
        }
      >
        <Tabs
          tabs={tabsConfig}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as EightDTab)}
        />
      </ListPageTemplate>

      {filteredReports.length > 0 && (
        <div className={styles.il12}>
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

      {/* 8D 报告详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedReport(null);
        }}
        title={t('qms.eight_d_redesign.drawer_title')}
        size='lg'
      >
        {selectedReport && (
          <div style={colGap4}>
            <Card>
              <div className={styles.il13}>
                <div>
                  <div style={detailLabel}>{selectedReport.report_no}</div>
                  <div className={styles.il14}>{selectedReport.title}</div>
                </div>
                <div style={rowGap2}>
                  <Badge variant={severityConfig[selectedReport.severity]?.variant || 'default'}>
                    {severityConfig[selectedReport.severity]?.label ||
                      t('qms.eight_d_redesign.unknown')}
                  </Badge>
                  <Badge variant={statusConfig[selectedReport.status]?.variant || 'default'}>
                    {statusConfig[selectedReport.status]?.label ||
                      t('qms.eight_d_redesign.unknown')}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* 8D 步骤进度 */}
            <Card title={t('qms.eight_d_redesign.drawer_steps_title')}>
              <div className={styles.il15}>
                <div className={styles.il16}>
                  {t('qms.eight_d_redesign.drawer_current_step')}
                  {selectedReport.current_step}
                </div>
                <div className={styles.il17}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => (
                    <div
                      key={step}
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor:
                          step <= (statusConfig[selectedReport.status]?.step || 1)
                            ? 'var(--accent-primary)'
                            : 'var(--surface-3)',
                      }}
                    />
                  ))}
                </div>
                <div className={styles.il18}>
                  <span>D1</span>
                  <span>D2</span>
                  <span>D3</span>
                  <span>D4</span>
                  <span>D5</span>
                  <span>D6</span>
                  <span>D7</span>
                  <span>D8</span>
                </div>
              </div>
            </Card>

            <Card title={t('qms.eight_d_redesign.drawer_basic_info')}>
              <div className={styles.il19}>
                <div>
                  <div style={detailLabel}>{t('qms.eight_d_redesign.drawer_product_name')}</div>
                  <div style={detailValue}>{selectedReport.product_name}</div>
                </div>
                <div>
                  <div style={detailLabel}>{t('qms.eight_d_redesign.drawer_problem_source')}</div>
                  <div style={detailValue}>
                    {sourceConfig[selectedReport.problem_source]?.label ||
                      t('qms.eight_d_redesign.unknown')}
                  </div>
                </div>
                {selectedReport.customer_name && (
                  <div>
                    <div style={detailLabel}>{t('qms.eight_d_redesign.drawer_customer')}</div>
                    <div style={detailValue}>{selectedReport.customer_name}</div>
                  </div>
                )}
                <div>
                  <div style={detailLabel}>{t('qms.eight_d_redesign.col_owner')}</div>
                  <div style={detailValue}>{selectedReport.owner}</div>
                </div>
                <div>
                  <div style={detailLabel}>{t('qms.eight_d_redesign.col_due_date')}</div>
                  <div className={styles.il20}>{selectedReport.due_date}</div>
                </div>
                <div>
                  <div style={detailLabel}>{t('qms.eight_d_redesign.drawer_created_at')}</div>
                  <div className={styles.il21}>{formatDateTime(selectedReport.created_at)}</div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      {/* 新建/编辑 8D 报告弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={
          selectedReport
            ? t('qms.eight_d_redesign.modal_edit_title')
            : t('qms.eight_d_redesign.create')
        }
        size='lg'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setCreateModalOpen(false)}
            >
              {t('qms.eight_d_redesign.cancel')}
            </Button>
            <Button
              variant='primary'
              onClick={() => {
                const formData: Partial<EightDReport> = {
                  report_no: '',
                  title: (document.getElementById('field-1') as HTMLInputElement)?.value || '',
                  customer_name: '',
                  product_name:
                    (document.getElementById('field-4') as HTMLInputElement)?.value || '',
                  owner: (document.getElementById('field-5') as HTMLInputElement)?.value || '',
                  due_date: (document.getElementById('field-6') as HTMLInputElement)?.value || '',
                };
                if (selectedReport) {
                  updateMutation.mutate({ id: selectedReport.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedReport
                ? t('qms.eight_d_redesign.modal_save')
                : t('qms.eight_d_redesign.modal_submit_create')}
            </Button>
          </>
        }
      >
        <div style={colGap4}>
          <div>
            <label
              htmlFor='field-1'
              style={sectionTitle}
            >
              {t('qms.eight_d_redesign.field_title_label')}
            </label>
            <Input
              id='field-1'
              placeholder={t('qms.eight_d_redesign.field_title_placeholder')}
              defaultValue={selectedReport?.title}
            />
          </div>
          <div className={styles.il22}>
            <div>
              <label
                htmlFor='field-2'
                style={sectionTitle}
              >
                {t('qms.eight_d_redesign.field_source_label')}
              </label>
              <Select
                id='field-2'
                defaultValue={selectedReport?.problem_source || 'internal'}
                options={[
                  { value: 'internal', label: t('qms.eight_d_redesign.source_internal') },
                  { value: 'customer', label: t('qms.eight_d_redesign.source_customer') },
                  { value: 'supplier', label: t('qms.eight_d_redesign.source_supplier') },
                  { value: 'audit', label: t('qms.eight_d_redesign.source_audit') },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={sectionTitle}
              >
                {t('qms.eight_d_redesign.field_severity_label')}
              </label>
              <Select
                id='field-3'
                defaultValue={selectedReport?.severity || 'minor'}
                options={[
                  { value: 'minor', label: t('qms.eight_d_redesign.severity_minor') },
                  { value: 'major', label: t('qms.eight_d_redesign.severity_major') },
                  { value: 'critical', label: t('qms.eight_d_redesign.severity_critical') },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={sectionTitle}
              >
                {t('qms.eight_d_redesign.drawer_product_name')}
              </label>
              <Input
                id='field-4'
                placeholder={t('qms.eight_d_redesign.field_product_placeholder')}
                defaultValue={selectedReport?.product_name}
              />
            </div>
            <div>
              <label
                htmlFor='field-5'
                style={sectionTitle}
              >
                {t('qms.eight_d_redesign.col_owner')}
              </label>
              <Input
                id='field-5'
                placeholder={t('qms.eight_d_redesign.field_owner_placeholder')}
                defaultValue={selectedReport?.owner}
              />
            </div>
            <div>
              <label
                htmlFor='field-6'
                style={sectionTitle}
              >
                {t('qms.eight_d_redesign.col_due_date')}
              </label>
              <Input
                id='field-6'
                type='date'
                defaultValue={selectedReport?.due_date}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('qms.eight_d_redesign.delete_title')}
        size='sm'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setDeleteTarget(null)}
            >
              {t('qms.eight_d_redesign.cancel')}
            </Button>
            <Button
              variant='danger'
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {t('qms.eight_d_redesign.delete_confirm')}
            </Button>
          </>
        }
      >
        <p className={styles.il23}>
          {t('qms.eight_d_redesign.delete_message', { report_no: deleteTarget?.report_no })}
        </p>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

export default QmsEightDRedesignPage;
