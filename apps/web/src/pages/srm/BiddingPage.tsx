import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
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
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  InputAdornment,
} from '@mui/material';
import type { Bidding, CreateBiddingRequest } from '@/api/srm';
import { srmApi } from '@/api/srm';
import { useNotificationStore } from '@/store';
import { Plus, Edit, Trash2, Send, Check, XCircle, Gavel, Users, FileText } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { ConfirmDialog } from '@topems/shared-components';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const statusConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'primary' },
  bidding: { label: '投标中', color: 'warning' },
  opened: { label: '已开标', color: 'info' as any },
  evaluating: { label: '评标中', color: 'primary' },
  awarded: { label: '已定标', color: 'success' },
  cancelled: { label: '已取消', color: 'error' },
  completed: { label: '已完成', color: 'success' },
};

const biddingTypeConfig: Record<string, string> = {
  open: '公开招标',
  invite: '邀请招标',
  competitive: '竞争性谈判',
  single_source: '单一来源',
  inquiry: '询价采购',
};

const categoryConfig: Record<string, string> = {
  raw_material: '原材料',
  component: '零部件',
  equipment: '设备',
  service: '服务',
  engineering: '工程',
  other: '其他',
};

const BiddingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedBidding, setSelectedBidding] = useState<Bidding | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [viewingBidding, setViewingBidding] = useState<Bidding | null>(null);
  const [formData, setFormData] = useState<CreateBiddingRequest>({
    bidding_no: '',
    title: '',
    description: '',
    category: 'equipment',
    bidding_type: 'open',
    budget_amount: 0,
    currency: 'CNY',
    bid_deadline: '',
    open_date: '',
    items: [],
    remarks: '',
  });

  const { addNotification } = useNotificationStore();

  const biddingsQuery = useQuery<{ items: Bidding[]; total: number }>({
    queryKey: [...QUERY_KEYS.SRM.BIDDING, { currentPage, pageSize }],
    queryFn: async () => {
      const response = await srmApi.listBiddings({
        page: currentPage,
        pageSize,
      });
      if (response.success && response.data) {
        return {
          items: response.data.items || [],
          total: response.data.total || 0,
        };
      }
      return { items: [], total: 0 };
    },
  });

  const biddings = biddingsQuery.data?.items || [];
  const total = biddingsQuery.data?.total || 0;
  const loading = biddingsQuery.isLoading;

  const suppliersQuery = useQuery<any[]>({
    queryKey: [...QUERY_KEYS.SRM.BIDDING, 'suppliers', viewingBidding?.id],
    enabled: !!viewingBidding && showSupplierDialog,
    queryFn: async () => {
      if (!viewingBidding) return [];
      const response = await srmApi.listBiddingSuppliers(viewingBidding.id);
      if (response.success) {
        return response.data || [];
      }
      return [];
    },
  });

  const biddingSuppliers = suppliersQuery.data || [];

  const invalidateBiddings = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SRM.BIDDING });
  };

  const createMutation = useMutation({
    mutationFn: async (data: CreateBiddingRequest) => srmApi.createBidding(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '新招标项目已创建' });
      setShowDialog(false);
      resetForm();
      invalidateBiddings();
    },
    onError: (err: unknown) => {
      apiLogger.error('创建招标项目失败:', err);
      addNotification({ type: 'error', title: '操作失败', message: '创建招标项目失败' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (params: { id: string; data: CreateBiddingRequest }) =>
      srmApi.updateBidding(params.id, params.data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '更新成功', message: '招标项目已更新' });
      setShowDialog(false);
      resetForm();
      invalidateBiddings();
    },
    onError: (err: unknown) => {
      apiLogger.error('更新招标项目失败:', err);
      addNotification({ type: 'error', title: '操作失败', message: '更新招标项目失败' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => srmApi.deleteBidding(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '招标项目已删除' });
      invalidateBiddings();
    },
    onError: (err: unknown) => {
      apiLogger.error('删除失败:', err);
      addNotification({ type: 'error', title: '删除失败', message: '删除招标项目失败' });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => srmApi.publishBidding(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '发布成功', message: '招标项目已发布' });
      invalidateBiddings();
    },
    onError: (err: unknown) => {
      apiLogger.error('发布失败:', err);
      addNotification({ type: 'error', title: '发布失败', message: '发布招标项目失败' });
    },
  });

  const openBiddingMutation = useMutation({
    mutationFn: async (id: string) => srmApi.openBidding(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '开标成功', message: '招标项目已开标' });
      invalidateBiddings();
    },
    onError: (err: unknown) => {
      apiLogger.error('开标失败:', err);
      addNotification({ type: 'error', title: '开标失败', message: '开标操作失败' });
    },
  });

  const awardMutation = useMutation({
    mutationFn: async (params: { biddingId: string; supplierId: string }) =>
      srmApi.awardBidding(params.biddingId, params.supplierId),
    onSuccess: () => {
      addNotification({ type: 'success', title: '定标成功', message: '已完成定标' });
      invalidateBiddings();
      if (viewingBidding) {
        queryClient.invalidateQueries({
          queryKey: [...QUERY_KEYS.SRM.BIDDING, 'suppliers', viewingBidding.id],
        });
      }
    },
    onError: (err: unknown) => {
      apiLogger.error('定标失败:', err);
      addNotification({ type: 'error', title: '定标失败', message: '定标操作失败' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedBidding) {
      updateMutation.mutate({ id: selectedBidding.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (bidding: Bidding) => {
    setSelectedBidding(bidding);
    setFormData({
      bidding_no: bidding.bidding_no,
      title: bidding.title,
      description: bidding.description || '',
      category: bidding.category || 'equipment',
      bidding_type: bidding.bidding_type || 'open',
      budget_amount: bidding.budget_amount || 0,
      currency: bidding.currency,
      bid_deadline: bidding.bid_deadline || '',
      open_date: bidding.open_date || '',
      items: bidding.items || [],
      remarks: bidding.remarks || '',
    });
    setIsEditing(true);
    setShowDialog(true);
  };

  const handleDelete = (bidding: Bidding) => {
    openConfirmDialog({
      title: '确认删除',
      message: `确定要删除招标项目 "${bidding.bidding_no}" 吗？`,
      onConfirm: () => {
        deleteMutation.mutate(bidding.id);
      },
      danger: true,
    });
  };

  const handlePublish = useCallback(
    (bidding: Bidding) => {
      openConfirmDialog({
        title: '确认发布',
        message: `确定要发布招标项目 "${bidding.bidding_no}" 吗？`,
        onConfirm: () => {
          publishMutation.mutate(bidding.id);
        },
      });
    },
    [publishMutation]
  );

  const handleViewSuppliers = useCallback((bidding: Bidding) => {
    setViewingBidding(bidding);
    setShowSupplierDialog(true);
  }, []);

  const handleOpenBidding = useCallback(
    (bidding: Bidding) => {
      openConfirmDialog({
        title: '确认开标',
        message: `确定要对招标项目 "${bidding.bidding_no}" 进行开标吗？`,
        onConfirm: () => {
          openBiddingMutation.mutate(bidding.id);
        },
      });
    },
    [openBiddingMutation]
  );

  const handleAward = useCallback(
    (bidding: Bidding, supplierId: string, supplierName: string) => {
      openConfirmDialog({
        title: '确认定标',
        message: `确定将招标项目 "${bidding.bidding_no}" 授予 ${supplierName} 吗？`,
        onConfirm: () => {
          awardMutation.mutate({ biddingId: bidding.id, supplierId });
        },
      });
    },
    [awardMutation]
  );

  const resetForm = () => {
    setFormData({
      bidding_no: '',
      title: '',
      description: '',
      category: 'equipment',
      bidding_type: 'open',
      budget_amount: 0,
      currency: 'CNY',
      bid_deadline: '',
      open_date: '',
      items: [],
      remarks: '',
    });
    setIsEditing(false);
    setSelectedBidding(null);
    setActiveTab(0);
  };

  const openConfirmDialog = (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }) => {
    setConfirmDialogConfig(config);
    setConfirmDialogOpen(true);
  };

  const columns: ColumnDef<Bidding>[] = [
    {
      id: 'bidding_no',
      label: '招标编号',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.bidding_no}</Box>,
    },
    {
      id: 'title',
      label: '项目名称',
    },
    {
      id: 'category',
      label: '类别',
      render: (row) => categoryConfig[row.category || ''] || row.category || '-',
    },
    {
      id: 'bidding_type',
      label: '招标方式',
      render: (row) => biddingTypeConfig[row.bidding_type || ''] || row.bidding_type || '-',
    },
    {
      id: 'budget_amount',
      label: '预算金额',
      align: 'right',
      render: (row) => (row.budget_amount ? `¥${row.budget_amount.toLocaleString()}` : '-'),
    },
    {
      id: 'supplier_count',
      label: '投标数',
      align: 'center',
      render: (row) => (
        <Chip
          size='small'
          label={row.supplier_count || 0}
          color='primary'
          variant='outlined'
        />
      ),
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
          />
        );
      },
    },
    {
      id: 'winner',
      label: '中标供应商',
      render: (row) => row.winner_supplier_name || '-',
    },
    {
      id: 'bid_deadline',
      label: '投标截止',
      render: (row) =>
        row.bid_deadline ? new Date(row.bid_deadline).toLocaleDateString('zh-CN') : '-',
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
              onClick={() => handlePublish(row)}
              startIcon={<Send size={12} />}
            >
              发布
            </Button>
          )}
          {row.supplier_count && row.supplier_count > 0 && (
            <Button
              size='small'
              color='info'
              onClick={() => handleViewSuppliers(row)}
              startIcon={<Users size={12} />}
            >
              投标人
            </Button>
          )}
          {row.status === 'bidding' && (
            <Button
              size='small'
              color='warning'
              onClick={() => handleOpenBidding(row)}
              startIcon={<Gavel size={12} />}
            >
              开标
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
      onClick: (row: Bidding) => handleEdit(row),
    },
    {
      label: '查看投标人',
      icon: <Users size={14} />,
      onClick: (row: Bidding) => handleViewSuppliers(row),
    },
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      color: 'error' as const,
      onClick: (row: Bidding) => handleDelete(row),
    },
  ];

  return (
    <PageContainer
      title='招投标管理'
      subtitle='管理招标项目、投标、开标、评标、定标全流程'
      maxWidth='xl'
      headerProps={{
        pageIcon: <Gavel style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.orange.main}, ${ct.orange.dark})`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={biddings}
        loading={loading}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
          onPageSizeChange: (size) => {
            setPageSize(size);
            setCurrentPage(1);
          },
        }}
        actions={[
          {
            label: '新建招标',
            icon: <Plus size={16} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        onRefresh={() => biddingsQuery.refetch()}
        emptyMessage='暂无招标项目数据'
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑招标项目' : '新建招标项目'}</DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
            >
              <Tab
                label='基本信息'
                icon={<Gavel size={16} />}
                iconPosition='start'
              />
              <Tab
                label='招标明细'
                icon={<FileText size={16} />}
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
                  label='招标编号 *'
                  value={formData.bidding_no}
                  onChange={(e) => setFormData({ ...formData, bidding_no: e.target.value })}
                  size='small'
                  required
                  disabled={isEditing}
                />
                <TextField
                  label='项目名称 *'
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  size='small'
                  required
                />
                <FormControl size='small'>
                  <InputLabel>项目类别</InputLabel>
                  <Select
                    value={formData.category}
                    label='项目类别'
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                <FormControl size='small'>
                  <InputLabel>招标方式</InputLabel>
                  <Select
                    value={formData.bidding_type}
                    label='招标方式'
                    onChange={(e) => setFormData({ ...formData, bidding_type: e.target.value })}
                  >
                    {Object.entries(biddingTypeConfig).map(([key, label]) => (
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
                  label='预算金额'
                  type='number'
                  value={formData.budget_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, budget_amount: Number(e.target.value) })
                  }
                  size='small'
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position='start'>¥</InputAdornment>,
                    },
                  }}
                />
                <TextField
                  label='币种'
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  size='small'
                />
                <TextField
                  label='投标截止日期'
                  type='datetime-local'
                  value={formData.bid_deadline}
                  onChange={(e) => setFormData({ ...formData, bid_deadline: e.target.value })}
                  size='small'
                  slotProps={{ inputLabel: { shrink: true } } as any}
                />
                <TextField
                  label='开标日期'
                  type='datetime-local'
                  value={formData.open_date}
                  onChange={(e) => setFormData({ ...formData, open_date: e.target.value })}
                  size='small'
                  slotProps={{ inputLabel: { shrink: true } } as any}
                />
              </Box>
            )}
            {activeTab === 1 && (
              <Box sx={{ py: 1 }}>
                <Table size='small'>
                  <TableHead>
                    <TableRow>
                      <TableCell>SKU</TableCell>
                      <TableCell>物料名称</TableCell>
                      <TableCell>规格</TableCell>
                      <TableCell align='right'>数量</TableCell>
                      <TableCell>单位</TableCell>
                      <TableCell align='right'>预估单价</TableCell>
                      <TableCell>备注</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(formData.items || []).length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          align='center'
                          sx={{ py: 4, color: 'text.secondary' }}
                        >
                          暂无招标明细
                        </TableCell>
                      </TableRow>
                    ) : (
                      (formData.items || []).map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell>{item.material_name}</TableCell>
                          <TableCell>{item.specification || '-'}</TableCell>
                          <TableCell align='right'>{item.quantity}</TableCell>
                          <TableCell>{item.unit || '-'}</TableCell>
                          <TableCell align='right'>{item.estimated_price || '-'}</TableCell>
                          <TableCell>{item.remark || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>
            )}
            <TextField
              label='项目描述'
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              size='small'
              sx={{ mt: 2 }}
            />
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

      <Dialog
        open={showSupplierDialog}
        onClose={() => setShowSupplierDialog(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>投标人列表 - {viewingBidding?.bidding_no}</DialogTitle>
        <DialogContent>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>供应商名称</TableCell>
                <TableCell align='right'>投标金额</TableCell>
                <TableCell>交货期</TableCell>
                <TableCell>联系人</TableCell>
                <TableCell>联系电话</TableCell>
                <TableCell>状态</TableCell>
                {(viewingBidding?.status === 'evaluating' ||
                  viewingBidding?.status === 'opened') && (
                  <TableCell align='center'>操作</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {biddingSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      viewingBidding?.status === 'evaluating' || viewingBidding?.status === 'opened'
                        ? 7
                        : 6
                    }
                    align='center'
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    暂无投标人
                  </TableCell>
                </TableRow>
              ) : (
                biddingSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell sx={{ fontWeight: 500 }}>{supplier.supplier_name}</TableCell>
                    <TableCell align='right'>¥{supplier.bid_amount.toLocaleString()}</TableCell>
                    <TableCell>{supplier.delivery_time || '-'}</TableCell>
                    <TableCell>{supplier.contact_person || '-'}</TableCell>
                    <TableCell>{supplier.phone || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        label={supplier.status === 'submitted' ? '已投标' : supplier.status}
                        color='primary'
                        variant='outlined'
                      />
                    </TableCell>
                    {(viewingBidding?.status === 'evaluating' ||
                      viewingBidding?.status === 'opened') && (
                      <TableCell align='center'>
                        <Button
                          size='small'
                          color='success'
                          onClick={() => {
                            handleAward(viewingBidding!, supplier.id, supplier.supplier_name);
                            setShowSupplierDialog(false);
                          }}
                          startIcon={<Check size={12} />}
                        >
                          定标
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowSupplierDialog(false)}
          >
            关闭
          </Button>
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

export default BiddingPage;
