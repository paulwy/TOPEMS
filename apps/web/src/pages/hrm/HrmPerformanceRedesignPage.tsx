import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
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

// Mock 数据（API 不可用时的 fallback）在组件内用 t() 构造，见 mockPerformance

const ratingConfig = {
  S: { label: 'S', variant: 'error' as const, score: '95-100' },
  A: { label: 'A', variant: 'warning' as const, score: '85-94' },
  B: { label: 'B', variant: 'info' as const, score: '75-84' },
  C: { label: 'C', variant: 'cyan' as const, score: '60-74' },
  D: { label: 'D', variant: 'default' as const, score: '<60' },
};

const statusConfig: Record<
  string,
  { label: string; variant: 'warning' | 'info' | 'success' | 'default' }
> = {
  pending: { label: i18n.t('hrm.performance_redesign_page.k15'), variant: 'warning' },
  in_review: { label: i18n.t('hrm.performance_redesign_page.k16'), variant: 'info' },
  completed: { label: i18n.t('hrm.performance_redesign_page.k17'), variant: 'success' },
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const HrmPerformanceRedesignPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mockPerformance: PerformanceReview[] = [
    {
      id: '1',
      review_no: 'PR2026H2001',
      employee_name: t('hrm.demo.person_zhang'),
      department: t('hrm.demo.dept_tech'),
      period: t('hrm.demo.period_h1'),
      reviewer: t('hrm.demo.reviewer_wang'),
      rating: 'A',
      status: 'completed',
      score: 92,
      kpi_completion: 105,
      improvement: t('hrm.demo.perf_improvement_1'),
      created_at: '2026-07-01 10:00:00',
    },
    {
      id: '2',
      review_no: 'PR2026H2002',
      employee_name: t('hrm.demo.person_li'),
      department: t('hrm.demo.dept_product'),
      period: t('hrm.demo.period_h1'),
      reviewer: t('hrm.demo.reviewer_wang'),
      rating: 'B',
      status: 'completed',
      score: 85,
      kpi_completion: 95,
      improvement: t('hrm.demo.perf_improvement_2'),
      created_at: '2026-07-01 14:30:00',
    },
    {
      id: '3',
      review_no: 'PR2026H2003',
      employee_name: t('hrm.demo.person_wang'),
      department: t('hrm.demo.dept_design'),
      period: t('hrm.demo.period_h1'),
      reviewer: t('hrm.demo.reviewer_zhao'),
      rating: 'A',
      status: 'in_review',
      score: 88,
      kpi_completion: 100,
      improvement: t('hrm.demo.perf_improvement_3'),
      created_at: '2026-09-01 09:15:00',
    },
    {
      id: '4',
      review_no: 'PR2026H2004',
      employee_name: t('hrm.demo.person_zhao'),
      department: t('hrm.demo.dept_market'),
      period: t('hrm.demo.period_h1'),
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
      employee_name: t('hrm.demo.person_qian'),
      department: t('hrm.demo.dept_tech'),
      period: t('hrm.demo.period_h1'),
      reviewer: t('hrm.demo.reviewer_wang'),
      rating: 'C',
      status: 'completed',
      score: 72,
      kpi_completion: 80,
      improvement: t('hrm.demo.perf_improvement_4'),
      created_at: '2026-07-05 16:45:00',
    },
  ];

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
      pushToast('success', t('hrm.performance_redesign_page.k59'));
    },
    onError: () => {
      pushToast('error', t('hrm.performance_redesign_page.k60'));
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
      pushToast('success', t('hrm.performance_redesign_page.k61'));
    },
    onError: () => {
      pushToast('error', t('hrm.performance_redesign_page.k62'));
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
      pushToast('success', t('hrm.performance_redesign_page.k63'));
    },
    onError: () => {
      pushToast('error', t('hrm.performance_redesign_page.k64'));
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
      { id: 'all', label: t('hrm.performance_redesign_page.k14') },
      {
        id: 'pending',
        label: t('hrm.performance_redesign_page.k15'),
        badge: reviews.filter((r) => r.status === 'pending').length,
      },
      {
        id: 'in_review',
        label: t('hrm.performance_redesign_page.k16'),
        badge: reviews.filter((r) => r.status === 'in_review').length,
      },
      { id: 'completed', label: t('hrm.performance_redesign_page.k17'), badge: stats.completed },
    ],
    [stats, reviews, t]
  );

  const columns: DataTableColumn<PerformanceReview>[] = useMemo(
    () => [
      {
        key: 'review_no',
        header: t('hrm.performance_redesign_page.k18'),
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
        header: t('hrm.performance_redesign_page.k19'),
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
        header: t('hrm.performance_redesign_page.k20'),
      },
      {
        key: 'reviewer',
        header: t('hrm.performance_redesign_page.k21'),
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
        header: t('hrm.performance_redesign_page.k22'),
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
        header: t('hrm.performance_redesign_page.k23'),
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
            {row.score > 0 ? `${row.score} ${t('hrm.performance_redesign_page.k30')}` : '-'}
          </span>
        ),
      },
      {
        key: 'kpi_completion',
        header: t('hrm.performance_redesign_page.k24'),
        align: 'right',
        render: (row) => (
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            {row.kpi_completion > 0 ? `${row.kpi_completion}%` : '-'}
          </span>
        ),
      },
      {
        key: 'status',
        header: t('hrm.performance_redesign_page.k25'),
        align: 'center',
        render: (row) => {
          const config = statusConfig[row.status] || statusConfig.pending;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'actions',
        header: t('hrm.performance_redesign_page.k26'),
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
              {t('hrm.performance_redesign_page.k27')}
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
              {t('hrm.performance_redesign_page.k28')}
            </Button>
            <Button
              variant='ghost'
              size='sm'
              leftIcon={<Trash2 size={14} />}
              onClick={() => setDeleteTarget(row)}
            >
              {t('hrm.performance_redesign_page.k29')}
            </Button>
          </div>
        ),
      },
    ],
    [setSelectedReview, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget, t]
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
          {t('hrm.performance_redesign_page.k33')}
        </div>
      )}
      <ListPageTemplate<PerformanceReview>
        header={{
          title: t('hrm.performance_redesign_page.k0'),
          subtitle: t('hrm.performance_redesign_page.k1'),
          breadcrumbs: [
            { label: t('hrm.performance_redesign_page.k2'), href: '/dashboard' },
            { label: t('hrm.performance_redesign_page.k3') },
            { label: t('hrm.performance_redesign_page.k0') },
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
                placeholder={t('hrm.performance_redesign_page.k4')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 280 }}
              />
              <Select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                options={[
                  { value: 'all', label: t('hrm.performance_redesign_page.k5') },
                  { value: t('hrm.demo.dept_tech'), label: t('hrm.demo.dept_tech') },
                  { value: t('hrm.demo.dept_product'), label: t('hrm.demo.dept_product') },
                  { value: t('hrm.demo.dept_design'), label: t('hrm.demo.dept_design') },
                  { value: t('hrm.demo.dept_market'), label: t('hrm.demo.dept_market') },
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
                {t('hrm.performance_redesign_page.k6')}
              </Button>
              <Button
                variant='primary'
                leftIcon={<Plus size={16} />}
                onClick={() => {
                  setSelectedReview(null);
                  setCreateModalOpen(true);
                }}
              >
                {t('hrm.performance_redesign_page.k7')}
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedReviews}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle={t('hrm.performance_redesign_page.k8')}
        emptyDescription={t('hrm.performance_redesign_page.k9')}
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label={t('hrm.performance_redesign_page.k10')}
              value={stats.total}
              icon={Target}
              accent='cyan'
            />
            <StatTile
              label={t('hrm.performance_redesign_page.k11')}
              value={stats.completed}
              icon={Award}
              accent='success'
            />
            <StatTile
              label={t('hrm.performance_redesign_page.k12')}
              value={`${stats.avgScore} ${t('hrm.performance_redesign_page.k30')}`}
              icon={TrendingUp}
              accent='warning'
            />
            <StatTile
              label={t('hrm.performance_redesign_page.k13')}
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
        title={t('hrm.performance_redesign_page.k34')}
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
                    {statusConfig[selectedReview.status]?.label ||
                      t('hrm.performance_redesign_page.k32')}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* 评分大字体 */}
            {selectedReview.score > 0 && (
              <Card title={t('hrm.performance_redesign_page.k23')}>
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
                    {t('hrm.performance_redesign_page.k30')}
                  </span>
                </div>
                <div style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
                  <Badge variant={ratingConfig[selectedReview.rating]?.variant || 'default'}>
                    {ratingConfig[selectedReview.rating]?.label}{' '}
                    {t('hrm.performance_redesign_page.k31')}
                  </Badge>
                </div>
              </Card>
            )}

            <Card title={t('hrm.performance_redesign_page.k35')}>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('hrm.performance_redesign_page.k20')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedReview.period}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('hrm.performance_redesign_page.k21')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedReview.reviewer}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('hrm.performance_redesign_page.k24')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
                    {selectedReview.kpi_completion > 0 ? `${selectedReview.kpi_completion}%` : '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    {t('hrm.performance_redesign_page.k36')}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {formatDateTime(selectedReview.created_at)}
                  </div>
                </div>
              </div>
            </Card>

            {selectedReview.improvement && (
              <Card title={t('hrm.performance_redesign_page.k37')}>
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
        title={
          selectedReview
            ? t('hrm.performance_redesign_page.k38')
            : t('hrm.performance_redesign_page.k39')
        }
        size='lg'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setCreateModalOpen(false)}
            >
              {t('hrm.performance_redesign_page.k40')}
            </Button>
            <Button
              variant='primary'
              onClick={() => {
                const formData: Partial<PerformanceReview> = {
                  employee_name:
                    (document.getElementById('field-1') as HTMLSelectElement)?.value || '',
                  period: (document.getElementById('field-2') as HTMLSelectElement)?.value || '',
                  rating:
                    ((document.getElementById('field-4') as HTMLSelectElement)
                      ?.value as PerformanceReview['rating']) || 'B',
                  score: Number(
                    (document.getElementById('field-5') as HTMLInputElement)?.value || 0
                  ),
                  reviewer: (document.getElementById('field-3') as HTMLInputElement)?.value || '',
                };
                if (selectedReview) {
                  updateMutation.mutate({ id: selectedReview.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedReview
                ? t('hrm.performance_redesign_page.k41')
                : t('hrm.performance_redesign_page.k7')}
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
                {t('hrm.performance_redesign_page.k42')}
              </label>
              <Select
                id='field-1'
                defaultValue={selectedReview?.employee_name || t('hrm.demo.person_zhang')}
                options={[
                  {
                    value: t('hrm.demo.person_zhang'),
                    label: `${t('hrm.demo.person_zhang')} (${t('hrm.demo.dept_tech')})`,
                  },
                  {
                    value: t('hrm.demo.person_li'),
                    label: `${t('hrm.demo.person_li')} (${t('hrm.demo.dept_product')})`,
                  },
                  {
                    value: t('hrm.demo.person_wang'),
                    label: `${t('hrm.demo.person_wang')} (${t('hrm.demo.dept_design')})`,
                  },
                  {
                    value: t('hrm.demo.person_zhao'),
                    label: `${t('hrm.demo.person_zhao')} (${t('hrm.demo.dept_market')})`,
                  },
                  {
                    value: t('hrm.demo.person_qian'),
                    label: `${t('hrm.demo.person_qian')} (${t('hrm.demo.dept_tech')})`,
                  },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-2'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('hrm.performance_redesign_page.k43')}
              </label>
              <Select
                id='field-2'
                defaultValue={selectedReview?.period || t('hrm.demo.period_h1')}
                options={[
                  { value: t('hrm.demo.period_h1'), label: t('hrm.demo.period_h1') },
                  { value: t('hrm.demo.period_h2'), label: t('hrm.demo.period_h2') },
                  { value: t('hrm.demo.period_q1'), label: t('hrm.demo.period_q1') },
                  { value: t('hrm.demo.period_q2'), label: t('hrm.demo.period_q2') },
                  { value: t('hrm.demo.period_q3'), label: t('hrm.demo.period_q3') },
                  { value: t('hrm.demo.period_q4'), label: t('hrm.demo.period_q4') },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('hrm.performance_redesign_page.k21')}
              </label>
              <Input
                id='field-3'
                placeholder={t('hrm.performance_redesign_page.k44')}
                defaultValue={selectedReview?.reviewer || t('hrm.demo.person_manager')}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('hrm.performance_redesign_page.k22')}
              </label>
              <Select
                id='field-4'
                defaultValue={selectedReview?.rating || 'B'}
                options={[
                  { value: 'S', label: t('hrm.performance_redesign_page.k51') },
                  { value: 'A', label: t('hrm.performance_redesign_page.k52') },
                  { value: 'B', label: t('hrm.performance_redesign_page.k53') },
                  { value: 'C', label: t('hrm.performance_redesign_page.k54') },
                  { value: 'D', label: t('hrm.performance_redesign_page.k55') },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-5'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('hrm.performance_redesign_page.k23')}
              </label>
              <Input
                id='field-5'
                type='number'
                placeholder={t('hrm.performance_redesign_page.k47')}
                defaultValue={selectedReview?.score || 85}
              />
            </div>
            <div>
              <label
                htmlFor='field-6'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                {t('hrm.performance_redesign_page.k48')}
              </label>
              <Input
                id='field-6'
                type='number'
                placeholder={t('hrm.performance_redesign_page.k49')}
                defaultValue={selectedReview?.kpi_completion || 95}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor='field-7'
              style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
            >
              {t('hrm.performance_redesign_page.k37')}
            </label>
            <Input
              id='field-7'
              placeholder={t('hrm.performance_redesign_page.k50')}
              defaultValue={selectedReview?.improvement}
            />
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('hrm.performance_redesign_page.k56')}
        size='sm'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => setDeleteTarget(null)}
            >
              {t('hrm.performance_redesign_page.k40')}
            </Button>
            <Button
              variant='danger'
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {t('hrm.performance_redesign_page.k57')}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          {t('hrm.performance_redesign_page.k58', {
            name: deleteTarget?.employee_name,
            period: deleteTarget?.period,
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

export default HrmPerformanceRedesignPage;
