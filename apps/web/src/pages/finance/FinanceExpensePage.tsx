import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  ChevronLeft,
  Plus,
  Edit,
  Trash2,
  Check,
  Clock,
  AlertCircle,
  Send,
  DollarSign,
  Calendar,
  User,
  RefreshCw,
  XCircle,
  FolderOpen,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { financeApi, accountApi, voucherApi, receivablePayableApi } from '@/api/finance';
import type { Account } from '@/types/finance';
import { useAppStore } from '../../store';
import type { ColumnDef } from '@tanstack/react-table';
import { ListPageTemplate, type ColumnDef as ListColumnDef } from '@/components/mui';
import type { StatCard } from '@/components/templates/DashboardTemplate';
import type { OrganizationFilterValue } from '@/components/ui/OrganizationFilter';
import OrganizationFilter from '@/components/ui/OrganizationFilter';
import { StatsChart } from '@/components/bi/StatsChart';
import { apiLogger } from '@/utils/logger';

import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Button } from '@mui/material';
import { ModeToggle } from '@/components/ModeToggle';
import { DashboardTemplate } from '@/components/templates/DashboardTemplate';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { StatusBadge } from '@/components/common/StatusBadge';

const FinanceExpensePage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);

  const [expenses, setExpenses] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Account | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<OrganizationFilterValue>({
    companyId: undefined,
    departmentId: undefined,
    employeeId: undefined,
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  const [newExpense, setNewExpense] = useState<Partial<Account>>({
    code: '',
    name: '',
    category: 'expense',
    balance_direction: 'debit',
    level: 1,
    status: 'active',
    description: '',
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await financeApi.account.list({
        category: 'expense',
        keyword: filterType || undefined,
        status: filterStatus || undefined,
      });

      if (response.success && response.data) {
        setExpenses(response.data.items || []);
      }
    } catch (err: unknown) {
      apiLogger.error('加载费用数据失败:', err);
      addNotification({
        title: '加载失败',
        message: (err as { message?: string }).message || '加载数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await financeApi.account.create(newExpense);

      if (res.success) {
        addNotification({
          title: '成功',
          message: '费用科目创建成功',
          type: 'success',
        });
        setShowCreateModal(false);
        setNewExpense({
          code: '',
          name: '',
          category: 'expense',
          balance_direction: 'debit',
          level: 1,
          status: 'active',
          description: '',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: (res as unknown as { error?: { message?: string } }).error?.message || '创建失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('创建费用科目失败:', err);
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '创建失败',
        type: 'error',
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingExpense) return;

    try {
      const res = await financeApi.account.update(editingExpense.id, editingExpense);

      if (res.success) {
        addNotification({
          title: '成功',
          message: '费用科目更新成功',
          type: 'success',
        });
        setEditingExpense(null);
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: (res as unknown as { error?: { message?: string } }).error?.message || '更新失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('更新费用科目失败:', err);
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '更新失败',
        type: 'error',
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      const res = await financeApi.account.delete(deletingId);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '费用科目删除成功',
          type: 'success',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: (res as unknown as { error?: { message?: string } }).error?.message || '删除失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('删除费用科目失败:', err);
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '删除失败',
        type: 'error',
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const handleApprove = async (expense: Account) => {
    try {
      const res = await financeApi.account.update(expense.id, {
        status: 'active',
      });

      if (res.success) {
        addNotification({
          title: '成功',
          message: '科目已启用',
          type: 'success',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: (res as unknown as { error?: { message?: string } }).error?.message || '操作失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      apiLogger.error('启用科目失败:', err);
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '操作失败',
        type: 'error',
      });
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;

    try {
      const promises = selectedIds.map((id) => financeApi.account.update(id, { status: 'active' }));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount === selectedIds.length) {
        addNotification({
          title: '成功',
          message: `批量启用成功，共 ${successCount} 条记录`,
          type: 'success',
        });
      } else {
        addNotification({
          title: '部分成功',
          message: `成功启用 ${successCount} 条，失败 ${selectedIds.length - successCount} 条`,
          type: 'warning',
        });
      }

      setSelectedIds([]);
      loadData();
    } catch (err: unknown) {
      apiLogger.error('批量启用科目失败:', err);
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '批量启用失败',
        type: 'error',
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      const promises = selectedIds.map((id) => financeApi.account.delete(id));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount === selectedIds.length) {
        addNotification({
          title: '成功',
          message: `批量删除成功，共 ${successCount} 条记录`,
          type: 'success',
        });
      } else {
        addNotification({
          title: '部分成功',
          message: `成功删除 ${successCount} 条，失败 ${selectedIds.length - successCount} 条`,
          type: 'warning',
        });
      }

      setSelectedIds([]);
      loadData();
    } catch (err: unknown) {
      apiLogger.error('批量删除科目失败:', err);
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '批量删除失败',
        type: 'error',
      });
    } finally {
      setBatchDeleteDialogOpen(false);
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.length === 0) return;

    try {
      const promises = selectedIds.map((id) => financeApi.account.update(id, { status: 'disabled' }));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount === selectedIds.length) {
        addNotification({
          title: '成功',
          message: `批量停用成功，共 ${successCount} 条记录`,
          type: 'success',
        });
      } else {
        addNotification({
          title: '部分成功',
          message: `成功停用 ${successCount} 条，失败 ${selectedIds.length - successCount} 条`,
          type: 'warning',
        });
      }

      setSelectedIds([]);
      loadData();
    } catch (err: unknown) {
      apiLogger.error('批量停用科目失败:', err);
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '批量停用失败',
        type: 'error',
      });
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (filterStatus && e.status !== filterStatus) return false;
      return true;
    });
  }, [expenses, filterStatus, filterType]);

  const advancedFilters = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { value: 'active', label: '启用' },
          { value: 'disabled', label: '停用' },
        ],
        value: filterStatus,
        onChange: setFilterStatus,
      },
    ],
    [filterStatus, filterType]
  );

  const columns = useMemo<ListColumnDef<Account>[]>(
    () => [
      {
        id: 'code',
        label: '科目编码',
        render: (row) => (
          <Box sx={{ fontWeight: 500, color: 'primary.main' }}>{row.code}</Box>
        ),
      },
      {
        id: 'name',
        label: '科目名称',
        render: (row) => (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: 'text.primary',
            }}
          >
            <User sx={{ width: 16, height: 16, mr: 1, color: 'primary.main' }} />
            {row.name}
          </Box>
        ),
      },
      {
        id: 'category',
        label: '科目类别',
        render: (row) => (
          <Box sx={{ color: 'text.primary' }}>费用类</Box>
        ),
      },
      {
        id: 'balance_direction',
        label: '余额方向',
        render: (row) => (
          <Box sx={{ color: 'text.primary' }}>{row.balance_direction === 'debit' ? '借方' : '贷方'}</Box>
        ),
      },
      {
        id: 'level',
        label: '层级',
        render: (row) => (
          <Box sx={{ fontWeight: 700, color: 'success.main' }}>{row.level}</Box>
        ),
      },
      {
        id: 'has_children',
        label: '有下级',
        render: (row) => (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: 'text.secondary',
              fontSize: '0.875rem',
            }}
          >
            {row.has_children ? '是' : '否'}
          </Box>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => (
          <StatusBadge
            status={row.status === 'active' ? 'active' : 'inactive'}
            showIcon
          />
        ),
      },
      {
        id: 'actions',
        label: '操作',
        render: (row) => {
          const expense = row;
          return (
            <Stack
              direction='row'
              spacing={1}
            >
              {expense.status === 'disabled' && (
                <Tooltip title='启用'>
                  <IconButton
                    size='small'
                    color='success'
                    onClick={() => handleApprove(expense)}
                  >
                    <Check sx={{ width: 16, height: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title='编辑'>
                <IconButton
                  size='small'
                  onClick={() => setEditingExpense(expense)}
                >
                  <Edit sx={{ width: 16, height: 16 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title='删除'>
                <IconButton
                  size='small'
                  color='error'
                  onClick={() => {
                    setDeletingId(expense.id);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 sx={{ width: 16, height: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          );
        },
      },
    ],
    []
  );

  const activeCount = expenses.filter((e) => e.status === 'active').length;
  const disabledCount = expenses.filter((e) => e.status === 'disabled').length;
  const hasChildrenCount = expenses.filter((e) => e.has_children).length;
  const leafCount = expenses.filter((e) => !e.has_children).length;

  const expenseStatusData = useMemo(
    () => [
      { name: '启用', value: activeCount, color: 'success.main' },
      { name: '停用', value: disabledCount, color: 'error.main' },
    ],
    [activeCount, disabledCount]
  );

  const expenseTypeData = useMemo(
    () => [
      {
        name: '上级科目',
        value: hasChildrenCount,
        color: 'primary.main',
      },
      {
        name: '明细科目',
        value: leafCount,
        color: 'success.dark',
      },
    ],
    [expenses, hasChildrenCount, leafCount]
  );

  const statsCards: StatCard[] = [
    {
      id: 'active',
      title: '启用',
      value: activeCount,
      color: 'success',
      icon: <Check size={20} />,
    },
    {
      id: 'disabled',
      title: '停用',
      value: disabledCount,
      color: 'error',
      icon: <XCircle size={20} />,
    },
    {
      id: 'has_children',
      title: '上级科目',
      value: hasChildrenCount,
      color: 'primary',
      icon: <FolderOpen size={20} />,
    },
    {
      id: 'total',
      title: '费用科目总数',
      value: expenses.length,
      color: 'secondary',
      icon: <FileText size={20} />,
    },
  ];

  const listTemplateColumns = useMemo(() => {
    return columns.map((col) => ({
      id: col.id,
      label: col.label,
      render: col.render,
      align: col.align as 'left' | 'center' | 'right' | undefined,
      sortable: col.sortable,
      width: col.width,
      minWidth: col.minWidth,
    }));
  }, [columns]);

  return (
    <DashboardTemplate
      title='费用科目'
      subtitle='管理费用类会计科目，维护科目结构'
      stats={statsCards}
      onRefresh={loadData}
      headerContent={
        <Stack
          direction='row'
          spacing={1}
        >
          <ModeToggle />
          <Button
            variant='contained'
            startIcon={<Plus sx={{ width: 20, height: 20 }} />}
            onClick={() => setShowCreateModal(true)}
          >
            新增科目
          </Button>
        </Stack>
      }
      chartsArea={
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(1, 1fr)', lg: 'repeat(2, 1fr)' },
            gap: 3,
            mb: 3,
          }}
        >
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 1.5,
              boxShadow: 1,
              p: 3,
            }}
          >
            <Typography
              variant='h6'
              sx={{ mb: 2, fontWeight: 600 }}
            >
              科目状态分布
            </Typography>
            <StatsChart
              type='pie'
              data={expenseStatusData}
              height={250}
            />
          </Box>

          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 1.5,
              boxShadow: 1,
              p: 3,
            }}
          >
            <Typography
              variant='h6'
              sx={{ mb: 2, fontWeight: 600 }}
            >
              科目层级分布
            </Typography>
            <StatsChart
              type='bar'
              data={expenseTypeData}
              height={250}
            />
          </Box>
        </Box>
      }
      charts={[]}
    >
      <Stack
        sx={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
        spacing={2}
      >
        <OrganizationFilter
          value={organizationFilter}
          onChange={setOrganizationFilter}
          showCompany={true}
          showDepartment={true}
          showEmployee={true}
        />
        <Button
          variant='outlined'
          size='small'
          startIcon={<RefreshCw sx={{ width: 16, height: 16 }} />}
          onClick={loadData}
        >
          刷新
        </Button>
      </Stack>

      {selectedIds.length > 0 && (
        <Card sx={{ mb: 2, bgcolor: 'action.selected' }}>
          <CardContent>
            <Stack
              direction='row'
              sx={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography
                variant='body2'
                color='primary'
              >
                已选择{' '}
                <Box component='span' sx={{ fontWeight: 600 }}>{selectedIds.length}</Box>{' '}
                条记录
              </Typography>
              <Stack
                direction='row'
                spacing={1}
              >
                <Button
                  variant='outlined'
                  size='small'
                  color='success'
                  startIcon={<Check sx={{ width: 16, height: 16 }} />}
                  onClick={handleBatchApprove}
                >
                  批量启用
                </Button>
                <Button
                  variant='outlined'
                  size='small'
                  color='warning'
                  startIcon={<AlertCircle sx={{ width: 16, height: 16 }} />}
                  onClick={handleBatchReject}
                >
                  批量停用
                </Button>
                <Button
                  variant='outlined'
                  size='small'
                  color='error'
                  startIcon={<Trash2 sx={{ width: 16, height: 16 }} />}
                  onClick={() => setBatchDeleteDialogOpen(true)}
                >
                  批量删除
                </Button>
                <Button
                  variant='outlined'
                  size='small'
                  onClick={() => setSelectedIds([])}
                >
                  取消选择
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      <ListPageTemplate
        columns={listTemplateColumns}
        data={filteredExpenses}
        loading={loading}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids as string[])}
        getRowId={(row) => row.id}
        searchable
        searchPlaceholder='搜索科目编码、科目名称...'
        filters={advancedFilters}
        onFilterChange={(filters) => {
          if (filters.status) setFilterStatus(filters.status);
          if (filters.expense_type) setFilterType(filters.expense_type);
        }}
        onRefresh={loadData}
        batchActions={[
          {
            label: '批量启用',
            icon: <Check size={16} />,
            color: 'success',
            onClick: handleBatchApprove,
          },
          {
            label: '批量停用',
            icon: <AlertCircle size={16} />,
            color: 'warning',
            onClick: handleBatchReject,
          },
          {
            label: '批量删除',
            icon: <Trash2 size={16} />,
            color: 'error',
            confirm: true,
            confirmMessage: `确定要删除选中的 ${selectedIds.length} 条科目记录吗？`,
            onClick: () => setBatchDeleteDialogOpen(true),
          },
        ]}
      />

      {/* Create Dialog */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新建费用科目</DialogTitle>
        <DialogContent>
          <Stack
            spacing={3}
            sx={{ pt: 2 }}
          >
            <Stack
              direction='row'
              spacing={2}
            >
              <TextField
                label='科目编码 *'
                required
                fullWidth
                value={newExpense.code}
                onChange={(e) =>
                  setNewExpense({
                    ...newExpense,
                    code: e.target.value,
                  })
                }
                placeholder='请输入科目编码'
              />
              <TextField
                label='科目名称 *'
                required
                fullWidth
                value={newExpense.name}
                onChange={(e) =>
                  setNewExpense({
                    ...newExpense,
                    name: e.target.value,
                  })
                }
                placeholder='请输入科目名称'
              />
            </Stack>

            <Stack
              direction='row'
              spacing={2}
            >
              <FormControl fullWidth>
                <InputLabel>余额方向</InputLabel>
                <Select
                  value={newExpense.balance_direction}
                  label='余额方向'
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      balance_direction: e.target.value as 'debit' | 'credit',
                    })
                  }
                >
                  <MenuItem value='debit'>借方</MenuItem>
                  <MenuItem value='credit'>贷方</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>层级</InputLabel>
                <Select
                  value={newExpense.level}
                  label='层级'
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      level: Number(e.target.value) || 1,
                    })
                  }
                >
                  <MenuItem value={1}>1级</MenuItem>
                  <MenuItem value={2}>2级</MenuItem>
                  <MenuItem value={3}>3级</MenuItem>
                  <MenuItem value={4}>4级</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <TextField
              label='科目描述'
              fullWidth
              multiline
              rows={3}
              value={newExpense.description || ''}
              onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
              placeholder='请输入科目描述...'
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCreateModal(false)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleCreate}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>编辑费用科目</DialogTitle>
        <DialogContent>
          {editingExpense && (
            <Stack
              spacing={3}
              sx={{ pt: 2 }}
            >
              <Stack
                direction='row'
                spacing={2}
              >
                <TextField
                  label='科目编码'
                  fullWidth
                  value={editingExpense.code}
                  slotProps={{ input: { readOnly: true } }}
                />
                <TextField
                  label='科目名称'
                  fullWidth
                  value={editingExpense.name}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      name: e.target.value,
                    })
                  }
                />
              </Stack>

              <Stack
                direction='row'
                spacing={2}
              >
                <FormControl fullWidth>
                  <InputLabel>余额方向</InputLabel>
                  <Select
                    value={editingExpense.balance_direction}
                    label='余额方向'
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        balance_direction: e.target.value as 'debit' | 'credit',
                      })
                    }
                  >
                    <MenuItem value='debit'>借方</MenuItem>
                    <MenuItem value='credit'>贷方</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={editingExpense.status}
                    label='状态'
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        status: e.target.value as 'active' | 'disabled',
                      })
                    }
                  >
                    <MenuItem value='active'>启用</MenuItem>
                    <MenuItem value='disabled'>停用</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <TextField
                label='科目描述'
                fullWidth
                multiline
                rows={3}
                value={editingExpense.description || ''}
                onChange={(e) =>
                  setEditingExpense({
                    ...editingExpense,
                    description: e.target.value,
                  })
                }
                placeholder='请输入科目描述...'
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingExpense(null)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleUpdate}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeletingId(null);
        }}
        onConfirm={handleDelete}
        title='确认删除'
        message='确定要删除这条费用科目吗？'
        danger
      />

      <ConfirmDialog
        isOpen={batchDeleteDialogOpen}
        onClose={() => setBatchDeleteDialogOpen(false)}
        onConfirm={handleBatchDelete}
        title='确认批量删除'
        message={`确定要删除选中的 ${selectedIds.length} 条费用科目吗？`}
        danger
      />
    </DashboardTemplate>
  );
};

export default FinanceExpensePage;