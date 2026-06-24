import React, { useState, useMemo } from 'react';
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
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/common';
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
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import type { RowAction, FilterConfig } from '@/components/templates';

interface TestCase {
  id: string;
  case_no: string;
  case_name: string;
  case_type: string;
  priority: string;
  status: string;
  related_requirement: string;
}

const mockTestCases: TestCase[] = [
  {
    id: '1',
    case_no: 'TC-001',
    case_name: '用户登录功能测试',
    case_type: '功能测试',
    priority: 'high',
    status: 'passed',
    related_requirement: 'REQ-001',
  },
  {
    id: '2',
    case_no: 'TC-002',
    case_name: '用户注册流程测试',
    case_type: '功能测试',
    priority: 'high',
    status: 'passed',
    related_requirement: 'REQ-002',
  },
  {
    id: '3',
    case_no: 'TC-003',
    case_name: '数据导出性能测试',
    case_type: '性能测试',
    priority: 'medium',
    status: 'failed',
    related_requirement: 'REQ-003',
  },
  {
    id: '4',
    case_no: 'TC-004',
    case_name: '界面兼容性测试',
    case_type: 'UI测试',
    priority: 'medium',
    status: 'pending',
    related_requirement: 'REQ-004',
  },
  {
    id: '5',
    case_no: 'TC-005',
    case_name: '压力测试',
    case_type: '压力测试',
    priority: 'low',
    status: 'pending',
    related_requirement: 'REQ-005',
  },
];

const RsTestPage: React.FC = () => {
  const [testCases, setTestCases] = useState<TestCase[]>(mockTestCases);
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

  const filteredTestCases = testCases.filter((tc) => {
    const matchesSearch =
      tc.case_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.case_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tc.related_requirement.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !caseTypeFilter || tc.case_type === caseTypeFilter;
    const matchesPriority = !priorityFilter || tc.priority === priorityFilter;
    const matchesStatus = !statusFilter || tc.status === statusFilter;
    return matchesSearch && matchesType && matchesPriority && matchesStatus;
  });

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

  const handleExecuteTest = (tc: TestCase) => {
    setTestCases(
      testCases.map((item) => (item.id === tc.id ? { ...item, status: 'passed' } : item))
    );
  };

  const handleCreateCase = () => {
    const newCase: TestCase = {
      id: String(Date.now()),
      case_no: `TC-${String(testCases.length + 1).padStart(3, '0')}`,
      case_name: newCaseForm.case_name,
      case_type: newCaseForm.case_type,
      priority: newCaseForm.priority,
      status: 'pending',
      related_requirement: newCaseForm.related_requirement,
    };
    setTestCases([newCase, ...testCases]);
    setNewCaseDialogOpen(false);
    setNewCaseForm({
      case_name: '',
      case_type: '功能测试',
      priority: 'medium',
      related_requirement: '',
    });
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
              color='#3b82f6'
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <>
      <ListPageTemplate<TestCase>
        title='测试管理'
        subtitle='管理测试用例和测试计划'
        backButton={{
          href: '/dashboard',
        }}
        columns={columns}
        data={filteredTestCases}
        searchable
        searchPlaceholder='搜索用例编号、名称...'
        searchValue={searchTerm}
        onSearch={(value) => setSearchTerm(value)}
        filters={filters}
        rowActions={rowActions}
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
            sx={{ bgcolor: '#3b82f6' }}
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
    </>
  );
};

export default RsTestPage;
