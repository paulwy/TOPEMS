import React, { useState, useCallback } from 'react';
import { apiLogger, logger } from '@/utils/logger';
import {
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  TextField,
  InputLabel,
  FormControl,
  Select,
  MenuItem,
  Box,
  Avatar,
  Typography,
  Divider,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Chip,
  Button,
} from '@mui/material';
import { StatusBadge, ConfirmDialog } from '@topems/shared-components';
import { Plus, Edit, Trash2, Eye, Building2, Building, User, Mail, Phone } from 'lucide-react';
import {
  departmentApi,
  employeeApi,
  companyApi,
  type Department,
  type Employee,
  type Company,
  type PaginatedResult,
  type ListParams,
} from '@/api/hrm';
import { useNotificationStore } from '../../store';
import { AIHelperButton, AICodeGenerator, AITextOptimizer, AIFormValidator } from '@/components/ai';
import type { ValidationIssue, Suggestion } from '@/types/ai';
import {
  TreePageTemplate,
  type TreeNode,
  type TreeStatCard,
  type TreeAction,
} from '@/components/templates';
import { EmptyState } from '@/components';
import { ImageUpload, PageContainer } from '@/components/common';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const HrmDepartmentPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAICodeGenerator, setShowAICodeGenerator] = useState(false);
  const [showAITextOptimizer, setShowAITextOptimizer] = useState(false);
  const [showAIFormValidator, setShowAIFormValidator] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [aiGeneratorMode, setAiGeneratorMode] = useState<'create' | 'edit'>('create');

  const [formData, setFormData] = useState<Partial<Department>>({});
  const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  }, []);

  // ============ React Query - 部门列表 ============
  const departmentsQuery = useQuery({
    queryKey: ['hrm-departments', searchText, statusFilter],
    queryFn: async () => {
      const params: ListParams = { pagesize: 1000 };
      if (searchText) params.search = searchText;
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await departmentApi.list(params);
      if (response.code === 200 && response.data) {
        const data = response.data as PaginatedResult<Department>;
        const depts = data.items || [];
        const rootDepts = depts.filter((d) => !d.parent_id);
        rootDepts.forEach((d) => {
          const expandAllChildren = (dept: Department, allDepts: Department[]) => {
            setExpandedIds((prev) => {
              const newExpanded = new Set(prev);
              newExpanded.add(dept.id);
              const children = allDepts.filter((child) => child.parent_id === dept.id);
              children.forEach((child) => expandAllChildren(child, allDepts));
              return newExpanded;
            });
          };
          expandAllChildren(d, depts);
        });
        return depts;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const departments = departmentsQuery.data || [];
  const loading = departmentsQuery.isLoading;
  const totalDepartments = departments.length;

  // ============ React Query - 公司列表 ============
  const companiesQuery = useQuery({
    queryKey: ['hrm-companies'],
    queryFn: async () => {
      const response = await companyApi.list({ pagesize: 100 });
      if (response.code === 200 && response.data) {
        const data = response.data as PaginatedResult<Company>;
        return data.items || [];
      }
      return [];
    },
    staleTime: 30 * 60 * 1000,
  });

  const companies = companiesQuery.data || [];

  // ============ React Query - 部门员工列表 ============
  const employeesQuery = useQuery({
    queryKey: ['hrm-department-employees', selectedDeptId],
    queryFn: async () => {
      if (!selectedDeptId) return [];
      const response = await employeeApi.list({
        department_id: selectedDeptId,
        pagesize: 100,
      });
      if (response.code === 200 && response.data) {
        const data = response.data as PaginatedResult<Employee>;
        return data.items || [];
      }
      return [];
    },
    enabled: !!selectedDeptId,
    staleTime: 5 * 60 * 1000,
  });

  const employees = employeesQuery.data || [];

  // ============ React Query - Mutations ============
  const createMutation = useMutation({
    mutationFn: (data: Partial<Department>) => departmentApi.create(data),
    onSuccess: () => {
      addNotification({
        title: '成功',
        message: '部门创建成功',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['hrm-departments'] });
    },
    onError: (error: unknown) => {
      addNotification({
        title: '失败',
        message: (error as { message?: string }).message || '创建部门失败',
        type: 'error',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Department> }) =>
      departmentApi.update(id, data),
    onSuccess: () => {
      addNotification({
        title: '成功',
        message: '部门更新成功',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['hrm-departments'] });
    },
    onError: (error: unknown) => {
      addNotification({
        title: '失败',
        message: (error as { message?: string }).message || '更新部门失败',
        type: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => departmentApi.delete(id),
    onSuccess: () => {
      addNotification({
        title: '成功',
        message: '部门删除成功',
        type: 'success',
      });
      queryClient.invalidateQueries({ queryKey: ['hrm-departments'] });
      if (selectedDeptId) {
        setSelectedDeptId(undefined);
      }
    },
    onError: (error: unknown) => {
      addNotification({
        title: '失败',
        message: (error as { message?: string }).message || '删除部门失败',
        type: 'error',
      });
    },
  });

  // ============ 树形数据构建 ============
  const buildTree = useCallback((): TreeNode[] => {
    const deptMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    departments.forEach((dept) => {
      deptMap.set(dept.id, {
        id: dept.id,
        name: dept.name,
        type: 'folder',
        children: [],
        data: dept,
      });
    });

    departments.forEach((dept) => {
      const node = deptMap.get(dept.id)!;
      if (dept.parent_id && deptMap.has(dept.parent_id)) {
        deptMap.get(dept.parent_id)!.children!.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }, [departments]);

  // ============ 统计数据 ============
  const statCards: TreeStatCard[] = [
    {
      id: 'total',
      title: '部门总数',
      value: totalDepartments,
      icon: <Building2 style={{ width: 24, height: 24 }} />,
      color: 'primary',
    },
    {
      id: 'active',
      title: '启用部门',
      value: departments.filter((d) => d.status === 'active').length,
      icon: <Building2 style={{ width: 24, height: 24 }} />,
      color: 'success',
    },
    {
      id: 'inactive',
      title: '禁用部门',
      value: departments.filter((d) => d.status === 'inactive').length,
      icon: <Building2 style={{ width: 24, height: 24 }} />,
      color: 'warning',
    },
    {
      id: 'employees',
      title: '部门员工',
      value: employees.length,
      icon: <User style={{ width: 24, height: 24 }} />,
      color: 'info',
    },
  ];

  // ============ 操作按钮 ============
  const rowActions: TreeAction[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (node) => {
        const dept = node.data as Department;
        setSelectedDepartment(dept);
        setShowViewModal(true);
      },
    },
    {
      label: '编辑',
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: (node) => {
        const dept = node.data as Department;
        setSelectedDepartment(dept);
        setFormData(dept);
        setShowEditModal(true);
      },
      color: 'primary',
    },
    {
      label: '删除',
      icon: <Trash2 style={{ width: 16, height: 16 }} />,
      onClick: (node) => {
        const dept = node.data as Department;
        const confirmDelete = async () => {
          try {
            await deleteMutation.mutateAsync(dept.id);
          } catch (error: unknown) {
            apiLogger.error('删除失败:', error);
          }
        };
        setShowViewModal(false);
        setConfirmDialogOpen(true);
        setConfirmDialogConfig({
          title: '确认删除',
          message: '确定要删除这个部门吗？',
          onConfirm: confirmDelete,
          danger: true,
        });
      },
      color: 'error',
      divider: true,
    },
  ];

  // ============ 筛选选项 ============
  const filterOptions = [
    { label: '全部状态', value: 'all' },
    { label: '启用', value: 'active' },
    { label: '禁用', value: 'inactive' },
  ];

  // ============ 详情面板渲染 ============
  const selectedDept = departments.find((d) => d.id === selectedDeptId);

  const detailPanel = selectedDept ? (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardHeader
          sx={{
            pb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 48, height: 48, bgcolor: 'success.main' }}>
                <Building2 sx={{ width: 24, height: 24 }} />
              </Avatar>
              <Box>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  {selectedDept.name}
                </Typography>
                {selectedDept.code && (
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    编码: {selectedDept.code}
                  </Typography>
                )}
              </Box>
            </Box>
          }
          action={
            <StatusBadge
              status={`department_${selectedDept.status}`}
              showIcon
            />
          }
        />
        <CardContent>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: 2,
              mb: 3,
            }}
          >
            <Box sx={{ bgcolor: 'grey.50', borderRadius: 3, p: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                部门人数
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700 }}
              >
                {employees.length}
              </Typography>
            </Box>
            <Box sx={{ bgcolor: 'grey.50', borderRadius: 3, p: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                所属公司
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {selectedDept.company_id
                  ? companies.find((c) => c.id === selectedDept.company_id)?.name || '-'
                  : '无'}
              </Typography>
            </Box>
            <Box sx={{ bgcolor: 'grey.50', borderRadius: 3, p: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                上级部门
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {selectedDept.parent_id
                  ? departments.find((d) => d.id === selectedDept.parent_id)?.name || '-'
                  : '无'}
              </Typography>
            </Box>
            <Box sx={{ bgcolor: 'grey.50', borderRadius: 3, p: 2 }}>
              <Typography
                variant='caption'
                color='text.secondary'
              >
                创建时间
              </Typography>
              <Typography
                variant='body2'
                sx={{ fontWeight: 500 }}
              >
                {selectedDept.created_at
                  ? new Date(selectedDept.created_at).toLocaleDateString()
                  : '-'}
              </Typography>
            </Box>
          </Box>

          {selectedDept.description && (
            <Box sx={{ mb: 3 }}>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ mb: 0.5 }}
              >
                部门描述
              </Typography>
              <Typography variant='body2'>{selectedDept.description}</Typography>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 2,
              }}
            >
              <User sx={{ width: 20, height: 20, color: 'primary.main' }} />
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600 }}
              >
                部门成员
              </Typography>
              <Chip
                size='small'
                variant='outlined'
                label={`${employees.length} 人`}
                sx={{ ml: 'auto' }}
              />
            </Box>

            {employees.length === 0 ? (
              <EmptyState
                emoji='👤'
                title='该部门暂无员工'
                compact
              />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {employees.map((emp) => (
                  <Box
                    key={emp.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 2,
                      bgcolor: 'grey.50',
                      borderRadius: 3,
                      '&:hover': { bgcolor: 'grey.100' },
                    }}
                  >
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <User sx={{ width: 20, height: 20 }} />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant='body2'
                          sx={{ fontWeight: 500 }}
                        >
                          {emp.name}
                        </Typography>
                        <StatusBadge
                          status={`employee_${emp.status}`}
                          size='sm'
                        />
                      </Box>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                      >
                        {emp.employee_no} · {emp.position || '无职位'}
                      </Typography>
                    </Box>
                    {!isMobile && (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                        }}
                      >
                        {emp.email && (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            <Mail
                              sx={{
                                width: 14,
                                height: 14,
                                color: 'text.secondary',
                              }}
                            />
                            <Typography variant='caption'>{emp.email}</Typography>
                          </Box>
                        )}
                        {emp.phone && (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                            }}
                          >
                            <Phone
                              sx={{
                                width: 14,
                                height: 14,
                                color: 'text.secondary',
                              }}
                            />
                            <Typography variant='caption'>{emp.phone}</Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  ) : null;

  // ============ 确认对话框状态 ============
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  // ============ 事件处理 ============
  const handleSearch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['hrm-departments'] });
  }, [queryClient]);

  const handleReset = useCallback(() => {
    setSearchText('');
    setStatusFilter('all');
    setSelectedDeptId(undefined);
    queryClient.invalidateQueries({ queryKey: ['hrm-departments'] });
  }, [queryClient]);

  const handleAdd = useCallback(() => {
    setSelectedDepartment(null);
    setFormData({});
    setShowCreateModal(true);
  }, []);

  const handleEdit = useCallback((record: Department) => {
    setSelectedDepartment(record);
    setFormData(record);
    setShowEditModal(true);
  }, []);

  const handleView = useCallback((record: Department) => {
    setSelectedDepartment(record);
    setShowViewModal(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      const confirmDelete = async () => {
        try {
          await deleteMutation.mutateAsync(id);
          if (selectedDeptId === id) {
            setSelectedDeptId(undefined);
          }
        } catch (error: unknown) {
          apiLogger.error('删除失败:', error);
        }
      };
      setConfirmDialogConfig({
        title: '确认删除',
        message: '确定要删除这个部门吗？',
        onConfirm: confirmDelete,
        danger: true,
      });
      setConfirmDialogOpen(true);
    },
    [deleteMutation, selectedDeptId]
  );

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

  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedDepartment) return;
      try {
        await updateMutation.mutateAsync({ id: selectedDepartment.id, data: formData });
        setShowEditModal(false);
        setSelectedDepartment(null);
      } catch (error: unknown) {
        apiLogger.error('更新失败:', error);
      }
    },
    [updateMutation, selectedDepartment, formData]
  );

  const handleInputChange = useCallback((field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSelectNode = useCallback((node: TreeNode | null) => {
    if (node && node.type === 'folder') {
      setSelectedDeptId(node.id);
    }
  }, []);

  const handleOpenAICodeGenerator = useCallback((mode: 'create' | 'edit') => {
    setAiGeneratorMode(mode);
    setShowAICodeGenerator(true);
  }, []);

  const handleSelectAICode = useCallback((code: string) => {
    setFormData((prev) => ({ ...prev, code }));
  }, []);

  const handleOpenAITextOptimizer = useCallback(() => {
    setShowAITextOptimizer(true);
  }, []);

  const handleOptimizedText = useCallback((text: string) => {
    setFormData((prev) => ({ ...prev, description: text }));
  }, []);

  const handleOpenAIFormValidator = useCallback(() => {
    setShowAIFormValidator(true);
  }, []);

  const handleApplySuggestions = useCallback((suggestions: Suggestion[]) => {
    const updates: Record<string, any> = {};
    suggestions.forEach((s) => {
      updates[s.field] = s.value;
    });
    setFormData((prev) => ({ ...prev, ...updates }));
    setShowAIFormValidator(false);
  }, []);

  const handleFixIssue = useCallback((issue: ValidationIssue) => {}, []);

  const availableParentDepts = departments.filter(
    (d) => d.id !== (formData.id as string | undefined)
  );

  // ============ 渲染 ============
  return (
    <PageContainer maxWidth='xl'>
      <TreePageTemplate
        title='部门管理'
        subtitle={`${totalDepartments} 个部门`}
        stats={statCards}
        data={buildTree()}
        loading={loading}
        searchPlaceholder='搜索部门...'
        filterOptions={filterOptions}
        filterValue={statusFilter}
        onFilterChange={(value) => setStatusFilter(value)}
        onSearch={handleSearch}
        onReset={handleReset}
        onAdd={handleAdd}
        addButtonText='新增部门'
        addButtonIcon={<Plus style={{ width: 18, height: 18 }} />}
        rowActions={rowActions}
        onSelect={handleSelectNode}
        selectedId={selectedDeptId}
        detailPanel={detailPanel}
        detailPanelTitle='部门详情'
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['hrm-departments'] })}
        treeWidth={360}
        emptyState={{
          emoji: '🏢',
          title: '暂无部门数据',
          actionLabel: '新增部门',
          onAction: handleAdd,
        }}
      />

      <DepartmentFormDialog
        open={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
        }}
        mode={showCreateModal ? 'create' : 'edit'}
        department={selectedDepartment}
        formData={formData}
        onChange={handleInputChange}
        onSubmit={showCreateModal ? handleCreate : handleUpdate}
        companies={companies}
        departments={availableParentDepts}
        onOpenAICodeGenerator={handleOpenAICodeGenerator}
        onOpenAITextOptimizer={handleOpenAITextOptimizer}
        onOpenAIFormValidator={handleOpenAIFormValidator}
      />

      <Dialog
        open={showViewModal}
        onClose={() => setShowViewModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>部门详情</DialogTitle>
        <DialogContent>
          {selectedDepartment && (
            <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  部门名称
                </Typography>
                <Typography
                  variant='body1'
                  sx={{ fontWeight: 500 }}
                >
                  {selectedDepartment.name}
                </Typography>
              </Box>
              {selectedDepartment.code && (
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    部门编码
                  </Typography>
                  <Typography variant='body1'>{selectedDepartment.code}</Typography>
                </Box>
              )}
              {selectedDepartment.parent_id && (
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    上级部门
                  </Typography>
                  <Typography variant='body1'>
                    {departments.find((d) => d.id === selectedDepartment.parent_id)?.name || '-'}
                  </Typography>
                </Box>
              )}
              {selectedDepartment.description && (
                <Box>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    部门描述
                  </Typography>
                  <Typography variant='body1'>{selectedDepartment.description}</Typography>
                </Box>
              )}
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  状态
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <StatusBadge
                    status={`department_${selectedDepartment.status}`}
                    showIcon
                  />
                </Box>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  创建时间
                </Typography>
                <Typography variant='body1'>
                  {selectedDepartment.created_at
                    ? new Date(selectedDepartment.created_at).toLocaleString()
                    : '-'}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      <AICodeGenerator
        isOpen={showAICodeGenerator}
        onClose={() => setShowAICodeGenerator(false)}
        context={{
          entityType: 'department',
          name: (formData as Department)?.name,
        }}
        onSelect={handleSelectAICode}
        existingCodes={departments.map((d) => d.code).filter(Boolean) as string[]}
      />
      <AITextOptimizer
        isOpen={showAITextOptimizer}
        onClose={() => setShowAITextOptimizer(false)}
        context={{ textType: 'duty', name: (formData as Department)?.name }}
        originalText={(formData as Department)?.description || ''}
        onOptimized={handleOptimizedText}
      />
      <AIFormValidator
        isOpen={showAIFormValidator}
        onClose={() => setShowAIFormValidator(false)}
        validateRequest={{
          data: formData,
          context: { module: 'hrm', entityType: 'department' },
        }}
        onApplySuggestions={handleApplySuggestions}
        onFixIssue={handleFixIssue}
      />
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        onConfirm={() => {
          confirmDialogConfig?.onConfirm();
          setConfirmDialogOpen(false);
        }}
        title={confirmDialogConfig?.title || ''}
        message={confirmDialogConfig?.message || ''}
        danger={confirmDialogConfig?.danger}
      />
    </PageContainer>
  );
};

interface DepartmentFormDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  department: Department | null;
  formData: Partial<Department>;
  onChange: (field: string, value: unknown) => void;
  onSubmit: (e: React.FormEvent) => void;
  companies: Company[];
  departments: Department[];
  onOpenAICodeGenerator: (mode: 'create' | 'edit') => void;
  onOpenAITextOptimizer: () => void;
  onOpenAIFormValidator: () => void;
}

const DepartmentFormDialog: React.FC<DepartmentFormDialogProps> = ({
  open,
  onClose,
  mode,
  department,
  formData,
  onChange,
  onSubmit,
  companies,
  departments,
  onOpenAICodeGenerator,
  onOpenAITextOptimizer,
  onOpenAIFormValidator,
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth='sm'
    fullWidth
  >
    <DialogTitle>{mode === 'create' ? '新增部门' : '编辑部门'}</DialogTitle>
    <DialogContent>
      <Box
        component='form'
        onSubmit={onSubmit}
        sx={{ display: 'grid', gap: 2, pt: 1 }}
      >
        <TextField
          label='部门名称 *'
          value={(formData as Department)?.name || ''}
          onChange={(e) => onChange('name', e.target.value)}
          required
          size='small'
        />

        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 0.5,
            }}
          >
            <InputLabel sx={{ fontSize: '0.875rem', fontWeight: 500 }}>部门编码</InputLabel>
            <AIHelperButton
              type='generate'
              onClick={() => onOpenAICodeGenerator(mode)}
              size='small'
              label='AI生成'
            />
          </Box>
          <TextField
            value={(formData as Department)?.code || ''}
            onChange={(e) => onChange('code', e.target.value)}
            size='small'
            fullWidth
          />
        </Box>

        <FormControl
          size='small'
          fullWidth
        >
          <InputLabel>所属公司</InputLabel>
          <Select
            value={(formData as Department)?.company_id || ''}
            label='所属公司'
            onChange={(e) =>
              onChange('company_id', e.target.value === 'none' ? '' : e.target.value)
            }
          >
            <MenuItem value='none'>无</MenuItem>
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

        <FormControl
          size='small'
          fullWidth
        >
          <InputLabel>上级部门</InputLabel>
          <Select
            value={(formData as Department)?.parent_id || ''}
            label='上级部门'
            onChange={(e) => onChange('parent_id', e.target.value === 'none' ? '' : e.target.value)}
          >
            <MenuItem value='none'>无</MenuItem>
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

        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 0.5,
            }}
          >
            <InputLabel sx={{ fontSize: '0.875rem', fontWeight: 500 }}>部门描述</InputLabel>
            <AIHelperButton
              type='optimize'
              onClick={() => onOpenAITextOptimizer()}
              size='small'
              label='AI优化'
            />
          </Box>
          <TextField
            value={(formData as Department)?.description || ''}
            onChange={(e) => onChange('description', e.target.value)}
            multiline
            rows={3}
            fullWidth
          />
        </Box>

        <FormControl
          size='small'
          fullWidth
        >
          <InputLabel>状态</InputLabel>
          <Select
            value={(formData as Department)?.status || 'active'}
            label='状态'
            onChange={(e) => onChange('status', e.target.value)}
          >
            <MenuItem value='active'>启用</MenuItem>
            <MenuItem value='inactive'>禁用</MenuItem>
          </Select>
        </FormControl>

        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ mb: 1, display: 'block' }}
          >
            部门图片
          </Typography>
          <ImageUpload
            value={((formData as unknown as Record<string, unknown>)?.images as string[]) || []}
            onChange={(files) => onChange('images', files)}
            maxCount={9}
            accept='image/*'
            cropEnabled
            height={150}
          />
        </Box>

        <DialogActions sx={{ p: 0, pt: 2, justifyContent: 'space-between' }}>
          <AIHelperButton
            type='validate'
            onClick={() => onOpenAIFormValidator()}
            size='small'
            label='AI校验'
          />
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

export default HrmDepartmentPage;
