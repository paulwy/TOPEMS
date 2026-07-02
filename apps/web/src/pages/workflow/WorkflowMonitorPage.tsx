/**
 * 流程监控页面
 *
 * 功能要点：
 * 1. 使用 PageContainer + ListPageTemplate 模板
 * 2. 统计卡片：异常实例数、超时实例、错误实例、今日异常
 * 3. 支持搜索（流程名称、实例ID）、筛选（异常类型、状态）、分页
 * 4. 操作：查看详情、重试、忽略
 *
 * @module pages/workflow
 * @path /workflow/monitor
 */

import { Box, Typography, Chip, IconButton, Grid, Stack } from '@mui/material';
import React, { useState, useMemo, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  XCircle,
  Zap,
  Eye,
  RotateCw,
  EyeOff,
  FileText,
} from 'lucide-react';

import { useAppStore } from '../../store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { StatCardComponent } from '@/components/templates/dashboard/StatCardComponent';
import { PageContainer } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { extractErrorMessage } from '@/utils/errors';

type ExceptionType = 'timeout' | 'error' | 'stuck';
type ExceptionStatus = 'pending' | 'processing' | 'resolved';

interface WorkflowException {
  id: string;
  instanceId: string;
  workflowName: string;
  currentNode: string;
  exceptionType: ExceptionType;
  exceptionDescription: string;
  occurredAt: string;
  status: ExceptionStatus;
}

const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
  timeout: '超时',
  error: '错误',
  stuck: '卡顿',
};

const EXCEPTION_TYPE_COLORS: Record<ExceptionType, 'warning' | 'error' | 'info'> = {
  timeout: 'warning',
  error: 'error',
  stuck: 'info',
};

const STATUS_LABELS: Record<ExceptionStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
};

const STATUS_COLORS: Record<ExceptionStatus, 'warning' | 'info' | 'success'> = {
  pending: 'warning',
  processing: 'info',
  resolved: 'success',
};

const MOCK_DATA: WorkflowException[] = [
  {
    id: '1',
    instanceId: 'WF-20260630-001',
    workflowName: '采购审批流程',
    currentNode: '财务审核',
    exceptionType: 'timeout',
    exceptionDescription: '节点执行时间超过阈值（30分钟），当前已等待45分钟',
    occurredAt: '2026-06-30 09:30:00',
    status: 'pending',
  },
  {
    id: '2',
    instanceId: 'WF-20260630-002',
    workflowName: '员工入职流程',
    currentNode: '账号创建',
    exceptionType: 'error',
    exceptionDescription: '调用 IAM 接口失败：500 Internal Server Error',
    occurredAt: '2026-06-30 10:15:00',
    status: 'processing',
  },
  {
    id: '3',
    instanceId: 'WF-20260630-003',
    workflowName: '报销审批流程',
    currentNode: '部门经理审批',
    exceptionType: 'stuck',
    exceptionDescription: '流程实例状态异常，长时间未推进',
    occurredAt: '2026-06-30 08:00:00',
    status: 'pending',
  },
  {
    id: '4',
    instanceId: 'WF-20260629-004',
    workflowName: '合同签署流程',
    currentNode: '电子签章',
    exceptionType: 'error',
    exceptionDescription: '电子签章服务连接超时',
    occurredAt: '2026-06-29 16:45:00',
    status: 'resolved',
  },
  {
    id: '5',
    instanceId: 'WF-20260629-005',
    workflowName: '请假审批流程',
    currentNode: 'HR确认',
    exceptionType: 'timeout',
    exceptionDescription: '节点执行时间超过阈值（2小时），当前已等待3小时',
    occurredAt: '2026-06-29 14:00:00',
    status: 'pending',
  },
  {
    id: '6',
    instanceId: 'WF-20260630-006',
    workflowName: '物品领用流程',
    currentNode: '库存扣减',
    exceptionType: 'error',
    exceptionDescription: '库存不足，扣减失败',
    occurredAt: '2026-06-30 11:20:00',
    status: 'processing',
  },
  {
    id: '7',
    instanceId: 'WF-20260628-007',
    workflowName: '付款申请流程',
    currentNode: '银行转账',
    exceptionType: 'stuck',
    exceptionDescription: '银行接口回调未收到，流程状态未知',
    occurredAt: '2026-06-28 10:30:00',
    status: 'resolved',
  },
];

