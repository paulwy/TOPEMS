import React, { useEffect, useState, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Database,
  Play,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  Settings,
  FileJson,
  Activity,
  BarChart3,
} from 'lucide-react';
import {
  Box,
  Container,
  Paper,
  Typography,
  IconButton,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Snackbar,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Stack,
  Button,
  LinearProgress,
  TextareaAutosize,
} from '@mui/material';
import { Grid } from '@/components';
import { PageHeader } from '@/components/templates/PageHeader';
import { apiLogger } from '@/utils/logger';
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
import {
  instrumentDataApi,
  collectionTaskApi,
  parseRuleApi,
} from '@/api/lims';

const LimsInstrumentDataPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });

  const [statistics, setStatistics] = useState<InstrumentDataStatistics>({
    total_data_count: 0,
    today_count: 0,
    success_count: 0,
    failed_count: 0,
    pending_count: 0,
    total_tasks: 0,
    running_tasks: 0,
    total_rules: 0,
  });

  const [instrumentDataList, setInstrumentDataList] = useState<InstrumentData[]>([]);
  const [collectionTasks, setCollectionTasks] = useState<CollectionTask[]>([]);
  const [parseRules, setParseRules] = useState<ParseRule[]>([]);

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

  const [submitting, setSubmitting] = useState(false);

  const showNotification = useCallback(
    (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
      setNotification({ open: true, message, severity });
    },
    []
  );

  const loadStatistics = useCallback(async () => {
    try {
      const response = await instrumentDataApi.getStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      apiLogger.error('加载统计数据失败', error);
    }
  }, []);

  const loadInstrumentData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await instrumentDataApi.listInstrumentData({
        page: dataPage + 1,
        page_size: dataRowsPerPage,
        search: searchKeyword,
        status: statusFilter,
      });
      if (response.success && response.data) {
        setInstrumentDataList(response.data);
      }
    } catch (error) {
      apiLogger.error('加载仪器数据失败', error);
      showNotification('加载仪器数据失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [dataPage, dataRowsPerPage, searchKeyword, statusFilter, showNotification]);

  const loadCollectionTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await collectionTaskApi.listCollectionTasks({
        page: taskPage + 1,
        page_size: taskRowsPerPage,
        search: searchKeyword,
        status: statusFilter,
      });
      if (response.success && response.data) {
        setCollectionTasks(response.data);
      }
    } catch (error) {
      apiLogger.error('加载采集任务失败', error);
      showNotification('加载采集任务失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [taskPage, taskRowsPerPage, searchKeyword, statusFilter, showNotification]);

  const loadParseRules = useCallback(async () => {
    try {
      setLoading(true);
      const response = await parseRuleApi.listParseRules({
        page: rulePage + 1,
        page_size: ruleRowsPerPage,
        search: searchKeyword,
        status: statusFilter,
      });
      if (response.success && response.data) {
        setParseRules(response.data);
      }
    } catch (error) {
      apiLogger.error('加载解析规则失败', error);
      showNotification('加载解析规则失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [rulePage, ruleRowsPerPage, searchKeyword, statusFilter, showNotification]);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  useEffect(() => {
    if (activeTab === 0) {
      loadInstrumentData();
    } else if (activeTab === 1) {
      loadCollectionTasks();
    } else if (activeTab === 2) {
      loadParseRules();
    }
  }, [activeTab, loadInstrumentData, loadCollectionTasks, loadParseRules]);

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
    try {
      setSubmitting(true);
      const response = await instrumentDataApi.parseInstrumentData(id);
      if (response.success) {
        showNotification('数据解析成功', 'success');
        loadInstrumentData();
        loadStatistics();
      }
    } catch (error) {
      apiLogger.error('解析数据失败', error);
      showNotification('解析数据失败', 'error');
    } finally {
      setSubmitting(false);
    }
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
    try {
      setSubmitting(true);
      if (isEditingData && selectedData) {
        const updateData: UpdateInstrumentDataRequest = {};
        const response = await instrumentDataApi.updateInstrumentData(selectedData.id, updateData);
        if (response.success) {
          showNotification('更新成功', 'success');
        }
      } else {
        const response = await instrumentDataApi.createInstrumentData(dataFormData);
        if (response.success) {
          showNotification('创建成功', 'success');
        }
      }
      setShowDataForm(false);
      loadInstrumentData();
      loadStatistics();
    } catch (error) {
      apiLogger.error('保存数据失败', error);
      showNotification('保存数据失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteData = async (id: string) => {
    if (!window.confirm('确定要删除这条数据吗？')) return;
    try {
      const response = await instrumentDataApi.deleteInstrumentData(id);
      if (response.success) {
        showNotification('删除成功', 'success');
        loadInstrumentData();
        loadStatistics();
      }
    } catch (error) {
      apiLogger.error('删除数据失败', error);
      showNotification('删除数据失败', 'error');
    }
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
    setTaskFormData({
      task_name: task.task_name,
      instrument_id: task.instrument_id || '',
      protocol: task.protocol,
      collection_mode: task.collection_mode,
      cron_expression: task.cron_expression || '',
      interval_minutes: task.interval_minutes || 30,
      parse_rule_id: task.parse_rule_id || '',
    });
    setShowTaskForm(true);
  };

  const handleSaveTask = async () => {
    try {
      setSubmitting(true);
      if (isEditingTask) {
        const updateData: UpdateCollectionTaskRequest = {
          task_name: taskFormData.task_name,
          cron_expression: taskFormData.cron_expression,
          interval_minutes: taskFormData.interval_minutes,
          parse_rule_id: taskFormData.parse_rule_id,
        };
        const response = await collectionTaskApi.updateCollectionTask(
          collectionTasks[0].id,
          updateData
        );
        if (response.success) {
          showNotification('更新成功', 'success');
        }
      } else {
        const response = await collectionTaskApi.createCollectionTask(taskFormData);
        if (response.success) {
          showNotification('创建成功', 'success');
        }
      }
      setShowTaskForm(false);
      loadCollectionTasks();
      loadStatistics();
    } catch (error) {
      apiLogger.error('保存任务失败', error);
      showNotification('保存任务失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerTask = async (id: string) => {
    try {
      setSubmitting(true);
      const response = await collectionTaskApi.triggerCollection(id);
      if (response.success) {
        showNotification('采集任务触发成功', 'success');
        loadInstrumentData();
        loadStatistics();
      }
    } catch (error) {
      apiLogger.error('触发采集失败', error);
      showNotification('触发采集失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('确定要删除这个采集任务吗？')) return;
    try {
      const response = await collectionTaskApi.deleteCollectionTask(id);
      if (response.success) {
        showNotification('删除成功', 'success');
        loadCollectionTasks();
        loadStatistics();
      }
    } catch (error) {
      apiLogger.error('删除任务失败', error);
      showNotification('删除任务失败', 'error');
    }
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
    setRuleFormData({
      rule_name: rule.rule_name,
      protocol: rule.protocol,
      instrument_type: rule.instrument_type || '',
      parse_config: rule.parse_config || {},
      quality_rules: rule.quality_rules || {},
      description: rule.description || '',
    });
    setShowRuleForm(true);
  };

  const handleSaveRule = async () => {
    try {
      setSubmitting(true);
      if (isEditingRule) {
        const updateData: UpdateParseRuleRequest = {
          rule_name: ruleFormData.rule_name,
          parse_config: ruleFormData.parse_config,
          quality_rules: ruleFormData.quality_rules,
          description: ruleFormData.description,
        };
        const response = await parseRuleApi.updateParseRule(parseRules[0].id, updateData);
        if (response.success) {
          showNotification('更新成功', 'success');
        }
      } else {
        const response = await parseRuleApi.createParseRule(ruleFormData);
        if (response.success) {
          showNotification('创建成功', 'success');
        }
      }
      setShowRuleForm(false);
      loadParseRules();
      loadStatistics();
    } catch (error) {
      apiLogger.error('保存规则失败', error);
      showNotification('保存规则失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('确定要删除这条解析规则吗？')) return;
    try {
      const response = await parseRuleApi.deleteParseRule(id);
      if (response.success) {
        showNotification('删除成功', 'success');
        loadParseRules();
        loadStatistics();
      }
    } catch (error) {
      apiLogger.error('删除规则失败', error);
      showNotification('删除规则失败', 'error');
    }
  };

  const handleTestParse = async () => {
    try {
      setSubmitting(true);
      const response = await instrumentDataApi.testParseData(parseTestData);
      if (response.success && response.data) {
        setParseTestResult(response.data);
      }
    } catch (error) {
      apiLogger.error('解析测试失败', error);
      showNotification('解析测试失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
      case 'active':
      case 'running':
        return 'success';
      case 'failed':
      case 'error':
      case 'disabled':
        return 'error';
      case 'pending':
      case 'scheduled':
        return 'warning';
      case 'parsing':
      case 'collecting':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待解析',
      parsing: '解析中',
      success: '成功',
      failed: '失败',
      completed: '已完成',
      running: '运行中',
      stopped: '已停止',
      scheduled: '已调度',
      active: '启用',
      inactive: '禁用',
      manual: '手动',
      scheduled_mode: '定时',
    };
    return statusMap[status] || status;
  };

  const formatJson = (obj: Record<string, any> | undefined) => {
    if (!obj) return '{}';
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return '{}';
    }
  };

  const parseJsonInput = (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return {};
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
  }: {
    title: string;
    value: number | string;
    icon: LucideIcon;
    color: string;
  }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: `${color}.lighter`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon color={color} size={24} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl">
      <PageHeader title="仪器数据采集" subtitle="LIMS 仪器数据自动采集与解析管理" />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="数据总条数" value={statistics.total_data_count} icon={Database} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="今日采集" value={statistics.today_count} icon={Activity} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="采集任务" value={statistics.total_tasks} icon={Play} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="解析规则" value={statistics.total_rules} icon={Settings} color="warning" />
        </Grid>
      </Grid>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab icon={<Database size={18} />} iconPosition="start" label="数据记录" />
          <Tab icon={<Play size={18} />} iconPosition="start" label="采集任务" />
          <Tab icon={<Settings size={18} />} iconPosition="start" label="解析规则" />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="搜索..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            sx={{ width: 250 }}
          />
          <FormControl size="small" sx={{ width: 150 }}>
            <InputLabel>状态</InputLabel>
            <Select
              value={statusFilter}
              label="状态"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">全部</MenuItem>
              <MenuItem value="pending">待解析</MenuItem>
              <MenuItem value="success">成功</MenuItem>
              <MenuItem value="failed">失败</MenuItem>
              <MenuItem value="running">运行中</MenuItem>
              <MenuItem value="stopped">已停止</MenuItem>
              <MenuItem value="active">启用</MenuItem>
              <MenuItem value="inactive">禁用</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ flexGrow: 1 }} />
          {activeTab === 0 && (
            <>
              <Button
                variant="outlined"
                startIcon={<RefreshCw size={18} />}
                onClick={() => loadInstrumentData()}
              >
                刷新
              </Button>
              <Button variant="contained" startIcon={<Plus size={18} />} onClick={handleCreateData}>
                新增数据
              </Button>
            </>
          )}
          {activeTab === 1 && (
            <>
              <Button
                variant="outlined"
                startIcon={<RefreshCw size={18} />}
                onClick={() => loadCollectionTasks()}
              >
                刷新
              </Button>
              <Button variant="contained" startIcon={<Plus size={18} />} onClick={handleCreateTask}>
                新建任务
              </Button>
            </>
          )}
          {activeTab === 2 && (
            <>
              <Button
                variant="outlined"
                startIcon={<FileJson size={18} />}
                onClick={() => setShowParseTest(true)}
              >
                解析测试
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshCw size={18} />}
                onClick={() => loadParseRules()}
              >
                刷新
              </Button>
              <Button variant="contained" startIcon={<Plus size={18} />} onClick={handleCreateRule}>
                新建规则
              </Button>
            </>
          )}
        </Stack>
      </Paper>

      {activeTab === 0 && (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>数据编号</TableCell>
                  <TableCell>仪器</TableCell>
                  <TableCell>批次号</TableCell>
                  <TableCell>协议</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>质量分</TableCell>
                  <TableCell>采集时间</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <LinearProgress />
                    </TableCell>
                  </TableRow>
                ) : instrumentDataList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Box sx={{ py: 4 }}>
                        <Database size={48} opacity={0.3} />
                        <Typography color="text.secondary" sx={{ mt: 1 }}>
                          暂无数据
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  instrumentDataList.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{item.data_no}</TableCell>
                      <TableCell>{item.instrument_name || '-'}</TableCell>
                      <TableCell>{item.batch_no}</TableCell>
                      <TableCell>
                        <Chip label={item.protocol} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(item.status)}
                          size="small"
                          color={getStatusColor(item.status) as any}
                        />
                      </TableCell>
                      <TableCell>
                        {item.quality_score !== undefined && item.quality_score !== null
                          ? `${item.quality_score}%`
                          : '-'}
                      </TableCell>
                      <TableCell>{item.collected_at || '-'}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="查看详情">
                            <IconButton size="small" onClick={() => handleViewDataDetail(item)}>
                              <Eye size={16} />
                            </IconButton>
                          </Tooltip>
                          {item.status === 'pending' || item.status === 'failed' ? (
                            <Tooltip title="重新解析">
                              <IconButton size="small" onClick={() => handleParseData(item.id)}>
                                <RefreshCw size={16} />
                              </IconButton>
                            </Tooltip>
                          ) : null}
                          <Tooltip title="删除">
                            <IconButton size="small" onClick={() => handleDeleteData(item.id)}>
                              <Trash2 size={16} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={statistics.total_data_count}
            rowsPerPage={dataRowsPerPage}
            page={dataPage}
            onPageChange={(_, page) => setDataPage(page)}
            onRowsPerPageChange={(e) => {
              setDataRowsPerPage(parseInt(e.target.value, 10));
              setDataPage(0);
            }}
          />
        </Paper>
      )}

      {activeTab === 1 && (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>任务编号</TableCell>
                  <TableCell>任务名称</TableCell>
                  <TableCell>仪器</TableCell>
                  <TableCell>协议</TableCell>
                  <TableCell>采集方式</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>上次运行</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <LinearProgress />
                    </TableCell>
                  </TableRow>
                ) : collectionTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Box sx={{ py: 4 }}>
                        <Play size={48} opacity={0.3} />
                        <Typography color="text.secondary" sx={{ mt: 1 }}>
                          暂无采集任务
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  collectionTasks.map((task) => (
                    <TableRow key={task.id} hover>
                      <TableCell>{task.task_no}</TableCell>
                      <TableCell>{task.task_name}</TableCell>
                      <TableCell>{task.instrument_name || '-'}</TableCell>
                      <TableCell>
                        <Chip label={task.protocol} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{getStatusLabel(task.collection_mode)}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(task.status)}
                          size="small"
                          color={getStatusColor(task.status) as any}
                        />
                      </TableCell>
                      <TableCell>{task.last_run_at || '-'}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="立即采集">
                            <IconButton size="small" onClick={() => handleTriggerTask(task.id)}>
                              <Play size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="编辑">
                            <IconButton size="small" onClick={() => handleEditTask(task)}>
                              <Edit size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="删除">
                            <IconButton size="small" onClick={() => handleDeleteTask(task.id)}>
                              <Trash2 size={16} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={statistics.total_tasks}
            rowsPerPage={taskRowsPerPage}
            page={taskPage}
            onPageChange={(_, page) => setTaskPage(page)}
            onRowsPerPageChange={(e) => {
              setTaskRowsPerPage(parseInt(e.target.value, 10));
              setTaskPage(0);
            }}
          />
        </Paper>
      )}

      {activeTab === 2 && (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>规则编号</TableCell>
                  <TableCell>规则名称</TableCell>
                  <TableCell>协议</TableCell>
                  <TableCell>仪器类型</TableCell>
                  <TableCell>版本</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>创建时间</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <LinearProgress />
                    </TableCell>
                  </TableRow>
                ) : parseRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Box sx={{ py: 4 }}>
                        <Settings size={48} opacity={0.3} />
                        <Typography color="text.secondary" sx={{ mt: 1 }}>
                          暂无解析规则
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  parseRules.map((rule) => (
                    <TableRow key={rule.id} hover>
                      <TableCell>{rule.rule_no}</TableCell>
                      <TableCell>{rule.rule_name}</TableCell>
                      <TableCell>
                        <Chip label={rule.protocol} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{rule.instrument_type || '-'}</TableCell>
                      <TableCell>v{rule.version}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(rule.status)}
                          size="small"
                          color={getStatusColor(rule.status) as any}
                        />
                      </TableCell>
                      <TableCell>{rule.created_at || '-'}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="编辑">
                            <IconButton size="small" onClick={() => handleEditRule(rule)}>
                              <Edit size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="删除">
                            <IconButton size="small" onClick={() => handleDeleteRule(rule.id)}>
                              <Trash2 size={16} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50]}
            component="div"
            count={statistics.total_rules}
            rowsPerPage={ruleRowsPerPage}
            page={rulePage}
            onPageChange={(_, page) => setRulePage(page)}
            onRowsPerPageChange={(e) => {
              setRuleRowsPerPage(parseInt(e.target.value, 10));
              setRulePage(0);
            }}
          />
        </Paper>
      )}

      <Dialog open={showDataDetail} onClose={() => setShowDataDetail(false)} maxWidth="md" fullWidth>
        <DialogTitle>数据详情</DialogTitle>
        <DialogContent dividers>
          {selectedData && (
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    数据编号
                  </Typography>
                  <Typography>{selectedData.data_no}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    批次号
                  </Typography>
                  <Typography>{selectedData.batch_no}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    仪器
                  </Typography>
                  <Typography>{selectedData.instrument_name || '-'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    协议
                  </Typography>
                  <Chip label={selectedData.protocol} size="small" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    状态
                  </Typography>
                  <Chip
                    label={getStatusLabel(selectedData.status)}
                    size="small"
                    color={getStatusColor(selectedData.status) as any}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    质量分
                  </Typography>
                  <Typography>
                    {selectedData.quality_score !== undefined && selectedData.quality_score !== null
                      ? `${selectedData.quality_score}%`
                      : '-'}
                  </Typography>
                </Grid>
              </Grid>

              <Divider />

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  原始数据
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
                  <Typography component="pre" variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {formatJson(selectedData.raw_data)}
                  </Typography>
                </Paper>
              </Box>

              {selectedData.parsed_data && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    解析结果
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
                    <Typography component="pre" variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {formatJson(selectedData.parsed_data)}
                    </Typography>
                  </Paper>
                </Box>
              )}

              {selectedData.error_msg && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    错误信息
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'error.lighter' }}>
                    <Typography color="error">{selectedData.error_msg}</Typography>
                  </Paper>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDataDetail(false)}>关闭</Button>
          {(selectedData?.status === 'pending' || selectedData?.status === 'failed') && (
            <Button
              variant="contained"
              startIcon={<RefreshCw size={18} />}
              onClick={() => {
                if (selectedData) {
                  handleParseData(selectedData.id);
                  setShowDataDetail(false);
                }
              }}
            >
              重新解析
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={showDataForm} onClose={() => setShowDataForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditingData ? '编辑数据' : '新增数据'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="批次号"
              fullWidth
              value={dataFormData.batch_no}
              onChange={(e) => setDataFormData({ ...dataFormData, batch_no: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>协议类型</InputLabel>
              <Select
                value={dataFormData.protocol}
                label="协议类型"
                onChange={(e) => setDataFormData({ ...dataFormData, protocol: e.target.value })}
              >
                <MenuItem value="JSON">JSON</MenuItem>
                <MenuItem value="HL7">HL7</MenuItem>
                <MenuItem value="ASTM">ASTM</MenuItem>
              </Select>
            </FormControl>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                原始数据 (JSON)
              </Typography>
              <TextareaAutosize
                minRows={8}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
                value={formatJson(dataFormData.raw_data)}
                onChange={(e) =>
                  setDataFormData({ ...dataFormData, raw_data: parseJsonInput(e.target.value) })
                }
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDataForm(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveData} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showTaskForm} onClose={() => setShowTaskForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditingTask ? '编辑采集任务' : '新建采集任务'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="任务名称"
              fullWidth
              value={taskFormData.task_name}
              onChange={(e) => setTaskFormData({ ...taskFormData, task_name: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>协议类型</InputLabel>
              <Select
                value={taskFormData.protocol}
                label="协议类型"
                onChange={(e) => setTaskFormData({ ...taskFormData, protocol: e.target.value })}
              >
                <MenuItem value="JSON">JSON</MenuItem>
                <MenuItem value="HL7">HL7</MenuItem>
                <MenuItem value="ASTM">ASTM</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>采集方式</InputLabel>
              <Select
                value={taskFormData.collection_mode}
                label="采集方式"
                onChange={(e) =>
                  setTaskFormData({ ...taskFormData, collection_mode: e.target.value })
                }
              >
                <MenuItem value="manual">手动触发</MenuItem>
                <MenuItem value="scheduled">定时采集</MenuItem>
                <MenuItem value="interval">间隔采集</MenuItem>
              </Select>
            </FormControl>
            {taskFormData.collection_mode === 'scheduled' && (
              <TextField
                label="Cron 表达式"
                fullWidth
                placeholder="0 0 * * *"
                value={taskFormData.cron_expression}
                onChange={(e) =>
                  setTaskFormData({ ...taskFormData, cron_expression: e.target.value })
                }
              />
            )}
            {taskFormData.collection_mode === 'interval' && (
              <TextField
                label="间隔时间（分钟）"
                type="number"
                fullWidth
                value={taskFormData.interval_minutes}
                onChange={(e) =>
                  setTaskFormData({
                    ...taskFormData,
                    interval_minutes: parseInt(e.target.value, 10) || 30,
                  })
                }
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTaskForm(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveTask} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showRuleForm} onClose={() => setShowRuleForm(false)} maxWidth="md" fullWidth>
        <DialogTitle>{isEditingRule ? '编辑解析规则' : '新建解析规则'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="规则名称"
                  fullWidth
                  value={ruleFormData.rule_name}
                  onChange={(e) => setRuleFormData({ ...ruleFormData, rule_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>协议类型</InputLabel>
                  <Select
                    value={ruleFormData.protocol}
                    label="协议类型"
                    onChange={(e) =>
                      setRuleFormData({ ...ruleFormData, protocol: e.target.value })
                    }
                  >
                    <MenuItem value="JSON">JSON</MenuItem>
                    <MenuItem value="HL7">HL7</MenuItem>
                    <MenuItem value="ASTM">ASTM</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="仪器类型"
                  fullWidth
                  value={ruleFormData.instrument_type}
                  onChange={(e) =>
                    setRuleFormData({ ...ruleFormData, instrument_type: e.target.value })
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="描述"
                  fullWidth
                  multiline
                  rows={2}
                  value={ruleFormData.description}
                  onChange={(e) =>
                    setRuleFormData({ ...ruleFormData, description: e.target.value })
                  }
                />
              </Grid>
            </Grid>

            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                解析配置 (JSON)
              </Typography>
              <TextareaAutosize
                minRows={6}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
                value={formatJson(ruleFormData.parse_config)}
                onChange={(e) =>
                  setRuleFormData({
                    ...ruleFormData,
                    parse_config: parseJsonInput(e.target.value),
                  })
                }
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                质量校验规则 (JSON)
              </Typography>
              <TextareaAutosize
                minRows={6}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
                value={formatJson(ruleFormData.quality_rules)}
                onChange={(e) =>
                  setRuleFormData({
                    ...ruleFormData,
                    quality_rules: parseJsonInput(e.target.value),
                  })
                }
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRuleForm(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveRule} disabled={submitting}>
            {submitting ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showParseTest} onClose={() => setShowParseTest(false)} maxWidth="lg" fullWidth>
        <DialogTitle>解析测试</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>协议类型</InputLabel>
                  <Select
                    value={parseTestData.protocol}
                    label="协议类型"
                    onChange={(e) =>
                      setParseTestData({ ...parseTestData, protocol: e.target.value })
                    }
                  >
                    <MenuItem value="JSON">JSON</MenuItem>
                    <MenuItem value="HL7">HL7</MenuItem>
                    <MenuItem value="ASTM">ASTM</MenuItem>
                  </Select>
                </FormControl>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    输入数据 (JSON)
                  </Typography>
                  <TextareaAutosize
                    minRows={20}
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                    }}
                    value={formatJson(parseTestData.raw_data)}
                    onChange={(e) =>
                      setParseTestData({
                        ...parseTestData,
                        raw_data: parseJsonInput(e.target.value),
                      })
                    }
                  />
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Play size={18} />}
                  onClick={handleTestParse}
                  disabled={submitting}
                >
                  {submitting ? '解析中...' : '开始解析'}
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={6}>
              <Stack spacing={2}>
                <Typography variant="subtitle2" color="text.secondary">
                  解析结果
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, minHeight: 400, maxHeight: 500, overflow: 'auto' }}>
                  {parseTestResult ? (
                    <Stack spacing={2}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        {parseTestResult.success ? (
                          <CheckCircle2 color="success" size={20} />
                        ) : (
                          <AlertCircle color="error" size={20} />
                        )}
                        <Typography sx={{ fontWeight: 'bold' }}>
                          {parseTestResult.success ? '解析成功' : '解析失败'}
                        </Typography>
                        {parseTestResult.quality_score !== undefined && (
                          <Chip
                            label={`质量分: ${parseTestResult.quality_score}%`}
                            size="small"
                            color="primary"
                          />
                        )}
                      </Stack>
                      {parseTestResult.error_msg && (
                        <Paper sx={{ p: 2, bgcolor: 'error.lighter' }}>
                          <Typography color="error">{parseTestResult.error_msg}</Typography>
                        </Paper>
                      )}
                      {parseTestResult.parsed_data && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            解析数据
                          </Typography>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography component="pre" variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {formatJson(parseTestResult.parsed_data)}
                            </Typography>
                          </Paper>
                        </Box>
                      )}
                      {parseTestResult.test_items && parseTestResult.test_items.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            检测项目 ({parseTestResult.test_items.length})
                          </Typography>
                          <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>项目</TableCell>
                                  <TableCell>结果</TableCell>
                                  <TableCell>单位</TableCell>
                                  <TableCell>状态</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {parseTestResult.test_items.map((item, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell>{item.test_item_name || item.test_item}</TableCell>
                                    <TableCell>{item.result || item.numeric_result || '-'}</TableCell>
                                    <TableCell>{item.unit || '-'}</TableCell>
                                    <TableCell>
                                      <Chip
                                        label={item.status || '-'}
                                        size="small"
                                        color={
                                          item.abnormal_flag
                                            ? 'warning'
                                            : ('default' as any)
                                        }
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}
                    </Stack>
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: 300,
                      }}
                    >
                      <Typography color="text.secondary">点击"开始解析"查看结果</Typography>
                    </Box>
                  )}
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowParseTest(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

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
    </Container>
  );
};

export default LimsInstrumentDataPage;
