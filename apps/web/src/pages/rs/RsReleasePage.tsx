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
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/common';
import { Plus, Eye, RotateCcw, Tag, Calendar, User } from 'lucide-react';
import {
  ListPageTemplate,
  type ColumnDef,
  type FilterConfig,
  type RowAction,
} from '@/components/templates';

interface Release {
  id: string;
  version: string;
  release_time: string;
  release_note: string;
  environment: string;
  status: string;
  release_by: string;
}

const RsReleasePage: React.FC = () => {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [envFilter, setEnvFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [newReleaseDialogOpen, setNewReleaseDialogOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [newReleaseForm, setNewReleaseForm] = useState({
    version: '',
    environment: 'staging',
    release_note: '',
  });
  const [releasePackageAttachments, setReleasePackageAttachments] = useState<string[]>([]);

  useEffect(() => {
    const mockReleases: Release[] = [
      {
        id: '1',
        version: 'v2.3.1',
        release_time: '2024-06-15 14:30:00',
        release_note: '修复用户登录问题，优化性能',
        environment: 'production',
        status: 'released',
        release_by: '张三',
      },
      {
        id: '2',
        version: 'v2.3.0',
        release_time: '2024-06-10 10:00:00',
        release_note: '新增数据分析功能',
        environment: 'production',
        status: 'released',
        release_by: '李四',
      },
      {
        id: '3',
        version: 'v2.4.0-beta',
        release_time: '2024-06-20 09:00:00',
        release_note: '新版本测试发布',
        environment: 'staging',
        status: 'planning',
        release_by: '王五',
      },
      {
        id: '4',
        version: 'v2.2.5',
        release_time: '2024-06-05 16:45:00',
        release_note: '紧急修复生产问题',
        environment: 'production',
        status: 'rolled_back',
        release_by: '赵六',
      },
      {
        id: '5',
        version: 'v2.2.4',
        release_time: '2024-06-01 11:20:00',
        release_note: '常规版本更新',
        environment: 'production',
        status: 'released',
        release_by: '孙七',
      },
    ];
    setReleases(mockReleases);
  }, []);

  const getEnvColor = (env: string): 'error' | 'warning' | 'success' => {
    switch (env) {
      case 'production':
        return 'error';
      case 'staging':
        return 'warning';
      case 'development':
        return 'success';
      default:
        return 'success';
    }
  };

  const getEnvLabel = (env: string): string => {
    switch (env) {
      case 'production':
        return '生产环境';
      case 'staging':
        return '预发布环境';
      case 'development':
        return '开发环境';
      default:
        return env;
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'released':
        return 'success';
      case 'planning':
        return 'warning';
      case 'rolled_back':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'released':
        return '已发布';
      case 'planning':
        return '规划中';
      case 'rolled_back':
        return '已回滚';
      default:
        return status;
    }
  };

  const filteredReleases = useMemo(() => {
    return releases.filter((release) => {
      const matchesSearch =
        release.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
        release.release_note.toLowerCase().includes(searchTerm.toLowerCase()) ||
        release.release_by.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEnv = !envFilter || release.environment === envFilter;
      const matchesStatus = !statusFilter || release.status === statusFilter;
      const matchesDateRange =
        (!dateRange.start || release.release_time >= dateRange.start) &&
        (!dateRange.end || release.release_time <= dateRange.end);
      return matchesSearch && matchesEnv && matchesStatus && matchesDateRange;
    });
  }, [releases, searchTerm, envFilter, statusFilter, dateRange]);

  const handleViewDetail = (release: Release) => {
    setSelectedRelease(release);
    setDetailDialogOpen(true);
  };

  const handleRollback = (release: Release) => {
    const newRollback: Release = {
      id: String(Date.now()),
      version: '上一版本',
      release_time: new Date().toLocaleString(),
      release_note: '回滚操作',
      environment: releases.find((r) => r.id === release.id)?.environment || 'staging',
      status: 'planning',
      release_by: '当前用户',
    };
    setReleases([newRollback, ...releases]);
  };

  const handleCreateRelease = () => {
    const newRelease: Release = {
      id: String(Date.now()),
      version: newReleaseForm.version,
      release_time: new Date().toLocaleString(),
      release_note: newReleaseForm.release_note,
      environment: newReleaseForm.environment,
      status: 'planning',
      release_by: '当前用户',
    };
    setReleases([newRelease, ...releases]);
    setNewReleaseDialogOpen(false);
    setNewReleaseForm({
      version: '',
      environment: 'staging',
      release_note: '',
    });
  };

  // 表格列定义
  const columns: ColumnDef<Release>[] = [
    {
      id: 'version',
      label: '版本号',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tag
            size={16}
            color='#3b82f6'
          />
          {row.version}
        </Box>
      ),
    },
    {
      id: 'release_time',
      label: '发布时间',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Calendar size={14} />
          {row.release_time}
        </Box>
      ),
    },
    {
      id: 'release_note',
      label: '发布说明',
      render: (row) => (
        <Tooltip title={row.release_note}>
          <Box
            sx={{
              maxWidth: 250,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.release_note}
          </Box>
        </Tooltip>
      ),
    },
    {
      id: 'environment',
      label: '发布环境',
      render: (row) => (
        <Chip
          label={getEnvLabel(row.environment)}
          size='small'
          color={getEnvColor(row.environment)}
        />
      ),
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => (
        <Chip
          label={getStatusLabel(row.status)}
          size='small'
          color={getStatusColor(row.status)}
        />
      ),
    },
    {
      id: 'release_by',
      label: '发布人',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <User size={14} />
          {row.release_by}
        </Box>
      ),
    },
  ];

  // 筛选器定义
  const filters: FilterConfig[] = [
    {
      id: 'env',
      label: '环境',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        { label: '生产环境', value: 'production' },
        { label: '预发布环境', value: 'staging' },
        { label: '开发环境', value: 'development' },
      ],
      value: envFilter || '',
      onChange: (value) => setEnvFilter(value || null),
    },
    {
      id: 'status',
      label: '状态',
      type: 'select',
      options: [
        { label: '全部', value: '' },
        { label: '已发布', value: 'released' },
        { label: '规划中', value: 'planning' },
        { label: '已回滚', value: 'rolled_back' },
      ],
      value: statusFilter || '',
      onChange: (value) => setStatusFilter(value || null),
    },
    {
      id: 'dateRange',
      label: '日期范围',
      type: 'dateRange',
      value: dateRange,
      onChange: (value) => setDateRange(value || { start: '', end: '' }),
    },
  ];

  // 行操作定义
  const rowActions: RowAction<Release>[] = [
    {
      label: '查看详情',
      icon: <Eye size={16} />,
      onClick: handleViewDetail,
    },
    {
      label: '回滚',
      icon: <RotateCcw size={16} />,
      onClick: handleRollback,
      show: (row) => row.status === 'released',
    },
  ];

  // 分页配置
  const pagination = {
    page,
    pageSize: rowsPerPage,
    total: filteredReleases.length,
    onPageChange: setPage,
    onPageSizeChange: setRowsPerPage,
  };

  // 操作按钮
  const actions = [
    {
      label: '新建发布',
      icon: <Plus size={18} />,
      onClick: () => {
        setReleasePackageAttachments([]);
        setNewReleaseDialogOpen(true);
      },
    },
  ];

  return (
    <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 3 }}>
      <ListPageTemplate
        title='发布管理'
        columns={columns}
        data={filteredReleases}
        loading={loading}
        filters={filters}
        globalSearch={{
          fields: ['version', 'release_note', 'release_by'],
          placeholder: '搜索版本、说明...',
        }}
        pagination={pagination}
        actions={actions}
        rowActions={rowActions}
        onSearch={setSearchTerm}
      />

      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>发布详情</DialogTitle>
        <DialogContent>
          {selectedRelease && (
            <Box sx={{ py: 2 }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {selectedRelease.version}
              </Typography>
              <Stack
                direction='row'
                spacing={2}
                sx={{ mt: 2 }}
              >
                <Chip
                  label={getEnvLabel(selectedRelease.environment)}
                  size='small'
                  color={getEnvColor(selectedRelease.environment)}
                />
                <Chip
                  label={getStatusLabel(selectedRelease.status)}
                  size='small'
                  color={getStatusColor(selectedRelease.status)}
                />
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  发布说明
                </Typography>
                <Paper sx={{ p: 2, mt: 1, bgcolor: '#f5f5f5' }}>
                  <Typography variant='body2'>{selectedRelease.release_note}</Typography>
                </Paper>
              </Box>
              <Stack
                direction='row'
                spacing={4}
                sx={{ mt: 3 }}
              >
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    发布时间
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 'bold' }}
                  >
                    {selectedRelease.release_time}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    发布人
                  </Typography>
                  <Typography
                    variant='body1'
                    sx={{ fontWeight: 'bold' }}
                  >
                    {selectedRelease.release_by}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={newReleaseDialogOpen}
        onClose={() => setNewReleaseDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新建发布</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 2 }}
          >
            <TextField
              label='版本号'
              fullWidth
              value={newReleaseForm.version}
              onChange={(e) =>
                setNewReleaseForm({
                  ...newReleaseForm,
                  version: e.target.value,
                })
              }
            />
            <FormControl fullWidth>
              <InputLabel>发布环境</InputLabel>
              <Select
                value={newReleaseForm.environment}
                label='发布环境'
                onChange={(e) =>
                  setNewReleaseForm({
                    ...newReleaseForm,
                    environment: e.target.value,
                  })
                }
              >
                <MenuItem value='production'>生产环境</MenuItem>
                <MenuItem value='staging'>预发布环境</MenuItem>
                <MenuItem value='development'>开发环境</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label='发布说明'
              fullWidth
              multiline
              rows={4}
              value={newReleaseForm.release_note}
              onChange={(e) =>
                setNewReleaseForm({
                  ...newReleaseForm,
                  release_note: e.target.value,
                })
              }
            />
            <Box>
              <Typography
                variant='subtitle2'
                color='text.secondary'
                sx={{ mb: 1 }}
              >
                发布包附件
              </Typography>
              <FileUpload
                value={releasePackageAttachments}
                onChange={setReleasePackageAttachments}
                accept={['.zip', '.tar', '.gz', '.jar', '.war', '.pdf', '.doc', '.docx']}
                maxCount={10}
                maxSize={500}
                maxTotalSize={2000}
                uploadText='上传发布包'
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewReleaseDialogOpen(false)}>取消</Button>
          <Button
            variant='contained'
            sx={{ bgcolor: '#3b82f6' }}
            onClick={handleCreateRelease}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RsReleasePage;
