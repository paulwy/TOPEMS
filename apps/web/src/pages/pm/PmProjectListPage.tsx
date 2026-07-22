import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, Eye, FolderKanban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Box, LinearProgress, IconButton, Tooltip, MenuItem } from '@mui/material';
import type { Project } from '@/api/pm';
import { useNotificationStore } from '@/store';
import { pmApi } from '@/api/pm';
import { DataExport, StatusBadge, PageContainer } from '@/components/common';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { designTokens } from '@/theme/tokens';
import { PM_PATHS } from '@/modules/pm/config';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog, useUrlListState } from '@/hooks';

const ct = designTokens.colors;

const PROJECT_TYPES = [
  { value: '', label: '全部类型' },
  { value: 'research', label: '科研项目' },
  { value: 'production', label: '生产项目' },
  { value: 'construction', label: '施工项目' },
  { value: 'design', label: '设计项目' },
  { value: 'service', label: '服务项目' },
];

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已批准' },
  { value: 'active', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const STATUS_OPTIONS_MAP: Record<string, string> = {
  active: '进行中',
  completed: '已完成',
  pending: '待审批',
  approved: '已批准',
  cancelled: '已取消',
  draft: '草稿',
};

const STATUS_COLOR_MAP: Record<string, 'success' | 'primary' | 'warning' | 'default' | 'error'> = {
  active: 'success',
  completed: 'primary',
  pending: 'warning',
  approved: 'primary',
  cancelled: 'default',
  draft: 'default',
};

const PROJECT_TYPES_MAP: Record<string, string> = {
  research: '科研项目',
  production: '生产项目',
  construction: '施工项目',
  design: '设计项目',
  service: '服务项目',
};

const PmProjectListPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const {
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    filters,
    setFilter,
    setFilters,
    currentPage,
    setCurrentPage,
    pageSize,
    resetPage,
  } = useUrlListState<{ project_type: string; status: string }>({
    defaultPageSize: 10,
    defaultFilters: { project_type: '', status: '' },
    baseIndex: 1,
    historyMode: 'replace',
  });
  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  const projectListQuery = useQuery({
    queryKey: ['pm-projects', currentPage, pageSize, filters.project_type, filters.status],
    queryFn: async () => {
      const response = await pmApi.projects.list({
        project_type: filters.project_type || undefined,
        status: filters.status || undefined,
        page: currentPage,
        pagesize: pageSize,
      });
      if (!response.success || !response.data) {
        throw new Error(response.message || '加载项目列表失败');
      }
      return {
        projects: response.data.projects || [],
        total_pages: response.data.total_pages || 1,
        total_count: response.data.total_count || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await pmApi.projects.delete(id);
      if (!response.success) {
        throw new Error(response.message || '删除项目失败');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-projects'] });
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '项目已删除',
      });
    },
    onError: (error: any) => {
      apiLogger.error('Failed to delete project:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: error.message || '无法删除项目',
      });
    },
  });

  const projects: Project[] = projectListQuery.data?.projects || [];
  const totalCount = projectListQuery.data?.total_count || 0;
  const loading = projectListQuery.isLoading || deleteProjectMutation.isPending;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDelete = useCallback(
    (id: string) => {
      openConfirmDialog({
        title: '确认删除',
        message: '确定要删除这个项目吗？',
        danger: true,
        onConfirm: () => {
          deleteProjectMutation.mutate(id);
        },
      });
    },
    [deleteProjectMutation, openConfirmDialog]
  );

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // 列定义
  const columns: ColumnDef<Project>[] = useMemo(
    () => [
      {
        id: 'name',
        label: '项目名称',
        width: 200,
        sortable: true,
      },
      {
        id: 'code',
        label: '项目编码',
        width: 120,
      },
      {
        id: 'project_type',
        label: '类型',
        width: 100,
        render: (row) => PROJECT_TYPES_MAP[row.project_type] || row.project_type,
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => (
          <StatusBadge
            status={row.status}
            label={STATUS_OPTIONS_MAP[row.status] || row.status}
            color={STATUS_COLOR_MAP[row.status]}
          />
        ),
      },
      {
        id: 'progress',
        label: '进度',
        width: 180,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 96 }}>
              <LinearProgress
                variant='determinate'
                value={row.progress || 0}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
            <Box sx={{ fontSize: '0.875rem', color: 'grey.600' }}>{row.progress || 0}%</Box>
          </Box>
        ),
      },
      {
        id: 'budget',
        label: '预算',
        width: 120,
        render: (row) => formatCurrency(row.budget),
      },
      {
        id: 'start_date',
        label: '开始日期',
        width: 150,
        render: (row) => formatDate(row.start_date),
      },
      {
        id: 'end_date',
        label: '结束日期',
        width: 150,
        render: (row) => formatDate(row.end_date),
      },
      {
        id: 'actions',
        label: '操作',
        width: 120,
        align: 'center',
        render: (row) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title='查看详情'>
              <IconButton
                size='small'
                onClick={() => navigate(`${PM_PATHS.projects}/${row.id}`)}
              >
                <Eye size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title='编辑'>
              <IconButton
                size='small'
                onClick={() => navigate(`${PM_PATHS.projects}/${row.id}/edit`)}
              >
                <Edit size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title='删除'>
              <IconButton
                size='small'
                onClick={() => handleDelete(row.id)}
                sx={{ color: 'error.main' }}
              >
                <Trash2 size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [navigate, handleDelete]
  );

  // 筛选配置
  const filterConfigs = useMemo(
    () => [
      {
        id: 'project_type',
        label: '类型',
        type: 'select' as const,
        options: PROJECT_TYPES,
        value: filters.project_type,
        onChange: (value: unknown) => setFilter('project_type', value as string),
      },
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: STATUS_OPTIONS,
        value: filters.status,
        onChange: (value: unknown) => setFilter('status', value as string),
      },
    ],
    [filters.project_type, filters.status, setFilter]
  );

  // 过滤后的数据
  const filteredData = useMemo(() => {
    if (!debouncedSearch) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        project.code.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [projects, debouncedSearch]);

  // 统计卡片数据
  const activeCount = projects.filter((p) => p.status === 'active').length;
  const pendingCount = projects.filter((p) => p.status === 'pending').length;
  const completedCount = projects.filter((p) => p.status === 'completed').length;

  return (
    <PageContainer
      title='项目管理'
      subtitle='管理所有类型的项目，跟踪进度和状态'
      headerProps={{
        pageIcon: <FolderKanban style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main} 0%, ${ct.secondary.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '项目' }]}
        columns={columns}
        data={filteredData}
        loading={loading}
        selectable
        pagination={{
          page: currentPage,
          pageSize,
          total: totalCount,
          onPageChange: handlePageChange,
        }}
        searchable
        searchPlaceholder='搜索项目名称或编号...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filterConfigs}
        filtersValue={{ project_type: filters.project_type, status: filters.status }}
        onFilterChange={(f) => {
          setFilters(f as Partial<{ project_type: string; status: string }>);
        }}
        actions={[
          {
            label: '创建项目',
            icon: <Plus size={16} />,
            onClick: () => navigate(PM_PATHS.projectCreate),
            variant: 'contained',
          },
        ]}
        headerContent={
          <DataExport
            data={projects as unknown as Record<string, unknown>[]}
            fields={[
              { key: 'name', title: '项目名称' },
              { key: 'code', title: '项目编码' },
              { key: 'project_type', title: '项目类型' },
              { key: 'status', title: '状态' },
              { key: 'progress', title: '进度' },
              { key: 'budget', title: '预算' },
              { key: 'start_date', title: '开始日期' },
              { key: 'end_date', title: '结束日期' },
            ]}
            defaultFileName='项目数据'
            buttonText='导出'
          />
        }
        showRowNumber
        columnConfigurable
        persistColumnConfig
        columnConfigStorageKey='pm-projects-columns'
        onRefresh={() => projectListQuery.refetch()}
        mobileCardTitleKey='name'
        mobileCardSubtitleKey='code'
        mobileCardDisplayFields={['project_type', 'status', 'progress', 'start_date']}
        mobileCardFieldLabels={{
          project_type: '项目类型',
          status: '状态',
          progress: '进度',
          start_date: '开始日期',
        }}
      />

      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={setConfirmDialogClosed}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogClosed();
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

export default PmProjectListPage;
