import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Typography,
  Button,
} from '@mui/material';
import { FileUpload, PageContainer } from '@/components/common';
import {
  Plus,
  Play,
  FileText,
  Edit,
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { ListPageTemplate } from '@/components/templates';

import type { RowAction, FilterConfig, ColumnDef } from '@/components/templates';
import { rsApi } from '@/api/rs';
import { useAppStore } from '@/store';
import type { TestCase, CreateTestCaseRequest, UpdateTestCaseRequest } from '@/api/rs';
import { logger } from '@/utils/logger';

const RsTestPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [caseTypeFilter, setCaseTypeFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [newCaseDialogOpen, setNewCaseDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [newCaseForm, setNewCaseForm] = useState({
    case_name: '',
    case_type: '功能测试',
    priority: 'medium',
    related_requirement: '',
  });
  const [testReportAttachments, setTestReportAttachments] = useState<string[]>([]);

  useEffect(() => {
    loadTestCases();
  }, [searchTerm, caseTypeFilter, priorityFilter, statusFilter, page, rowsPerPage]);

  const loadTestCases = async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {
        page: page + 1,
        pagesize: rowsPerPage,
      };
      if (searchTerm) params.search = searchTerm;
      if (caseTypeFilter) params.case_type = caseTypeFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await rsApi.listTests(params);
      if (response.success && response.data) {
        setTestCases(response.data.test_cases || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      logger.error('加载测试用例失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载测试用例',
      });
    } finally {
      setLoading(false);
    }
  };

  const uniqueCaseTypes = useMemo(
    () => [...new Set(testCases.map((tc) => tc.case_type))],
    [testCases]
  );

  const getCaseTypeLabel = (type: string): string => {
    const types: Record<string, string> = {
      功能测试: '功能测试',
      性能测试: '性能测试',
      压力测试: '压力测试',
      UI测试: 'UI测试',
      安全测试: '安全测试',
    };
    return types[type] || type;
  };

  const getPriorityLabel = (priority: string): string => {
    switch (priority) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return priority;
    }
  };

  const getPriorityColor = (priority: string): 'error' | 'warning' | 'default' => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'passed':
        return '已通过';
      case 'failed':
        return '未通过';
      case 'pending':
        return '待执行';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' => {
    switch (status) {
      case 'passed':
        return 'success';
      case 'failed':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'warning';
    }
  };

  const handleViewDetail = (tc: TestCase) => {
    setSelectedCase(tc);
    setDetailDialogOpen(true);
  };

  const handleExecuteTest = async (tc: TestCase) => {
    try {
      const updateData: UpdateTestCaseRequest = { status: 'passed' };
      await rsApi.updateTest(tc.id, updateData);
      addNotification({
        type: 'success',
        title: '操作成功',
        message: '测试用例已执行',
      });
      loadTestCases();
    } catch (error: unknown) {
      logger.error('执行测试失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '执行测试失败',
      });
    }
  };

  const handleCreateCase = async () => {
    try {
      const createData: CreateTestCaseRequest = {
        case_name: newCaseForm.case_name,
        case_type: newCaseForm.case_type,
        priority: newCaseForm.priority,
        related_requirement: newCaseForm.related_requirement,
      };
      await rsApi.createTest(createData);
      addNotification({
        type: 'success',
        title: '创建成功',
        message: '新测试用例已创建',
      });
      setNewCaseDialogOpen(false);
      setNewCaseForm({
        case_name: '',
        case_type: '功能测试',
        priority: 'medium',
        related_requirement: '',
      });
      setTestReportAttachments([]);
      loadTestCases();
    } catch (error: unknown) {
      logger.error('创建测试用例失败:', error);
      addNotification({
        type: 'error',
        title: '创建失败',
        message: '无法创建测试用例',
      });
    }
  };

  const columns = useMemo<ColumnDef<TestCase>[]>(
    () => [
      {
        id: 'case_no',
        label: '用例编号',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ClipboardList
              size={16}
              color='primary.main'
            />
            <Typography
              variant='body2'
              sx={{ fontWeight: 500 }}
            >
              {row.case_no}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'case_name',
        label: '用例名称',
        render: (row) => row.case_name,
      },
      {
        id: 'case_type',
        label: '用例类型',
        render: (row) => (
          <Chip
            label={getCaseTypeLabel(row.case_type)}
            size='small'
            variant='outlined'
          />
        ),
      },
      {
        id: 'priority',
        label: '优先级',
        render: (row) => (
          <Chip
            label={getPriorityLabel(row.priority)}
            size='small'
            color={getPriorityColor(row.priority)}
          />
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {row.status === 'passed' ? (
              <CheckCircle
                size={14}
                color='green'
              />
            ) : row.status === 'failed' ? (
              <XCircle
                size={14}
                color='red'
              />
            ) : (
              <Clock
                size={14}
                color='orange'
              />
            )}
            <Chip
              label={getStatusLabel(row.status)}
              size='small'
              color={getStatusColor(row.status)}
            />
          </Box>
        ),
      },
      {
        id: 'related_requirement',
        label: '关联需求',
        render: (row) => row.related_requirement,
      },
    ],
    []
  );

  const rowActions = useMemo<RowAction<TestCase>[]>(
    () => [
      {
        label: '详情',
        icon: <FileText size={16} />,
        onClick: (row) => handleViewDetail(row),
      },
      {
        label: '执行',
        icon: <Play size={16} />,
        color: 'success',
        onClick: (row) => handleExecuteTest(row),
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: () => {},
      },
    ],
    []
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'case_type',
        label: '用例类型',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          ...uniqueCaseTypes.map((type) => ({
            value: type,
            label: getCaseTypeLabel(type),
          })),
        ],
        value: caseTypeFilter,
        onChange: (value) => setCaseTypeFilter(value as string),
      },
      {
        id: 'priority',
        label: '优先级',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'high', label: '高' },
          { value: 'medium', label: '中' },
          { value: 'low', label: '低' },
        ],
        value: priorityFilter,
        onChange: (value) => setPriorityFilter(value as string),
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { value: '', label: '全部' },
          { value: 'passed', label: '已通过' },
          { value: 'failed', label: '未通过' },
          { value: 'pending', label: '待执行' },
        ],
        value: statusFilter,
        onChange: (value) => setStatusFilter(value as string),
      },
    ],
    [caseTypeFilter, priorityFilter, statusFilter, uniqueCaseTypes]
  );

  return (
    <PageContainer>
      <ListPageTemplate<TestCase>
        title=''
        subtitle=''
        backButton={{
          href: '/dashboard',
        }}
        columns={columns}
        data={testCases}
        loading={loading}
        searchable
        searchPlaceholder='搜索用例编号、名称...'
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        filters={filters}
        rowActions={rowActions}
        pagination={{
          page,
          pageSize: rowsPerPage,
          total,
          onPageChange: setPage,
          onPageSizeChange: setRowsPerPage,
        }}
        actions={[
          {
            label: '新建用例',
            icon: <Plus size={18} />,
            onClick: () => {
              setTestReportAttachments([]);
              setNewCaseDialogOpen(true);
            },
            variant: 'contained',
          },
        ]}
      />

      <Dialog
        open={newCaseDialogOpen}
        onClose={() => setNewCaseDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新建用例</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 2 }}
          >
            <TextField
              label='用例名称'
              fullWidth
              value={newCaseForm.case_name}
              onChange={(e) => setNewCaseForm({ ...newCaseForm, case_name: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>用例类型</InputLabel>
              <Select
                value={newCaseForm.case_type}
                label='用例类型'
                onChange={(e) => setNewCaseForm({ ...newCaseForm, case_type: e.target.value })}
              >
                <MenuItem value='功能测试'>功能测试</MenuItem>
                <MenuItem value='性能测试'>性能测试</MenuItem>
                <MenuItem value='压力测试'>压力测试</MenuItem>
                <MenuItem value='UI测试'>UI测试</MenuItem>
                <MenuItem value='安全测试'>安全测试</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>优先级</InputLabel>
              <Select
                value={newCaseForm.priority}
                label='优先级'
                onChange={(e) => setNewCaseForm({ ...newCaseForm, priority: e.target.value })}
              >
                <MenuItem value='high'>高</MenuItem>
                <MenuItem value='medium'>中</MenuItem>
                <MenuItem value='low'>低</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label='关联需求'
              fullWidth
              value={newCaseForm.related_requirement}
              onChange={(e) =>
                setNewCaseForm({
                  ...newCaseForm,
                  related_requirement: e.target.value,
                })
              }
            />
            <Box>
              <Typography
                variant='subtitle2'
                color='text.secondary'
                sx={{ mb: 1 }}
              >
                测试报告附件
              </Typography>
              <FileUpload
                value={testReportAttachments}
                onChange={setTestReportAttachments}
                accept={['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.png']}
                maxCount={5}
                maxSize={20}
                maxTotalSize={100}
                uploadText='上传测试报告'
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCaseDialogOpen(false)}>取消</Button>
          <Button
            variant='contained'
            sx={{ bgcolor: 'primary.main' }}
            onClick={handleCreateCase}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>用例详情</DialogTitle>
        <DialogContent>
          {selectedCase && (
            <Box sx={{ py: 2 }}>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {selectedCase.case_no} - {selectedCase.case_name}
              </Typography>
              <Stack
                direction='row'
                spacing={2}
                sx={{ mt: 2 }}
              >
                <Chip
                  label={getCaseTypeLabel(selectedCase.case_type)}
                  size='small'
                  variant='outlined'
                />
                <Chip
                  label={getPriorityLabel(selectedCase.priority)}
                  size='small'
                  color={getPriorityColor(selectedCase.priority)}
                />
                <Chip
                  label={getStatusLabel(selectedCase.status)}
                  size='small'
                  color={getStatusColor(selectedCase.status)}
                />
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Typography
                  variant='subtitle2'
                  color='text.secondary'
                >
                  关联需求: {selectedCase.related_requirement}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default RsTestPage;
