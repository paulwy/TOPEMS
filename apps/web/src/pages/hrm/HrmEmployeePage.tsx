import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Typography,
  IconButton,
  Stack,
  TextField,
  Tabs,
  Tab,
  Paper,
  Divider,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Button,
} from '@mui/material';
import { StatusBadge, ConfirmDialog } from '@topems/shared-components';
import { apiLogger } from '@/utils/logger';
import {
  Users,
  Building2,
  Mail,
  Phone,
  Briefcase,
  Eye,
  Edit,
  Trash2,
  List,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Plus,
} from 'lucide-react';
import {
  employeeApi,
  departmentApi,
  companyApi,
  type Employee,
  type Department,
  type Company,
  type PaginatedResult,
} from '@/api/hrm';
import { useNotificationStore } from '../../store';
import {
  CardListTemplate,
  type CardAction,
  type CardRenderConfig,
  type MetricStatCard,
  ListPageTemplate,
  DashboardTemplate,
  StatCard,
} from '@/components/templates';
import {
  StatCardGroup,
  EmptyState,
  FilterBar,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components';
import { AIHelperButton, AICodeGenerator, AIDataCompleter, AIFormValidator } from '@/components/ai';
import type { Suggestion, CompletionItem as AICompletionItem } from '@/types/ai';
import { ImageUpload, DataExport } from '@/components/common';
import { PageContainer } from '@/components/common/PageContainerV2';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

interface TreeNode {
  id: string;
  name: string;
  type: 'department' | 'employee';
  children?: TreeNode[];
  [key: string]: unknown;
}

interface EmployeeListParams {
  page?: number;
  pagesize?: number;
  search?: string;
  department_id?: string;
  status?: string;
  [key: string]: string | number | undefined;
}

interface ValidationSuggestion {
  field: string;
  value?: string | number;
  message?: string;
}


type ViewMode = 'list' | 'tree';

const HrmEmployeePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  // 视图模式
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // 筛选状态
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // 模态框状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // AI 功能状态
  const [showAICodeGenerator, setShowAICodeGenerator] = useState(false);
  const [showAIDataCompleter, setShowAIDataCompleter] = useState(false);
  const [showAIFormValidator, setShowAIFormValidator] = useState(false);
  const [aiGeneratorMode, setAiGeneratorMode] = useState<'create' | 'edit'>('create');

  // 表单数据
  const [formData, setFormData] = useState<Partial<Employee>>({});

  // 树形视图状态
  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>();

  // 统计概览展开状态
  const [expandedStats, setExpandedStats] = useState(true);

  // React Query - 员工列表
  const employeesQuery = useQuery({
    queryKey: ['hrm-employees', currentPage, searchText, departmentFilter, statusFilter, viewMode],
    queryFn: async () => {
      const params: EmployeeListParams = { page: currentPage };
      if (searchText) params.search = searchText;
      if (departmentFilter && departmentFilter !== 'all') params.department_id = departmentFilter;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (viewMode === 'tree') params.pagesize = 100;
      return employeeApi.list(params);
    },
    staleTime: 5 * 60 * 1000,
  });

  const data =
    employeesQuery.data?.code === 200 && employeesQuery.data.data
      ? {
          items: employeesQuery.data.data.items || [],
          total: employeesQuery.data.data.total || 0,
          page: employeesQuery.data.data.page || 1,
          pagesize: employeesQuery.data.data.pagesize || 10,
        }
      : { items: [], total: 0, page: 1, pagesize: 10 };
  const loading = employeesQuery.isLoading;

  // React Query - 部门列表
  const departmentsQuery = useQuery({
    queryKey: ['hrm-departments'],
    queryFn: () => departmentApi.list({ pagesize: 100 }),
    staleTime: 30 * 60 * 1000,
  });
  const departments =
    departmentsQuery.data?.code === 200 && departmentsQuery.data.data
      ? departmentsQuery.data.data.items || []
      : [];

  // React Query - 公司列表
  const companiesQuery = useQuery({
    queryKey: ['hrm-companies'],
    queryFn: () => companyApi.list({ pagesize: 100 }),
    staleTime: 30 * 60 * 1000,
  });
  const companies =
    companiesQuery.data?.code === 200 && companiesQuery.data.data
      ? companiesQuery.data.data.items || []
      : [];

  // React Query - Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<Employee>) => employeeApi.create(data),
    onSuccess: () => {
      addNotification({
        title: '成功',
        message: '员工创建成功',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['hrm-employees'] });
    },
    onError: (error: unknown) => {
      addNotification({
        title: '失败',
        message: (error as { message?: string }).message || '创建员工失败',
        type: 'error',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) =>
      employeeApi.update(id, data),
    onSuccess: () => {
      addNotification({
        title: '成功',
        message: '员工更新成功',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['hrm-employees'] });
    },
    onError: (error: unknown) => {
      addNotification({
        title: '失败',
        message: (error as { message?: string }).message || '更新员工失败',
        type: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => employeeApi.delete(id),
    onSuccess: () => {
      addNotification({
        title: '成功',
        message: '员工删除成功',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['hrm-employees'] });
    },
    onError: (error: unknown) => {
      addNotification({
        title: '失败',
        message: (error as { message?: string }).message || '删除员工失败',
        type: 'error',
      });
    },
  });

  // 构建树形数据
  const buildTree = useCallback((depts: Department[], emps: Employee[]): TreeNode[] => {
    const deptMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    depts.forEach((dept) => {
      deptMap.set(dept.id, {
        id: dept.id,
        name: dept.name,
        type: 'department',
        children: [],
        data: dept,
      });
    });

    depts.forEach((dept) => {
      const node = deptMap.get(dept.id)!;
      if (dept.parent_id && deptMap.has(dept.parent_id)) {
        deptMap.get(dept.parent_id)!.children!.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    emps.forEach((emp) => {
      const empNode: TreeNode = {
        id: emp.id,
        name: emp.name,
        type: 'employee',
        data: emp,
      };
      if (emp.department_id && deptMap.has(emp.department_id)) {
        deptMap.get(emp.department_id)!.children!.push(empNode);
      }
    });

    return rootNodes;
  }, []);

  const treeData = useMemo(() => {
    if (viewMode === 'tree' && departments.length > 0 && data.items.length > 0) {
      return buildTree(departments, data.items);
    }
    return [];
  }, [viewMode, departments, data.items, buildTree]);

  // 搜索处理
  const handleSearch = useCallback(() => {
    setCurrentPage(1);
  }, []);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchText('');
    setDepartmentFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  }, []);

  // 新增
  const handleAdd = useCallback(() => {
    setSelectedEmployee(null);
    setFormData({});
    setShowCreateModal(true);
  }, []);

  // 编辑
  const handleEdit = useCallback((record: Employee) => {
    setSelectedEmployee(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  // 查看
  const handleView = useCallback((record: Employee) => {
    setSelectedEmployee(record);
    setShowViewModal(true);
  }, []);

  // 删除确认状态
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
    } catch (error: unknown) {
      apiLogger.error('删除失败:', error);
    } finally {
      setConfirmDeleteOpen(false);
      setDeleteId(null);
    }
  }, [deleteId, deleteMutation]);

  // 删除
  const handleDelete = useCallback((id: string) => {
    setDeleteId(id);
    setConfirmDeleteOpen(true);
  }, []);

  // 批量删除
  const [batchDeleteIds, setBatchDeleteIds] = useState<string[]>([]);
  const [confirmBatchDeleteOpen, setConfirmBatchDeleteOpen] = useState(false);

  const handleBatchDelete = useCallback((employees: Employee[]) => {
    const ids = employees.map((e) => e.id);
    setBatchDeleteIds(ids);
    setConfirmBatchDeleteOpen(true);
  }, []);

  const handleBatchDeleteConfirm = useCallback(async () => {
    try {
      for (const id of batchDeleteIds) {
        await deleteMutation.mutateAsync(id);
      }
      addNotification({
        title: '成功',
        message: `成功删除 ${batchDeleteIds.length} 名员工`,
        type: 'success',
      });
      setConfirmBatchDeleteOpen(false);
      setBatchDeleteIds([]);
    } catch (error: unknown) {
      addNotification({
        title: '失败',
        message: (error as { message?: string }).message || '批量删除失败',
        type: 'error',
      });
    }
  }, [batchDeleteIds, deleteMutation]);

  // 创建
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await createMutation.mutateAsync(formData);
        setShowCreateModal(false);
        setFormData({});
      } catch (error: unknown) {
        apiLogger.error('创建失败:', error);
      }
    },
    [createMutation, formData]
  );

  // 更新
  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedEmployee) return;
      try {
        await updateMutation.mutateAsync({ id: selectedEmployee.id, data: formData });
        setShowEditModal(false);
        setSelectedEmployee(null);
      } catch (error: unknown) {
        apiLogger.error('更新失败:', error);
      }
    },
    [updateMutation, selectedEmployee, formData]
  );

  // 输入变化
  const handleInputChange = useCallback((field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // AI 功能
  const handleOpenAICodeGenerator = useCallback((mode: 'create' | 'edit') => {
    setAiGeneratorMode(mode);
    setShowAICodeGenerator(true);
  }, []);

  const handleSelectAICode = useCallback((code: string) => {
    setFormData((prev) => ({ ...prev, employee_no: code }));
  }, []);

  const handleOpenAIDataCompleter = useCallback(() => {
    setShowAIDataCompleter(true);
  }, []);

  const handleApplyCompletion = useCallback((completions: Record<string, AICompletionItem>) => {
    const updates: Record<string, unknown> = {};
    Object.entries(completions).forEach(([field, item]) => {
      updates[field] = item.value;
    });
    setFormData((prev) => ({ ...prev, ...updates }));
    setShowAIDataCompleter(false);
  }, []);

  const handleOpenAIFormValidator = useCallback(() => {
    setShowAIFormValidator(true);
  }, []);

  const handleApplyValidationSuggestions = useCallback(
    (suggestions: { field: string; value: unknown }[]) => {
      const updates: Record<string, unknown> = {};
      suggestions.forEach((s) => {
        updates[s.field] = s.value;
      });
      setFormData((prev) => ({ ...prev, ...updates }));
      setShowAIFormValidator(false);
    },
    []
  );

  // 状态徽章
  const getStatusBadge = useCallback((status: string) => {
    return (
      <StatusBadge
        status={`employee_${status}`}
        showIcon
      />
    );
  }, []);

  // 统计卡片数据
  const employeeStats = useMemo(() => {
    const allEmployees = data.items;
    return {
      total: allEmployees.length,
      active: allEmployees.filter((e) => e.status === 'active').length,
      inactive: allEmployees.filter((e) => e.status === 'inactive').length,
      activeRate:
        allEmployees.length > 0
          ? Math.round(
              (allEmployees.filter((e) => e.status === 'active').length / allEmployees.length) * 100
            )
          : 0,
    };
  }, [data.items]);

  // 统计卡片 - CardListTemplate格式
  const metricStats = useMemo<MetricStatCard[]>(
    () => [
      {
        id: 'total',
        title: '员工总数',
        value: employeeStats.total,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: 'primary' as const,
      },
      {
        id: 'active',
        title: '在职员工',
        value: employeeStats.active,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: 'success' as const,
      },
      {
        id: 'inactive',
        title: '离职员工',
        value: employeeStats.inactive,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: 'error' as const,
      },
      {
        id: 'rate',
        title: '在职率',
        value: `${employeeStats.activeRate}%`,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: 'info' as const,
      },
    ],
    [employeeStats]
  );

  // 卡片配置
  const cardConfig = useMemo<CardRenderConfig>(
    () => ({
      title: (item) => {
        const emp = item as Employee;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.light',
                color: 'primary.main',
                fontSize: '0.875rem',
              }}
            >
              {emp.name?.charAt(0) || '?'}
            </Avatar>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {emp.name}
              </Typography>
              {emp.employee_no && (
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {emp.employee_no}
                </Typography>
              )}
            </Box>
          </Box>
        );
      },
      description: (item) => (item as Employee).position || '未设置职位',
      status: {
        field: 'status',
        options: {
          active: { label: '在职', color: 'success' },
          inactive: { label: '离职', color: 'default' },
        },
      },
      meta: [
        {
          field: 'department_id',
          label: '部门',
          icon: <Building2 sx={{ width: 14, height: 14 }} />,
          format: (value) => {
            const dept = departments.find((d) => d.id === value);
            return dept?.name || '-';
          },
        },
        {
          field: 'email',
          label: '邮箱',
          icon: <Mail sx={{ width: 14, height: 14 }} />,
        },
        {
          field: 'phone',
          label: '电话',
          icon: <Phone sx={{ width: 14, height: 14 }} />,
        },
      ],
    }),
    [departments]
  );

  // 卡片操作
  const cardActions = useMemo<CardAction[]>(
    () => [
      {
        label: '查看',
        icon: <Eye style={{ width: 14, height: 14 }} />,
        onClick: (item) => handleView(item as unknown as Employee),
        color: 'primary',
      },
      {
        label: '编辑',
        icon: <Edit style={{ width: 14, height: 14 }} />,
        onClick: (item) => handleEdit(item as unknown as Employee),
        color: 'secondary',
      },
      {
        label: '删除',
        icon: <Trash2 style={{ width: 14, height: 14 }} />,
        onClick: (item) => handleDelete((item as unknown as Employee).id),
        color: 'error',
        divider: true,
      },
    ],
    [handleView, handleEdit, handleDelete]
  );

  // 表格列定义
  const columns = useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        id: 'name',
        label: '员工信息',
        minWidth: 200,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.light',
                color: 'primary.main',
                fontSize: '0.875rem',
              }}
            >
              {row.name?.charAt(0) || '?'}
            </Avatar>
            <Box>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {row.name}
              </Typography>
              {row.employee_no && (
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  {row.employee_no}
                </Typography>
              )}
            </Box>
          </Box>
        ),
      },
      {
        id: 'department_id',
        label: '所属部门',
        minWidth: 150,
        render: (row) => {
          const dept = departments.find((d) => d.id === row.department_id);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Building2 sx={{ width: 16, height: 16, color: 'text.secondary' }} />
              <Typography variant='body2'>{dept?.name || '-'}</Typography>
            </Box>
          );
        },
      },
      {
        id: 'position',
        label: '职位',
        minWidth: 120,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Briefcase sx={{ width: 16, height: 16, color: 'text.secondary' }} />
            <Typography variant='body2'>{row.position || '-'}</Typography>
          </Box>
        ),
      },
      {
        id: 'email',
        label: '邮箱',
        minWidth: 180,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Mail sx={{ width: 16, height: 16, color: 'text.secondary' }} />
            <Typography
              variant='body2'
              sx={{ fontSize: '0.8125rem' }}
            >
              {row.email || '-'}
            </Typography>
          </Box>
        ),
      },
      {
        id: 'phone',
        label: '电话',
        minWidth: 130,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Phone sx={{ width: 16, height: 16, color: 'text.secondary' }} />
            <Typography variant='body2'>{row.phone || '-'}</Typography>
          </Box>
        ),
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => getStatusBadge(row.status),
      },
    ],
    [departments, getStatusBadge]
  );

  // 导出字段配置
  const exportFields = useMemo(
    () => [
      { key: 'name', title: '员工姓名' },
      { key: 'employee_no', title: '工号' },
      { key: 'position', title: '职位' },
      { key: 'email', title: '邮箱' },
      { key: 'phone', title: '电话' },
      { key: 'status', title: '状态' },
    ],
    []
  );

  // 行操作
  const rowActions = useMemo<RowAction<Employee>[]>(
    () => [
      {
        label: '查看详情',
        icon: <Eye style={{ width: 16, height: 16 }} />,
        onClick: handleView,
      },
      {
        label: '编辑',
        icon: <Edit style={{ width: 16, height: 16 }} />,
        onClick: handleEdit,
        color: 'primary',
      },
      {
        label: '删除',
        icon: <Trash2 style={{ width: 16, height: 16 }} />,
        onClick: (row) => handleDelete(row.id),
        color: 'error',
        divider: true,
      },
    ],
    [handleView, handleEdit, handleDelete]
  );

  // 筛选配置
  const filterConfigs = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'search',
        label: '搜索',
        type: 'text',
        placeholder: '搜索姓名、工号、邮箱...',
        width: 250,
      },
      {
        id: 'department',
        label: '部门',
        type: 'select',
        options: departments.map((d) => ({ label: d.name, value: d.id })),
      },
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '在职', value: 'active' },
          { label: '离职', value: 'inactive' },
        ],
      },
    ],
    [departments]
  );

  // 统计卡片
  const statCards = useMemo(
    () => [
      {
        id: 'total',
        title: '员工总数',
        value: employeeStats.total,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: 'primary' as const,
      },
      {
        id: 'active',
        title: '在职员工',
        value: employeeStats.active,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: 'success' as const,
      },
      {
        id: 'inactive',
        title: '离职员工',
        value: employeeStats.inactive,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: 'error' as const,
      },
      {
        id: 'rate',
        title: '在职率',
        value: `${employeeStats.activeRate}%`,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: 'info' as const,
      },
    ],
    [employeeStats]
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
      title='员工管理'
      subtitle='管理企业员工信息'
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Users style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main}, ${ct.success.dark})`,
      }}
    >
      {/* 统计概览 */}
      <Paper sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={() => setExpandedStats(!expandedStats)}
        >
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600 }}
          >
            员工概览
          </Typography>
          {expandedStats ? (
            <ChevronUp sx={{ color: 'text.secondary' }} />
          ) : (
            <ChevronDown sx={{ color: 'text.secondary' }} />
          )}
        </Box>

        {expandedStats && (
          <Box sx={{ p: 2, pt: 0 }}>
            <StatCardGroup
              stats={statCards}
              columns={4}
            />
          </Box>
        )}
      </Paper>

      {/* 筛选栏 */}
      <FilterBar
        filters={filterConfigs}
        onFilterChange={(filters) => {
          if (filters.search !== undefined) setSearchText(filters.search as string);
          if (filters.department !== undefined) setDepartmentFilter(filters.department as string);
          if (filters.status !== undefined) setStatusFilter(filters.status as string);
        }}
        onReset={handleReset}
        onSearch={handleSearch}
      />

      {/* 操作栏 */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              bgcolor: 'grey.100',
              borderRadius: 1,
              p: 0.5,
            }}
          >
            <Button
              size='small'
              variant={viewMode === 'list' ? 'contained' : 'text'}
              onClick={() => setViewMode('list')}
              startIcon={<List style={{ width: 16, height: 16 }} />}
            >
              列表
            </Button>
            <Button
              size='small'
              variant={viewMode === 'tree' ? 'contained' : 'text'}
              onClick={() => setViewMode('tree')}
              startIcon={<LayoutGrid style={{ width: 16, height: 16 }} />}
            >
              树形
            </Button>
          </Box>
          <DataExport
            data={data.items as unknown as Record<string, unknown>[]}
            fields={exportFields}
            defaultFileName='员工数据'
            buttonText='导出'
          />
          <Button
            variant='contained'
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={handleAdd}
          >
            新增员工
          </Button>
        </Box>
      </Paper>

      {/* 列表视图 - CardListTemplate */}
      {viewMode === 'list' && (
        <CardListTemplate
          title='员工列表'
          subtitle='管理企业员工信息'
          metricStats={metricStats}
          metricColumns={4}
          data={data.items as unknown as Record<string, unknown>[]}
          cardConfig={cardConfig}
          loading={loading}
          emptyState={{
            emoji: '👥',
            title: '暂无员工数据',
            description: '点击上方按钮添加第一位员工',
            actionLabel: '新增员工',
            onAction: handleAdd,
          }}
          search={{
            value: searchText,
            onChange: setSearchText,
            placeholder: '搜索姓名、工号、邮箱...',
          }}
          filters={[
            {
              id: 'department',
              label: '部门',
              type: 'select' as const,
              options: [
                { label: '全部部门', value: 'all' },
                ...departments.map((d) => ({ label: d.name, value: d.id })),
              ],
            },
            {
              id: 'status',
              label: '状态',
              type: 'select' as const,
              options: [
                { label: '全部状态', value: 'all' },
                { label: '在职', value: 'active' },
                { label: '离职', value: 'inactive' },
              ],
            },
          ]}
          filterValues={{
            department: departmentFilter,
            status: statusFilter,
          }}
          onFilterChange={(filters) => {
            if (filters.department !== undefined) setDepartmentFilter(filters.department as string);
            if (filters.status !== undefined) setStatusFilter(filters.status as string);
          }}
          onFilterReset={handleReset}
          onSearch={handleSearch}
          addButton={{
            text: '新增员工',
            icon: <Plus style={{ width: 18, height: 18 }} />,
            onClick: handleAdd,
          }}
          onRefresh={() => employeesQuery.refetch()}
          pagination={{
            page: data.page,
            pageSize: data.pagesize,
            total: data.total,
            onPageChange: (page) => setCurrentPage(page),
          }}
          cardActions={cardActions}
          onCardClick={(item) => handleView(item as Employee)}
          showStatsOverview={false}
          gridColumns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
          customToolbar={
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  p: 0.5,
                }}
              >
                <Button
                  size='small'
                  variant='contained'
                  onClick={() => setViewMode('list')}
                  startIcon={<List style={{ width: 16, height: 16 }} />}
                >
                  列表
                </Button>
                <Button
                  size='small'
                  variant='text'
                  onClick={() => setViewMode('tree')}
                  startIcon={<LayoutGrid style={{ width: 16, height: 16 }} />}
                >
                  树形
                </Button>
              </Box>
              <DataExport
                data={data.items as unknown as Record<string, unknown>[]}
                fields={exportFields}
                defaultFileName='员工数据'
                buttonText='导出'
              />
            </Box>
          }
        />
      )}

      {/* 树形视图 */}
      {viewMode === 'tree' && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { md: '1fr 2fr' },
            gap: 3,
          }}
        >
          {/* 部门树 */}
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography
              variant='subtitle2'
              sx={{ fontWeight: 600, mb: 2 }}
            >
              部门列表
            </Typography>
            {loading ? (
              <Typography color='text.secondary'>加载中...</Typography>
            ) : treeData.length === 0 ? (
              <EmptyState
                emoji='🏢'
                title='暂无部门数据'
                compact
              />
            ) : (
              <TreeViewComponent
                data={treeData}
                selectedId={selectedDeptId}
                onSelect={(node: TreeNode) => {
                  if (node.type === 'department') {
                    setSelectedDeptId(node.id);
                  } else {
                    handleView(node.data as Employee);
                  }
                }}
              />
            )}
          </Paper>

          {/* 部门员工 */}
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            {selectedDeptId ? (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 600 }}
                  >
                    {departments.find((d) => d.id === selectedDeptId)?.name}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {data.items.filter((e: Employee) => e.department_id === selectedDeptId).length}{' '}
                    名员工
                  </Typography>
                </Box>
                <ListPageTemplate
                  columns={columns}
                  data={data.items.filter((e: Employee) => e.department_id === selectedDeptId)}
                  rowActions={rowActions}
                  onRowClick={handleView}
                  emptyMessage='该部门暂无员工'
                  exportable
                  exportFileName='员工列表'
                  exportTransform={(row: Employee) => ({
                    id: row.id,
                    name: row.name,
                    employee_no: row.employee_no || '',
                    email: row.email || '',
                    phone: row.phone || '',
                    department_name: row.department_name || '',
                    position_name: row.position || '',
                    status: row.status === 'active' ? '在职' : '离职',
                    hired_date: row.hire_date || '',
                  })}
                  batchActions={[
                    {
                      label: '批量删除',
                      icon: <Trash2 size={16} />,
                      onClick: handleBatchDelete,
                    },
                  ]}
                />
              </>
            ) : (
              <EmptyState
                emoji='👈'
                title='选择部门查看员工'
                description='从左侧部门树中选择一个部门，查看部门成员信息'
                compact
              />
            )}
          </Paper>
        </Box>
      )}

      {/* 新增/编辑模态框 */}
      <EmployeeFormDialog
        open={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
        }}
        mode={showCreateModal ? 'create' : 'edit'}
        employee={selectedEmployee}
        formData={formData}
        onChange={handleInputChange}
        onSubmit={showCreateModal ? handleCreate : handleUpdate}
        companies={companies}
        departments={departments}
        onOpenAICodeGenerator={handleOpenAICodeGenerator}
        onOpenAIDataCompleter={handleOpenAIDataCompleter}
        onOpenAIFormValidator={handleOpenAIFormValidator}
      />

      {/* 查看详情模态框 */}
      <Dialog
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>员工详情</DialogTitle>
        <DialogContent>
          {selectedEmployee && (
            <Box sx={{ display: 'grid', gridTemplateColumns: 2, gap: 2, pt: 1 }}>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  员工姓名
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {selectedEmployee.name}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  工号
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {selectedEmployee.employee_no || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  邮箱
                </Typography>
                <Typography variant='body2'>{selectedEmployee.email || '-'}</Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  电话
                </Typography>
                <Typography variant='body2'>{selectedEmployee.phone || '-'}</Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  部门
                </Typography>
                <Typography variant='body2'>
                  {departments.find((d) => d.id === selectedEmployee.department_id)?.name || '-'}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  职位
                </Typography>
                <Typography variant='body2'>{selectedEmployee.position || '-'}</Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  入职日期
                </Typography>
                <Typography variant='body2'>{selectedEmployee.hire_date || '-'}</Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  状态
                </Typography>
                <Box sx={{ mt: 0.5 }}>{getStatusBadge(selectedEmployee.status)}</Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
          <Button
            variant='contained'
            onClick={() => {
              setShowViewModal(false);
              handleEdit(selectedEmployee!);
            }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI 组件 */}
      <AICodeGenerator
        isOpen={showAICodeGenerator}
        onClose={() => setShowAICodeGenerator(false)}
        context={{ entityType: 'employee', name: (formData as Employee)?.name }}
        onSelect={handleSelectAICode}
        existingCodes={data.items.map((e) => e.employee_no).filter(Boolean) as string[]}
      />
      <AIDataCompleter
        isOpen={showAIDataCompleter}
        onClose={() => setShowAIDataCompleter(false)}
        completeRequest={{
          partialData: formData,
          context: { module: 'hrm', entityType: 'employee' },
        }}
        onApplyCompletion={handleApplyCompletion}
      />
      <AIFormValidator
        isOpen={showAIFormValidator}
        onClose={() => setShowAIFormValidator(false)}
        validateRequest={{
          data: formData,
          context: { module: 'hrm', entityType: 'employee' },
        }}
        onApplySuggestions={handleApplyValidationSuggestions}
        onFixIssue={() => {}}
      />

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title='确认删除'
        message='确定要删除这个员工吗？'
        danger
      />

      {/* 批量删除确认对话框 */}
      <ConfirmDialog
        isOpen={confirmBatchDeleteOpen}
        onClose={() => setConfirmBatchDeleteOpen(false)}
        onConfirm={handleBatchDeleteConfirm}
        title='批量删除确认'
        message={`确定要删除选中的 ${batchDeleteIds.length} 名员工吗？`}
        danger
      />
    </PageContainer>
  );
};

// ============ 员工表单模态框 ============

interface EmployeeFormDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  employee: Employee | null;
  formData: Partial<Employee>;
  onChange: (field: string, value: unknown) => void;
  onSubmit: (e: React.FormEvent) => void;
  companies: Company[];
  departments: Department[];
  onOpenAICodeGenerator: (mode: 'create' | 'edit') => void;
  onOpenAIDataCompleter: () => void;
  onOpenAIFormValidator: () => void;
}

const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
  open,
  onClose,
  mode,
  employee,
  formData,
  onChange,
  onSubmit,
  companies,
  departments,
  onOpenAICodeGenerator,
  onOpenAIDataCompleter,
  onOpenAIFormValidator,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth='sm'
    fullWidth
  >
    <DialogTitle>{mode === 'create' ? '新增员工' : '编辑员工'}</DialogTitle>
    <DialogContent>
      <Box
        component='form'
        onSubmit={onSubmit}
        sx={{ display: 'grid', gap: 2, pt: 1 }}
      >
        <FormControl
          size='small'
          fullWidth
        >
          <InputLabel>所属公司 *</InputLabel>
          <Select
            value={(formData as Employee)?.company_id || ''}
            label='所属公司 *'
            onChange={(e) => onChange('company_id', e.target.value)}
            required
          >
            {companies.map((c) => (
              <MenuItem
                key={c.id}
                value={c.id}
              >
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ mb: 1, display: 'block' }}
          >
            员工头像
          </Typography>
          <ImageUpload
            value={(formData as any)?.avatar_url ? [(formData as any).avatar_url as string] : []}
            onChange={(files) => onChange('avatar_url', files[0] || '')}
            maxCount={1}
            accept='image/*'
            cropEnabled
            cropAspect={1}
            height={120}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 2, gap: 2 }}>
          <TextField
            label='员工姓名 *'
            size='small'
            value={(formData as Employee)?.name || ''}
            onChange={(e) => onChange('name', e.target.value)}
            required
          />
          <Box sx={{ position: 'relative' }}>
            <TextField
              label='工号'
              size='small'
              value={(formData as Employee)?.employee_no || ''}
              onChange={(e) => onChange('employee_no', e.target.value)}
              fullWidth
            />
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 2, gap: 2 }}>
          <TextField
            label='邮箱'
            type='email'
            size='small'
            value={(formData as Employee)?.email || ''}
            onChange={(e) => onChange('email', e.target.value)}
          />
          <TextField
            label='电话'
            size='small'
            value={(formData as Employee)?.phone || ''}
            onChange={(e) => onChange('phone', e.target.value)}
          />
        </Box>

        <FormControl
          size='small'
          fullWidth
        >
          <InputLabel>所属部门</InputLabel>
          <Select
            value={(formData as Employee)?.department_id || ''}
            label='所属部门'
            onChange={(e) => onChange('department_id', e.target.value)}
          >
            <MenuItem value=''>无</MenuItem>
            {departments.map((d) => (
              <MenuItem
                key={d.id}
                value={d.id}
              >
                {d.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label='职位'
          size='small'
          value={(formData as Employee)?.position || ''}
          onChange={(e) => onChange('position', e.target.value)}
        />

        <TextField
          label='入职日期'
          type='date'
          size='small'
          value={(formData as Employee)?.hire_date || ''}
          onChange={(e) => onChange('hire_date', e.target.value)}
          slotProps={{ inputLabel: { shrink: true } } as any}
        />

        <FormControl
          size='small'
          fullWidth
        >
          <InputLabel>状态</InputLabel>
          <Select
            value={(formData as Employee)?.status || 'active'}
            label='状态'
            onChange={(e) => onChange('status', e.target.value)}
          >
            <MenuItem value='active'>在职</MenuItem>
            <MenuItem value='inactive'>离职</MenuItem>
          </Select>
        </FormControl>

        <DialogActions sx={{ p: 0, pt: 2, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <AIHelperButton
              type='generate'
              onClick={() => onOpenAICodeGenerator(mode)}
              size='small'
              label='生成工号'
            />
            <AIHelperButton
              type='complete'
              onClick={onOpenAIDataCompleter}
              size='small'
              label='智能补全'
            />
            <AIHelperButton
              type='validate'
              onClick={onOpenAIFormValidator}
              size='small'
              label='AI校验'
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              onClick={onClose}
              variant='outlined'
            >
              取消
            </Button>
            <Button
              type='submit'
              variant='contained'
            >
              {mode === 'create' ? '创建' : '保存'}
            </Button>
          </Box>
        </DialogActions>
      </Box>
    </DialogContent>
  </Dialog>
);

// ============ 简单树形组件 ============

interface TreeViewComponentProps {
  data: TreeNode[];
  selectedId?: string;
  onSelect: (node: TreeNode) => void;
}

const TreeViewComponent: React.FC<TreeViewComponentProps> = ({ data, selectedId, onSelect }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedId === node.id;

    return (
      <Box key={node.id}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            py: 0.75,
            pl: level * 2 + 1,
            cursor: 'pointer',
            borderRadius: 1,
            bgcolor: isSelected ? 'primary.light' : 'transparent',
            '&:hover': {
              bgcolor: isSelected ? 'primary.light' : 'action.hover',
            },
          }}
          onClick={() => {
            if (node.type === 'department' && hasChildren) {
              toggleExpand(node.id);
            }
            onSelect(node);
          }}
        >
          {hasChildren && (
            <IconButton
              size='small'
              sx={{ p: 0.25 }}
            >
              {isExpanded ? (
                <ChevronDown sx={{ width: 16, height: 16 }} />
              ) : (
                <ChevronRight sx={{ width: 16, height: 16 }} />
              )}
            </IconButton>
          )}
          {!hasChildren && <Box sx={{ width: 24 }} />}
          {node.type === 'department' ? (
            <Building2 sx={{ width: 16, height: 16, color: 'success.main' }} />
          ) : (
            <Users sx={{ width: 16, height: 16, color: 'primary.main' }} />
          )}
          <Typography
            variant='body2'
            sx={{ flex: 1 }}
          >
            {node.name}
          </Typography>
          {node.type === 'department' && node.children && (
            <Chip
              label={node.children.length}
              size='small'
              sx={{ height: 20, fontSize: '0.75rem' }}
            />
          )}
        </Box>
        {hasChildren && isExpanded && (
          <Box>{node.children?.map((child: TreeNode) => renderNode(child, level + 1))}</Box>
        )}
      </Box>
    );
  };

  return <Box>{data.map((node) => renderNode(node))}</Box>;
};

export default HrmEmployeePage;

// Phase 7-2: React Query migration tagged
