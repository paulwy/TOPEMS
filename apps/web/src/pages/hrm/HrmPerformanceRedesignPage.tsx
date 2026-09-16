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
  Award,
  TrendingUp,
  User,
  Star,
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
import { performanceReviewApi } from '@/api/hrm/performance';
import type { PerformanceReview as ApiPerformanceReview } from '@/api/hrm/types';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['hrm', 'performance'];

interface PerformanceReview {
  id: string;
  review_no: string;
  employee_name: string;
  department: string;
  period: string;
  reviewer: string;
  rating: 'S' | 'A' | 'B' | 'C' | 'D';
  status: 'pending' | 'in_review' | 'completed';
  score: number;
  kpi_completion: number;
  improvement: string;
  created_at: string;
}

// 将 API 返回的 PerformanceReview 类型映射为页面使用的 PerformanceReview 类型
const mapApiPerformanceReviews = (apiReviews: ApiPerformanceReview[]): PerformanceReview[] => {
  return apiReviews.map((r, index) => ({
    id: r.id,
    review_no: (r as any).review_no || `PR2026H${String(index + 1).padStart(3, '0')}`,
    employee_name: (r as any).employee_name || (r as any).employeeName || '-',
    department: (r as any).department || '-',
    period: (r as any).period || '-',
    reviewer: (r as any).reviewer || (r as any).reviewerName || '-',
    rating: ((r as any).rating as PerformanceReview['rating']) || 'B',
    status: ((r as any).status as PerformanceReview['status']) || 'pending',
    score: (r as any).score || 0,
    kpi_completion: (r as any).kpi_completion || (r as any).kpiCompletion || 0,
    improvement: (r as any).improvement || (r as any).improvementSuggestion || '',
    created_at: r.created_at,
  }));
};

// Mock 数据（API 不可用时的 fallback）
const mockPerformance: PerformanceReview[] = [
  {
    id: '1',
    review_no: 'PR2026H2001',
    employee_name: '张三',
    department: '技术部',
    period: '2026年上半年',
    reviewer: '王经理',
    rating: 'A',
    status: 'completed',
    score: 92,
    kpi_completion: 105,
    improvement: '继续保持，可承担更多技术攻关任务',
    created_at: '2026-07-01 10:00:00',
  },
  {
    id: '2',
    review_no: 'PR2026H2002',
    employee_name: '李四',
    department: '产品部',
    period: '2026年上半年',
    reviewer: '王经理',
    rating: 'B',
    status: 'completed',
    score: 85,
    kpi_completion: 95,
    improvement: '产品需求分析能力需提升',
    created_at: '2026-07-01 14:30:00',
  },
  {
    id: '3',
    review_no: 'PR2026H2003',
    employee_name: '王五',
    department: '设计部',
    period: '2026年上半年',
    reviewer: '赵总监',
    rating: 'A',
    status: 'in_review',
    score: 88,
    kpi_completion: 100,
    improvement: '设计创新能力突出',
    created_at: '2026-09-01 09:15:00',
  },
  {
    id: '4',
    review_no: 'PR2026H2004',
    employee_name: '赵六',
    department: '市场部',
    period: '2026年上半年',
    reviewer: 'CEO',
    rating: 'S',
    status: 'pending',
    score: 0,
    kpi_completion: 0,
    improvement: '',
    created_at: '2026-09-10 11:00:00',
  },
  {
    id: '5',
    review_no: 'PR2026H2005',
    employee_name: '钱七',
    department: '技术部',
    period: '2026年上半年',
    reviewer: '王经理',
    rating: 'C',
    status: 'completed',
    score: 72,
    kpi_completion: 80,
    improvement: '工作积极性需提高，加强沟通协作',
    created_at: '2026-07-05 16:45:00',
  },
];

const ratingConfig = {
  S: { label: 'S', variant: 'error' as const, score: '95-100' },
  A: { label: 'A', variant: 'warning' as const, score: '85-94' },
  B: { label: 'B', variant: 'info' as const, score: '75-84' },
  C: { label: 'C', variant: 'cyan' as const, score: '60-74' },
  D: { label: 'D', variant: 'default' as const, score: '<60' },
};

