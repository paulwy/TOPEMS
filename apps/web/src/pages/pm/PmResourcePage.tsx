import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Search, Eye, Users, CheckCircle2, Trash2, Package, Clock } from 'lucide-react';
import {
  Box,
  Chip,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import type { ProjectResource, Project } from '@/api/pm';
import { pmApi } from '@/api/pm';
import { apiLogger } from '@/utils/logger';
import { useNotificationStore } from '@/store';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const ct = designTokens.colors;

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
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    resource_id: '',
    resource_type: 'server',
    resource_service: '',
    role: '',
    allocation_percent: 100,
    start_date: '',
    end_date: '',
  });

  const pageSize = 10;

  const projectsQuery = useQuery({
    queryKey: QUERY_KEYS.PM.PROJECTS,
    queryFn: () => pmApi.projects.list(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const projects =
    projectsQuery.data?.success && projectsQuery.data.data
      ? projectsQuery.data.data.items || projectsQuery.data.data || []
      : [];

  const resourcesQuery = useQuery({
    queryKey: [...QUERY_KEYS.PM.PROJECTS, selectedProject, selectedType, selectedStatus],
    queryFn: () => pmApi.resources.list(selectedProject),
    enabled: !!selectedProject,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const resources =
    resourcesQuery.data?.success && resourcesQuery.data.data ? resourcesQuery.data.data : [];

  const releaseMutation = useMutation({
    mutationFn: ({ projectId, resourceId }: { projectId: string; resourceId: string }) =>
      pmApi.resources.update(projectId, resourceId, { status: 'available' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.PM.PROJECTS, selectedProject] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ projectId, resourceId }: { projectId: string; resourceId: string }) =>
      pmApi.resources.delete(projectId, resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.PM.PROJECTS, selectedProject] });
    },
  });

  const createMutation = useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: typeof formData }) =>
      pmApi.resources.create(projectId, {
        resource_id: data.resource_id,
        resource_type: data.resource_type,
        resource_service: data.resource_service,
        role: data.role,
        allocation_percent: data.allocation_percent,
        start_date: data.start_date || undefined,
        end_date: data.end_date || undefined,
      }),
    onSuccess: () => {
      setShowAddModal(false);
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.PM.PROJECTS, selectedProject] });
    },
    onError: () => {
      addNotification({ type: 'error', title: '错误', message: '资源添加失败' });
    },
  });

  const loading = resourcesQuery.isLoading;

  const filteredResources = useMemo(() => {
    let filtered = resources;
    if (selectedType) {
      filtered = filtered.filter((r: ProjectResource) => r.resource_type === selectedType);
    }
    if (selectedStatus) {
      filtered = filtered.filter((r: ProjectResource) => r.status === selectedStatus);
    }
    return filtered;
  }, [resources, selectedType, selectedStatus]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return filteredResources;
    const term = searchTerm.toLowerCase();
    return filteredResources.filter(
      (resource: { resource_id: string; resource_service?: string; resource_type: string }) =>
        resource.resource_id.toLowerCase().includes(term) ||
        (resource.resource_service && resource.resource_service.toLowerCase().includes(term)) ||
        resource.resource_type.toLowerCase().includes(term)
    );
  }, [filteredResources, searchTerm]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRelease = useCallback(
    (resource: ProjectResource) => {
      releaseMutation.mutate({ projectId: selectedProject, resourceId: resource.id });
    },
    [selectedProject, releaseMutation]
  );

  const handleDelete = useCallback(
    (resource: ProjectResource) => {
      if (!window.confirm('确定要删除这个资源吗？')) return;
      deleteMutation.mutate({ projectId: selectedProject, resourceId: resource.id });
    },
    [selectedProject, deleteMutation]
  );

  const handleOpenAddModal = () => {
    setFormData({
      resource_id: '',
      resource_type: 'server',
      resource_service: '',
      role: '',
      allocation_percent: 100,
      start_date: '',
      end_date: '',
    });
    setShowAddModal(true);
  };

  const handleSaveResource = () => {
    if (!formData.resource_id.trim() || !selectedProject) {
      addNotification({ type: 'error', title: '错误', message: '请输入资源标识并选择项目' });
      return;
    }
    createMutation.mutate({ projectId: selectedProject, data: formData });
  };

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
              <IconButton
                size='small'
                aria-label='查看详情'
              >
                <Eye size={16} />
              </IconButton>
            </Tooltip>
            {row.status === 'available' && (
              <Tooltip title='分配资源'>
                <IconButton
                  size='small'
                  aria-label='分配资源'
                >
                  <Users size={16} />
                </IconButton>
              </Tooltip>
            )}
            {row.status === 'in_use' && (
              <Tooltip title='释放资源'>
                <IconButton
                  size='small'
                  onClick={() => handleRelease(row)}
                  aria-label='释放资源'
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
                aria-label='删除资源'
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
          ...projects.map((p: { id: string; name: string }) => ({ value: p.id, label: p.name })),
        ],
        value: selectedProject,
        onChange: (value: unknown) => setSelectedProject(value as string),
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
        onChange: (value: unknown) => setSelectedType(value as string),
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
        onChange: (value: unknown) => setSelectedStatus(value as string),
      },
    ],
    [projects, selectedProject, selectedType, selectedStatus]
  );

  const availableCount = filteredResources.filter(
    (r: ProjectResource) => r.status === 'available'
  ).length;
  const inUseCount = filteredResources.filter((r: ProjectResource) => r.status === 'in_use').length;
  const totalHours = filteredResources.reduce(
    (sum: number, r: ProjectResource) => sum + (r.actual_hours || 0),
    0
  );
  const totalCost = filteredResources.reduce(
    (sum: number, r: ProjectResource) => sum + (r.actual_cost || 0),
    0
  );

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PM.PROJECTS });
    queryClient.invalidateQueries({ queryKey: [...QUERY_KEYS.PM.PROJECTS, selectedProject] });
  };

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
          total: filteredResources.length,
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
            onClick: handleOpenAddModal,
            variant: 'contained',
          },
        ]}
        showRowNumber
        columnConfigurable
        persistColumnConfig
        columnConfigStorageKey='pm-resources-columns'
        onRefresh={handleRefresh}
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
                    {filteredResources.length}
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
                    color={ct.yellow[600]}
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
                <Box sx={{ p: 1.5, bgcolor: ct.purple[200], borderRadius: '50%' }}>
                  <Clock
                    size={24}
                    color={ct.purple[700]}
                  />
                </Box>
                <Box>
                  <Box sx={{ fontSize: '0.875rem', color: 'grey.500' }}>累计工时</Box>
                  <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'secondary.dark' }}>
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

      <Dialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新增资源</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label='资源标识 *'
              value={formData.resource_id}
              onChange={(e) => setFormData({ ...formData, resource_id: e.target.value })}
              placeholder='请输入资源标识'
            />
            <FormControl fullWidth>
              <InputLabel>资源类型</InputLabel>
              <Select
                value={formData.resource_type}
                label='资源类型'
                onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
              >
                {Object.entries(RESOURCE_TYPE_LABELS).map(([key, label]) => (
                  <MenuItem
                    key={key}
                    value={key}
                  >
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label='服务名称'
              value={formData.resource_service}
              onChange={(e) => setFormData({ ...formData, resource_service: e.target.value })}
              placeholder='请输入服务名称'
            />
            <TextField
              fullWidth
              label='角色'
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder='请输入角色'
            />
            <TextField
              fullWidth
              label='分配比例 (%)'
              type='number'
              value={formData.allocation_percent}
              onChange={(e) =>
                setFormData({ ...formData, allocation_percent: Number(e.target.value) })
              }
              placeholder='请输入分配比例'
            />
            <TextField
              fullWidth
              label='分配开始日期'
              type='date'
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
            <TextField
              fullWidth
              label='分配结束日期'
              type='date'
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowAddModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleSaveResource}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default PmResourcePage;
