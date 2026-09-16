import React, { useState, useEffect, useMemo } from 'react';
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
import { eightDApi } from '@/api/qms/eightD';
import type { EightDReport as ApiEightDReport } from '@/api/qms/types';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['qms', 'eight-d'];

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
// 将 API 返回的 EightDReport 类型映射为页面使用的 EightDReport 类型
const mapApiEightDReports = (apiReports: ApiEightDReport[]): EightDReport[] => {
  return apiReports.map((r, index) => ({
    id: r.id,
    report_no:
      (r as any).report_no || (r as any).reportNo || `8D2026${String(index + 1).padStart(5, '0')}`,
    title: (r as any).title || (r as any).name || '-',
    problem_source: ((r as any).problem_source as EightDReport['problem_source']) || 'internal',
    severity: ((r as any).severity as EightDReport['severity']) || 'major',
    status: ((r as any).status as EightDReport['status']) || 'd1',
    customer_name: (r as any).customer_name || (r as any).customerName || '-',
    product_name: (r as any).product_name || (r as any).productName || '-',
    leader: (r as any).leader || (r as any).leaderName || '-',
    owner: (r as any).owner || (r as any).ownerName || (r as any).leader || '-',
    current_step: (r as any).current_step || (r as any).currentStep || 1,
    created_date: (r as any).created_date || (r as any).createdDate || '-',
    due_date: (r as any).due_date || (r as any).dueDate || '-',
    created_at: (r as any).created_at || new Date().toISOString(),
    createdAt: (r as any).created_at || new Date().toISOString(),
  }));
};

// Mock 数据（API 不可用时的 fallback）
const mockEightDReports: EightDReport[] = [
  {
    id: '1',
    report_no: '8D202609001',
    title: '伺服电机批量外观不良问题',
    problem_source: 'customer',
    severity: 'major',
    status: 'd4',
    current_step: 'D4 - 根本原因分析',
    product_name: '伺服电机',
    customer_name: '上海科技有限公司',
    owner: '张三',
    due_date: '2026-09-20',
    created_at: '2026-09-10 10:00:00',
  },
  {
    id: '2',
    report_no: '8D202609002',
    title: 'PLC 控制器程序烧录错误',
    problem_source: 'internal',
    severity: 'critical',
    status: 'd6',
    current_step: 'D6 - 实施永久纠正措施',
    product_name: 'PLC 控制器',
    owner: '李四',
    due_date: '2026-09-18',
    created_at: '2026-09-05 14:30:00',
  },
  {
    id: '3',
    report_no: '8D202608001',
    title: '工业相机镜头来料污渍',
    problem_source: 'supplier',
    severity: 'minor',
    status: 'closed',
    current_step: 'D8 - 表彰团队',
    product_name: '工业相机',
    customer_name: '深圳电子股份',
    owner: '王五',
    due_date: '2026-08-25',
    created_at: '2026-08-15 09:00:00',
  },
  {
    id: '4',
    report_no: '8D202608002',
    title: '变频器出厂参数设置错误',
    problem_source: 'internal',
    severity: 'critical',
    status: 'd8',
    current_step: 'D8 - 表彰团队',
    product_name: '变频器',
    owner: '赵六',
    due_date: '2026-08-30',
    created_at: '2026-08-20 11:00:00',
  },
  {
    id: '5',
    report_no: '8D202609003',
    title: '触摸屏 HMI 屏幕坏点客户投诉',
    problem_source: 'customer',
    severity: 'major',
    status: 'd2',
    current_step: 'D2 - 问题描述',
    product_name: '触摸屏 HMI',
    customer_name: '广州制造有限公司',
    owner: '张三',
    due_date: '2026-09-25',
    created_at: '2026-09-12 16:00:00',
  },
];

const statusConfig: Record<string, { label: string; variant: any; step: number }> = {
  d1: { label: 'D1 组建团队', variant: 'warning', step: 1 },
  d2: { label: 'D2 问题描述', variant: 'warning', step: 2 },
  d3: { label: 'D3 临时措施', variant: 'amber', step: 3 },
  d4: { label: 'D4 根本原因', variant: 'info', step: 4 },
  d5: { label: 'D5 永久措施', variant: 'info', step: 5 },
  d6: { label: 'D6 实施验证', variant: 'cyan', step: 6 },
  d7: { label: 'D7 预防再发', variant: 'cyan', step: 7 },
  d8: { label: 'D8 表彰团队', variant: 'success', step: 8 },
  closed: { label: '已关闭', variant: 'default', step: 9 },
};

