import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import { Plus, Trash2, Upload, Download, Edit, Package } from 'lucide-react';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type BatchAction,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import { materialApi } from '@/api/rd';
import type { Material } from '@/api/rd';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import { ConfirmDialog } from '@topems/shared-components';

const RsMaterialListPage: React.FC = () => {
  const { t } = useTranslation();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  const STATUS_OPTIONS = useMemo(
    () => [
      { label: t('rd.material_list_page.status_filter.all'), value: '' },
      { label: t('rd.material_list_page.status_filter.sufficient'), value: 'sufficient' },
      { label: t('rd.material_list_page.status_filter.normal'), value: 'normal' },
      { label: t('rd.material_list_page.status_filter.low'), value: 'low' },
      { label: t('rd.material_list_page.status_filter.insufficient'), value: 'insufficient' },
    ],
    [t]
  );

  const materialListQuery = useQuery({
    queryKey: ['rs-materials', page, rowsPerPage, searchTerm, categoryFilter, statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page + 1),
        pagesize: String(rowsPerPage),
      };
      if (searchTerm) params.search = searchTerm;
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await materialApi.listMaterials(params);
      if (!response.success || !response.data) {
        throw new Error(response.message || t('rd.material_list_page.error.load_list_failed'));
      }
      return {
        materials: response.data.materials || [],
        total: response.data.total || 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await materialApi.deleteMaterial(id);
      if (!response.success) {
        throw new Error(response.message || t('rd.material_list_page.error.delete_failed'));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rs-materials'] });
      addNotification({
        type: 'success',
        title: t('rd.material_list_page.notification.delete_success_title'),
        message: t('rd.material_list_page.notification.delete_success_message'),
      });
    },
    onError: (error: any) => {
      logger.error('删除物料失败:', error);
      addNotification({
        type: 'error',
        title: t('rd.material_list_page.notification.delete_failed_title'),
        message:
          error.message || t('rd.material_list_page.notification.delete_failed_message'),
      });
    },
  });

  const batchDeleteMaterialMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await materialApi.batchDeleteMaterials(ids);
      if (!response.success || !response.data) {
        throw new Error(
          response.message || t('rd.material_list_page.error.batch_delete_failed')
        );
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rs-materials'] });
      const { success, failed } = data;
      if (failed === 0) {
        addNotification({
          type: 'success',
          title: t('rd.material_list_page.notification.batch_delete_success_title'),
          message: t('rd.material_list_page.notification.batch_delete_success_message', {
            success,
          }),
        });
      } else {
        addNotification({
          type: 'warning',
          title: t('rd.material_list_page.notification.batch_delete_partial_title'),
          message: t('rd.material_list_page.notification.batch_delete_partial_message', {
            success,
            failed,
          }),
        });
      }
    },
    onError: (error: any) => {
      logger.error('批量删除物料失败:', error);
      addNotification({
        type: 'error',
        title: t('rd.material_list_page.notification.batch_delete_failed_title'),
        message:
          error.message ||
          t('rd.material_list_page.notification.batch_delete_failed_message'),
      });
    },
  });

  const importMaterialMutation = useMutation({
    mutationFn: async (file: File) => {
      const response = await materialApi.importMaterials(file);
      if (!response.success || !response.data) {
        throw new Error(response.message || t('rd.material_list_page.error.import_failed'));
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rs-materials'] });
      const { success, failed } = data;
      if (failed === 0) {
        addNotification({
          type: 'success',
          title: t('rd.material_list_page.notification.import_success_title'),
          message: t('rd.material_list_page.notification.import_success_message', {
            success,
          }),
        });
      } else {
        addNotification({
          type: 'warning',
          title: t('rd.material_list_page.notification.import_partial_title'),
          message: t('rd.material_list_page.notification.import_partial_message', {
            success,
            failed,
          }),
        });
      }
    },
    onError: (error: any) => {
      logger.error('导入物料失败:', error);
      addNotification({
        type: 'error',
        title: t('rd.material_list_page.notification.import_failed_title'),
        message:
          error.message || t('rd.material_list_page.notification.import_failed_message'),
      });
    },
  });

  const materials = materialListQuery.data?.materials || [];
  const total = materialListQuery.data?.total || 0;
  const loading =
    materialListQuery.isLoading ||
    deleteMaterialMutation.isPending ||
    batchDeleteMaterialMutation.isPending ||
    importMaterialMutation.isPending;
  const error = materialListQuery.error?.message || '';

  const handleDeleteClick = useCallback((id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      await deleteMaterialMutation.mutateAsync(deletingId);
    } catch {
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  }, [deletingId, deleteMaterialMutation]);

  const handleBatchDeleteClick = useCallback(() => {
    if (selectedIds.length === 0) return;
    setBatchDeleteDialogOpen(true);
  }, [selectedIds.length]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    try {
      await batchDeleteMaterialMutation.mutateAsync(selectedIds);
      setSelectedIds([]);
    } catch {
    } finally {
      setBatchDeleteDialogOpen(false);
    }
  }, [selectedIds, batchDeleteMaterialMutation]);

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        await importMaterialMutation.mutateAsync(file);
      } catch {
      } finally {
        event.target.value = '';
      }
    },
    [importMaterialMutation]
  );

  const handleExport = useCallback(async () => {
    try {
      const blob = await materialApi.exportMaterials();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `materials_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      addNotification({
        type: 'success',
        title: t('rd.material_list_page.notification.export_success_title'),
        message: t('rd.material_list_page.notification.export_success_message'),
      });
    } catch (err: unknown) {
      logger.error('导出物料失败:', err);
      addNotification({
        type: 'error',
        title: t('rd.material_list_page.notification.export_failed_title'),
        message: t('rd.material_list_page.notification.export_failed_message'),
      });
    }
  }, [addNotification, t]);

  const getStatusColor = useCallback(
    (status: string): 'success' | 'warning' | 'error' | 'default' | 'info' => {
      switch (status) {
        case '充足':
        case 'sufficient':
          return 'success';
        case '正常':
        case 'normal':
          return 'info';
        case '偏低':
        case 'low':
          return 'warning';
        case '不足':
        case 'insufficient':
          return 'error';
        default:
          return 'default';
      }
    },
    []
  );

  const getStatusLabel = useCallback(
    (status: string): string => {
      switch (status) {
        case 'sufficient':
          return t('rd.material_list_page.status_label.sufficient');
        case 'normal':
          return t('rd.material_list_page.status_label.normal');
        case 'low':
          return t('rd.material_list_page.status_label.low');
        case 'insufficient':
          return t('rd.material_list_page.status_label.insufficient');
        default:
          return status;
      }
    },
    [t]
  );

  const getStockStatus = useCallback((material: Material): string => {
    const stock = material.stock_quantity || 0;
    const max = material.max_stock || 0;

    if (max > 0) {
      const ratio = stock / max;
      if (ratio >= 0.7) return 'sufficient';
      if (ratio >= 0.4) return 'normal';
      if (ratio >= 0.2) return 'low';
      return 'insufficient';
    }

    return 'normal';
  }, []);

  const categories = useMemo(() => {
    return [...new Set(materials.map((m) => m.category))];
  }, [materials]);

  const stats = useMemo(() => {
    return {
      total,
      sufficient: materials.filter((m) => getStockStatus(m) === 'sufficient').length,
      low: materials.filter((m) => ['low', 'insufficient'].includes(getStockStatus(m))).length,
    };
  }, [materials, total, getStockStatus]);

  const columns: ColumnDef<Material>[] = useMemo(
    () => [
      {
        id: 'code',
        label: t('rd.material_list_page.column.code'),
        width: 140,
        sortable: true,
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 'medium' }}
          >
            {row.code}
          </Typography>
        ),
      },
      {
        id: 'name',
        label: t('rd.material_list_page.column.name'),
        width: 200,
        sortable: true,
      },
      {
        id: 'category',
        label: t('rd.material_list_page.column.category'),
        width: 120,
        render: (row) => (
          <Chip
            label={row.category}
            size='small'
            variant='outlined'
          />
        ),
      },
      {
        id: 'stock_quantity',
        label: t('rd.material_list_page.column.stock'),
        width: 100,
        sortable: true,
      },
      {
        id: 'unit',
        label: t('rd.material_list_page.column.unit'),
        width: 80,
      },
      {
        id: 'status',
        label: t('rd.material_list_page.column.status'),
        width: 100,
        sortable: true,
        render: (row) => (
          <Chip
            label={getStatusLabel(getStockStatus(row))}
            size='small'
            color={getStatusColor(getStockStatus(row))}
          />
        ),
      },
      {
        id: 'location',
        label: t('rd.material_list_page.column.location'),
        width: 120,
        render: () => '-',
      },
    ],
    [getStatusColor, getStatusLabel, getStockStatus, t]
  );

  const rowActions: RowAction<Material>[] = [
    {
      label: t('rd.material_list_page.row_action.apply'),
      onClick: () => {
        addNotification({
          type: 'info',
          title: t('rd.material_list_page.notification.tip_title'),
          message: t('rd.material_list_page.notification.apply_in_development'),
        });
      },
    },
    {
      label: t('rd.material_list_page.row_action.edit'),
      icon: <Edit size={16} />,
      onClick: () => {
        addNotification({
          type: 'info',
          title: t('rd.material_list_page.notification.tip_title'),
          message: t('rd.material_list_page.notification.edit_in_development'),
        });
      },
    },
    {
      label: t('rd.material_list_page.row_action.delete'),
      icon: <Trash2 size={16} />,
      color: 'error',
      onClick: (row) => handleDeleteClick(row.id),
    },
  ];

  const batchActions: BatchAction[] = [
    {
      label: t('rd.material_list_page.batch_action.batch_delete'),
      icon: <Trash2 size={16} />,
      color: 'error',
      onClick: handleBatchDeleteClick,
      confirm: true,
      confirmMessage: t('rd.material_list_page.dialog.confirm_batch_delete_message', {
        count: selectedIds.length,
      }),
    },
  ];

  const filters = useMemo(
    () => [
      {
        id: 'category',
        label: t('rd.material_list_page.filter.category'),
        type: 'select' as const,
        options: [
          { label: t('rd.material_list_page.status_filter.all'), value: '' },
          ...categories.map((cat) => ({ label: cat, value: cat })),
        ],
        value: categoryFilter,
        onChange: (value: unknown) => {
          setCategoryFilter(value as string);
          setPage(0);
        },
      },
      {
        id: 'status',
        label: t('rd.material_list_page.filter.status'),
        type: 'select' as const,
        options: STATUS_OPTIONS,
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setPage(0);
        },
      },
    ],
    [categories, categoryFilter, statusFilter, STATUS_OPTIONS, t]
  );

  const headerContent = (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Typography
                  color='text.secondary'
                  variant='body2'
                >
                  {t('rd.material_list_page.stat_card.total')}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 'bold' }}
                >
                  {total}
                </Typography>
              </div>
              <Package
                color='primary'
                size={32}
              />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Typography
                  color='text.secondary'
                  variant='body2'
                >
                  {t('rd.material_list_page.stat_card.sufficient')}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 'bold', color: 'success.main' }}
                >
                  {stats.sufficient}
                </Typography>
              </div>
              <Package
                color='success'
                size={32}
              />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Typography
                  color='text.secondary'
                  variant='body2'
                >
                  {t('rd.material_list_page.stat_card.insufficient')}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 'bold', color: 'error.main' }}
                >
                  {stats.low}
                </Typography>
              </div>
              <Package
                color='error'
                size={32}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );

  return (
    <PageContainer
      title={t('rd.material_list_page.title')}
      subtitle={t('rd.material_list_page.subtitle')}
    >
      <input
        accept='.csv'
        style={{ display: 'none' }}
        id='import-file'
        type='file'
        onChange={handleImport}
      />

      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: t('rd.material_list_page.breadcrumb.home'), href: '/dashboard' },
          { label: t('rd.material_list_page.breadcrumb.rd'), href: '/rs' },
          { label: t('rd.material_list_page.breadcrumb.material') },
        ]}
        columns={columns}
        data={materials}
        loading={loading}
        error={error}
        pagination={{
          page,
          pageSize: rowsPerPage,
          total,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setRowsPerPage(size);
            setPage(0);
          },
        }}
        searchable
        searchPlaceholder={t('rd.material_list_page.search_placeholder')}
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
          setPage(0);
        }}
        filters={filters}
        filtersValue={{ category: categoryFilter, status: statusFilter }}
        onFilterChange={(f) => {
          if (f.category !== undefined) {
            setCategoryFilter(f.category);
            setPage(0);
          }
          if (f.status !== undefined) {
            setStatusFilter(f.status);
            setPage(0);
          }
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids as string[])}
        batchActions={batchActions}
        showBatchActionBar
        actions={[
          {
            label: t('rd.material_list_page.action_button.import'),
            icon: <Upload size={18} />,
            onClick: () => document.getElementById('import-file')?.click(),
            variant: 'outlined',
          },
          {
            label: t('rd.material_list_page.action_button.export'),
            icon: <Download size={18} />,
            onClick: handleExport,
            variant: 'outlined',
          },
          {
            label: t('rd.material_list_page.action_button.add'),
            icon: <Plus size={18} />,
            onClick: () => {
              addNotification({
                type: 'info',
                title: t('rd.material_list_page.notification.tip_title'),
                message: t('rd.material_list_page.notification.add_in_development'),
              });
            },
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        headerContent={headerContent}
        getRowId={(row) => row.id}
        onRefresh={() => materialListQuery.refetch()}
        emptyMessage={t('rd.material_list_page.empty_message')}
        showRowNumber
        columnConfigurable
        persistColumnConfig
        columnConfigStorageKey='rs-material-list-columns'
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeletingId(null);
        }}
        onConfirm={handleDelete}
        title={t('rd.material_list_page.dialog.confirm_delete_title')}
        message={t('rd.material_list_page.dialog.confirm_delete_message')}
        danger
      />

      <ConfirmDialog
        isOpen={batchDeleteDialogOpen}
        onClose={() => setBatchDeleteDialogOpen(false)}
        onConfirm={handleBatchDelete}
        title={t('rd.material_list_page.dialog.confirm_batch_delete_title')}
        message={t('rd.material_list_page.dialog.confirm_batch_delete_message', {
          count: selectedIds.length,
        })}
        danger
      />
    </PageContainer>
  );
};

export default RsMaterialListPage;
