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
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Package,
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
import { issueApi } from '@/api/qms/issue';
import type { QualityIssue as ApiQualityIssue } from '@/api/qms/types';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['qms', 'nonconformance'];

interface Nonconformance {
  id: string;
  nc_no: string;
  title: string;
  nc_type: 'product' | 'process' | 'material' | 'service';
  severity: 'minor' | 'major' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  product_name: string;
  batch_no: string;
  quantity: number;
  discovered_by: string;
  discovered_date: string;
  description: string;
  created_at: string;
}

// Mock 数据
// 将 API 返回的 QualityIssue 类型映射为页面使用的 Nonconformance 类型
const mapApiNonconformances = (apiIssues: ApiQualityIssue[]): Nonconformance[] => {
  return apiIssues.map((issue, index) => ({
    id: issue.id,
    nc_no:
      (issue as any).nc_no ||
      (issue as any).issue_no ||
      `NC2026${String(index + 1).padStart(5, '0')}`,
    title: (issue as any).title || (issue as any).name || '-',
    nc_type: ((issue as any).nc_type as Nonconformance['nc_type']) || 'product',
    severity: ((issue as any).severity as Nonconformance['severity']) || 'major',
    status: ((issue as any).status as Nonconformance['status']) || 'open',
    product_name: (issue as any).product_name || (issue as any).productName || '-',
    batch_no: (issue as any).batch_no || (issue as any).batchNo || '-',
    quantity: (issue as any).quantity || 0,
    reporter: (issue as any).reporter || (issue as any).reporterName || '-',
    discovered_by:
      (issue as any).discovered_by || (issue as any).reporter || (issue as any).discoveredBy || '-',
    discovered_date:
      (issue as any).discovered_date ||
      (issue as any).discoveredDate ||
      (issue as any).reported_date ||
      '-',
    reported_date: (issue as any).reported_date || (issue as any).reportedDate || '-',
    description: (issue as any).description || '',
    created_at: issue.created_at || new Date().toISOString(),
  }));
};

