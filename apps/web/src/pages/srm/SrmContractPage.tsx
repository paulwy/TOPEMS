import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Chip } from '@mui/material';
import { Plus, Eye, Edit, Trash2, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ListPageTemplate, type ColumnDef, type RowAction } from '@/components/templates';
import { srmApi, type SupplierContract } from '@/api/srm';
import { useAppStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import ConfirmDialog from '@/components/common/ConfirmDialog';

const STATUS_OPTIONS = [
  { label: '全部', value: '' },
  { label: '待签署', value: 'pending' },
  { label: '执行中', value: 'active' },
  { label: '已完成', value: 'completed' },
  { label: '已终止', value: 'terminated' },
];

const SrmContractPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const [contracts, setContracts] = useState<SupplierContract[]>([]);
  const [allContracts, setAllContracts] = useState<SupplierContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<SupplierContract | null>(null);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await srmApi.listContracts();
      if (response.success && response.data) {
        setAllContracts(response.data);
      } else {
        setError(response.message || '加载合同数据失败');
        addNotification({
          type: 'error',
          title: '加载失败',
          message: response.message || '加载合同数据失败',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('加载合同数据失败:', err);
      setError('加载合同数据失败');
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '加载合同数据失败',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const filteredContracts = useMemo(() => {
    let filtered = [...allContracts];
    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.contract_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter) {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }
    if (typeFilter) {
      filtered = filtered.filter((c) => c.contract_type === typeFilter);
    }
    return filtered;
  }, [allContracts, searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    setTotal(filteredContracts.length);
    setContracts(filteredContracts.slice(page * rowsPerPage, (page + 1) * rowsPerPage));
  }, [filteredContracts, page, rowsPerPage]);

  const contractTypes = useMemo(() => {
    return [...new Set(allContracts.map((c) => c.contract_type))];
  }, [allContracts]);

  const handleDeleteClick = useCallback((contract: SupplierContract) => {
    setSelectedContract(contract);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedContract) return;
    try {
      const response = await srmApi.deleteContract(selectedContract.id);
      if (response.success) {
        addNotification({
          type: 'success',
          title: '删除成功',
          message: '删除合同成功',
        });
        setAllContracts((prev) => prev.filter((c) => c.id !== selectedContract.id));
      } else {
        throw new Error(response.message || '删除合同失败');
      }
    } catch (err: unknown) {
      apiLogger.error('删除合同失败:', err);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '删除合同失败',
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedContract(null);
    }
  }, [selectedContract, addNotification]);

  const getStatusColor = useCallback(
    (status: string): 'primary' | 'success' | 'warning' | 'error' | 'default' => {
      switch (status) {
        case '执行中':
        case 'active':
          return 'primary';
        case '已完成':
        case 'completed':
          return 'success';
        case '待签署':
        case 'pending':
          return 'warning';
        case '已终止':
        case 'terminated':
          return 'error';
        default:
          return 'default';
      }
    },
    []
  );

  const getStatusLabel = useCallback((status: string): string => {
    switch (status) {
      case 'active':
        return '执行中';
      case 'completed':
        return '已完成';
      case 'pending':
        return '待签署';
      case 'terminated':
        return '已终止';
      default:
        return status;
    }
  }, []);

  const columns: ColumnDef<SupplierContract>[] = useMemo(
    () => [
      {
        id: 'contract_no',
        label: '合同编号',
        width: 150,
        sortable: true,
        render: (row) => <Box sx={{ fontWeight: 'medium' }}>{row.contract_no}</Box>,
      },
      {
        id: 'title',
        label: '合同名称',
        width: 200,
        sortable: true,
      },
      {
        id: 'supplier',
        label: '供应商',
        width: 150,
        render: (row) => row.supplier_name || '-',
      },
      {
        id: 'contract_type',
        label: '合同类型',
        width: 120,
        render: (row) => <Chip label={row.contract_type} size='small' variant='outlined' />,
      },
      {
        id: 'amount',
        label: '合同金额',
        width: 130,
        sortable: true,
        render: (row) => {
          if (!row.total_amount) return '-';
          return `${row.currency} ${row.total_amount.toLocaleString()}`;
        },
      },
      {
        id: 'sign_date',
        label: '签署日期',
        width: 120,
        sortable: true,
      },
      {
        id: 'start_date',
        label: '开始日期',
        width: 120,
        sortable: true,
      },
      {
        id: 'end_date',
        label: '结束日期',
        width: 120,
        sortable: true,
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        sortable: true,
        render: (row) => (
          <Chip label={getStatusLabel(row.status)} size='small' color={getStatusColor(row.status)} />
        ),
      },
    ],
    [getStatusColor, getStatusLabel]
  );

  const rowActions: RowAction<SupplierContract>[] = [
    {
      label: '查看详情',
      icon: <Eye size={16} />,
      onClick: (row) => navigate(`/srm/contracts/${row.id}`),
    },
    {
      label: '编辑',
      icon: <Edit size={16} />,
      onClick: (row) => navigate(`/srm/contracts/${row.id}/edit`),
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
        label: '状态',
        type: 'select' as const,
        options: STATUS_OPTIONS,
        value: statusFilter,
        onChange: (value: string) => {
          setStatusFilter(value);
          setPage(0);
        },
      },
      {
        id: 'type',
        label: '合同类型',
        type: 'select' as const,
        options: [
          { label: '全部', value: '' },
          ...contractTypes.map((type) => ({ label: type, value: type })),
        ],
        value: typeFilter,
        onChange: (value: string) => {
          setTypeFilter(value);
          setPage(0);
        },
      },
    ],
    [statusFilter, typeFilter, contractTypes]
  );

  return (
    <>
      <ListPageTemplate
        title='合同管理'
        subtitle='管理供应商合同、跟踪合同状态、合同归档'
        breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '供应商关系', href: '/srm' }, { label: '合同管理' }]}
        columns={columns}
        data={contracts}
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
        searchPlaceholder='搜索合同名称、编号或供应商...'
        searchValue={searchTerm}
        onSearch={(value) => {
          setSearchTerm(value);
          setPage(0);
        }}
        filters={filters}
        filtersValue={{ status: statusFilter, type: typeFilter }}
        onFilterChange={(f) => {
          if (f.status !== undefined) {
            setStatusFilter(f.status);
            setPage(0);
          }
          if (f.type !== undefined) {
            setTypeFilter(f.type);
            setPage(0);
          }
        }}
        actions={[
          {
            label: '新建合同',
            icon: <Plus size={18} />,
            onClick: () => navigate('/srm/contracts/create'),
            variant: 'contained',
          },
        ]}
        rowActions={rowActions}
        getRowId={(row) => row.id}
        onRefresh={loadContracts}
        emptyMessage='暂无合同数据'
        showRowNumber
        columnConfigurable
        persistColumnConfig
        columnConfigStorageKey='srm-contract-list-columns'
      />

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedContract(null);
        }}
        onConfirm={handleDeleteConfirm}
        title='确认删除'
        message={`确定要删除合同 "${selectedContract?.title}" 吗？此操作不可恢复。`}
        danger
      />
    </>
  );
};

export default SrmContractPage;
