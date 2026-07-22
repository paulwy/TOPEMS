import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  Stack,
  Typography,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type {
  MaterialRequirement,
  CreateMaterialRequirementRequest,
  UpdateMaterialRequirementRequest,
  ListParams,
} from '@/api/mes';
import { mesApi } from '@/api/mes';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye, Calculator, CheckCircle, Send } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const MaterialRequirementPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<MaterialRequirement | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateMaterialRequirementRequest>({
    product_code: '',
    product_name: '',
    material_code: '',
    material_name: '',
    required_quantity: 0,
    required_date: '',
    priority: 'normal',
  });

  const { addNotification } = useNotificationStore();

  const params: ListParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data: requirementsData, isLoading: loading } = useQuery({
    queryKey: [...QUERY_KEYS.MES.MATERIAL_REQUIREMENTS, params],
    queryFn: async () => {
      const response = await mesApi.materialRequirements.list(params);
      if (response.success && response.data) {
        return {
          requirements: response.data.requirements || [],
          total: response.data.total || 0,
        };
      }
      return { requirements: [], total: 0 };
    },
  });

  const requirements = requirementsData?.requirements || [];
  const total = requirementsData?.total || 0;

  const invalidateRequirements = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MES.MATERIAL_REQUIREMENTS });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateMaterialRequirementRequest) =>
      mesApi.materialRequirements.create(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.material_requirement_page.create'), message: t('mes.material_requirement_page.create_1') });
      invalidateRequirements();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.material_requirement_page.operation_failed'), error);
      addNotification({ type: 'error', title: t('mes.material_requirement_page.operation_failed_1'), message: t('mes.material_requirement_page.create_2') });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMaterialRequirementRequest }) =>
      mesApi.materialRequirements.update(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.material_requirement_page.update'), message: t('mes.material_requirement_page.update_1') });
      invalidateRequirements();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.material_requirement_page.operation_failed'), error);
      addNotification({ type: 'error', title: t('mes.material_requirement_page.operation_failed_1'), message: t('mes.material_requirement_page.update_2') });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mesApi.materialRequirements.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.material_requirement_page.delete_success'), message: t('mes.material_requirement_page.deleted') });
      invalidateRequirements();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.material_requirement_page.delete'), error);
      addNotification({ type: 'error', title: t('mes.material_requirement_page.delete_1'), message: t('mes.material_requirement_page.delete_2') });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => mesApi.materialRequirements.confirm(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.material_requirement_page.success'), message: t('mes.material_requirement_page.confirmed') });
      invalidateRequirements();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.material_requirement_page.fail'), error);
      addNotification({ type: 'error', title: t('mes.material_requirement_page.fail_1'), message: t('mes.material_requirement_page.confirm') });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: (id: string) => mesApi.materialRequirements.release(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.material_requirement_page.success_1'), message: t('mes.material_requirement_page.material') });
      invalidateRequirements();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.material_requirement_page.fail_2'), error);
      addNotification({ type: 'error', title: t('mes.material_requirement_page.fail_3'), message: t('mes.material_requirement_page.material_1') });
    },
  });

  const calculateMutation = useMutation({
    mutationFn: (orderId: string) => mesApi.materialRequirements.calculate(orderId),
    onSuccess: (response) => {
      if (response.success && response.data) {
        addNotification({
          type: 'success',
          title: t('mes.material_requirement_page.success_2'),
          message: `已生成 ${response.data.length} 条物料需求`,
        });
        invalidateRequirements();
      }
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.material_requirement_page.fail_4'), error);
      addNotification({ type: 'error', title: t('mes.material_requirement_page.fail_5'), message: t('mes.material_requirement_page.material_3') });
    },
  });

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: t('mes.material_requirement_page.text_22b433'),
      confirmed: t('mes.material_requirement_page.confirmed_1'),
      released: t('mes.material_requirement_page.text_d3c0ae'),
      completed: t('mes.material_requirement_page.completed'),
      cancelled: t('mes.material_requirement_page.cancelled'),
    };
    return statusMap[status] || status;
  };

  const getPriorityText = (priority?: string) => {
    const priorityMap: Record<string, string> = {
      urgent: t('mes.material_requirement_page.text_cb0ed5'),
      high: t('mes.material_requirement_page.text_4296d7'),
      normal: t('mes.material_requirement_page.text_35242c'),
      low: t('mes.material_requirement_page.text_19ac67'),
    };
    return priorityMap[priority || 'normal'] || priority || '-';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRequirement) {
      updateMutation.mutate({
        id: selectedRequirement.id,
        data: formData as UpdateMaterialRequirementRequest,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t('mes.material_requirement_page.confirm_1'))) return;
    deleteMutation.mutate(id);
  };

  const handleConfirm = (id: string) => {
    confirmMutation.mutate(id);
  };

  const handleRelease = (id: string) => {
    releaseMutation.mutate(id);
  };

  const handleCalculate = () => {
    const orderId = window.prompt('请输入生产订单ID:');
    if (!orderId) return;
    calculateMutation.mutate(orderId);
  };

  const handleEdit = (req: MaterialRequirement) => {
    setSelectedRequirement(req);
    setFormData({
      order_id: req.order_id,
      product_code: req.product_code,
      product_name: req.product_name,
      material_code: req.material_code,
      material_name: req.material_name,
      specification: req.specification,
      unit: req.unit,
      required_quantity: req.required_quantity,
      required_date: req.required_date,
      priority: req.priority,
      source_type: req.source_type,
      remark: req.remark,
    });
    setShowDialog(true);
  };

  const handleViewDetail = (req: MaterialRequirement) => {
    setSelectedRequirement(req);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedRequirement(null);
    setFormData({
      product_code: '',
      product_name: '',
      material_code: '',
      material_name: '',
      required_quantity: 0,
      required_date: '',
      priority: 'normal',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        bg: string;
        color: string;
      }
    > = {
      draft: { label: t('mes.material_requirement_page.text_22b433'), bg: 'grey.100', color: 'text.secondary' },
      confirmed: { label: t('mes.material_requirement_page.confirmed_1'), bg: 'primary.100', color: 'primary.dark' },
      released: { label: t('mes.material_requirement_page.text_d3c0ae'), bg: 'warning.light', color: 'warning.700' },
      completed: { label: t('mes.material_requirement_page.completed'), bg: 'success.lighter', color: 'success.700' },
      cancelled: { label: t('mes.material_requirement_page.cancelled'), bg: 'error.lighter', color: 'error.dark' },
    };
    const s = statusMap[status] || { label: status, bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        size='small'
        label={s.label}
        sx={{ backgroundColor: s.bg, color: s.color, fontWeight: 500 }}
      />
    );
  };

  const getPriorityBadge = (priority?: string) => {
    const priorityMap: Record<
      string,
      {
        label: string;
        bg: string;
        color: string;
      }
    > = {
      urgent: { label: t('mes.material_requirement_page.text_cb0ed5'), bg: 'error.lighter', color: 'error.dark' },
      high: { label: t('mes.material_requirement_page.text_4296d7'), bg: 'warning.light', color: 'warning.700' },
      normal: { label: t('mes.material_requirement_page.text_35242c'), bg: 'primary.100', color: 'primary.dark' },
      low: { label: t('mes.material_requirement_page.text_19ac67'), bg: 'grey.100', color: 'text.secondary' },
    };
    const p = priorityMap[priority || 'normal'] || priorityMap.normal;
    return (
      <Chip
        size='small'
        label={p.label}
        sx={{ backgroundColor: p.bg, color: p.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<MaterialRequirement>[] = useMemo(
    () => [
      { id: 'mrp_no', label: t('mes.material_requirement_page.text_dc8e6a'), sortable: true },
      { id: 'order_number', label: t('mes.material_requirement_page.production'), sortable: true },
      { id: 'product_name', label: t('mes.material_requirement_page.product_name'), sortable: true },
      { id: 'material_name', label: t('mes.material_requirement_page.column_material_name'), sortable: true },
      { id: 'material_code', label: t('mes.material_requirement_page.column_material_code'), sortable: true },
      { id: 'specification', label: t('mes.material_requirement_page.spec'), sortable: true },
      { id: 'required_quantity', label: t('mes.material_requirement_page.column_demand_quantity'), sortable: true },
      { id: 'available_quantity', label: t('mes.material_requirement_page.quantity'), sortable: true },
      { id: 'shortfall_quantity', label: t('mes.material_requirement_page.quantity_1'), sortable: true },
      {
        id: 'required_date',
        label: t('mes.material_requirement_page.field_required_date'),
        render: (row) =>
          row.required_date ? new Date(row.required_date).toLocaleDateString('zh-CN') : '-',
      },
      {
        id: 'priority',
        label: t('mes.material_requirement_page.text_ee8ecb'),
        render: (row) => getPriorityBadge(row.priority),
      },
      {
        id: 'status',
        label: t('mes.material_requirement_page.filter_status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('mes.material_requirement_page.filter_status'),
        type: 'select',
        options: [
          { label: t('mes.material_requirement_page.filter_option_all_status'), value: 'all' },
          { label: t('mes.material_requirement_page.text_22b433'), value: 'draft' },
          { label: t('mes.material_requirement_page.confirmed_1'), value: 'confirmed' },
          { label: t('mes.material_requirement_page.text_d3c0ae'), value: 'released' },
          { label: t('mes.material_requirement_page.completed'), value: 'completed' },
          { label: t('mes.material_requirement_page.cancelled'), value: 'cancelled' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const rowActions: RowAction<MaterialRequirement>[] = useMemo(
    () => [
      {
        label: t('mes.material_requirement_page.action_view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: t('mes.material_requirement_page.action_edit'),
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: t('mes.material_requirement_page.confirm_2'),
        icon: <CheckCircle size={16} />,
        color: 'primary',
        onClick: (row) => handleConfirm(row.id),
        show: (row) => row.status === 'draft',
      },
      {
        label: t('mes.material_requirement_page.text_1d5fcd'),
        icon: <Send size={16} />,
        color: 'success',
        onClick: (row) => handleRelease(row.id),
        show: (row) => row.status === 'confirmed',
      },
      {
        label: t('mes.material_requirement_page.action_delete'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: t('mes.material_requirement_page.confirm_1'),
      },
    ],
    [handleViewDetail, handleEdit, handleDelete, handleConfirm, handleRelease]
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const stats = useMemo(() => {
    return {
      total: requirements.length,
      draft: requirements.filter((r) => r.status === 'draft').length,
      confirmed: requirements.filter((r) => r.status === 'confirmed').length,
      released: requirements.filter((r) => r.status === 'released').length,
      total_required: requirements.reduce((sum, r) => sum + r.required_quantity, 0),
    };
  }, [requirements]);

  if (loading) return <LoadingSpinner />;

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          总需求数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.total}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          草稿
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.draft}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'primary.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已确认
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.confirmed}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          已下达
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.released}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          需求总数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'secondary.700' }}
        >
          {stats.total_required}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Calculator style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={requirements}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={t('mes.material_requirement_page.material_name')}
        searchValue={searchTerm}
        onSearch={handleSearch}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
        actions={[
          {
            label: t('mes.material_requirement_page.dialog_create_title'),
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
          {
            label: t('mes.material_requirement_page.text_3e1f1d'),
            icon: <Calculator size={16} />,
            onClick: handleCalculate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage={t('mes.material_requirement_page.empty_message')}
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedRequirement ? t('mes.material_requirement_page.edit') : t('mes.material_requirement_page.add')}</DialogTitle>
        <DialogContent>
          <Box
            component='span'
            sx={{
              display: 'block',
              color: 'text.secondary',
              mb: 2,
              fontSize: 14,
            }}
          >
            {selectedRequirement ? t('mes.material_requirement_page.info') : t('mes.material_requirement_page.info_1')}
          </Box>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='product_code'>产品编码 *</InputLabel>
                <TextField
                  id='product_code'
                  required
                  size='small'
                  value={formData.product_code}
                  onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='product_name'>产品名称 *</InputLabel>
                <TextField
                  id='product_name'
                  required
                  size='small'
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='material_code'>物料编码 *</InputLabel>
                <TextField
                  id='material_code'
                  required
                  size='small'
                  value={formData.material_code}
                  onChange={(e) => setFormData({ ...formData, material_code: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='material_name'>物料名称 *</InputLabel>
                <TextField
                  id='material_name'
                  required
                  size='small'
                  value={formData.material_name}
                  onChange={(e) => setFormData({ ...formData, material_name: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='required_quantity'>需求数量 *</InputLabel>
                <TextField
                  id='required_quantity'
                  type='number'
                  required
                  size='small'
                  value={formData.required_quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      required_quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='required_date'>需求日期 *</InputLabel>
                <TextField
                  id='required_date'
                  type='date'
                  required
                  size='small'
                  value={formData.required_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      required_date: e.target.value,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='priority'>优先级</InputLabel>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <Select
                    id='priority'
                    value={formData.priority || 'normal'}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <MenuItem value='low'>低</MenuItem>
                    <MenuItem value='normal'>普通</MenuItem>
                    <MenuItem value='high'>高</MenuItem>
                    <MenuItem value='urgent'>紧急</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='unit'>单位</InputLabel>
                <TextField
                  id='unit'
                  size='small'
                  value={formData.unit || ''}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: '1 / -1' }}>
                <InputLabel htmlFor='remark'>备注</InputLabel>
                <TextField
                  id='remark'
                  size='small'
                  multiline
                  rows={2}
                  value={formData.remark || ''}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                />
              </Box>
            </Box>
            <DialogActions>
              <Button
                type='button'
                variant='outlined'
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button
                type='submit'
                variant='contained'
              >
                保存
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>物料需求详情</DialogTitle>
        <DialogContent>
          {selectedRequirement && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>需求单号</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedRequirement.mrp_no}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>生产订单</InputLabel>
                  <Box component='span'>{selectedRequirement.order_number || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>产品编码</InputLabel>
                  <Box component='span'>{selectedRequirement.product_code}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>产品名称</InputLabel>
                  <Box component='span'>{selectedRequirement.product_name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>物料编码</InputLabel>
                  <Box component='span'>{selectedRequirement.material_code}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>物料名称</InputLabel>
                  <Box component='span'>{selectedRequirement.material_name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>规格型号</InputLabel>
                  <Box component='span'>{selectedRequirement.specification || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>单位</InputLabel>
                  <Box component='span'>{selectedRequirement.unit || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>需求数量</InputLabel>
                  <Box component='span'>{selectedRequirement.required_quantity}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>可用数量</InputLabel>
                  <Box component='span'>{selectedRequirement.available_quantity || 0}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>缺口数量</InputLabel>
                  <Box
                    component='span'
                    sx={{
                      color:
                        (selectedRequirement.shortfall_quantity || 0) > 0
                          ? 'error.main'
                          : 'success.main',
                      fontWeight: 500,
                    }}
                  >
                    {selectedRequirement.shortfall_quantity || 0}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>需求日期</InputLabel>
                  <Box component='span'>
                    {selectedRequirement.required_date
                      ? new Date(selectedRequirement.required_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>优先级</InputLabel>
                  <Box>{getPriorityBadge(selectedRequirement.priority)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedRequirement.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>来源类型</InputLabel>
                  <Box component='span'>{selectedRequirement.source_type || '-'}</Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>备注</InputLabel>
                  <Box component='span'>{selectedRequirement.remark || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedRequirement.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>更新时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedRequirement.updated_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default MaterialRequirementPage;
