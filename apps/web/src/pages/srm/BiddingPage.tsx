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
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  InputAdornment,
} from '@mui/material';
import type { Bidding, CreateBiddingRequest } from '@/api/srm';
import { srmApi } from '@/api/srm';
import { useAppStore } from '@/store';
import { Plus, Edit, Trash2, Send, Check, XCircle, Gavel, Users, FileText } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';
import ConfirmDialog from '@/components/common/ConfirmDialog';
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
  const [biddings, setBiddings] = useState<Bidding[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
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
  const [biddingSuppliers, setBiddingSuppliers] = useState<any[]>([]);
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

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadBiddings();
  }, [currentPage, pageSize]);

  const loadBiddings = async () => {
    try {
      setLoading(true);
      const response = await srmApi.listBiddings({
        page: currentPage,
        pageSize,
      });
      if (response.success && response.data) {
        setBiddings(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载招投标失败:', error);
      setBiddings([
        {
          id: '1',
          bidding_no: 'BID-2024-001',
          title: '生产线设备采购招标',
          category: 'equipment',
          bidding_type: 'open',
          status: 'bidding',
          budget_amount: 5000000,
          currency: 'CNY',
          publish_date: '2024-01-10',
          bid_deadline: '2024-02-10',
          open_date: '2024-02-15',
          supplier_count: 8,
          creator: '王经理',
          department: '采购部',
          created_at: '2024-01-10T09:00:00Z',
          updated_at: '2024-01-10T09:00:00Z',
        },
        {
          id: '2',
          bidding_no: 'BID-2024-002',
          title: '仓储服务外包招标',
          category: 'service',
          bidding_type: 'invite',
          status: 'published',
          budget_amount: 1200000,
          currency: 'CNY',
          publish_date: '2024-01-12',
          bid_deadline: '2024-02-05',
          supplier_count: 0,
          creator: '李经理',
          department: '物流部',
          created_at: '2024-01-12T10:00:00Z',
          updated_at: '2024-01-12T10:00:00Z',
        },
        {
          id: '3',
          bidding_no: 'BID-2024-003',
          title: '办公楼装修工程招标',
          category: 'engineering',
          bidding_type: 'open',
          status: 'awarded',
          budget_amount: 3500000,
          currency: 'CNY',
          winner_supplier_name: 'XX建筑工程有限公司',
          winner_amount: 3280000,
          supplier_count: 12,
          creator: '赵经理',
          department: '行政部',
          created_at: '2023-12-01T09:00:00Z',
          updated_at: '2024-01-05T09:00:00Z',
        },
      ]);
      setTotal(3);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && selectedBidding) {
        await srmApi.updateBidding(selectedBidding.id, formData);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '招标项目已更新',
        });
      } else {
        await srmApi.createBidding(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新招标项目已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadBiddings();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: isEditing ? '更新招标项目失败' : '创建招标项目失败',
      });
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

  const handleDelete = async (bidding: Bidding) => {
    openConfirmDialog({
      title: '确认删除',
      message: `确定要删除招标项目 "${bidding.bidding_no}" 吗？`,
      onConfirm: async () => {
        try {
          await srmApi.deleteBidding(bidding.id);
          addNotification({
            type: 'success',
            title: '删除成功',
            message: '招标项目已删除',
          });
          loadBiddings();
        } catch (error: unknown) {
          apiLogger.error('删除失败:', error);
          addNotification({
            type: 'error',
            title: '删除失败',
            message: '删除招标项目失败',
          });
        }
      },
      danger: true,
    });
  };

  const handlePublish = useCallback(
    (bidding: Bidding) => {
      openConfirmDialog({
        title: '确认发布',
        message: `确定要发布招标项目 "${bidding.bidding_no}" 吗？`,
        onConfirm: async () => {
          try {
            await srmApi.publishBidding(bidding.id);
            addNotification({
              type: 'success',
              title: '发布成功',
              message: '招标项目已发布',
            });
            loadBiddings();
          } catch (error: unknown) {
            apiLogger.error('发布失败:', error);
            addNotification({
              type: 'error',
              title: '发布失败',
              message: '发布招标项目失败',
            });
          }
        },
      });
    },
    [addNotification]
  );

  const handleViewSuppliers = useCallback(
    async (bidding: Bidding) => {
      setViewingBidding(bidding);
      try {
        const response = await srmApi.listBiddingSuppliers(bidding.id);
        if (response.success) {
          setBiddingSuppliers(response.data || []);
        }
      } catch (error: unknown) {
        setBiddingSuppliers([
          {
            id: 's1',
            supplier_name: '供应商A有限公司',
            bid_amount: 4850000,
            delivery_time: '60天',
            status: 'submitted',
            contact_person: '张总',
            phone: '13800138001',
          },
          {
            id: 's2',
            supplier_name: '供应商B科技有限公司',
            bid_amount: 4680000,
            delivery_time: '75天',
            status: 'submitted',
            contact_person: '李总',
            phone: '13900139002',
          },
          {
            id: 's3',
            supplier_name: '供应商C集团',
            bid_amount: 5100000,
            delivery_time: '50天',
            status: 'submitted',
            contact_person: '王总',
            phone: '13700137003',
          },
        ]);
      }
      setShowSupplierDialog(true);
    },
    [addNotification]
  );

  const handleOpenBidding = useCallback(
    (bidding: Bidding) => {
      openConfirmDialog({
        title: '确认开标',
        message: `确定要对招标项目 "${bidding.bidding_no}" 进行开标吗？`,
        onConfirm: async () => {
          try {
            await srmApi.openBidding(bidding.id);
            addNotification({
              type: 'success',
              title: '开标成功',
              message: '招标项目已开标',
            });
            loadBiddings();
          } catch (error: unknown) {
            apiLogger.error('开标失败:', error);
            addNotification({
              type: 'error',
              title: '开标失败',
              message: '开标操作失败',
            });
          }
        },
      });
    },
    [addNotification]
  );

  const handleAward = useCallback(
    (bidding: Bidding, supplierId: string, supplierName: string) => {
      openConfirmDialog({
        title: '确认定标',
        message: `确定将招标项目 "${bidding.bidding_no}" 授予 ${supplierName} 吗？`,
        onConfirm: async () => {
          try {
            await srmApi.awardBidding(bidding.id, supplierId);
            addNotification({
              type: 'success',
              title: '定标成功',
              message: `已授予 ${supplierName}`,
            });
            loadBiddings();
          } catch (error: unknown) {
            apiLogger.error('定标失败:', error);
            addNotification({
              type: 'error',
              title: '定标失败',
              message: '定标操作失败',
            });
          }
        },
      });
    },
    [addNotification]
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
        onRefresh={loadBiddings}
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
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label='开标日期'
                  type='datetime-local'
                  value={formData.open_date}
                  onChange={(e) => setFormData({ ...formData, open_date: e.target.value })}
                  size='small'
                  slotProps={{ inputLabel: { shrink: true } }}
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
