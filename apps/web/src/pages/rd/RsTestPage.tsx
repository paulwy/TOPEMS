import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ListPageTemplate } from '@/components/templates';

import type { RowAction, FilterConfig, ColumnDef } from '@/components/templates';
import { rdApi } from '@/api/rd';
import { useNotificationStore } from '@/store';
import type { TestCase, CreateTestCaseRequest, UpdateTestCaseRequest } from '@/api/rd';
import { logger } from '@/utils/logger';
import { QUERY_KEYS } from '@/lib/reactQuery';

const RsTestPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { addNotification } = useNotificationStore();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [caseTypeFilter, setCaseTypeFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [newCaseDialogOpen, setNewCaseDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [newCaseForm, setNewCaseForm] = useState({
    case_name: '',
    case_type: t('rd.case_type.functional'),
    priority: 'medium',
    related_requirement: '',
  });
  const [testReportAttachments, setTestReportAttachments] = useState<string[]>([]);

  const testListQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.RD.TEST_CASES,
      { page, rowsPerPage, searchTerm, caseTypeFilter, priorityFilter, statusFilter },
    ],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: page + 1,
        pagesize: rowsPerPage,
      };
      if (searchTerm) params.search = searchTerm;
      if (caseTypeFilter) params.case_type = caseTypeFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await rdApi.listTests(params);
      if (!response.success || !response.data) {
        throw new Error(response.message || t('rd.test_page.error.load_list_failed'));
      }
      return {
        test_cases: response.data.test_cases || [],
        total: response.data.total || 0,
      };
    },
  });

  const updateTestMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTestCaseRequest }) => {
      const response = await rdApi.updateTest(id, data);
      if (!response.success) {
        throw new Error(response.message || t('rd.test_page.error.update_failed'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RD.TEST_CASES });
      addNotification({
        type: 'success',
        title: t('rd.test_page.notification.execute_success_title'),
        message: t('rd.test_page.notification.execute_success_message'),
      });
    },
    onError: (error: unknown) => {
      logger.error('执行测试失败:', error);
      addNotification({
        type: 'error',
        title: t('rd.test_page.notification.execute_failed_title'),
        message:
          error instanceof Error
            ? error.message
            : t('rd.test_page.notification.execute_failed_message'),
      });
    },
  });

  const createTestMutation = useMutation({
    mutationFn: async (data: CreateTestCaseRequest) => {
      const response = await rdApi.createTest(data);
      if (!response.success) {
        throw new Error(response.message || t('rd.test_page.error.create_failed'));
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RD.TEST_CASES });
      addNotification({
        type: 'success',
        title: t('rd.test_page.notification.create_success_title'),
        message: t('rd.test_page.notification.create_success_message'),
      });
    },
    onError: (error: unknown) => {
      logger.error('创建测试用例失败:', error);
      addNotification({
        type: 'error',
        title: t('rd.test_page.notification.create_failed_title'),
        message:
          error instanceof Error
            ? error.message
            : t('rd.test_page.notification.create_failed_message'),
      });
    },
  });

  const testCases = testListQuery.data?.test_cases || [];
  const total = testListQuery.data?.total || 0;
  const loading =
    testListQuery.isLoading || updateTestMutation.isPending || createTestMutation.isPending;

  const uniqueCaseTypes = useMemo(
    () => [...new Set(testCases.map((tc) => tc.case_type))],
    [testCases]
  );

  const getCaseTypeLabel = (type: string): string => {
    const types: Record<string, string> = {
      功能测试: t('rd.case_type.functional'),
      性能测试: t('rd.case_type.performance'),
      压力测试: t('rd.case_type.stress'),
      UI测试: t('rd.case_type.ui'),
      安全测试: t('rd.case_type.security'),
    };
    return types[type] || type;
  };

  const getPriorityLabel = (priority: string): string => {
    switch (priority) {
      case 'high':
        return t('rd.priority.high');
      case 'medium':
        return t('rd.priority.medium');
      case 'low':
        return t('rd.priority.low');
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
        return t('rd.status.passed');
      case 'failed':
        return t('rd.status.failed');
      case 'pending':
        return t('rd.status.pending_test');
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
      await updateTestMutation.mutateAsync({ id: tc.id, data: updateData });
    } catch {
      // 错误已在 mutation onError 中处理
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
      await createTestMutation.mutateAsync(createData);
      setNewCaseDialogOpen(false);
      setNewCaseForm({
        case_name: '',
        case_type: t('rd.case_type.functional'),
        priority: 'medium',
        related_requirement: '',
      });
      setTestReportAttachments([]);
    } catch {
      // 错误已在 mutation onError 中处理
    }
  };

  const columns = useMemo<ColumnDef<TestCase>[]>(
    () => [
      {
        id: 'case_no',
        label: t('rd.test_page.column.case_no'),
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
        label: t('rd.test_page.column.case_name'),
        render: (row) => row.case_name,
      },
      {
        id: 'case_type',
        label: t('rd.test_page.column.case_type'),
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
        label: t('rd.test_page.column.priority'),
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
        label: t('rd.test_page.column.status'),
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
        label: t('rd.test_page.column.related_requirement'),
        render: (row) => row.related_requirement,
      },
    ],
    [t]
  );

  const rowActions = useMemo<RowAction<TestCase>[]>(
    () => [
      {
        label: t('rd.test_page.row_action.detail'),
        icon: <FileText size={16} />,
        onClick: (row) => handleViewDetail(row),
      },
      {
        label: t('rd.test_page.row_action.execute'),
        icon: <Play size={16} />,
        color: 'success',
        onClick: (row) => handleExecuteTest(row),
      },
      {
        label: t('rd.test_page.row_action.edit'),
        icon: <Edit size={16} />,
        onClick: () => {},
      },
    ],
    [t]
  );

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'case_type',
        label: t('rd.test_page.filter.case_type'),
        type: 'select',
        options: [
          { value: '', label: t('rd.common.all') },
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
        label: t('rd.test_page.filter.priority'),
        type: 'select',
        options: [
          { value: '', label: t('rd.common.all') },
          { value: 'high', label: t('rd.priority.high') },
          { value: 'medium', label: t('rd.priority.medium') },
          { value: 'low', label: t('rd.priority.low') },
        ],
        value: priorityFilter,
        onChange: (value) => setPriorityFilter(value as string),
      },
      {
        id: 'status',
        label: t('rd.test_page.filter.status'),
        type: 'select',
        options: [
          { value: '', label: t('rd.common.all') },
          { value: 'passed', label: t('rd.status.passed') },
          { value: 'failed', label: t('rd.status.failed') },
          { value: 'pending', label: t('rd.status.pending_test') },
        ],
        value: statusFilter,
        onChange: (value) => setStatusFilter(value as string),
      },
    ],
    [caseTypeFilter, priorityFilter, statusFilter, uniqueCaseTypes, t]
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
        searchPlaceholder={t('rd.test_page.search_placeholder')}
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
            label: t('rd.test_page.action_button.new_case'),
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
        <DialogTitle>{t('rd.test_page.dialog.new_case_title')}</DialogTitle>
        <DialogContent>
          <Stack
            spacing={2}
            sx={{ mt: 2 }}
          >
            <TextField
              label={t('rd.test_page.dialog.case_name_label')}
              fullWidth
              value={newCaseForm.case_name}
              onChange={(e) => setNewCaseForm({ ...newCaseForm, case_name: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>{t('rd.test_page.dialog.case_type_label')}</InputLabel>
              <Select
                value={newCaseForm.case_type}
                label={t('rd.test_page.dialog.case_type_label')}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, case_type: e.target.value })}
              >
                <MenuItem value='功能测试'>{t('rd.case_type.functional')}</MenuItem>
                <MenuItem value='性能测试'>{t('rd.case_type.performance')}</MenuItem>
                <MenuItem value='压力测试'>{t('rd.case_type.stress')}</MenuItem>
                <MenuItem value='UI测试'>{t('rd.case_type.ui')}</MenuItem>
                <MenuItem value='安全测试'>{t('rd.case_type.security')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>{t('rd.test_page.dialog.priority_label')}</InputLabel>
              <Select
                value={newCaseForm.priority}
                label={t('rd.test_page.dialog.priority_label')}
                onChange={(e) => setNewCaseForm({ ...newCaseForm, priority: e.target.value })}
              >
                <MenuItem value='high'>{t('rd.priority.high')}</MenuItem>
                <MenuItem value='medium'>{t('rd.priority.medium')}</MenuItem>
                <MenuItem value='low'>{t('rd.priority.low')}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label={t('rd.test_page.dialog.related_requirement_label')}
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
                {t('rd.test_page.dialog.test_report_attachment')}
              </Typography>
              <FileUpload
                value={testReportAttachments}
                onChange={setTestReportAttachments}
                accept={['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.png']}
                maxCount={5}
                maxSize={20}
                maxTotalSize={100}
                uploadText={t('rd.test_page.dialog.upload_text')}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCaseDialogOpen(false)}>
            {t('rd.test_page.dialog.cancel')}
          </Button>
          <Button
            variant='contained'
            sx={{ bgcolor: 'primary.main' }}
            onClick={handleCreateCase}
          >
            {t('rd.test_page.dialog.create')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{t('rd.test_page.dialog.detail_title')}</DialogTitle>
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
                  {t('rd.test_page.dialog.related_requirement_display', {
                    requirement: selectedCase.related_requirement,
                  })}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            {t('rd.test_page.dialog.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default RsTestPage;
