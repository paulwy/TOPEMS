import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Chip } from '@mui/material';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { PageContainer } from '@/components/common';
import { formulaApi } from '@/api/rs';
import type { Formula } from '@/api/rs';
import { useAppStore } from '@/store';
import { logger } from '@/utils/logger';
import { ConfirmDialog } from '@topems/shared-components';

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '草稿', value: 'draft' },
  { label: '测试中', value: 'testing' },
  { label: '已发布', value: 'approved' },
];

const RsFormulaListPage: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useAppStore();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const loadFormulas = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;

      const response = await formulaApi.listFormulas(params);
      if (response.success && response.data) {
        setFormulas(response.data || []);
      } else {
        setError(response.message || '加载配方列表失败');
      }
    } catch (err: unknown) {
      logger.error('加载配方列表失败:', err);
      setError('加载配方列表失败');
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载配方列表',
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, addNotification]);

  useEffect(() => {
    loadFormulas();
  }, [loadFormulas]);

  const handleDeleteClick = useCallback((formula: Formula) => {
    setSelectedFormula(formula);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedFormula) return;
    try {
      const response = await formulaApi.deleteFormula(selectedFormula.id);
      if (response.success) {
        addNotification({
          type: 'success',
          title: '删除成功',
          message: '配方已删除',
        });
        setFormulas((prev) => prev.filter((f) => f.id !== selectedFormula.id));
      } else {
        throw new Error('无法删除配方');
      }
    } catch (err: unknown) {
      logger.error('删除配方失败:', err);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除配方',
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedFormula(null);
    }
  }, [selectedFormula, addNotification]);

  const filteredFormulas = useMemo(() => {
    return formulas.filter(
      (f) =>
        (f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.code.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (!statusFilter || f.status === statusFilter)
    );
  }, [formulas, searchTerm, statusFilter]);

  const paginatedFormulas = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredFormulas.slice(start, start + rowsPerPage);
  }, [filteredFormulas, page, rowsPerPage]);

  const getStatusColor = useCallback(
    (status: string): 'success' | 'warning' | 'primary' | 'default' => {
      switch (status) {
        case '已发布':
        case 'approved':
          return 'success';
        case '测试中':
        case 'testing':
          return 'warning';
        case '草稿':
        case 'draft':
          return 'default';
        default:
          return 'primary';
      }
    },
    []
  );

  const getStatusLabel = useCallback((status: string): string => {
    switch (status) {
      case 'approved':
        return '已发布';
      case 'testing':
        return '测试中';
      case 'draft':
        return '草稿';
      default:
        return status;
    }
  }, []);

  const columns: ColumnDef<Formula>[] = useMemo(
    () => [
      {
        id: 'code',
        label: '配方编码',
        width: 140,
        sortable: true,
        render: (row) => <Box sx={{ fontWeight: 'medium' }}>{row.code}</Box>,
      },
      {
        id: 'name',
        label: '配方名称',
        width: 200,
        sortable: true,
      },
      {
        id: 'version',
        label: '版本',
        width: 100,
        render: (row) => (
          <Chip
            label={row.version}
            size='small'
          />
        ),
      },
      {
        id: 'project',
        label: '所属项目',
        width: 150,
        render: (row) => row.project_id || '-',
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        sortable: true,
        render: (row) => (
          <Chip
            label={getStatusLabel(row.status)}
            size='small'
            color={getStatusColor(row.status)}
          />
        ),
      },
      {
        id: 'created_by',
        label: '创建人',
        width: 100,
      },
      {
        id: 'created_at',
        label: '创建日期',
        width: 130,
        sortable: true,
      },
    ],
    [getStatusColor, getStatusLabel]
  );

  const rowActions: RowAction<Formula>[] = [
    {
      label: '查看',
      icon: <Eye size={16} />,
      onClick: (row) => navigate(`/rs/formulas/${row.id}`),
    },
    {
      label: '编辑',
      icon: <Edit size={16} />,
      onClick: (row) => navigate(`/rs/formulas/${row.id}/edit`),
    },
    {
      label: '删除',
      icon: <Trash2 size={16} />,
      color: 'error',
      onClick: handleDeleteClick,
    },
  ];

  const filters = useMemo(
    () => [
      {
        id: 'status',
        label: '状态筛选',
        type: 'select' as const,
        options: STATUS_OPTIONS,
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setPage(0);
        },
      },
    ],
    [statusFilter]
  );

  return (
    <PageContainer
      title='配方管理'
      subtitle='管理研发配方、版本控制、配方发布'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '研发', href: '/rs' },
          { label: '配方管理' },
        ]}
        columns={columns}
        data={paginatedFormulas}
        loading={loading}
        error={error}
        pagination={{
          page,
          pageSize: rowsPerPage,
          total: filteredFormulas.length,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setRowsPerPage(size);
            setPage(0);
          },
        }}
        searchable
        searchPlaceholder='搜索配方名称或编码...'
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
          setPage(0);
        }}
        filters={filters}
        filtersValue={{ status: statusFilter }}
        onFilterChange={(f) => {
          if (f.status !== undefined) {
            setStatusFilter(f.status);
            setPage(0);
          }
        }}
        actions={[
          {
            label: '新增配方',
            icon: <Plus size={18} />,
            onClick: () => navigate('/rs/formulas/create'),
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        getRowId={(row) => row.id}
        onRefresh={loadFormulas}
        emptyMessage='暂无配方数据'
        showRowNumber
        columnConfigurable
        persistColumnConfig
        columnConfigStorageKey='rs-formula-list-columns'
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedFormula(null);
        }}
        onConfirm={handleDeleteConfirm}
        title='确认删除'
        message={`确定要删除配方 "${selectedFormula?.name}" 吗？此操作不可恢复。`}
        danger
      />
    </PageContainer>
  );
};

export default RsFormulaListPage;
