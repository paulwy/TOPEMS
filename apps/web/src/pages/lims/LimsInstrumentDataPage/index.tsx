import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { Database, Play, Settings } from 'lucide-react';
import {
  Container,
  Paper,
  Tabs,
  Tab,
  Snackbar,
  Alert,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import { useConfirmDialog } from '@/hooks';
import { logger } from '@/utils/logger';
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
import { instrumentDataApi, collectionTaskApi, parseRuleApi } from '@/api/lims';
import { designTokens } from '@/theme/tokens';

import StatisticsCards from './components/StatisticsCards';
import Toolbar from './components/Toolbar';
import InstrumentDataTable from './components/InstrumentDataTable';
import CollectionTaskTable from './components/CollectionTaskTable';
import ParseRuleTable from './components/ParseRuleTable';
import DataDetailDialog from './components/DataDetailDialog';
import DataFormDialog from './components/DataFormDialog';
import TaskFormDialog from './components/TaskFormDialog';
import RuleFormDialog from './components/RuleFormDialog';
import ParseTestDialog from './components/ParseTestDialog';

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
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.INSTRUMENT_DATA });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.COLLECTION_TASKS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.PARSE_RULES });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LIMS.STATISTICS });
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
  });

  const instrumentDataList: InstrumentData[] = instrumentDataQuery.data || [];
  const collectionTasks: CollectionTask[] = collectionTasksQuery.data || [];
  const parseRules: ParseRule[] = parseRulesQuery.data || [];

  const loading =
    activeTab === 0
      ? instrumentDataQuery.isLoading
      : activeTab === 1
        ? collectionTasksQuery.isLoading
        : parseRulesQuery.isLoading;

  const parseDataMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await instrumentDataApi.parseInstrumentData(id);
      if (!response.success) {
        throw new Error('解析数据失败');
      }
      return response;
    },
    onSuccess: () => {
      invalidateAll();
    },
    onError: (error: unknown) => {
      logger.error('解析数据失败', error);
    },
  });

  const createDataMutation = useMutation({
    mutationFn: async (data: CreateInstrumentDataRequest) => {
      const response = await instrumentDataApi.createInstrumentData(data);
      if (!response.success) {
        throw new Error('保存数据失败');
      }
      return response;
    },
    onSuccess: () => {
      invalidateAll();
      setShowDataForm(false);
    },
    onError: (error: unknown) => {
      logger.error('保存数据失败', error);
    },
  });

  const updateDataMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInstrumentDataRequest }) => {
      const response = await instrumentDataApi.updateInstrumentData(id, data);
      if (!response.success) {
        throw new Error('更新失败');
      }
      return response;
    },
    onSuccess: () => {
      invalidateAll();
      setShowDataForm(false);
    },
    onError: (error: unknown) => {
      logger.error('更新数据失败', error);
    },
  });

  const deleteDataMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await instrumentDataApi.deleteInstrumentData(id);
      if (!response.success) {
        throw new Error('删除数据失败');
      }
      return response;
    },
    onSuccess: () => {
      invalidateAll();
    },
    onError: (error: unknown) => {
      logger.error('删除数据失败', error);
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: CreateCollectionTaskRequest) => {
      const response = await collectionTaskApi.createCollectionTask(data);
      if (!response.success) {
        throw new Error('保存任务失败');
      }
      return response;
    },
    onSuccess: () => {
      invalidateAll();
      setShowTaskForm(false);
    },
    onError: (error: unknown) => {
      logger.error('保存任务失败', error);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCollectionTaskRequest }) => {
      const response = await collectionTaskApi.updateCollectionTask(id, data);
      if (!response.success) {
        throw new Error('更新失败');
      }
      return response;
    },
    onSuccess: () => {
      invalidateAll();
      setShowTaskForm(false);
    },
    onError: (error: unknown) => {
      logger.error('更新任务失败', error);
    },
  });

  const triggerTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await collectionTaskApi.triggerCollection(id);
      if (!response.success) {
        throw new Error('触发采集失败');
      }
      return response;
    },
    onSuccess: () => {
      invalidateAll();
    },
    onError: (error: unknown) => {
      logger.error('触发采集失败', error);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await collectionTaskApi.deleteCollectionTask(id);
      if (!response.success) {
        throw new Error('删除任务失败');
      }
      return response;
    },
    onSuccess: () => {
      invalidateAll();
    },
    onError: (error: unknown) => {
      logger.error('删除任务失败', error);
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: CreateParseRuleRequest) => {
      const response = await parseRuleApi.createParseRule(data);
      if (!response.success) {
        throw new Error('保存规则失败');
      }
      return response;
    },
    onSuccess: () => {
      invalidateAll();
      setShowRuleForm(false);
    },
    onError: (error: unknown) => {
      logger.error('保存规则失败', error);
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateParseRuleRequest }) => {
      const response = await parseRuleApi.updateParseRule(id, data);
      if (!response.success) {
        throw new Error('更新失败');
      }
      return response;
    },
    onSuccess: () => {
      invalidateAll();
      setShowRuleForm(false);
    },
    onError: (error: unknown) => {
      logger.error('更新规则失败', error);
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await parseRuleApi.deleteParseRule(id);
      if (!response.success) {
        throw new Error('删除规则失败');
      }
      return response;
    },
    onSuccess: () => {
      invalidateAll();
    },
    onError: (error: unknown) => {
      logger.error('删除规则失败', error);
    },
  });

  const testParseMutation = useMutation({
    mutationFn: async (data: ParseDataRequest) => {
      const response = await instrumentDataApi.testParseData(data);
      if (!response.success) {
        throw new Error('解析测试失败');
      }
      return response;
    },
    onSuccess: (response) => {
      if (response.data) {
        setParseTestResult(response.data);
      }
    },
    onError: (error: unknown) => {
      logger.error('解析测试失败', error);
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
  };

  const handleViewDataDetail = (data: InstrumentData) => {
    setSelectedData(data);
    setShowDataDetail(true);
  };

  const handleParseData = async (id: string) => {
    await parseDataMutation.mutateAsync(id);
  };

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

  const handleEditData = (data: InstrumentData) => {
    setIsEditingData(true);
    setSelectedData(data);
    setDataFormData({
      instrument_id: data.instrument_id || '',
      protocol: data.protocol,
      raw_data: data.raw_data || {},
      batch_no: data.batch_no,
    });
    setShowDataForm(true);
  };

  const handleSaveData = async () => {
    if (isEditingData && selectedData) {
      const updateData: UpdateInstrumentDataRequest = {};
      await updateDataMutation.mutateAsync({ id: selectedData.id, data: updateData });
    } else {
      await createDataMutation.mutateAsync(dataFormData);
    }
  };

  const handleDeleteData = (id: string) => {
    openConfirmDialog({
      title: '确认删除',
      message: '确定要删除这条数据吗？',
      danger: true,
      onConfirm: () => {
        deleteDataMutation.mutate(id);
      },
    });
  };

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

  const handleEditTask = (task: CollectionTask) => {
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
  };

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

  const handleTriggerTask = async (id: string) => {
    await triggerTaskMutation.mutateAsync(id);
  };

  const handleDeleteTask = (id: string) => {
    openConfirmDialog({
      title: '确认删除',
      message: '确定要删除这个采集任务吗？',
      danger: true,
      onConfirm: () => {
        deleteTaskMutation.mutate(id);
      },
    });
  };

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

  const handleEditRule = (rule: ParseRule) => {
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
  };

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

  const handleDeleteRule = (id: string) => {
    openConfirmDialog({
      title: '确认删除',
      message: '确定要删除这条解析规则吗？',
      danger: true,
      onConfirm: () => {
        deleteRuleMutation.mutate(id);
      },
    });
  };

  const handleTestParse = async () => {
    await testParseMutation.mutateAsync(parseTestData);
  };

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
            label='数据记录'
          />
          <Tab
            icon={<Play size={18} />}
            iconPosition='start'
            label='采集任务'
          />
          <Tab
            icon={<Settings size={18} />}
            iconPosition='start'
            label='解析规则'
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
        <InstrumentDataTable
          loading={loading}
          dataList={instrumentDataList}
          totalCount={statistics.total_data_count}
          page={dataPage}
          rowsPerPage={dataRowsPerPage}
          onPageChange={setDataPage}
          onRowsPerPageChange={(rows) => {
            setDataRowsPerPage(rows);
            setDataPage(0);
          }}
          onViewDetail={handleViewDataDetail}
          onParse={handleParseData}
          onDelete={handleDeleteData}
        />
      )}

      {activeTab === 1 && (
        <CollectionTaskTable
          loading={loading}
          tasks={collectionTasks}
          totalCount={statistics.total_tasks}
          page={taskPage}
          rowsPerPage={taskRowsPerPage}
          onPageChange={setTaskPage}
          onRowsPerPageChange={(rows) => {
            setTaskRowsPerPage(rows);
            setTaskPage(0);
          }}
          onTrigger={handleTriggerTask}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
        />
      )}

      {activeTab === 2 && (
        <ParseRuleTable
          loading={loading}
          rules={parseRules}
          totalCount={statistics.total_rules}
          page={rulePage}
          rowsPerPage={ruleRowsPerPage}
          onPageChange={setRulePage}
          onRowsPerPageChange={(rows) => {
            setRuleRowsPerPage(rows);
            setRulePage(0);
          }}
          onEdit={handleEditRule}
          onDelete={handleDeleteRule}
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
