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
import { PageContainer } from '@/components/common';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { QualityInspection } from '@/api/mes/quality';
import { qualityApi } from '@/api/mes/quality';
import { useAppStore } from '@/store';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';

const QualityInspectionPage: React.FC = () => {
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
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

  const { addNotification } = useAppStore();

  const loadInspections = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await qualityApi.listInspections(params);
      if (response.success && response.data) {
        setInspections(response.data.inspections || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载质检记录失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载质检记录',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, addNotification]);

  useEffect(() => {
    loadInspections();
  }, [loadInspections]);

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待检验',
      inspecting: '检验中',
      passed: '合格',
      failed: '不合格',
      rework: '返工',
      scrapped: '报废',
    };
    return statusMap[status] || status;
  };

  const getInspectionTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      incoming: '来料检验',
      process: '过程检验',
      final: '成品检验',
      outgoing: '出货检验',
      patrol: '巡检',
    };
    return typeMap[type] || type;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const requestData = {
        ...formData,
        qualification_rate:
          formData.quantity > 0
            ? (formData.qualified_quantity / formData.quantity) * 100
            : 0,
      };

      if (selectedInspection) {
        await qualityApi.updateInspection(selectedInspection.id, requestData);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '质检记录已更新',
        });
      } else {
        await qualityApi.createInspection(requestData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新质检记录已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadInspections();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedInspection ? '更新质检记录失败' : '创建质检记录失败',
      });
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这条质检记录吗?')) return;
      try {
        await qualityApi.deleteInspection(id);
        addNotification({
          type: 'success',
          title: '删除成功',
          message: '质检记录已删除',
        });
        loadInspections();
      } catch (error: unknown) {
        apiLogger.error('删除失败:', error);
        addNotification({
          type: 'error',
          title: '删除失败',
          message: '无法删除质检记录',
        });
      }
    },
    [loadInspections, addNotification]
  );

  const handleEdit = useCallback((inspection: QualityInspection) => {
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
  }, []);

  const handleViewDetail = useCallback((inspection: QualityInspection) => {
    setSelectedInspection(inspection);
    setShowDetailDialog(true);
  }, []);

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
      pending: { label: '待检验', bg: 'warning.light', color: '#b45309' },
      inspecting: { label: '检验中', bg: '#dbeafe', color: 'primary.dark' },
      passed: { label: '合格', bg: 'success.lighter', color: '#15803d' },
      failed: { label: '不合格', bg: 'error.lighter', color: 'error.dark' },
      rework: { label: '返工', bg: '#fef3c7', color: '#92400e' },
      scrapped: { label: '报废', bg: 'grey.200', color: 'text.secondary' },
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
      incoming: { label: '来料检验', bg: '#e0e7ff', color: '#4338ca' },
      process: { label: '过程检验', bg: '#dbeafe', color: 'primary.dark' },
      final: { label: '成品检验', bg: 'success.lighter', color: '#15803d' },
      outgoing: { label: '出货检验', bg: 'warning.light', color: '#b45309' },
      patrol: { label: '巡检', bg: '#fce7f3', color: '#be185d' },
    };
    const t = typeMap[type] || { label: type, bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        size='small'
        label={t.label}
        sx={{ backgroundColor: t.bg, color: t.color, fontWeight: 500 }}
      />
    );
  };

  const columns: ColumnDef<QualityInspection>[] = useMemo(
    () => [
      { id: 'inspection_no', label: '检验单号', sortable: true },
      { id: 'order_number', label: '生产订单', sortable: true },
      { id: 'product_name', label: '产品名称', sortable: true },
      { id: 'product_code', label: '产品编码', sortable: true },
      { id: 'process_name', label: '工序', sortable: true },
      {
        id: 'inspection_type',
        label: '检验类型',
        render: (row) => getTypeBadge(row.inspection_type),
      },
      { id: 'quantity', label: '检验数量', sortable: true },
      { id: 'qualified_quantity', label: '合格数量', sortable: true },
      { id: 'unqualified_quantity', label: '不合格数量', sortable: true },
      {
        id: 'qualification_rate',
        label: '合格率',
        render: (row) => `${row.qualification_rate?.toFixed(2) || 0}%`,
      },
      { id: 'inspector', label: '检验员', sortable: true },
      {
        id: 'inspection_time',
        label: '检验时间',
        render: (row) =>
          row.inspection_time
            ? new Date(row.inspection_time).toLocaleString('zh-CN')
            : '-',
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '待检验', value: 'pending' },
          { label: '检验中', value: 'inspecting' },
          { label: '合格', value: 'passed' },
          { label: '不合格', value: 'failed' },
          { label: '返工', value: 'rework' },
          { label: '报废', value: 'scrapped' },
        ],
        value: statusFilter,
        onChange: (value) => {
          setStatusFilter(value);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const rowActions: RowAction<QualityInspection>[] = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这条质检记录吗?',
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
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
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
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
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
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 2 }}>
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
      <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 2 }}>
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
      <Box sx={{ p: 2, bgcolor: '#e0e7ff', borderRadius: 2 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary' }}
        >
          平均合格率
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: '#4338ca' }}
        >
          {stats.avgRate.toFixed(2)}%
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title='质检管理'
      subtitle='管理生产质检记录,包括来料检验、过程检验、成品检验等'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={inspections}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索检验单号或产品名称...'
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
            label: '新增质检',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无质检数据'
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedInspection ? '编辑质检记录' : '新增质检记录'}</DialogTitle>
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
            {selectedInspection ? '修改质检记录信息' : '填写新质检记录信息'}
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
                <FormControl fullWidth size='small'>
                  <Select
                    id='inspection_type'
                    value={formData.inspection_type}
                    onChange={(e) =>
                      setFormData({ ...formData, inspection_type: e.target.value })
                    }
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
                  onChange={(e) =>
                    setFormData({ ...formData, inspection_time: e.target.value })
                  }
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
                  <Box component='span' sx={{ color: 'success.main' }}>
                    {selectedInspection.qualified_quantity}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>不合格数量</InputLabel>
                  <Box component='span' sx={{ color: 'error.main' }}>
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
