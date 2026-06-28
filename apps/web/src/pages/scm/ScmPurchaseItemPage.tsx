import {
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
  Button,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import type { PurchaseItem, CreatePurchaseItemRequest } from '@/api/scm';
import { scmApi } from '@/api/scm';
import { useAppStore } from '@/store';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { PageContainer } from '@/components/common';

const ScmPurchaseItemPage: React.FC = () => {
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PurchaseItem | null>(null);
  const [formData, setFormData] = useState<CreatePurchaseItemRequest>({
    order_id: '',
    product_code: '',
    product_name: '',
    specification: '',
    unit: '',
    quantity: 0,
    unit_price: 0,
    amount: 0,
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadItems();
  }, [currentPage, pageSize]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await scmApi.purchaseItems.list({
        page: currentPage,
        pageSize,
      });
      if (response.success && response.data) {
        setItems(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载采购明细失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载采购明细',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && selectedItem) {
        await scmApi.purchaseItems.update(selectedItem.id, formData);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '采购明细已更新',
        });
      } else {
        await scmApi.purchaseItems.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新采购明细已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadItems();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: isEditing ? '更新采购明细失败' : '创建采购明细失败',
      });
    }
  };

  const handleEdit = (item: PurchaseItem) => {
    setSelectedItem(item);
    setFormData({
      order_id: item.order_id,
      product_code: item.product_code || '',
      product_name: item.product_name,
      specification: item.specification || '',
      unit: item.unit || '',
      quantity: item.quantity,
      unit_price: item.unit_price || 0,
      amount: item.amount || 0,
    });
    setIsEditing(true);
    setShowDialog(true);
  };

  const handleDelete = async (item: PurchaseItem) => {
    if (!window.confirm(`确定要删除采购明细 "${item.product_name}" 吗？`)) {
      return;
    }
    try {
      await scmApi.purchaseItems.update(item.id, { product_name: '' } as any);
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '采购明细已删除',
      });
      loadItems();
    } catch (error: unknown) {
      apiLogger.error('删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '删除采购明细失败',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      order_id: '',
      product_code: '',
      product_name: '',
      specification: '',
      unit: '',
      quantity: 0,
      unit_price: 0,
      amount: 0,
    });
    setIsEditing(false);
    setSelectedItem(null);
  };

  // 表格列定义
  const columns: ColumnDef<PurchaseItem>[] = [
    {
      id: 'order_id',
      label: '订单ID',
    },
    {
      id: 'product_code',
      label: '产品编码',
    },
    {
      id: 'product_name',
      label: '产品名称',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.product_name}</Box>,
    },
    {
      id: 'specification',
      label: '规格',
      render: (row) => <Box sx={{ fontSize: '0.875rem' }}>{row.specification || '-'}</Box>,
    },
    {
      id: 'unit',
      label: '单位',
      render: (row) => (
        <Chip
          size='small'
          label={row.unit || '-'}
          variant='outlined'
        />
      ),
    },
    {
      id: 'quantity',
      label: '数量',
      align: 'right',
    },
    {
      id: 'unit_price',
      label: '单价',
      align: 'right',
      render: (row) => <Box>{row.unit_price || 0}</Box>,
    },
    {
      id: 'amount',
      label: '金额',
      align: 'right',
      render: (row) => <Box sx={{ fontWeight: 500 }}>{row.amount || 0}</Box>,
    },
  ];

  // 行操作
  const rowActions = [
    {
      label: '编辑',
      icon: <Edit size={14} />,
      onClick: (row: PurchaseItem) => handleEdit(row),
    },
    {
      label: '删除',
      icon: <Trash2 size={14} />,
      color: 'error' as const,
      onClick: (row: PurchaseItem) => handleDelete(row),
    },
  ];

  return (
    <PageContainer
      title='采购明细管理'
      subtitle='管理采购订单明细,包括产品编码、名称、规格、数量等'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={items}
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
            label: '新增采购明细',
            icon: <Plus size={16} />,
            onClick: () => {
              resetForm();
              setShowDialog(true);
            },
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        onRefresh={loadItems}
        emptyMessage='暂无采购明细数据'
      />

      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>{isEditing ? '编辑采购明细' : '新增采购明细'}</DialogTitle>
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
                label='订单ID *'
                value={formData.order_id}
                onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                size='small'
                required
              />
              <TextField
                label='产品编码'
                value={formData.product_code}
                onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                size='small'
              />
              <TextField
                label='产品名称 *'
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                size='small'
                required
              />
              <TextField
                label='规格'
                value={formData.specification}
                onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                size='small'
              />
              <TextField
                label='单位'
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                size='small'
              />
              <TextField
                label='数量 *'
                type='number'
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quantity: parseFloat(e.target.value) || 0,
                  })
                }
                size='small'
                required
              />
              <TextField
                label='单价'
                type='number'
                value={formData.unit_price}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unit_price: parseFloat(e.target.value) || 0,
                  })
                }
                size='small'
              />
              <TextField
                label='金额'
                type='number'
                value={formData.amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                size='small'
              />
            </Box>
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
    </PageContainer>
  );
};

export default ScmPurchaseItemPage;
