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
  QualityInspection,
  CreateQualityInspectionRequest,
  UpdateQualityInspectionRequest,
} from '@/api/mes/quality';
import type { ListParams } from '@/api/mes';
import { qualityApi } from '@/api/mes/quality';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye, CheckCircle, XCircle, Download } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
import * as XLSX from 'xlsx';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const QualityInspectionPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<QualityInspection | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    order_id: '',
    product_code: '',
    product_name: '',
    process_id: '',
    inspection_type: 'incoming',
    quantity: 0,
    qualified_quantity: 0,
    unqualified_quantity: 0,
    inspector: '',
    inspection_time: '',
    result: '',
    memo: '',
  });

  const { addNotification } = useNotificationStore();

  const params: ListParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data: inspectionsData, isLoading: loading } = useQuery({
    queryKey: [...QUERY_KEYS.MES.QUALITY_INSPECTIONS, params],
    queryFn: async () => {
      const response = await qualityApi.listInspections(params);
      if (response.success && response.data) {
        return {
          inspections: response.data.inspections || [],
          total: response.data.total || 0,
        };
      }
      return { inspections: [], total: 0 };
    },
  });

  const inspections = inspectionsData?.inspections || [];
  const total = inspectionsData?.total || 0;

  const invalidateInspections = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MES.QUALITY_INSPECTIONS });
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: t('mes.quality_inspection_page.status_pending'),
      inspecting: t('mes.quality_inspection_page.status_in_progress'),
      passed: t('mes.quality_inspection_page.result_qualified'),
      failed: t('mes.quality_inspection_page.result_unqualified'),
      rework: t('mes.quality_inspection_page.text_98e01c'),
      scrapped: t('mes.quality_inspection_page.scrap'),
    };
    return statusMap[status] || status;
  };

  const getInspectionTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      incoming: t('mes.quality_inspection_page.inspection'),
      process: t('mes.quality_inspection_page.type_process'),
      final: t('mes.quality_inspection_page.inspection_1'),
      outgoing: t('mes.quality_inspection_page.inspection_2'),
      patrol: t('mes.quality_inspection_page.patrol'),
    };
    return typeMap[type] || type;
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateQualityInspectionRequest) => qualityApi.createInspection(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.quality_inspection_page.create'), message: t('mes.quality_inspection_page.create_1') });
      invalidateInspections();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.quality_inspection_page.operation_failed'), error);
      addNotification({ type: 'error', title: t('mes.quality_inspection_page.operation_failed_1'), message: t('mes.quality_inspection_page.create_2') });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQualityInspectionRequest }) =>
      qualityApi.updateInspection(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.quality_inspection_page.update'), message: t('mes.quality_inspection_page.update_1') });
      invalidateInspections();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.quality_inspection_page.operation_failed'), error);
      addNotification({ type: 'error', title: t('mes.quality_inspection_page.operation_failed_1'), message: t('mes.quality_inspection_page.update_2') });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => qualityApi.deleteInspection(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.quality_inspection_page.delete_success'), message: t('mes.quality_inspection_page.deleted') });
      invalidateInspections();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.quality_inspection_page.delete'), error);
      addNotification({ type: 'error', title: t('mes.quality_inspection_page.delete_1'), message: t('mes.quality_inspection_page.delete_2') });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedInspection) {
      const updateData: UpdateQualityInspectionRequest = {
        qualified_quantity: formData.qualified_quantity,
        unqualified_quantity: formData.unqualified_quantity,
        inspector: formData.inspector,
        inspection_time: formData.inspection_time,
        result: formData.result,
        memo: formData.memo,
      };
      updateMutation.mutate({ id: selectedInspection.id, data: updateData });
    } else {
      const createData: CreateQualityInspectionRequest = {
        order_id: formData.order_id,
        product_code: formData.product_code,
        product_name: formData.product_name,
        process_id: formData.process_id,
        inspection_type: formData.inspection_type,
        quantity: formData.quantity,
        inspector: formData.inspector,
        inspection_time: formData.inspection_time,
        result: formData.result,
        memo: formData.memo,
      };
      createMutation.mutate(createData);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t('mes.quality_inspection_page.confirm'))) return;
    deleteMutation.mutate(id);
  };

  const handleBatchExport = (inspections: QualityInspection[]) => {
    if (inspections.length === 0) {
      addNotification({
        type: 'warning',
        title: t('mes.quality_inspection_page.hint'),
        message: t('mes.quality_inspection_page.please_select'),
      });
      return;
    }

    try {
      const exportData = inspections.map((item) => ({
        检验单号: item.inspection_no,
        产品编码: item.product_code,
        产品名称: item.product_name,
        检验类型: getInspectionTypeText(item.inspection_type),
        检验数量: item.quantity,
        合格数: item.qualified_quantity,
        不合格数: item.unqualified_quantity,
        合格率: item.qualification_rate,
        检验员: item.inspector,
        检验时间: item.inspection_time,
        检验结果: item.result,
        状态: getStatusText(item.status),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '质检记录');
      XLSX.writeFile(workbook, `质检记录_${new Date().toISOString().split('T')[0]}.xlsx`);

      addNotification({
        type: 'success',
        title: t('mes.quality_inspection_page.export'),
        message: `已导出 ${inspections.length} 条质检记录`,
      });
    } catch (error: unknown) {
      apiLogger.error(t('mes.quality_inspection_page.batch_export'), error);
      addNotification({
        type: 'error',
        title: t('mes.quality_inspection_page.export_2'),
        message: t('mes.quality_inspection_page.export_3'),
      });
    }
  };

  const handleEdit = (inspection: QualityInspection) => {
    setSelectedInspection(inspection);
    setFormData({
      order_id: inspection.order_id || '',
      product_code: inspection.product_code,
      product_name: inspection.product_name,
      process_id: inspection.process_id || '',
      inspection_type: inspection.inspection_type,
      quantity: inspection.quantity,
      qualified_quantity: inspection.qualified_quantity,
      unqualified_quantity: inspection.unqualified_quantity,
      inspector: inspection.inspector || '',
      inspection_time: inspection.inspection_time || '',
      result: inspection.result || '',
      memo: inspection.memo || '',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (inspection: QualityInspection) => {
    setSelectedInspection(inspection);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedInspection(null);
    setFormData({
      order_id: '',
      product_code: '',
      product_name: '',
      process_id: '',
      inspection_type: 'incoming',
      quantity: 0,
      qualified_quantity: 0,
      unqualified_quantity: 0,
      inspector: '',
      inspection_time: '',
      result: '',
      memo: '',
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
      pending: { label: t('mes.quality_inspection_page.status_pending'), bg: 'warning.light', color: 'warning.700' },
      inspecting: { label: t('mes.quality_inspection_page.status_in_progress'), bg: 'primary.100', color: 'primary.dark' },
      passed: { label: t('mes.quality_inspection_page.result_qualified'), bg: 'success.lighter', color: 'success.700' },
      failed: { label: t('mes.quality_inspection_page.result_unqualified'), bg: 'error.lighter', color: 'error.dark' },
      rework: { label: t('mes.quality_inspection_page.text_98e01c'), bg: 'warning.100', color: ct.warning[800] },
      scrapped: { label: t('mes.quality_inspection_page.scrap'), bg: 'grey.200', color: 'text.secondary' },
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

  const getTypeBadge = (type: string) => {
    const typeMap: Record<
      string,
      {
        label: string;
        bg: string;
        color: string;
      }
    > = {
      incoming: { label: t('mes.quality_inspection_page.inspection'), bg: ct.secondary[100], color: 'secondary.700' },
      process: { label: t('mes.quality_inspection_page.type_process'), bg: 'primary.100', color: 'primary.dark' },
      final: { label: t('mes.quality_inspection_page.inspection_1'), bg: 'success.lighter', color: 'success.700' },
      outgoing: { label: t('mes.quality_inspection_page.inspection_2'), bg: 'warning.light', color: 'warning.700' },
      patrol: { label: t('mes.quality_inspection_page.patrol'), bg: 'secondary.100', color: ct.secondary[700] },
    };
    const typeBadge = typeMap[type] || { label: type, bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        size='small'
        label={typeBadge.label}
        sx={{ backgroundColor: typeBadge.bg, color: typeBadge.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<QualityInspection>[] = useMemo(
    () => [
      { id: 'inspection_no', label: t('mes.quality_inspection_page.column_inspection_no'), sortable: true },
      { id: 'order_number', label: t('mes.quality_inspection_page.production'), sortable: true },
      { id: 'product_name', label: t('mes.quality_inspection_page.column_product_name'), sortable: true },
      { id: 'product_code', label: t('mes.quality_inspection_page.product_code'), sortable: true },
      { id: 'process_name', label: t('mes.quality_inspection_page.process'), sortable: true },
      {
        id: 'inspection_type',
        label: t('mes.quality_inspection_page.field_inspection_type'),
        render: (row) => getTypeBadge(row.inspection_type),
      },
      { id: 'quantity', label: t('mes.quality_inspection_page.column_quantity'), sortable: true },
      { id: 'qualified_quantity', label: t('mes.quality_inspection_page.field_qualified_quantity'), sortable: true },
      { id: 'unqualified_quantity', label: t('mes.quality_inspection_page.field_defective_quantity'), sortable: true },
      {
        id: 'qualification_rate',
        label: t('mes.quality_inspection_page.pass_rate'),
        render: (row) => `${row.qualification_rate?.toFixed(2) || 0}%`,
      },
      { id: 'inspector', label: t('mes.quality_inspection_page.column_inspector'), sortable: true },
      {
        id: 'inspection_time',
        label: t('mes.quality_inspection_page.column_inspection_time'),
        render: (row) =>
          row.inspection_time ? new Date(row.inspection_time).toLocaleString('zh-CN') : '-',
      },
      {
        id: 'status',
        label: t('mes.quality_inspection_page.filter_status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('mes.quality_inspection_page.filter_status'),
        type: 'select',
        options: [
          { label: t('mes.quality_inspection_page.filter_option_all_status'), value: 'all' },
          { label: t('mes.quality_inspection_page.status_pending'), value: 'pending' },
          { label: t('mes.quality_inspection_page.status_in_progress'), value: 'inspecting' },
          { label: t('mes.quality_inspection_page.result_qualified'), value: 'passed' },
          { label: t('mes.quality_inspection_page.result_unqualified'), value: 'failed' },
          { label: t('mes.quality_inspection_page.text_98e01c'), value: 'rework' },
          { label: t('mes.quality_inspection_page.scrap'), value: 'scrapped' },
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

  const rowActions: RowAction<QualityInspection>[] = useMemo(
    () => [
      {
        label: t('mes.quality_inspection_page.action_view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: t('mes.quality_inspection_page.action_edit'),
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: t('mes.quality_inspection_page.action_delete'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: t('mes.quality_inspection_page.confirm'),
      },
    ],
    [handleViewDetail, handleEdit, handleDelete]
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
    const totalQty = inspections.reduce((sum, i) => sum + i.quantity, 0);
    const qualifiedQty = inspections.reduce((sum, i) => sum + i.qualified_quantity, 0);
    const avgRate = totalQty > 0 ? (qualifiedQty / totalQty) * 100 : 0;
    return {
      total: inspections.length,
      pending: inspections.filter((i) => i.status === 'pending').length,
      passed: inspections.filter((i) => i.status === 'passed').length,
      failed: inspections.filter((i) => i.status === 'failed').length,
      avgRate,
    };
  }, [inspections]);

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
          总检验数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.total}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          待检验
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.pending}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          合格数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {stats.passed}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          不合格数
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'error.dark' }}
        >
          {stats.failed}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          平均合格率
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'secondary.700' }}
        >
          {stats.avgRate.toFixed(2)}%
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <CheckCircle style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={inspections}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={t('mes.quality_inspection_page.product_name')}
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
            label: t('mes.quality_inspection_page.add'),
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        batchActions={[
          {
            label: t('mes.quality_inspection_page.batch_export_1'),
            icon: <Download size={16} />,
            onClick: handleBatchExport,
            color: 'secondary',
          },
        ]}
        headerContent={statsContent}
        emptyMessage={t('mes.quality_inspection_page.no_data')}
        getRowId={(row) => row.id}
        mobileCardTitleKey='product_name'
        mobileCardSubtitleKey='inspection_no'
        mobileCardDisplayFields={['inspection_type', 'status', 'sample_quantity', 'inspector']}
        mobileCardFieldLabels={{
          inspection_type: t('mes.quality_inspection_page.field_inspection_type'),
          status: t('mes.quality_inspection_page.filter_status'),
          sample_quantity: t('mes.quality_inspection_page.text_660298'),
          inspector: t('mes.quality_inspection_page.column_inspector'),
        }}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedInspection ? t('mes.quality_inspection_page.edit') : t('mes.quality_inspection_page.add_1')}</DialogTitle>
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
            {selectedInspection ? t('mes.quality_inspection_page.info') : t('mes.quality_inspection_page.info_1')}
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
                <InputLabel htmlFor='inspection_type'>检验类型 *</InputLabel>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <Select
                    id='inspection_type'
                    value={formData.inspection_type}
                    onChange={(e) => setFormData({ ...formData, inspection_type: e.target.value })}
                  >
                    <MenuItem value='incoming'>来料检验</MenuItem>
                    <MenuItem value='process'>过程检验</MenuItem>
                    <MenuItem value='final'>成品检验</MenuItem>
                    <MenuItem value='outgoing'>出货检验</MenuItem>
                    <MenuItem value='patrol'>巡检</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='quantity'>检验数量 *</InputLabel>
                <TextField
                  id='quantity'
                  type='number'
                  required
                  size='small'
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantity: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='qualified_quantity'>合格数量</InputLabel>
                <TextField
                  id='qualified_quantity'
                  type='number'
                  size='small'
                  value={formData.qualified_quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      qualified_quantity: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='unqualified_quantity'>不合格数量</InputLabel>
                <TextField
                  id='unqualified_quantity'
                  type='number'
                  size='small'
                  value={formData.unqualified_quantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unqualified_quantity: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='inspector'>检验员</InputLabel>
                <TextField
                  id='inspector'
                  size='small'
                  value={formData.inspector}
                  onChange={(e) => setFormData({ ...formData, inspector: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='inspection_time'>检验时间</InputLabel>
                <TextField
                  id='inspection_time'
                  type='datetime-local'
                  size='small'
                  value={formData.inspection_time}
                  onChange={(e) => setFormData({ ...formData, inspection_time: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: '1 / -1' }}>
                <InputLabel htmlFor='result'>检验结果</InputLabel>
                <TextField
                  id='result'
                  size='small'
                  multiline
                  rows={2}
                  value={formData.result}
                  onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: '1 / -1' }}>
                <InputLabel htmlFor='memo'>备注</InputLabel>
                <TextField
                  id='memo'
                  size='small'
                  multiline
                  rows={2}
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
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
        <DialogTitle>质检记录详情</DialogTitle>
        <DialogContent>
          {selectedInspection && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>检验单号</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedInspection.inspection_no}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>生产订单</InputLabel>
                  <Box component='span'>{selectedInspection.order_number || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>产品编码</InputLabel>
                  <Box component='span'>{selectedInspection.product_code}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>产品名称</InputLabel>
                  <Box component='span'>{selectedInspection.product_name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>工序</InputLabel>
                  <Box component='span'>{selectedInspection.process_name || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>检验类型</InputLabel>
                  <Box>{getTypeBadge(selectedInspection.inspection_type)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>检验数量</InputLabel>
                  <Box component='span'>{selectedInspection.quantity}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>合格数量</InputLabel>
                  <Box
                    component='span'
                    sx={{ color: 'success.main' }}
                  >
                    {selectedInspection.qualified_quantity}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>不合格数量</InputLabel>
                  <Box
                    component='span'
                    sx={{ color: 'error.main' }}
                  >
                    {selectedInspection.unqualified_quantity}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>合格率</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedInspection.qualification_rate?.toFixed(2) || 0}%
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>检验员</InputLabel>
                  <Box component='span'>{selectedInspection.inspector || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>检验时间</InputLabel>
                  <Box component='span'>
                    {selectedInspection.inspection_time
                      ? new Date(selectedInspection.inspection_time).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedInspection.status)}</Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>检验结果</InputLabel>
                  <Box component='span'>{selectedInspection.result || '-'}</Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>备注</InputLabel>
                  <Box component='span'>{selectedInspection.memo || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedInspection.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>更新时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedInspection.updated_at).toLocaleString('zh-CN')}
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

export default QualityInspectionPage;
