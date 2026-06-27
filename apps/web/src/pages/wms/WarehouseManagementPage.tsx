import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
} from '@mui/material';
import { Button } from '@mui/material';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Warehouse, CreateWarehouseRequest, UpdateWarehouseRequest } from '@/api/wms';
import { wmsApi } from '@/api/wms';
import { useAppStore } from '@/store';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/mui/EmptyState';
import { Search, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { ConfirmDialog, PageContainer } from '@/components/common';

const WarehouseManagementPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [deleteWarehouseId, setDeleteWarehouseId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateWarehouseRequest>({
    name: '',
    code: '',
    address: '',
    manager: '',
    phone: '',
  });

  const { addNotification } = useAppStore();

  const loadWarehouses = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        page_size: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await wmsApi.warehouses.list(params);
      if (response.success && response.data) {
        setWarehouses(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error: unknown) {
      apiLogger.error('加载仓库列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载仓库列表',
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, statusFilter, addNotification]);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedWarehouse) {
        await wmsApi.warehouses.update(selectedWarehouse.id, formData as UpdateWarehouseRequest);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '仓库信息已更新',
        });
      } else {
        await wmsApi.warehouses.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新仓库已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadWarehouses();
    } catch (error: unknown) {
      apiLogger.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedWarehouse ? '更新仓库失败' : '创建仓库失败',
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteWarehouseId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = useCallback(async () => {
    if (!deleteWarehouseId) return;
    try {
      await wmsApi.warehouses.delete(deleteWarehouseId);
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '仓库已删除',
      });
      loadWarehouses();
    } catch (error: unknown) {
      apiLogger.error('删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除仓库',
      });
    }
  }, [addNotification, loadWarehouses, deleteWarehouseId]);

  const handleEdit = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      code: warehouse.code || '',
      address: warehouse.address || '',
      manager: warehouse.manager || '',
      phone: warehouse.phone || '',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedWarehouse(null);
    setFormData({
      name: '',
      code: '',
      address: '',
      manager: '',
      phone: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
      active: 'success',
      inactive: 'info',
      maintenance: 'warning',
    };
    const labels: Record<string, string> = {
      active: '活跃',
      inactive: '非活跃',
      maintenance: '维护中',
    };
    return (
      <Chip
        size='small'
        color={statusMap[status] || 'default'}
        label={labels[status] || status}
        variant='outlined'
      />
    );
  };

  const columns: ColumnDef<Warehouse>[] = useMemo(
    () => [
      { id: 'name', label: '仓库名称', sortable: true },
      { id: 'code', label: '仓库编码' },
      { id: 'address', label: '地址' },
      { id: 'manager', label: '负责人' },
      { id: 'phone', label: '联系电话' },
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
          { label: '活跃', value: 'active' },
          { label: '非活跃', value: 'inactive' },
          { label: '维护中', value: 'maintenance' },
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

  const rowActions: RowAction<Warehouse>[] = useMemo(
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
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDeleteClick(row.id),
      },
    ],
    [handleDelete]
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

  return (
    <PageContainer
      title='仓库管理'
      subtitle='管理仓库信息,包括仓库名称、编码、地址、负责人等'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={warehouses}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder='搜索仓库名称或编码...'
        onSearch={handleSearch}
        searchValue={searchTerm}
        pagination={{
          page: currentPage,
          pageSize,
          total,
          onPageChange: setCurrentPage,
        }}
        actions={[
          {
            label: '新增仓库',
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        emptyMessage='暂无仓库数据'
        getRowId={(row) => row.id}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{selectedWarehouse ? '编辑仓库' : '新增仓库'}</DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(1, 1fr)',
                  md: 'repeat(2, 1fr)',
                },
                gap: 2,
                py: 2,
              }}
            >
              <TextField
                label='仓库名称 *'
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label='仓库编码'
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                fullWidth
              />
              <TextField
                label='地址'
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                fullWidth
              />
              <TextField
                label='负责人'
                value={formData.manager}
                onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                fullWidth
              />
              <TextField
                label='联系电话'
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                fullWidth
              />
            </Box>
            <DialogActions>
              <Button
                variant='outlined'
                onClick={() => setShowDialog(false)}
              >
                取消
              </Button>
              <Button
                variant='contained'
                type='submit'
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
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>仓库详情</DialogTitle>
        <DialogContent>
          {selectedWarehouse && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(1, 1fr)',
                    md: 'repeat(2, 1fr)',
                  },
                  gap: 2,
                }}
              >
                <Box>
                  <Box
                    component='span'
                    sx={{
                      display: 'block',
                      fontSize: 12,
                      color: 'text.secondary',
                    }}
                  >
                    仓库名称
                  </Box>
                  <Box
                    component='span'
                    sx={{ fontWeight: 500 }}
                  >
                    {selectedWarehouse.name}
                  </Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{
                      display: 'block',
                      fontSize: 12,
                      color: 'text.secondary',
                    }}
                  >
                    仓库编码
                  </Box>
                  <Box component='span'>{selectedWarehouse.code || '-'}</Box>
                </Box>
                <Box sx={{ gridColumn: { xs: 1, md: 2 } }}>
                  <Box
                    component='span'
                    sx={{
                      display: 'block',
                      fontSize: 12,
                      color: 'text.secondary',
                    }}
                  >
                    地址
                  </Box>
                  <Box component='span'>{selectedWarehouse.address || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{
                      display: 'block',
                      fontSize: 12,
                      color: 'text.secondary',
                    }}
                  >
                    负责人
                  </Box>
                  <Box component='span'>{selectedWarehouse.manager || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{
                      display: 'block',
                      fontSize: 12,
                      color: 'text.secondary',
                    }}
                  >
                    联系电话
                  </Box>
                  <Box component='span'>{selectedWarehouse.phone || '-'}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{
                      display: 'block',
                      fontSize: 12,
                      color: 'text.secondary',
                    }}
                  >
                    状态
                  </Box>
                  <Box>{getStatusBadge(selectedWarehouse.status)}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{
                      display: 'block',
                      fontSize: 12,
                      color: 'text.secondary',
                    }}
                  >
                    创建时间
                  </Box>
                  <Box>{new Date(selectedWarehouse.created_at).toLocaleString('zh-CN')}</Box>
                </Box>
                <Box>
                  <Box
                    component='span'
                    sx={{
                      display: 'block',
                      fontSize: 12,
                      color: 'text.secondary',
                    }}
                  >
                    更新时间
                  </Box>
                  <Box>{new Date(selectedWarehouse.updated_at).toLocaleString('zh-CN')}</Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title='确认删除'
        message='确定要删除这个仓库吗？'
        danger
      />
    </PageContainer>
  );
};

export default WarehouseManagementPage;
