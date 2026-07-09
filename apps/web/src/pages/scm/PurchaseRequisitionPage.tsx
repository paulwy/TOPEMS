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
} from '@mui/material';
import type {
  PurchaseRequisition,
  CreatePurchaseRequisitionRequest,
  UpdatePurchaseRequisitionRequest,
} from '@/api/scm';
import { scmApi } from '@/api/scm';
import { useAppStore } from '@/store';
import { Plus, Edit, Trash2, Check, XCircle, Send, FileText } from 'lucide-react';
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
  pending: { label: '待审批', color: 'warning' },
  approved: { label: '已审批', color: 'success' },
  rejected: { label: '已拒绝', color: 'error' },
  cancelled: { label: '已取消', color: 'default' },
  converted: { label: '已转单', color: 'primary' },
};

const priorityConfig: Record<
  string,
  { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }
> = {
  low: { label: '低', color: 'default' },
  medium: { label: '中', color: 'primary' },
  high: { label: '高', color: 'warning' },
  urgent: { label: '紧急', color: 'error' },
};

const PurchaseRequisitionPage: React.FC = () => {
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRequisition, setSelectedRequisition] = useState<PurchaseRequisition | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);
  const [formData, setFormData] = useState<CreatePurchaseRequisitionRequest>({
    requisition_no: '',
    title: '',
    request_date: new Date().toISOString().split('T')[0],
    required_date: '',
    priority: 'medium',
    supplier_id: '',
    remarks: '',
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadRequisitions();
  }, [currentPage, pageSize]);

  const loadRequisitions = async () => {
    try {
      setLoading(true);
      const response = await scmApi.purchaseRequisitions.list({
        page: currentPage,
        pageSize,
      });
      if (response.success && response.data) {
        setRequisitions(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载采购申请失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载采购申请',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && selectedRequisition) {
        const updateData: UpdatePurchaseRequisitionRequest = {
          title: formData.title,
          required_date: formData.required_date,
          priority: formData.priority,
          supplier_id: formData.supplier_id,
          remarks: formData.remarks,
        };
        await scmApi.purchaseRequisitions.update(selectedRequisition.id, updateData);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '采购申请已更新',
        });
      } else {
        await scmApi.purchaseRequisitions.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新采购申请已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadRequisitions();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: isEditing ? '更新采购申请失败' : '创建采购申请失败',
      });
    }
  };

  const handleEdit = (requisition: PurchaseRequisition) => {
    setSelectedRequisition(requisition);
    setFormData({
      requisition_no: requisition.requisition_no,
      title: requisition.title,
      request_date: requisition.request_date,
      required_date: requisition.required_date || '',
      priority: requisition.priority || 'medium',
      supplier_id: requisition.supplier_id || '',
      remarks: requisition.remarks || '',
    });
    setIsEditing(true);
    setShowDialog(true);
  };

  const handleDelete = async (requisition: PurchaseRequisition) => {
    openConfirmDialog({
      title: '确认删除',
      message: `确定要删除采购申请 "${requisition.requisition_no}" 吗？`,
      onConfirm: async () => {
        try {
          await scmApi.purchaseRequisitions.delete(requisition.id);
          addNotification({
            type: 'success',
            title: '删除成功',
            message: '采购申请已删除',
          });
          loadRequisitions();
        } catch (error: unknown) {
          apiLogger.error('删除失败:', error);
          addNotification({
            type: 'error',
            title: '删除失败',
            message: '删除采购申请失败',
          });
        }
      },
      danger: true,
    });
  };

  const handleSubmitForApproval = useCallback(
    (requisition: PurchaseRequisition) => {
      openConfirmDialog({
        title: '确认提交',
        message: `确定要提交采购申请 "${requisition.requisition_no}" 审批吗？`,
        onConfirm: async () => {
          try {
            await scmApi.purchaseRequisitions.submit(requisition.id);
            addNotification({
              type: 'success',
              title: '提交成功',
              message: '采购申请已提交审批',
            });
            loadRequisitions();
          } catch (error: unknown) {
            apiLogger.error('提交失败:', error);
            addNotification({
              type: 'error',
              title: '提交失败',
              message: '提交采购申请失败',
            });
          }
        },
      });
    },
    [addNotification]
  );

  const handleApprove = useCallback(
    (requisition: PurchaseRequisition) => {
      openConfirmDialog({
        title: '确认审批',
        message: `确定要审批通过采购申请 "${requisition.requisition_no}" 吗？`,
        onConfirm: async () => {
          try {
            await scmApi.purchaseRequisitions.approve(requisition.id);
            addNotification({
              type: 'success',
              title: '审批成功',
              message: '采购申请已审批通过',
            });
            loadRequisitions();
          } catch (error: unknown) {
            apiLogger.error('审批失败:', error);
            addNotification({
              type: 'error',
              title: '审批失败',
              message: '审批采购申请失败',
            });
          }
        },
      });
    },
    [addNotification]
  );

  const handleReject = useCallback(
    (requisition: PurchaseRequisition) => {
      openConfirmDialog({
        title: '确认拒绝',
        message: `确定要拒绝采购申请 "${requisition.requisition_no}" 吗？`,
        onConfirm: async () => {
          try {
            await scmApi.purchaseRequisitions.reject(requisition.id);
            addNotification({
              type: 'success',
              title: '已拒绝',
              message: '采购申请已拒绝',
            });
            loadRequisitions();
          } catch (error: unknown) {
            apiLogger.error('操作失败:', error);
            addNotification({
              type: 'error',
              title: '操作失败',
              message: '拒绝采购申请失败',
            });
          }
        },
        danger: true,
      });
    },
    [addNotification]
  );

  const handleConvertToOrder = useCallback(
    (requisition: PurchaseRequisition) => {
      openConfirmDialog({
        title: '确认转单',
        message: `确定要将采购申请 "${requisition.requisition_no}" 转为采购订单吗？`,
        onConfirm: async () => {
          try {
            await scmApi.purchaseRequisitions.convertToOrder(requisition.id);
            addNotification({
              type: 'success',
              title: '转单成功',
              message: '采购申请已转为采购订单',
            });
            loadRequisitions();
          } catch (error: unknown) {
            apiLogger.error('转单失败:', error);
            addNotification({
              type: 'error',
              title: '转单失败',
              message: '采购申请转单失败',
            });
          }
        },
      });
    },
    [addNotification]
  );

  const resetForm = () => {
    setFormData({
      requisition_no: '',
      title: '',
      request_date: new Date().toISOString().split('T')[0],
      required_date: '',
      priority: 'medium',
      supplier_id: '',
      remarks: '',
    });
    setIsEditing(false);
    setSelectedRequisition(null);
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

  const columns: ColumnDef<PurchaseRequisition>[] = [
    {
      id: 'requisition_no',
      label: '申请单号',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.requisition_no}</Box>,
    },
    {
      id: 'title',
      label: '标题',
    },
    {
      id: 'applicant_name',
      label: '申请人',
      render: (row) => row.applicant_name || '-',
    },
    {
      id: 'department_name',
      label: '申请部门',
      render: (row) => row.department_name || '-',
    },
    {
      id: 'request_date',
      label: '申请日期',
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>
          {new Date(row.request_date).toLocaleDateString('zh-CN')}
        </Box>
      ),
    },
    {
      id: 'required_date',
      label: '需求日期',
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>
          {row.required_date ? new Date(row.required_date).toLocaleDateString('zh-CN') : '-'}
        </Box>
      ),
    },
    {
      id: 'total_amount',
      label: '总金额',
      align: 'right',
      render: (row) => <Box>{row.total_amount ? row.total_amount.toFixed(2) : '0.00'}</Box>,
    },
    {
      id: 'priority',
      label: '优先级',
      render: (row) => {
        const config = priorityConfig[row.priority || 'medium'] || priorityConfig.medium;
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
            variant='outlined'
          />
        );
      },
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
              onClick={() => handleSubmitForApproval(row)}
              startIcon={<Send size={12} />}
            >
              提交
            </Button>
          )}
          {row.status === 'pending' && (
            <>
              <Button
                size='small'
                color='success'
                onClick={() => handleApprove(row)}
                startIcon={<Check size={12} />}
              >
                审批
              </Button>
              <Button
                size='small'
                color='error'
                onClick={() => handleReject(row)}
                startIcon={<XCircle size={12} />}
              >
                拒绝
              </Button>
            </>
          )}
          {row.status === 'approved' && (
            <Button
              size='small'
              color='primary'
              onClick={() => handleConvertToOrder(row)}
              startIcon={<FileText size={12} />}
            >
              转订单
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
      onClick: (row: PurchaseRequisition) => handleEdit(row),
    },
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      color: 'error' as const,
      onClick: (row: PurchaseRequisition) => handleDelete(row),
    },
  ];

  return (
    <PageContainer
      title='采购申请管理'
      subtitle='管理采购申请，包括申请单创建、提交审批、审批流转等'
      maxWidth='xl'
      headerProps={{
        pageIcon: <FileText style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary[400]}, ${ct.secondary[600]})`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={requisitions}
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
            label: '新增采购申请',
            icon: <Plus size={16} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        onRefresh={loadRequisitions}
        emptyMessage='暂无采购申请数据'
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑采购申请' : '新增采购申请'}</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                gap: 2,
                py: 2,
              }}
            >
              <TextField
                label='申请单号 *'
                value={formData.requisition_no}
                onChange={(e) => setFormData({ ...formData, requisition_no: e.target.value })}
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
              <TextField
                label='申请日期 *'
                type='date'
                value={formData.request_date}
                onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                size='small'
                required
                slotProps={{ inputLabel: { shrink: true } } as any}
                disabled={isEditing}
              />
              <TextField
                label='需求日期'
                type='date'
                value={formData.required_date}
                onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
                size='small'
                slotProps={{ inputLabel: { shrink: true } } as any}
              />
              <FormControl size='small'>
                <InputLabel>优先级</InputLabel>
                <Select
                  value={formData.priority || 'medium'}
                  label='优先级'
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <MenuItem value='low'>低</MenuItem>
                  <MenuItem value='medium'>中</MenuItem>
                  <MenuItem value='high'>高</MenuItem>
                  <MenuItem value='urgent'>紧急</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label='供应商ID'
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                size='small'
              />
            </Box>
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

export default PurchaseRequisitionPage;
