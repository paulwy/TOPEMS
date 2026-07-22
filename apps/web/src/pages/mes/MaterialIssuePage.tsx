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
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type {
  MaterialIssue,
  CreateMaterialIssueRequest,
  MaterialIssueItem,
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
  Eye,
  PackageOpen,
  PlusCircle,
  MinusCircle,
  Save,
  FileText,
} from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

const MaterialIssuePage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orderFilter, setOrderFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<MaterialIssue | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateMaterialIssueRequest>({
    order_id: '',
    operator: '',
    items: [],
    remark: '',
  });

  const { addNotification } = useNotificationStore();

  const params: ListParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data: issuesData, isLoading: loading } = useQuery({
    queryKey: [...QUERY_KEYS.MES.MATERIAL_ISSUES, params],
    queryFn: async () => {
      const response = await mesApi.materialIssues.list(params);
      if (response.success && response.data) {
        return {
          issues: response.data.issues || [],
          total: response.data.total || 0,
        };
      }
      return { issues: [], total: 0 };
    },
  });

  const issues = issuesData?.issues || [];
  const total = issuesData?.total || 0;

  const createMutation = useMutation({
    mutationFn: (data: CreateMaterialIssueRequest) => mesApi.materialIssues.create(data),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: t('mes.material_issue_page.create'),
        message: t('mes.material_issue_page.create_1'),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MES.MATERIAL_ISSUES });
      setShowDialog(false);
      resetForm();
    },
    onError: (error: unknown) => {
      apiLogger.error(t('mes.material_issue_page.create_2'), error);
      addNotification({
        type: 'error',
        title: t('mes.material_issue_page.operation_failed'),
        message: t('mes.material_issue_page.create_3'),
      });
    },
  });

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: t('mes.material_issue_page.pending_review'),
      approved: t('mes.material_issue_page.approved'),
      issued: t('mes.material_issue_page.outbound'),
      cancelled: t('mes.material_issue_page.status_cancelled'),
    };
    return statusMap[status] || status;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleViewDetail = (issue: MaterialIssue) => {
    setSelectedIssue(issue);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedIssue(null);
    setFormData({
      order_id: '',
      operator: '',
      items: [],
      remark: '',
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
      pending: { label: t('mes.material_issue_page.pending_review'), bg: 'warning.light', color: 'warning.700' },
      approved: { label: t('mes.material_issue_page.approved'), bg: ct.secondary[100], color: 'secondary.700' },
      issued: { label: t('mes.material_issue_page.outbound'), bg: 'success.lighter', color: 'success.700' },
      cancelled: { label: t('mes.material_issue_page.status_cancelled'), bg: 'error.lighter', color: 'error.dark' },
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
    (newItems[index] as unknown as Record<string, unknown>)[field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const columns: ColumnDef<MaterialIssue>[] = useMemo(
    () => [
      { id: 'issue_no', label: t('mes.material_issue_page.text_5d727e'), sortable: true },
      { id: 'order_number', label: t('mes.material_issue_page.field_work_order'), sortable: true },
      { id: 'operator', label: t('mes.material_issue_page.text_2da08d'), sortable: true },
      {
        id: 'issue_time',
        label: t('mes.material_issue_page.time'),
        render: (row) => (row.issue_time ? new Date(row.issue_time).toLocaleString('zh-CN') : '-'),
      },
      {
        id: 'items_count',
        label: t('mes.material_issue_page.material'),
        render: (row) => row.items?.length || 0,
      },
      {
        id: 'status',
        label: t('mes.material_issue_page.filter_status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],
    []
  );

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('mes.material_issue_page.filter_status'),
        type: 'select',
        options: [
          { label: t('mes.material_issue_page.filter_option_all_status'), value: 'all' },
          { label: t('mes.material_issue_page.pending_review'), value: 'pending' },
          { label: t('mes.material_issue_page.approved'), value: 'approved' },
          { label: t('mes.material_issue_page.outbound'), value: 'issued' },
          { label: t('mes.material_issue_page.status_cancelled'), value: 'cancelled' },
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

  const rowActions: RowAction<MaterialIssue>[] = useMemo(
    () => [
      {
        label: t('mes.material_issue_page.action_view_detail'),
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
          {issues.filter((i) => i.status === 'pending').length}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
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
          {issues.filter((i) => i.status === 'approved').length}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
        <Typography
          variant='body2'
          sx={{ color: 'text.secondary', mb: 1 }}
        >
          已出库
        </Typography>
        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'success.700' }}
        >
          {issues.filter((i) => i.status === 'issued').length}
        </Typography>
      </Box>
      <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <PackageOpen
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
          {issues.length}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <PackageOpen style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.warning.main} 0%, ${ct.warning.dark} 100%)`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={issues}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={t('mes.material_issue_page.work_order_number')}
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
            label: t('mes.material_issue_page.add'),
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage={t('mes.material_issue_page.no_data')}
        getRowId={(row) => row.id}
      />

      {/* 新增对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='lg'
      >
        <DialogTitle>新增物料领用</DialogTitle>
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
            填写物料领用信息
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
                <InputLabel htmlFor='operator'>领用人 *</InputLabel>
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
                          暂无物料，点击t('mes.material_issue_page.material_1')按钮添加
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
                              placeholder={t('mes.material_issue_page.column_material_code')}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              size='small'
                              value={item.material_name}
                              onChange={(e) => updateItem(index, 'material_name', e.target.value)}
                              placeholder={t('mes.material_issue_page.column_material_name')}
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
                创建领用单
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
        <DialogTitle>物料领用详情</DialogTitle>
        <DialogContent>
          {selectedIssue && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>领用单号</InputLabel>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedIssue.issue_no}
                  </Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>工单号</InputLabel>
                  <Box component='span'>{selectedIssue.order_number || '-'}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>领用人</InputLabel>
                  <Box component='span'>{selectedIssue.operator}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                  <Box>{getStatusBadge(selectedIssue.status)}</Box>
                </Box>
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>领用时间</InputLabel>
                  <Box component='span'>
                    {selectedIssue.issue_time
                      ? new Date(selectedIssue.issue_time).toLocaleString('zh-CN')
                      : '-'}
                  </Box>
                </Box>
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>备注</InputLabel>
                  <Box component='span'>{selectedIssue.remark || '-'}</Box>
                </Box>
              </Box>

              <Box>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  物料明细 ({selectedIssue.items?.length || 0})
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
                      {(selectedIssue.items || []).length === 0 ? (
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
                        (selectedIssue.items || []).map((item, index) => (
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
                    {new Date(selectedIssue.created_at).toLocaleString('zh-CN')}
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

export default MaterialIssuePage;
