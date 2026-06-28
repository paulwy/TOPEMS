import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import { Plus, Trash2, Upload, Download, Edit, Package } from 'lucide-react';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type BatchAction,
} from '@/components/templates';
import { PageContainer } from '@/components/common';
import { materialApi } from '@/api/rs';
import type { Material } from '@/api/rs';
import { useAppStore } from '@/store';
import { logger } from '@/utils/logger';
import ConfirmDialog from '@/components/common/ConfirmDialog';

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '充足', value: 'sufficient' },
  { label: '正常', value: 'normal' },
  { label: '偏低', value: 'low' },
  { label: '不足', value: 'insufficient' },
];

const RsMaterialListPage: React.FC = () => {
  const { addNotification } = useAppStore();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [total, setTotal] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params: Record<string, string> = {
        page: String(page + 1),
        pagesize: String(rowsPerPage),
      };
      if (searchTerm) params.search = searchTerm;
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await materialApi.listMaterials(params);
      if (response.success && response.data) {
        setMaterials(response.data.materials || []);
        setTotal(response.data.total || 0);
      } else {
        setError(response.message || '加载物料列表失败');
      }
    } catch (err: unknown) {
      logger.error('加载物料列表失败:', err);
      setError('加载物料列表失败');
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载物料列表',
      });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchTerm, categoryFilter, statusFilter, addNotification]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  const handleDeleteClick = useCallback((id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      const response = await materialApi.deleteMaterial(deletingId);
      if (response.success) {
        addNotification({
          type: 'success',
          title: '删除成功',
          message: '物料已删除',
        });
        loadMaterials();
      } else {
        throw new Error('无法删除物料');
      }
    } catch (err: unknown) {
      logger.error('删除物料失败:', err);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除物料',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  }, [deletingId, addNotification, loadMaterials]);

  const handleBatchDeleteClick = useCallback(() => {
    if (selectedIds.length === 0) return;
    setBatchDeleteDialogOpen(true);
  }, [selectedIds.length]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    try {
      const response = await materialApi.batchDeleteMaterials(selectedIds);
      if (response.success && response.data) {
        const { success, failed } = response.data;
        if (failed === 0) {
          addNotification({
            type: 'success',
            title: '批量删除成功',
            message: `成功删除 ${success} 条物料`,
          });
        } else {
          addNotification({
            type: 'warning',
            title: '部分成功',
            message: `成功删除 ${success} 条，失败 ${failed} 条`,
          });
        }
        setSelectedIds([]);
        loadMaterials();
      } else {
        throw new Error('无法批量删除物料');
      }
    } catch (err: unknown) {
      logger.error('批量删除物料失败:', err);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法批量删除物料',
      });
    } finally {
      setBatchDeleteDialogOpen(false);
    }
  }, [selectedIds, addNotification, loadMaterials]);

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const response = await materialApi.importMaterials(file);
        if (response.success && response.data) {
          const { success, failed } = response.data;
          if (failed === 0) {
            addNotification({
              type: 'success',
              title: '导入成功',
              message: `成功导入 ${success} 条物料`,
            });
          } else {
            addNotification({
              type: 'warning',
              title: '部分成功',
              message: `成功导入 ${success} 条，失败 ${failed} 条`,
            });
          }
          loadMaterials();
        } else {
          addNotification({
            type: 'error',
            title: '导入失败',
            message: '无法导入物料',
          });
        }
      } catch (err: unknown) {
        logger.error('导入物料失败:', err);
        addNotification({
          type: 'error',
          title: '导入失败',
          message: '无法导入物料',
        });
      } finally {
        event.target.value = '';
      }
    },
    [addNotification, loadMaterials]
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
        title: '导出成功',
        message: '物料数据已导出',
      });
    } catch (err: unknown) {
      logger.error('导出物料失败:', err);
      addNotification({
        type: 'error',
        title: '导出失败',
        message: '无法导出物料',
      });
    }
  }, [addNotification]);

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

  const getStatusLabel = useCallback((status: string): string => {
    switch (status) {
      case 'sufficient':
        return '充足';
      case 'normal':
        return '正常';
      case 'low':
        return '偏低';
      case 'insufficient':
        return '不足';
      default:
        return status;
    }
  }, []);

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
        label: '物料编码',
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
        label: '物料名称',
        width: 200,
        sortable: true,
      },
      {
        id: 'category',
        label: '类别',
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
        label: '库存',
        width: 100,
        sortable: true,
      },
      {
        id: 'unit',
        label: '单位',
        width: 80,
      },
      {
        id: 'status',
        label: '状态',
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
        label: '存放位置',
        width: 120,
        render: () => '-',
      },
    ],
    [getStatusColor, getStatusLabel, getStockStatus]
  );

  const rowActions: RowAction<Material>[] = [
    {
      label: '申请',
      onClick: () => {
        addNotification({
          type: 'info',
          title: '提示',
          message: '物料申请功能开发中',
        });
      },
    },
    {
      label: '编辑',
      icon: <Edit size={16} />,
      onClick: () => {
        addNotification({
          type: 'info',
          title: '提示',
          message: '编辑物料功能开发中',
        });
      },
    },
    {
      label: '删除',
      icon: <Trash2 size={16} />,
      color: 'error',
      onClick: (row) => handleDeleteClick(row.id),
    },
  ];

  const batchActions: BatchAction[] = [
    {
      label: '批量删除',
      icon: <Trash2 size={16} />,
      color: 'error',
      onClick: handleBatchDeleteClick,
      confirm: true,
      confirmMessage: `确定要删除选中的 ${selectedIds.length} 条物料吗？`,
    },
  ];

  const filters = useMemo(
    () => [
      {
        id: 'category',
        label: '类别筛选',
        type: 'select' as const,
        options: [
          { label: '全部', value: '' },
          ...categories.map((cat) => ({ label: cat, value: cat })),
        ],
        value: categoryFilter,
        onChange: (value: string) => {
          setCategoryFilter(value);
          setPage(0);
        },
      },
      {
        id: 'status',
        label: '状态筛选',
        type: 'select' as const,
        options: STATUS_OPTIONS,
        value: statusFilter,
        onChange: (value: string) => {
          setStatusFilter(value);
          setPage(0);
        },
      },
    ],
    [categories, categoryFilter, statusFilter]
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
                  物料总数
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
                  库存充足
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
                  库存不足
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
      title='物料管理'
      subtitle='管理研发物料、库存监控、物料申请'
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
          { label: '首页', href: '/dashboard' },
          { label: '研发', href: '/rs' },
          { label: '物料管理' },
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
        searchPlaceholder='搜索物料名称或编码...'
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
            label: '导入',
            icon: <Upload size={18} />,
            onClick: () => document.getElementById('import-file')?.click(),
            variant: 'outlined',
          },
          {
            label: '导出',
            icon: <Download size={18} />,
            onClick: handleExport,
            variant: 'outlined',
          },
          {
            label: '新增物料',
            icon: <Plus size={18} />,
            onClick: () => {
              addNotification({
                type: 'info',
                title: '提示',
                message: '新增物料功能开发中',
              });
            },
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        headerContent={headerContent}
        getRowId={(row) => row.id}
        onRefresh={loadMaterials}
        emptyMessage='暂无物料数据'
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
        title='确认删除'
        message='确定要删除这条物料吗？'
        danger
      />

      <ConfirmDialog
        isOpen={batchDeleteDialogOpen}
        onClose={() => setBatchDeleteDialogOpen(false)}
        onConfirm={handleBatchDelete}
        title='确认批量删除'
        message={`确定要删除选中的 ${selectedIds.length} 条物料吗？`}
        danger
      />
    </PageContainer>
  );
};

export default RsMaterialListPage;