// Mock 数据（API 不可用时的 fallback）
const mockNonconformances: Nonconformance[] = [
  {
    id: '1',
    nc_no: 'NC202609001',
    title: '伺服电机外观划痕',
    nc_type: 'product',
    severity: 'minor',
    status: 'open',
    product_name: '伺服电机',
    batch_no: 'BATCH-2026-0901',
    quantity: 12,
    discovered_by: '张三',
    discovered_date: '2026-09-13',
    description: '入库检验发现外壳有划痕，不影响功能',
    created_at: '2026-09-13 10:00:00',
  },
  {
    id: '2',
    nc_no: 'NC202609002',
    title: 'PLC 控制器程序错误',
    nc_type: 'process',
    severity: 'major',
    status: 'investigating',
    product_name: 'PLC 控制器',
    batch_no: 'BATCH-2026-0902',
    quantity: 5,
    discovered_by: '李四',
    discovered_date: '2026-09-12',
    description: '部分控制器程序烧录错误，需重新烧录',
    created_at: '2026-09-12 14:30:00',
  },
  {
    id: '3',
    nc_no: 'NC202609003',
    title: '工业相机镜头污渍',
    nc_type: 'material',
    severity: 'minor',
    status: 'contained',
    product_name: '工业相机',
    batch_no: 'BATCH-2026-0898',
    quantity: 30,
    discovered_by: '王五',
    discovered_date: '2026-09-11',
    description: '来料检验发现镜头有污渍，已隔离',
    created_at: '2026-09-11 09:00:00',
  },
  {
    id: '4',
    nc_no: 'NC202608001',
    title: '变频器参数设置错误',
    nc_type: 'product',
    severity: 'critical',
    status: 'resolved',
    product_name: '变频器',
    batch_no: 'BATCH-2026-0899',
    quantity: 2,
    discovered_by: '赵六',
    discovered_date: '2026-08-28',
    description: '出厂参数设置错误，已返工修复',
    created_at: '2026-08-28 11:00:00',
  },
  {
    id: '5',
    nc_no: 'NC202608002',
    title: '触摸屏 HMI 屏幕坏点',
    nc_type: 'product',
    severity: 'major',
    status: 'closed',
    product_name: '触摸屏 HMI',
    batch_no: 'BATCH-2026-0897',
    quantity: 8,
    discovered_by: '张三',
    discovered_date: '2026-08-20',
    description: '屏幕有坏点，已换货处理',
    created_at: '2026-08-20 16:00:00',
  },
];

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const QmsNonconformancePage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const statusConfig = useMemo(
    () => ({
      open: { label: t('qms.nonconformance_redesign.status_open'), variant: 'warning' as const, icon: AlertTriangle },
      investigating: { label: t('qms.nonconformance_redesign.status_investigating'), variant: 'info' as const, icon: Clock },
      contained: { label: t('qms.nonconformance_redesign.status_contained'), variant: 'amber' as const, icon: Package },
      resolved: { label: t('qms.nonconformance_redesign.status_resolved'), variant: 'success' as const, icon: CheckCircle },
      closed: { label: t('qms.nonconformance_redesign.status_closed'), variant: 'default' as const, icon: XCircle },
    }),
    [t]
  );

  const typeConfig = useMemo(
    () => ({
      product: { label: t('qms.nonconformance_redesign.type_product'), variant: 'cyan' as const },
      process: { label: t('qms.nonconformance_redesign.type_process'), variant: 'info' as const },
      material: { label: t('qms.nonconformance_redesign.type_material'), variant: 'amber' as const },
      service: { label: t('qms.nonconformance_redesign.type_service'), variant: 'default' as const },
    }),
    [t]
  );

  const severityConfig = useMemo(
    () => ({
      minor: { label: t('qms.nonconformance_redesign.severity_minor'), variant: 'default' as const },
      major: { label: t('qms.nonconformance_redesign.severity_major'), variant: 'warning' as const },
      critical: { label: t('qms.nonconformance_redesign.severity_critical'), variant: 'error' as const },
    }),
    [t]
  );

  const [activeTab, setActiveTab] = useState<
    'all' | 'open' | 'investigating' | 'contained' | 'resolved'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedNc, setSelectedNc] = useState<Nonconformance | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Nonconformance | null>(null);
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
        const params: any = {
          page: currentPage,
          pageSize,
        };
        if (debouncedSearch) {
          params.search = debouncedSearch;
        }
        if (severityFilter !== 'all') {
          params.severity = severityFilter;
        }
        const res = await issueApi.listIssues();
        const resData = res as unknown as
          { data?: ApiQualityIssue[]; total?: number } | ApiQualityIssue[];
        let apiIssues: ApiQualityIssue[] = [];
        let total = 0;
        if (Array.isArray(resData)) {
          apiIssues = resData;
          total = resData.length;
        } else if (resData.data) {
          const dataObj = resData as any;
          apiIssues = Array.isArray(resData.data)
            ? resData.data
            : dataObj.list || dataObj.items || [];
          total = dataObj.total || apiIssues.length;
        }
        if (apiIssues.length > 0) {
          setIsMockData(false);
          return { items: mapApiNonconformances(apiIssues), total };
        }
      } catch (e) {
        console.warn('[QMS Nonconformance] API unavailable, using mock data:', e);
        setIsMockData(true);
      }
      // Mock fallback：本地分页
      let filtered = mockNonconformances;
      if (debouncedSearch) {
        filtered = filtered.filter(
          (i) => i.nc_no.includes(debouncedSearch) || i.product_name.includes(debouncedSearch)
        );
      }
      if (severityFilter !== 'all') {
        filtered = filtered.filter((i) => i.severity === severityFilter);
      }
      const start = (currentPage - 1) * pageSize;
      return { items: filtered.slice(start, start + pageSize), total: filtered.length };
    },
  });

  const items = data?.items || [];

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
      pushToast('success', t('qms.nonconformance_redesign.toast_delete_success'));
    },
    onError: () => {
      pushToast('error', t('qms.nonconformance_redesign.toast_delete_fail'));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Nonconformance>) => {
      try {
        await issueApi.createIssue({
          issue_no: (data as any).issue_no,
          product_name: (data as any).product_name,
          batch_no: (data as any).batch_no,
          quantity: (data as any).quantity,
          defect_type: (data as any).defect_type,
          severity: (data as any).severity,
          status: data.status,
          reported_by: (data as any).reported_by,
          report_date: (data as any).report_date,
          description: (data as any).description,
        } as any);
      } catch (e) {
        console.warn('[QMS Nonconformance] Create API unavailable, using mock create:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', t('qms.nonconformance_redesign.toast_create_success'));
    },
    onError: () => {
      pushToast('error', t('qms.nonconformance_redesign.toast_create_fail'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Nonconformance> }) => {
      try {
        await issueApi.updateIssue(id, {
          status: data.status,
          disposition: (data as any).disposition,
          resolved_by: (data as any).resolved_by,
          resolution: (data as any).resolution,
        } as any);
      } catch (e) {
        console.warn('[QMS Nonconformance] Update API unavailable, using mock update:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', t('qms.nonconformance_redesign.toast_update_success'));
    },
    onError: () => {
      pushToast('error', t('qms.nonconformance_redesign.toast_update_fail'));
    },
  });

  // 服务端分页：直接使用 API 返回的数据，不再本地筛选和分页
  const filteredItems = items;
  const totalItems = (data as any)?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedItems = filteredItems;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, severityFilter, debouncedSearch]);

  const stats = useMemo(() => {
    return {
      total: items.length,
      open: items.filter((i) => i.status === 'open' || i.status === 'investigating').length,
      critical: items.filter((i) => i.severity === 'critical').length,
      resolved: items.filter((i) => i.status === 'resolved' || i.status === 'closed').length,
    };
  }, [items]);

  const tabsConfig = useMemo(
    () => [
      { id: 'all', label: t('qms.nonconformance_redesign.tab_all') },
      { id: 'open', label: t('qms.nonconformance_redesign.tab_open'), badge: items.filter((i) => i.status === 'open').length },
      {
        id: 'investigating',
        label: t('qms.nonconformance_redesign.tab_investigating'),
        badge: items.filter((i) => i.status === 'investigating').length,
      },
      {
        id: 'contained',
        label: t('qms.nonconformance_redesign.tab_contained'),
        badge: items.filter((i) => i.status === 'contained').length,
      },
      {
        id: 'resolved',
        label: t('qms.nonconformance_redesign.tab_resolved'),
        badge: items.filter((i) => i.status === 'resolved').length,
      },
    ],
    [items, t]
  );

  const columns: DataTableColumn<Nonconformance>[] = useMemo(
    () => [
      {
        key: 'nc_no',
        header: t('qms.nonconformance_redesign.col_nc_no'),
        sortable: true,
        render: (row) => (
          <span
            style={{
              fontWeight: 'var(--font-semibold)',
              color: 'var(--accent-primary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {row.nc_no}
          </span>
        ),
      },
      {
        key: 'title',
        header: t('qms.nonconformance_redesign.col_title'),
        render: (row) => (
          <div>
            <div style={{ fontWeight: 500 }}>{row.title}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {row.product_name} / {row.batch_no}
            </div>
          </div>
        ),
      },
      {
        key: 'nc_type',
        header: t('qms.nonconformance_redesign.col_type'),
        align: 'center',
        render: (row) => {
          const config = typeConfig[row.nc_type] || typeConfig.product;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'severity',
        header: t('qms.nonconformance_redesign.col_severity'),
        align: 'center',
        render: (row) => {
          const config = severityConfig[row.severity] || severityConfig.minor;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'quantity',
        header: t('qms.nonconformance_redesign.col_quantity'),
        align: 'right',
        render: (row) => <span>{row.quantity.toLocaleString()}</span>,
      },
      {
        key: 'discovered_by',
        header: t('qms.nonconformance_redesign.col_discovered_by'),
      },
      {
        key: 'discovered_date',
        header: t('qms.nonconformance_redesign.col_discovered_date'),
        sortable: true,
      },
      {
        key: 'status',
        header: t('qms.nonconformance_redesign.col_status'),
        align: 'center',
        render: (row) => {
          const config = statusConfig[row.status] || statusConfig.open;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'actions',
        header: t('qms.nonconformance_redesign.col_actions'),
        align: 'right',
        render: (row) => (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Eye size={14} />}
              onClick={() => {
                setSelectedNc(row);
                setDetailDrawerOpen(true);
              }}
            >
              {t('qms.nonconformance_redesign.action_detail')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Edit2 size={14} />}
              onClick={() => {
                setSelectedNc(row);
                setCreateModalOpen(true);
              }}
            >
              {t('qms.nonconformance_redesign.action_edit')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Trash2 size={14} />}
              onClick={() => setDeleteTarget(row)}
            >
              {t('qms.nonconformance_redesign.action_delete')}
            </Button>
          </div>
        ),
      },
    ],
    [setSelectedNc, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget, t]
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
          {t('qms.nonconformance_redesign.banner_demo_mode')}
        </div>
      )}
      <ListPageTemplate<Nonconformance>
        header={{
          title: t('qms.nonconformance_redesign.header_title'),
          subtitle: t('qms.nonconformance_redesign.header_subtitle'),
          breadcrumbs: [
            { label: t('qms.nonconformance_redesign.breadcrumb_home'), href: '/dashboard' },
            { label: t('qms.nonconformance_redesign.breadcrumb_qms') },
            { label: t('qms.nonconformance_redesign.breadcrumb_nc') },
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
                placeholder={t('qms.nonconformance_redesign.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                options={[
                  { value: 'all', label: t('qms.nonconformance_redesign.severity_filter_all') },
                  { value: 'minor', label: t('qms.nonconformance_redesign.severity_minor') },
                  { value: 'major', label: t('qms.nonconformance_redesign.severity_major') },
                  { value: 'critical', label: t('qms.nonconformance_redesign.severity_critical') },
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
                {t('qms.nonconformance_redesign.refresh')}
              </Button>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={() => {
                  setSelectedNc(null);
                  setCreateModalOpen(true);
                }}
              >
                {t('qms.nonconformance_redesign.create')}
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedItems}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle={t('qms.nonconformance_redesign.empty_title')}
        emptyDescription={t('qms.nonconformance_redesign.empty_description')}
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label={t('qms.nonconformance_redesign.stat_total')}
              value={stats.total}
              icon={AlertTriangle}
              accent='cyan'
            />
            <StatTile
              label={t('qms.nonconformance_redesign.stat_open')}
              value={stats.open}
              icon={Clock}
              accent='warning'
            />
            <StatTile
              label={t('qms.nonconformance_redesign.stat_critical')}
              value={stats.critical}
              icon={XCircle}
              accent='error'
            />
            <StatTile
              label={t('qms.nonconformance_redesign.stat_resolved')}
              value={stats.resolved}
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

      {filteredItems.length > 0 && (
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

      {/* 不合格单详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedNc(null);
        }}
        title={t('qms.nonconformance_redesign.drawer_title')}
        size='lg'
      >
        {selectedNc && (
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
                    {selectedNc.nc_no}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-bold)',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    {selectedNc.title}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Badge variant={severityConfig[selectedNc.severity]?.variant || 'default'}>
                    {severityConfig[selectedNc.severity]?.label || t('qms.nonconformance_redesign.unknown')}
                  </Badge>
                  <Badge variant={statusConfig[selectedNc.status]?.variant || 'default'}>
                    {statusConfig[selectedNc.status]?.label || t('qms.nonconformance_redesign.unknown')}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card title={t('qms.nonconformance_redesign.card_problem_desc')}>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                {selectedNc.description}
              </p>
            </Card>

            <Card title={t('qms.nonconformance_redesign.card_basic_info')}>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('qms.nonconformance_redesign.drawer_product_name')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedNc.product_name}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('qms.nonconformance_redesign.drawer_batch_no')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
                    {selectedNc.batch_no}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('qms.nonconformance_redesign.col_quantity')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedNc.quantity.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('qms.nonconformance_redesign.col_discovered_by')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedNc.discovered_by}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('qms.nonconformance_redesign.col_discovered_date')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedNc.discovered_date}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('qms.nonconformance_redesign.drawer_created_at')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {formatDateTime(selectedNc.created_at)}
                  </div>
                </div>
              </div>
            </Card>

            <Card title={t('qms.nonconformance_redesign.card_category')}>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Tag variant='default'>{typeConfig[selectedNc.nc_type]?.label || t('qms.nonconformance_redesign.unknown')}</Tag>
                <Tag variant='default'>
                  {severityConfig[selectedNc.severity]?.label || t('qms.nonconformance_redesign.unknown')} {t('qms.nonconformance_redesign.severity_suffix')}
                </Tag>
              </div>
            </Card>
          </div>
        )}
      </Drawer>

      {/* 新建/编辑不合格单弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={
          selectedNc
            ? t('qms.nonconformance_redesign.modal_edit_title')
            : t('qms.nonconformance_redesign.create')
        }
        size='lg'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setCreateModalOpen(false)}
            >
              {t('qms.nonconformance_redesign.cancel')}
            </Button>
            <Button
              variant='primary'
              onClick={() => {
                const formData: Partial<Nonconformance> = {
                  nc_no: '',
                  product_name:
                    (document.getElementById('field-4') as HTMLInputElement)?.value || '',
                  batch_no: '',
                  quantity: Number(
                    (document.getElementById('field-5') as HTMLInputElement)?.value || 0
                  ),
                  nc_type:
                    ((document.getElementById('field-2') as HTMLSelectElement)
                      ?.value as Nonconformance['nc_type']) || 'product',
                  discovered_by: '',
                  discovered_date: '',
                };
                if (selectedNc) {
                  updateMutation.mutate({ id: selectedNc.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedNc
                ? t('qms.nonconformance_redesign.modal_save')
                : t('qms.nonconformance_redesign.modal_submit_create')}
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
              {t('qms.nonconformance_redesign.field_title_label')}
            </label>
            <Input
              id='field-1'
              placeholder={t('qms.nonconformance_redesign.field_title_placeholder')}
              defaultValue={selectedNc?.title}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor='field-2'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('qms.nonconformance_redesign.field_type_label')}
              </label>
              <Select
                id='field-2'
                defaultValue={selectedNc?.nc_type || 'product'}
                options={[
                  { value: 'product', label: t('qms.nonconformance_redesign.type_product') },
                  { value: 'process', label: t('qms.nonconformance_redesign.type_process') },
                  { value: 'material', label: t('qms.nonconformance_redesign.type_material') },
                  { value: 'service', label: t('qms.nonconformance_redesign.type_service') },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('qms.nonconformance_redesign.field_severity_label')}
              </label>
              <Select
                id='field-3'
                defaultValue={selectedNc?.severity || 'minor'}
                options={[
                  { value: 'minor', label: t('qms.nonconformance_redesign.severity_minor') },
                  { value: 'major', label: t('qms.nonconformance_redesign.severity_major') },
                  { value: 'critical', label: t('qms.nonconformance_redesign.severity_critical') },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('qms.nonconformance_redesign.drawer_product_name')}
              </label>
              <Input
                id='field-4'
                placeholder={t('qms.nonconformance_redesign.field_product_placeholder')}
                defaultValue={selectedNc?.product_name}
              />
            </div>
            <div>
              <label
                htmlFor='field-5'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('qms.nonconformance_redesign.col_quantity')}
              </label>
              <Input
                id='field-5'
                type='number'
                placeholder={t('qms.nonconformance_redesign.field_quantity_placeholder')}
                defaultValue={selectedNc?.quantity}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor='field-6'
              style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
            >
              {t('qms.nonconformance_redesign.field_detail_label')}
            </label>
            <textarea
              id='field-6'
              rows={3}
              placeholder={t('qms.nonconformance_redesign.field_detail_placeholder')}
              defaultValue={selectedNc?.description}
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

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('qms.nonconformance_redesign.delete_title')}
        size='sm'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setDeleteTarget(null)}
            >
              {t('qms.nonconformance_redesign.cancel')}
            </Button>
            <Button
              variant='danger'
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {t('qms.nonconformance_redesign.delete_confirm')}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          {t('qms.nonconformance_redesign.delete_message', { nc_no: deleteTarget?.nc_no })}
        </p>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

export default QmsNonconformancePage;
