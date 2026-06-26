import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Eye, Edit, Trash2, FileText, CheckCircle, AlertCircle, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Box, LinearProgress, IconButton, Tooltip } from '@mui/material';
import type { Contract } from '@/api/pm';
import { pmApi } from '@/api/pm';
import { apiLogger } from '@/utils/logger';
import { ListPageTemplate, type ColumnDef } from '@/components/templates';
import { StatusBadge } from '@/components/common';

const CONTRACT_TYPES = [
  { value: '', label: '全部类型' },
  { value: 'construction', label: '工程合同' },
  { value: 'service', label: '服务合同' },
  { value: 'purchase', label: '采购合同' },
  { value: 'sales', label: '销售合同' },
];

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已批准' },
  { value: 'active', label: '执行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const STATUS_LABELS: Record<string, string> = {
  active: '执行中',
  completed: '已完成',
  pending: '待审批',
  approved: '已批准',
  cancelled: '已取消',
  draft: '草稿',
};

const STATUS_COLORS: Record<string, 'success' | 'primary' | 'warning' | 'default' | 'error'> = {
  active: 'success',
  completed: 'primary',
  pending: 'warning',
  approved: 'primary',
  cancelled: 'default',
  draft: 'default',
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  construction: '工程合同',
  service: '服务合同',
  purchase: '采购合同',
  sales: '销售合同',
};

