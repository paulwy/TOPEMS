import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Avatar,
  Typography,
  Stack,
  Paper,
  useTheme,
  useMediaQuery,
  Button,
} from '@mui/material';
import { StatusBadge, ConfirmDialog, Hidden } from '@topems/shared-components';
import { useResponsive } from '@/hooks/useResponsive';
import { useUrlState } from '@/hooks';
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
import { useNotificationStore } from '../../../store';
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
import { AICodeGenerator, AIDataCompleter, AIFormValidator } from '@/components/ai';
import type { Suggestion, CompletionItem as AICompletionItem } from '@/types/ai';
import { DataExport } from '@/components/common';
import { PageContainer } from '@/components/common/PageContainerV2';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { designTokens } from '@/theme/tokens';

import EmployeeFormDialog from './components/EmployeeFormDialog';
import TreeViewComponent from './components/TreeViewComponent';
import EmployeeDetailDialog from './components/EmployeeDetailDialog';
import type { TreeNode, EmployeeListParams, ViewMode } from './types';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const HrmEmployeePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { isMobile, isTablet } = useResponsive();
  const isMdOrSmaller = useMediaQuery(theme.breakpoints.down('md'));
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [viewMode, setViewMode] = useUrlState<ViewMode>('view', 'list', {
    mode: 'replace',
    removeDefault: true,
  });

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [showAICodeGenerator, setShowAICodeGenerator] = useState(false);
  const [showAIDataCompleter, setShowAIDataCompleter] = useState(false);
  const [showAIFormValidator, setShowAIFormValidator] = useState(false);
  const [aiGeneratorMode, setAiGeneratorMode] = useState<'create' | 'edit'>('create');

  const [formData, setFormData] = useState<Partial<Employee>>({});

  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>();

  const [expandedStats, setExpandedStats] = useState(true);

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

  const departmentsQuery = useQuery({
    queryKey: ['hrm-departments'],
    queryFn: () => departmentApi.list({ pagesize: 100 }),
    staleTime: 30 * 60 * 1000,
  });
  const departments =
    departmentsQuery.data?.code === 200 && departmentsQuery.data.data
      ? departmentsQuery.data.data.items || []
      : [];

  const companiesQuery = useQuery({
    queryKey: ['hrm-companies'],
    queryFn: () => companyApi.list({ pagesize: 100 }),
    staleTime: 30 * 60 * 1000,
  });
  const companies =
    companiesQuery.data?.code === 200 && companiesQuery.data.data
      ? companiesQuery.data.data.items || []
      : [];

  const createMutation = useMutation({
    mutationFn: (data: Partial<Employee>) => employeeApi.create(data),
    onSuccess: () => {
      addNotification({
        title: t('hrm.hrm_employee_page_index.success'),
        message: t('hrm.hrm_employee_page_index.create'),
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['hrm-employees'] });
    },
    onError: (error: unknown) => {
      addNotification({
        title: t('hrm.hrm_employee_page_index.fail'),
        message: (error as { message?: string }).message || t('hrm.hrm_employee_page_index.create_1'),
        type: 'error',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) =>
      employeeApi.update(id, data),
    onSuccess: () => {
      addNotification({
        title: t('hrm.hrm_employee_page_index.success'),
        message: t('hrm.hrm_employee_page_index.update'),
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['hrm-employees'] });
    },
    onError: (error: unknown) => {
      addNotification({
        title: t('hrm.hrm_employee_page_index.fail'),
        message: (error as { message?: string }).message || t('hrm.hrm_employee_page_index.update_1'),
        type: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => employeeApi.delete(id),
    onSuccess: () => {
      addNotification({
        title: t('hrm.hrm_employee_page_index.success'),
        message: t('hrm.hrm_employee_page_index.delete_success'),
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['hrm-employees'] });
    },
    onError: (error: unknown) => {
      addNotification({
        title: t('hrm.hrm_employee_page_index.fail'),
        message: (error as { message?: string }).message || t('hrm.hrm_employee_page_index.delete'),
        type: 'error',
      });
    },
  });

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

  const handleSearch = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const handleReset = useCallback(() => {
    setSearchText('');
    setDepartmentFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  }, [t]);

  const handleAdd = useCallback(() => {
    setSelectedEmployee(null);
    setFormData({});
    setShowCreateModal(true);
  }, []);

  const handleEdit = useCallback((record: Employee) => {
    setSelectedEmployee(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  const handleView = useCallback((record: Employee) => {
    setSelectedEmployee(record);
    setShowViewModal(true);
  }, []);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
    } catch (error: unknown) {
      apiLogger.error(t('hrm.hrm_employee_page_index.delete_1'), error);
    } finally {
      setConfirmDeleteOpen(false);
      setDeleteId(null);
    }
  }, [deleteId, deleteMutation]);

  const handleDelete = useCallback((id: string) => {
    setDeleteId(id);
    setConfirmDeleteOpen(true);
  }, []);

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
        title: t('hrm.hrm_employee_page_index.success'),
        message: `成功删除 ${batchDeleteIds.length} 名员工`,
        type: 'success',
      });
      setConfirmBatchDeleteOpen(false);
      setBatchDeleteIds([]);
    } catch (error: unknown) {
      addNotification({
        title: t('hrm.hrm_employee_page_index.fail'),
        message: (error as { message?: string }).message || t('hrm.hrm_employee_page_index.batch_delete'),
        type: 'error',
      });
    }
  }, [batchDeleteIds, deleteMutation]);

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await createMutation.mutateAsync(formData);
        setShowCreateModal(false);
        setFormData({});
      } catch (error: unknown) {
        apiLogger.error(t('hrm.hrm_employee_page_index.create_2'), error);
      }
    },
    [createMutation, formData]
  );

  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedEmployee) return;
      try {
        await updateMutation.mutateAsync({ id: selectedEmployee.id, data: formData });
        setShowEditModal(false);
        setSelectedEmployee(null);
      } catch (error: unknown) {
        apiLogger.error(t('hrm.hrm_employee_page_index.update_2'), error);
      }
    },
    [updateMutation, selectedEmployee, formData]
  );

  const handleInputChange = useCallback((field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

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

  const getStatusBadge = useCallback((status: string) => {
    return (
      <StatusBadge
        status={`employee_${status}`}
        showIcon
      />
    );
  }, []);

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

  const metricStats = useMemo<MetricStatCard[]>(
    () => [
      {
        id: 'total',
        title: t('hrm.hrm_employee_page_index.text_97e957'),
        value: employeeStats.total,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: 'primary' as const,
      },
      {
        id: 'active',
        title: t('hrm.hrm_employee_page_index.text_4d9eda'),
        value: employeeStats.active,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: 'success' as const,
      },
      {
        id: 'inactive',
        title: t('hrm.hrm_employee_page_index.text_683919'),
        value: employeeStats.inactive,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: 'error' as const,
      },
      {
        id: 'rate',
        title: t('hrm.hrm_employee_page_index.text_7200f2'),
        value: `${employeeStats.activeRate}%`,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: 'info' as const,
      },
    ],
    [employeeStats]
  );

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
      description: (item) => (item as Employee).position || t('hrm.hrm_employee_page_index.text_3332ab'),
      status: {
        field: 'status',
        options: {
          active: { label: t('hrm.hrm_employee_page_index.text_b5509b'), color: 'success' },
          inactive: { label: t('hrm.hrm_employee_page_index.text_583e79'), color: 'default' },
        },
      },
      meta: [
        {
          field: 'department_id',
          label: t('hrm.hrm_employee_page_index.text_1e1459'),
          icon: <Building2 sx={{ width: 14, height: 14 }} />,
          format: (value) => {
            const dept = departments.find((d) => d.id === value);
            return dept?.name || '-';
          },
        },
        {
          field: 'email',
          label: t('hrm.hrm_employee_page_index.email'),
          icon: <Mail sx={{ width: 14, height: 14 }} />,
        },
        {
          field: 'phone',
          label: t('hrm.hrm_employee_page_index.phone'),
          icon: <Phone sx={{ width: 14, height: 14 }} />,
        },
      ],
    }),
    [departments]
  );

  const cardActions = useMemo<CardAction[]>(
    () => [
      {
        label: t('hrm.hrm_employee_page_index.view'),
        icon: <Eye style={{ width: 14, height: 14 }} />,
        onClick: (item) => handleView(item as unknown as Employee),
        color: 'primary',
      },
      {
        label: t('hrm.hrm_employee_page_index.edit'),
        icon: <Edit style={{ width: 14, height: 14 }} />,
        onClick: (item) => handleEdit(item as unknown as Employee),
        color: 'secondary',
      },
      {
        label: t('hrm.hrm_employee_page_index.delete_3'),
        icon: <Trash2 style={{ width: 14, height: 14 }} />,
        onClick: (item) => handleDelete((item as unknown as Employee).id),
        color: 'error',
        divider: true,
      },
    ],
    [handleView, handleEdit, handleDelete]
  );

  const columns = useMemo<ColumnDef<Employee>[]>(
    () => {
      const nameColumn = {
        id: 'name',
        label: t('hrm.hrm_employee_page_index.info'),
        minWidth: isMobile ? 120 : 200,
        render: (row: Employee) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: isMobile ? 1 : 1.5 }}>
            <Avatar
              sx={{
                width: isMobile ? 32 : 40,
                height: isMobile ? 32 : 40,
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
      };

      const statusColumn = {
        id: 'status',
        label: t('hrm.hrm_employee_page_index.status'),
        width: isMobile ? 80 : 100,
        render: (row: Employee) => getStatusBadge(row.status),
      };

      if (isMobile) {
        return [nameColumn, statusColumn];
      }

      if (isTablet) {
        return [
          nameColumn,
          {
            id: 'department_id',
            label: t('hrm.hrm_employee_page_index.text_68923b'),
            minWidth: 100,
            render: (row: Employee) => {
              const dept = departments.find((d) => d.id === row.department_id);
              return (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Building2 sx={{ width: 16, height: 16, color: 'text.secondary' }} />
                  <Typography variant='body2'>{dept?.name || '-'}</Typography>
                </Box>
              );
            },
          },
          statusColumn,
        ];
      }

      return [
        nameColumn,
        {
          id: 'department_id',
          label: t('hrm.hrm_employee_page_index.text_68923b'),
          minWidth: 150,
          render: (row: Employee) => {
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
          label: t('hrm.hrm_employee_page_index.text_b652de'),
          minWidth: 120,
          render: (row: Employee) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Briefcase sx={{ width: 16, height: 16, color: 'text.secondary' }} />
              <Typography variant='body2'>{row.position || '-'}</Typography>
            </Box>
          ),
        },
        {
          id: 'email',
          label: t('hrm.hrm_employee_page_index.email'),
          minWidth: 180,
          render: (row: Employee) => (
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
          label: t('hrm.hrm_employee_page_index.phone'),
          minWidth: 130,
          render: (row: Employee) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Phone sx={{ width: 16, height: 16, color: 'text.secondary' }} />
              <Typography variant='body2'>{row.phone || '-'}</Typography>
            </Box>
          ),
        },
        statusColumn,
      ];
    },
    [departments, getStatusBadge, isMobile, isTablet]
  );

  const exportFields = useMemo(
    () => [
      { key: 'name', title: t('hrm.hrm_employee_page_index.text_50df90') },
      { key: 'employee_no', title: t('hrm.hrm_employee_page_index.text_752d38') },
      { key: 'position', title: t('hrm.hrm_employee_page_index.text_b652de') },
      { key: 'email', title: t('hrm.hrm_employee_page_index.email') },
      { key: 'phone', title: t('hrm.hrm_employee_page_index.phone') },
      { key: 'status', title: t('hrm.hrm_employee_page_index.status') },
    ],
    []
  );

  const rowActions = useMemo<RowAction<Employee>[]>(
    () => [
      {
        label: t('hrm.hrm_employee_page_index.view_detail'),
        icon: <Eye style={{ width: 16, height: 16 }} />,
        onClick: handleView,
      },
      {
        label: t('hrm.hrm_employee_page_index.edit'),
        icon: <Edit style={{ width: 16, height: 16 }} />,
        onClick: handleEdit,
        color: 'primary',
      },
      {
        label: t('hrm.hrm_employee_page_index.delete_3'),
        icon: <Trash2 style={{ width: 16, height: 16 }} />,
        onClick: (row) => handleDelete(row.id),
        color: 'error',
        divider: true,
      },
    ],
    [handleView, handleEdit, handleDelete]
  );

  const filterConfigs = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'search',
        label: t('hrm.hrm_employee_page_index.search'),
        type: 'text',
        placeholder: t('hrm.hrm_employee_page_index.search_1'),
        width: 250,
      },
      {
        id: 'department',
        label: t('hrm.hrm_employee_page_index.text_1e1459'),
        type: 'select',
        options: departments.map((d) => ({ label: d.name, value: d.id })),
      },
      {
        id: 'status',
        label: t('hrm.hrm_employee_page_index.status'),
        type: 'select',
        options: [
          { label: t('hrm.hrm_employee_page_index.status_1'), value: 'all' },
          { label: t('hrm.hrm_employee_page_index.text_b5509b'), value: 'active' },
          { label: t('hrm.hrm_employee_page_index.text_583e79'), value: 'inactive' },
        ],
      },
    ],
    [departments]
  );

  const statCards = useMemo(
    () => [
      {
        id: 'total',
        title: t('hrm.hrm_employee_page_index.text_97e957'),
        value: employeeStats.total,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: 'primary' as const,
      },
      {
        id: 'active',
        title: t('hrm.hrm_employee_page_index.text_4d9eda'),
        value: employeeStats.active,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: 'success' as const,
      },
      {
        id: 'inactive',
        title: t('hrm.hrm_employee_page_index.text_683919'),
        value: employeeStats.inactive,
        icon: <Users style={{ width: 24, height: 24 }} />,
        color: 'error' as const,
      },
      {
        id: 'rate',
        title: t('hrm.hrm_employee_page_index.text_7200f2'),
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
      title={t('hrm.hrm_employee_page_index.text_b33603')}
      subtitle={t('hrm.hrm_employee_page_index.info_1')}
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Users style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main}, ${ct.success.dark})`,
      }}
    >
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
            defaultFileName={t('hrm.hrm_employee_page_index.text_cdfc20')}
            buttonText={t('hrm.hrm_employee_page_index.export')}
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

      {viewMode === 'list' && (
        <CardListTemplate
          title={t('hrm.hrm_employee_page_index.list')}
          subtitle={t('hrm.hrm_employee_page_index.info_1')}
          metricStats={metricStats}
          metricColumns={4}
          data={data.items as unknown as Record<string, unknown>[]}
          cardConfig={cardConfig}
          loading={loading}
          emptyState={{
            emoji: '👥',
            title: t('hrm.hrm_employee_page_index.no_data'),
            description: t('hrm.hrm_employee_page_index.text_a69329'),
            actionLabel: t('hrm.hrm_employee_page_index.add'),
            onAction: handleAdd,
          }}
          search={{
            value: searchText,
            onChange: setSearchText,
            placeholder: t('hrm.hrm_employee_page_index.search_1'),
          }}
          filters={[
            {
              id: 'department',
              label: t('hrm.hrm_employee_page_index.text_1e1459'),
              type: 'select' as const,
              options: [
                { label: t('hrm.hrm_employee_page_index.all'), value: 'all' },
                ...departments.map((d) => ({ label: d.name, value: d.id })),
              ],
            },
            {
              id: 'status',
              label: t('hrm.hrm_employee_page_index.status'),
              type: 'select' as const,
              options: [
                { label: t('hrm.hrm_employee_page_index.status_1'), value: 'all' },
                { label: t('hrm.hrm_employee_page_index.text_b5509b'), value: 'active' },
                { label: t('hrm.hrm_employee_page_index.text_583e79'), value: 'inactive' },
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
            text: t('hrm.hrm_employee_page_index.add'),
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
                defaultFileName={t('hrm.hrm_employee_page_index.text_cdfc20')}
                buttonText={t('hrm.hrm_employee_page_index.export')}
              />
            </Box>
          }
        />
      )}

      {viewMode === 'tree' && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' },
            gap: 3,
          }}
        >
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
                title={t('hrm.hrm_employee_page_index.no_data_1')}
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
                  emptyMessage={t('hrm.hrm_employee_page_index.no_data_2')}
                  exportable
                  exportFileName={t('hrm.hrm_employee_page_index.list')}
                  exportTransform={(row: Employee) => ({
                    id: row.id,
                    name: row.name,
                    employee_no: row.employee_no || '',
                    email: row.email || '',
                    phone: row.phone || '',
                    department_name: row.department_name || '',
                    position_name: row.position || '',
                    status: row.status === 'active' ? t('hrm.hrm_employee_page_index.text_b5509b') : t('hrm.hrm_employee_page_index.text_583e79'),
                    hired_date: row.hire_date || '',
                  })}
                  batchActions={[
                    {
                      label: t('hrm.hrm_employee_page_index.batch_delete_1'),
                      icon: <Trash2 size={16} />,
                      onClick: handleBatchDelete,
                    },
                  ]}
                />
              </>
            ) : (
              <EmptyState
                emoji='👈'
                title={t('hrm.hrm_employee_page_index.view_1')}
                description={t('hrm.hrm_employee_page_index.view_2')}
                compact
              />
            )}
          </Paper>
        </Box>
      )}

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

      <EmployeeDetailDialog
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        employee={selectedEmployee}
        departments={departments}
        onEdit={handleEdit}
        getStatusBadge={getStatusBadge}
      />

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

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={t('hrm.hrm_employee_page_index.confirm_delete')}
        message={t('hrm.hrm_employee_page_index.confirm')}
        danger
      />

      <ConfirmDialog
        isOpen={confirmBatchDeleteOpen}
        onClose={() => setConfirmBatchDeleteOpen(false)}
        onConfirm={handleBatchDeleteConfirm}
        title={t('hrm.hrm_employee_page_index.batch_delete_2')}
        message={`确定要删除选中的 ${batchDeleteIds.length} 名员工吗？`}
        danger
      />
    </PageContainer>
  );
};

export default HrmEmployeePage;
