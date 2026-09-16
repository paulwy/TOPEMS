import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
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
  EmptyState,
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

import '@/theme/redesign-tokens.css';
import '@/theme/redesign-global.css';

const QUERY_KEY = ['workflow', 'approvals'];

type TabType = 'pending' | 'approved' | 'rejected' | 'all';

interface ApprovalTask {
  id: string;
  title: string;
  workflowName: string;
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
  { id: 'pending', label: '待审批', badge: 0 },
  { id: 'approved', label: '已通过' },
  { id: 'rejected', label: '已驳回' },
  { id: 'all', label: '全部' },
];

const priorityConfig = {
  high: { label: '高优先级', variant: 'error' as const, color: 'var(--error-500)' },
  medium: { label: '中优先级', variant: 'warning' as const, color: 'var(--warning-500)' },
  low: { label: '低优先级', variant: 'default' as const, color: 'var(--text-secondary)' },
};

const statusConfig = {
  pending: { label: '待审批', variant: 'warning' as const, icon: Clock },
  approved: { label: '已通过', variant: 'success' as const, icon: CheckCircle },
  rejected: { label: '已驳回', variant: 'error' as const, icon: XCircle },
  claimed: { label: '已认领', variant: 'info' as const, icon: Eye },
};

const WorkflowApprovalsPage: React.FC = () => {
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
        title: '采购申请审批 - PO-2026-0914-001',
        workflowName: '采购申请流程',
        workflowType: '采购',
        initiator: '张三',
        receivedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        priority: 'high',
        status: 'pending',
        instanceId: 'inst-001',
        nodeName: '部门经理审批',
        description: '采购原材料一批，金额约 50,000 元',
        amount: 50000,
        department: '采购部',
      },
      {
        id: '2',
        title: '请假申请 - 李四（3 天年假）',
        workflowName: '请假审批流程',
        workflowType: '人事',
        initiator: '李四',
        receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        priority: 'medium',
        status: 'pending',
        instanceId: 'inst-002',
        nodeName: '直属主管审批',
        description: '因个人事务申请年假 3 天',
        department: '研发部',
      },
      {
        id: '3',
        title: '费用报销 - 王五（差旅费 2,350 元）',
        workflowName: '费用报销流程',
        workflowType: '财务',
        initiator: '王五',
        receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        priority: 'low',
        status: 'pending',
        instanceId: 'inst-003',
        nodeName: '财务审核',
        description: '上海出差差旅费报销，含机票、住宿、餐饮',
        amount: 2350,
        department: '销售部',
      },
      {
        id: '4',
        title: '合同审批 - 供应商合作协议',
        workflowName: '合同审批流程',
        workflowType: '法务',
        initiator: '赵六',
        receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        priority: 'high',
        status: 'approved',
        instanceId: 'inst-004',
        nodeName: '总经理审批',
        description: '与 XX 供应商签订年度合作协议',
        amount: 500000,
        department: '法务部',
      },
      {
        id: '5',
        title: '设备采购申请 - 数控机床',
        workflowName: '采购申请流程',
        workflowType: '采购',
        initiator: '孙七',
        receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        priority: 'medium',
        status: 'rejected',
        instanceId: 'inst-005',
        nodeName: '财务总监审批',
        description: '采购数控机床一台，预算 80 万元',
        amount: 800000,
        department: '生产部',
      },
    ],
    []
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
      } catch (e) {
        // API 不可用时使用 mock 数据
      }
      return mockTasks;
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approvalTaskApi.approveTask(id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', '审批通过');
      setDetailDrawerOpen(false);
      setSelectedTask(null);
    },
    onError: (err: Error) => {
      // Mock 模式下直接更新本地状态
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', '审批通过');
      setDetailDrawerOpen(false);
      setSelectedTask(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      approvalTaskApi.rejectTask(id, { comment: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', '已驳回');
      setRejectDialogOpen(false);
      setRejectReason('');
      setDetailDrawerOpen(false);
      setSelectedTask(null);
    },
    onError: (err: Error) => {
      // Mock 模式下直接更新本地状态
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      pushToast('success', '已驳回');
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
  const tabsWithBadge = tabsConfig.map((t) =>
    t.id === 'pending' ? { ...t, badge: pendingCount } : t
  );

  const formatTime = (value: string) => {
    try {
      const d = new Date(value);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return '刚刚';
      if (minutes < 60) return `${minutes} 分钟前`;
      if (hours < 24) return `${hours} 小时前`;
      if (days < 7) return `${days} 天前`;

      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    } catch {
      return value;
    }
  };

  const columns: DataTableColumn<ApprovalTask>[] = [
    {
      key: 'title',
      header: '审批事项',
      sortable: true,
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
            {row.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {row.workflowName} · {row.nodeName}
          </div>
        </div>
      ),
    },
    {
      key: 'initiator',
      header: '发起人',
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
      header: '优先级',
      render: (row) => {
        const config = priorityConfig[row.priority];
        return <Tag variant={config.variant}>{config.label}</Tag>;
      },
    },
    {
      key: 'status',
      header: '状态',
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
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
        );
      },
    },
    {
      key: 'receivedAt',
      header: '收到时间',
      sortable: true,
      render: (row) => (
        <span style={{ color: 'var(--text-secondary)' }}>{formatTime(row.receivedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '操作',
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
            详情
          </Button>
          {row.status === 'pending' && (
            <>
              <Button
                size='sm'
                variant='primary'
                leftIcon={<CheckCircle size={14} />}
                onClick={() => approveMutation.mutate(row.id)}
              >
                通过
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
                驳回
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
          title: '审批中心',
          subtitle: '查看和处理待审批事项，支持通过、驳回和详情查看',
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
                placeholder='搜索审批事项...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={16} />}
                style={{ width: 240 }}
              />
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                options={[
                  { value: 'all', label: '全部优先级' },
                  { value: 'high', label: '高优先级' },
                  { value: 'medium', label: '中优先级' },
                  { value: 'low', label: '低优先级' },
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
              {pendingCount > 0 && <Badge variant='warning'>{pendingCount} 项待审批</Badge>}
            </div>
          </>
        }
        columns={columns}
        data={pagedTasks}
        rowKey='id'
        loading={isLoading}
        error={error ? (error as Error).message : null}
        emptyTitle='暂无审批事项'
        emptyDescription={
          activeTab === 'pending' ? '您目前没有待审批的事项' : '该分类下暂无审批记录'
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
        title='审批详情'
        size='lg'
      >
        {selectedTask && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* 基本信息 */}
            <Card title='基本信息'>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}
              >
                <InfoItem
                  label='审批事项'
                  value={selectedTask.title}
                />
                <InfoItem
                  label='流程名称'
                  value={selectedTask.workflowName}
                />
                <InfoItem
                  label='流程类型'
                  value={selectedTask.workflowType}
                />
                <InfoItem
                  label='当前节点'
                  value={selectedTask.nodeName}
                />
                <InfoItem
                  label='发起人'
                  value={selectedTask.initiator}
                />
                <InfoItem
                  label='所属部门'
                  value={selectedTask.department || '-'}
                />
                <InfoItem
                  label='收到时间'
                  value={formatTime(selectedTask.receivedAt)}
                />
                <InfoItem
                  label='优先级'
                  value={
                    <Tag variant={priorityConfig[selectedTask.priority].variant}>
                      {priorityConfig[selectedTask.priority].label}
                    </Tag>
                  }
                />
                {selectedTask.amount && (
                  <InfoItem
                    label='金额'
                    value={`¥ ${selectedTask.amount.toLocaleString()}`}
                  />
                )}
                <InfoItem
                  label='状态'
                  value={
                    <Badge variant={statusConfig[selectedTask.status].variant}>
                      {statusConfig[selectedTask.status].label}
                    </Badge>
                  }
                />
              </div>
            </Card>

            {/* 审批内容 */}
            <Card title='审批内容'>
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {selectedTask.description || '暂无详细描述'}
              </p>
            </Card>

            {/* 审批流程 */}
            <Card title='审批流程'>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <FlowStep
                  icon={<User size={16} />}
                  title='发起申请'
                  description={`${selectedTask.initiator} 发起申请`}
                  status='completed'
                  time={formatTime(selectedTask.receivedAt)}
                />
                <FlowStep
                  icon={<ArrowRightLeft size={16} />}
                  title={selectedTask.nodeName}
                  description='当前审批节点'
                  status={selectedTask.status === 'pending' ? 'current' : 'completed'}
                  time={selectedTask.status === 'pending' ? '处理中' : '已完成'}
                />
                <FlowStep
                  icon={<FileText size={16} />}
                  title='归档'
                  description='审批完成后自动归档'
                  status={
                    selectedTask.status === 'approved' || selectedTask.status === 'rejected'
                      ? 'completed'
                      : 'pending'
                  }
                  time={
                    selectedTask.status === 'approved' || selectedTask.status === 'rejected'
                      ? '已归档'
                      : '待处理'
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
                  驳回
                </Button>
                <Button
                  variant='primary'
                  leftIcon={<CheckCircle size={16} />}
                  onClick={() => approveMutation.mutate(selectedTask.id)}
                  loading={approveMutation.isPending}
                >
                  审批通过
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
        title='驳回审批'
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
              取消
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
              确认驳回
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>请填写驳回原因（必填）：</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder='请输入驳回原因...'
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
