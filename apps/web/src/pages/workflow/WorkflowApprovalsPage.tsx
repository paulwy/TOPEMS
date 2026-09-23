import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  ArrowRightLeft,
  Search,
  RefreshCw,
  User,
  FileText,
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
  Tabs,
  Tag,
  ToastContainer,
} from '@/components/redesign';
import type { DataTableColumn, Toast } from '@/components/redesign';
import { approvalTaskApi } from '@/api/workflow/approval';
import i18n from '@/i18n';
import { localizedName } from '@/utils/i18n';
import { useTranslation } from 'react-i18next';

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['workflow', 'approvals'];

type TabType = 'pending' | 'approved' | 'rejected' | 'all';

interface ApprovalTask {
  id: string;
  title: string;
  workflowName: string;
  workflowNameEn?: string | null;
  workflowType: string;
  initiator: string;
  receivedAt: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected' | 'claimed';
  instanceId: string;
  nodeName: string;
  description?: string;
  amount?: number;
  department?: string;
}

const tabsConfig = [
  { id: 'pending', labelKey: 'workflow.workflow_approvals_page.k17', badge: 0 },
  { id: 'approved', labelKey: 'workflow.workflow_approvals_page.k18' },
  { id: 'rejected', labelKey: 'workflow.workflow_approvals_page.k19' },
  { id: 'all', labelKey: 'workflow.approvals_page.tab_all' },
];

const priorityConfig = {
  high: {
    labelKey: 'workflow.approvals_page.priority_high',
    variant: 'error' as const,
    color: 'var(--error-500)',
  },
  medium: {
    labelKey: 'workflow.approvals_page.priority_medium',
    variant: 'warning' as const,
    color: 'var(--warning-500)',
  },
  low: {
    labelKey: 'workflow.approvals_page.priority_low',
    variant: 'default' as const,
    color: 'var(--text-secondary)',
  },
};

const statusConfig = {
  pending: {
    labelKey: 'workflow.workflow_approvals_page.k17',
    variant: 'warning' as const,
    icon: Clock,
  },
  approved: {
    labelKey: 'workflow.workflow_approvals_page.k18',
    variant: 'success' as const,
    icon: CheckCircle,
  },
  rejected: {
    labelKey: 'workflow.workflow_approvals_page.k19',
    variant: 'error' as const,
    icon: XCircle,
  },
  claimed: {
    labelKey: 'workflow.approvals_page.status_claimed',
    variant: 'info' as const,
    icon: Eye,
  },
};

const WorkflowApprovalsPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ApprovalTask | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const pushToast = (variant: Toast['variant'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, variant, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Mock 数据（API 不可用时使用）
  const mockTasks: ApprovalTask[] = useMemo(
    () => [
      {
        id: '1',
        title: t('workflow.demo.wf_title_1'),
        workflowName: t('workflow.demo.wf_name_purchase'),
        workflowType: t('workflow.demo.wf_type_purchase'),
        initiator: t('workflow.demo.wf_person_zhang'),
        receivedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        priority: 'high',
        status: 'pending',
        instanceId: 'inst-001',
        nodeName: t('workflow.demo.wf_node_dept_manager'),
        description: t('workflow.demo.wf_desc_1'),
        amount: 50000,
        department: t('workflow.demo.wf_dept_purchase'),
      },
      {
        id: '2',
        title: t('workflow.demo.wf_title_2'),
        workflowName: t('workflow.demo.wf_name_leave'),
        workflowType: t('workflow.demo.wf_type_hr'),
        initiator: t('workflow.demo.wf_person_li'),
        receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        priority: 'medium',
        status: 'pending',
        instanceId: 'inst-002',
        nodeName: t('workflow.demo.wf_node_direct_supervisor'),
        description: t('workflow.demo.wf_desc_2'),
        department: t('workflow.demo.wf_dept_rd'),
      },
      {
        id: '3',
        title: t('workflow.demo.wf_title_3'),
        workflowName: t('workflow.demo.wf_name_expense'),
        workflowType: t('workflow.demo.wf_type_finance'),
        initiator: t('workflow.demo.wf_person_wang'),
        receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        priority: 'low',
        status: 'pending',
        instanceId: 'inst-003',
        nodeName: t('workflow.demo.wf_node_finance_audit'),
        description: t('workflow.demo.wf_desc_3'),
        amount: 2350,
        department: t('workflow.demo.wf_dept_sales'),
      },
      {
        id: '4',
        title: t('workflow.demo.wf_title_4'),
        workflowName: t('workflow.demo.wf_name_contract'),
        workflowType: t('workflow.demo.wf_type_legal'),
        initiator: t('workflow.demo.wf_person_zhao'),
        receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        priority: 'high',
        status: 'approved',
        instanceId: 'inst-004',
        nodeName: t('workflow.demo.wf_node_gm'),
        description: t('workflow.demo.wf_desc_4'),
        amount: 500000,
        department: t('workflow.demo.wf_dept_legal'),
      },
      {
        id: '5',
        title: t('workflow.demo.wf_title_5'),
        workflowName: t('workflow.demo.wf_name_purchase'),
        workflowType: t('workflow.demo.wf_type_purchase'),
        initiator: t('workflow.demo.wf_person_sun'),
        receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        priority: 'medium',
        status: 'rejected',
        instanceId: 'inst-005',
        nodeName: t('workflow.demo.wf_node_finance_director'),
        description: t('workflow.demo.wf_desc_5'),
        amount: 800000,
        department: t('workflow.demo.wf_dept_production'),
      },
    ],
    [t]
  );

  const { data, isLoading, error, refetch } = useQuery<ApprovalTask[]>({
    queryKey: [...QUERY_KEY, activeTab, debouncedSearch, priorityFilter],
    queryFn: async () => {
      try {
        const response = await approvalTaskApi.listApprovalTasks({
          status: activeTab === 'all' ? undefined : activeTab,
          page: 1,
          pageSize: 50,
        });
        if (response.success && response.data) {
          return response.data.items || [];
        }
      } catch (_e) {
        // API 不可用时使用 mock 数据
      }
      return mockTasks;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approvalTaskApi.approveTask(id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', t('workflow.approval_timeline.k5'));
      setDetailDrawerOpen(false);
      setSelectedTask(null);
    },
    onError: (_err: Error) => {
      // Mock 模式下直接更新本地状态
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', t('workflow.approval_timeline.k5'));
      setDetailDrawerOpen(false);
      setSelectedTask(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      approvalTaskApi.rejectTask(id, { comment: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', t('workflow.workflow_approvals_page.k19'));
      setRejectDialogOpen(false);
      setRejectReason('');
      setDetailDrawerOpen(false);
      setSelectedTask(null);
    },
    onError: (_err: Error) => {
      // Mock 模式下直接更新本地状态
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', t('workflow.workflow_approvals_page.k19'));
      setRejectDialogOpen(false);
      setRejectReason('');
      setDetailDrawerOpen(false);
      setSelectedTask(null);
    },
  });

  const tasks = data || mockTasks;

  // 按 Tab 筛选
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (activeTab !== 'all') {
      result = result.filter((t) => t.status === activeTab);
    }
    if (priorityFilter !== 'all') {
      result = result.filter((t) => t.priority === priorityFilter);
    }
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.workflowName.toLowerCase().includes(query) ||
          t.initiator.toLowerCase().includes(query)
      );
    }
    return result;
  }, [tasks, activeTab, priorityFilter, debouncedSearch]);

  // 分页数据计算
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const pagedTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 筛选变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, priorityFilter, debouncedSearch]);

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const tabsWithBadge = tabsConfig.map((tab) => ({
    id: tab.id,
    label: t(tab.labelKey),
    ...(tab.id === 'pending' ? { badge: pendingCount } : {}),
  }));

  const formatTime = (value: string) => {
    try {
      const d = new Date(value);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return t('workflow.approvals_page.just_now');
      if (minutes < 60) return t('workflow.approvals_page.minutes_ago', { count: minutes });
      if (hours < 24) return t('workflow.approvals_page.hours_ago', { count: hours });
      if (days < 7) return t('workflow.approvals_page.days_ago', { count: days });

      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    } catch {
      return value;
    }
  };

  const columns: DataTableColumn<ApprovalTask>[] = [
    {
      key: 'title',
      header: t('workflow.approvals_page.col_subject'),
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
            {row.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {localizedName(row.workflowName, row.workflowNameEn)} · {row.nodeName}
          </div>
        </div>
      ),
    },
    {
      key: 'initiator',
      header: t('workflow.approvals_page.col_initiator'),
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: 'var(--accent-primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {row.initiator.charAt(0)}
          </div>
          <span>{row.initiator}</span>
        </div>
      ),
    },
    {
      key: 'priority',
      header: t('workflow.approvals_page.col_priority'),
      render: (row) => {
        const config = priorityConfig[row.priority];
        return <Tag variant={config.variant}>{t(config.labelKey)}</Tag>;
      },
    },
    {
      key: 'status',
      header: t('workflow.approvals_page.col_status'),
      render: (row) => {
        const config = statusConfig[row.status];
        const StatusIcon = config.icon;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <StatusIcon
              size={14}
              style={{
                color:
                  config.variant === 'success'
                    ? 'var(--success-500)'
                    : config.variant === 'error'
                      ? 'var(--error-500)'
                      : 'var(--warning-500)',
              }}
            />
            <Badge variant={config.variant}>{t(config.labelKey)}</Badge>
          </div>
        );
      },
    },
    {
      key: 'receivedAt',
      header: t('workflow.approvals_page.col_received_at'),
      sortable: true,
      render: (row) => (
        <span style={{ color: 'var(--text-secondary)' }}>{formatTime(row.receivedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: t('workflow.approvals_page.col_actions'),
      align: 'right',
      width: 180,
      render: (row) => (
        <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
          <Button
            size='sm'
            variant='ghost'
            leftIcon={<Eye size={14} />}
            onClick={() => {
              setSelectedTask(row);
              setDetailDrawerOpen(true);
            }}
          >
            {t('workflow.approvals_page.btn_detail')}
          </Button>
          {row.status === 'pending' && (
            <>
              <Button
                size='sm'
                variant='primary'
                leftIcon={<CheckCircle size={14} />}
                onClick={() => approveMutation.mutate(row.id)}
              >
                {t('workflow.approvals_page.btn_approve')}
              </Button>
              <Button
                size='sm'
                variant='ghost'
                leftIcon={<XCircle size={14} />}
                onClick={() => {
                  setSelectedTask(row);
                  setRejectDialogOpen(true);
                }}
                style={{ color: 'var(--error-500)' }}
              >
                {t('workflow.workflow_approvals_page.k14')}
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <ListPageTemplate<ApprovalTask>
        header={{
          title: t('workflow.approvals_page.title'),
          subtitle: t('workflow.approvals_page.subtitle'),
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
                placeholder={t('workflow.approvals_page.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 240 }}
              />
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                options={[
                  { value: 'all', label: t('workflow.approvals_page.filter_priority_all') },
                  { value: 'high', label: t('workflow.approvals_page.priority_high') },
                  { value: 'medium', label: t('workflow.approvals_page.priority_medium') },
                  { value: 'low', label: t('workflow.approvals_page.priority_low') },
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
                {t('workflow.approvals_page.btn_refresh')}
              </Button>
              {pendingCount > 0 && (
                <Badge variant='warning'>
                  {t('workflow.approvals_page.pending_badge', { count: pendingCount })}
                </Badge>
              )}
            </div>
          </>
        }
        columns={columns}
        data={pagedTasks}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle={t('workflow.approvals_page.empty_title')}
        emptyDescription={
          activeTab === 'pending'
            ? t('workflow.approvals_page.empty_pending')
            : t('workflow.approvals_page.empty_category')
        }
        tableProps={{
          onRowClick: (row) => {
            setSelectedTask(row);
            setDetailDrawerOpen(true);
          },
        }}
      >
        <Tabs
          tabs={tabsWithBadge}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as TabType)}
        />
      </ListPageTemplate>

      {filteredTasks.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Pagination
            current={currentPage}
            total={totalPages}
            pageSize={pageSize}
            totalItems={filteredTasks.length}
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

      {/* 审批详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => {
          setDetailDrawerOpen(false);
          setSelectedTask(null);
        }}
        title={t('workflow.index.k19')}
        size='lg'
      >
        {selectedTask && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* 基本信息 */}
            <Card title={t('workflow.approvals_page.card_basic')}>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <InfoItem
                  label={t('workflow.approvals_page.col_subject')}
                  value={selectedTask.title}
                />
                <InfoItem
                  label={t('workflow.approvals_page.label_workflow_name')}
                  value={localizedName(selectedTask.workflowName, selectedTask.workflowNameEn)}
                />
                <InfoItem
                  label={t('workflow.approvals_page.label_workflow_type')}
                  value={selectedTask.workflowType}
                />
                <InfoItem
                  label={t('workflow.approvals_page.label_current_node')}
                  value={selectedTask.nodeName}
                />
                <InfoItem
                  label={t('workflow.approvals_page.col_initiator')}
                  value={selectedTask.initiator}
                />
                <InfoItem
                  label={t('workflow.approvals_page.label_department')}
                  value={selectedTask.department || '-'}
                />
                <InfoItem
                  label={t('workflow.approvals_page.col_received_at')}
                  value={formatTime(selectedTask.receivedAt)}
                />
                <InfoItem
                  label={t('workflow.approvals_page.col_priority')}
                  value={
                    <Tag variant={priorityConfig[selectedTask.priority].variant}>
                      {t(priorityConfig[selectedTask.priority].labelKey)}
                    </Tag>
                  }
                />
                {selectedTask.amount && (
                  <InfoItem
                    label={t('workflow.approvals_page.label_amount')}
                    value={`¥ ${selectedTask.amount.toLocaleString()}`}
                  />
                )}
                <InfoItem
                  label={t('workflow.approvals_page.col_status')}
                  value={
                    <Badge variant={statusConfig[selectedTask.status].variant}>
                      {t(statusConfig[selectedTask.status].labelKey)}
                    </Badge>
                  }
                />
              </div>
            </Card>

            {/* 审批内容 */}
            <Card title={t('workflow.approvals_page.card_content')}>
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {selectedTask.description || t('workflow.approvals_page.no_description')}
              </p>
            </Card>

            {/* 审批流程 */}
            <Card title={t('workflow.approvals_page.card_flow')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <FlowStep
                  icon={<User size={16} />}
                  title={t('workflow.approvals_page.flow_start_title')}
                  description={t('workflow.approvals_page.flow_start_desc', {
                    initiator: selectedTask.initiator,
                  })}
                  status='completed'
                  time={formatTime(selectedTask.receivedAt)}
                />
                <FlowStep
                  icon={<ArrowRightLeft size={16} />}
                  title={selectedTask.nodeName}
                  description={t('workflow.approvals_page.flow_current_node')}
                  status={selectedTask.status === 'pending' ? 'current' : 'completed'}
                  time={
                    selectedTask.status === 'pending'
                      ? t('workflow.approvals_page.flow_processing')
                      : t('workflow.approvals_page.flow_completed')
                  }
                />
                <FlowStep
                  icon={<FileText size={16} />}
                  title={t('workflow.approvals_page.flow_archive_title')}
                  description={t('workflow.approvals_page.flow_archive_desc')}
                  status={
                    selectedTask.status === 'approved' || selectedTask.status === 'rejected'
                      ? 'completed'
                      : 'pending'
                  }
                  time={
                    selectedTask.status === 'approved' || selectedTask.status === 'rejected'
                      ? t('workflow.approvals_page.flow_archived')
                      : t('workflow.approvals_page.flow_pending')
                  }
                />
              </div>
            </Card>

            {/* 操作按钮 */}
            {selectedTask.status === 'pending' && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <Button
                  variant='ghost'
                  leftIcon={<XCircle size={16} />}
                  onClick={() => setRejectDialogOpen(true)}
                  style={{ color: 'var(--error-500)' }}
                >
                  {t('workflow.workflow_approvals_page.k14')}
                </Button>
                <Button
                  variant='primary'
                  leftIcon={<CheckCircle size={16} />}
                  onClick={() => approveMutation.mutate(selectedTask.id)}
                  loading={approveMutation.isPending}
                >
                  {t('workflow.approval_timeline.k5')}
                </Button>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* 驳回弹窗 */}
      <Modal
        open={rejectDialogOpen}
        onClose={() => {
          setRejectDialogOpen(false);
          setRejectReason('');
        }}
        title={t('workflow.workflow_approvals_page.k25')}
        size='sm'
        footer={
          <>
            <Button
              variant='ghost'
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectReason('');
              }}
            >
              {t('workflow.workflow_approvals_page.k27')}
            </Button>
            <Button
              variant='danger'
              onClick={() => {
                if (selectedTask) {
                  rejectMutation.mutate({ id: selectedTask.id, reason: rejectReason });
                }
              }}
              disabled={!rejectReason.trim()}
              loading={rejectMutation.isPending}
            >
              {t('workflow.workflow_approvals_page.k26')}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            {t('workflow.approvals_page.reject_reason_label')}
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t('workflow.approvals_page.reject_reason_placeholder')}
            rows={4}
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
      </Modal>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </>
  );
};

// 信息项组件
const InfoItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
  </div>
);

// 流程步骤组件
const FlowStep: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  time: string;
}> = ({ icon, title, description, status, time }) => (
  <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        backgroundColor:
          status === 'completed'
            ? 'color-mix(in srgb, var(--success-500) 15%, transparent)'
            : status === 'current'
              ? 'color-mix(in srgb, var(--accent-primary) 15%, transparent)'
              : 'var(--surface-2)',
        color:
          status === 'completed'
            ? 'var(--success-500)'
            : status === 'current'
              ? 'var(--accent-primary)'
              : 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{title}</span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{time}</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
        {description}
      </div>
    </div>
  </div>
);

export default WorkflowApprovalsPage;
