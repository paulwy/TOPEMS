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
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type {
  MaterialBom,
  CreateMaterialBomRequest,
  UpdateMaterialBomRequest,
  MaterialBomItem,
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
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Package,
  PlusCircle,
  MinusCircle,
  Save,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const MaterialBOMPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedBom, setSelectedBom] = useState<MaterialBom | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateMaterialBomRequest>({
    product_code: '',
    product_name: '',
    version: '',
    status: 'active',
    description: '',
    items: [],
  });

  const { addNotification } = useNotificationStore();

  const params: ListParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data: bomsData, isLoading: loading } = useQuery({
    queryKey: [...QUERY_KEYS.MES.BOMS, params],
    queryFn: async () => {
      const response = await mesApi.boms.list(params);
      if (response.success && response.data) {
        return {
          boms: response.data.boms || [],
          total: response.data.total || 0,
        };
      }
      return { boms: [], total: 0 };
    },
  });

  const boms = bomsData?.boms || [];
  const total = bomsData?.total || 0;

  const invalidateBoms = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MES.BOMS });
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateMaterialBomRequest) => mesApi.boms.create(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.material_bom_page.create'), message: t('mes.material_bom_page.bom') });
      invalidateBoms();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.material_bom_page.operation_failed'), error);
      addNotification({ type: 'error', title: t('mes.material_bom_page.operation_failed_1'), message: t('mes.material_bom_page.bom_1') });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMaterialBomRequest }) =>
      mesApi.boms.update(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.material_bom_page.update'), message: t('mes.material_bom_page.bom_2') });
      invalidateBoms();
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.material_bom_page.operation_failed'), error);
      addNotification({ type: 'error', title: t('mes.material_bom_page.operation_failed_1'), message: t('mes.material_bom_page.bom_3') });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mesApi.boms.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: t('mes.material_bom_page.delete_success'), message: t('mes.material_bom_page.deleted') });
      invalidateBoms();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.material_bom_page.delete'), error);
      addNotification({ type: 'error', title: t('mes.material_bom_page.delete_1'), message: t('mes.material_bom_page.bom_4') });
    },
  });

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      draft: t('mes.material_bom_page.status_draft'),
      active: t('mes.material_bom_page.active'),
      inactive: t('mes.material_bom_page.inactive'),
      obsolete: t('mes.material_bom_page.text_c4a4d9'),
    };
    return statusMap[status] || status;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBom) {
      updateMutation.mutate({ id: selectedBom.id, data: formData as UpdateMaterialBomRequest });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm(t('mes.material_bom_page.bom_5'))) return;
    deleteMutation.mutate(id);
  };

  const handleEdit = async (bom: MaterialBom) => {
    try {
      const response = await mesApi.boms.get(bom.id);
      if (response.success && response.data) {
        const detailBom = response.data;
        setSelectedBom(detailBom);
        setFormData({
          product_code: detailBom.product_code,
          product_name: detailBom.product_name,
          version: detailBom.version,
          status: detailBom.status,
          description: detailBom.description,
          items:
            detailBom.items?.map((item) => ({
              material_code: item.material_code,
              material_name: item.material_name,
              quantity: item.quantity,
              unit: item.unit,
              sequence: item.sequence,
              remark: item.remark,
            })) || [],
        });
        setShowDialog(true);
      }
    } catch (error: unknown) {
      apiLogger.error(t('mes.material_bom_page.bom_6'), error);
    }
  };

  const handleViewDetail = async (bom: MaterialBom) => {
    try {
      const response = await mesApi.boms.get(bom.id);
      if (response.success && response.data) {
        setSelectedBom(response.data);
        setShowDetailDialog(true);
      }
    } catch (error: unknown) {
      apiLogger.error(t('mes.material_bom_page.bom_6'), error);
    }
  };

  const resetForm = () => {
    setSelectedBom(null);
    setFormData({
      product_code: '',
      product_name: '',
      version: '',
      status: 'active',
      description: '',
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
      draft: { label: t('mes.material_bom_page.status_draft'), bg: 'grey.100', color: 'text.secondary' },
      active: { label: t('mes.material_bom_page.active'), bg: 'success.lighter', color: 'success.700' },
      inactive: { label: t('mes.material_bom_page.inactive'), bg: 'warning.light', color: 'warning.700' },
      obsolete: { label: t('mes.material_bom_page.text_c4a4d9'), bg: 'error.lighter', color: 'error.dark' },
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

  const addBomItem = () => {
    const newItem = {
      material_code: '',
      material_name: '',
      quantity: 1,
      unit: '',
      sequence: (formData.items?.length || 0) + 1,
      remark: '',
    };
    setFormData({
      ...formData,
      items: [...(formData.items || []), newItem],
    });
  };

  const removeBomItem = (index: number) => {
    const newItems = [...(formData.items || [])];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const updateBomItem = (index: number, field: string, value: unknown) => {
    const newItems = [...(formData.items || [])];
    (newItems[index] as unknown as Record<string, unknown>)[field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const columns: ColumnDef<MaterialBom>[] = useMemo(
    () => [
      { id: 'product_code', label: t('mes.material_bom_page.column_product_code'), sortable: true },
      { id: 'product_name', label: t('mes.material_bom_page.column_product_name'), sortable: true },
      { id: 'version', label: t('mes.material_bom_page.field_version'), sortable: true },
      {
        id: 'status',
        label: t('mes.material_bom_page.filter_status'),
        render: (row) => getStatusBadge(row.status),
      },
      {
        id: 'items_count',
        label: t('mes.material_bom_page.text_f98c74'),
        render: (row) => row.items?.length || 0,
      },
      {
        id: 'created_at',
        label: t('mes.material_bom_page.column_created_at'),
        render: (row) => new Date(row.created_at).toLocaleDateString('zh-CN'),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('mes.material_bom_page.filter_status'),
        type: 'select',
        options: [
          { label: t('mes.material_bom_page.filter_option_all_status'), value: 'all' },
          { label: t('mes.material_bom_page.status_draft'), value: 'draft' },
          { label: t('mes.material_bom_page.active'), value: 'active' },
          { label: t('mes.material_bom_page.inactive'), value: 'inactive' },
          { label: t('mes.material_bom_page.text_c4a4d9'), value: 'obsolete' },
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

  const rowActions: RowAction<MaterialBom>[] = useMemo(
    () => [
      {
        label: t('mes.material_bom_page.action_view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: t('mes.material_bom_page.action_edit'),
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: t('mes.material_bom_page.action_delete'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: t('mes.material_bom_page.bom_5'),
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
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Package
            size={18}
            sx={{ color: 'secondary.700' }}
          />
          <Typography
            variant='body2'
            sx={{ color: 'text.secondary' }}
          >
            BOM总数
          </Typography>
        </Box>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'secondary.700' }}
        >
          {boms.length}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary', mb: 1 }}
        >
          启用
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'success.700' }}
        >
          {boms.filter((b) => b.status === 'active').length}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary', mb: 1 }}
        >
          停用
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'warning.700' }}
        >
          {boms.filter((b) => b.status === 'inactive').length}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary', mb: 1 }}
        >
          草稿
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {boms.filter((b) => b.status === 'draft').length}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Package style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={boms}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={t('mes.material_bom_page.product_code')}
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
            label: t('mes.material_bom_page.dialog_create_title'),
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage={t('mes.material_bom_page.empty_message')}
        getRowId={(row) => row.id}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='lg'
      >
        <DialogTitle>{selectedBom ? t('mes.material_bom_page.dialog_edit_title') : t('mes.material_bom_page.dialog_create_title')}</DialogTitle>
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
            {selectedBom ? t('mes.material_bom_page.bom_7') : t('mes.material_bom_page.bom_8')}
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
                <InputLabel htmlFor='version'>版本</InputLabel>
                <TextField
                  id='version'
                  size='small'
                  value={formData.version || ''}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='status'>状态</InputLabel>
                <FormControl
                  fullWidth
                  size='small'
                >
                  <Select
                    id='status'
                    value={formData.status || 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value='draft'>草稿</MenuItem>
                    <MenuItem value='active'>启用</MenuItem>
                    <MenuItem value='inactive'>停用</MenuItem>
                    <MenuItem value='obsolete'>作废</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <InputLabel htmlFor='description'>描述</InputLabel>
                <TextField
                  id='description'
                  size='small'
                  multiline
                  rows={2}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  BOM子项
                </Typography>
                <Button
                  startIcon={<PlusCircle size={16} />}
                  onClick={addBomItem}
                  size='small'
                >
                  添加子项
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
                      <TableCell>备注</TableCell>
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
                          暂无子项，点击t('mes.material_bom_page.text_d87298')按钮添加
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
                              onChange={(e) =>
                                updateBomItem(index, 'material_code', e.target.value)
                              }
                              placeholder={t('mes.material_bom_page.detail_col_material_code')}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size='small'
                              value={item.material_name}
                              onChange={(e) =>
                                updateBomItem(index, 'material_name', e.target.value)
                              }
                              placeholder={t('mes.material_bom_page.detail_col_material_name')}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size='small'
                              type='number'
                              value={item.quantity}
                              onChange={(e) =>
                                updateBomItem(index, 'quantity', parseFloat(e.target.value) || 0)
                              }
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size='small'
                              value={item.unit || ''}
                              onChange={(e) => updateBomItem(index, 'unit', e.target.value)}
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size='small'
                              value={item.remark || ''}
                              onChange={(e) => updateBomItem(index, 'remark', e.target.value)}
                            />
                          </TableCell>
                          <TableCell align='center'>
                            <IconButton
                              size='small'
                              color='error'
                              onClick={() => removeBomItem(index)}
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
                保存
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
        <DialogTitle>BOM详情</DialogTitle>
        <DialogContent>
          {selectedBom && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>产品编码</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedBom.product_code}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>产品名称</InputLabel>
                  <Box component='span'>{selectedBom.product_name}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>版本</InputLabel>
                  <Box component='span'>{selectedBom.version || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedBom.status)}</Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>描述</InputLabel>
                  <Box component='span'>{selectedBom.description || '-'}</Box>
                </Box>
              </Box>

              <Box>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  BOM子项 ({selectedBom.items?.length || 0})
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
                        <TableCell>备注</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(selectedBom.items || []).length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            align='center'
                            sx={{ color: 'text.secondary', py: 3 }}
                          >
                            暂无子项
                          </TableCell>
                        </TableRow>
                      ) : (
                        (selectedBom.items || []).map((item, index) => (
                          <TableRow key={item.id || index}>
                            <TableCell>{item.sequence || index + 1}</TableCell>
                            <TableCell>{item.material_code}</TableCell>
                            <TableCell>{item.material_name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.unit || '-'}</TableCell>
                            <TableCell>{item.remark || '-'}</TableCell>
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
                    {new Date(selectedBom.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>更新时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedBom.updated_at).toLocaleString('zh-CN')}
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

export default MaterialBOMPage;