const PmContractListPage: React.FC = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  const loadContracts = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const response = await pmApi.contracts.list();
        if (response.success && response.data) {
          let filtered = response.data;
          if (selectedType) {
            filtered = filtered.filter((c: Contract) => c.contract_type === selectedType);
          }
          if (selectedStatus) {
            filtered = filtered.filter((c: Contract) => c.status === selectedStatus);
          }
          setContracts(filtered);
          setTotalCount(filtered.length);
          setTotalPages(Math.ceil(filtered.length / pageSize));
        }
      } catch (error: unknown) {
        apiLogger.error('Failed to load contracts:', error);
      } finally {
        setLoading(false);
      }
    },
    [selectedType, selectedStatus]
  );

  useEffect(() => {
    setCurrentPage(1);
    loadContracts(1);
  }, [selectedType, selectedStatus, loadContracts]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadContracts(page);
  };

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('确定要删除这个合同吗？')) return;
      try {
        const response = await pmApi.contracts.delete(id);
        if (response.success) {
          loadContracts(currentPage);
        }
      } catch (error: unknown) {
        apiLogger.error('Failed to delete contract:', error);
      }
    },
    [currentPage, loadContracts]
  );

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const columns: ColumnDef<Contract>[] = useMemo(
    () => [
      {
        id: 'contract_name',
        label: '合同名称',
        width: 200,
        sortable: true,
      },
      {
        id: 'contract_code',
        label: '合同编号',
        width: 120,
      },
      {
        id: 'contract_type',
        label: '类型',
        width: 100,
        render: (row) => CONTRACT_TYPE_LABELS[row.contract_type] || row.contract_type,
      },
      {
        id: 'party_b_name',
        label: '乙方',
        width: 150,
        render: (row) => row.party_b_name || '-',
      },
      {
        id: 'amount',
        label: '金额',
        width: 140,
        render: (row) => formatCurrency(row.amount),
      },
      {
        id: 'status',
        label: '状态',
        width: 100,
        render: (row) => (
          <StatusBadge
            status={row.status || ''}
            label={STATUS_LABELS[row.status || ''] || row.status}
            color={STATUS_COLORS[row.status || ''] || 'default'}
          />
        ),
      },
      {
        id: 'signing_date',
        label: '签署日期',
        width: 150,
        render: (row) => formatDate(row.signing_date),
      },
      {
        id: 'end_date',
        label: '到期日期',
        width: 150,
        render: (row) => formatDate(row.end_date),
      },
      {
        id: 'actions',
        label: '操作',
        width: 120,
        align: 'center',
        render: (row) => (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title='查看详情'>
              <IconButton
                size='small'
                onClick={() => navigate(`/pm/contracts/${row.id}`)}
              >
                <Eye size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title='编辑'>
              <IconButton
                size='small'
                onClick={() => navigate(`'/pm/contracts'`)}
              >
                <Edit size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title='删除'>
              <IconButton
                size='small'
                onClick={() => handleDelete(row.id)}
                sx={{ color: 'error.main' }}
              >
                <Trash2 size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [navigate, handleDelete]
  );

  const filters = useMemo(
    () => [
      {
        id: 'contract_type',
        label: '类型',
        type: 'select' as const,
        options: CONTRACT_TYPES,
        value: selectedType,
        onChange: setSelectedType,
      },
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: STATUS_OPTIONS,
        value: selectedStatus,
        onChange: setSelectedStatus,
      },
    ],
    [selectedType, selectedStatus]
  );

  const filteredData = useMemo(() => {
    if (!searchTerm) return contracts;
    return contracts.filter(
      (contract) =>
        contract.contract_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.contract_code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contracts, searchTerm]);

  const activeCount = contracts.filter((c) => c.status === 'active').length;
  const pendingCount = contracts.filter((c) => c.status === 'pending').length;
  const totalAmount = contracts.reduce((sum, c) => sum + (c.amount || 0), 0);

  return (
    <ListPageTemplate
      title='合同管理'
      subtitle='管理项目相关的合同，跟踪合同执行状态'
      breadcrumbs={[{ label: '首页', href: '/dashboard' }, { label: '项目管理' }, { label: '合同' }]}
      columns={columns}
      data={filteredData}
      loading={loading}
      selectable
      pagination={{
        page: currentPage,
        pageSize,
        total: totalCount,
        onPageChange: handlePageChange,
      }}
      searchable
      searchPlaceholder='搜索合同名称或编号...'
      searchValue={searchTerm}
      onSearch={setSearchTerm}
      filters={filters}
      filtersValue={{ contract_type: selectedType, status: selectedStatus }}
      onFilterChange={(f) => {
        if (f.contract_type !== undefined) setSelectedType(f.contract_type);
        if (f.status !== undefined) setSelectedStatus(f.status);
      }}
      actions={[
        {
          label: '创建合同',
          icon: <Plus size={16} />,
          onClick: () => navigate('/pm/contracts/create'),
          variant: 'contained',
        },
      ]}
      showRowNumber
      columnConfigurable
      persistColumnConfig
      columnConfigStorageKey='pm-contracts-columns'
      onRefresh={() => loadContracts(currentPage)}
      headerContent={
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1,
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1.5, bgcolor: '#dbeafe', borderRadius: '50%' }}>
                <FileText size={24} color='primary.dark' />
              </Box>
              <Box>
                <Box sx={{ fontSize: '0.875rem', color: 'grey.500' }}>合同总数</Box>
                <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'grey.900' }}>
                  {contracts.length}
                </Box>
              </Box>
            </Box>
          </Box>
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1,
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1.5, bgcolor: 'success.light', borderRadius: '50%' }}>
                <CheckCircle size={24} color='success.dark' />
              </Box>
              <Box>
                <Box sx={{ fontSize: '0.875rem', color: 'grey.500' }}>执行中</Box>
                <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'success.dark' }}>
                  {activeCount}
                </Box>
              </Box>
            </Box>
          </Box>
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1,
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1.5, bgcolor: 'warning.light', borderRadius: '50%' }}>
                <AlertCircle size={24} color='#ca8a04' />
              </Box>
              <Box>
                <Box sx={{ fontSize: '0.875rem', color: 'grey.500' }}>待审批</Box>
                <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: 'warning.dark' }}>
                  {pendingCount}
                </Box>
              </Box>
            </Box>
          </Box>
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1,
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ p: 1.5, bgcolor: '#e9d5ff', borderRadius: '50%' }}>
                <DollarSign size={24} color='#7e22ce' />
              </Box>
              <Box>
                <Box sx={{ fontSize: '0.875rem', color: 'grey.500' }}>合同总金额</Box>
                <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#7e22ce' }}>
                  {formatCurrency(totalAmount)}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      }
    />
  );
};

export default PmContractListPage;