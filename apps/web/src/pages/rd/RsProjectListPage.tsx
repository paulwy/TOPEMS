import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Chip, LinearProgress, Typography, Stack } from '@mui/material';
import { Plus, Download, Eye, Edit, Trash2, Code2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ListPageTemplate, type ColumnDef, type FilterConfig } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { rdApi } from '@/api/rd';
import { useNotificationStore } from '@/store';
import type { Project } from '@/api/rd';
import { ConfirmDialog } from '@topems/shared-components';
import { designTokens } from '@/theme/tokens';
import { RD_PATHS } from '@/modules/rd/config';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { logger } from '@/utils/logger';

const ct = designTokens.colors;

const RsProjectListPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const projectListQuery = useQuery({
    queryKey: [...QUERY_KEYS.RD.PROJECTS, { page, rowsPerPage, searchTerm, statusFilter }],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: page + 1,
        pagesize: rowsPerPage,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await rdApi.listProjects(params);
      if (!response.success || !response.data) {
        throw new Error(response.message || t('rd.project_list_page.error.load_list_failed'));
      }
      return {
        projects: response.data.projects || [],
        total: response.data.total || 0,
      };
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await rdApi.deleteProject(id);
      if (!response.success) {
        throw new Error(response.message || t('rd.project_list_page.error.delete_failed'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RD.PROJECTS });
      addNotification({
        type: 'success',
        title: t('rd.project_list_page.notification.delete_success_title'),
        message: t('rd.project_list_page.notification.delete_success_message'),
      });
    },
    onError: (error: unknown) => {
      logger.error('删除项目失败:', error);
      addNotification({
        type: 'error',
        title: t('rd.project_list_page.notification.delete_failed_title'),
        message: error instanceof Error ? error.message : t('rd.project_list_page.notification.delete_failed_message'),
      });
    },
  });

  const projects = projectListQuery.data?.projects || [];
  const total = projectListQuery.data?.total || 0;
  const loading = projectListQuery.isLoading || deleteProjectMutation.isPending;

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
        return t('rd.project_list_page.status_filter.in_progress');
      case 'completed':
        return t('rd.project_list_page.status_filter.completed');
      case 'paused':
        return t('rd.project_list_page.status_filter.paused');
      case 'cancelled':
        return t('rd.project_list_page.status_filter.cancelled');
      case 'pending':
        return t('rd.project_list_page.status_filter.pending');
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
    try {
      await deleteProjectMutation.mutateAsync(selectedProject.id);
      setDeleteDialogOpen(false);
      setSelectedProject(null);
    } catch {
      // 错误已在 mutation onError 中处理
    }
  };

  const handleExport = () => {
    logger.info('导出项目列表');
  };

  const columns = useMemo<ColumnDef<Project>[]>(
    () => [
      {
        id: 'code',
        label: t('rd.project_list_page.column.code'),
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
        label: t('rd.project_list_page.column.name'),
        render: (row) => <Typography variant='body2'>{row.name}</Typography>,
      },
      {
        id: 'project_type',
        label: t('rd.project_list_page.column.project_type'),
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
        label: t('rd.project_list_page.column.leader'),
      },
      {
        id: 'status',
        label: t('rd.project_list_page.column.status'),
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
        label: t('rd.project_list_page.column.progress'),
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
        label: t('rd.project_list_page.column.start_date'),
      },
      {
        id: 'budget',
        label: t('rd.project_list_page.column.budget'),
        render: (row) => (row.budget ? (row.budget / 10000).toFixed(1) : '-'),
      },
    ],
    [t]
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'status',
        label: t('rd.project_list_page.filter.status'),
        type: 'select',
        options: [
          { label: t('rd.project_list_page.status_filter.all'), value: '' },
          { label: t('rd.project_list_page.status_filter.pending'), value: 'pending' },
          { label: t('rd.project_list_page.status_filter.in_progress'), value: 'in_progress' },
          { label: t('rd.project_list_page.status_filter.completed'), value: 'completed' },
          { label: t('rd.project_list_page.status_filter.paused'), value: 'paused' },
          { label: t('rd.project_list_page.status_filter.cancelled'), value: 'cancelled' },
        ],
        value: statusFilter || '',
        onChange: (value: unknown) => setStatusFilter((value as string) || null),
      },
    ],
    [statusFilter, t]
  );

  const rowActions = useMemo(
    () => [
      {
        label: t('rd.project_list_page.row_action.view_detail'),
        icon: <Eye size={16} />,
        onClick: (row: Project) => navigate(`${RD_PATHS.project}/${row.id}`),
      },
      {
        label: t('rd.project_list_page.row_action.edit'),
        icon: <Edit size={16} />,
        onClick: (row: Project) => navigate(`${RD_PATHS.project}/${row.id}/edit`),
      },
      {
        label: t('rd.project_list_page.row_action.delete'),
        icon: <Trash2 size={16} />,
        color: 'error' as const,
        divider: true,
        onClick: handleDeleteClick,
      },
    ],
    [navigate, t]
  );

  return (
    <PageContainer
      title={t('rd.project_list_page.title')}
      subtitle={t('rd.project_list_page.subtitle')}
      headerProps={{
        pageIcon: <Code2 style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main} 0%, ${ct.secondary.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={projects}
        loading={loading}
        searchable
        searchPlaceholder={t('rd.project_list_page.search_placeholder')}
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
            label: t('rd.project_list_page.action_button.export'),
            variant: 'outlined',
            icon: <Download size={18} />,
            onClick: handleExport,
          },
          {
            label: t('rd.project_list_page.action_button.create_project'),
            variant: 'contained',
            icon: <Plus size={18} />,
            onClick: () => navigate(RD_PATHS.projectCreate),
          },
        ]}
        rowActions={rowActions}
        showRowNumber
        emptyMessage={t('rd.project_list_page.empty_message')}
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedProject(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t('rd.project_list_page.dialog.confirm_delete_title')}
        message={t('rd.project_list_page.dialog.confirm_delete_message', { name: selectedProject?.name || '' })}
        danger
      />
    </PageContainer>
  );
};

export default RsProjectListPage;
