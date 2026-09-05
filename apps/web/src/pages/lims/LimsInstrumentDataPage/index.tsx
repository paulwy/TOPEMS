import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
import { Database, Play, Settings, Eye, RefreshCw, Edit, Trash2 } from 'lucide-react';
import { Paper, Tabs, Tab, Snackbar, Alert, Chip, Box, Typography } from '@mui/material';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import type { FilterConfig } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';
import { logger } from '@/utils/logger';
import { formatDateTime } from '@/utils/date';
import type {
  InstrumentData,
  CollectionTask,
  ParseRule,
  CreateInstrumentDataRequest,
  CreateCollectionTaskRequest,
  CreateParseRuleRequest,
  UpdateInstrumentDataRequest,
  UpdateCollectionTaskRequest,
  UpdateParseRuleRequest,
  InstrumentDataStatistics,
  ParseResult,
  ParseDataRequest,
} from '@/api/lims';
import i18n from '@/i18n';
import { instrumentDataApi, collectionTaskApi, parseRuleApi } from '@/api/lims';
import { designTokens } from '@/theme/tokens';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import StatisticsCards from './components/StatisticsCards';
import Toolbar from './components/Toolbar';
import DataDetailDialog from './components/DataDetailDialog';
import DataFormDialog from './components/DataFormDialog';
import TaskFormDialog from './components/TaskFormDialog';
import RuleFormDialog from './components/RuleFormDialog';
import ParseTestDialog from './components/ParseTestDialog';
import { getStatusColor, getStatusLabel, type ChipColor } from './utils';

const ct = designTokens.colors;

const LimsInstrumentDataPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });
  const [dataPage, setDataPage] = useState(0);
  const [dataRowsPerPage, setDataRowsPerPage] = useState(10);
  const [taskPage, setTaskPage] = useState(0);
  const [taskRowsPerPage, setTaskRowsPerPage] = useState(10);
  const [rulePage, setRulePage] = useState(0);
  const [ruleRowsPerPage, setRuleRowsPerPage] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showDataDetail, setShowDataDetail] = useState(false);
  const [selectedData, setSelectedData] = useState<InstrumentData | null>(null);
  const [showDataForm, setShowDataForm] = useState(false);
  const [isEditingData, setIsEditingData] = useState(false);
  const [dataFormData, setDataFormData] = useState<CreateInstrumentDataRequest>({
    instrument_id: '',
    protocol: 'JSON',
    raw_data: {},
    batch_no: '',
  });
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [taskFormData, setTaskFormData] = useState<CreateCollectionTaskRequest>({
    task_name: '',
    instrument_id: '',
    protocol: 'JSON',
    collection_mode: 'manual',
    cron_expression: '',
    interval_minutes: 30,
    parse_rule_id: '',
  });
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [isEditingRule, setIsEditingRule] = useState(false);
  const [ruleFormData, setRuleFormData] = useState<CreateParseRuleRequest>({
    rule_name: '',
    protocol: 'JSON',
    instrument_type: '',
    parse_config: {},
    quality_rules: {},
    description: '',
  });
  const [showParseTest, setShowParseTest] = useState(false);
  const [parseTestData, setParseTestData] = useState<ParseDataRequest>({
    protocol: 'JSON',
    raw_data: {},
  });
  const [parseTestResult, setParseTestResult] = useState<ParseResult | null>(null);
  const {
    confirmOpen: confirmDialogOpen,
    confirmConfig: confirmDialogConfig,
    openConfirm: openConfirmDialog,
    closeConfirm: setConfirmDialogClosed,
  } = useConfirmDialog();

  const showNotification = (
    message: string,
    severity: 'success' | 'error' | 'info' | 'warning'
  ) => {
    setNotification({ open: true, message, severity });
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.LIMS.INSTRUMENT_DATA,
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.LIMS.COLLECTION_TASKS,
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.LIMS.PARSE_RULES,
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.LIMS.STATISTICS,
      exact: false,
      refetchType: 'active',
    });
  };

  const { data: statisticsData } = useQuery({
    queryKey: QUERY_KEYS.LIMS.STATISTICS,
    queryFn: async () => {
      const response = await instrumentDataApi.getStatistics();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const statistics: InstrumentDataStatistics = statisticsData || {
    total_data_count: 0,
    today_count: 0,
    success_count: 0,
    failed_count: 0,
    pending_count: 0,
    total_tasks: 0,
    running_tasks: 0,
    total_rules: 0,
  };

  const instrumentDataQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.LIMS.INSTRUMENT_DATA,
      dataPage,
      dataRowsPerPage,
      searchKeyword,
      statusFilter,
    ],
    queryFn: async () => {
      const response = await instrumentDataApi.listInstrumentData({
        page: dataPage + 1,
        pagesize: dataRowsPerPage,
        search: searchKeyword,
        status: statusFilter,
      });
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    enabled: activeTab === 0,
    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const collectionTasksQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.LIMS.COLLECTION_TASKS,
      taskPage,
      taskRowsPerPage,
      searchKeyword,
      statusFilter,
    ],
    queryFn: async () => {
      const response = await collectionTaskApi.listCollectionTasks({
        page: taskPage + 1,
        pagesize: taskRowsPerPage,
        search: searchKeyword,
        status: statusFilter,
      });
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    enabled: activeTab === 1,
    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const parseRulesQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.LIMS.PARSE_RULES,
      rulePage,
      ruleRowsPerPage,
      searchKeyword,
      statusFilter,
    ],
    queryFn: async () => {
      const response = await parseRuleApi.listParseRules({
        page: rulePage + 1,
        pagesize: ruleRowsPerPage,
        search: searchKeyword,
        status: statusFilter,
      });
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
    enabled: activeTab === 2,
    staleTime: CACHE_DURATIONS.MEDIUM,
  });

  const instrumentDataList: InstrumentData[] = instrumentDataQuery.data || [];
  const collectionTasks: CollectionTask[] = collectionTasksQuery.data || [];
  const parseRules: ParseRule[] = parseRulesQuery.data || [];

  const parseDataMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await instrumentDataApi.parseInstrumentData(id);
      if (!response.success) {
        throw new Error(i18n.t('lims.index.k0'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LIMS.TEST_METHODS,
        exact: false,
        refetchType: 'active',
      });
      invalidateAll();
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('lims.index.k1'), error);
    },
  });

  const createDataMutation = useMutation({
    mutationFn: async (data: CreateInstrumentDataRequest) => {
      const response = await instrumentDataApi.createInstrumentData(data);
      if (!response.success) {
        throw new Error(i18n.t('lims.index.k2'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LIMS.TEST_METHODS,
        exact: false,
        refetchType: 'active',
      });
      invalidateAll();
      setShowDataForm(false);
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('lims.index.k3'), error);
    },
  });

  const updateDataMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInstrumentDataRequest }) => {
      const response = await instrumentDataApi.updateInstrumentData(id, data);
      if (!response.success) {
        throw new Error(i18n.t('lims.index.k4'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LIMS.TEST_METHODS,
        exact: false,
        refetchType: 'active',
      });
      invalidateAll();
      setShowDataForm(false);
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('lims.index.k5'), error);
    },
  });

  const deleteDataMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await instrumentDataApi.deleteInstrumentData(id);
      if (!response.success) {
        throw new Error(i18n.t('lims.index.k6'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LIMS.TEST_METHODS,
        exact: false,
        refetchType: 'active',
      });
      invalidateAll();
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('lims.index.k7'), error);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: CreateCollectionTaskRequest) => {
      const response = await collectionTaskApi.createCollectionTask(data);
      if (!response.success) {
        throw new Error(i18n.t('lims.index.k8'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LIMS.TEST_METHODS,
        exact: false,
        refetchType: 'active',
      });
      invalidateAll();
      setShowTaskForm(false);
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('lims.index.k9'), error);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCollectionTaskRequest }) => {
      const response = await collectionTaskApi.updateCollectionTask(id, data);
      if (!response.success) {
        throw new Error(i18n.t('lims.index.k10'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LIMS.TEST_METHODS,
        exact: false,
        refetchType: 'active',
      });
      invalidateAll();
      setShowTaskForm(false);
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('lims.index.k11'), error);
    },
  });

  const triggerTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await collectionTaskApi.triggerCollection(id);
      if (!response.success) {
        throw new Error(i18n.t('lims.index.k12'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LIMS.TEST_METHODS,
        exact: false,
        refetchType: 'active',
      });
      invalidateAll();
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('lims.index.k13'), error);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await collectionTaskApi.deleteCollectionTask(id);
      if (!response.success) {
        throw new Error(i18n.t('lims.index.k14'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LIMS.TEST_METHODS,
        exact: false,
        refetchType: 'active',
      });
      invalidateAll();
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('lims.index.k15'), error);
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: CreateParseRuleRequest) => {
      const response = await parseRuleApi.createParseRule(data);
      if (!response.success) {
        throw new Error(i18n.t('lims.index.k16'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LIMS.TEST_METHODS,
        exact: false,
        refetchType: 'active',
      });
      invalidateAll();
      setShowRuleForm(false);
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('lims.index.k17'), error);
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateParseRuleRequest }) => {
      const response = await parseRuleApi.updateParseRule(id, data);
      if (!response.success) {
        throw new Error(i18n.t('lims.index.k18'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LIMS.TEST_METHODS,
        exact: false,
        refetchType: 'active',
      });
      invalidateAll();
      setShowRuleForm(false);
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('lims.index.k19'), error);
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await parseRuleApi.deleteParseRule(id);
      if (!response.success) {
        throw new Error(i18n.t('lims.index.k20'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LIMS.TEST_METHODS,
        exact: false,
        refetchType: 'active',
      });
      invalidateAll();
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('lims.index.k21'), error);
    },
  });

  const testParseMutation = useMutation({
    mutationFn: async (data: ParseDataRequest) => {
      const response = await instrumentDataApi.testParseData(data);
      if (!response.success) {
        throw new Error(i18n.t('lims.index.k22'));
      }
      return response;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.LIMS.TEST_METHODS,
        exact: false,
        refetchType: 'active',
      });
      if (response.data) {
        setParseTestResult(response.data);
      }
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('lims.index.k23'), error);
    },
  });

  const submitting =
    parseDataMutation.isPending ||
    createDataMutation.isPending ||
    updateDataMutation.isPending ||
    deleteDataMutation.isPending ||
    createTaskMutation.isPending ||
    updateTaskMutation.isPending ||
    triggerTaskMutation.isPending ||
    deleteTaskMutation.isPending ||
    createRuleMutation.isPending ||
    updateRuleMutation.isPending ||
    deleteRuleMutation.isPending ||
    testParseMutation.isPending;

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setSearchKeyword('');
    setStatusFilter('');
    setDataPage(0);
    setTaskPage(0);
    setRulePage(0);
  };

  const handleViewDataDetail = useCallback((data: InstrumentData) => {
    setSelectedData(data);
    setShowDataDetail(true);
  }, []);

  const handleParseData = useCallback(
    async (id: string) => {
      await parseDataMutation.mutateAsync(id);
    },
    [parseDataMutation]
  );

  const handleCreateData = () => {
    setIsEditingData(false);
    setDataFormData({
      instrument_id: '',
      protocol: 'JSON',
      raw_data: {},
      batch_no: '',
    });
    setShowDataForm(true);
  };

  const handleEditData = useCallback((data: InstrumentData) => {
    setIsEditingData(true);
    setSelectedData(data);
    setDataFormData({
      instrument_id: data.instrument_id || '',
      protocol: data.protocol,
      raw_data: data.raw_data || {},
      batch_no: data.batch_no,
    });
    setShowDataForm(true);
  }, []);

  const handleSaveData = async () => {
    if (isEditingData && selectedData) {
      const updateData: UpdateInstrumentDataRequest = {};
      await updateDataMutation.mutateAsync({ id: selectedData.id, data: updateData });
    } else {
      await createDataMutation.mutateAsync(dataFormData);
    }
  };

  const handleDeleteData = useCallback(
    (id: string) => {
      openConfirmDialog({
        title: i18n.t('lims.index.k24'),
        message: i18n.t('lims.index.k25'),
        danger: true,
        onConfirm: () => {
          deleteDataMutation.mutate(id);
        },
      });
    },
    [openConfirmDialog, deleteDataMutation]
  );

  const handleCreateTask = () => {
    setIsEditingTask(false);
    setTaskFormData({
      task_name: '',
      instrument_id: '',
      protocol: 'JSON',
      collection_mode: 'manual',
      cron_expression: '',
      interval_minutes: 30,
      parse_rule_id: '',
    });
    setShowTaskForm(true);
  };

  const handleEditTask = useCallback((task: CollectionTask) => {
    setIsEditingTask(true);
    setSelectedData(task as unknown as InstrumentData);
    setTaskFormData({
      task_name: task.task_name,
      instrument_id: task.instrument_id,
      protocol: task.protocol,
      collection_mode: task.collection_mode,
      cron_expression: task.cron_expression,
      interval_minutes: task.interval_minutes,
      parse_rule_id: task.parse_rule_id,
    });
    setShowTaskForm(true);
  }, []);

  const handleSaveTask = async () => {
    if (isEditingTask) {
      const updateData: UpdateCollectionTaskRequest = {
        task_name: taskFormData.task_name,
        cron_expression: taskFormData.cron_expression,
        interval_minutes: taskFormData.interval_minutes,
        parse_rule_id: taskFormData.parse_rule_id,
      };
      const targetId = selectedData?.id || collectionTasks[0]?.id || '';
      if (!targetId) return;
      await updateTaskMutation.mutateAsync({ id: targetId, data: updateData });
    } else {
      await createTaskMutation.mutateAsync(taskFormData);
    }
  };

  const handleTriggerTask = useCallback(
    async (id: string) => {
      await triggerTaskMutation.mutateAsync(id);
    },
    [triggerTaskMutation]
  );

  const handleDeleteTask = useCallback(
    (id: string) => {
      openConfirmDialog({
        title: i18n.t('lims.index.k26'),
        message: i18n.t('lims.index.k27'),
        danger: true,
        onConfirm: () => {
          deleteTaskMutation.mutate(id);
        },
      });
    },
    [openConfirmDialog, deleteTaskMutation]
  );

  const handleCreateRule = () => {
    setIsEditingRule(false);
    setRuleFormData({
      rule_name: '',
      protocol: 'JSON',
      instrument_type: '',
      parse_config: {},
      quality_rules: {},
      description: '',
    });
    setShowRuleForm(true);
  };

  const handleEditRule = useCallback((rule: ParseRule) => {
    setIsEditingRule(true);
    setSelectedData(rule as unknown as InstrumentData);
    setRuleFormData({
      rule_name: rule.rule_name,
      protocol: rule.protocol,
      instrument_type: rule.instrument_type,
      parse_config: rule.parse_config,
      quality_rules: rule.quality_rules,
      description: rule.description,
    });
    setShowRuleForm(true);
  }, []);

  const handleSaveRule = async () => {
    if (isEditingRule) {
      const updateData: UpdateParseRuleRequest = {
        rule_name: ruleFormData.rule_name,
        parse_config: ruleFormData.parse_config,
        quality_rules: ruleFormData.quality_rules,
        description: ruleFormData.description,
      };
      const targetId = selectedData?.id || parseRules[0]?.id || '';
      if (!targetId) return;
      await updateRuleMutation.mutateAsync({ id: targetId, data: updateData });
    } else {
      await createRuleMutation.mutateAsync(ruleFormData);
    }
  };

  const handleDeleteRule = useCallback(
    (id: string) => {
      openConfirmDialog({
        title: i18n.t('lims.index.k28'),
        message: i18n.t('lims.index.k29'),
        danger: true,
        onConfirm: () => {
          deleteRuleMutation.mutate(id);
        },
      });
    },
    [openConfirmDialog, deleteRuleMutation]
  );

  const handleTestParse = async () => {
    await testParseMutation.mutateAsync(parseTestData);
  };

  const statusFilterConfig: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: i18n.t('pages.toolbar.k1'),
        type: 'select',
        value: statusFilter,
        options: [
          { label: i18n.t('pages.toolbar.k2'), value: '' },
          { label: getStatusLabel('pending'), value: 'pending' },
          { label: getStatusLabel('success'), value: 'success' },
          { label: getStatusLabel('failed'), value: 'failed' },
          { label: getStatusLabel('running'), value: 'running' },
          { label: getStatusLabel('stopped'), value: 'stopped' },
          { label: getStatusLabel('active'), value: 'active' },
          { label: getStatusLabel('inactive'), value: 'inactive' },
        ],
      },
    ],
    [statusFilter]
  );

  const handleFilterChange = useCallback((filters: Record<string, unknown>) => {
    setStatusFilter(String(filters.status || ''));
  }, []);

  const instrumentDataColumns: ColumnDef<InstrumentData>[] = useMemo(
    () => [
      {
        id: 'data_no',
        label: i18n.t('lims.instrument_data_table.k0'),
      },
      {
        id: 'instrument_id',
        label: i18n.t('lims.instrument_data_table.k1'),
        render: (row) => (
          <Typography
            noWrap
            title={row.instrument_id || row.instrument_name}
          >
            {row.instrument_name || row.instrument_id || '-'}
          </Typography>
        ),
      },
      {
        id: 'batch_no',
        label: i18n.t('lims.instrument_data_table.k2'),
      },
      {
        id: 'protocol',
        label: i18n.t('lims.instrument_data_table.k3'),
        render: (row) => (
          <Chip
            label={row.protocol}
            size='small'
            variant='outlined'
          />
        ),
      },
      {
        id: 'status',
        label: i18n.t('lims.instrument_data_table.k4'),
        render: (row) => (
          <Chip
            label={getStatusLabel(row.status)}
            size='small'
            color={getStatusColor(row.status) as ChipColor}
          />
        ),
      },
      {
        id: 'created_at',
        label: i18n.t('lims.parse_rule_table.k6'),
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography>{row.created_at ? formatDateTime(row.created_at) : '-'}</Typography>
          </Box>
        ),
      },
    ],
    []
  );

  const instrumentDataRowActions: RowAction<InstrumentData>[] = useMemo(
    () => [
      {
        key: 'view',
        label: i18n.t('lims.instrument_data_table.k9'),
        icon: <Eye size={16} />,
        onClick: (row) => handleViewDataDetail(row),
        color: 'info',
      },
      {
        key: 'parse',
        label: i18n.t('lims.instrument_data_table.k10'),
        icon: <RefreshCw size={16} />,
        onClick: (row) => handleParseData(row.id),
        color: 'primary',
        show: (row) => row.status === 'pending' || row.status === 'failed',
      },
      {
        key: 'edit',
        label: i18n.t('lims.parse_rule_table.k8'),
        icon: <Edit size={16} />,
        onClick: (row) => handleEditData(row),
        color: 'warning',
      },
      {
        key: 'delete',
        label: i18n.t('lims.instrument_data_table.k13'),
        icon: <Trash2 size={16} />,
        onClick: (row) => handleDeleteData(row.id),
        color: 'error',
      },
    ],
    [handleViewDataDetail, handleParseData, handleEditData, handleDeleteData]
  );

  const collectionTaskColumns: ColumnDef<CollectionTask>[] = useMemo(
    () => [
      {
        id: 'task_name',
        label: i18n.t('lims.collection_task_table.k1'),
      },
      {
        id: 'instrument_id',
        label: i18n.t('lims.collection_task_table.k2'),
        render: (row) => (
          <Typography
            noWrap
            title={row.instrument_id || row.instrument_name}
          >
            {row.instrument_name || row.instrument_id || '-'}
          </Typography>
        ),
      },
      {
        id: 'protocol',
        label: i18n.t('lims.collection_task_table.k3'),
        render: (row) => (
          <Chip
            label={row.protocol}
            size='small'
            variant='outlined'
          />
        ),
      },
      {
        id: 'collection_mode',
        label: i18n.t('lims.collection_task_table.k4'),
        render: (row) => getStatusLabel(row.collection_mode),
      },
      {
        id: 'status',
        label: i18n.t('lims.collection_task_table.k5'),
        render: (row) => (
          <Chip
            label={getStatusLabel(row.status)}
            size='small'
            color={getStatusColor(row.status) as ChipColor}
          />
        ),
      },
      {
        id: 'schedule',
        label: i18n.t('lims.task_form_dialog.k8'),
        render: (row) => (
          <Typography noWrap>
            {row.cron_expression ||
              (row.interval_minutes
                ? `${row.interval_minutes}${i18n.t('lims.task_form_dialog.k10')?.replace(/\D/g, '') || ''}`
                : '-')}
          </Typography>
        ),
      },
      {
        id: 'created_at',
        label: i18n.t('lims.parse_rule_table.k6'),
        render: (row) => (row.created_at ? formatDateTime(row.created_at) : '-'),
      },
    ],
    []
  );

  const collectionTaskRowActions: RowAction<CollectionTask>[] = useMemo(
    () => [
      {
        key: 'trigger',
        label: i18n.t('lims.collection_task_table.k8'),
        icon: <Play size={16} />,
        onClick: (row) => handleTriggerTask(row.id),
        color: 'primary',
      },
      {
        key: 'edit',
        label: i18n.t('lims.collection_task_table.k10'),
        icon: <Edit size={16} />,
        onClick: (row) => handleEditTask(row),
        color: 'warning',
      },
      {
        key: 'delete',
        label: i18n.t('lims.collection_task_table.k12'),
        icon: <Trash2 size={16} />,
        onClick: (row) => handleDeleteTask(row.id),
        color: 'error',
      },
    ],
    [handleTriggerTask, handleEditTask, handleDeleteTask]
  );

  const parseRuleColumns: ColumnDef<ParseRule>[] = useMemo(
    () => [
      {
        id: 'rule_name',
        label: i18n.t('lims.parse_rule_table.k1'),
      },
      {
        id: 'protocol',
        label: i18n.t('lims.parse_rule_table.k2'),
        render: (row) => (
          <Chip
            label={row.protocol}
            size='small'
            variant='outlined'
          />
        ),
      },
      {
        id: 'instrument_type',
        label: i18n.t('lims.parse_rule_table.k3'),
        render: (row) => row.instrument_type || '-',
      },
      {
        id: 'description',
        label: i18n.t('lims.rule_form_dialog.k6'),
        render: (row) => (
          <Typography
            noWrap
            title={row.description}
          >
            {row.description || '-'}
          </Typography>
        ),
      },
      {
        id: 'created_at',
        label: i18n.t('lims.parse_rule_table.k6'),
        render: (row) => (row.created_at ? formatDateTime(row.created_at) : '-'),
      },
    ],
    []
  );

  const parseRuleRowActions: RowAction<ParseRule>[] = useMemo(
    () => [
      {
        key: 'edit',
        label: i18n.t('lims.parse_rule_table.k8'),
        icon: <Edit size={16} />,
        onClick: (row) => handleEditRule(row),
        color: 'warning',
      },
      {
        key: 'delete',
        label: i18n.t('lims.parse_rule_table.k10'),
        icon: <Trash2 size={16} />,
        onClick: (row) => handleDeleteRule(row.id),
        color: 'error',
      },
    ],
    [handleEditRule, handleDeleteRule]
  );

  return (
    <PageContainer
      maxWidth='xl'
      headerProps={{
        pageIcon: <Database style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.teal[400]} 0%, ${ct.teal[600]} 100%)`,
      }}
    >
      <StatisticsCards statistics={statistics} />
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
        >
          <Tab
            icon={<Database size={18} />}
            iconPosition='start'
            label={i18n.t('lims.index.k30')}
          />
          <Tab
            icon={<Play size={18} />}
            iconPosition='start'
            label={i18n.t('lims.index.k31')}
          />
          <Tab
            icon={<Settings size={18} />}
            iconPosition='start'
            label={i18n.t('lims.index.k32')}
          />
        </Tabs>
      </Paper>
      <Toolbar
        activeTab={activeTab}
        searchKeyword={searchKeyword}
        statusFilter={statusFilter}
        onSearchChange={setSearchKeyword}
        onStatusFilterChange={setStatusFilter}
        onRefetchData={() => instrumentDataQuery.refetch()}
        onRefetchTasks={() => collectionTasksQuery.refetch()}
        onRefetchRules={() => parseRulesQuery.refetch()}
        onCreateData={handleCreateData}
        onCreateTask={handleCreateTask}
        onCreateRule={handleCreateRule}
        onShowParseTest={() => setShowParseTest(true)}
      />
      {activeTab === 0 && (
        <ListPageTemplate<InstrumentData>
          columns={instrumentDataColumns}
          data={instrumentDataList}
          loading={instrumentDataQuery.isLoading}
          pagination={{
            page: dataPage,
            pageSize: dataRowsPerPage,
            total: statistics.total_data_count,
            onPageChange: setDataPage,
            onPageSizeChange: (size) => {
              setDataRowsPerPage(size);
              setDataPage(0);
            },
          }}
          searchable
          searchValue={searchKeyword}
          onSearch={setSearchKeyword}
          filters={statusFilterConfig}
          filtersValue={{ status: statusFilter }}
          onFilterChange={handleFilterChange}
          rowActions={instrumentDataRowActions}
          onRowClick={handleViewDataDetail}
          emptyMessage={i18n.t('pages.instrument_data_table.k0')}
        />
      )}
      {activeTab === 1 && (
        <ListPageTemplate<CollectionTask>
          columns={collectionTaskColumns}
          data={collectionTasks}
          loading={collectionTasksQuery.isLoading}
          pagination={{
            page: taskPage,
            pageSize: taskRowsPerPage,
            total: statistics.total_tasks,
            onPageChange: setTaskPage,
            onPageSizeChange: (size) => {
              setTaskRowsPerPage(size);
              setTaskPage(0);
            },
          }}
          searchable
          searchValue={searchKeyword}
          onSearch={setSearchKeyword}
          filters={statusFilterConfig}
          filtersValue={{ status: statusFilter }}
          onFilterChange={handleFilterChange}
          rowActions={collectionTaskRowActions}
          emptyMessage={i18n.t('pages.collection_task_table.k0')}
        />
      )}
      {activeTab === 2 && (
        <ListPageTemplate<ParseRule>
          columns={parseRuleColumns}
          data={parseRules}
          loading={parseRulesQuery.isLoading}
          pagination={{
            page: rulePage,
            pageSize: ruleRowsPerPage,
            total: statistics.total_rules,
            onPageChange: setRulePage,
            onPageSizeChange: (size) => {
              setRuleRowsPerPage(size);
              setRulePage(0);
            },
          }}
          searchable
          searchValue={searchKeyword}
          onSearch={setSearchKeyword}
          filters={statusFilterConfig}
          filtersValue={{ status: statusFilter }}
          onFilterChange={handleFilterChange}
          rowActions={parseRuleRowActions}
          emptyMessage={i18n.t('pages.parse_rule_table.k0')}
        />
      )}
      <DataDetailDialog
        open={showDataDetail}
        selectedData={selectedData}
        onClose={() => setShowDataDetail(false)}
        onParse={handleParseData}
      />
      <DataFormDialog
        open={showDataForm}
        isEditing={isEditingData}
        formData={dataFormData}
        submitting={submitting}
        onClose={() => setShowDataForm(false)}
        onFormDataChange={setDataFormData}
        onSave={handleSaveData}
      />
      <TaskFormDialog
        open={showTaskForm}
        isEditing={isEditingTask}
        formData={taskFormData}
        submitting={submitting}
        onClose={() => setShowTaskForm(false)}
        onFormDataChange={setTaskFormData}
        onSave={handleSaveTask}
      />
      <RuleFormDialog
        open={showRuleForm}
        isEditing={isEditingRule}
        formData={ruleFormData}
        submitting={submitting}
        onClose={() => setShowRuleForm(false)}
        onFormDataChange={setRuleFormData}
        onSave={handleSaveRule}
      />
      <ParseTestDialog
        open={showParseTest}
        parseTestData={parseTestData}
        parseTestResult={parseTestResult}
        submitting={submitting}
        onClose={() => setShowParseTest(false)}
        onParseTestDataChange={setParseTestData}
        onTestParse={handleTestParse}
      />
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert
          severity={notification.severity}
          onClose={() => setNotification({ ...notification, open: false })}
        >
          {notification.message}
        </Alert>
      </Snackbar>
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

export default LimsInstrumentDataPage;
