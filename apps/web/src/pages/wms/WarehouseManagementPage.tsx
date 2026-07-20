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
import { useTranslation } from 'react-i18next';
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
import { useUrlListState } from '@/hooks';

const WarehouseManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    filters,
    setFilter,
    currentPage,
    setCurrentPage,
    pageSize,
  } = useUrlListState<{ status: string }>({
    defaultPageSize: 10,
    defaultFilters: { status: 'all' },
    baseIndex: 1,
    historyMode: 'replace',
  });
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
    queryKey: [QUERY_KEYS.WMS.WAREHOUSES, currentPage, pageSize, debouncedSearch, filters.status],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page: currentPage,
        pagesize: pageSize,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filters.status !== 'all') params.status = filters.status;

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
      active: t('wms.warehouse_management_page.status_active_label'),
      inactive: t('wms.warehouse_management_page.status_inactive_label'),
      maintenance: t('wms.warehouse_management_page.status_maintenance'),
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
      { id: 'name', label: t('wms.warehouse_management_page.column_warehouse_name'), sortable: true },
      { id: 'code', label: t('wms.warehouse_management_page.column_warehouse_code') },
      { id: 'address', label: t('wms.warehouse_management_page.column_address') },
      { id: 'manager', label: t('wms.warehouse_management_page.column_manager_label') },
      { id: 'phone', label: t('wms.warehouse_management_page.column_phone') },
      {
        id: 'status',
        label: t('wms.warehouse_management_page.column_warehouse_status'),
        render: (row) => getStatusBadge(row.status),
      },
    ],
    [t]
  );

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: t('wms.warehouse_management_page.filter_status'),
        type: 'select',
        options: [
          { label: t('wms.warehouse_management_page.filter_option_all'), value: 'all' },
          { label: t('wms.warehouse_management_page.status_active_label'), value: 'active' },
          { label: t('wms.warehouse_management_page.status_inactive_label'), value: 'inactive' },
          { label: t('wms.warehouse_management_page.status_maintenance'), value: 'maintenance' },
        ],
        value: filters.status,
        onChange: (value) => {
          setFilter('status', value as string);
        },
      },
    ],
    [filters.status, setFilter, t]
  );

  const rowActions: RowAction<Warehouse>[] = useMemo(
    () => [
      {
        label: t('wms.warehouse_management_page.action_view_detail'),
        icon: <Eye size={16} />,
        onClick: handleViewDetail,
      },
      {
        label: t('wms.warehouse_management_page.action_edit'),
        icon: <Edit size={16} />,
        onClick: handleEdit,
      },
      {
        label: t('wms.warehouse_management_page.action_delete'),
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: (row) => handleDeleteClick(row.id),
      },
    ],
    [t]
  );

  const handleOpenCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  return (
    <PageContainer
      title={t('wms.warehouse_management_page.title')}
      subtitle={t('wms.warehouse_management_page.subtitle_action')}
    >
      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={warehouses}
        loading={loading}
        filters={filterConfigs}
        filtersValue={{ status: filters.status }}
        onFilterChange={(f) => {
          if (f.status !== undefined) setFilter('status', f.status as string);
        }}
        searchable
        searchPlaceholder={t('wms.warehouse_management_page.search_placeholder_code')}
        onSearch={setSearchQuery}
        searchValue={searchQuery}
        pagination={{
          page: currentPage,
          pageSize,
          total,
          onPageChange: setCurrentPage,
        }}
        actions={[
          {
            label: t('wms.warehouse_management_page.button_add'),
            icon: <Plus size={16} />,
            onClick: handleOpenCreate,
          },
        ]}
        rowActions={rowActions}
        emptyMessage={t('wms.warehouse_management_page.empty_message')}
        getRowId={(row) => row.id}
      />

      {/* 新增/编辑对话框 */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{selectedWarehouse ? t('wms.warehouse_management_page.dialog_edit_title') : t('wms.warehouse_management_page.dialog_create_title')}</DialogTitle>
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
                label={t('wms.warehouse_management_page.field_warehouse_name_required')}
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                fullWidth
                required
              />
              <FormField
                name='code'
                label={t('wms.warehouse_management_page.field_warehouse_code')}
                value={formData.code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                fullWidth
              />
              <FormField
                name='address'
                label={t('wms.warehouse_management_page.field_address')}
                value={formData.address}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                fullWidth
              />
              <FormField
                name='manager'
                label={t('wms.warehouse_management_page.field_manager_label')}
                value={formData.manager}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, manager: e.target.value })
                }
                fullWidth
              />
              <FormField
                name='phone'
                label={t('wms.warehouse_management_page.field_phone')}
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
                {t('wms.warehouse_management_page.button_cancel')}
              </Button>
              <Button
                variant='contained'
                type='submit'
              >
                {t('wms.warehouse_management_page.button_save')}
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
        <DialogTitle>{t('wms.warehouse_management_page.dialog_detail_title')}</DialogTitle>
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
                    {t('wms.warehouse_management_page.field_warehouse_name')}
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
                    {t('wms.warehouse_management_page.field_warehouse_code')}
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
                    {t('wms.warehouse_management_page.field_address')}
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
                    {t('wms.warehouse_management_page.field_manager_label')}
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
                    {t('wms.warehouse_management_page.field_phone')}
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
                    {t('wms.warehouse_management_page.column_warehouse_status')}
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
                    {t('wms.warehouse_management_page.field_created_at')}
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
                    {t('wms.warehouse_management_page.field_updated_at')}
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
        title={t('wms.warehouse_management_page.dialog_delete_title')}
        message={t('wms.warehouse_management_page.dialog_delete_message')}
        danger
      />
    </PageContainer>
  );
};

export default WarehouseManagementPage;
