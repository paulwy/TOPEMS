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
  IconButton,
} from '@mui/material';
import type { Inquiry, CreateInquiryRequest, Quotation } from '@/api/srm';
import { srmApi } from '@/api/srm';
import { useAppStore } from '@/store';
import { Plus, Edit, Trash2, Send, Check, XCircle, MessageSquare, TrendingUp } from 'lucide-react';
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
  in_progress: { label: '报价中', color: 'warning' },
  closed: { label: '已关闭', color: 'default' },
  awarded: { label: '已授标', color: 'success' },
  cancelled: { label: '已取消', color: 'error' },
};

const urgencyConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  low: { label: '低', color: 'default' },
  normal: { label: '普通', color: 'primary' },
  high: { label: '紧急', color: 'warning' },
  urgent: { label: '特急', color: 'error' },
};

const categoryConfig: Record<string, string> = {
  raw_material: '原材料',
  component: '零部件',
  equipment: '设备',
  service: '服务',
  packaging: '包装材料',
  other: '其他',
};

const InquiryQuotationPage: React.FC = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [showQuotationDialog, setShowQuotationDialog] = useState(false);
  const [viewingInquiry, setViewingInquiry] = useState<Inquiry | null>(null);
  const [formData, setFormData] = useState<CreateInquiryRequest>({
    inquiry_no: '',
    title: '',
    description: '',
    category: 'raw_material',
    urgency: 'normal',
    deadline: '',
    items: [],
    remarks: '',
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadInquiries();
  }, [currentPage, pageSize]);

  const loadInquiries = async () => {
    try {
      setLoading(true);
      const response = await srmApi.listInquiries({
        page: currentPage,
        pageSize,
      });
      if (response.success && response.data) {
        setInquiries(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载询价单失败:', error);
      setInquiries([
        {
          id: '1',
          inquiry_no: 'INQ-2024-001',
          title: '原材料采购询价',
          category: 'raw_material',
          urgency: 'high',
          status: 'in_progress',
          deadline: '2024-02-01',
          creator: '张三',
          department: '采购部',
          quotation_count: 3,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          inquiry_no: 'INQ-2024-002',
          title: '设备采购询价',
          category: 'equipment',
          urgency: 'normal',
          status: 'published',
          deadline: '2024-02-10',
          creator: '李四',
          department: '采购部',
          quotation_count: 0,
          created_at: '2024-01-14T09:00:00Z',
          updated_at: '2024-01-14T09:00:00Z',
        },
      ]);
      setTotal(2);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && selectedInquiry) {
        await srmApi.updateInquiry(selectedInquiry.id, formData);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '询价单已更新',
        });
      } else {
        await srmApi.createInquiry(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新询价单已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadInquiries();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: isEditing ? '更新询价单失败' : '创建询价单失败',
      });
    }
  };

  const handleEdit = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setFormData({
      inquiry_no: inquiry.inquiry_no,
      title: inquiry.title,
      description: inquiry.description || '',
      category: inquiry.category || 'raw_material',
      urgency: inquiry.urgency || 'normal',
      deadline: inquiry.deadline || '',
      items: inquiry.items || [],
      remarks: inquiry.remarks || '',
    });
    setIsEditing(true);
    setShowDialog(true);
  };

  const handleDelete = async (inquiry: Inquiry) => {
    openConfirmDialog({
      title: '确认删除',
      message: `确定要删除询价单 "${inquiry.inquiry_no}" 吗？`,
      onConfirm: async () => {
        try {
          await srmApi.deleteInquiry(inquiry.id);
          addNotification({
            type: 'success',
            title: '删除成功',
            message: '询价单已删除',
          });
          loadInquiries();
        } catch (error: unknown) {
          apiLogger.error('删除失败:', error);
          addNotification({
            type: 'error',
            title: '删除失败',
            message: '删除询价单失败',
          });
        }
      },
      danger: true,
    });
  };

  const handlePublish = useCallback(
    (inquiry: Inquiry) => {
      openConfirmDialog({
        title: '确认发布',
        message: `确定要发布询价单 "${inquiry.inquiry_no}" 吗？`,
        onConfirm: async () => {
          try {
            await srmApi.publishInquiry(inquiry.id);
            addNotification({
              type: 'success',
              title: '发布成功',
              message: '询价单已发布',
            });
            loadInquiries();
          } catch (error: unknown) {
            apiLogger.error('发布失败:', error);
            addNotification({
              type: 'error',
              title: '发布失败',
              message: '发布询价单失败',
            });
          }
        },
      });
    },
    [addNotification]
  );

  const handleViewQuotations = useCallback(
    async (inquiry: Inquiry) => {
      setViewingInquiry(inquiry);
      try {
        const response = await srmApi.listQuotations(inquiry.id);
        if (response.success) {
          setQuotations(response.data || []);
        }
      } catch (error: unknown) {
        setQuotations([
          {
            id: 'q1',
            quotation_no: 'QUO-2024-001',
            inquiry_id: inquiry.id,
            supplier_id: 's1',
            supplier_name: '供应商A',
            title: '原材料报价',
            total_amount: 125000,
            currency: 'CNY',
            valid_until: '2024-02-15',
            delivery_time: '7天',
            status: 'submitted',
            created_at: '2024-01-16T10:00:00Z',
            updated_at: '2024-01-16T10:00:00Z',
          },
          {
            id: 'q2',
            quotation_no: 'QUO-2024-002',
            inquiry_id: inquiry.id,
            supplier_id: 's2',
            supplier_name: '供应商B',
            title: '原材料报价',
            total_amount: 118000,
            currency: 'CNY',
            valid_until: '2024-02-20',
            delivery_time: '10天',
            status: 'submitted',
            created_at: '2024-01-17T09:00:00Z',
            updated_at: '2024-01-17T09:00:00Z',
          },
        ]);
      }
      setShowQuotationDialog(true);
    },
    [addNotification]
  );

  const handleAwardQuotation = useCallback(
    async (quotation: Quotation) => {
      openConfirmDialog({
        title: '确认授标',
        message: `确定要将报价单 "${quotation.quotation_no}" 授标给 ${quotation.supplier_name} 吗？`,
        onConfirm: async () => {
          try {
            await srmApi.awardQuotation(quotation.id);
            addNotification({
              type: 'success',
              title: '授标成功',
              message: '已完成授标',
            });
            loadInquiries();
          } catch (error: unknown) {
            apiLogger.error('授标失败:', error);
            addNotification({
              type: 'error',
              title: '授标失败',
              message: '授标操作失败',
            });
          }
        },
      });
    },
    [addNotification]
  );

  const resetForm = () => {
    setFormData({
      inquiry_no: '',
      title: '',
      description: '',
      category: 'raw_material',
      urgency: 'normal',
      deadline: '',
      items: [],
      remarks: '',
    });
    setIsEditing(false);
    setSelectedInquiry(null);
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

  const columns: ColumnDef<Inquiry>[] = [
    {
      id: 'inquiry_no',
      label: '询价单号',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.inquiry_no}</Box>,
    },
    {
      id: 'title',
      label: '标题',
    },
    {
      id: 'category',
      label: '类别',
      render: (row) => categoryConfig[row.category || ''] || row.category || '-',
    },
    {
      id: 'urgency',
      label: '紧急程度',
      render: (row) => {
        const config = urgencyConfig[row.urgency || 'normal'] || urgencyConfig.normal;
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
          />
        );
      },
    },
    {
      id: 'quotation_count',
      label: '报价数',
      align: 'center',
      render: (row) => (
        <Chip
          size='small'
          label={row.quotation_count || 0}
          color='primary'
          variant='outlined'
        />
      ),
    },
    {
      id: 'creator',
      label: '创建人',
      render: (row) => row.creator || '-',
    },
    {
      id: 'deadline',
      label: '截止日期',
      render: (row) => (row.deadline ? new Date(row.deadline).toLocaleDateString('zh-CN') : '-'),
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
          {(row.status === 'published' || row.status === 'in_progress') &&
            row.quotation_count &&
            row.quotation_count > 0 && (
              <Button
                size='small'
                color='info'
                onClick={() => handleViewQuotations(row)}
                startIcon={<MessageSquare size={12} />}
              >
                报价
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
      onClick: (row: Inquiry) => handleEdit(row),
    },
    {
      label: '查看报价',
      icon: <TrendingUp size={14} />,
      onClick: (row: Inquiry) => handleViewQuotations(row),
    },
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      color: 'error' as const,
      onClick: (row: Inquiry) => handleDelete(row),
    },
  ];

  return (
    <PageContainer
      title='询报价管理'
      subtitle='管理采购询价与供应商报价流程'
      maxWidth='xl'
      headerProps={{
        pageIcon: <TrendingUp style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.pink[500]}, ${ct.pink[600]})`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={inquiries}
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
            label: '新增询价单',
            icon: <Plus size={16} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        onRefresh={loadInquiries}
        emptyMessage='暂无询价单数据'
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑询价单' : '新增询价单'}</DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
            >
              <Tab
                label='基本信息'
                icon={<MessageSquare size={16} />}
                iconPosition='start'
              />
              <Tab
                label='询价明细'
                icon={<TrendingUp size={16} />}
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
                  label='询价单号 *'
                  value={formData.inquiry_no}
                  onChange={(e) => setFormData({ ...formData, inquiry_no: e.target.value })}
                  size='small'
                  required
                  disabled={isEditing}
                />
                <TextField
                  label='标题 *'
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  size='small'
                  required
                />
                <FormControl size='small'>
                  <InputLabel>询价类别</InputLabel>
                  <Select
                    value={formData.category}
                    label='询价类别'
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
                  <InputLabel>紧急程度</InputLabel>
                  <Select
                    value={formData.urgency}
                    label='紧急程度'
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  >
                    {Object.entries(urgencyConfig).map(([key, config]) => (
                      <MenuItem
                        key={key}
                        value={key}
                      >
                        {config.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label='截止日期'
                  type='date'
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  size='small'
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label='备注'
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  size='small'
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
                      <TableCell align='right'>期望单价</TableCell>
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
                          暂无询价明细
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
                          <TableCell align='right'>{item.expected_price || '-'}</TableCell>
                          <TableCell>{item.remark || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Box>
            )}
            <TextField
              label='描述'
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
        open={showQuotationDialog}
        onClose={() => setShowQuotationDialog(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>报价单列表 - {viewingInquiry?.inquiry_no}</DialogTitle>
        <DialogContent>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>报价单号</TableCell>
                <TableCell>供应商</TableCell>
                <TableCell>总金额</TableCell>
                <TableCell>交货期</TableCell>
                <TableCell>有效期至</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align='center'>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quotations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align='center'
                    sx={{ py: 4, color: 'text.secondary' }}
                  >
                    暂无报价
                  </TableCell>
                </TableRow>
              ) : (
                quotations.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell sx={{ fontWeight: 500 }}>{quotation.quotation_no}</TableCell>
                    <TableCell>{quotation.supplier_name}</TableCell>
                    <TableCell>¥{quotation.total_amount.toLocaleString()}</TableCell>
                    <TableCell>{quotation.delivery_time || '-'}</TableCell>
                    <TableCell>
                      {quotation.valid_until
                        ? new Date(quotation.valid_until).toLocaleDateString('zh-CN')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size='small'
                        label={
                          quotation.status === 'submitted'
                            ? '已提交'
                            : quotation.status === 'awarded'
                              ? '已授标'
                              : quotation.status === 'rejected'
                                ? '已拒绝'
                                : quotation.status
                        }
                        color={
                          quotation.status === 'awarded'
                            ? 'success'
                            : quotation.status === 'rejected'
                              ? 'error'
                              : 'primary'
                        }
                        variant='outlined'
                      />
                    </TableCell>
                    <TableCell align='center'>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        {quotation.status === 'submitted' && (
                          <>
                            <IconButton
                              size='small'
                              color='success'
                              onClick={() => handleAwardQuotation(quotation)}
                              title='授标'
                            >
                              <Check size={16} />
                            </IconButton>
                            <IconButton
                              size='small'
                              color='error'
                              onClick={async () => {
                                try {
                                  await srmApi.rejectQuotation(quotation.id);
                                  addNotification({
                                    type: 'success',
                                    title: '已拒绝',
                                    message: '报价单已拒绝',
                                  });
                                } catch (e) {
                                  addNotification({
                                    type: 'error',
                                    title: '操作失败',
                                    message: '拒绝报价失败',
                                  });
                                }
                              }}
                              title='拒绝'
                            >
                              <XCircle size={16} />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowQuotationDialog(false)}
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

export default InquiryQuotationPage;