export const WorkflowMonitorPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  const filteredData = useMemo(() => {
    let result = [...MOCK_DATA];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.workflowName.toLowerCase().includes(query) ||
          item.instanceId.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((item) => item.exceptionType === typeFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((item) => item.status === statusFilter);
    }

    return result;
  }, [searchQuery, typeFilter, statusFilter]);

  const paginatedData = useMemo(() => {
    const start = page * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const stats = useMemo(() => {
    const total = MOCK_DATA.length;
    const timeoutCount = MOCK_DATA.filter((d) => d.exceptionType === 'timeout').length;
    const errorCount = MOCK_DATA.filter((d) => d.exceptionType === 'error').length;
    const today = new Date().toISOString().split('T')[0];
    const todayCount = MOCK_DATA.filter((d) => d.occurredAt.startsWith(today)).length;

    return [
      {
        id: 'total',
        title: '异常实例数',
        value: total,
        icon: <AlertTriangle size={20} />,
        color: 'warning' as const,
      },
      {
        id: 'timeout',
        title: '超时实例',
        value: timeoutCount,
        icon: <Clock size={20} />,
        color: 'info' as const,
      },
      {
        id: 'error',
        title: '错误实例',
        value: errorCount,
        icon: <XCircle size={20} />,
        color: 'error' as const,
      },
      {
        id: 'today',
        title: '今日异常',
        value: todayCount,
        icon: <Zap size={20} />,
        color: 'primary' as const,
      },
    ];
  }, []);

  const handleViewDetail = useCallback(
    (row: WorkflowException) => {
      addNotification({
        title: '查看详情',
        message: `正在查看实例 ${row.instanceId} 的详情`,
        type: 'info',
      });
    },
    [addNotification]
  );

  const handleRetry = useCallback(
    (row: WorkflowException) => {
      setConfirmConfig({
        title: '确认重试',
        message: `确定要重试实例 ${row.instanceId} 吗？`,
        danger: false,
        onConfirm: () => {
          try {
            addNotification({
              title: '重试成功',
              message: `实例 ${row.instanceId} 已重新执行`,
              type: 'success',
            });
          } catch (_err: unknown) {
            addNotification({
              title: '重试失败',
              message: extractErrorMessage(_err, '重试操作失败'),
              type: 'error',
            });
          }
          setConfirmDialogOpen(false);
        },
      });
      setConfirmDialogOpen(true);
    },
    [addNotification]
  );

  const handleIgnore = useCallback(
    (row: WorkflowException) => {
      setConfirmConfig({
        title: '确认忽略',
        message: `确定要忽略实例 ${row.instanceId} 的异常吗？`,
        danger: true,
        onConfirm: () => {
          try {
            addNotification({
              title: '已忽略',
              message: `实例 ${row.instanceId} 的异常已标记为忽略`,
              type: 'success',
            });
          } catch (_err: unknown) {
            addNotification({
              title: '操作失败',
              message: extractErrorMessage(_err, '忽略操作失败'),
              type: 'error',
            });
          }
          setConfirmDialogOpen(false);
        },
      });
      setConfirmDialogOpen(true);
    },
    [addNotification]
  );

  const columns: ColumnDef<WorkflowException>[] = useMemo(
    () => [
      {
        id: 'instanceId',
        label: '实例ID',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                bgcolor:
                  row.exceptionType === 'error'
                    ? 'error.light'
                    : row.exceptionType === 'timeout'
                      ? 'warning.light'
                      : 'info.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText
                size={14}
                color={
                  row.exceptionType === 'error'
                    ? 'error.main'
                    : row.exceptionType === 'timeout'
                      ? 'warning.main'
                      : 'info.main'
                }
              />
            </Box>
            <Typography
              variant='body2'
              sx={{ fontWeight: 500, fontFamily: 'monospace' }}
            >
              {row.instanceId}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'workflowName',
        label: '流程名称',
        render: (row) => <Typography variant='body2'>{row.workflowName}</Typography>,
      },
      {
        id: 'currentNode',
        label: '当前节点',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.currentNode}
          </Typography>
        ),
      },
      {
        id: 'exceptionType',
        label: '异常类型',
        render: (row) => (
          <Chip
            size='small'
            label={EXCEPTION_TYPE_LABELS[row.exceptionType]}
            color={EXCEPTION_TYPE_COLORS[row.exceptionType]}
            variant='outlined'
          />
        ),
      },
      {
        id: 'exceptionDescription',
        label: '异常描述',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{
              maxWidth: 320,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.exceptionDescription}
          </Typography>
        ),
      },
      {
        id: 'occurredAt',
        label: '发生时间',
        render: (row) => (
          <Typography
            variant='body2'
            color='text.secondary'
          >
            {row.occurredAt}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => (
          <Chip
            size='small'
            label={STATUS_LABELS[row.status]}
            color={STATUS_COLORS[row.status]}
            variant='outlined'
          />
        ),
      },
      {
        id: 'actions',
        label: '操作',
        align: 'right',
        render: (row) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
            <IconButton
              size='small'
              onClick={() => handleViewDetail(row)}
              title='查看详情'
              color='primary'
            >
              <Eye size={16} />
            </IconButton>
            <IconButton
              size='small'
              onClick={() => handleRetry(row)}
              title='重试'
              color='success'
            >
              <RotateCw size={16} />
            </IconButton>
            <IconButton
              size='small'
              onClick={() => handleIgnore(row)}
              title='忽略'
              color='default'
            >
              <EyeOff size={16} />
            </IconButton>
          </Box>
        ),
      },
    ],
    [handleViewDetail, handleRetry, handleIgnore]
  );

  const filterOptions = useMemo(
    () => [
      {
        id: 'type',
        label: '异常类型',
        type: 'select' as const,
        options: [
          { label: '全部类型', value: 'all' },
          { label: '超时', value: 'timeout' },
          { label: '错误', value: 'error' },
          { label: '卡顿', value: 'stuck' },
        ],
      },
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待处理', value: 'pending' },
          { label: '处理中', value: 'processing' },
          { label: '已解决', value: 'resolved' },
        ],
      },
    ],
    []
  );

  const handleFilterChange = useCallback((filters: Record<string, unknown>) => {
    if (typeof filters.type === 'string') {
      setTypeFilter(filters.type);
    }
    if (typeof filters.status === 'string') {
      setStatusFilter(filters.status);
    }
    setPage(0);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  }, []);

  const renderHeaderContent = () => (
    <Box sx={{ mb: 2 }}>
      <Grid
        container
        spacing={2}
      >
        {stats.map((stat) => (
          <Grid
            key={stat.id}
            size={{ xs: 12, sm: 6, md: 3 }}
          >
            <StatCardComponent
              {...stat}
              size='small'
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Activity size={20} />,
        backButton: {
          href: '/workflow/dashboard',
        },
      }}
    >
      <Stack spacing={2}>
        <ListPageTemplate
          title=''
          subtitle=''
          columns={columns}
          data={paginatedData}
          searchable
          searchPlaceholder='搜索流程名称、实例ID...'
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          filters={filterOptions}
          filtersValue={{
            type: typeFilter,
            status: statusFilter,
          }}
          onFilterChange={handleFilterChange}
          pagination={{
            page,
            pageSize,
            total: filteredData.length,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange,
          }}
          headerContent={renderHeaderContent()}
          emptyMessage='暂无异常记录'
          showRowNumber
          striped
        />
      </Stack>

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={confirmConfig?.onConfirm}
        title={confirmConfig?.title || ''}
        message={confirmConfig?.message || ''}
        danger={confirmConfig?.danger}
      />
    </PageContainer>
  );
};

export default WorkflowMonitorPage;
