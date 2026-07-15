import React, { useState } from 'react';
import { Box, Chip, Tabs, Tab, Paper, useTheme, useMediaQuery } from '@mui/material';
import { Plus, Eye, Edit, Trash2, FlaskConical as Flask } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { rdApi, type Experiment } from '@/api/rd';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { ConfirmDialog } from '@topems/shared-components';
import { RD_PATHS } from '@/modules/rd/config';
import { QUERY_KEYS } from '@/lib/reactQuery';

interface ExperimentWithProject extends Experiment {
  project_name?: string;
}

const RsExperimentListPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<ExperimentWithProject | null>(null);

  const experimentListQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.RD.EXPERIMENTS,
      { activeTab, page, rowsPerPage, searchTerm, statusFilter },
    ],
    queryFn: async () => {
      const params = {
        page: page + 1,
        pagesize: rowsPerPage,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
      };

      let response;
      switch (activeTab) {
        case 1:
          response = await rdApi.listLabExperiments(params);
          break;
        case 2:
          response = await rdApi.listPilotExperiments(params);
          break;
        case 3:
          response = await rdApi.listScaleupExperiments(params);
          break;
        default:
          response = await rdApi.listExperiments(params);
      }

      if (!response.success || !response.data) {
        throw new Error(response.message || '加载试验数据失败');
      }
      return {
        experiments: response.data.experiments || [],
        total: response.data.total || 0,
      };
    },
  });

  const deleteExperimentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await rdApi.deleteExperiment(id);
      if (!response.success) {
        throw new Error(response.message || '删除试验失败');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RD.EXPERIMENTS });
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '删除试验成功',
      });
    },
    onError: (error: unknown) => {
      apiLogger.error('删除试验失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: error instanceof Error ? error.message : '删除试验失败',
      });
    },
  });

  const experiments = experimentListQuery.data?.experiments || [];
  const total = experimentListQuery.data?.total || 0;
  const loading = experimentListQuery.isLoading || deleteExperimentMutation.isPending;

  const getStatusColor = (
    status: string
  ): 'primary' | 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case '进行中':
        return 'primary';
      case '已完成':
        return 'success';
      case '暂停':
        return 'warning';
      case '失败':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPhaseColor = (phase: string): 'info' | 'warning' | 'error' | 'default' => {
    switch (phase) {
      case '小试':
        return 'info';
      case '中试':
        return 'warning';
      case '放大':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleDeleteClick = (experiment: ExperimentWithProject) => {
    setSelectedExperiment(experiment);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedExperiment) return;
    try {
      await deleteExperimentMutation.mutateAsync(selectedExperiment.id);
      setDeleteDialogOpen(false);
      setSelectedExperiment(null);
    } catch {
      // 错误已在 mutation onError 中处理
    }
  };

  const columns: ColumnDef<ExperimentWithProject>[] = [
    {
      id: 'code',
      label: '试验编码',
      render: (row) => <Box sx={{ fontWeight: 'medium' }}>{row.code}</Box>,
    },
    { id: 'name', label: '试验名称' },
    {
      id: 'project',
      label: '所属项目',
      render: (row) => row.project_name || row.project_id,
    },
    {
      id: 'phase',
      label: '阶段',
      render: (row) => (
        <Chip
          label={row.phase}
          size='small'
          color={getPhaseColor(row.phase)}
        />
      ),
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => (
        <Chip
          label={row.status}
          size='small'
          color={getStatusColor(row.status)}
        />
      ),
    },
    { id: 'experimenter', label: '实验员' },
    { id: 'started_at', label: '开始日期' },
    {
      id: 'batchNumber',
      label: '批次号',
      render: (row) => row.batch_number || '-',
    },
  ];

  const rowActions: RowAction<ExperimentWithProject>[] = [
    {
      label: '查看详情',
      icon: <Eye size={16} />,
      onClick: (row) => navigate(`${RD_PATHS.experiment}/${row.id}`),
    },
    {
      label: '编辑',
      icon: <Edit size={16} />,
      onClick: (row) => navigate(`${RD_PATHS.experiment}/${row.id}/edit`),
    },
    {
      label: '删除',
      icon: <Trash2 size={16} />,
      color: 'error',
      onClick: handleDeleteClick,
    },
  ];

  const headerContent = (
    <Box>
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => {
            setActiveTab(v);
            setPage(0);
          }}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons={isMobile}
        >
          <Tab label='全部试验' />
          <Tab
            label='小试阶段'
            icon={<Flask size={16} />}
            iconPosition='start'
          />
          <Tab
            label='中试阶段'
            icon={<Flask size={16} />}
            iconPosition='start'
          />
          <Tab
            label='放大试验'
            icon={<Flask size={16} />}
            iconPosition='start'
          />
        </Tabs>
      </Paper>
    </Box>
  );

  const filters = [
    {
      id: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { label: '全部', value: '' },
        { label: '进行中', value: '进行中' },
        { label: '已完成', value: '已完成' },
        { label: '暂停', value: '暂停' },
        { label: '失败', value: '失败' },
      ],
      value: statusFilter || '',
      onChange: (value: unknown) => {
        setStatusFilter((value as string) || null);
        setPage(0);
      },
    },
  ];

  return (
    <PageContainer
      title='试验管理'
      subtitle='管理研发试验、记录数据、追踪批次'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={experiments}
        loading={loading}
        pagination={{
          page,
          pageSize: rowsPerPage,
          total,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setRowsPerPage(size);
            setPage(0);
          },
        }}
        searchable
        searchPlaceholder='搜索试验名称或编码...'
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
          setPage(0);
        }}
        filters={filters}
        actions={[
          {
            label: '新建试验',
            icon: <Plus size={18} />,
            onClick: () => navigate(RD_PATHS.experimentCreate),
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        headerContent={headerContent}
        getRowId={(row) => row.id}
        onRefresh={() => experimentListQuery.refetch()}
        emptyMessage='暂无试验数据'
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedExperiment(null);
        }}
        onConfirm={handleDeleteConfirm}
        title='确认删除'
        message={`确定要删除试验 "${selectedExperiment?.name}" 吗？此操作不可恢复。`}
        danger
      />
    </PageContainer>
  );
};

export default RsExperimentListPage;
