import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Button,
} from '@mui/material';
import React, { useState, useMemo, useCallback } from 'react';
import type { Warehouse, CreateWarehouseRequest, UpdateWarehouseRequest } from '@/api/wms';
import { wmsApi } from '@/api/wms';
import { useNotificationStore } from '@/store';
import { StatusBadge, FormField } from '@topems/shared-components';
import { EmptyState } from '@/components';
import { Search, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { ConfirmDialog, PageContainer } from '@/components/common';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';

const WarehouseManagementPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
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

  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const { data: warehousesResponse, isLoading: loading } = useQuery({
    queryKey: [QUERY_KEYS.WMS.WAREHOUSES, currentPage, pageSize, searchTerm, statusFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await wmsApi.warehouses.list(params);
      if (!response.success) {
        throw new Error('Failed to fetch warehouses');
      }
      return response.data;
    },
  });

  const warehouses = warehousesResponse?.items || [];
  const total = warehousesResponse?.total || 0;

  const createMutation = useMutation({
    mutationFn: async (data: CreateWarehouseRequest) => {
      const response = await wmsApi.warehouses.create(data);
      if (!response.success) {
        throw new Error('Failed to create warehouse');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WMS.WAREHOUSES] });
      setShowDialog(false);
      resetForm();
    },
    onError: (error) => {
      apiLogger.error('创建仓库失败:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateWarehouseRequest }) => {
      const response = await wmsApi.warehouses.update(id, data);
      if (!response.success) {
        throw new Error('Failed to update warehouse');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WMS.WAREHOUSES] });
      setShowDialog(false);
      resetForm();
    },
    onError: (error) => {
      apiLogger.error('更新仓库失败:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await wmsApi.warehouses.delete(id);
      if (!response.success) {
        throw new Error('Failed to delete warehouse');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.WMS.WAREHOUSES] });
      setShowDeleteConfirm(false);
      setDeleteWarehouseId(null);
    },
    onError: (error) => {
      apiLogger.error('删除仓库失败:', error);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWarehouse) {
      await updateMutation.mutateAsync({
        id: selectedWarehouse.id,
        data: formData as UpdateWarehouseRequest,
      });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteWarehouseId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = useCallback(async () => {
    if (!deleteWarehouseId) return;
    await deleteMutation.mutateAsync(deleteWarehouseId);
  }, [deleteWarehouseId, deleteMutation]);

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
      <StatusBadge
        status={status}
        label={labels[status] || status}
        color={statusMap[status] || 'default'}
        size='sm'
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
          setStatusFilter(value as string);
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
              <FormField
                name='name'
                label='仓库名称 *'
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                fullWidth
                required
              />
              <FormField
                name='code'
                label='仓库编码'
                value={formData.code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                fullWidth
              />
              <FormField
                name='address'
                label='地址'
                value={formData.address}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                fullWidth
              />
              <FormField
                name='manager'
                label='负责人'
                value={formData.manager}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, manager: e.target.value })
                }
                fullWidth
              />
              <FormField
                name='phone'
                label='联系电话'
                value={formData.phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
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
