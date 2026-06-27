import React, { useState, useEffect, useCallback } from 'react';
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
  IconButton,
  Tooltip,
} from '@mui/material';
import { Button } from '@mui/material';
import { Grid } from '@/components/common';
import {
  Building,
  Plus,
  Edit,
  Trash2,
  Eye,
  Users,
  Folder,
  Phone,
  Mail,
  MapPin,
  Globe,
} from 'lucide-react';
import {
  companyApi,
  departmentApi,
  employeeApi,
  type Company,
  type Department,
  type Employee,
  type PaginatedResult,
} from '@/api/hrm';
import { useAppStore } from '../../store';
import {
  TreePageTemplate,
  type TreeNode,
  type TreeStatCard as StatCard,
  type TreeAction,
} from '@/components/templates';
import { EmptyState } from '@/components/mui';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { PageContainer } from '@/components/common';

const HrmCompanyPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<Partial<Company>>({});
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

  const fetchCompanies = useCallback(async (params?: any) => {
    setLoading(true);
    try {
      const response = await companyApi.list(params);
      if (response.code === 200 && response.data) {
        const data = response.data as PaginatedResult<Company>;
        setCompanies(data.items || []);
        setTotal(data.total || data.items?.length || 0);
      } else {
        setCompanies([]);
        setTotal(0);
      }
    } catch (error: unknown) {
      addNotification({
        title: '加载失败',
        message: (error as { message?: string }).message || '获取公司列表失败',
        type: 'error',
      });
      setCompanies([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  const fetchCompanyDetails = useCallback(async (companyId: string) => {
    try {
      const [deptResponse, empResponse] = await Promise.all([
        departmentApi.list({ company_id: companyId, page_size: 100 }),
        employeeApi.list({ page_size: 200 }),
      ]);

      const depts: Department[] =
        deptResponse.code === 200 && deptResponse.data
          ? (deptResponse.data as PaginatedResult<Department>).items || []
          : [];
      const emps: Employee[] =
        empResponse.code === 200 && empResponse.data
          ? (empResponse.data as PaginatedResult<Employee>).items || []
          : [];

      setDepartments(depts);
      setEmployees(emps);
    } catch (error: unknown) {
      addNotification({
        title: '加载失败',
        message: (error as { message?: string }).message || '获取公司详情失败',
        type: 'error',
      });
    }
  }, [addNotification]);

  const buildTree = useCallback((): TreeNode[] => {
    const deptMap = new Map<string, TreeNode>();

    departments.forEach((dept) => {
      deptMap.set(dept.id, {
        id: `dept-${dept.id}`,
        name: dept.name,
        type: 'item',
        children: [],
        data: dept,
      });
    });

    departments.forEach((dept) => {
      const node = deptMap.get(dept.id)!;
      if (dept.parent_id && deptMap.has(dept.parent_id)) {
        deptMap.get(dept.parent_id)!.children!.push(node);
      }
    });

    return companies.map((company) => {
      const companyDepts = departments.filter((d) => d.company_id === company.id && !d.parent_id);
      const deptNodes = companyDepts.map((d) => deptMap.get(d.id)!).filter(Boolean);

      return {
        id: company.id,
        name: company.name,
        type: 'folder',
        children: deptNodes,
        data: company,
      };
    });
  }, [companies, departments]);

  const statCards: StatCard[] = [
    {
      id: 'total',
      title: '公司总数',
      value: companies.length,
      icon: <Building style={{ width: 24, height: 24 }} />,
      color: 'primary',
    },
    {
      id: 'active',
      title: '启用公司',
      value: companies.filter((c) => c.status === 'active').length,
      icon: <Building style={{ width: 24, height: 24 }} />,
      color: 'success',
    },
    {
      id: 'departments',
      title: '部门总数',
      value: departments.length,
      icon: <Folder style={{ width: 24, height: 24 }} />,
      color: 'info',
    },
    {
      id: 'employees',
      title: '员工总数',
      value: employees.length,
      icon: <Users style={{ width: 24, height: 24 }} />,
      color: 'warning',
    },
  ];

  const rowActions: TreeAction[] = [
    {
      label: '查看',
      icon: <Eye style={{ width: 16, height: 16 }} />,
      onClick: (node) => {
        const company = node.data as Company;
        setSelectedCompany(company);
        setShowViewModal(true);
      },
    },
    {
      label: '编辑',
      icon: <Edit style={{ width: 16, height: 16 }} />,
      onClick: (node) => {
        const company = node.data as Company;
        setSelectedCompany(company);
        setFormData(company);
        setShowEditModal(true);
      },
      color: 'primary',
    },
    {
      label: '删除',
      icon: <Trash2 style={{ width: 16, height: 16 }} />,
      onClick: (node) => {
        const company = node.data as Company;
        openConfirmDialog({
          title: '确认删除',
          message: '确定要删除这个公司吗？',
          onConfirm: async () => {
            try {
              const response = await companyApi.delete(company.id);
              if (response.code === 200) {
                addNotification({
                  title: '成功',
                  message: '公司删除成功',
                  type: 'success',
                });
                fetchCompanies();
                if (selectedId === company.id) {
                  setSelectedId(undefined);
                  setDepartments([]);
                  setEmployees([]);
                }
              } else {
                addNotification({
                  title: '失败',
                  message: '删除公司失败',
                  type: 'error',
                });
              }
            } catch (error: unknown) {
              addNotification({
                title: '失败',
                message: (error as { message?: string }).message || '删除公司失败',
                type: 'error',
              });
            }
          },
          danger: true,
        });
      },
      color: 'error',
      divider: true,
    },
  ];

  const filterOptions = [
    { label: '全部状态', value: 'all' },
    { label: '启用', value: 'active' },
    { label: '禁用', value: 'inactive' },
    { label: '归档', value: 'archived' },
  ];

  const selectedCompanyData = companies.find((c) => c.id === selectedId);

  const detailPanel = selectedCompanyData ? (
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
              <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
                <Building sx={{ width: 24, height: 24 }} />
              </Avatar>
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 600 }}>
                  {selectedCompanyData.name}
                </Typography>
                {selectedCompanyData.short_name && (
                  <Typography variant='body2' color='text.secondary'>
                    {selectedCompanyData.short_name}
                  </Typography>
                )}
              </Box>
            </Box>
          }
          action={
            <Chip
              size='small'
              color={selectedCompanyData.status === 'active' ? 'success' : 'default'}
              label={selectedCompanyData.status === 'active' ? '启用' : selectedCompanyData.status === 'inactive' ? '禁用' : '归档'}
              variant='outlined'
            />
          }
        />
        <CardContent>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2 }}>
                <Typography variant='caption' color='text.secondary'>部门数量</Typography>
                <Typography variant='h5' sx={{ fontWeight: 700 }}>{departments.length}</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2 }}>
                <Typography variant='caption' color='text.secondary'>员工数量</Typography>
                <Typography variant='h5' sx={{ fontWeight: 700 }}>{employees.length}</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2 }}>
                <Typography variant='caption' color='text.secondary'>注册号</Typography>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  {selectedCompanyData.registration_number || '-'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ bgcolor: 'grey.50', borderRadius: 2, p: 2 }}>
                <Typography variant='caption' color='text.secondary'>税号</Typography>
                <Typography variant='body2' sx={{ fontWeight: 500 }}>
                  {selectedCompanyData.tax_number || '-'}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {selectedCompanyData.address && (
            <Box sx={{ mb: 3 }}>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 0.5 }}>地址</Typography>
              <Typography variant='body2'>{selectedCompanyData.address}</Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            {selectedCompanyData.contact_phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                <Phone sx={{ width: 16, height: 16 }} />
                <Typography variant='body2'>{selectedCompanyData.contact_phone}</Typography>
              </Box>
            )}
            {selectedCompanyData.email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                <Mail sx={{ width: 16, height: 16 }} />
                <Typography variant='body2'>{selectedCompanyData.email}</Typography>
              </Box>
            )}
            {selectedCompanyData.website && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                <Globe sx={{ width: 16, height: 16 }} />
                <Typography variant='body2'>{selectedCompanyData.website}</Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Folder sx={{ width: 20, height: 20, color: 'warning.main' }} />
              <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>部门列表</Typography>
              <Chip size='small' variant='outlined' label={`${departments.length} 个`} sx={{ ml: 'auto' }} />
            </Box>

            {departments.length === 0 ? (
              <EmptyState emoji='📁' title='暂无部门数据' compact />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {departments.map((dept) => (
                  <Box
                    key={dept.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'grey.100' },
                    }}
                  >
                    <Box>
                      <Typography variant='body2' sx={{ fontWeight: 500 }}>{dept.name}</Typography>
                      {dept.code && (
                        <Typography variant='caption' color='text.secondary'>编码: {dept.code}</Typography>
                      )}
                    </Box>
                    <Chip
                      size='small'
                      variant={dept.status === 'active' ? 'filled' : 'outlined'}
                      label={dept.status === 'active' ? '启用' : '禁用'}
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

  useEffect(() => {
    fetchCompanies({ page_size: 100 });
  }, [fetchCompanies]);

  useEffect(() => {
    if (selectedId) {
      fetchCompanyDetails(selectedId);
    } else {
      setDepartments([]);
      setEmployees([]);
    }
  }, [selectedId, fetchCompanyDetails]);

  const handleSearch = useCallback(() => {
    fetchCompanies({
      search: searchText || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    });
  }, [searchText, statusFilter, fetchCompanies]);

  const handleReset = useCallback(() => {
    setSearchText('');
    setStatusFilter('all');
    setSelectedId(undefined);
    fetchCompanies();
  }, [fetchCompanies]);

  const handleAdd = useCallback(() => {
    setSelectedCompany(null);
    setFormData({
      status: 'active',
      organization_id: '00000000-0000-0000-0000-000000000001',
    });
    setShowCreateModal(true);
  }, []);

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await companyApi.create(formData);
        addNotification({
          title: '成功',
          message: '公司创建成功',
          type: 'success',
        });
        setShowCreateModal(false);
        setFormData({});
        fetchCompanies();
      } catch (error: unknown) {
        addNotification({
          title: '失败',
          message: (error as { message?: string }).message || '创建公司失败',
          type: 'error',
        });
      }
    },
    [formData, addNotification, fetchCompanies]
  );

  const handleUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedCompany) return;
      try {
        await companyApi.update(selectedCompany.id, formData);
        addNotification({
          title: '成功',
          message: '公司更新成功',
          type: 'success',
        });
        setShowEditModal(false);
        setSelectedCompany(null);
        fetchCompanies();
      } catch (error: unknown) {
        addNotification({
          title: '失败',
          message: (error as { message?: string }).message || '更新公司失败',
          type: 'error',
        });
      }
    },
    [selectedCompany, formData, addNotification, fetchCompanies]
  );

  const handleInputChange = useCallback((field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSelectNode = useCallback((node: TreeNode | null) => {
    if (node && node.type === 'folder') {
      setSelectedId(node.id);
    }
  }, []);

  return (
    <PageContainer maxWidth='xl'>
      <TreePageTemplate
        title='公司管理'
        subtitle='管理企业基本信息和组织架构'
        stats={statCards}
        data={buildTree()}
        loading={loading}
        searchPlaceholder='搜索公司名称、编码或邮箱...'
        filterOptions={filterOptions}
        filterValue={statusFilter}
        onFilterChange={(value) => setStatusFilter(value)}
        onSearch={handleSearch}
        onReset={handleReset}
        onAdd={handleAdd}
        addButtonText='新增公司'
        addButtonIcon={<Plus style={{ width: 18, height: 18 }} />}
        rowActions={rowActions}
        onSelect={handleSelectNode}
        selectedId={selectedId}
        detailPanel={detailPanel}
        detailPanelTitle='公司详情'
        onRefresh={() => fetchCompanies()}
        treeWidth={360}
        emptyState={{
          emoji: '🏢',
          title: '暂无公司数据',
          actionLabel: '新增公司',
          onAction: handleAdd,
        }}
      />

      <Dialog
        open={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
        }}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{showCreateModal ? '新增公司' : '编辑公司'}</DialogTitle>
        <DialogContent sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Box component='form' onSubmit={showCreateModal ? handleCreate : handleUpdate} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>
                公司名称{' '}
                <Typography component='span' sx={{ color: 'error.main' }}>*</Typography>
              </InputLabel>
              <TextField
                fullWidth
                size='small'
                required
                value={(formData as Company)?.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder='请输入公司名称'
              />
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>公司简称</InputLabel>
              <TextField
                fullWidth
                size='small'
                value={(formData as Company)?.short_name || ''}
                onChange={(e) => handleInputChange('short_name', e.target.value)}
                placeholder='请输入公司简称'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>注册号</InputLabel>
                <TextField
                  fullWidth
                  size='small'
                  value={(formData as Company)?.registration_number || ''}
                  onChange={(e) => handleInputChange('registration_number', e.target.value)}
                  placeholder='请输入注册号'
                />
              </Box>
              <Box>
                <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>税号</InputLabel>
                <TextField
                  fullWidth
                  size='small'
                  value={(formData as Company)?.tax_number || ''}
                  onChange={(e) => handleInputChange('tax_number', e.target.value)}
                  placeholder='请输入税号'
                />
              </Box>
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>地址</InputLabel>
              <TextField
                fullWidth
                size='small'
                multiline
                rows={2}
                value={(formData as Company)?.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder='请输入地址'
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>联系电话</InputLabel>
                <TextField
                  fullWidth
                  size='small'
                  value={(formData as Company)?.contact_phone || ''}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  placeholder='请输入联系电话'
                />
              </Box>
              <Box>
                <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>邮箱</InputLabel>
                <TextField
                  fullWidth
                  size='small'
                  type='email'
                  value={(formData as Company)?.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder='请输入邮箱'
                />
              </Box>
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>网站</InputLabel>
              <TextField
                fullWidth
                size='small'
                value={(formData as Company)?.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder='请输入网站地址'
              />
            </Box>
            <Box>
              <InputLabel sx={{ mb: 0.5, fontSize: 14, fontWeight: 500 }}>状态</InputLabel>
              <FormControl fullWidth size='small'>
                <Select
                  value={(formData as Company)?.status || 'active'}
                  onChange={(e) => handleInputChange('status', e.target.value as string)}
                >
                  <MenuItem value='active'>启用</MenuItem>
                  <MenuItem value='inactive'>禁用</MenuItem>
                  <MenuItem value='archived'>归档</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <DialogActions sx={{ p: 0, pt: 2, justifyContent: 'flex-end', gap: 1 }}>
              <Button variant='outlined' onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
              }}>
                取消
              </Button>
              <Button type='submit' variant='contained'>
                {showCreateModal ? '创建' : '保存'}
              </Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={showViewModal} onClose={() => setShowViewModal(false)} maxWidth='sm' fullWidth>
        <DialogTitle>公司详情</DialogTitle>
        <DialogContent>
          {selectedCompany && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Box>
                <Typography variant='caption' color='text.secondary'>公司名称</Typography>
                <Typography variant='body1' sx={{ fontWeight: 500 }}>{selectedCompany.name}</Typography>
              </Box>
              {selectedCompany.short_name && (
                <Box>
                  <Typography variant='caption' color='text.secondary'>公司简称</Typography>
                  <Typography variant='body1'>{selectedCompany.short_name}</Typography>
                </Box>
              )}
              {selectedCompany.registration_number && (
                <Box>
                  <Typography variant='caption' color='text.secondary'>注册号</Typography>
                  <Typography variant='body1'>{selectedCompany.registration_number}</Typography>
                </Box>
              )}
              {selectedCompany.tax_number && (
                <Box>
                  <Typography variant='caption' color='text.secondary'>税号</Typography>
                  <Typography variant='body1'>{selectedCompany.tax_number}</Typography>
                </Box>
              )}
              {selectedCompany.address && (
                <Box>
                  <Typography variant='caption' color='text.secondary'>地址</Typography>
                  <Typography variant='body1'>{selectedCompany.address}</Typography>
                </Box>
              )}
              {selectedCompany.contact_phone && (
                <Box>
                  <Typography variant='caption' color='text.secondary'>联系电话</Typography>
                  <Typography variant='body1'>{selectedCompany.contact_phone}</Typography>
                </Box>
              )}
              {selectedCompany.email && (
                <Box>
                  <Typography variant='caption' color='text.secondary'>邮箱</Typography>
                  <Typography variant='body1'>{selectedCompany.email}</Typography>
                </Box>
              )}
              {selectedCompany.website && (
                <Box>
                  <Typography variant='caption' color='text.secondary'>网站</Typography>
                  <Typography variant='body1'>{selectedCompany.website}</Typography>
                </Box>
              )}
              <Box>
                <Typography variant='caption' color='text.secondary'>状态</Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    size='small'
                    color={selectedCompany.status === 'active' ? 'success' : 'default'}
                    label={selectedCompany.status === 'active' ? '启用' : selectedCompany.status === 'inactive' ? '禁用' : '归档'}
                    variant='outlined'
                  />
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowViewModal(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

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

export default HrmCompanyPage;