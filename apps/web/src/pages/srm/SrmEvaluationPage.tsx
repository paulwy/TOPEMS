import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { Box, Chip, Rating } from '@mui/material';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { srmApi, type SupplierEvaluation, type Supplier } from '@/api/srm';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { ConfirmDialog } from '@topems/shared-components';
import { PageContainer } from '@/components/common';
import { SRM_PATHS } from '@/modules/srm/config';

interface EvaluationWithSupplier extends SupplierEvaluation {
  supplier_name?: string;
}

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '进行中', value: 'in_progress' },
  { label: '待审核', value: 'pending' },
  { label: '已完成', value: 'completed' },
  { label: '已驳回', value: 'rejected' },
];

const SrmEvaluationPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationWithSupplier | null>(null);

  const suppliersQuery = useQuery<Supplier[]>({
    queryKey: QUERY_KEYS.SRM.SUPPLIERS,
    queryFn: async () => {
      const response = await srmApi.listSuppliers();
      if (response.success && response.data) return response.data;
      return [];
    },
  });

  const evaluationsQuery = useQuery<EvaluationWithSupplier[]>({
    queryKey: QUERY_KEYS.SRM.EVALUATIONS,
    queryFn: async () => {
      const [evalResponse, supplierResponse] = await Promise.all([
        srmApi.listEvaluations(),
        srmApi.listSuppliers(),
      ]);

      const supplierMap = new Map((supplierResponse.data || []).map((s) => [s.id, s.name]));

      if (evalResponse.success && evalResponse.data) {
        return evalResponse.data.map((evalItem) => ({
          ...evalItem,
          supplier_name: supplierMap.get(evalItem.supplier_id),
        }));
      }
      return [];
    },
  });

  const suppliers = suppliersQuery.data || [];
  const allEvaluations = evaluationsQuery.data || [];
  const loading = evaluationsQuery.isLoading || suppliersQuery.isLoading;
  const error = evaluationsQuery.error
    ? evaluationsQuery.error instanceof Error
      ? evaluationsQuery.error.message
      : '加载评估数据失败'
    : '';

  const deleteMutation = useMutation({
    mutationFn: async (evaluationId: string) => {
      const response = await srmApi.deleteEvaluation(evaluationId);
      if (!response.success) {
        throw new Error(response.message || '删除评估失败');
      }
      return response;
    },
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '删除评估成功',
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SRM.EVALUATIONS });
    },
    onError: (err: unknown) => {
      apiLogger.error('删除评估失败:', err);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '删除评估失败',
      });
    },
  });

  const handleDeleteClick = useCallback((evaluation: EvaluationWithSupplier) => {
    setSelectedEvaluation(evaluation);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!selectedEvaluation) return;
    deleteMutation.mutate(selectedEvaluation.id);
    setDeleteDialogOpen(false);
    setSelectedEvaluation(null);
  }, [selectedEvaluation, deleteMutation]);

  const filteredEvaluations = useMemo(() => {
    return allEvaluations.filter((e) => {
      const matchesSearch =
        !searchTerm ||
        e.evaluation_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.evaluator?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allEvaluations, searchTerm, statusFilter]);

  const paginatedEvaluations = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredEvaluations.slice(start, start + rowsPerPage);
  }, [filteredEvaluations, page, rowsPerPage]);

  const getStatusColor = useCallback(
    (status: string): 'primary' | 'success' | 'warning' | 'error' | 'default' => {
      switch (status) {
        case '进行中':
        case 'in_progress':
          return 'primary';
        case '已完成':
        case 'completed':
          return 'success';
        case '待审核':
        case 'pending':
          return 'warning';
        case '已驳回':
        case 'rejected':
          return 'error';
        default:
          return 'default';
      }
    },
    []
  );

  const getStatusLabel = useCallback((status: string): string => {
    switch (status) {
      case 'in_progress':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'pending':
        return '待审核';
      case 'rejected':
        return '已驳回';
      default:
        return status;
    }
  }, []);

  const columns: ColumnDef<EvaluationWithSupplier>[] = useMemo(
    () => [
      {
        id: 'evaluation_no',
        label: '评估编号',
        width: 150,
        sortable: true,
        render: (row) => <Box sx={{ fontWeight: 'medium' }}>{row.evaluation_no}</Box>,
      },
      {
        id: 'supplier',
        label: '供应商',
        width: 180,
        sortable: true,
        render: (row) => row.supplier_name || '-',
      },
      { id: 'evaluation_date', label: '评估日期', width: 120, sortable: true },
      {
        id: 'overall_score',
        label: '综合评分',
        width: 180,
        sortable: true,
        render: (row) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Rating
              value={row.overall_score || 0}
              readOnly
              max={10}
              precision={0.5}
              size='small'
            />
            <span>{row.overall_score || '-'}</span>
          </Box>
        ),
      },
      {
        id: 'quality_score',
        label: '质量',
        width: 100,
        sortable: true,
        render: (row) => row.quality_score || '-',
      },
      {
        id: 'delivery_score',
        label: '交付',
        width: 100,
        sortable: true,
        render: (row) => row.delivery_score || '-',
      },
      {
        id: 'service_score',
        label: '服务',
        width: 100,
        sortable: true,
        render: (row) => row.service_score || '-',
      },
      {
        id: 'price_score',
        label: '价格',
        width: 100,
        sortable: true,
        render: (row) => row.price_score || '-',
      },
      {
        id: 'evaluator',
        label: '评估人',
        width: 100,
        render: (row) => row.evaluator || '-',
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
    ],
    [getStatusColor, getStatusLabel]
  );

  const rowActions: RowAction<EvaluationWithSupplier>[] = useMemo(
    () => [
      {
        label: '查看详情',
        icon: <Eye size={16} />,
        onClick: (row) => navigate(SRM_PATHS.evaluation),
      },
      {
        label: '编辑',
        icon: <Edit size={16} />,
        onClick: (row) => navigate(SRM_PATHS.evaluation),
      },
      {
        label: '删除',
        icon: <Trash2 size={16} />,
        color: 'error',
        onClick: handleDeleteClick,
      },
    ],
    [navigate, handleDeleteClick]
  );

  const filters = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
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
      title='供应商评估'
      subtitle='管理供应商评估、跟踪评估进度、分析评分数据'
    >
      <ListPageTemplate
        title=''
        subtitle=''
        breadcrumbs={[
          { label: '首页', href: '/dashboard' },
          { label: '供应商管理', href: '/srm' },
          { label: '供应商评估' },
        ]}
        columns={columns}
        data={paginatedEvaluations}
        loading={loading}
        error={error}
        pagination={{
          page,
          pageSize: rowsPerPage,
          total: filteredEvaluations.length,
          onPageChange: setPage,
          onPageSizeChange: (size) => {
            setRowsPerPage(size);
            setPage(0);
          },
        }}
        searchable
        searchPlaceholder='搜索评估编号、供应商或评估人...'
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
        actions={[]}
        rowActions={rowActions}
        getRowId={(row) => row.id}
        onRefresh={() => evaluationsQuery.refetch()}
        emptyMessage='暂无评估数据'
        showRowNumber
        columnConfigurable
        persistColumnConfig
        columnConfigStorageKey='srm-evaluation-list-columns'
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedEvaluation(null);
        }}
        onConfirm={handleDeleteConfirm}
        title='确认删除'
        message={`确定要删除评估 "${selectedEvaluation?.evaluation_no}" 吗？此操作不可恢复。`}
        danger
      />
    </PageContainer>
  );
};

export default SrmEvaluationPage;
