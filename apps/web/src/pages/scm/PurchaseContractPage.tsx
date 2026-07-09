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
  PurchaseContract,
  CreatePurchaseContractRequest,
  UpdatePurchaseContractRequest,
} from '@/api/scm';
import { scmApi } from '@/api/scm';
import { useAppStore } from '@/store';
import { Plus, Edit, Trash2, Check, XCircle, FileSignature, Send, RefreshCw } from 'lucide-react';
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
  active: { label: '执行中', color: 'primary' },
  expired: { label: '已到期', color: 'default' },
  terminated: { label: '已终止', color: 'error' },
  cancelled: { label: '已取消', color: 'default' },
};

const contractTypeConfig: Record<string, string> = {
  procurement: '采购合同',
  framework: '框架协议',
  service: '服务合同',
  lease: '租赁合同',
  other: '其他合同',
};

const PurchaseContractPage: React.FC = () => {
  const [contracts, setContracts] = useState<PurchaseContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedContract, setSelectedContract] = useState<PurchaseContract | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  } | null>(null);
  const [formData, setFormData] = useState<CreatePurchaseContractRequest>({
    contract_no: '',
    title: '',
    contract_type: 'procurement',
    supplier_id: '',
    sign_date: '',
    effective_date: '',
    expiry_date: '',
    total_amount: 0,
    currency: 'CNY',
    payment_terms: '',
    delivery_terms: '',
    signed_by: '',
    remarks: '',
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadContracts();
  }, [currentPage, pageSize]);

  const loadContracts = async () => {
    try {
      setLoading(true);
      const response = await scmApi.purchaseContracts.list({
        page: currentPage,
        pageSize,
      });
      if (response.success && response.data) {
        setContracts(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载采购合同失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载采购合同',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && selectedContract) {
        const updateData: UpdatePurchaseContractRequest = {
          title: formData.title,
          contract_type: formData.contract_type,
          supplier_id: formData.supplier_id,
          sign_date: formData.sign_date,
          effective_date: formData.effective_date,
          expiry_date: formData.expiry_date,
          total_amount: formData.total_amount,
          currency: formData.currency,
          payment_terms: formData.payment_terms,
          delivery_terms: formData.delivery_terms,
          remarks: formData.remarks,
        };
        await scmApi.purchaseContracts.update(selectedContract.id, updateData);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '采购合同已更新',
        });
      } else {
        await scmApi.purchaseContracts.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新采购合同已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadContracts();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: isEditing ? '更新采购合同失败' : '创建采购合同失败',
      });
    }
  };

  const handleEdit = (contract: PurchaseContract) => {
    setSelectedContract(contract);
    setFormData({
      contract_no: contract.contract_no,
      title: contract.title,
      contract_type: contract.contract_type,
      supplier_id: contract.supplier_id,
      sign_date: contract.sign_date || '',
      effective_date: contract.effective_date || '',
      expiry_date: contract.expiry_date || '',
      total_amount: contract.total_amount || 0,
      currency: contract.currency || 'CNY',
      payment_terms: contract.payment_terms || '',
      delivery_terms: contract.delivery_terms || '',
      signed_by: contract.signed_by || '',
      remarks: contract.remarks || '',
    });
    setIsEditing(true);
    setShowDialog(true);
  };

  const handleDelete = async (contract: PurchaseContract) => {
    openConfirmDialog({
      title: '确认删除',
      message: `确定要删除采购合同 "${contract.contract_no}" 吗？`,
      onConfirm: async () => {
        try {
          await scmApi.purchaseContracts.delete(contract.id);
          addNotification({
            type: 'success',
            title: '删除成功',
            message: '采购合同已删除',
          });
          loadContracts();
        } catch (error: unknown) {
          apiLogger.error('删除失败:', error);
          addNotification({
            type: 'error',
            title: '删除失败',
            message: '删除采购合同失败',
          });
        }
      },
      danger: true,
    });
  };

  const handleSubmitForApproval = useCallback(
    (contract: PurchaseContract) => {
      openConfirmDialog({
        title: '确认提交',
        message: `确定要提交采购合同 "${contract.contract_no}" 审批吗？`,
        onConfirm: async () => {
          try {
            await scmApi.purchaseContracts.submit(contract.id);
            addNotification({
              type: 'success',
              title: '提交成功',
              message: '采购合同已提交审批',
            });
            loadContracts();
          } catch (error: unknown) {
            apiLogger.error('提交失败:', error);
            addNotification({
              type: 'error',
              title: '提交失败',
              message: '提交采购合同失败',
            });
          }
        },
      });
    },
    [addNotification]
  );

  const handleApprove = useCallback(
    (contract: PurchaseContract) => {
      openConfirmDialog({
        title: '确认审批',
        message: `确定要审批通过采购合同 "${contract.contract_no}" 吗？`,
        onConfirm: async () => {
          try {
            await scmApi.purchaseContracts.approve(contract.id);
            addNotification({
              type: 'success',
              title: '审批成功',
              message: '采购合同已审批通过',
            });
            loadContracts();
          } catch (error: unknown) {
            apiLogger.error('审批失败:', error);
            addNotification({
              type: 'error',
              title: '审批失败',
              message: '审批采购合同失败',
            });
          }
        },
      });
    },
    [addNotification]
  );

  const handleReject = useCallback(
    (contract: PurchaseContract) => {
      openConfirmDialog({
        title: '确认拒绝',
        message: `确定要拒绝采购合同 "${contract.contract_no}" 吗？`,
        onConfirm: async () => {
          try {
            await scmApi.purchaseContracts.reject(contract.id);
            addNotification({
              type: 'success',
              title: '已拒绝',
              message: '采购合同已拒绝',
            });
            loadContracts();
          } catch (error: unknown) {
            apiLogger.error('操作失败:', error);
            addNotification({
              type: 'error',
              title: '操作失败',
              message: '拒绝采购合同失败',
            });
          }
        },
        danger: true,
      });
    },
    [addNotification]
  );

  const handleTerminate = useCallback(
    (contract: PurchaseContract) => {
      openConfirmDialog({
        title: '确认终止',
        message: `确定要终止采购合同 "${contract.contract_no}" 吗？`,
        onConfirm: async () => {
          try {
            await scmApi.purchaseContracts.terminate(contract.id);
            addNotification({
              type: 'success',
              title: '已终止',
              message: '采购合同已终止',
            });
            loadContracts();
          } catch (error: unknown) {
            apiLogger.error('操作失败:', error);
            addNotification({
              type: 'error',
              title: '操作失败',
              message: '终止采购合同失败',
            });
          }
        },
        danger: true,
      });
    },
    [addNotification]
  );

  const handleRenew = useCallback(
    (contract: PurchaseContract) => {
      openConfirmDialog({
        title: '确认续签',
        message: `确定要续签采购合同 "${contract.contract_no}" 吗？`,
        onConfirm: async () => {
          try {
            await scmApi.purchaseContracts.renew(contract.id);
            addNotification({
              type: 'success',
              title: '续签成功',
              message: '采购合同已续签',
            });
            loadContracts();
          } catch (error: unknown) {
            apiLogger.error('续签失败:', error);
            addNotification({
              type: 'error',
              title: '续签失败',
              message: '续签采购合同失败',
            });
          }
        },
      });
    },
    [addNotification]
  );

  const resetForm = () => {
    setFormData({
      contract_no: '',
      title: '',
      contract_type: 'procurement',
      supplier_id: '',
      sign_date: '',
      effective_date: '',
      expiry_date: '',
      total_amount: 0,
      currency: 'CNY',
      payment_terms: '',
      delivery_terms: '',
      signed_by: '',
      remarks: '',
    });
    setIsEditing(false);
    setSelectedContract(null);
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

  const columns: ColumnDef<PurchaseContract>[] = [
    {
      id: 'contract_no',
      label: '合同编号',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.contract_no}</Box>,
    },
    {
      id: 'title',
      label: '合同标题',
    },
    {
      id: 'contract_type',
      label: '合同类型',
      render: (row) => contractTypeConfig[row.contract_type] || row.contract_type,
    },
    {
      id: 'supplier_name',
      label: '供应商',
      render: (row) => row.supplier_name || row.supplier_id,
    },
    {
      id: 'sign_date',
      label: '签订日期',
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>
          {row.sign_date ? new Date(row.sign_date).toLocaleDateString('zh-CN') : '-'}
        </Box>
      ),
    },
    {
      id: 'effective_date',
      label: '生效日期',
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>
          {row.effective_date ? new Date(row.effective_date).toLocaleDateString('zh-CN') : '-'}
        </Box>
      ),
    },
    {
      id: 'expiry_date',
      label: '到期日期',
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>
          {row.expiry_date ? new Date(row.expiry_date).toLocaleDateString('zh-CN') : '-'}
        </Box>
      ),
    },
    {
      id: 'total_amount',
      label: '合同金额',
      align: 'right',
      render: (row) => <Box>{row.total_amount ? row.total_amount.toFixed(2) : '0.00'}</Box>,
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
          {row.status === 'active' && (
            <Button
              size='small'
              color='error'
              onClick={() => handleTerminate(row)}
              startIcon={<XCircle size={12} />}
            >
              终止
            </Button>
          )}
          {(row.status === 'expired' || row.status === 'active') && (
            <Button
              size='small'
              color='primary'
              onClick={() => handleRenew(row)}
              startIcon={<RefreshCw size={12} />}
            >
              续签
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
      onClick: (row: PurchaseContract) => handleEdit(row),
    },
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      color: 'error' as const,
      onClick: (row: PurchaseContract) => handleDelete(row),
    },
  ];

  return (
    <PageContainer
      title='采购合同管理'
      subtitle='管理采购合同，包括合同创建、审批、执行、终止等全生命周期管理'
      maxWidth='xl'
      headerProps={{
        pageIcon: <FileSignature style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.secondary.main}, ${ct.secondary.dark})`,
      }}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={contracts}
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
            label: '新增采购合同',
            icon: <Plus size={16} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        onRefresh={loadContracts}
        emptyMessage='暂无采购合同数据'
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑采购合同' : '新增采购合同'}</DialogTitle>
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
                label='合同编号 *'
                value={formData.contract_no}
                onChange={(e) => setFormData({ ...formData, contract_no: e.target.value })}
                size='small'
                required
                disabled={isEditing}
              />
              <TextField
                label='合同标题 *'
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                size='small'
                required
              />
              <FormControl size='small'>
                <InputLabel>合同类型</InputLabel>
                <Select
                  value={formData.contract_type}
                  label='合同类型'
                  onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                >
                  {Object.entries(contractTypeConfig).map(([key, label]) => (
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
                label='供应商ID *'
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                size='small'
                required
              />
              <TextField
                label='签订日期'
                type='date'
                value={formData.sign_date}
                onChange={(e) => setFormData({ ...formData, sign_date: e.target.value })}
                size='small'
                slotProps={{ inputLabel: { shrink: true } } as any}
              />
              <TextField
                label='生效日期'
                type='date'
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                size='small'
                slotProps={{ inputLabel: { shrink: true } } as any}
              />
              <TextField
                label='到期日期'
                type='date'
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                size='small'
                slotProps={{ inputLabel: { shrink: true } } as any}
              />
              <TextField
                label='合同金额'
                type='number'
                value={formData.total_amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    total_amount: parseFloat(e.target.value) || 0,
                  })
                }
                size='small'
              />
              <TextField
                label='币种'
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                size='small'
              />
              <TextField
                label='签订人'
                value={formData.signed_by}
                onChange={(e) => setFormData({ ...formData, signed_by: e.target.value })}
                size='small'
              />
              <TextField
                label='付款条件'
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                size='small'
              />
              <TextField
                label='交货条件'
                value={formData.delivery_terms}
                onChange={(e) => setFormData({ ...formData, delivery_terms: e.target.value })}
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

export default PurchaseContractPage;
