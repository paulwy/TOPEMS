import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Eye, Users, CheckCircle2, Trash2, Package, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, Tooltip, IconButton } from '@mui/material';
import type { ProjectResource, Project } from '@/api/pm';
import { pmApi } from '@/api/pm';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';

const STATUS_LABELS: Record<string, string> = {
  available: '可用',
  in_use: '使用中',
  maintenance: '维护中',
  retired: '已退役',
};

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  available: 'success',
  in_use: 'warning',
  maintenance: 'error',
  retired: 'default',
};

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  server: '服务器',
  database: '数据库',
  workstation: '工作站',
  hardware: '硬件',
  software: '软件',
  network: '网络设备',
};

const PmResourcePage: React.FC = () => {
  const navigate = useNavigate();
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  const loadProjects = useCallback(async () => {
    try {
      const response = await pmApi.projects.list();
      if (response.success && response.data) {
        setProjects(response.data);
      }
    } catch (error: unknown) {
      apiLogger.error('Failed to load projects:', error);
    }
  }, []);

  const loadResources = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        if (!selectedProject) {
          setResources([]);
          setTotalCount(0);
          setLoading(false);
          return;
        }

        const response = await pmApi.resources.list(selectedProject);
        if (response.success && response.data) {
          let filtered = response.data;
          if (selectedType) {
            filtered = filtered.filter((r: ProjectResource) => r.resource_type === selectedType);
          }
          if (selectedStatus) {
            filtered = filtered.filter((r: ProjectResource) => r.status === selectedStatus);
          }
          setResources(filtered);
          setTotalCount(filtered.length);
        }
      } catch (error: unknown) {
        apiLogger.error('Failed to load resources:', error);
      } finally {
        setLoading(false);
      }
    },
    [selectedProject, selectedType, selectedStatus]
  );

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    setCurrentPage(1);
    loadResources(1);
  }, [selectedProject, selectedType, selectedStatus, loadResources]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRelease = useCallback(
    async (resource: ProjectResource) => {
      try {
        const response = await pmApi.resources.update(selectedProject, resource.id, {
          status: 'available',
        });
        if (response.success) {
          loadResources(currentPage);
        }
      } catch (error: unknown) {
        apiLogger.error('Failed to release resource:', error);
      }
    },
    [selectedProject, currentPage, loadResources]
  );

  const handleDelete = useCallback(
    async (resource: ProjectResource) => {
      if (!window.confirm('确定要删除这个资源吗？')) return;
      try {
        const response = await pmApi.resources.delete(selectedProject, resource.id);
        if (response.success) {
          loadResources(currentPage);
        }
      } catch (error: unknown) {
        apiLogger.error('Failed to delete resource:', error);
      }
    },
    [selectedProject, currentPage, loadResources]
  );

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const formatPercent = (percent?: number) => {
    if (percent === undefined || percent === null) return '-';
    return `${percent}%`;
  };

  const columns: ColumnDef<ProjectResource>[] = useMemo(
    () => [
      {
        id: 'resource_id',
        label: '资源标识',
        width: 150,
      },
      {
        id: 'resource_type',
        label: '资源类型',
        width: 100,
        render: (row) => RESOURCE_TYPE_LABELS[row.resource_type] || row.resource_type,
      },
      {
        id: 'resource_service',
        label: '服务名称',
        width: 150,
        render: (row) => row.resource_service || '-',
      },
      {
        id: 'role',
        label: '角色',
        width: 100,
        render: (row) => row.role || '-',
      },
      {
        id: 'allocation_percent',
        label: '分配比例',
        width: 120,
        render: (row) => formatPercent(row.allocation_percent),
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => (
          <Chip
            size='small'
            label={STATUS_LABELS[row.status || 'available'] || row.status}
            color={STATUS_COLORS[row.status || 'available']}
          />
        ),
      },
      {
        id: 'start_date',
        label: '分配开始',
        width: 120,
        render: (row) => formatDate(row.start_date),
      },
      {
        id: 'end_date',
        label: '分配结束',
        width: 120,
        render: (row) => formatDate(row.end_date),
      },
      {
        id: 'created_at',
        label: '创建时间',
        width: 150,
        render: (row) => formatDate(row.created_at),
      },
      {
        id: 'actions',
        label: '操作',
        width: 150,
        align: 'center',
        render: (row) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title='查看详情'>
              <IconButton size='small'>
                <Eye size={16} />
              </IconButton>
            </Tooltip>
            {row.status === 'available' && (
              <Tooltip title='分配资源'>
                <IconButton size='small'>
                  <Users size={16} />
                </IconButton>
              </Tooltip>
            )}
            {row.status === 'in_use' && (
              <Tooltip title='释放资源'>
                <IconButton
                  size='small'
                  onClick={() => handleRelease(row)}
                >
                  <CheckCircle2 size={16} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title='删除'>
              <IconButton
                size='small'
                onClick={() => handleDelete(row)}
                sx={{ color: 'error.main' }}
              >
                <Trash2 size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [handleRelease, handleDelete]
  );

  const filters = useMemo(
    () => [
      {
        id: 'project',
        label: '项目',
        type: 'select' as const,
        options: [
          { value: '', label: '请选择项目' },
          ...projects.map((p) => ({ value: p.id, label: p.name })),
        ],
        value: selectedProject,
        onChange: setSelectedProject,
      },
      {
        id: 'resource_type',
        label: '资源类型',
        type: 'select' as const,
        options: [
          { value: '', label: '全部类型' },
          { value: 'server', label: '服务器' },
          { value: 'database', label: '数据库' },
          { value: 'workstation', label: '工作站' },
          { value: 'hardware', label: '硬件' },
          { value: 'software', label: '软件' },
          { value: 'network', label: '网络设备' },
        ],
        value: selectedType,
        onChange: setSelectedType,
      },
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { value: '', label: '全部状态' },
          { value: 'available', label: '可用' },
          { value: 'in_use', label: '使用中' },
          { value: 'maintenance', label: '维护中' },
          { value: 'retired', label: '已退役' },
        ],
        value: selectedStatus,
        onChange: setSelectedStatus,
      },
    ],
    [projects, selectedProject, selectedType, selectedStatus]
  );

  const filteredData = useMemo(() => {
    if (!searchTerm) return resources;
    const term = searchTerm.toLowerCase();
    return resources.filter(
      (resource) =>
        resource.resource_id.toLowerCase().includes(term) ||
        (resource.resource_service && resource.resource_service.toLowerCase().includes(term)) ||
        resource.resource_type.toLowerCase().includes(term)
    );
  }, [resources, searchTerm]);

  const availableCount = resources.filter((r) => r.status === 'available').length;
  const inUseCount = resources.filter((r) => r.status === 'in_use').length;
  const totalHours = resources.reduce((sum, r) => sum + (r.actual_hours || 0), 0);
  const totalCost = resources.reduce((sum, r) => sum + (r.actual_cost || 0), 0);

  return (
    <PageContainer
      title='资源管理'
      subtitle='管理项目资源的分配与使用情况'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '项目管理' },
          { label: '资源管理' },
        ]}
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
        searchPlaceholder='搜索资源标识或服务名称...'
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        filters={filters}
        filtersValue={{
          project: selectedProject,
          resource_type: selectedType,
          status: selectedStatus,
        }}
        onFilterChange={(f) => {
          if (f.project !== undefined) setSelectedProject(f.project);
          if (f.resource_type !== undefined) setSelectedType(f.resource_type);
          if (f.status !== undefined) setSelectedStatus(f.status);
        }}
        actions={[
          {
            label: '新增资源',
            icon: <Plus size={16} />,
            onClick: () => navigate('#'),
            variant: 'contained',
          },
        ]}
        showRowNumber
        columnConfigurable
        persistColumnConfig
        columnConfigStorageKey='pm-resources-columns'
        onRefresh={() => loadResources(currentPage)}
        headerContent={
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
              gap: 2,
              mb: 3,
            }}
          >
            <Box
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 3,
                boxShadow: 1,
                p: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1.5, bgcolor: 'primary.100', borderRadius: '50%' }}>
                  <Package
                    size={24}
                    color='primary.dark'
                  />
                </Box>
                <Box>
                  <Box sx={{ fontSize: '0.875rem', color: 'grey.500' }}>资源总数</Box>
                  <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'grey.900' }}>
                    {resources.length}
                  </Box>
                </Box>
              </Box>
            </Box>
            <Box
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 3,
                boxShadow: 1,
                p: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1.5, bgcolor: 'success.light', borderRadius: '50%' }}>
                  <CheckCircle2
                    size={24}
                    color='success.dark'
                  />
                </Box>
                <Box>
                  <Box sx={{ fontSize: '0.875rem', color: 'grey.500' }}>可用资源</Box>
                  <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'success.dark' }}>
                    {availableCount}
                  </Box>
                </Box>
              </Box>
            </Box>
            <Box
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 3,
                boxShadow: 1,
                p: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1.5, bgcolor: 'warning.light', borderRadius: '50%' }}>
                  <Users
                    size={24}
                    color='#ca8a04'
                  />
                </Box>
                <Box>
                  <Box sx={{ fontSize: '0.875rem', color: 'grey.500' }}>使用中</Box>
                  <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'warning.dark' }}>
                    {inUseCount}
                  </Box>
                </Box>
              </Box>
            </Box>
            <Box
              sx={{
                bgcolor: 'background.paper',
                borderRadius: 3,
                boxShadow: 1,
                p: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1.5, bgcolor: '#e9d5ff', borderRadius: '50%' }}>
                  <Clock
                    size={24}
                    color='#7e22ce'
                  />
                </Box>
                <Box>
                  <Box sx={{ fontSize: '0.875rem', color: 'grey.500' }}>累计工时</Box>
                  <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#7e22ce' }}>
                    {totalHours.toFixed(0)}h
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        }
        mobileCardTitleKey='resource_service'
        mobileCardSubtitleKey='resource_id'
        mobileCardDisplayFields={['resource_type', 'role', 'allocation_percent', 'status']}
        mobileCardFieldLabels={{
          resource_type: '资源类型',
          role: '角色',
          allocation_percent: '分配比例',
          status: '状态',
        }}
      />
    </PageContainer>
  );
};

export default PmResourcePage;
