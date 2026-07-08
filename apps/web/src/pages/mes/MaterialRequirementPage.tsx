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
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  MaterialRequirement,
  CreateMaterialRequirementRequest,
  UpdateMaterialRequirementRequest,
  ListParams,
} from '@/api/mes';
import { mesApi } from '@/api/mes';
import { useAppStore } from '@/store';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Plus, Edit, Trash2, Eye, Calculator, CheckCircle, Send } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
const ct = designTokens.colors;

const MaterialRequirementPage: React.FC = () => {
  const [requirements, setRequirements] = useState<MaterialRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
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

  const { addNotification } = useAppStore();

  const loadRequirements = useCallback(async () => {
    try {
      setLoading(true);
      const params: ListParams = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await mesApi.materialRequirements.list(params);
      if (response.success && response.data) {
        setRequirements(response.data.requirements || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载物料需求列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载物料需求列表',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, addNotification]);

  useEffect(() => {
    loadRequirements();
  }, [loadRequirements]);

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: '草稿',
      confirmed: '已确认',
      released: '已下达',
      completed: '已完成',
      cancelled: '已取消',
    };
    return statusMap[status] || status;
  };

  const getPriorityText = (priority?: string) => {
    const priorityMap: Record<string, string> = {
      urgent: '紧急',
      high: '高',
      normal: '普通',
      low: '低',
    };
    return priorityMap[priority || 'normal'] || priority || '-';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedRequirement) {
        await mesApi.materialRequirements.update(
          selectedRequirement.id,
          formData as UpdateMaterialRequirementRequest
        );
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '物料需求信息已更新',
        });
      } else {
        await mesApi.materialRequirements.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新物料需求已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadRequirements();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedRequirement ? '更新物料需求失败' : '创建物料需求失败',
      });
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这条物料需求吗?')) return;
      try {
        await mesApi.materialRequirements.delete(id);
        addNotification({
          type: 'success',
          title: '删除成功',
          message: '物料需求已删除',
        });
        loadRequirements();
      } catch (error: unknown) {
        apiLogger.error('删除失败:', error);
        addNotification({
          type: 'error',
          title: '删除失败',
          message: '无法删除物料需求',
        });
      }
    },
    [loadRequirements, addNotification]
  );

  const handleConfirm = useCallback(
    async (id: string) => {
      try {
        await mesApi.materialRequirements.confirm(id);
        addNotification({
          type: 'success',
          title: '确认成功',
          message: '物料需求已确认',
        });
        loadRequirements();
      } catch (error: unknown) {
        apiLogger.error('确认失败:', error);
        addNotification({
          type: 'error',
          title: '确认失败',
          message: '无法确认物料需求',
        });
      }
    },
    [loadRequirements, addNotification]
  );

  const handleRelease = useCallback(
    async (id: string) => {
      try {
        await mesApi.materialRequirements.release(id);
        addNotification({
          type: 'success',
          title: '下达成功',
          message: '物料需求已下达',
        });
        loadRequirements();
      } catch (error: unknown) {
        apiLogger.error('下达失败:', error);
        addNotification({
          type: 'error',
          title: '下达失败',
          message: '无法下达物料需求',
        });
      }
    },
    [loadRequirements, addNotification]
  );

  const handleCalculate = useCallback(async () => {
    const orderId = window.prompt('请输入生产订单ID:');
    if (!orderId) return;
    try {
      setLoading(true);
      const response = await mesApi.materialRequirements.calculate(orderId);
      if (response.success && response.data) {
        addNotification({
          type: 'success',
          title: '计算成功',
          message: `已生成 ${response.data.length} 条物料需求`,
        });
        loadRequirements();
      }
    } catch (error: unknown) {
      apiLogger.error('计算失败:', error);
      addNotification({
        type: 'error',
        title: '计算失败',
        message: '无法计算物料需求',
      });
    } finally {
      setLoading(false);
    }
  }, [loadRequirements, addNotification]);

  const handleEdit = useCallback((req: MaterialRequirement) => {
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
  }, []);

  const handleViewDetail = useCallback((req: MaterialRequirement) => {
    setSelectedRequirement(req);
    setShowDetailDialog(true);
  }, []);

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
      draft: { label: '草稿', bg: 'grey.100', color: 'text.secondary' },
      confirmed: { label: '已确认', bg: 'primary.100', color: 'primary.dark' },
      released: { label: '已下达', bg: 'warning.light', color: 'warning.700' },
      completed: { label: '已完成', bg: 'success.lighter', color: 'success.700' },
      cancelled: { label: '已取消', bg: 'error.lighter', color: 'error.dark' },
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
      urgent: { label: '紧急', bg: 'error.lighter', color: 'error.dark' },
      high: { label: '高', bg: 'warning.light', color: 'warning.700' },
      normal: { label: '普通', bg: 'primary.100', color: 'primary.dark' },
      low: { label: '低', bg: 'grey.100', color: 'text.secondary' },
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
      { id: 'mrp_no', label: '需求单号', sortable: true },
      { id: 'order_number', label: '生产订单', sortable: true },
      { id: 'product_name', label: '产品名称', sortable: true },
      { id: 'material_name', label: '物料名称', sortable: true },
      { id: 'material_code', label: '物料编码', sortable: true },
      { id: 'specification', label: '规格型号', sortable: true },
      { id: 'required_quantity', label: '需求数量', sortable: true },
      { id: 'available_quantity', label: '可用数量', sortable: true },
      { id: 'shortfall_quantity', label: '缺口数量', sortable: true },
      {
        id: 'required_date',
        label: '需求日期',
        render: (row) =>
          row.required_date ? new Date(row.required_date).toLocaleDateString('zh-CN') : '-',
      },
      {
        id: 'priority',
        label: '优先级',
        render: (row) => getPriorityBadge(row.priority),
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
          { label: '草稿', value: 'draft' },
          { label: '已确认', value: 'confirmed' },
          { label: '已下达', value: 'released' },
          { label: '已完成', value: 'completed' },
          { label: '已取消', value: 'cancelled' },
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
        label: '确认',
        icon: <CheckCircle size={16} />,
        color: 'primary',
        onClick: (row) => handleConfirm(row.id),
        show: (row) => row.status === 'draft',
      },
      {
        label: '下达',
        icon: <Send size={16} />,
        color: 'success',
        onClick: (row) => handleRelease(row.id),
        show: (row) => row.status === 'confirmed',
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这条物料需求吗?',
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
        searchPlaceholder='搜索物料名称或编码...'
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
            label: '新增需求',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
          {
            label: 'MRP计算',
            icon: <Calculator size={16} />,
            onClick: handleCalculate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无物料需求数据'
        getRowId={(row) => row.id}
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
      >
        <DialogTitle>{selectedRequirement ? '编辑物料需求' : '新增物料需求'}</DialogTitle>
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
            {selectedRequirement ? '修改物料需求信息' : '填写新物料需求信息'}
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
