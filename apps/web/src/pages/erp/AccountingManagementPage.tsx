import {
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import type { AccountingSubject, OpeningBalance, PaginationParams } from '@/api/erp';
import { accountingSubjectApi, openingBalanceApi } from '@/api/erp';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  ListPageTemplate,
  type ColumnDef,
  type RowAction,
  type FilterConfig,
} from '@/components/templates';
import { Edit, Trash2, Eye, Save, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

type SubjectFormData = {
  code: string;
  name: string;
  parent_code?: string;
  category?: string;
  level: number;
  is_cash_flow: boolean;
  status: string;
  description?: string;
};

type BalanceFormData = {
  company_id: string;
  subject_code: string;
  subject_name: string;
  period: string;
  debit_balance: number;
  credit_balance: number;
};

const AccountingManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AccountingSubject | OpeningBalance | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [subjectForm, setSubjectForm] = useState<SubjectFormData>({
    code: '',
    name: '',
    parent_code: '',
    category: 'asset',
    level: 1,
    is_cash_flow: false,
    status: 'active',
    description: '',
  });
  const [balanceForm, setBalanceForm] = useState<BalanceFormData>({
    company_id: '',
    subject_code: '',
    subject_name: '',
    period: new Date().toISOString().slice(0, 7),
    debit_balance: 0,
    credit_balance: 0,
  });

  const params: PaginationParams = {
    page: currentPage - 1,
    pagesize: pageSize,
  };
  if (searchTerm) params.search = searchTerm;
  if (statusFilter !== 'all') params.status = statusFilter;

  const { data: subjectsData, isLoading: subjectsLoading } = useQuery({
    queryKey: [...QUERY_KEYS.ERP.ACCOUNTING_SUBJECTS, params],
    queryFn: async () => {
      const response = await accountingSubjectApi.list(params);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 0,
  });

  const { data: balancesData, isLoading: balancesLoading } = useQuery({
    queryKey: [...QUERY_KEYS.ERP.OPENING_BALANCES, params],
    queryFn: async () => {
      const response = await openingBalanceApi.list(params);
      if (response.success && response.data) {
        return { items: response.data.items || [], total: response.data.total || 0 };
      }
      return { items: [], total: 0 };
    },
    enabled: activeTab === 1,
  });

  const subjects = subjectsData?.items || [];
  const balances = balancesData?.items || [];
  const data = activeTab === 0 ? subjects : balances;
  const total = activeTab === 0 ? (subjectsData?.total || 0) : (balancesData?.total || 0);
  const loading = activeTab === 0 ? subjectsLoading : balancesLoading;

  const invalidateData = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.ACCOUNTING_SUBJECTS });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ERP.OPENING_BALANCES });
  };

  const createSubjectMutation = useMutation({
    mutationFn: (data: Partial<AccountingSubject>) => accountingSubjectApi.create(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '会计科目已添加' });
      invalidateData();
      setShowDialog(false);
      resetSubjectForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '添加会计科目失败' });
    },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AccountingSubject> }) =>
      accountingSubjectApi.update(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '更新成功', message: '会计科目已更新' });
      invalidateData();
      setShowDialog(false);
      resetSubjectForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '更新会计科目失败' });
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (id: string) => accountingSubjectApi.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '会计科目已删除' });
      invalidateData();
    },
    onError: (error: unknown) => {
      apiLogger.error('删除失败:', error);
      addNotification({ type: 'error', title: '删除失败', message: '无法删除会计科目' });
    },
  });

  const createBalanceMutation = useMutation({
    mutationFn: (data: BalanceFormData) => openingBalanceApi.create(data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '创建成功', message: '期初余额已添加' });
      invalidateData();
      setShowDialog(false);
      resetBalanceForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '添加期初余额失败' });
    },
  });

  const updateBalanceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BalanceFormData }) =>
      openingBalanceApi.update(id, data),
    onSuccess: () => {
      addNotification({ type: 'success', title: '更新成功', message: '期初余额已更新' });
      invalidateData();
      setShowDialog(false);
      resetBalanceForm();
    },
    onError: (error: unknown) => {
      apiLogger.error('操作失败:', error);
      addNotification({ type: 'error', title: '操作失败', message: '更新期初余额失败' });
    },
  });

  const deleteBalanceMutation = useMutation({
    mutationFn: (id: string) => openingBalanceApi.delete(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '删除成功', message: '期初余额已删除' });
      invalidateData();
    },
    onError: (error: unknown) => {
      apiLogger.error('删除失败:', error);
      addNotification({ type: 'error', title: '删除失败', message: '无法删除期初余额' });
    },
  });

  const carryForwardMutation = useMutation({
    mutationFn: () =>
      openingBalanceApi.carryForward({
        from_period: new Date().toISOString().slice(0, 7),
        to_period: new Date().toISOString().slice(0, 7),
      }),
    onSuccess: () => {
      addNotification({ type: 'success', title: '结转成功', message: '期初余额已结转' });
      invalidateData();
    },
    onError: (error: unknown) => {
      apiLogger.error('结转失败:', error);
      addNotification({ type: 'error', title: '结转失败', message: '无法结转期初余额' });
    },
  });

  const getTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      asset: '资产',
      liability: '负债',
      equity: '权益',
      income: '收入',
      expense: '费用',
      debit: '借方',
      credit: '贷方',
      active: '启用',
      disabled: '禁用',
    };
    return typeMap[type] || type;
  };

  const getTypeBadge = (type: string) => {
    const typeMap: Record<
      string,
      {
        label: string;
        bg: string;
        color: string;
      }
    > = {
      asset: { label: '资产', bg: 'success.lighter', color: 'success.700' },
      liability: { label: '负债', bg: 'error.lighter', color: 'error.dark' },
      equity: { label: '权益', bg: 'secondary[100]', color: 'secondary.700' },
      income: { label: '收入', bg: 'info.light', color: 'info.700' },
      expense: { label: '费用', bg: 'warning.light', color: 'warning.700' },
      debit: { label: '借方', bg: 'success.lighter', color: 'success.700' },
      credit: { label: '贷方', bg: 'error.lighter', color: 'error.dark' },
      active: { label: '启用', bg: 'success.lighter', color: 'success.700' },
      disabled: { label: '禁用', bg: 'grey.100', color: 'text.secondary' },
    };
    const s = typeMap[type] || { label: type, bg: 'grey.100', color: 'text.secondary' };
    return (
      <Chip
        size='small'
        label={s.label}
        sx={{ backgroundColor: s.bg, color: s.color, fontWeight: 500 }}
      />
    );
  };

  const handleSubmitSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem && activeTab === 0) {
      updateSubjectMutation.mutate({ id: selectedItem.id, data: subjectForm });
    } else {
      createSubjectMutation.mutate(subjectForm);
    }
  };

  const handleSubmitBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem && activeTab === 1) {
      updateBalanceMutation.mutate({ id: selectedItem.id, data: balanceForm });
    } else {
      createBalanceMutation.mutate(balanceForm);
    }
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('确定要删除这条记录吗?')) return;
    if (activeTab === 0) {
      deleteSubjectMutation.mutate(id);
    } else {
      deleteBalanceMutation.mutate(id);
    }
  };

  const handleEdit = (item: AccountingSubject | OpeningBalance) => {
    setSelectedItem(item);
    if (activeTab === 0) {
      const s = item as AccountingSubject;
      setSubjectForm({
        code: s.code || '',
        name: s.name || '',
        parent_code: s.parent_code || '',
        category: s.category || 'asset',
        level: s.level || 1,
        is_cash_flow: s.is_cash_flow || false,
        status: s.status || 'active',
        description: s.description || '',
      });
    } else {
      const b = item as OpeningBalance;
      setBalanceForm({
        company_id: b.company_id || '',
        subject_code: b.subject_code || '',
        subject_name: b.subject_name || '',
        period: b.period || '',
        debit_balance: b.debit_balance || 0,
        credit_balance: b.credit_balance || 0,
      });
    }
    setShowDialog(true);
  };

  const handleViewDetail = (item: AccountingSubject | OpeningBalance) => {
    setSelectedItem(item);
    setShowDetailDialog(true);
  };

  const resetSubjectForm = () => {
    setSubjectForm({
      code: '',
      name: '',
      parent_code: '',
      category: 'asset',
      level: 1,
      is_cash_flow: false,
      status: 'active',
      description: '',
    });
  };

  const resetBalanceForm = () => {
    setBalanceForm({
      company_id: '',
      subject_code: '',
      subject_name: '',
      period: new Date().toISOString().slice(0, 7),
      debit_balance: 0,
      credit_balance: 0,
    });
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const subjectColumns: ColumnDef<AccountingSubject>[] = useMemo(
    () => [
      {
        id: 'code',
        label: '科目编码',
        accessorKey: 'code',
        sortable: true,
      },
      {
        id: 'name',
        label: '科目名称',
        accessorKey: 'name',
        sortable: true,
      },
      {
        id: 'category',
        label: '科目类型',
        render: (row) => getTypeBadge(row.category || ''),
      },
      {
        id: 'level',
        label: '级别',
        accessorKey: 'level',
      },
      {
        id: 'is_cash_flow',
        label: '现金流',
        render: (row) => (row.is_cash_flow ? '是' : '否'),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getTypeBadge(row.status),
      },
      {
        id: 'created_at',
        label: '创建时间',
        render: (row) => new Date(row.created_at).toLocaleDateString('zh-CN'),
      },
    ],
    []
  );

  const balanceColumns: ColumnDef<OpeningBalance>[] = useMemo(
    () => [
      {
        id: 'subject_code',
        label: '科目编码',
        accessorKey: 'subject_code',
        sortable: true,
      },
      {
        id: 'subject_name',
        label: '科目名称',
        accessorKey: 'subject_name',
        sortable: true,
      },
      {
        id: 'period',
        label: '期间',
        accessorKey: 'period',
      },
      {
        id: 'debit_balance',
        label: '借方余额',
        render: (row) => `¥${(row.debit_balance || 0).toFixed(2)}`,
        sortable: true,
      },
      {
        id: 'credit_balance',
        label: '贷方余额',
        render: (row) => `¥${(row.credit_balance || 0).toFixed(2)}`,
        sortable: true,
      },
      {
        id: 'created_at',
        label: '创建时间',
        render: (row) => new Date(row.created_at).toLocaleDateString('zh-CN'),
      },
    ],
    []
  );

  const columns = (activeTab === 0 ? subjectColumns : balanceColumns) as ColumnDef<
    AccountingSubject | OpeningBalance
  >[];

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select',
        options: [
          { label: '全部状态', value: 'all' },
          { label: '启用', value: 'active' },
          { label: '禁用', value: 'disabled' },
        ],
        value: statusFilter,
        onChange: (value: unknown) => {
          setStatusFilter(value as string);
          setCurrentPage(1);
        },
      },
    ],
    [statusFilter]
  );

  const rowActions: RowAction<AccountingSubject | OpeningBalance>[] = useMemo(
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
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这条记录吗?',
      },
    ],
    []
  );

  const handleOpenCreate = () => {
    setSelectedItem(null);
    if (activeTab === 0) {
      resetSubjectForm();
    } else {
      resetBalanceForm();
    }
    setShowDialog(true);
  };

  const totalDebit = balances.reduce((sum, item) => sum + (item.debit_balance || 0), 0);
  const totalCredit = balances.reduce((sum, item) => sum + (item.credit_balance || 0), 0);

  const statsContent = (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ p: 2, bgcolor: ct.secondary[100], borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <FileSpreadsheet size={18} sx={{ color: 'secondary.700' }} />
          <Box component='span' sx={{ color: 'text.secondary', fontSize: 14 }}>
            记录总数
          </Box>
        </Box>
        <Box sx={{ fontWeight: 700, fontSize: 24, color: 'secondary.700' }}>{data.length}</Box>
      </Box>
      {activeTab === 0 ? (
        <>
          <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>资产类科目</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>
              {subjects.filter((s) => s.category === 'asset').length}
            </Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>负债类科目</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'error.dark' }}>
              {subjects.filter((s) => s.category === 'liability').length}
            </Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'secondary[100]', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>权益类科目</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'secondary.700' }}>
              {subjects.filter((s) => s.category === 'equity').length}
            </Box>
          </Box>
        </>
      ) : (
        <>
          <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>借方总余额</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'success.700' }}>
              ¥{totalDebit.toFixed(2)}
            </Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'warning.light', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>贷方总余额</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'warning.700' }}>
              ¥{totalCredit.toFixed(2)}
            </Box>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 3 }}>
            <Box sx={{ color: 'text.secondary', fontSize: 14, mb: 1 }}>差额</Box>
            <Box sx={{ fontWeight: 700, fontSize: 24, color: 'info.700' }}>
              ¥{Math.abs(totalDebit - totalCredit).toFixed(2)}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );

  if (loading) return <LoadingSpinner />;

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <FileSpreadsheet style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <Tabs
        value={activeTab}
        onChange={(_, v) => {
          setActiveTab(v);
          setCurrentPage(1);
        }}
        sx={{ mb: 3 }}
      >
        <Tab label='会计科目' icon={<FileSpreadsheet size={16} />} />
        <Tab label='期初余额' icon={<RefreshCw size={16} />} />
      </Tabs>

      <ListPageTemplate
        title=''
        subtitle=''
        columns={columns}
        data={data}
        loading={loading}
        filters={filters}
        searchable
        searchPlaceholder={activeTab === 0 ? '搜索科目名称...' : '搜索科目编码...'}
        searchValue={searchTerm}
        onSearch={handleSearch}
        pagination={{
          page: currentPage - 1,
          pageSize,
          total,
          onPageChange: (page) => setCurrentPage(page + 1),
        }}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids.map(String))}
        actions={[
          {
            label: `新增${activeTab === 0 ? '会计科目' : '期初余额'}`,
            icon: <Save size={16} />,
            onClick: handleOpenCreate,
          },
          ...(activeTab === 1
            ? [
                {
                  label: '结转期初余额',
                  icon: <RefreshCw size={16} />,
                  onClick: () => carryForwardMutation.mutate(),
                },
              ]
            : []),
        ]}
        rowActions={rowActions}
        headerContent={statsContent}
        emptyMessage={`暂无${activeTab === 0 ? '会计科目' : '期初余额'}数据`}
        getRowId={(row) => row.id}
      />

      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth='md'>
        <DialogTitle>
          {selectedItem ? '编辑记录' : `新增${activeTab === 0 ? '会计科目' : '期初余额'}`}
        </DialogTitle>
        <DialogContent>
          {activeTab === 0 ? (
            <form onSubmit={handleSubmitSubject}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                  py: 2,
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='code'>科目编码 *</InputLabel>
                  <TextField
                    id='code'
                    required
                    size='small'
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='name'>科目名称 *</InputLabel>
                  <TextField
                    id='name'
                    required
                    size='small'
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='parent_code'>上级科目编码</InputLabel>
                  <TextField
                    id='parent_code'
                    size='small'
                    value={subjectForm.parent_code || ''}
                    onChange={(e) =>
                      setSubjectForm({ ...subjectForm, parent_code: e.target.value })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='category'>科目类型</InputLabel>
                  <FormControl fullWidth size='small'>
                    <Select
                      id='category'
                      value={subjectForm.category || 'asset'}
                      onChange={(e) =>
                        setSubjectForm({ ...subjectForm, category: e.target.value })
                      }
                    >
                      <MenuItem value='asset'>资产</MenuItem>
                      <MenuItem value='liability'>负债</MenuItem>
                      <MenuItem value='equity'>权益</MenuItem>
                      <MenuItem value='income'>收入</MenuItem>
                      <MenuItem value='expense'>费用</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='level'>科目级别</InputLabel>
                  <TextField
                    id='level'
                    size='small'
                    type='number'
                    value={subjectForm.level}
                    onChange={(e) =>
                      setSubjectForm({
                        ...subjectForm,
                        level: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='is_cash_flow'>现金流科目</InputLabel>
                  <FormControl fullWidth size='small'>
                    <Select
                      id='is_cash_flow'
                      value={subjectForm.is_cash_flow ? 'true' : 'false'}
                      onChange={(e) =>
                        setSubjectForm({
                          ...subjectForm,
                          is_cash_flow: e.target.value === 'true',
                        })
                      }
                    >
                      <MenuItem value='true'>是</MenuItem>
                      <MenuItem value='false'>否</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, gridColumn: '1 / -1' }}>
                  <InputLabel htmlFor='description'>描述</InputLabel>
                  <TextField
                    id='description'
                    size='small'
                    multiline
                    rows={2}
                    value={subjectForm.description || ''}
                    onChange={(e) =>
                      setSubjectForm({ ...subjectForm, description: e.target.value })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='status'>状态</InputLabel>
                  <FormControl fullWidth size='small'>
                    <Select
                      id='status'
                      value={subjectForm.status || 'active'}
                      onChange={(e) =>
                        setSubjectForm({ ...subjectForm, status: e.target.value })
                      }
                    >
                      <MenuItem value='active'>启用</MenuItem>
                      <MenuItem value='disabled'>禁用</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              <DialogActions sx={{ mt: 2 }}>
                <Button type='button' variant='outlined' onClick={() => setShowDialog(false)}>
                  取消
                </Button>
                <Button type='submit' variant='contained' startIcon={<Save size={16} />}>
                  保存
                </Button>
              </DialogActions>
            </form>
          ) : (
            <form onSubmit={handleSubmitBalance}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                  py: 2,
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='subject_code'>科目编码 *</InputLabel>
                  <TextField
                    id='subject_code'
                    required
                    size='small'
                    value={balanceForm.subject_code}
                    onChange={(e) =>
                      setBalanceForm({ ...balanceForm, subject_code: e.target.value })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='subject_name'>科目名称 *</InputLabel>
                  <TextField
                    id='subject_name'
                    required
                    size='small'
                    value={balanceForm.subject_name}
                    onChange={(e) =>
                      setBalanceForm({ ...balanceForm, subject_name: e.target.value })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='period'>期间 *</InputLabel>
                  <TextField
                    id='period'
                    required
                    size='small'
                    type='month'
                    value={balanceForm.period || ''}
                    onChange={(e) => setBalanceForm({ ...balanceForm, period: e.target.value })}
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='company_id'>公司ID</InputLabel>
                  <TextField
                    id='company_id'
                    size='small'
                    value={balanceForm.company_id || ''}
                    onChange={(e) =>
                      setBalanceForm({ ...balanceForm, company_id: e.target.value })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='debit_balance'>借方余额</InputLabel>
                  <TextField
                    id='debit_balance'
                    size='small'
                    type='number'
                    value={balanceForm.debit_balance}
                    onChange={(e) =>
                      setBalanceForm({
                        ...balanceForm,
                        debit_balance: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <InputLabel htmlFor='credit_balance'>贷方余额</InputLabel>
                  <TextField
                    id='credit_balance'
                    size='small'
                    type='number'
                    value={balanceForm.credit_balance}
                    onChange={(e) =>
                      setBalanceForm({
                        ...balanceForm,
                        credit_balance: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </Box>
              </Box>

              <DialogActions sx={{ mt: 2 }}>
                <Button type='button' variant='outlined' onClick={() => setShowDialog(false)}>
                  取消
                </Button>
                <Button type='submit' variant='contained' startIcon={<Save size={16} />}>
                  保存
                </Button>
              </DialogActions>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)} maxWidth='md'>
        <DialogTitle>{activeTab === 0 ? '会计科目' : '期初余额'}详情</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  gap: 2,
                }}
              >
                {activeTab === 0 ? (
                  <>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>科目编码</InputLabel>
                      <Box sx={{ fontWeight: 500 }}>
                        {(selectedItem as AccountingSubject).code || '-'}
                      </Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>科目名称</InputLabel>
                      <Box sx={{ fontWeight: 500 }}>
                        {(selectedItem as AccountingSubject).name || '-'}
                      </Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>科目类型</InputLabel>
                      <Box>
                        {getTypeBadge((selectedItem as AccountingSubject).category || '')}
                      </Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>级别</InputLabel>
                      <Box>{(selectedItem as AccountingSubject).level || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>现金流</InputLabel>
                      <Box>{(selectedItem as AccountingSubject).is_cash_flow ? '是' : '否'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>状态</InputLabel>
                      <Box>{getTypeBadge((selectedItem as AccountingSubject).status)}</Box>
                    </Box>
                    {(selectedItem as AccountingSubject).description && (
                      <Box sx={{ gridColumn: '1 / -1' }}>
                        <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>描述</InputLabel>
                        <Box>{(selectedItem as AccountingSubject).description}</Box>
                      </Box>
                    )}
                  </>
                ) : (
                  <>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>科目编码</InputLabel>
                      <Box sx={{ fontWeight: 500 }}>
                        {(selectedItem as OpeningBalance).subject_code || '-'}
                      </Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>科目名称</InputLabel>
                      <Box sx={{ fontWeight: 500 }}>
                        {(selectedItem as OpeningBalance).subject_name || '-'}
                      </Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>期间</InputLabel>
                      <Box>{(selectedItem as OpeningBalance).period || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>公司ID</InputLabel>
                      <Box>{(selectedItem as OpeningBalance).company_id || '-'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>借方余额</InputLabel>
                      <Box>¥{(selectedItem as OpeningBalance).debit_balance?.toFixed(2) || '0.00'}</Box>
                    </Box>
                    <Box>
                      <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>贷方余额</InputLabel>
                      <Box>¥{(selectedItem as OpeningBalance).credit_balance?.toFixed(2) || '0.00'}</Box>
                    </Box>
                  </>
                )}
                <Box>
                  <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>创建时间</InputLabel>
                  <Box component='span'>
                    {new Date(selectedItem.created_at).toLocaleString('zh-CN')}
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetailDialog(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default AccountingManagementPage;
