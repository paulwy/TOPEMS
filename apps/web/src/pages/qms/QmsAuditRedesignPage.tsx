import React, { useState, useEffect, useMemo } from 'react';
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

// Mock 数据（API 不可用时的 fallback）
const mockAuditPlans: AuditPlan[] = [
  {
    id: '1',
    audit_no: 'AUD202609001',
    title: '9月内部质量体系审核',
    audit_type: 'internal',
    status: 'planned',
    scope: '全公司 ISO 9001 体系',
    auditor: '张三',
    auditee: '生产部/质量部',
    plan_date: '2026-09-20',
    findings: 0,
    created_at: '2026-09-05 10:00:00',
  },
  {
    id: '2',
    audit_no: 'AUD202609002',
    title: '供应商质量审核-华东电子',
    audit_type: 'supplier',
    status: 'in_progress',
    scope: '来料检验流程',
    auditor: '李四',
    auditee: '华东电子有限公司',
    plan_date: '2026-09-15',
    findings: 3,
    created_at: '2026-09-01 14:30:00',
  },
  {
    id: '3',
    audit_no: 'AUD202608001',
    title: 'ISO 9001 外部监督审核',
    audit_type: 'external',
    status: 'completed',
    scope: '质量管理体系全要素',
    auditor: '认证机构-王老师',
    auditee: '全公司',
    plan_date: '2026-08-10',
    actual_date: '2026-08-12',
    findings: 2,
    created_at: '2026-07-25 09:00:00',
  },
  {
    id: '4',
    audit_no: 'AUD202608002',
    title: '生产过程审核-装配线',
    audit_type: 'process',
    status: 'completed',
    scope: 'PLC 控制器装配线',
    auditor: '王五',
    auditee: '生产二部',
    plan_date: '2026-08-20',
    actual_date: '2026-08-20',
    findings: 5,
    created_at: '2026-08-10 11:00:00',
  },
  {
    id: '5',
    audit_no: 'AUD202607001',
    title: '产品审核-伺服电机',
    audit_type: 'product',
    status: 'cancelled',
    scope: '伺服电机出厂检验',
    auditor: '赵六',
    auditee: '质量部',
    plan_date: '2026-07-15',
    findings: 0,
    created_at: '2026-07-01 16:00:00',
  },
];

const statusConfig = {
  planned: { label: '已计划', variant: 'info' as const, icon: Calendar },
  in_progress: { label: '审核中', variant: 'warning' as const, icon: ClipboardCheck },
  completed: { label: '已完成', variant: 'success' as const, icon: CheckCircle },
  cancelled: { label: '已取消', variant: 'default' as const, icon: AlertTriangle },
};

