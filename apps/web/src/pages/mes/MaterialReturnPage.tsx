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
  IconButton,
  Tooltip,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { MaterialReturn, CreateMaterialReturnRequest, MaterialReturnItem, ListParams } from '@/api/mes';
import { mesApi } from '@/api/mes';
import { useAppStore } from '@/store';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import {
  Search,
  Plus,
  Eye,
  Undo2,
  PlusCircle,
  MinusCircle,
  Save,
  FileText,
  Package,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';

const MaterialReturnPage: React.FC = () => {
  const [returns, setReturns] = useState<MaterialReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<MaterialReturn | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateMaterialReturnRequest>({
    order_id: '',
    operator: '',
    reason: '',
    items: [],
  });

  const { addNotification } = useAppStore();

  const loadReturns = useCallback(async () => {
    try {
      setLoading(true);
      const params: ListParams = {
        page: currentPage - 1,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await mesApi.materialReturns.list(params);
      if (response.success && response.data) {
        setReturns(response.data.returns || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载物料退库记录失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载物料退库记录',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, addNotification]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待审核',
      approved: '已审核',
      returned: '已退库',
      cancelled: '已取消',
    };
    return statusMap[status] || status;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mesApi.materialReturns.create(formData);
      addNotification({
        type: 'success',
        title: '创建成功',
        message: '物料退库单已创建',
      });
      setShowDialog(false);
      resetForm();
      loadReturns();
    } catch (error: unknown) {
      apiLogger.error('创建物料退库单失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: '创建物料退库单失败',
      });
    }
  };

  const handleViewDetail = useCallback((ret: MaterialReturn) => {
    setSelectedReturn(ret);
    setShowDetailDialog(true);
  }, []);

  const resetForm = () => {
    setSelectedReturn(null);
    setFormData({
      order_id: '',
      operator: '',
      reason: '',
      items: [],
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
      pending: { label: '待审核', bg: 'warning.light', color: 'warning.700' },
      approved: { label: '已审核', bg: '#e0e7ff', color: 'secondary.700' },
      returned: { label: '已退库', bg: 'success.lighter', color: 'success.700' },
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

  const addItem = () => {
    const newItem = {
      material_code: '',
      material_name: '',
      quantity: 1,
      unit: '',
      batch_no: '',
    };
    setFormData({
      ...formData,
      items: [...(formData.items || []), newItem],
    });
  };

  const removeItem = (index: number) => {
    const newItems = [...(formData.items || [])];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, field: string, value: unknown) => {
    const newItems = [...(formData.items || [])];
    (newItems[index] as Record<string, unknown>)[field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const columns: ColumnDef<MaterialReturn>[] = useMemo(
    () => [
      { id: 'return_no', label: '退库单号', sortable: true },
      { id: 'order_number', label: '工单号', sortable: true },
      { id: 'operator', label: '退库人', sortable: true },
      {
        id: 'return_time',
        label: '退库时间',
        render: (row) =>
          row.return_time ? new Date(row.return_time).toLocaleString('zh-CN') : '-',
      },
      {
        id: 'items_count',
        label: '物料项数',
        render: (row) => row.items?.length || 0,
      },
      {
        id: 'reason',
        label: '退库原因',
        render: (row) => (
          <Box
            sx={{
              maxWidth: 150,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.reason || '-'}
          </Box>
        ),
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
          { label: '待审核', value: 'pending' },
          { label: '已审核', value: 'approved' },
          { label: '已退库', value: 'returned' },
          { label: '已取消', value: 'cancelled' },
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

  const rowActions: RowAction<MaterialReturn>[] = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
    ],
    [handleViewDetail]
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  if (loading) return <LoadingSpinner />;

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: 'warning.100', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <FileText
            size={18}
            sx={{ color: 'warning.700' }}
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            待审核
          </Typography>
        </Box>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'warning.700' }}
        >
          {returns.filter((r) => r.status === 'pending').length}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: '#e0e7ff', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary', mb: 1 }}
        >
          已审核
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'secondary.700' }}
        >
          {returns.filter((r) => r.status === 'approved').length}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Undo2
            size={18}
            sx={{ color: 'success.700' }}
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            已退库
          </Typography>
        </Box>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'success.700' }}
        >
          {returns.filter((r) => r.status === 'returned').length}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Package
            size={18}
            sx={{ color: 'text.secondary' }}
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            总数
          </Typography>
        </Box>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {returns.length}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Undo2 style={{ width: 20, height: 20 }} />,
        pageGradient: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={returns}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索退库单号或工单号...'
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
            label: '新增退库',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage='暂无物料退库记录'
        getRowId={(row) => row.id}
      />

      {/* 新增对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='lg'
      >
        <DialogTitle>新增物料退库</DialogTitle>
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
            填写物料退库信息
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
                <InputLabel htmlFor='order_id'>工单ID *</InputLabel>
                <TextField
                  id='order_id'
                  required
                  size='small'
                  value={formData.order_id}
                  onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='operator'>退库人 *</InputLabel>
                <TextField
                  id='operator'
                  required
                  size='small'
                  value={formData.operator}
                  onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='work_station_id'>工位ID</InputLabel>
                <TextField
                  id='work_station_id'
                  size='small'
                  value={formData.work_station_id || ''}
                  onChange={(e) => setFormData({ ...formData, work_station_id: e.target.value })}
                />
              </Box>
              <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='reason'>退库原因</InputLabel>
                <TextField
                  id='reason'
                  size='small'
                  multiline
                  rows={2}
                  value={formData.reason || ''}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </Box>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                }}
              >
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600 }}
                >
                  物料明细
                </Typography>
                <Button
                  startIcon={<PlusCircle size={16} />}
                  onClick={addItem}
                  size='small'
                >
                  添加物料
                </Button>
              </Box>
              <TableContainer
                component={Paper}
                variant='outlined'
              >
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>序号</TableCell>
                      <TableCell>物料编码 *</TableCell>
                      <TableCell>物料名称 *</TableCell>
                      <TableCell>数量 *</TableCell>
                      <TableCell>单位</TableCell>
                      <TableCell>批次号</TableCell>
                      <TableCell align='center'>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(formData.items || []).length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          align='center'
                          sx={{ color: 'text.secondary', py: 3 }}
                        >
                          暂无物料，点击"添加物料"按钮添加
                        </TableCell>
                      </TableRow>
                    ) : (
                      (formData.items || []).map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <TextField
                              size='small'
                              value={item.material_code}
                              onChange={(e) => updateItem(index, 'material_code', e.target.value)}
                              placeholder='物料编码'
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size='small'
                              value={item.material_name}
                              onChange={(e) => updateItem(index, 'material_name', e.target.value)}
                              placeholder='物料名称'
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size='small'
                              type='number'
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(index, 'quantity', parseFloat(e.target.value) || 0)
                              }
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size='small'
                              value={item.unit || ''}
                              onChange={(e) => updateItem(index, 'unit', e.target.value)}
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size='small'
                              value={item.batch_no || ''}
                              onChange={(e) => updateItem(index, 'batch_no', e.target.value)}
                            />
                          </TableCell>
                          <TableCell align='center'>
                            <IconButton
                              size='small'
                              color='error'
                              onClick={() => removeItem(index)}
                            >
                              <MinusCircle size={16} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <DialogActions sx={{ mt: 2 }}>
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
                startIcon={<Save size={16} />}
              >
                创建退库单
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog
        open={showDetailDialog}
        onClose={() => setShowDetailDialog(false)}
        maxWidth='lg'
      >
        <DialogTitle>物料退库详情</DialogTitle>
        <DialogContent>
          {selectedReturn && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>退库单号</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedReturn.return_no}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>工单号</InputLabel>
                  <Box component='span'>{selectedReturn.order_number || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>退库人</InputLabel>
                  <Box component='span'>{selectedReturn.operator}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedReturn.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>退库时间</InputLabel>
                  <Box component='span'>
                    {selectedReturn.return_time
                      ? new Date(selectedReturn.return_time).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>退库原因</InputLabel>
                  <Box component='span'>{selectedReturn.reason || '-'}</Box>
                </Box>
              </Box>

              <Box>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  物料明细 ({selectedReturn.items?.length || 0})
                </Typography>
                <TableContainer
                  component={Paper}
                  variant='outlined'
                >
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>序号</TableCell>
                        <TableCell>物料编码</TableCell>
                        <TableCell>物料名称</TableCell>
                        <TableCell>数量</TableCell>
                        <TableCell>单位</TableCell>
                        <TableCell>批次号</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(selectedReturn.items || []).length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            align='center'
                            sx={{ color: 'text.secondary', py: 3 }}
                          >
                            暂无物料明细
                          </TableCell>
                        </TableRow>
                      ) : (
                        (selectedReturn.items || []).map((item, index) => (
                          <TableRow key={item.id || index}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>{item.material_code}</TableCell>
                            <TableCell>{item.material_name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.unit || '-'}</TableCell>
                            <TableCell>{item.batch_no || '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedReturn.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default MaterialReturnPage;
