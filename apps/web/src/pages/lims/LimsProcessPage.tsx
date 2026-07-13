import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Stack,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import {
  ClipboardList,
  ChevronRight,
  FileText,
  Play,
  Clock,
  CheckCircle,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { limsApi, type InspectionProcess, type LimsStatistics, type ListParams } from '@/api/lims';
import { useNotificationStore } from '@/store';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { MetricCard } from '@/components/bi/MetricCard';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import { LIMS_PATHS } from '@/modules/lims/config';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const ct = designTokens.colors;

const STATUS_COLOR_MAP: Record<string, 'success' | 'warning' | 'default'> = {
  active: 'success',
  inactive: 'warning',
  draft: 'default',
};

const STATUS_LABEL_MAP: Record<string, string> = {
  active: '启用',
  inactive: '禁用',
  draft: '草稿',
};

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'active', label: '启用' },
  { value: 'inactive', label: '禁用' },
  { value: 'draft', label: '草稿' },
];

const LimsProcessPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [serviceStatuses, setServiceStatuses] = useState<{
    [key: string]: boolean;
  }>({
    lims: false,
  });

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<InspectionProcess | null>(null);

  const queryClient = useQueryClient();

  const isServiceUp = (serviceName: string): boolean => {
    return serviceStatuses[serviceName] || false;
  };

  const checkServiceStatus = async (serviceName: string, setStatus: (up: boolean) => void) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`/${serviceName}/health`, {
        signal: controller.signal,
        method: 'GET',
      });
      clearTimeout(timeoutId);
      setStatus(response.ok);
    } catch {
      setStatus(false);
    }
  };

  React.useEffect(() => {
    const checkAllServices = () => {
      checkServiceStatus('lims', (up) => setServiceStatuses((prev) => ({ ...prev, lims: up })));
    };

    checkAllServices();
    const intervalId = setInterval(checkAllServices, 10000);

    return () => clearInterval(intervalId);
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const statisticsQuery = useQuery({
    queryKey: ['lims-statistics'],
    queryFn: async () => {
      const response = await limsApi.getStatistics();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    enabled: isServiceUp('lims'),
    staleTime: 5 * 60 * 1000,
  });

  const stats = statisticsQuery.data || {
    total_samples: 0,
    pending_samples: 0,
    testing_samples: 0,
    completed_samples: 0,
    cancelled_samples: 0,
    total_tasks: 0,
    pending_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
    total_processes: 0,
    total_instruments: 0,
    normal_instruments: 0,
    calibration_instruments: 0,
    maintenance_instruments: 0,
    disabled_instruments: 0,
  };

  const processesQuery = useQuery({
    queryKey: ['lims-processes', currentPage, pageSize, debouncedSearch, filterStatus],
    queryFn: async () => {
      const params: ListParams = {
        page: currentPage + 1,
        pagesize: pageSize,
      };
      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (filterStatus) {
        params.status = filterStatus;
      }

      const response = await limsApi.processes.list(params);
      if (response.success && response.data) {
        const data = response.data as any;
        const items = data.items || data.processes || [];
        const total = data.total || items.length;
        return { items, total };
      }
      return { items: [], total: 0 };
    },
    enabled: isServiceUp('lims'),
    staleTime: 5 * 60 * 1000,
  });

  const processes = processesQuery.data?.items || [];
  const totalProcesses = processesQuery.data?.total || 0;
  const loading = processesQuery.isLoading || statisticsQuery.isLoading;
  const error = processesQuery.error ? '加载数据失败' : null;

  const openTaskModal = (process?: InspectionProcess) => {
    setSelectedProcess(process || null);
    setShowTaskModal(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(0);
  };

  const handleFilterChange = (filters: Record<string, unknown>) => {
    if (filters.status !== undefined) {
      setFilterStatus(String(filters.status || ''));
      setCurrentPage(0);
    }
  };

  const getStatusBadge = (status: string) => (
    <Chip
      size='small'
      color={STATUS_COLOR_MAP[status] || 'default'}
      label={STATUS_LABEL_MAP[status] || status}
      variant='outlined'
    />
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: STATUS_OPTIONS,
        value: filterStatus,
        onChange: (value: unknown) => setFilterStatus(value as string),
      },
    ],
    [filterStatus]
  );

  const columns = useMemo<ColumnDef<InspectionProcess>[]>(
    () => [
      {
        id: 'name',
        label: '流程名称',
        width: 200,
        sortable: true,
        render: (row) => (
          <Typography sx={{ fontWeight: 600, color: 'grey.900' }}>{row.name}</Typography>
        ),
      },
      {
        id: 'description',
        label: '描述',
        minWidth: 250,
        render: (row) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
            {row.description || '-'}
          </Typography>
        ),
      },
      {
        id: 'steps',
        label: '步骤数',
        width: 100,
        align: 'center',
        sortable: true,
        render: (row) => (
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'grey.900' }}>
            {row.steps?.length || 0}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'created_at',
        label: '创建时间',
        width: 130,
        sortable: true,
        render: (row) => (
          <Typography sx={{ fontSize: '0.875rem', color: 'grey.600' }}>
            {row.created_at?.substring(0, 10) || '-'}
          </Typography>
        ),
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<InspectionProcess>[]>(
    () => [
      {
        label: '使用此流程',
        icon: <Play sx={{ width: 16, height: 16 }} />,
        color: 'secondary',
        onClick: (row) => openTaskModal(row),
      },
    ],
    []
  );

  const headerContent = useMemo(
    () => (
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 4,
          }}
        >
          <MetricCard
            title='样品总数'
            value={stats.total_samples}
            icon={<ClipboardList size={24} />}
            gradient={[ct.secondary.main, ct.secondary.dark]}
            subtitle={`待测试: ${stats.pending_samples}`}
            trend={stats.pending_samples > 0 ? 'up' : 'neutral'}
          />
          <MetricCard
            title='检验任务'
            value={stats.total_tasks}
            icon={<ClipboardList size={24} />}
            gradient={[ct.secondary[400], ct.secondary[600]]}
            subtitle={`进行中: ${stats.in_progress_tasks}`}
            trend={stats.in_progress_tasks > 0 ? 'up' : 'neutral'}
          />
          <MetricCard
            title='检验流程'
            value={stats.total_processes}
            icon={<FileText size={24} />}
            gradient={[ct.warning.main, ct.warning.dark]}
            trend='neutral'
          />
          <MetricCard
            title='已完成样品'
            value={stats.completed_samples}
            icon={<CheckCircle size={24} />}
            gradient={[ct.success.main, ct.success.dark]}
            trend='up'
          />
        </Box>
      </Box>
    ),
    [stats]
  );

  if (!isServiceUp('lims') && !loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${ct.background.default} 0%, border.default 100%)`,
          p: 2,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 6,
            maxWidth: 480,
            width: '100%',
            textAlign: 'center',
            borderRadius: 3,
          }}
        >
          <Avatar
            sx={{
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 3,
              bgcolor: 'info.light',
            }}
          >
            <ClipboardList
              size={32}
              color={ct.cyan[600]}
            />
          </Avatar>
          <Typography
            variant='h5'
            sx={{ ...{ mb: 2 }, fontWeight: 'bold' }}
          >
            实验室管理服务未启动
          </Typography>
          <Typography
            color='text.secondary'
            sx={{ mb: 3 }}
          >
            LIMS 服务正在启动中，请稍后刷新页面，或者联系管理员启动服务。
          </Typography>
          <Button
            variant='contained'
            color='primary'
            onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
          >
            返回首页
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <PageContainer
      headerProps={{
        pageIcon: <ClipboardList style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal[400]} 0%, ${ct.teal[600]} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        backButton={{
          onClick: () => navigate(DASHBOARD_PATHS.dashboard),
        }}
        columns={columns}
        data={processes}
        loading={loading}
        error={error || undefined}
        getRowId={(row) => row.id}
        sortable
        defaultSortBy='created_at'
        defaultSortOrder='desc'
        searchable
        searchPlaceholder='搜索检验流程名称...'
        searchValue={searchQuery}
        onSearch={setSearchQuery}
        filters={filters}
        filtersValue={{ status: filterStatus }}
        onFilterChange={handleFilterChange}
        pagination={{
          page: currentPage,
          pageSize,
          total: totalProcesses,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }}
        rowActions={rowActions}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['lims-processes'] });
          queryClient.invalidateQueries({ queryKey: ['lims-statistics'] });
        }}
        headerContent={headerContent}
        actions={[
          {
            label: '新建任务',
            icon: <Play sx={{ width: 16, height: 16 }} />,
            onClick: () => openTaskModal(),
            variant: 'contained',
          },
        ]}
        showRowNumber
        columnConfigurable
        persistColumnConfig
        columnConfigStorageKey='lims-processes-columns'
      />

      <Dialog
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 'semibold' }}
          >
            新建检验任务
          </Typography>
          <IconButton
            size='small'
            onClick={() => setShowTaskModal(false)}
          >
            <X size={20} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography
              color='text.secondary'
              variant='body2'
            >
              检验任务创建功能已迁移至检验任务页面，请前往对应页面创建任务。
            </Typography>
            {selectedProcess && (
              <Typography
                color='primary'
                variant='body2'
              >
                当前选择流程: {selectedProcess.name}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowTaskModal(false);
              navigate(LIMS_PATHS.task);
            }}
            variant='contained'
            color='secondary'
          >
            前往任务页面
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default LimsProcessPage;
