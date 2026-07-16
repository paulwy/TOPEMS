import { Grid } from '@/components';
import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { designTokens } from '@/theme/tokens';
import {
  ClipboardList,
  Plus,
  Settings,
  Wrench,
  Edit,
  Trash2,
  CheckCircle2,
  Beaker,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Snackbar,
  Alert,
  LinearProgress,
  Avatar,
  Button,
} from '@mui/material';
import type {
  Instrument,
  CreateInstrumentRequest,
  MaintenanceRecord,
  CreateMaintenanceRecordRequest,
  LimsStatistics,
} from '@/api/lims';
import { limsApi } from '@/api/lims';
import { PageContainer } from '@/components/common';
import { CardListTemplate } from '@/components/templates/CardListTemplate';
import { logger } from '@/utils/logger';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import InstrumentFormModal from './components/InstrumentFormModal';
import InstrumentDetailModal from './components/InstrumentDetailModal';
import MaintenanceFormModal from './components/MaintenanceFormModal';

const ct = designTokens.colors;

interface LimsListResponse<T> {
  items?: T[];
  instruments?: T[];
}

const defaultStats: LimsStatistics = {
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

const LimsInstrumentPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serviceStatuses, setServiceStatuses] = useState<{
    [key: string]: boolean;
  }>({
    lims: false,
  });

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

  useEffect(() => {
    const checkAllServices = () => {
      checkServiceStatus('lims', (up) => setServiceStatuses((prev) => ({ ...prev, lims: up })));
    };

    checkAllServices();
    const intervalId = setInterval(checkAllServices, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const [showInstrumentModal, setShowInstrumentModal] = useState(false);
  const [showInstrumentDetailModal, setShowInstrumentDetailModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [instrumentFormData, setInstrumentFormData] = useState<CreateInstrumentRequest>({
    name: '',
    code: '',
    type: '',
    manufacturer: '',
    model: '',
    serial_number: '',
    location: '',
    status: '正常',
    purchase_date: '',
    calibration_date: '',
    next_calibration_date: '',
    responsible_person: '',
    description: '',
  });
  const [maintenanceFormData, setMaintenanceFormData] = useState<CreateMaintenanceRecordRequest>({
    instrument_id: '',
    maintenance_type: '',
    description: '',
    performed_by: '',
    performed_at: new Date().toISOString().split('T')[0],
    next_maintenance_date: '',
    cost: 0,
    notes: '',
  });
  const [isEditingInstrument, setIsEditingInstrument] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, unknown>>({});
  const [statusFilter, setStatusFilter] = useState('');

  const { data: instrumentsData, isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.LIMS.INSTRUMENTS,
    queryFn: async () => {
      const response = await limsApi.listInstruments();
      if (response.success && response.data) {
        const instrumentData = response.data as LimsListResponse<Instrument> | Instrument[];
        if (Array.isArray(instrumentData)) return instrumentData;
        if (instrumentData.items && Array.isArray(instrumentData.items))
          return instrumentData.items;
        if (instrumentData.instruments && Array.isArray(instrumentData.instruments))
          return instrumentData.instruments;
      }
      return [];
    },
    enabled: serviceStatuses.lims,
  });

  const { data: statsData } = useQuery({
    queryKey: QUERY_KEYS.LIMS.STATISTICS,
    queryFn: async () => {
      const response = await limsApi.getStatistics();
      if (response.success && response.data) {
        return response.data;
      }
      return defaultStats;
    },
    enabled: serviceStatuses.lims,
  });

  const { data: maintenanceRecordsData } = useQuery({
    queryKey: QUERY_KEYS.LIMS.MAINTENANCE_BY_INSTRUMENT(selectedInstrument?.id || ''),
    queryFn: async () => {
      if (!selectedInstrument) return [];
      const response = await limsApi.listMaintenanceByInstrument(selectedInstrument.id);
      if (response.success && response.data) {
        const data = response.data as LimsListResponse<MaintenanceRecord> | MaintenanceRecord[];
        return Array.isArray(data) ? data : data.items || [];
      }
      return [];
    },
    enabled: !!selectedInstrument && showInstrumentDetailModal,
  });

  const instruments = instrumentsData || [];
  const stats = statsData || defaultStats;
  const instrumentMaintenanceRecords = maintenanceRecordsData || [];

  const invalidateInstruments = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.INSTRUMENTS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.STATISTICS });
  };

  const createInstrumentMutation = useMutation({
    mutationFn: async (data: CreateInstrumentRequest) => {
      const response = await limsApi.createInstrument(data);
      if (!response.success) {
        throw new Error(response.message || '创建失败，请稍后重试');
      }
      return response;
    },
    onSuccess: () => {
      invalidateInstruments();
      setShowInstrumentModal(false);
    },
    onError: (error: unknown) => {
      logger.error('创建仪器失败:', error);
    },
  });

  const updateInstrumentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateInstrumentRequest }) => {
      const response = await limsApi.updateInstrument(id, data);
      if (!response.success) {
        throw new Error(response.message || '更新失败，请稍后重试');
      }
      return response;
    },
    onSuccess: () => {
      invalidateInstruments();
      setShowInstrumentModal(false);
    },
    onError: (error: unknown) => {
      logger.error('更新仪器失败:', error);
    },
  });

  const deleteInstrumentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await limsApi.deleteInstrument(id);
      if (!response.success) {
        throw new Error(response.message || '删除失败，请稍后重试');
      }
      return response;
    },
    onSuccess: () => {
      invalidateInstruments();
    },
    onError: (error: unknown) => {
      logger.error('删除仪器失败:', error);
    },
  });

  const createMaintenanceMutation = useMutation({
    mutationFn: async (data: CreateMaintenanceRecordRequest) => {
      const response = await limsApi.createMaintenance(data);
      if (!response.success) {
        throw new Error(response.message || '创建失败，请稍后重试');
      }
      return response;
    },
    onSuccess: () => {
      if (selectedInstrument) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.LIMS.MAINTENANCE_BY_INSTRUMENT(selectedInstrument.id),
        });
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.MAINTENANCE });
      setShowMaintenanceModal(false);
    },
    onError: (error: unknown) => {
      logger.error('创建维护记录失败:', error);
    },
  });

  const creating =
    createInstrumentMutation.isPending ||
    updateInstrumentMutation.isPending ||
    deleteInstrumentMutation.isPending ||
    createMaintenanceMutation.isPending;

  const getInstrumentTypeIcon = (type: string) => {
    const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
      分析仪器: Beaker,
      测量仪器: Settings,
      实验设备: Wrench,
      default: Settings,
    };
    return iconMap[type] || iconMap['default'];
  };

  const getInstrumentStatusColor = (
    status: string
  ): {
    bgcolor: string;
    color: string;
  } => {
    const colorMap: Record<string, { bgcolor: string; color: string }> = {
      正常: { bgcolor: 'success.lighter', color: 'success.700' },
      校准中: { bgcolor: 'warning.light', color: 'warning.700' },
      维修中: { bgcolor: 'error.lighter', color: 'error.darker' },
      停用: { bgcolor: 'grey.100', color: 'grey.600' },
      报废: { bgcolor: 'grey.100', color: 'grey.600' },
      normal: { bgcolor: 'success.lighter', color: 'success.700' },
      calibration: { bgcolor: 'warning.light', color: 'warning.700' },
      maintenance: { bgcolor: 'error.lighter', color: 'error.darker' },
      disabled: { bgcolor: 'grey.100', color: 'grey.600' },
    };
    return colorMap[status] || colorMap['normal'];
  };

  const handleCloseNotification = () => {
    setNotification(null);
  };

  const openInstrumentModal = (instrument?: Instrument) => {
    if (instrument) {
      setIsEditingInstrument(true);
      setSelectedInstrument(instrument);
      setInstrumentFormData({
        name: instrument.name || '',
        code: instrument.code || '',
        type: instrument.type || '',
        manufacturer: instrument.manufacturer || '',
        model: instrument.model || '',
        serial_number: instrument.serial_number || '',
        location: instrument.location || '',
        status: instrument.status || '正常',
        purchase_date: instrument.purchase_date || '',
        calibration_date: instrument.calibration_date || '',
        next_calibration_date: instrument.next_calibration_date || '',
        responsible_person: instrument.responsible_person || '',
        description: instrument.description || '',
      });
    } else {
      setIsEditingInstrument(false);
      setInstrumentFormData({
        name: '',
        code: '',
        type: '',
        manufacturer: '',
        model: '',
        serial_number: '',
        location: '',
        status: '正常',
        purchase_date: '',
        calibration_date: '',
        next_calibration_date: '',
        responsible_person: '',
        description: '',
      });
    }
    setShowInstrumentModal(true);
  };

  const openInstrumentDetailModal = (instrument: Instrument) => {
    setSelectedInstrument(instrument);
    setShowInstrumentDetailModal(true);
  };

  const openMaintenanceModal = (instrument: Instrument) => {
    setSelectedInstrument(instrument);
    setMaintenanceFormData({
      instrument_id: instrument.id,
      maintenance_type: '',
      description: '',
      performed_by: '',
      performed_at: new Date().toISOString().split('T')[0],
      next_maintenance_date: '',
      cost: 0,
      notes: '',
    });
    setShowMaintenanceModal(true);
  };

  const handleCreateInstrument = async () => {
    await createInstrumentMutation.mutateAsync(instrumentFormData);
  };

  const handleUpdateInstrument = async () => {
    if (!selectedInstrument) return;
    await updateInstrumentMutation.mutateAsync({
      id: selectedInstrument.id,
      data: instrumentFormData,
    });
  };

  const handleDeleteInstrument = async (id: string) => {
    if (!confirm('确定要删除这个仪器吗？')) return;
    await deleteInstrumentMutation.mutateAsync(id);
  };

  const handleCreateMaintenance = async () => {
    await createMaintenanceMutation.mutateAsync(maintenanceFormData);
  };

  const filteredInstruments = useMemo(() => {
    const list = Array.isArray(instruments) ? instruments : [];
    return list.filter((instrument) => {
      if (searchValue) {
        const searchLower = searchValue.toLowerCase();
        const matchSearch =
          instrument.name?.toLowerCase().includes(searchLower) ||
          instrument.code?.toLowerCase().includes(searchLower) ||
          instrument.manufacturer?.toLowerCase().includes(searchLower) ||
          instrument.model?.toLowerCase().includes(searchLower);
        if (!matchSearch) return false;
      }
      if (statusFilter && instrument.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [instruments, searchValue, statusFilter]);

  const metricStats = useMemo(
    () => [
      {
        id: 'total-samples',
        title: '样品总数',
        value: stats.total_samples,
        icon: <ClipboardList size={24} />,
        gradient: [ct.secondary.main, ct.secondary.dark] as [string, string],
        subtitle: `待测试: ${stats.pending_samples}`,
      },
      {
        id: 'total-tasks',
        title: '检验任务',
        value: stats.total_tasks,
        icon: <ClipboardList size={24} />,
        gradient: [ct.secondary[400], ct.secondary[600]] as [string, string],
        subtitle: `进行中: ${stats.in_progress_tasks}`,
      },
      {
        id: 'total-processes',
        title: '检验流程',
        value: stats.total_processes,
        icon: <ClipboardList size={24} />,
        gradient: [ct.warning.main, ct.warning.dark] as [string, string],
      },
      {
        id: 'total-instruments',
        title: '仪器设备',
        value: stats.total_instruments,
        icon: <Settings size={24} />,
        gradient: [ct.teal[400], ct.teal[600]] as [string, string],
        subtitle: `正常: ${stats.normal_instruments}`,
      },
      {
        id: 'completed-samples',
        title: '已完成样品',
        value: stats.completed_samples,
        icon: <CheckCircle2 size={24} />,
        gradient: [ct.success.main, ct.success.dark] as [string, string],
      },
      {
        id: 'testing-samples',
        title: '测试中样品',
        value: stats.testing_samples,
        icon: <ClipboardList size={24} />,
        gradient: [ct.pink[500], ct.pink[600]] as [string, string],
      },
    ],
    [stats]
  );

  const cardConfig = useMemo(
    () => ({
      title: 'name' as const,
      description: (item: unknown) => {
        const instrument = item as Instrument;
        if (instrument.manufacturer && instrument.model) {
          return `${instrument.manufacturer} - ${instrument.model}`;
        }
        return instrument.manufacturer || instrument.model || '暂无型号信息';
      },
      status: {
        field: 'status',
        options: {
          正常: { label: '正常', color: 'success.700' },
          校准中: { label: '校准中', color: 'warning.700' },
          维修中: { label: '维修中', color: 'error.darker' },
          停用: { label: '停用', color: 'grey.600' },
          报废: { label: '报废', color: 'grey.600' },
        },
      },
      icon: (item: unknown) => {
        const instrument = item as Instrument;
        const TypeIcon = getInstrumentTypeIcon(instrument.type);
        return <TypeIcon size={24} />;
      },
      iconBgColor: ct.teal[100],
      meta: [
        { field: 'code' as const, label: '编号' },
        { field: 'location' as const, label: '位置' },
        { field: 'responsible_person' as const, label: '负责人' },
      ],
      tags: [{ field: 'type' as const }],
    }),
    []
  );

  const cardActions = useMemo(
    () => [
      {
        label: '查看详情',
        onClick: (item: unknown) => openInstrumentDetailModal(item as Instrument),
        color: 'primary' as const,
      },
      {
        label: '维护记录',
        icon: <Wrench size={16} />,
        onClick: (item: unknown) => openMaintenanceModal(item as Instrument),
        color: 'info' as const,
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (item: unknown) => openInstrumentModal(item as Instrument),
        color: 'primary' as const,
        variant: 'outlined' as const,
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        onClick: (item: unknown) => handleDeleteInstrument((item as Instrument).id),
        color: 'error' as const,
      },
    ],
    [openInstrumentDetailModal, openMaintenanceModal, openInstrumentModal, handleDeleteInstrument]
  );

  const filters = useMemo(
    () => [
      {
        id: 'status',
        label: '仪器状态',
        type: 'select' as const,
        options: [
          { label: '全部状态', value: '' },
          { label: '正常', value: '正常' },
          { label: '校准中', value: '校准中' },
          { label: '维修中', value: '维修中' },
          { label: '停用', value: '停用' },
          { label: '报废', value: '报废' },
        ],
      },
    ],
    []
  );

  const handleSearch = () => {
  };

  const handleFilterChange = (newFilters: Record<string, unknown>) => {
    setFilterValues(newFilters);
    if (newFilters.status !== undefined) {
      setStatusFilter(String(newFilters.status || ''));
    }
  };

  const handleFilterReset = () => {
    setFilterValues({});
    setStatusFilter('');
    setSearchValue('');
  };

  const handleCloseInstrumentModal = () => {
    setShowInstrumentModal(false);
    setIsEditingInstrument(false);
  };

  const handleInstrumentFormSubmit = () => {
    if (isEditingInstrument) {
      handleUpdateInstrument();
    } else {
      handleCreateInstrument();
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(135deg, ${ct.background.default} 0%, border.default 100%)`,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <LinearProgress
            sx={{ width: 240, mb: 3, borderRadius: 1 }}
            color='secondary'
          />
          <Typography color='text.secondary'>加载中...</Typography>
        </Box>
      </Box>
    );
  }

  if (!serviceStatuses.lims) {
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
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${ct.background.default} 0%, border.default 100%)`,
      }}
      padding={false}
      title='仪器管理'
      subtitle='Instrument Management'
      headerProps={{
        pageIcon: <Settings style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal[400]}, ${ct.teal[600]})`,
        breadcrumbs: [
          { label: '首页', href: DASHBOARD_PATHS.dashboard },
          { label: 'LIMS' },
          { label: '仪器管理' },
        ],
        backButton: { onClick: () => navigate(DASHBOARD_PATHS.dashboard) },
        loading,
      }}
    >
      <Snackbar
        open={Boolean(notification)}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification?.type || 'success'}
          variant='filled'
          sx={{ borderRadius: 3 }}
        >
          {notification?.message}
        </Alert>
      </Snackbar>

      <Container
        maxWidth='xl'
        sx={{ px: { xs: 2, sm: 3 }, py: 3 }}
      >
        <CardListTemplate
          title=''
          data={filteredInstruments as unknown as Record<string, unknown>[]}
          cardConfig={cardConfig}
          metricStats={metricStats}
          metricColumns={6}
          loading={loading}
          emptyState={{
            emoji: '🔬',
            title: '暂无仪器设备',
            description: '点击上方按钮添加仪器设备',
          }}
          search={{
            value: searchValue,
            onChange: setSearchValue,
            placeholder: '搜索仪器名称、编号、制造商...',
          }}
          filters={filters}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          onFilterReset={handleFilterReset}
          onSearch={handleSearch}
          addButton={{
            text: '添加仪器',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: () => openInstrumentModal(),
          }}
          onRefresh={() => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.INSTRUMENTS });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.STATISTICS });
          }}
          cardActions={cardActions}
          onCardClick={(item) => openInstrumentDetailModal(item as Instrument)}
          showStatsOverview={true}
          gridColumns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
        />
      </Container>

      <InstrumentFormModal
        open={showInstrumentModal}
        onClose={handleCloseInstrumentModal}
        isEditing={isEditingInstrument}
        formData={instrumentFormData}
        setFormData={setInstrumentFormData}
        onSubmit={handleInstrumentFormSubmit}
        creating={creating}
        ct={ct}
      />

      <InstrumentDetailModal
        open={showInstrumentDetailModal}
        onClose={() => setShowInstrumentDetailModal(false)}
        instrument={selectedInstrument}
        maintenanceRecords={instrumentMaintenanceRecords}
        getStatusColor={getInstrumentStatusColor}
        onEdit={openInstrumentModal}
        onAddMaintenance={openMaintenanceModal}
        ct={ct}
      />

      <MaintenanceFormModal
        open={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        instrument={selectedInstrument}
        formData={maintenanceFormData}
        setFormData={setMaintenanceFormData}
        onSubmit={handleCreateMaintenance}
        creating={creating}
        ct={ct}
      />
    </PageContainer>
  );
};

export default LimsInstrumentPage;