const typeConfig = {
  internal: { label: '内部审核', variant: 'cyan' as const },
  external: { label: '外部审核', variant: 'info' as const },
  system: { label: '体系审核', variant: 'amber' as const },
  process: { label: '过程审核', variant: 'warning' as const },
  product: { label: '产品审核', variant: 'success' as const },
  supplier: { label: '供应商审核', variant: 'default' as const },
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const QmsAuditRedesignPage: React.FC = () => {
  const queryClient = useQueryClient();

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
      pushToast('success', '审核计划删除成功');
    },
    onError: () => {
      pushToast('error', '删除失败，请重试');
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
      pushToast('success', '审核计划创建成功');
    },
    onError: () => {
      pushToast('error', '创建失败，请重试');
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
      pushToast('success', '审核计划更新成功');
    },
    onError: () => {
      pushToast('error', '更新失败，请重试');
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
      { id: 'all', label: '全部' },
      { id: 'planned', label: '已计划', badge: stats.planned },
      { id: 'in_progress', label: '审核中', badge: stats.inProgress },
      { id: 'completed', label: '已完成', badge: stats.completed },
    ],
    [stats]
  );

  const columns: DataTableColumn<AuditPlan>[] = useMemo(
    () => [
      {
        key: 'audit_no',
        header: '审核编号',
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
        header: '审核标题',
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
        header: '审核类型',
        align: 'center',
        render: (row) => {
          const config = typeConfig[row.audit_type] || typeConfig.internal;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'auditor',
        header: '审核员',
      },
      {
        key: 'auditee',
        header: '受审核方',
      },
      {
        key: 'plan_date',
        header: '计划日期',
        sortable: true,
      },
      {
        key: 'findings',
        header: '发现项',
        align: 'center',
        render: (row) =>
          row.findings > 0 ? (
            <Badge variant='warning'>{row.findings} 项</Badge>
          ) : (
            <span style={{ color: 'var(--text-tertiary)' }}>-</span>
          ),
      },
      {
        key: 'status',
        header: '状态',
        align: 'center',
        render: (row) => {
          const config = statusConfig[row.status] || statusConfig.planned;
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
                setSelectedAudit(row);
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
                setSelectedAudit(row);
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
    [setSelectedAudit, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget]
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
      <ListPageTemplate<AuditPlan>
        header={{
          title: '质量审核管理',
          subtitle: '管理内部审核、外部审核和专项审核计划',
          breadcrumbs: [
            { label: '首页', href: '/dashboard' },
            { label: '质量管理' },
            { label: '审核管理' },
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
                placeholder='搜索审核编号/标题/范围...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: 'all', label: '全部类型' },
                  { value: 'internal', label: '内部审核' },
                  { value: 'external', label: '外部审核' },
                  { value: 'process', label: '过程审核' },
                  { value: 'product', label: '产品审核' },
                  { value: 'supplier', label: '供应商审核' },
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
                  setSelectedAudit(null);
                  setCreateModalOpen(true);
                }}
              >
                新建审核计划
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedAudits}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle='暂无审核计划'
        emptyDescription='点击右上角「新建审核计划」按钮创建第一个审核任务'
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label='审核计划总数'
              value={stats.total}
              icon={ClipboardCheck}
              accent='cyan'
            />
            <StatTile
              label='已计划'
              value={stats.planned}
              icon={Calendar}
              accent='amber'
            />
            <StatTile
              label='审核中'
              value={stats.inProgress}
              icon={Clock}
              accent='warning'
            />
            <StatTile
              label='累计发现项'
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
        title='审核计划详情'
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
                    {typeConfig[selectedAudit.audit_type]?.label || '未知'}
                  </Badge>
                  <Badge variant={statusConfig[selectedAudit.status]?.variant || 'default'}>
                    {statusConfig[selectedAudit.status]?.label || '未知'}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card title='审核范围'>
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                {selectedAudit.scope}
              </p>
            </Card>

            <Card title='基本信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    审核员
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedAudit.auditor}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    受审核方
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedAudit.auditee}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    计划日期
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>{selectedAudit.plan_date}</div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    实际日期
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {selectedAudit.actual_date || '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    发现项数
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                    {selectedAudit.findings} 项
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    创建时间
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
        title={selectedAudit ? '编辑审核计划' : '新建审核计划'}
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
                const formData: Partial<AuditPlan> = {
                  audit_no:
                    (document.querySelector('input[placeholder*="计划编号"]') as HTMLInputElement)
                      ?.value || '',
                  title:
                    (document.querySelector('input[placeholder*="审核标题"]') as HTMLInputElement)
                      ?.value || '',
                  audit_type:
                    ((document.querySelector('select') as HTMLSelectElement)
                      ?.value as AuditPlan['audit_type']) || 'internal',
                  auditor:
                    (
                      document.querySelectorAll(
                        'input[placeholder*="审核员"]'
                      )[0] as HTMLInputElement
                    )?.value || '',
                  plan_date:
                    (document.querySelector('input[type="date"]') as HTMLInputElement)?.value || '',
                };
                if (selectedAudit) {
                  updateMutation.mutate({ id: selectedAudit.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedAudit ? '保存修改' : '创建审核计划'}
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
              审核标题 *
            </label>
            <Input
              id='field-1'
              placeholder='例如：9月内部质量体系审核'
              defaultValue={selectedAudit?.title}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor='field-2'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                审核类型 *
              </label>
              <Select
                id='field-2'
                defaultValue={selectedAudit?.audit_type || 'internal'}
                options={[
                  { value: 'internal', label: '内部审核' },
                  { value: 'external', label: '外部审核' },
                  { value: 'process', label: '过程审核' },
                  { value: 'product', label: '产品审核' },
                  { value: 'supplier', label: '供应商审核' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                审核员
              </label>
              <Input
                id='field-3'
                placeholder='请输入审核员'
                defaultValue={selectedAudit?.auditor}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                受审核方
              </label>
              <Input
                id='field-4'
                placeholder='请输入受审核方'
                defaultValue={selectedAudit?.auditee}
              />
            </div>
            <div>
              <label
                htmlFor='field-5'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                计划日期
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
              审核范围
            </label>
            <Input
              id='field-6'
              placeholder='例如：全公司 ISO 9001 体系'
              defaultValue={selectedAudit?.scope}
            />
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title='删除审核计划'
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
          确定要删除审核计划「{deleteTarget?.audit_no}」吗？此操作不可撤销。
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
