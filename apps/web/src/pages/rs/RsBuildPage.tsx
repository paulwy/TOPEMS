import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Button,
} from '@mui/material';
import { Play, FileText, RotateCcw, GitBranch, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ListPageTemplate } from '@/components/templates';

import type { RowAction, FilterConfig, ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { rsApi } from '@/api/rs';
import { useNotificationStore } from '@/store';
import type { Build, CreateBuildRequest } from '@/api/rs';
import { logger } from '@/utils/logger';

const RsBuildPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [projectFilter, setProjectFilter] = useState<string>('');
  const [newBuildDialogOpen, setNewBuildDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedBuild, setSelectedBuild] = useState<Build | null>(null);
  const [newBuildForm, setNewBuildForm] = useState({
    project_id: '',
    branch: '',
    commit_hash: '',
    build_type: 'manual',
  });

  useEffect(() => {
    loadBuilds();
  }, [searchTerm, statusFilter, projectFilter, page, rowsPerPage]);

  const loadBuilds = async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        page: page + 1,
        pagesize: rowsPerPage,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (projectFilter) params.project_id = projectFilter;

      const response = await rsApi.listBuilds(params);
      if (response.success && response.data) {
        setBuilds(response.data.builds || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      logger.error('加载构建记录失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载构建记录',
      });
    } finally {
      setLoading(false);
    }
  };

  const uniqueProjects = useMemo(() => [...new Set(builds.map((b) => b.project_name))], [builds]);

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'success':
        return '成功';
      case 'failed':
        return '失败';
      case 'running':
        return '进行中';
      case 'pending':
        return '待构建';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'warning';
      case 'pending':
        return 'default';
      default:
        return 'default';
    }
  };

  const getBuildTypeLabel = (type: string): string => {
    switch (type) {
      case 'manual':
        return '手动';
      case 'auto':
        return '自动';
      case 'scheduled':
        return '定时';
      default:
        return type;
    }
  };

  const handleViewDetail = (build: Build) => {
    setSelectedBuild(build);
    setDetailDialogOpen(true);
  };

  const handleRebuild = async (build: Build) => {
    try {
      const createData: CreateBuildRequest = {
        project_id: build.project_id,
        branch: build.branch,
        commit_hash: build.commit_hash,
        build_type: 'manual',
      };
      await rsApi.createBuild(createData);
      addNotification({
        type: 'success',
        title: '操作成功',
        message: '构建任务已提交',
      });
      loadBuilds();
    } catch (error: unknown) {
      logger.error('重新构建失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '重新构建失败',
      });
    }
  };

  const handleCreateBuild = async () => {
    try {
      const createData: CreateBuildRequest = {
        project_id: newBuildForm.project_id,
        branch: newBuildForm.branch,
        commit_hash: newBuildForm.commit_hash,
        build_type: newBuildForm.build_type,
      };
      await rsApi.createBuild(createData);
      addNotification({
        type: 'success',
        title: '创建成功',
        message: '构建任务已创建',
      });
      setNewBuildDialogOpen(false);
      setNewBuildForm({
        project_id: '',
        branch: '',
        commit_hash: '',
        build_type: 'manual',
      });
      loadBuilds();
    } catch (error: unknown) {
      logger.error('创建构建失败:', error);
      addNotification({
        type: 'error',
        title: '创建失败',
        message: '无法创建构建任务',
      });
    }
  };

  const columns = useMemo<ColumnDef<Build>[]>(
    () => [
      {
        id: 'build_no',
        label: '构建编号',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GitBranch
              size={16}
              color='primary.main'
            />
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {row.build_no}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'project_name',
        label: '项目',
        render: (row) => row.project_name,
      },
      {
        id: 'branch',
        label: '分支',
        render: (row) => (
          <Chip
            label={row.branch}
            size='small'
            variant='outlined'
          />
        ),
      },
      {
        id: 'commit_hash',
        label: '提交',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
          >
            {row.commit_hash?.slice(0, 8)}...
          </Typography>
        ),
      },
      {
        id: 'build_type',
        label: '类型',
        render: (row) => (
          <Chip
            label={getBuildTypeLabel(row.build_type)}
            size='small'
            variant='outlined'
          />
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {row.status === 'success' ? (
              <CheckCircle
                size={14}
                color='green'
              />
            ) : row.status === 'failed' ? (
              <XCircle
                size={14}
                color='red'
              />
            ) : row.status === 'running' ? (
              <Clock
                size={14}
                color='orange'
              />
            ) : null}
            <Chip
              label={getStatusLabel(row.status)}
              size='small'
              color={getStatusColor(row.status)}
            />
          </Box>
        ),
      },
      {
        id: 'duration',
        label: '耗时',
        render: (row) => row.duration || '-',
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<Build>[]>(
    () => [
      {
        label: '详情',
        icon: <FileText size={16} />,
        onClick: (row) => handleViewDetail(row),
      },
      {
        label: '重新构建',
        icon: <RotateCcw size={16} />,
        color: 'primary',
        onClick: (row) => handleRebuild(row),
      },
    ],
    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'project',
        label: '项目',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          ...uniqueProjects.map((project) => ({
            value: project,
            label: project,
          })),
        ],
        value: projectFilter,
        onChange: (value) => setProjectFilter(value as string),
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'success', label: '成功' },
          { value: 'failed', label: '失败' },
          { value: 'running', label: '进行中' },
          { value: 'pending', label: '待构建' },
        ],
        value: statusFilter,
        onChange: (value) => setStatusFilter(value as string),
      },
    ],
    [projectFilter, statusFilter, uniqueProjects]
  );

  return (
    <PageContainer
      title='构建管理'
      subtitle='管理代码构建和构建流水线'
    >
      <ListPageTemplate<Build>
        title=''
        subtitle=''
        backButton={{
          href: '/dashboard',
        }}
        columns={columns}
        data={builds}
        loading={loading}
        searchable
        searchPlaceholder='搜索构建编号、项目...'
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        filters={filters}
        rowActions={rowActions}
        pagination={{
          page,
          pageSize: rowsPerPage,
          total,
          onPageChange: setPage,
          onPageSizeChange: setRowsPerPage,
        }}
        actions={[
          {
            label: '手动构建',
            icon: <Play size={18} />,
            onClick: () => setNewBuildDialogOpen(true),
            variant: 'contained',
          },
        ]}
      />

      <Dialog
        open={newBuildDialogOpen}
        onClose={() => setNewBuildDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>手动构建</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 2 }}
          >
            <TextField
              label='项目ID'
              fullWidth
              value={newBuildForm.project_id}
              onChange={(e) => setNewBuildForm({ ...newBuildForm, project_id: e.target.value })}
            />
            <TextField
              label='分支'
              fullWidth
              value={newBuildForm.branch}
              onChange={(e) => setNewBuildForm({ ...newBuildForm, branch: e.target.value })}
            />
            <TextField
              label='提交哈希'
              fullWidth
              value={newBuildForm.commit_hash}
              onChange={(e) => setNewBuildForm({ ...newBuildForm, commit_hash: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>构建类型</InputLabel>
              <Select
                value={newBuildForm.build_type}
                label='构建类型'
                onChange={(e) => setNewBuildForm({ ...newBuildForm, build_type: e.target.value })}
              >
                <MenuItem value='manual'>手动</MenuItem>
                <MenuItem value='auto'>自动</MenuItem>
                <MenuItem value='scheduled'>定时</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewBuildDialogOpen(false)}>取消</Button>
          <Button
            variant='contained'
            sx={{ bgcolor: 'primary.main' }}
            onClick={handleCreateBuild}
          >
            提交构建
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>构建详情</DialogTitle>
        <DialogContent>
          {selectedBuild && (
            <Box sx={{ py: 2 }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {selectedBuild.build_no}
              </Typography>
              <Stack
                direction='row'
                spacing={2}
                sx={{ mt: 2 }}
              >
                <Chip
                  label={selectedBuild.project_name}
                  size='small'
                  variant='outlined'
                />
                <Chip
                  label={selectedBuild.branch}
                  size='small'
                  variant='outlined'
                />
                <Chip
                  label={getStatusLabel(selectedBuild.status)}
                  size='small'
                  color={getStatusColor(selectedBuild.status)}
                />
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  提交: {selectedBuild.commit_hash}
                </Typography>
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                  sx={{ mt: 1 }}
                >
                  耗时: {selectedBuild.duration}
                </Typography>
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                  sx={{ mt: 1 }}
                >
                  创建时间: {selectedBuild.created_at}
                </Typography>
              </Box>
              {selectedBuild.logs && (
                <Box sx={{ mt: 3 }}>
                  <Typography
                    variant='subtitle2'
                    color='text.secondary'
                  >
                    构建日志
                  </Typography>
                  <Box
                    sx={{
                      mt: 1,
                      p: 2,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    {selectedBuild.logs}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
          <Button
            variant='contained'
            sx={{ bgcolor: 'primary.main' }}
            onClick={() => handleRebuild(selectedBuild!)}
          >
            重新构建
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default RsBuildPage;
