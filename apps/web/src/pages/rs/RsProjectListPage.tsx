import React, { useState, useEffect, useMemo } from 'react';
import { logger } from '@/utils/logger';
import { Link, useNavigate } from 'react-router-dom';
import { Box, Chip, LinearProgress, Typography, Stack, Button } from '@mui/material';
import { Plus, Download, Eye, Edit, Trash2, Code2 } from 'lucide-react';
import { ListPageTemplate, type ColumnDef, type FilterConfig } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { rsApi } from '@/api/rs';
import { useAppStore } from '@/store';
import type { Project } from '@/api/rs';
import ConfirmDialog from '@/components/common/ConfirmDialog';

const RsProjectListPage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useAppStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    loadProjects();
  }, [searchTerm, statusFilter, page, rowsPerPage]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: page + 1,
        page_size: rowsPerPage,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await rsApi.listProjects(params);
      if (response.success && response.data) {
        setProjects(response.data.projects || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      logger.error('加载项目列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载项目列表',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (
    status: string
  ): 'primary' | 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case '进行中':
      case 'in_progress':
        return 'primary';
      case '已完成':
      case 'completed':
        return 'success';
      case '暂停':
      case 'paused':
        return 'warning';
      case '取消':
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'in_progress':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'paused':
        return '暂停';
      case 'cancelled':
        return '取消';
      case 'pending':
        return '待启动';
      default:
        return status;
    }
  };

  const handleDeleteClick = (project: Project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProject) return;
    await rsApi.deleteProject(selectedProject.id);
    addNotification({
      type: 'success',
      title: '删除成功',
      message: '项目已删除',
    });
    loadProjects();
  };

  const handleExport = () => {
    logger.info('导出项目列表');
  };

  const columns = useMemo<ColumnDef<Project>[]>(
    () => [
      {
        id: 'code',
        label: '项目编码',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 'medium' }}
          >
            {row.code}
          </Typography>
        ),
      },
      {
        id: 'name',
        label: '项目名称',
        render: (row) => <Typography variant='body2'>{row.name}</Typography>,
      },
      {
        id: 'project_type',
        label: '项目类型',
        render: (row) => (
          <Chip
            label={row.project_type}
            size='small'
            variant='outlined'
          />
        ),
      },
      {
        id: 'leader',
        label: '负责人',
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
        id: 'progress',
        label: '进度',
        render: (row) => (
          <Stack
            direction='row'
            spacing={1}
            sx={{ alignItems: 'center' }}
          >
            <LinearProgress
              variant='determinate'
              value={row.progress}
              sx={{ width: 80 }}
            />
            <Typography variant='body2'>{row.progress}%</Typography>
          </Stack>
        ),
      },
      {
        id: 'start_date',
        label: '开始日期',
      },
      {
        id: 'budget',
        label: '预算(万元)',
        render: (row) => (row.budget ? (row.budget / 10000).toFixed(1) : '-'),
      },
    ],
    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部', value: '' },
          { label: '待启动', value: 'pending' },
          { label: '进行中', value: 'in_progress' },
          { label: '已完成', value: 'completed' },
          { label: '暂停', value: 'paused' },
          { label: '取消', value: 'cancelled' },
        ],
        value: statusFilter || '',
        onChange: (value) => setStatusFilter(value || null),
      },
    ],
    [statusFilter]
  );

  const rowActions = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: (row: Project) => navigate(`/rs/projects/${row.id}`),
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (row: Project) => navigate(`/rs/projects/${row.id}/edit`),
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error' as const,
        divider: true,
        onClick: handleDeleteClick,
      },
    ],
    [navigate]
  );

  return (
    <PageContainer
      title='研发项目管理'
      subtitle='管理研发项目、跟踪进度、分配资源'
      headerProps={{
        pageIcon: <Code2 style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={projects}
        loading={loading}
        searchable
        searchPlaceholder='搜索项目名称或编码...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        filters={filters}
        filtersValue={{ status: statusFilter || '' }}
        onFilterChange={(filters) => {
          if (filters.status !== undefined) {
            setStatusFilter(filters.status || null);
          }
        }}
        pagination={{
          page,
          pageSize: rowsPerPage,
          total,
          onPageChange: setPage,
          onPageSizeChange: setRowsPerPage,
        }}
        actions={[
          {
            label: '导出',
            variant: 'outlined',
            icon: <Download size={18} />,
            onClick: handleExport,
          },
          {
            label: '新建项目',
            variant: 'contained',
            icon: <Plus size={18} />,
            onClick: () => navigate('/rs/projects/create'),
          },
        ]}
        rowActions={rowActions}
        showRowNumber
        emptyMessage='暂无项目数据'
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedProject(null);
        }}
        onConfirm={handleDeleteConfirm}
        title='确认删除'
        message={`确定要删除项目 "${selectedProject?.name}" 吗？此操作不可恢复。`}
        danger
      />
    </PageContainer>
  );
};

export default RsProjectListPage;
