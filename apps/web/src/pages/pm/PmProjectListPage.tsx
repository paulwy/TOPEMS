import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Box, LinearProgress, IconButton, Tooltip, MenuItem } from '@mui/material';
import type { Project } from '@/api/pm';
import { useAppStore } from '@/store';
import { pmApi } from '@/api/pm';
import { DataExport, StatusBadge, PageContainer } from '@/components/common';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  const loadProjects = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const response = await pmApi.projects.list({
          project_type: selectedType || undefined,
          status: selectedStatus || undefined,
          page,
          page_size: pageSize,
        });
        if (response.success && response.data) {
          setProjects(response.data.projects || []);
          setTotalPages(response.data.total_pages || 1);
          setTotalCount(response.data.total_count || 0);
        }
      } catch (error: unknown) {
        apiLogger.error('Failed to load projects:', error);
      } finally {
        setLoading(false);
      }
    },
    [selectedType, selectedStatus]
  );

  useEffect(() => {
    setCurrentPage(1);
    loadProjects(1);
  }, [selectedType, selectedStatus, loadProjects]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadProjects(page);
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这个项目吗？')) return;
      try {
        const response = await pmApi.projects.delete(id);
        if (response.success) {
          setCurrentPage((prev) => {
            loadProjects(prev);
            return prev;
          });
        }
      } catch (error: unknown) {
        apiLogger.error('Failed to delete project:', error);
      }
    },
    [loadProjects]
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
                onClick={() => navigate(`/pm/projects/${row.id}`)}
              >
                <Eye size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title='编辑'>
              <IconButton
                size='small'
                onClick={() => navigate(`/pm/projects/${row.id}/edit`)}
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
  const filters = useMemo(
    () => [
      {
        id: 'project_type',
        label: '类型',
        type: 'select' as const,
        options: PROJECT_TYPES,
        value: selectedType,
        onChange: setSelectedType,
      },
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: STATUS_OPTIONS,
        value: selectedStatus,
        onChange: setSelectedStatus,
      },
    ],
    [selectedType, selectedStatus]
  );

  // 过滤后的数据
  const filteredData = useMemo(() => {
    if (!searchTerm) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [projects, searchTerm]);

  // 统计卡片数据
  const activeCount = projects.filter((p) => p.status === 'active').length;
  const pendingCount = projects.filter((p) => p.status === 'pending').length;
  const completedCount = projects.filter((p) => p.status === 'completed').length;

  return (
    <PageContainer
      title='项目管理'
      subtitle='管理所有类型的项目，跟踪进度和状态'
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
      searchValue={searchTerm}
      onSearch={setSearchTerm}
      filters={filters}
      filtersValue={{ project_type: selectedType, status: selectedStatus }}
      onFilterChange={(f) => {
        if (f.project_type !== undefined) setSelectedType(f.project_type);
        if (f.status !== undefined) setSelectedStatus(f.status);
      }}
      actions={[
        {
          label: '创建项目',
          icon: <Plus size={16} />,
          onClick: () => navigate('/pm/projects/create'),
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
      onRefresh={() => loadProjects(currentPage)}
    />
    </PageContainer>
  );
};

export default PmProjectListPage;
