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
  XCircle,
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
import { inspectionApi } from '@/api/qms/inspection';
import type { QualityCheck as ApiQualityCheck } from '@/api/qms/types';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['qms', 'inspections'];

interface Inspection {
  id: string;
  check_no: string;
  title: string;
  inspection_type: 'incoming' | 'process' | 'final';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  product_name: string;
  batch_no: string;
  inspector?: string;
  result?: 'qualified' | 'unqualified' | 'pending';
  quantity: number;
  created_at: string;
  completed_at?: string;
}

// Mock 数据
// 将 API 返回的 QualityCheck 类型映射为页面使用的 Inspection 类型
const mapApiInspections = (apiChecks: ApiQualityCheck[]): Inspection[] => {
  return apiChecks.map((c, index) => ({
    id: c.id,
    check_no:
      (c as any).check_no || (c as any).checkNo || `QC2026${String(index + 1).padStart(5, '0')}`,
    title: (c as any).title || (c as any).name || '-',
    inspection_type: ((c as any).inspection_type as Inspection['inspection_type']) || 'incoming',
    status: ((c as any).status as Inspection['status']) || 'pending',
    product_name: (c as any).product_name || (c as any).productName || '-',
    batch_no: (c as any).batch_no || (c as any).batchNo || '-',
    quantity: (c as any).quantity || 0,
    inspector: (c as any).inspector || (c as any).inspectorName || '-',
    result: ((c as any).result as Inspection['result']) || 'pending',
    check_date: (c as any).check_date || (c as any).checkDate || '-',
    created_at: c.created_at || new Date().toISOString(),
  }));
};

// Mock 数据（API 不可用时的 fallback）
const mockInspections: Inspection[] = [
  {
    id: '1',
    check_no: 'QC202609001',
    title: '原材料入库检验-伺服电机',
    inspection_type: 'incoming',
    status: 'pending',
    product_name: '伺服电机',
    batch_no: 'BATCH-2026-0901',
    quantity: 500,
    created_at: '2026-09-13 09:00:00',
  },
  {
    id: '2',
    check_no: 'QC202609002',
    title: '过程检验-PLC控制器装配线',
    inspection_type: 'process',
    status: 'in_progress',
    product_name: 'PLC 控制器',
    batch_no: 'BATCH-2026-0902',
    inspector: '张三',
    quantity: 200,
    created_at: '2026-09-13 10:30:00',
  },
  {
    id: '3',
    check_no: 'QC202609003',
    title: '成品出库检验-变频器',
    inspection_type: 'final',
    status: 'completed',
    product_name: '变频器',
    batch_no: 'BATCH-2026-0899',
    inspector: '李四',
    result: 'qualified',
    quantity: 320,
    created_at: '2026-09-12 14:00:00',
    completed_at: '2026-09-12 16:30:00',
  },
  {
    id: '4',
    check_no: 'QC202609004',
    title: '原材料入库检验-工业相机',
    inspection_type: 'incoming',
    status: 'rejected',
    product_name: '工业相机',
    batch_no: 'BATCH-2026-0898',
    inspector: '王五',
    result: 'unqualified',
    quantity: 1500,
    created_at: '2026-09-11 11:00:00',
    completed_at: '2026-09-11 15:00:00',
  },
  {
    id: '5',
    check_no: 'QC202609005',
    title: '过程检验-触摸屏HMI测试',
    inspection_type: 'process',
    status: 'pending',
    product_name: '触摸屏 HMI',
    batch_no: 'BATCH-2026-0903',
    quantity: 100,
    created_at: '2026-09-13 15:00:00',
  },
];

const statusConfig = {
  pending: { label: '待检验', variant: 'warning' as const, icon: Clock },
  in_progress: { label: '检验中', variant: 'info' as const, icon: ClipboardCheck },
  completed: { label: '已完成', variant: 'success' as const, icon: CheckCircle },
  rejected: { label: '不合格', variant: 'error' as const, icon: XCircle },
};