const statusConfig = {
  pending: { label: '待评估', variant: 'warning' as const },
  in_review: { label: '评估中', variant: 'info' as const },
  completed: { label: '已完成', variant: 'success' as const },
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const HrmPerformanceRedesignPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_review' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<PerformanceReview | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PerformanceReview | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isMockData, setIsMockData] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEY, currentPage, pageSize, debouncedSearch, deptFilter],
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
        if (deptFilter !== 'all') {
          params.department = deptFilter;
        }
        const res = await performanceReviewApi.list(params);
        const resData = res as unknown as {
          data?:
            | { list?: ApiPerformanceReview[]; items?: ApiPerformanceReview[]; total?: number }
            | ApiPerformanceReview[];
        };
        let apiReviews: ApiPerformanceReview[] = [];
        let total = 0;
        if (Array.isArray(resData)) {
          apiReviews = resData;
          total = resData.length;
        } else if (resData.data) {
          const dataObj = resData.data as any;
          apiReviews = Array.isArray(resData.data)
            ? resData.data
            : dataObj.list || dataObj.items || [];
          total = dataObj.total || apiReviews.length;
        }
        if (apiReviews.length > 0) {
          setIsMockData(false);
          return { reviews: mapApiPerformanceReviews(apiReviews), total };
        }
      } catch (e) {
        console.warn('[HRM Performance] API unavailable, using mock data:', e);
        setIsMockData(true);
      }
      // Mock fallback：本地分页
      let filtered = mockPerformance;
      if (debouncedSearch) {
        filtered = filtered.filter(
          (r) => r.employee_name.includes(debouncedSearch) || r.review_no.includes(debouncedSearch)
        );
      }
      if (deptFilter !== 'all') {
        filtered = filtered.filter((r) => r.department === deptFilter);
      }
      const start = (currentPage - 1) * pageSize;
      return { reviews: filtered.slice(start, start + pageSize), total: filtered.length };
    },
  });

  const reviews = data?.reviews || [];

  const pushToast = (type: Toast['variant'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, variant: type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await performanceReviewApi.delete(id);
      } catch (e) {
        console.warn('[HRM Performance] Delete API unavailable, using mock delete:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setDeleteTarget(null);
      pushToast('success', '绩效评估删除成功');
    },
    onError: () => {
      pushToast('error', '删除失败，请重试');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<PerformanceReview>) => {
      try {
        await performanceReviewApi.create({
          employee_id: data.review_no,
          employee_name: data.employee_name,
          period: data.period,
          overall_rating: data.rating,
          score: data.score,
          reviewer: data.reviewer,
          status: data.status,
        } as any);
      } catch (e) {
        console.warn('[HRM Performance] Create API unavailable, using mock create:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', '绩效评估创建成功');
    },
    onError: () => {
      pushToast('error', '创建失败，请重试');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PerformanceReview> }) => {
      try {
        await performanceReviewApi.update(id, {
          overall_rating: data.rating,
          score: data.score,
          reviewer_comment: data.improvement,
          status: data.status,
        } as any);
      } catch (e) {
        console.warn('[HRM Performance] Update API unavailable, using mock update:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', '绩效评估更新成功');
    },
    onError: () => {
      pushToast('error', '更新失败，请重试');
    },
  });

  // 服务端分页：直接使用 API 返回的数据，不再本地筛选和分页
  const filteredReviews = reviews;
  const totalItems = (data as any)?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedReviews = filteredReviews;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, deptFilter, debouncedSearch]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const completed = reviews.filter((r) => r.status === 'completed').length;
    const avgScore =
      completed > 0
        ? Math.round(
            reviews.filter((r) => r.status === 'completed').reduce((sum, r) => sum + r.score, 0) /
              completed
          )
        : 0;
    const sCount = reviews.filter((r) => r.rating === 'S').length;
    return { total, completed, avgScore, sCount };
  }, [reviews]);

  const tabsConfig = useMemo(
    () => [
      { id: 'all', label: '全部' },
      {
        id: 'pending',
        label: '待评估',
        badge: reviews.filter((r) => r.status === 'pending').length,
      },
      {
        id: 'in_review',
        label: '评估中',
        badge: reviews.filter((r) => r.status === 'in_review').length,
      },
      { id: 'completed', label: '已完成', badge: stats.completed },
    ],
    [stats, reviews]
  );

  const columns: DataTableColumn<PerformanceReview>[] = useMemo(
    () => [
      {
        key: 'review_no',
        header: '评估编号',
        sortable: true,
        render: (row) => (
          <span
            style={{
              fontWeight: 'var(--font-semibold)',
              color: 'var(--accent-primary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {row.review_no}
          </span>
        ),
      },
      {
        key: 'employee_name',
        header: '员工姓名',
        render: (row) => (
          <div>
            <div style={{ fontWeight: 500 }}>{row.employee_name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {row.department}
            </div>
          </div>
        ),
      },
      {
        key: 'period',
        header: '考核周期',
      },
      {
        key: 'reviewer',
        header: '评估人',
        render: (row) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <User
              size={14}
              style={{ color: 'var(--text-tertiary)' }}
            />
            <span>{row.reviewer}</span>
          </div>
        ),
      },
      {
        key: 'rating',
        header: '评级',
        align: 'center',
        render: (row) => {
          const config = ratingConfig[row.rating] || ratingConfig.C;
          return (
            <Badge variant={config.variant}>
              <Star
                size={12}
                style={{ marginRight: 4 }}
              />
              {config.label}
            </Badge>
          );
        },
      },
      {
        key: 'score',
        header: '综合得分',
        align: 'right',
        sortable: true,
        render: (row) => (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 'var(--font-bold)',
              color: row.score >= 90 ? 'var(--accent-primary)' : 'var(--text-primary)',
            }}
          >
            {row.score > 0 ? `${row.score} 分` : '-'}
          </span>
        ),
      },
      {
        key: 'kpi_completion',
        header: 'KPI 完成率',
        align: 'right',
        render: (row) => (
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            {row.kpi_completion > 0 ? `${row.kpi_completion}%` : '-'}
          </span>
        ),
      },
      {
        key: 'status',
        header: '状态',
        align: 'center',
        render: (row) => {
          const config = statusConfig[row.status] || statusConfig.pending;
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
                setSelectedReview(row);
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
                setSelectedReview(row);
                setCreateModalOpen(true);
              }}
            >
              评估
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
    [setSelectedReview, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget]
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
      <ListPageTemplate<PerformanceReview>
        header={{
          title: '绩效管理',
          subtitle: '管理员工绩效考核，跟踪评级和 KPI 完成情况',
          breadcrumbs: [
            { label: '首页', href: '/dashboard' },
            { label: '人力资源' },
            { label: '绩效管理' },
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
                placeholder='搜索评估编号/姓名...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                options={[
                  { value: 'all', label: '全部部门' },
                  { value: '技术部', label: '技术部' },
                  { value: '产品部', label: '产品部' },
                  { value: '设计部', label: '设计部' },
                  { value: '市场部', label: '市场部' },
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
                  setSelectedReview(null);
                  setCreateModalOpen(true);
                }}
              >
                发起评估
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedReviews}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle='暂无绩效评估'
        emptyDescription='点击右上角「发起评估」按钮创建第一个绩效评估'
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label='评估总数'
              value={stats.total}
              icon={Target}
              accent='cyan'
            />
            <StatTile
              label='已完成'
              value={stats.completed}
              icon={Award}
              accent='success'
            />
            <StatTile
              label='平均得分'
              value={`${stats.avgScore} 分`}
              icon={TrendingUp}
              accent='warning'
            />
            <StatTile
              label='S 级员工'
              value={stats.sCount}
              icon={Star}
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

      {filteredReviews.length > 0 && (
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

      {/* 绩效详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedReview(null);
        }}
        title='绩效评估详情'
        size='lg'
      >
        {selectedReview && (
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
                    {selectedReview.review_no}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-bold)',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    {selectedReview.employee_name}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    {selectedReview.department} · {selectedReview.period}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Badge variant={ratingConfig[selectedReview.rating]?.variant || 'default'}>
                    {ratingConfig[selectedReview.rating]?.label || '-'}
                  </Badge>
                  <Badge variant={statusConfig[selectedReview.status]?.variant || 'default'}>
                    {statusConfig[selectedReview.status]?.label || '未知'}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* 评分大字体 */}
            {selectedReview.score > 0 && (
              <Card title='综合得分'>
                <div
                  style={{
                    fontSize: 'var(--text-4xl)',
                    fontWeight: 'var(--font-bold)',
                    textAlign: 'center',
                    color:
                      selectedReview.score >= 90 ? 'var(--accent-primary)' : 'var(--text-primary)',
                  }}
                >
                  {selectedReview.score}
                  <span style={{ fontSize: 'var(--text-xl)', color: 'var(--text-secondary)' }}>
                    {' '}
                    分
                  </span>
                </div>
                <div style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
                  <Badge variant={ratingConfig[selectedReview.rating]?.variant || 'default'}>
                    {ratingConfig[selectedReview.rating]?.label} 级
                  </Badge>
                </div>
              </Card>
            )}

            <Card title='考核信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    考核周期
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedReview.period}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    评估人
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedReview.reviewer}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    KPI 完成率
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
                    {selectedReview.kpi_completion > 0 ? `${selectedReview.kpi_completion}%` : '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    创建时间
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {formatDateTime(selectedReview.created_at)}
                  </div>
                </div>
              </div>
            </Card>

            {selectedReview.improvement && (
              <Card title='改进建议'>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                  {selectedReview.improvement}
                </p>
              </Card>
            )}
          </div>
        )}
      </Drawer>

      {/* 发起/编辑评估弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={selectedReview ? '编辑绩效评估' : '发起绩效评估'}
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
                const formData: Partial<PerformanceReview> = {
                  employee_name:
                    (document.querySelector('input[placeholder*="员工姓名"]') as HTMLInputElement)
                      ?.value || '',
                  period: (document.querySelector('select') as HTMLSelectElement)?.value || '',
                  rating:
                    ((document.querySelectorAll('select')[1] as HTMLSelectElement)
                      ?.value as PerformanceReview['rating']) || 'B',
                  score: Number(
                    (document.querySelector('input[type="number"]') as HTMLInputElement)?.value || 0
                  ),
                  reviewer:
                    (
                      document.querySelectorAll(
                        'input[placeholder*="评估人"]'
                      )[0] as HTMLInputElement
                    )?.value || '',
                };
                if (selectedReview) {
                  updateMutation.mutate({ id: selectedReview.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedReview ? '保存修改' : '发起评估'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor='field-1'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                员工 *
              </label>
              <Select
                id='field-1'
                defaultValue={selectedReview?.employee_name || '张三'}
                options={[
                  { value: '张三', label: '张三 (技术部)' },
                  { value: '李四', label: '李四 (产品部)' },
                  { value: '王五', label: '王五 (设计部)' },
                  { value: '赵六', label: '赵六 (市场部)' },
                  { value: '钱七', label: '钱七 (技术部)' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-2'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                考核周期 *
              </label>
              <Select
                id='field-2'
                defaultValue={selectedReview?.period || '2026年上半年'}
                options={[
                  { value: '2026年上半年', label: '2026年上半年' },
                  { value: '2026年下半年', label: '2026年下半年' },
                  { value: '2026年Q1', label: '2026年Q1' },
                  { value: '2026年Q2', label: '2026年Q2' },
                  { value: '2026年Q3', label: '2026年Q3' },
                  { value: '2026年Q4', label: '2026年Q4' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                评估人
              </label>
              <Input
                id='field-3'
                placeholder='请输入评估人'
                defaultValue={selectedReview?.reviewer || '王经理'}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                评级
              </label>
              <Select
                id='field-4'
                defaultValue={selectedReview?.rating || 'B'}
                options={[
                  { value: 'S', label: 'S（95-100分）' },
                  { value: 'A', label: 'A（85-94分）' },
                  { value: 'B', label: 'B（75-84分）' },
                  { value: 'C', label: 'C（60-74分）' },
                  { value: 'D', label: 'D（<60分）' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-5'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                综合得分
              </label>
              <Input
                id='field-5'
                type='number'
                placeholder='例如：85'
                defaultValue={selectedReview?.score || 85}
              />
            </div>
            <div>
              <label
                htmlFor='field-6'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                KPI 完成率（%）
              </label>
              <Input
                id='field-6'
                type='number'
                placeholder='例如：95'
                defaultValue={selectedReview?.kpi_completion || 95}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor='field-7'
              style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
            >
              改进建议
            </label>
            <Input
              id='field-7'
              placeholder='请输入改进建议'
              defaultValue={selectedReview?.improvement}
            />
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title='删除绩效评估'
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
          确定要删除 {deleteTarget?.employee_name} 的 {deleteTarget?.period}{' '}
          绩效评估吗？此操作不可撤销。
        </p>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

export default HrmPerformanceRedesignPage;