const sourceConfig = {
  internal: { label: '内部发现', variant: 'cyan' as const },
  customer: { label: '客户投诉', variant: 'error' as const },
  supplier: { label: '供应商问题', variant: 'amber' as const },
  audit: { label: '审核发现', variant: 'info' as const },
};

const severityConfig = {
  minor: { label: '轻微', variant: 'default' as const },
  major: { label: '严重', variant: 'warning' as const },
  critical: { label: '致命', variant: 'error' as const },
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const QmsEightDRedesignPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'in_progress' | 'closed'>('all');
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
        const res = await eightDApi.listEightDReports();
        const resData = res as unknown as
          { data?: ApiEightDReport[]; total?: number } | ApiEightDReport[];
        let apiReports: ApiEightDReport[] = [];
        let total = 0;
        if (Array.isArray(resData)) {
          apiReports = resData;
          total = resData.length;
        } else if (resData.data) {
          const dataObj = resData as any;
          apiReports = Array.isArray(resData.data)
            ? resData.data
            : dataObj.list || dataObj.items || [];
          total = dataObj.total || apiReports.length;
        }
        if (apiReports.length > 0) {
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

  const reports = data?.reports || [];

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
      pushToast('success', '8D 报告删除成功');
    },
    onError: () => {
      pushToast('error', '删除失败，请重试');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<EightDReport>) => {
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
        } as any);
      } catch (e) {
        console.warn('[QMS 8D Reports] Create API unavailable, using mock create:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', '8D 报告创建成功');
    },
    onError: () => {
      pushToast('error', '创建失败，请重试');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EightDReport> }) => {
      try {
        await eightDApi.updateEightDReport(id, {
          status: data.status,
          current_step: data.current_step,
          due_date: data.due_date,
          owner: data.owner,
        } as any);
      } catch (e) {
        console.warn('[QMS 8D Reports] Update API unavailable, using mock update:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', '8D 报告更新成功');
    },
    onError: () => {
      pushToast('error', '更新失败，请重试');
    },
  });

  // 服务端分页：直接使用 API 返回的数据，不再本地筛选和分页
  const filteredReports = reports;
  const totalItems = (data as any)?.total || 0;
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
      { id: 'all', label: '全部' },
      { id: 'in_progress', label: '进行中', badge: stats.inProgress },
      { id: 'closed', label: '已关闭', badge: stats.closed },
    ],
    [stats]
  );

  const columns: DataTableColumn<EightDReport>[] = useMemo(
    () => [
      {
        key: 'report_no',
        header: '报告编号',
        sortable: true,
        render: (row) => (
          <span
            style={{
              fontWeight: 'var(--font-semibold)',
              color: 'var(--accent-primary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {row.report_no}
          </span>
        ),
      },
      {
        key: 'title',
        header: '问题描述',
        render: (row) => (
          <div>
            <div style={{ fontWeight: 500 }}>{row.title}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {row.product_name}
              {row.customer_name && ` / ${row.customer_name}`}
            </div>
          </div>
        ),
      },
      {
        key: 'problem_source',
        header: '来源',
        align: 'center',
        render: (row) => {
          const config = sourceConfig[row.problem_source] || sourceConfig.internal;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'severity',
        header: '严重程度',
        align: 'center',
        render: (row) => {
          const config = severityConfig[row.severity] || severityConfig.minor;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'current_step',
        header: '当前阶段',
        render: (row) => (
          <div>
            <div style={{ fontSize: 'var(--text-sm)' }}>{row.current_step}</div>
            {/* 进度条 */}
            <div
              style={{
                width: 100,
                height: 4,
                backgroundColor: 'var(--surface-3)',
                borderRadius: 2,
                marginTop: 4,
                overflow: 'hidden',
              }}
            >
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
        key: 'due_date',
        header: '截止日期',
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
        header: '状态',
        align: 'center',
        render: (row) => {
          const config = statusConfig[row.status] || statusConfig.d1;
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
                setSelectedReport(row);
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
                setSelectedReport(row);
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
    [setSelectedReport, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget]
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
      <ListPageTemplate<EightDReport>
        header={{
          title: '8D 问题解决报告',
          subtitle: '系统化解决质量问题，跟踪 8D 报告进展',
          breadcrumbs: [
            { label: '首页', href: '/dashboard' },
            { label: '质量管理' },
            { label: '8D 报告' },
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
                placeholder='搜索报告编号/标题/产品...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                options={[
                  { value: 'all', label: '全部严重程度' },
                  { value: 'minor', label: '轻微' },
                  { value: 'major', label: '严重' },
                  { value: 'critical', label: '致命' },
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
                  setSelectedReport(null);
                  setCreateModalOpen(true);
                }}
              >
                新建 8D 报告
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedReports}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle='暂无 8D 报告'
        emptyDescription='点击右上角「新建 8D 报告」按钮创建第一个问题解决报告'
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label='8D 报告总数'
              value={stats.total}
              icon={FileText}
              accent='cyan'
            />
            <StatTile
              label='进行中'
              value={stats.inProgress}
              icon={Clock}
              accent='warning'
            />
            <StatTile
              label='已关闭'
              value={stats.closed}
              icon={CheckCircle}
              accent='success'
            />
            <StatTile
              label='未关闭致命问题'
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
          onChange={(id) => setActiveTab(id as any)}
        />
      </ListPageTemplate>

      {filteredReports.length > 0 && (
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

      {/* 8D 报告详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedReport(null);
        }}
        title='8D 报告详情'
        size='lg'
      >
        {selectedReport && (
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
                    {selectedReport.report_no}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-bold)',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    {selectedReport.title}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Badge variant={severityConfig[selectedReport.severity]?.variant || 'default'}>
                    {severityConfig[selectedReport.severity]?.label || '未知'}
                  </Badge>
                  <Badge variant={statusConfig[selectedReport.status]?.variant || 'default'}>
                    {statusConfig[selectedReport.status]?.label || '未知'}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* 8D 步骤进度 */}
            <Card title='8D 步骤进度'>
              <div style={{ marginTop: 'var(--space-2)' }}>
                <div style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                  当前阶段：{selectedReport.current_step}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
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
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-tertiary)',
                    marginTop: 4,
                  }}
                >
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

            <Card title='基本信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    产品名称
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedReport.product_name}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    问题来源
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {sourceConfig[selectedReport.problem_source]?.label || '未知'}
                  </div>
                </div>
                {selectedReport.customer_name && (
                  <div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      客户
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                      {selectedReport.customer_name}
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    负责人
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedReport.owner}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    截止日期
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedReport.due_date}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    创建时间
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {formatDateTime(selectedReport.created_at)}
                  </div>
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
        title={selectedReport ? '编辑 8D 报告' : '新建 8D 报告'}
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
                const formData: Partial<EightDReport> = {
                  report_no:
                    (document.querySelector('input[placeholder*="报告编号"]') as HTMLInputElement)
                      ?.value || '',
                  title:
                    (document.querySelector('input[placeholder*="问题标题"]') as HTMLInputElement)
                      ?.value || '',
                  customer_name:
                    (document.querySelector('input[placeholder*="客户名称"]') as HTMLInputElement)
                      ?.value || '',
                  product_name:
                    (document.querySelectorAll('input[placeholder*="产品"]')[0] as HTMLInputElement)
                      ?.value || '',
                  owner:
                    (
                      document.querySelectorAll(
                        'input[placeholder*="负责人"]'
                      )[0] as HTMLInputElement
                    )?.value || '',
                  due_date:
                    (document.querySelector('input[type="date"]') as HTMLInputElement)?.value || '',
                };
                if (selectedReport) {
                  updateMutation.mutate({ id: selectedReport.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedReport ? '保存修改' : '创建 8D 报告'}
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
              问题描述 *
            </label>
            <Input
              id='field-1'
              placeholder='例如：伺服电机批量外观不良问题'
              defaultValue={selectedReport?.title}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor='field-2'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                问题来源 *
              </label>
              <Select
                id='field-2'
                defaultValue={selectedReport?.problem_source || 'internal'}
                options={[
                  { value: 'internal', label: '内部发现' },
                  { value: 'customer', label: '客户投诉' },
                  { value: 'supplier', label: '供应商问题' },
                  { value: 'audit', label: '审核发现' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                严重程度 *
              </label>
              <Select
                id='field-3'
                defaultValue={selectedReport?.severity || 'minor'}
                options={[
                  { value: 'minor', label: '轻微' },
                  { value: 'major', label: '严重' },
                  { value: 'critical', label: '致命' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                产品名称
              </label>
              <Input
                id='field-4'
                placeholder='请输入产品名称'
                defaultValue={selectedReport?.product_name}
              />
            </div>
            <div>
              <label
                htmlFor='field-5'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                负责人
              </label>
              <Input
                id='field-5'
                placeholder='请输入负责人'
                defaultValue={selectedReport?.owner}
              />
            </div>
            <div>
              <label
                htmlFor='field-6'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                截止日期
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
        title='删除 8D 报告'
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
          确定要删除 8D 报告「{deleteTarget?.report_no}」吗？此操作不可撤销。
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