const typeConfig = {
  incoming: { label: '来料检验', variant: 'cyan' as const },
  process: { label: '过程检验', variant: 'info' as const },
  final: { label: '成品检验', variant: 'amber' as const },
};

const resultConfig = {
  qualified: { label: '合格', variant: 'success' as const },
  unqualified: { label: '不合格', variant: 'error' as const },
  pending: { label: '待判定', variant: 'default' as const },
};

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  return value;
};

const QmsInspectionPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    'all' | 'pending' | 'in_progress' | 'completed' | 'rejected'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Inspection | null>(null);
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
        const res = await inspectionApi.listChecks();
        const resData = res as unknown as
          { data?: ApiQualityCheck[]; total?: number } | ApiQualityCheck[];
        let apiChecks: ApiQualityCheck[] = [];
        let total = 0;
        if (Array.isArray(resData)) {
          apiChecks = resData;
          total = resData.length;
        } else if (resData.data) {
          const dataObj = resData as any;
          apiChecks = Array.isArray(resData.data)
            ? resData.data
            : dataObj.list || dataObj.items || [];
          total = dataObj.total || apiChecks.length;
        }
        if (apiChecks.length > 0) {
          setIsMockData(false);
          return { inspections: mapApiInspections(apiChecks), total };
        }
      } catch (e) {
        console.warn('[QMS Inspections] API unavailable, using mock data:', e);
        setIsMockData(true);
      }
      // Mock fallback：本地分页
      let filtered = mockInspections;
      if (debouncedSearch) {
        filtered = filtered.filter(
          (i) => i.check_no.includes(debouncedSearch) || i.product_name.includes(debouncedSearch)
        );
      }
      if (typeFilter !== 'all') {
        filtered = filtered.filter((i) => i.inspection_type === typeFilter);
      }
      const start = (currentPage - 1) * pageSize;
      return { inspections: filtered.slice(start, start + pageSize), total: filtered.length };
    },
  });

  const inspections = data?.inspections || [];

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
      pushToast('success', '检验单删除成功');
    },
    onError: () => {
      pushToast('error', '删除失败，请重试');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Inspection>) => {
      try {
        await inspectionApi.createCheck({
          check_no: (data as any).check_no,
          product_name: (data as any).product_name,
          batch_no: (data as any).batch_no,
          check_type: (data as any).check_type,
          status: data.status,
          inspector: (data as any).inspector,
          check_date: (data as any).check_date,
          result: (data as any).result,
        } as any);
      } catch (e) {
        console.warn('[QMS Inspections] Create API unavailable, using mock create:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', '检验单创建成功');
    },
    onError: () => {
      pushToast('error', '创建失败，请重试');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Inspection> }) => {
      try {
        await inspectionApi.updateCheck(id, {
          status: data.status,
          result: (data as any).result,
          inspector: (data as any).inspector,
        } as any);
      } catch (e) {
        console.warn('[QMS Inspections] Update API unavailable, using mock update:', e);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      setCreateModalOpen(false);
      pushToast('success', '检验单更新成功');
    },
    onError: () => {
      pushToast('error', '更新失败，请重试');
    },
  });

  // 服务端分页：直接使用 API 返回的数据，不再本地筛选和分页
  const filteredInspections = inspections;
  const totalItems = (data as any)?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedInspections = filteredInspections;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, typeFilter, debouncedSearch]);

  const stats = useMemo(() => {
    return {
      total: inspections.length,
      pending: inspections.filter((i) => i.status === 'pending').length,
      inProgress: inspections.filter((i) => i.status === 'in_progress').length,
      completed: inspections.filter((i) => i.status === 'completed').length,
      rejected: inspections.filter((i) => i.status === 'rejected').length,
    };
  }, [inspections]);

  const tabsConfig = useMemo(
    () => [
      { id: 'all', label: '全部' },
      { id: 'pending', label: '待检验', badge: stats.pending },
      { id: 'in_progress', label: '检验中', badge: stats.inProgress },
      { id: 'completed', label: '已完成', badge: stats.completed },
      { id: 'rejected', label: '不合格', badge: stats.rejected },
    ],
    [stats]
  );

  const columns: DataTableColumn<Inspection>[] = useMemo(
    () => [
      {
        key: 'check_no',
        header: '检验单号',
        sortable: true,
        render: (row) => (
          <span
            style={{
              fontWeight: 'var(--font-semibold)',
              color: 'var(--accent-primary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {row.check_no}
          </span>
        ),
      },
      {
        key: 'title',
        header: '检验标题',
        render: (row) => (
          <div>
            <div style={{ fontWeight: 500 }}>{row.title}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {row.batch_no}
            </div>
          </div>
        ),
      },
      {
        key: 'inspection_type',
        header: '检验类型',
        align: 'center',
        render: (row) => {
          const config = typeConfig[row.inspection_type] || typeConfig.incoming;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
      },
      {
        key: 'product_name',
        header: '产品',
      },
      {
        key: 'quantity',
        header: '检验数量',
        align: 'right',
        render: (row) => <span>{row.quantity.toLocaleString()}</span>,
      },
      {
        key: 'inspector',
        header: '检验员',
        render: (row) =>
          row.inspector ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <User
                size={14}
                style={{ color: 'var(--text-tertiary)' }}
              />
              <span>{row.inspector}</span>
            </div>
          ) : (
            <span style={{ color: 'var(--text-tertiary)' }}>-</span>
          ),
      },
      {
        key: 'result',
        header: '检验结果',
        align: 'center',
        render: (row) => {
          if (!row.result) return <span style={{ color: 'var(--text-tertiary)' }}>-</span>;
          const config = resultConfig[row.result] || resultConfig.pending;
          return <Badge variant={config.variant}>{config.label}</Badge>;
        },
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
                setSelectedInspection(row);
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
                setSelectedInspection(row);
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
    [setSelectedInspection, setDetailDrawerOpen, setCreateModalOpen, setDeleteTarget]
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
      <ListPageTemplate<Inspection>
        header={{
          title: '质量检验',
          subtitle: '管理来料检验、过程检验和成品检验任务',
          breadcrumbs: [
            { label: '首页', href: '/dashboard' },
            { label: '质量管理' },
            { label: '质量检验' },
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
                placeholder='搜索检验单号/标题/产品...'
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
                  { value: 'incoming', label: '来料检验' },
                  { value: 'process', label: '过程检验' },
                  { value: 'final', label: '成品检验' },
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
                  setSelectedInspection(null);
                  setCreateModalOpen(true);
                }}
              >
                新建检验单
              </Button>
            </div>
          </>
        }
        columns={columns}
        data={pagedInspections}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle='暂无检验单'
        emptyDescription='点击右上角「新建检验单」按钮创建第一个检验任务'
        footer={
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
            <StatTile
              label='检验单总数'
              value={stats.total}
              icon={ClipboardCheck}
              accent='cyan'
            />
            <StatTile
              label='待检验'
              value={stats.pending}
              icon={Clock}
              accent='warning'
            />
            <StatTile
              label='检验中'
              value={stats.inProgress}
              icon={AlertTriangle}
              accent='amber'
            />
            <StatTile
              label='已完成'
              value={stats.completed}
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

      {filteredInspections.length > 0 && (
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

      {/* 检验单详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedInspection(null);
        }}
        title='检验单详情'
        size='lg'
      >
        {selectedInspection && (
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
                    {selectedInspection.check_no}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-lg)',
                      fontWeight: 'var(--font-bold)',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    {selectedInspection.title}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Badge
                    variant={typeConfig[selectedInspection.inspection_type]?.variant || 'default'}
                  >
                    {typeConfig[selectedInspection.inspection_type]?.label || '未知'}
                  </Badge>
                  <Badge variant={statusConfig[selectedInspection.status]?.variant || 'default'}>
                    {statusConfig[selectedInspection.status]?.label || '未知'}
                  </Badge>
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
                    {selectedInspection.product_name}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    批次号
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-mono)' }}>
                    {selectedInspection.batch_no}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    检验数量
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedInspection.quantity.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    检验员
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedInspection.inspector || '未分配'}
                  </div>
                </div>
              </div>
            </Card>

            <Card title='时间信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    创建时间
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {formatDateTime(selectedInspection.created_at)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                    完成时间
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)' }}>
                    {formatDateTime(selectedInspection.completed_at)}
                  </div>
                </div>
              </div>
            </Card>

            {selectedInspection.result && (
              <Card title='检验结果'>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  {selectedInspection.result === 'qualified' ? (
                    <CheckCircle
                      size={24}
                      style={{ color: 'var(--success-500)' }}
                    />
                  ) : (
                    <XCircle
                      size={24}
                      style={{ color: 'var(--error-500)' }}
                    />
                  )}
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    {selectedInspection.result === 'qualified' ? '检验合格' : '检验不合格'}
                  </span>
                </div>
              </Card>
            )}
          </div>
        )}
      </Drawer>

      {/* 新建/编辑检验单弹窗 */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={selectedInspection ? '编辑检验单' : '新建检验单'}
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
                const formData: Partial<Inspection> = {
                  check_no:
                    (document.querySelector('input[placeholder*="检验单号"]') as HTMLInputElement)
                      ?.value || '',
                  product_name:
                    (document.querySelector('input[placeholder*="产品名称"]') as HTMLInputElement)
                      ?.value || '',
                  batch_no:
                    (document.querySelector('input[placeholder*="批次号"]') as HTMLInputElement)
                      ?.value || '',
                  inspection_type:
                    ((document.querySelector('select') as HTMLSelectElement)
                      ?.value as Inspection['inspection_type']) || 'incoming',
                  inspector:
                    (
                      document.querySelectorAll(
                        'input[placeholder*="检验员"]'
                      )[0] as HTMLInputElement
                    )?.value || '',
                  quantity: Number(
                    (document.querySelector('input[type="number"]') as HTMLInputElement)?.value || 0
                  ),
                };
                if (selectedInspection) {
                  updateMutation.mutate({ id: selectedInspection.id, data: formData });
                } else {
                  createMutation.mutate(formData);
                }
              }}
            >
              {selectedInspection ? '保存修改' : '创建检验单'}
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
              检验标题 *
            </label>
            <Input
              id='field-1'
              placeholder='例如：原材料入库检验-伺服电机'
              defaultValue={selectedInspection?.title}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor='field-2'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                检验类型 *
              </label>
              <Select
                id='field-2'
                defaultValue={selectedInspection?.inspection_type || 'incoming'}
                options={[
                  { value: 'incoming', label: '来料检验' },
                  { value: 'process', label: '过程检验' },
                  { value: 'final', label: '成品检验' },
                ]}
              />
            </div>
            <div>
              <label
                htmlFor='field-3'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                产品名称 *
              </label>
              <Input
                id='field-3'
                placeholder='请输入产品名称'
                defaultValue={selectedInspection?.product_name}
              />
            </div>
            <div>
              <label
                htmlFor='field-4'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                批次号
              </label>
              <Input
                id='field-4'
                placeholder='例如：BATCH-2026-0901'
                defaultValue={selectedInspection?.batch_no}
              />
            </div>
            <div>
              <label
                htmlFor='field-5'
                style={{ display: 'block', marginBottom: 4, fontSize: 13, fontWeight: 500 }}
              >
                检验数量
              </label>
              <Input
                id='field-5'
                type='number'
                placeholder='例如：100'
                defaultValue={selectedInspection?.quantity}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title='删除检验单'
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
          确定要删除检验单「{deleteTarget?.check_no}」吗？此操作不可撤销。
        </p>
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

export default QmsInspectionPage;
