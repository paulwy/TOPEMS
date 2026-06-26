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
} from '@mui/material';
import { Button } from '@mui/material';
import { StatusBadge } from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
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
import { useAppStore } from '../../store';
import {
  ListPageTemplate,
  DashboardTemplate,
  StatCard,
  StatCardGroup,
  EmptyState,
  type ColumnDef,
  type RowAction,
} from '@/components/mui';
import {
  CardListTemplate,
  type CardAction,
  type CardRenderConfig,
  type MetricStatCard,
} from '@/components/templates';
import { FilterBar, type FilterConfig } from '@/components/mui/FilterBar';
import { AIHelperButton, AICodeGenerator, AIDataCompleter, AIFormValidator } from '@/components/ai';
import { ImageUpload, DataExport } from '@/components/common';
import type { CompletionItem as AICompletionItem } from '@/types/ai';

type ViewMode = 'list' | 'tree';

const HrmEmployeePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const addNotification = useAppStore((state) => state.addNotification);

  // 视图模式
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // 数据状态
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PaginatedResult<Employee>>({
    items: [],
    total: 0,
    page: 1,
    page_size: 10,
  });

  // 筛选状态
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [companies, setCompanies] = useState<Company[]>([]);

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
  const [treeData, setTreeData] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>();
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);

  // 统计概览展开状态
  const [expandedStats, setExpandedStats] = useState(true);

  // 获取员工列表
  const fetchEmployees = useCallback(
    async (params?: any) => {
      setLoading(true);
      try {
        const response = await employeeApi.list(params);
        if (response.code === 200 && response.data) {
          const responseData = response.data as any;
          setData({
            items: responseData.items || [],
            total: responseData.total || 0,
            page: responseData.page || 1,
            page_size: responseData.page_size || 10,
          });
          if (viewMode === 'tree') {
            setFilteredEmployees(responseData.items || []);
          }
        }
      } catch (error: unknown) {
        addNotification({
          title: '失败',
          message: (error as { message?: string }).message || '获取员工数据失败',
          type: 'error',
        });
      } finally {
        setLoading(false);
      }
    },
    [addNotification, viewMode]
  );

  // 获取部门列表
  const fetchDepartments = useCallback(async () => {
    try {
      const response = await departmentApi.list({ page_size: 100 });
      if (response.code === 200 && response.data) {
        const responseData = response.data as any;
        const depts = responseData.items || [];
        setDepartments(depts);
      }
    } catch (error: unknown) {
      apiLogger.error('Failed to fetch departments:', error);
    }
  }, []);

  // 获取公司列表
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await companyApi.list({ page_size: 100 });
      if (response.code === 200 && response.data) {
        const responseData = response.data as any;
        setCompanies(responseData.items || []);
      }
    } catch (error: unknown) {
      apiLogger.error('Failed to fetch companies:', error);
    }
  }, []);

  // 初始加载
  React.useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchCompanies();
  }, [fetchEmployees, fetchDepartments, fetchCompanies]);

  // 构建树形数据
  const buildTree = useCallback((depts: Department[], emps: Employee[]): any[] => {
    const deptMap = new Map<string, any>();
    const rootNodes: any[] = [];

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
      const empNode: any = {
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

  React.useEffect(() => {
    if (viewMode === 'tree' && departments.length > 0 && filteredEmployees.length > 0) {
      const tree = buildTree(departments, filteredEmployees);
      setTreeData(tree);
    }
  }, [viewMode, departments, filteredEmployees, buildTree]);

  // 搜索处理
  const handleSearch = useCallback(() => {
    const params: any = { search: searchText };
    if (departmentFilter && departmentFilter !== 'all') params.department_id = departmentFilter;
    if (statusFilter && statusFilter !== 'all') params.status = statusFilter;

    if (viewMode === 'list') {
      fetchEmployees(params);
    } else {
      setLoading(true);
      employeeApi
        .list({ ...params, page_size: 100 })
        .then((response) => {
          if (response.code === 200 && response.data) {
            const responseData = response.data as any;
            const emps = responseData.items || [];
            setFilteredEmployees(emps);
            const tree = buildTree(departments, emps);
            setTreeData(tree);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [
    searchText,
    departmentFilter,
    statusFilter,
    viewMode,
    fetchEmployees,
    departments,
    buildTree,
  ]);

  // 重置筛选
  const handleReset = useCallback(() => {
    setSearchText('');
    setDepartmentFilter('all');
    setStatusFilter('all');
    if (viewMode === 'list') {
      fetchEmployees();
    } else {
      fetchEmployees({ page_size: 100 });
    }
  }, [viewMode, fetchEmployees]);

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
      const response = await employeeApi.delete(deleteId);
      if (response.code === 200) {
        addNotification({
          title: '成功',
          message: '员工删除成功',
          type: 'success',
        });
        if (viewMode === 'list') {
          fetchEmployees();
        } else {
          const newEmps = filteredEmployees.filter((e) => e.id !== deleteId);
          setFilteredEmployees(newEmps);
          const tree = buildTree(departments, newEmps);
          setTreeData(tree);
        }
      } else {
        addNotification({
          title: '失败',
          message: '删除员工失败',
          type: 'error',
        });
      }
    } catch (error: unknown) {
      addNotification({
        title: '失败',
        message: (error as { message?: string }).message || '删除员工失败',
        type: 'error',
      });
    } finally {
      setConfirmDeleteOpen(false);
      setDeleteId(null);
    }
  }, [deleteId, addNotification, viewMode, fetchEmployees, filteredEmployees, departments, buildTree]);

  // 删除
  const handleDelete = useCallback(
    (id: string) => {
      setDeleteId(id);
      setConfirmDeleteOpen(true);
    },
    []
  );

  // 创建
  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await employeeApi.create(formData);
        addNotification({
          title: '成功',
          message: '员工创建成功',
          type: 'success',
        });
        setShowCreateModal(false);
        setFormData({});
        if (viewMode === 'list') {
          fetchEmployees();
        } else {
          fetchEmployees({ page_size: 100 });
        }
      } catch (error: unknown) {
        addNotification({
          title: '失败',
          message: (error as { message?: string }).message || '创建员工失败',
          type: 'error',
        });
      }
    },
    [addNotification, formData, viewMode, fetchEmployees]
  );

  // 更新
  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedEmployee) return;
      try {
        await employeeApi.update(selectedEmployee.id, formData);
        addNotification({
          title: '成功',
          message: '员工更新成功',
          type: 'success',
        });
        setShowEditModal(false);
        setSelectedEmployee(null);
        if (viewMode === 'list') {
          fetchEmployees();
        } else {
          fetchEmployees({ page_size: 100 });
        }
      } catch (error: unknown) {
        addNotification({
          title: '失败',
          message: (error as { message?: string }).message || '更新员工失败',
          type: 'error',
        });
      }
    },
    [addNotification, selectedEmployee, formData, viewMode, fetchEmployees]
  );

  // 输入变化
  const handleInputChange = useCallback((field: string, value: any) => {
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
    const updates: Record<string, any> = {};
    Object.entries(completions).forEach(([field, item]) => {
      updates[field] = item.value;
    });
    setFormData((prev) => ({ ...prev, ...updates }));
    setShowAIDataCompleter(false);
  }, []);

  const handleOpenAIFormValidator = useCallback(() => {
    setShowAIFormValidator(true);
  }, []);

  const handleApplyValidationSuggestions = useCallback((suggestions: any[]) => {
    const updates: Record<string, any> = {};
    suggestions.forEach((s) => {
      updates[s.field] = s.value;
    });
    setFormData((prev) => ({ ...prev, ...updates }));
    setShowAIFormValidator(false);
  }, []);

  // 状态徽章
  const getStatusBadge = useCallback((status: string) => {
    return <StatusBadge status={`employee_${status}`} showIcon />;
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
          format: (value: string) => {
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
        onClick: (item) => handleView(item as Employee),
        color: 'primary',
      },
      {
        label: '编辑',
        icon: <Edit style={{ width: 14, height: 14 }} />,
        onClick: (item) => handleEdit(item as Employee),
        color: 'secondary',
      },
      {
        label: '删除',
        icon: <Trash2 style={{ width: 14, height: 14 }} />,
        onClick: (item) => handleDelete((item as Employee).id),
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
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* 面包屑导航 */}
      <Box sx={{ mb: 2 }}>
        <Typography
          component='a'
          href='/hrm'
          sx={{
            color: 'text.secondary',
            textDecoration: 'none',
            fontSize: '0.875rem',
            '&:hover': { color: 'primary.main', textDecoration: 'underline' },
          }}
        >
          人力资源
        </Typography>
        <Typography
          component='span'
          sx={{ mx: 1, color: 'text.disabled' }}
        >
          /
        </Typography>
        <Typography
          component='span'
          sx={{ color: 'text.primary', fontSize: '0.875rem' }}
        >
          员工管理
        </Typography>
      </Box>

      {/* 页面标题 */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant='h5'
          sx={{ fontWeight: 600, mb: 0.5 }}
        >
          员工管理
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          管理企业员工信息
        </Typography>
      </Box>

      {/* 统计概览 */}
      <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
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
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
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
          data={data.items}
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
          onRefresh={() => fetchEmployees()}
          pagination={{
            page: data.page,
            pageSize: data.page_size,
            total: data.total,
            onPageChange: (page) => fetchEmployees({ page }),
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
          <Paper sx={{ p: 2, borderRadius: 2 }}>
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
                onSelect={(node: any) => {
                  if (node.type === 'department') {
                    setSelectedDeptId(node.id);
                  } else {
                    handleView(node.data);
                  }
                }}
              />
            )}
          </Paper>

          {/* 部门员工 */}
          <Paper sx={{ p: 2, borderRadius: 2 }}>
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
                    {filteredEmployees.filter((e) => e.department_id === selectedDeptId).length}{' '}
                    名员工
                  </Typography>
                </Box>
                <ListPageTemplate
                  columns={columns}
                  data={filteredEmployees.filter((e) => e.department_id === selectedDeptId)}
                  rowActions={rowActions}
                  onRowClick={handleView}
                  emptyMessage='该部门暂无员工'
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
    </Box>
  );
};

// ============ 员工表单模态框 ============

interface EmployeeFormDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  employee: Employee | null;
  formData: Partial<Employee>;
  onChange: (field: string, value: any) => void;
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
          slotProps={{ inputLabel: { shrink: true } }}
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
  data: any[];
  selectedId?: string;
  onSelect: (node: { id: string; name: string; children?: any[] }) => void;
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

  const renderNode = (node: any, level: number = 0) => {
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
          <Box>{node.children.map((child: any) => renderNode(child, level + 1))}</Box>
        )}
      </Box>
    );
  };

  return <Box>{data.map((node) => renderNode(node))}</Box>;
};

export default HrmEmployeePage;
