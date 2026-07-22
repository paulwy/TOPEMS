import React, { useState, useEffect, useCallback } from 'react';
import {
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import type {
  SupplierAdmission,
  CreateSupplierAdmissionRequest,
  UpdateSupplierAdmissionRequest,
} from '@/api/scm';
import { scmApi } from '@/api/scm';
import { useNotificationStore } from '@/store';
import { Plus, Edit, Trash2, Check, XCircle, Send, UserCheck, ClipboardCheck } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import { designTokens } from '@/theme/tokens';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useUrlListState, useUrlState } from '@/hooks';

const ct = designTokens.colors;

const statusConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  draft: { label: '草稿', color: 'default' },
  pending: { label: '待审核', color: 'warning' },
  auditing: { label: '审核中', color: 'primary' },
  approved: { label: '已通过', color: 'success' },
  rejected: { label: '已拒绝', color: 'error' },
  active: { label: '已准入', color: 'success' },
  cancelled: { label: '已取消', color: 'default' },
};

const riskLevelConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  low: { label: '低风险', color: 'success' },
  medium: { label: '中风险', color: 'warning' },
  high: { label: '高风险', color: 'error' },
};

const categoryConfig: Record<string, string> = {
  raw_material: '原材料供应商',
  component: '零部件供应商',
  equipment: '设备供应商',
  service: '服务供应商',
  packaging: '包装材料供应商',
  other: '其他供应商',
};

const SupplierAdmissionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const listState = useUrlListState({
    defaultPageSize: 10,
    baseIndex: 1,
    historyMode: 'replace',
  });
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<SupplierAdmission | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);
  const [activeTab, setActiveTab] = useUrlState<number>('tab', 0);
  const [formData, setFormData] = useState<CreateSupplierAdmissionRequest>({
    admission_no: '',
    supplier_name: '',
    short_name: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    business_license: '',
    tax_registration: '',
    organization_code: '',
    legal_representative: '',
    registered_capital: '',
    established_date: '',
    business_scope: '',
    supplier_category: 'raw_material',
    applicant: '',
    remarks: '',
  });

  const { addNotification } = useNotificationStore();

  const admissionsQuery = useQuery<{ items: SupplierAdmission[]; total: number }>({
    queryKey: [...QUERY_KEYS.SCM.SUPPLIER_ADMISSIONS, listState.currentPage, listState.pageSize],
    queryFn: async () => {
      const response = await scmApi.supplierAdmissions.list({
        page: listState.currentPage,
        pageSize: listState.pageSize,
      });
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  const admissions = admissionsQuery.data?.items ?? [];
  const total = admissionsQuery.data?.total ?? 0;
  const loading = admissionsQuery.isLoading;

  useEffect(() => {
    if (admissionsQuery.isError) {
      apiLogger.error('加载供应商准入失败:', admissionsQuery.error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载供应商准入',
      });
    }
  }, [admissionsQuery.isError, admissionsQuery.error, addNotification]);

  const invalidateAdmissions = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SCM.SUPPLIER_ADMISSIONS });

  const createMutation = useMutation({
    mutationFn: (data: CreateSupplierAdmissionRequest) => scmApi.supplierAdmissions.create(data),
    onSuccess: () => {
      invalidateAdmissions();
      addNotification({
        type: 'success',
        title: '创建成功',
        message: '新供应商准入已创建',
      });
      setShowDialog(false);
      resetForm();
    },
    onError: (err: unknown) => {
      apiLogger.error('操作失败:', err);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '创建供应商准入失败',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: { id: string; data: UpdateSupplierAdmissionRequest }) =>
      scmApi.supplierAdmissions.update(params.id, params.data),
    onSuccess: () => {
      invalidateAdmissions();
      addNotification({
        type: 'success',
        title: '更新成功',
        message: '供应商准入已更新',
      });
      setShowDialog(false);
      resetForm();
    },
    onError: (err: unknown) => {
      apiLogger.error('操作失败:', err);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '更新供应商准入失败',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => scmApi.supplierAdmissions.delete(id),
    onSuccess: () => {
      invalidateAdmissions();
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '供应商准入已删除',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error('删除失败:', err);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '删除供应商准入失败',
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => scmApi.supplierAdmissions.submit(id),
    onSuccess: () => {
      invalidateAdmissions();
      addNotification({
        type: 'success',
        title: '提交成功',
        message: '供应商准入已提交审核',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error('提交失败:', err);
      addNotification({
        type: 'error',
        title: '提交失败',
        message: '提交供应商准入失败',
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => scmApi.supplierAdmissions.approve(id),
    onSuccess: () => {
      invalidateAdmissions();
      addNotification({
        type: 'success',
        title: '已通过',
        message: '供应商准入已通过',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error('操作失败:', err);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '通过供应商准入失败',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => scmApi.supplierAdmissions.reject(id),
    onSuccess: () => {
      invalidateAdmissions();
      addNotification({
        type: 'success',
        title: '已拒绝',
        message: '供应商准入已拒绝',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error('操作失败:', err);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '拒绝供应商准入失败',
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => scmApi.supplierAdmissions.activateSupplier(id),
    onSuccess: () => {
      invalidateAdmissions();
      addNotification({
        type: 'success',
        title: '准入成功',
        message: '供应商已正式准入',
      });
    },
    onError: (err: unknown) => {
      apiLogger.error('准入失败:', err);
      addNotification({
        type: 'error',
        title: '准入失败',
        message: '供应商准入失败',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedAdmission) {
      const updateData: UpdateSupplierAdmissionRequest = {
        supplier_name: formData.supplier_name,
        short_name: formData.short_name,
        contact_person: formData.contact_person,
        contact_phone: formData.contact_phone,
        contact_email: formData.contact_email,
        address: formData.address,
        business_license: formData.business_license,
        tax_registration: formData.tax_registration,
        organization_code: formData.organization_code,
        legal_representative: formData.legal_representative,
        registered_capital: formData.registered_capital,
        established_date: formData.established_date,
        business_scope: formData.business_scope,
        supplier_category: formData.supplier_category,
        remarks: formData.remarks,
      };
      updateMutation.mutate({ id: selectedAdmission.id, data: updateData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (admission: SupplierAdmission) => {
    setSelectedAdmission(admission);
    setFormData({
      admission_no: admission.admission_no,
      supplier_name: admission.supplier_name,
      short_name: admission.short_name || '',
      contact_person: admission.contact_person || '',
      contact_phone: admission.contact_phone || '',
      contact_email: admission.contact_email || '',
      address: admission.address || '',
      business_license: admission.business_license || '',
      tax_registration: admission.tax_registration || '',
      organization_code: admission.organization_code || '',
      legal_representative: admission.legal_representative || '',
      registered_capital: admission.registered_capital || '',
      established_date: admission.established_date || '',
      business_scope: admission.business_scope || '',
      supplier_category: admission.supplier_category || 'raw_material',
      applicant: admission.applicant || '',
      remarks: admission.remarks || '',
    });
    setIsEditing(true);
    setShowDialog(true);
  };

  const openConfirmDialog = useCallback((config: {
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }) => {
    setConfirmDialogConfig(config);
    setConfirmDialogOpen(true);
  }, []);

  const handleDelete = (admission: SupplierAdmission) => {
    openConfirmDialog({
      title: '确认删除',
      message: `确定要删除供应商准入 "${admission.admission_no}" 吗？`,
      onConfirm: () => {
        deleteMutation.mutate(admission.id);
      },
      danger: true,
    });
  };

  const handleSubmitForApproval = useCallback(
    (admission: SupplierAdmission) => {
      openConfirmDialog({
        title: '确认提交',
        message: `确定要提交供应商准入 "${admission.admission_no}" 审核吗？`,
        onConfirm: () => {
          submitMutation.mutate(admission.id);
        },
      });
    },
    [openConfirmDialog, submitMutation]
  );

  const handleApprove = useCallback(
    (admission: SupplierAdmission) => {
      openConfirmDialog({
        title: '确认通过',
        message: `确定要通过供应商准入 "${admission.admission_no}" 吗？`,
        onConfirm: () => {
          approveMutation.mutate(admission.id);
        },
      });
    },
    [openConfirmDialog, approveMutation]
  );

  const handleReject = useCallback(
    (admission: SupplierAdmission) => {
      openConfirmDialog({
        title: '确认拒绝',
        message: `确定要拒绝供应商准入 "${admission.admission_no}" 吗？`,
        onConfirm: () => {
          rejectMutation.mutate(admission.id);
        },
        danger: true,
      });
    },
    [openConfirmDialog, rejectMutation]
  );

  const handleActivateSupplier = useCallback(
    (admission: SupplierAdmission) => {
      openConfirmDialog({
        title: '确认准入',
        message: `确定要将供应商 "${admission.supplier_name}" 正式准入吗？`,
        onConfirm: () => {
          activateMutation.mutate(admission.id);
        },
      });
    },
    [openConfirmDialog, activateMutation]
  );

  const resetForm = () => {
    setFormData({
      admission_no: '',
      supplier_name: '',
      short_name: '',
      contact_person: '',
      contact_phone: '',
      contact_email: '',
      address: '',
      business_license: '',
      tax_registration: '',
      organization_code: '',
      legal_representative: '',
      registered_capital: '',
      established_date: '',
      business_scope: '',
      supplier_category: 'raw_material',
      applicant: '',
      remarks: '',
    });
    setIsEditing(false);
    setSelectedAdmission(null);
    setActiveTab(0);
  };

  const columns: ColumnDef<SupplierAdmission>[] = [
    {
      id: 'admission_no',
      label: '申请单号',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.admission_no}</Box>,
    },
    {
      id: 'supplier_name',
      label: '供应商名称',
    },
    {
      id: 'supplier_category',
      label: '供应商类别',
      render: (row) => categoryConfig[row.supplier_category || ''] || row.supplier_category || '-',
    },
    {
      id: 'contact_person',
      label: '联系人',
      render: (row) => row.contact_person || '-',
    },
    {
      id: 'contact_phone',
      label: '联系电话',
      render: (row) => row.contact_phone || '-',
    },
    {
      id: 'risk_level',
      label: '风险等级',
      render: (row) => {
        const config = riskLevelConfig[row.risk_level || 'medium'] || riskLevelConfig.medium;
        return (
          <Chip
            size='small'
            label={config.label}
            color={config.color}
            variant='outlined'
          />
        );
      },
    },
    {
      id: 'status',
      label: '状态',
      render: (row) => {
        const config = statusConfig[row.status] || statusConfig.draft;
        return (
          <Chip
            size='small'
            label={config.label}
            color={config.color}
            variant='outlined'
          />
        );
      },
    },
    {
      id: 'applicant',
      label: '申请人',
      render: (row) => row.applicant || '-',
    },
    {
      id: 'application_date',
      label: '申请日期',
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>
          {row.application_date ? new Date(row.application_date).toLocaleDateString('zh-CN') : '-'}
        </Box>
      ),
    },
    {
      id: 'status_actions',
      label: '操作',
      align: 'center',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {row.status === 'draft' && (
            <Button
              size='small'
              color='primary'
              onClick={() => handleSubmitForApproval(row)}
              startIcon={<Send size={12} />}
            >
              提交
            </Button>
          )}
          {row.status === 'pending' && (
            <>
              <Button
                size='small'
                color='success'
                onClick={() => handleApprove(row)}
                startIcon={<Check size={12} />}
              >
                通过
              </Button>
              <Button
                size='small'
                color='error'
                onClick={() => handleReject(row)}
                startIcon={<XCircle size={12} />}
              >
                拒绝
              </Button>
            </>
          )}
          {row.status === 'approved' && (
            <Button
              size='small'
              color='success'
              onClick={() => handleActivateSupplier(row)}
              startIcon={<UserCheck size={12} />}
            >
              准入
            </Button>
          )}
        </Box>
      ),
    },
  ];

  const rowActions = [
    {
      label: '编辑',
      icon: <Edit size={14} />,
      onClick: (row: SupplierAdmission) => handleEdit(row),
    },
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      color: 'error' as const,
      onClick: (row: SupplierAdmission) => handleDelete(row),
    },
  ];

  return (
    <PageContainer
      title='供应商准入管理'
      subtitle='管理供应商准入流程，包括资质审核、风险评估、正式准入等'
      maxWidth='xl'
      headerProps={{
        pageIcon: <UserCheck style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main}, ${ct.success.dark})`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={admissions}
        loading={loading}
        pagination={{
          page: listState.currentPage - 1,
          pageSize: listState.pageSize,
          total,
          onPageChange: (page) => listState.setCurrentPage(page + 1),
          onPageSizeChange: (size) => {
            listState.setPageSize(size);
            listState.setCurrentPage(1);
          },
        }}
        actions={[
          {
            label: '新增准入申请',
            icon: <Plus size={16} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        onRefresh={() => admissionsQuery.refetch()}
        emptyMessage='暂无供应商准入数据'
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑供应商准入' : '新增供应商准入'}</DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
            >
              <Tab
                label='基本信息'
                icon={<UserCheck size={16} />}
                iconPosition='start'
              />
              <Tab
                label='资质信息'
                icon={<ClipboardCheck size={16} />}
                iconPosition='start'
              />
            </Tabs>
          </Box>
          <form onSubmit={handleSubmit}>
            {activeTab === 0 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                  py: 1,
                }}
              >
                <TextField
                  label='申请单号 *'
                  value={formData.admission_no}
                  onChange={(e) => setFormData({ ...formData, admission_no: e.target.value })}
                  size='small'
                  required
                  disabled={isEditing}
                />
                <TextField
                  label='供应商名称 *'
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  size='small'
                  required
                />
                <TextField
                  label='简称'
                  value={formData.short_name}
                  onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
                  size='small'
                />
                <FormControl size='small'>
                  <InputLabel>供应商类别</InputLabel>
                  <Select
                    value={formData.supplier_category}
                    label='供应商类别'
                    onChange={(e) =>
                      setFormData({ ...formData, supplier_category: e.target.value })
                    }
                  >
                    {Object.entries(categoryConfig).map(([key, label]) => (
                      <MenuItem
                        key={key}
                        value={key}
                      >
                        {label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label='联系人'
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  size='small'
                />
                <TextField
                  label='联系电话'
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  size='small'
                />
                <TextField
                  label='联系邮箱'
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  size='small'
                />
                <TextField
                  label='申请人'
                  value={formData.applicant}
                  onChange={(e) => setFormData({ ...formData, applicant: e.target.value })}
                  size='small'
                />
                <TextField
                  label='地址'
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  size='small'
                  sx={{ gridColumn: '1 / -1' }}
                />
              </Box>
            )}
            {activeTab === 1 && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                  py: 1,
                }}
              >
                <TextField
                  label='营业执照号'
                  value={formData.business_license}
                  onChange={(e) => setFormData({ ...formData, business_license: e.target.value })}
                  size='small'
                />
                <TextField
                  label='税务登记号'
                  value={formData.tax_registration}
                  onChange={(e) => setFormData({ ...formData, tax_registration: e.target.value })}
                  size='small'
                />
                <TextField
                  label='组织机构代码'
                  value={formData.organization_code}
                  onChange={(e) => setFormData({ ...formData, organization_code: e.target.value })}
                  size='small'
                />
                <TextField
                  label='法定代表人'
                  value={formData.legal_representative}
                  onChange={(e) =>
                    setFormData({ ...formData, legal_representative: e.target.value })
                  }
                  size='small'
                />
                <TextField
                  label='注册资本'
                  value={formData.registered_capital}
                  onChange={(e) => setFormData({ ...formData, registered_capital: e.target.value })}
                  size='small'
                />
                <TextField
                  label='成立日期'
                  type='date'
                  value={formData.established_date}
                  onChange={(e) => setFormData({ ...formData, established_date: e.target.value })}
                  size='small'
                  slotProps={{ inputLabel: { shrink: true } } as const}
                />
                <TextField
                  label='经营范围'
                  value={formData.business_scope}
                  onChange={(e) => setFormData({ ...formData, business_scope: e.target.value })}
                  size='small'
                  sx={{ gridColumn: '1 / -1' }}
                  multiline
                  rows={2}
                />
              </Box>
            )}
            <TextField
              label='备注'
              multiline
              rows={2}
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              fullWidth
              size='small'
              sx={{ mt: 2 }}
            />
            <DialogActions sx={{ mt: 2 }}>
              <Button
                variant='outlined'
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button
                type='submit'
                variant='contained'
              >
                {isEditing ? '更新' : '保存'}
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
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

export default SupplierAdmissionPage;
