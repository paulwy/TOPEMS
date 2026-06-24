import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import { Button } from '@mui/material';
import { Plus, Play, FileText, Package, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from '@/components/templates';

interface Build {
  id: string;
  build_no: string;
  build_task: string;
  trigger_type: string;
  status: string;
  duration: number;
  build_time: string;
}

const RsBuildPage: React.FC = () => {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [taskTypeFilter, setTaskTypeFilter] = useState<string | null>(null);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [selectedBuild, setSelectedBuild] = useState<Build | null>(null);

  useEffect(() => {
    const mockBuilds: Build[] = [
      {
        id: '1',
        build_no: 'BUILD-20240615-001',
        build_task: 'frontend-main',
        trigger_type: 'push',
        status: 'success',
        duration: 320,
        build_time: '2024-06-15 14:30:00',
      },
      {
        id: '2',
        build_no: 'BUILD-20240615-002',
        build_task: 'backend-api',
        trigger_type: 'manual',
        status: 'running',
        duration: 0,
        build_time: '2024-06-15 14:25:00',
      },
      {
        id: '3',
        build_no: 'BUILD-20240614-003',
        build_task: 'mobile-app',
        trigger_type: 'tag',
        status: 'failed',
        duration: 180,
        build_time: '2024-06-14 16:20:00',
      },
      {
        id: '4',
        build_no: 'BUILD-20240614-002',
        build_task: 'shared-utils',
        trigger_type: 'pr',
        status: 'success',
        duration: 145,
        build_time: '2024-06-14 10:15:00',
      },
      {
        id: '5',
        build_no: 'BUILD-20240614-001',
        build_task: 'data-service',
        trigger_type: 'schedule',
        status: 'success',
        duration: 420,
        build_time: '2024-06-14 02:00:00',
      },
    ];
    setBuilds(mockBuilds);
  }, []);

  const getStatusColor = (status: string): 'success' | 'error' | 'primary' | 'default' => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={14} />;
      case 'failed':
        return <XCircle size={14} />;
      case 'running':
        return (
          <Loader
            size={14}
            className='animate-spin'
          />
        );
      default:
        return <Clock size={14} />;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'success':
        return '成功';
      case 'failed':
        return '失败';
      case 'running':
        return '运行中';
      case 'pending':
        return '等待中';
      default:
        return status;
    }
  };

  const getTriggerTypeLabel = (type: string): string => {
    switch (type) {
      case 'push':
        return '代码推送';
      case 'manual':
        return '手动触发';
      case 'tag':
        return '标签发布';
      case 'pr':
        return '合并请求';
      case 'schedule':
        return '定时任务';
      default:
        return type;
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const uniqueTaskTypes = useMemo(() => [...new Set(builds.map((b) => b.build_task))], [builds]);

  const filteredBuilds = useMemo(() => {
    return builds.filter((build) => {
      const matchesSearch =
        build.build_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        build.build_task.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || build.status === statusFilter;
      const matchesTaskType = !taskTypeFilter || build.build_task.includes(taskTypeFilter);
      return matchesSearch && matchesStatus && matchesTaskType;
    });
  }, [builds, searchTerm, statusFilter, taskTypeFilter]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleTriggerBuild = () => {
    const newBuild: Build = {
      id: String(Date.now()),
      build_no: `BUILD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(builds.length + 1).padStart(3, '0')}`,
      build_task: 'new-task',
      trigger_type: 'manual',
      status: 'running',
      duration: 0,
      build_time: new Date().toLocaleString(),
    };
    setBuilds([newBuild, ...builds]);
  };

  const handleViewLog = (build: Build) => {
    setSelectedBuild(build);
    setLogDialogOpen(true);
  };

  // 表格列定义
  const columns: ColumnDef<Build>[] = [
    {
      id: 'build_no',
      label: '构建编号',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Package
            size={16}
            color='primary.main'
          />
          {row.build_no}
        </Box>
      ),
    },
    { id: 'build_task', label: '构建任务' },
    {
      id: 'trigger_type',
      label: '触发方式',
      render: (row) => (
        <Chip
          label={getTriggerTypeLabel(row.trigger_type)}
          size='small'
          variant='outlined'
        />
      ),
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => (
        <Chip
          icon={getStatusIcon(row.status)}
          label={getStatusLabel(row.status)}
          size='small'
          color={getStatusColor(row.status)}
        />
      ),
    },
    {
      id: 'duration',
      label: '耗时',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Clock size={14} />
          {formatDuration(row.duration)}
        </Box>
      ),
    },
    { id: 'build_time', label: '构建时间' },
  ];

  // 筛选器定义
  const filters: FilterConfig[] = [
    {
      id: 'status',
      label: '构建状态',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        { label: '成功', value: 'success' },
        { label: '失败', value: 'failed' },
        { label: '运行中', value: 'running' },
        { label: '等待中', value: 'pending' },
      ],
      value: statusFilter || '',
      onChange: (value) => setStatusFilter(value || null),
    },
    {
      id: 'taskType',
      label: '任务类型',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        ...uniqueTaskTypes.map((task) => ({ label: task, value: task })),
      ],
      value: taskTypeFilter || '',
      onChange: (value) => setTaskTypeFilter(value || null),
    },
  ];

  // 行操作定义
  const rowActions: RowAction<Build>[] = [
    {
      label: '查看日志',
      icon: <FileText size={16} />,
      onClick: handleViewLog,
    },
    {
      label: '制品管理',
      icon: <Package size={16} />,
    },
  ];

  // 分页配置
  const pagination = {
    page,
    pageSize: rowsPerPage,
    total: filteredBuilds.length,
    onPageChange: setPage,
    onPageSizeChange: setRowsPerPage,
  };

  // 操作按钮
  const actions = [
    {
      label: '触发构建',
      icon: <Play size={18} />,
      onClick: handleTriggerBuild,
    },
  ];

  return (
    <Box sx={{ bgcolor: 'grey.100', minHeight: '100vh', py: 3 }}>
      <ListPageTemplate
        title='构建管理'
        columns={columns}
        data={filteredBuilds}
        loading={loading}
        filters={filters}
        globalSearch={{
          fields: ['build_no', 'build_task'],
          placeholder: '搜索构建编号、任务...',
        }}
        pagination={pagination}
        actions={actions}
        rowActions={rowActions}
        onSearch={setSearchTerm}
      />

      <Dialog
        open={logDialogOpen}
        onClose={() => setLogDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>构建日志</DialogTitle>
        <DialogContent>
          {selectedBuild && (
            <Box sx={{ py: 2 }}>
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 'bold' }}
              >
                {selectedBuild.build_no} - {selectedBuild.build_task}
              </Typography>
              <Paper
                sx={{
                  p: 2,
                  mt: 2,
                  bgcolor: '#1e1e1e',
                  color: '#d4d4d4',
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {`[14:30:00] Starting build...
[14:30:01] Cloning repository...
[14:30:05] Installing dependencies...
[14:30:15] Dependencies installed successfully
[14:30:16] Running tests...
[14:30:45] All tests passed
[14:30:46] Building application...
[14:31:20] Build completed successfully
[14:31:21] Generating artifacts...
[14:31:25] Artifacts generated: app.tar.gz
[14:31:26] Build finished with status: SUCCESS`}
                </pre>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RsBuildPage;
