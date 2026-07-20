import React, { useState, useCallback, useMemo } from 'react';
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
  Chip,
  Divider,
  Grid,
  Button,
} from '@mui/material';
import { Building, Building2, Plus, Edit, Trash2, Eye, Users, RefreshCw } from 'lucide-react';
import {
  companyApi,
  departmentApi,
  employeeApi,
  type Company,
  type Department,
  type Employee,
  type PaginatedResult,
} from '@/api/hrm';
import { useNotificationStore } from '../../store';
import {
  TreePageTemplate,
  type TreeNode,
  type TreeStatCard as StatCard,
  type TreeAction,
} from '@/components/templates';
import { EmptyState } from '@/components';
import { AIHelperButton, AICodeGenerator } from '@/components/ai';
import { ConfirmDialog } from '@topems/shared-components';
import { PageContainer } from '@/components/common';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useTranslation } from 'react-i18next';
interface NodeData {
  type: 'company' | 'department';
  data: Company | Department;
}

const HrmOrganizationPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('all');

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showAICodeGenerator, setShowAICodeGenerator] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');

  const [companyFormData, setCompanyFormData] = useState<Partial<Company>>({});
  const [deptFormData, setDeptFormData] = useState<Partial<Department>>({});
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);

  const openConfirmDialog = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }) => {
    setConfirmDialogConfig(config);
    setConfirmDialogOpen(true);
  };

  const handleSelectAICode = (code: string) => {
    setDeptFormData((prev) => ({ ...prev, code }));
  };

  const companiesQuery = useQuery<Company[]>({
    queryKey: ['hrm-companies-org'],
    queryFn: async () => {
      const res = await companyApi.list({ pagesize: 100 });
      if (res.code === 200 && res.data) {
        return (res.data as PaginatedResult<Company>).items || [];
      }
      return [];
    },
    staleTime: 30 * 60 * 1000,
  });
  const companies = companiesQuery.data || [];

  const departmentsQuery = useQuery<Department[]>({
    queryKey: ['hrm-departments-org'],
    queryFn: async () => {
      const res = await departmentApi.list({ pagesize: 500 });
      if (res.code === 200 && res.data) {
        return (res.data as PaginatedResult<Department>).items || [];
      }
      return [];
    },
    staleTime: 30 * 60 * 1000,
  });
  const departments = departmentsQuery.data || [];

  const employeesQuery = useQuery<Employee[]>({
    queryKey: ['hrm-employees-org'],
    queryFn: async () => {
      const res = await employeeApi.list({ pagesize: 500 });
      if (res.code === 200 && res.data) {
        return (res.data as PaginatedResult<Employee>).items || [];
      }
      return [];
    },
    staleTime: 30 * 60 * 1000,
  });
  const employees = employeesQuery.data || [];

  const loading = companiesQuery.isLoading || departmentsQuery.isLoading || employeesQuery.isLoading;

  const createCompanyMutation = useMutation({
    mutationFn: (data: Partial<Company>) => companyApi.create(data),
    onSuccess: () => {
      addNotification({ title: t('hrm.hrm_organization_page.success'), message: t('hrm.hrm_organization_page.create'), type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['hrm-companies-org'] });
    },
    onError: (error: unknown) => {
      addNotification({
        title: t('hrm.hrm_organization_page.fail'),
        message: (error as { message?: string }).message || t('hrm.hrm_organization_page.create_1'),
        type: 'error',
      });
    },
  });

  const updateCompanyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) => companyApi.update(id, data),
    onSuccess: () => {
      addNotification({ title: t('hrm.hrm_organization_page.success'), message: t('hrm.hrm_organization_page.update'), type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['hrm-companies-org'] });
    },
    onError: (error: unknown) => {
      addNotification({
        title: t('hrm.hrm_organization_page.fail'),
        message: (error as { message?: string }).message || t('hrm.hrm_organization_page.update_1'),
        type: 'error',
      });
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: (id: string) => companyApi.delete(id),
    onSuccess: () => {
      addNotification({ title: t('hrm.hrm_organization_page.success'), message: t('hrm.hrm_organization_page.delete_success'), type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['hrm-companies-org'] });
      queryClient.invalidateQueries({ queryKey: ['hrm-departments-org'] });
    },
    onError: (error: unknown) => {
      addNotification({
        title: t('hrm.hrm_organization_page.fail'),
        message: (error as { message?: string }).message || t('hrm.hrm_organization_page.delete'),
        type: 'error',
      });
    },
  });

  const createDepartmentMutation = useMutation({
    mutationFn: (data: Partial<Department>) => departmentApi.create(data),
    onSuccess: () => {
      addNotification({ title: t('hrm.hrm_organization_page.success'), message: t('hrm.hrm_organization_page.create'), type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['hrm-departments-org'] });
    },
    onError: (error: unknown) => {
      addNotification({
        title: t('hrm.hrm_organization_page.fail'),
        message: (error as { message?: string }).message || t('hrm.hrm_organization_page.create_1'),
        type: 'error',
      });
    },
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Department> }) => departmentApi.update(id, data),
    onSuccess: () => {
      addNotification({ title: t('hrm.hrm_organization_page.success'), message: t('hrm.hrm_organization_page.update'), type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['hrm-departments-org'] });
    },
    onError: (error: unknown) => {
      addNotification({
        title: t('hrm.hrm_organization_page.fail'),
        message: (error as { message?: string }).message || t('hrm.hrm_organization_page.update_1'),
        type: 'error',
      });
    },
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: (id: string) => departmentApi.delete(id),
    onSuccess: () => {
      addNotification({ title: t('hrm.hrm_organization_page.success'), message: t('hrm.hrm_organization_page.delete_success'), type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['hrm-departments-org'] });
    },
    onError: (error: unknown) => {
      addNotification({
        title: t('hrm.hrm_organization_page.fail'),
        message: (error as { message?: string }).message || t('hrm.hrm_organization_page.delete'),
        type: 'error',
      });
    },
  });

  const buildTree = useCallback((): TreeNode[] => {
    const result: TreeNode[] = [];

    const filteredCompanies =
      statusFilter === 'all' ? companies : companies.filter((c) => c.status === statusFilter);

    const filteredDepts =
      statusFilter === 'all' ? departments : departments.filter((d) => d.status === statusFilter);

    filteredCompanies.forEach((company) => {
      const companyNode: TreeNode = {
        id: `company-${company.id}`,
        name: company.name,
        type: 'folder',
        children: [],
        data: { type: 'company', data: company } as NodeData,
      };

      const companyDepts = filteredDepts.filter((d) => d.company_id === company.id);
      const deptMap = new Map<string, TreeNode>();

      companyDepts.forEach((dept) => {
        deptMap.set(dept.id, {
          id: `dept-${dept.id}`,
          name: dept.name,
          type: 'item',
          children: [],
          data: { type: 'department', data: dept } as NodeData,
        });
      });

      companyDepts.forEach((dept) => {
        const node = deptMap.get(dept.id)!;
        if (dept.parent_id && deptMap.has(dept.parent_id)) {
          deptMap.get(dept.parent_id)!.children!.push(node);
        } else {
          companyNode.children!.push(node);
        }
      });

      result.push(companyNode);
    });

    return result;
  }, [companies, departments, statusFilter]);

  const getCompanyEmployeeCount = (companyId: string): number => {
    const companyDepts = departments.filter((d) => d.company_id === companyId);
    const deptIds = companyDepts.map((d) => d.id);
    return employees.filter((e) => deptIds.includes(e.department_id || '')).length;
  };

  const getDeptEmployeeCount = (deptId: string): number => {
    return employees.filter((e) => e.department_id === deptId).length;
  };

  const statCards: StatCard[] = [
    {
      id: 'companies',
      title: t('hrm.hrm_organization_page.text_ccb91d'),
      value: companies.length,
      icon: <Building style={{ width: 24, height: 24 }} />,
      color: 'primary',
    },
    {
      id: 'departments',
      title: t('hrm.hrm_organization_page.text_a78441'),
      value: departments.length,
      icon: <Building2 style={{ width: 24, height: 24 }} />,
      color: 'secondary',
    },
    {
      id: 'employees',
      title: t('hrm.hrm_organization_page.text_97e957'),
      value: employees.length,
      icon: <Users style={{ width: 24, height: 24 }} />,
      color: 'success',
    },
    {
      id: 'activeDepts',
      title: t('hrm.hrm_organization_page.active'),
      value: departments.filter((d) => d.status === 'active').length,
      icon: <Building2 style={{ width: 24, height: 24 }} />,
      color: 'info',
    },
  ];

  const filterOptions = [
    { label: t('hrm.hrm_organization_page.status'), value: 'all' },
    { label: t('hrm.hrm_organization_page.active_1'), value: 'active' },
    { label: t('hrm.hrm_organization_page.text_710ad0'), value: 'inactive' },
  ];

  const rowActions: TreeAction[] = [
    {
      label: t('hrm.hrm_organization_page.view'),
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (node) => {
        setSelectedNode(node);
        const nodeData = node.data as NodeData;
        if (nodeData.type === 'company') {
          setCompanyFormData(nodeData.data as Company);
          setModalMode('view');
          setShowCompanyModal(true);
        } else {
          setDeptFormData(nodeData.data as Department);
          setModalMode('view');
          setShowDeptModal(true);
        }
      },
    },
    {
      label: t('hrm.hrm_organization_page.edit'),
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: (node) => {
        setSelectedNode(node);
        const nodeData = node.data as NodeData;
        if (nodeData.type === 'company') {
          setCompanyFormData(nodeData.data as Company);
          setModalMode('edit');
          setShowCompanyModal(true);
        } else {
          setDeptFormData(nodeData.data as Department);
          setModalMode('edit');
          setShowDeptModal(true);
        }
      },
      color: 'primary',
    },
    {
        label: t('hrm.hrm_organization_page.delete_1'),
        icon: <Trash2 style={{ width: 16, height: 16 }} />,
        onClick: (node) => {
          const nodeData = node.data as NodeData;
          if (nodeData.type === 'company') {
            openConfirmDialog({
              title: t('hrm.hrm_organization_page.confirm_delete'),
              message: t('hrm.hrm_organization_page.confirm'),
              onConfirm: async () => {
                try {
                  await deleteCompanyMutation.mutateAsync((nodeData.data as Company).id);
                  if (selectedId === node.id) {
                    setSelectedId(undefined);
                    setSelectedNode(null);
                  }
                } catch (error: unknown) {
                  addNotification({
                    title: t('hrm.hrm_organization_page.fail'),
                    message: (error as { message?: string }).message || t('hrm.hrm_organization_page.delete'),
                    type: 'error',
                  });
                }
              },
              danger: true,
            });
          } else {
            openConfirmDialog({
              title: t('hrm.hrm_organization_page.confirm_delete'),
              message: t('hrm.hrm_organization_page.confirm_1'),
              onConfirm: async () => {
                try {
                  await deleteDepartmentMutation.mutateAsync((nodeData.data as Department).id);
                  if (selectedId === node.id) {
                    setSelectedId(undefined);
                    setSelectedNode(null);
                  }
                } catch (error: unknown) {
                  addNotification({
                    title: t('hrm.hrm_organization_page.fail'),
                    message: (error as { message?: string }).message || t('hrm.hrm_organization_page.delete'),
                    type: 'error',
                  });
                }
              },
              danger: true,
            });
          }
        },
        color: 'error',
        divider: true,
      },
  ];

  const handleSelectNode = useCallback((node: TreeNode | null) => {
    if (node) {
      setSelectedNode(node);
      setSelectedId(node.id);
    } else {
      setSelectedNode(null);
      setSelectedId(undefined);
    }
  }, []);

  const handleCreateCompany = useCallback(() => {
    setModalMode('create');
    setCompanyFormData({});
    setShowCompanyModal(true);
  }, []);

  const handleSaveCompany = useCallback(async () => {
    try {
      if (modalMode === 'create') {
        await createCompanyMutation.mutateAsync(companyFormData as Company);
        setShowCompanyModal(false);
      } else if (modalMode === 'edit' && companyFormData.id) {
        await updateCompanyMutation.mutateAsync({ id: companyFormData.id, data: companyFormData as Company });
        setShowCompanyModal(false);
      }
    } catch (error: unknown) {
      addNotification({
        title: t('hrm.hrm_organization_page.fail'),
        message: (error as { message?: string }).message || t('hrm.hrm_organization_page.operation_failed'),
        type: 'error',
      });
    }
  }, [modalMode, companyFormData, addNotification, createCompanyMutation, updateCompanyMutation]);

  const handleCreateDepartment = useCallback(() => {
    if (!selectedNode) return;
    const nodeData = selectedNode.data as NodeData;
    const companyId =
      nodeData.type === 'company'
        ? (nodeData.data as Company).id
        : (nodeData.data as Department).company_id;
    setModalMode('create');
    setDeptFormData({ company_id: companyId });
    setShowDeptModal(true);
  }, [selectedNode]);

  const handleSaveDepartment = useCallback(async () => {
    try {
      if (modalMode === 'create') {
        await createDepartmentMutation.mutateAsync(deptFormData as Department);
        setShowDeptModal(false);
      } else if (modalMode === 'edit' && deptFormData.id) {
        await updateDepartmentMutation.mutateAsync({ id: deptFormData.id, data: deptFormData as Department });
        setShowDeptModal(false);
      }
    } catch (error: unknown) {
      addNotification({
        title: t('hrm.hrm_organization_page.fail'),
        message: (error as { message?: string }).message || t('hrm.hrm_organization_page.operation_failed'),
        type: 'error',
      });
    }
  }, [modalMode, deptFormData, addNotification, createDepartmentMutation, updateDepartmentMutation]);

  const availableParentDepts = useMemo(() => {
    if (!selectedNode) return [];
    const nodeData = selectedNode.data as NodeData;
    const companyId =
      nodeData.type === 'company'
        ? (nodeData.data as Company).id
        : (nodeData.data as Department).company_id;
    if (!companyId) return [];
    return departments.filter(
      (d) => d.company_id === companyId && d.id !== (deptFormData.id as string)
    );
  }, [selectedNode, departments, deptFormData.id]);

  const detailPanel = selectedNode ? (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardHeader
          sx={{ pb: 2 }}
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {(selectedNode.data as NodeData).type === 'company' ? (
                <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
                  <Building sx={{ width: 24, height: 24 }} />
                </Avatar>
              ) : (
                <Avatar sx={{ width: 48, height: 48, bgcolor: 'success.main' }}>
                  <Building2 sx={{ width: 24, height: 24 }} />
                </Avatar>
              )}
              <Box>
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  {selectedNode.name}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {(selectedNode.data as NodeData).type === 'company' ? t('hrm.hrm_organization_page.text_41716f') : t('hrm.hrm_organization_page.text_1e1459')}
                </Typography>
              </Box>
            </Box>
          }
        />
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Chip
              size='small'
              variant='outlined'
              label={`${employees.length} 人`}
            />
            {(selectedNode.data as NodeData).type === 'company' ? (
              <Chip
                size='small'
                variant='outlined'
                label={`${departments.filter((d) => d.company_id === (selectedNode.data as NodeData).data.id).length} 个部门`}
              />
            ) : (
              (selectedNode.data as NodeData).data &&
              (selectedNode.data as NodeData).data.code && (
                <Chip
                  size='small'
                  variant='outlined'
                  label={`编码: ${(selectedNode.data as NodeData).data.code as string}`}
                />
              )
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Users sx={{ width: 20, height: 20, color: 'warning.main' }} />
              <Typography
                variant='subtitle1'
                sx={{ fontWeight: 600 }}
              >
                员工列表
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
                emoji='👥'
                title={t('hrm.hrm_organization_page.no_data')}
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
                      p: 1.5,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'grey.100' },
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: 'primary.100',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Users sx={{ width: 20, height: 20, color: 'primary.main' }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontWeight: 500 }}>{emp.name}</Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {emp.position || t('hrm.hrm_organization_page.text_88ed4c')}
                      </Typography>
                    </Box>
                    <Chip
                      size='small'
                      variant='outlined'
                      label={emp.status === 'active' ? t('hrm.hrm_organization_page.text_b5509b') : t('hrm.hrm_organization_page.text_583e79')}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  ) : null;

  return (
    <PageContainer maxWidth='xl'>
      <TreePageTemplate
        title={t('hrm.hrm_organization_page.text_19a4ec')}
        subtitle={t('hrm.hrm_organization_page.info')}
        stats={statCards}
        data={buildTree()}
        loading={loading}
        searchPlaceholder={t('hrm.hrm_organization_page.search')}
        filterOptions={filterOptions}
        filterValue={statusFilter}
        onFilterChange={(value) => setStatusFilter(value)}
        onSearch={() => {}}
        onReset={() => {
          setStatusFilter('all');
          setSelectedId(undefined);
          queryClient.invalidateQueries({ queryKey: ['hrm-companies-org', 'hrm-departments-org', 'hrm-employees-org'] });
        }}
        onAdd={handleCreateCompany}
        addButtonText={t('hrm.hrm_organization_page.add')}
        addButtonIcon={<Plus style={{ width: 18, height: 18 }} />}
        rowActions={rowActions}
        onSelect={handleSelectNode}
        selectedId={selectedId}
        detailPanel={detailPanel}
        detailPanelTitle={t('hrm.hrm_organization_page.detail')}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['hrm-companies-org', 'hrm-departments-org', 'hrm-employees-org'] })}
        treeWidth={320}
        emptyState={{
          emoji: '🏢',
          title: t('hrm.hrm_organization_page.no_data_1'),
          actionLabel: t('hrm.hrm_organization_page.add'),
          onAction: handleCreateCompany,
        }}
      />

      <Dialog
        open={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          {modalMode === 'create' ? t('hrm.hrm_organization_page.create_2') : modalMode === 'edit' ? t('hrm.hrm_organization_page.edit_1') : t('hrm.hrm_organization_page.view_1')}
        </DialogTitle>
        <DialogContent sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>公司名称</InputLabel>
              <TextField
                fullWidth
                size='small'
                value={companyFormData.name || ''}
                onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                disabled={modalMode === 'view'}
                placeholder={t('hrm.hrm_organization_page.please_input')}
              />
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>公司简称</InputLabel>
              <TextField
                fullWidth
                size='small'
                value={companyFormData.short_name || ''}
                onChange={(e) =>
                  setCompanyFormData({ ...companyFormData, short_name: e.target.value })
                }
                disabled={modalMode === 'view'}
                placeholder={t('hrm.hrm_organization_page.please_input_1')}
              />
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>公司地址</InputLabel>
              <TextField
                fullWidth
                size='small'
                value={companyFormData.address || ''}
                onChange={(e) =>
                  setCompanyFormData({ ...companyFormData, address: e.target.value })
                }
                disabled={modalMode === 'view'}
                placeholder={t('hrm.hrm_organization_page.please_input_2')}
              />
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>公司描述</InputLabel>
              <TextField
                fullWidth
                size='small'
                multiline
                rows={3}
                value={companyFormData.description || ''}
                onChange={(e) =>
                  setCompanyFormData({ ...companyFormData, description: e.target.value })
                }
                disabled={modalMode === 'view'}
                placeholder={t('hrm.hrm_organization_page.please_input_3')}
              />
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>状态</InputLabel>
              <FormControl
                fullWidth
                size='small'
              >
                <Select
                  value={companyFormData.status || ''}
                  onChange={(e) =>
                    setCompanyFormData({
                      ...companyFormData,
                      status: e.target.value as 'active' | 'inactive',
                    })
                  }
                  disabled={modalMode === 'view'}
                >
                  <MenuItem value='active'>启用</MenuItem>
                  <MenuItem value='inactive'>禁用</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          {modalMode !== 'view' && (
            <Button
              onClick={handleSaveCompany}
              variant='contained'
            >
              {modalMode === 'create' ? t('hrm.hrm_organization_page.create_3') : t('hrm.hrm_organization_page.save')}
            </Button>
          )}
          <Button onClick={() => setShowCompanyModal(false)}>
            {modalMode === 'view' ? t('hrm.hrm_organization_page.close') : t('hrm.hrm_organization_page.cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDeptModal}
        onClose={() => setShowDeptModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>
          {modalMode === 'create' ? t('hrm.hrm_organization_page.create_4') : modalMode === 'edit' ? t('hrm.hrm_organization_page.edit_2') : t('hrm.hrm_organization_page.view_2')}
        </DialogTitle>
        <DialogContent sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>部门名称</InputLabel>
              <TextField
                fullWidth
                size='small'
                value={deptFormData.name || ''}
                onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                disabled={modalMode === 'view'}
                placeholder={t('hrm.hrm_organization_page.please_input_4')}
              />
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>部门编码</InputLabel>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size='small'
                  value={deptFormData.code || ''}
                  onChange={(e) => setDeptFormData({ ...deptFormData, code: e.target.value })}
                  disabled={modalMode === 'view'}
                  placeholder={t('hrm.hrm_organization_page.please_input_5')}
                />
                <AIHelperButton
                  type='generate'
                  onClick={() => setShowAICodeGenerator(true)}
                  size='small'
                  label={t('hrm.hrm_organization_page.text_488a57')}
                  variant='text'
                />
              </Box>
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>上级部门</InputLabel>
              <FormControl
                fullWidth
                size='small'
              >
                <Select
                  value={deptFormData.parent_id || 'none'}
                  onChange={(e) =>
                    setDeptFormData({
                      ...deptFormData,
                      parent_id: e.target.value === 'none' ? undefined : (e.target.value as string),
                    })
                  }
                  disabled={modalMode === 'view'}
                >
                  <MenuItem value='none'>无上级部门</MenuItem>
                  {availableParentDepts.map((dept) => (
                    <MenuItem
                      key={dept.id}
                      value={dept.id}
                    >
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>部门描述</InputLabel>
              <TextField
                fullWidth
                size='small'
                multiline
                rows={3}
                value={deptFormData.description || ''}
                onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
                disabled={modalMode === 'view'}
                placeholder={t('hrm.hrm_organization_page.please_input_6')}
              />
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>状态</InputLabel>
              <FormControl
                fullWidth
                size='small'
              >
                <Select
                  value={deptFormData.status || ''}
                  onChange={(e) =>
                    setDeptFormData({
                      ...deptFormData,
                      status: e.target.value as 'active' | 'inactive',
                    })
                  }
                  disabled={modalMode === 'view'}
                >
                  <MenuItem value='active'>启用</MenuItem>
                  <MenuItem value='inactive'>禁用</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          {modalMode !== 'view' && (
            <Button
              onClick={handleSaveDepartment}
              variant='contained'
            >
              {modalMode === 'create' ? t('hrm.hrm_organization_page.create_3') : t('hrm.hrm_organization_page.save')}
            </Button>
          )}
          <Button onClick={() => setShowDeptModal(false)}>
            {modalMode === 'view' ? t('hrm.hrm_organization_page.close') : t('hrm.hrm_organization_page.cancel')}
          </Button>
        </DialogActions>
      </Dialog>

      <AICodeGenerator
        isOpen={showAICodeGenerator}
        onClose={() => setShowAICodeGenerator(false)}
        context={{ entityType: 'department', name: deptFormData.name }}
        onSelect={handleSelectAICode}
        existingCodes={departments.map((d) => d.code).filter(Boolean) as string[]}
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

export default HrmOrganizationPage;
