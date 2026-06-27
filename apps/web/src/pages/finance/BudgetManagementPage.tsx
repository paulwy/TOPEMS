import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  Settings,
} from 'lucide-react';
import { budgetApi, type Budget } from '@/api/erp';
import { BackButton, PageContainer } from '@/components/common';
import { departmentApi, type Department } from '@/api/hrm';
import { financeApi } from '@/api/finance';
import { apiLogger } from '@/utils/logger';
import { useAppStore } from '../../store';
import { ListPageTemplate, StatCardGroup } from '@/components/mui';
import type { ColumnDef, RowAction, BatchAction } from '@/components/mui';

import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormLabel,
  Chip,
  Box,
  Typography,
  Stack,
} from '@mui/material';
import { Button } from '@mui/material';
import { ModeToggle } from '@/components/theme/ModeToggle';
import OrganizationFilter, {
  type OrganizationFilterValue,
} from '@/components/ui/OrganizationFilter';

const BudgetManagementPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [organizationFilter, setOrganizationFilter] = useState<OrganizationFilterValue>({});
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [showBatchStatusModal, setShowBatchStatusModal] = useState(false);
  const [batchStatus, setBatchStatus] = useState<string>('');

  const handleBatchUpdateStatus = () => {
    setShowBatchStatusModal(true);
  };

  const confirmBatchUpdateStatus = async () => {
    if (selectedIds.length === 0 || !batchStatus) return;

    try {
      const promises = selectedIds.map((id) =>
        budgetApi.update(id as string, { status: batchStatus })
      );
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      addNotification({
        title: '批量更新成功',
        message: `成功更新 ${successCount} 条预算状态，失败 ${selectedIds.length - successCount} 条`,
        type: 'success',
      });

      setSelectedIds([]);
      setShowBatchStatusModal(false);
      setBatchStatus('');
      loadData();
    } catch (err: unknown) {
      addNotification({
        title: '批量更新失败',
        message: (err as { message?: string }).message || '批量更新状态失败',
        type: 'error',
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      const promises = selectedIds.map((id) => budgetApi.delete(id as string));
      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      addNotification({
        title: '批量删除成功',
        message: `成功删除 ${successCount} 条预算，失败 ${selectedIds.length - successCount} 条`,
        type: 'success',
      });

      setSelectedIds([]);
      loadData();
    } catch (err: unknown) {
      addNotification({
        title: '批量删除失败',
        message: (err as { message?: string }).message || '批量删除失败',
        type: 'error',
      });
    }
  };
  const [newBudget, setNewBudget] = useState({
    department_id: '',
    budget_type: '',
    fiscal_year: new Date().getFullYear().toString(),
    total_budget: 0,
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [budgetRes, deptRes, periodRes] = await Promise.all([
        budgetApi.list(),
        departmentApi.list(),
        financeApi.period.getCurrent(),
      ]);

      if (budgetRes.success && budgetRes.data) {
        setBudgets(budgetRes.data.items || []);
      }
      if (deptRes.success && deptRes.data) {
        setDepartments(deptRes.data.items || []);
      }
    } catch (err: unknown) {
      apiLogger.error('加载预算管理数据失败:', err);
      setError('加载数据失败');
      addNotification({
        title: '加载失败',
        message: (err as { message?: string }).message || '加载数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<
      string,
      { color: 'primary' | 'default' | 'error' | 'warning'; label: string }
    > = {
      active: { color: 'primary', label: '执行中' },
      frozen: { color: 'warning', label: '已冻结' },
      exhausted: { color: 'error', label: '已耗尽' },
    };

    const badgeConfig = config[status] || {
      color: 'default' as const,
      label: status,
    };
    return (
      <Chip
        size='small'
        label={badgeConfig.label}
        color={badgeConfig.color}
      />
    );
  };

  const getDepartmentName = (id: string) => {
    const dept = departments.find((d) => d.id === id);
    return dept?.name || '-';
  };

  const getBudgetTypeName = (type: string) => {
    const types: Record<string, string> = {
      office: '办公费',
      marketing: '市场费',
      development: '研发费',
      travel: '差旅费',
      training: '培训费',
      other: '其他',
    };
    return types[type] || type;
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 90) return 'error.main';
    if (rate >= 70) return 'warning.main';
    return 'primary.main';
  };

  const handleCreate = async () => {
    try {
      const res = await budgetApi.create({
        department_id: newBudget.department_id || undefined,
        budget_type: newBudget.budget_type || undefined,
        fiscal_year: newBudget.fiscal_year,
        total_budget: newBudget.total_budget,
      });

      if (res.success) {
        addNotification({
          title: '成功',
          message: '预算创建成功',
          type: 'success',
        });
        setShowCreateModal(false);
        setNewBudget({
          department_id: '',
          budget_type: '',
          fiscal_year: new Date().getFullYear().toString(),
          total_budget: 0,
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '创建失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '创建失败',
        type: 'error',
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingBudget) return;

    try {
      const res = await budgetApi.update(editingBudget.id, {
        department_id: editingBudget.department_id || undefined,
        budget_type: editingBudget.budget_type || undefined,
        fiscal_year: editingBudget.fiscal_year,
        total_budget: editingBudget.total_budget,
        used_amount: editingBudget.used_amount,
        status: editingBudget.status,
      });

      if (res.success) {
        addNotification({
          title: '成功',
          message: '预算更新成功',
          type: 'success',
        });
        setEditingBudget(null);
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '更新失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '更新失败',
        type: 'error',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条预算记录吗？')) return;

    try {
      const res = await budgetApi.delete(id);
      if (res.success) {
        addNotification({
          title: '成功',
          message: '预算删除成功',
          type: 'success',
        });
        loadData();
      } else {
        addNotification({
          title: '失败',
          message: res.message || '删除失败',
          type: 'error',
        });
      }
    } catch (err: unknown) {
      addNotification({
        title: '错误',
        message: (err as { message?: string }).message || '删除失败',
        type: 'error',
      });
    }
  };

  // 统计卡片数据
  const totalBudget = budgets.reduce((sum, b) => sum + b.total_budget, 0);
  const totalUsed = budgets.reduce((sum, b) => sum + (b.used_amount ?? 0), 0);
  const avgUsageRate =
    budgets.length > 0
      ? budgets.reduce((sum, b) => sum + (b.usage_rate ?? 0), 0) / budgets.length
      : 0;

  const statCards = useMemo(
    () => [
      {
        title: '总预算',
        value: `¥${totalBudget.toLocaleString()}`,
        icon: <DollarSign size={24} />,
        color: 'primary' as const,
      },
      {
        title: '已使用',
        value: `¥${totalUsed.toLocaleString()}`,
        icon: <TrendingUp size={24} />,
        color: 'success' as const,
      },
      {
        title: '平均使用率',
        value: `${avgUsageRate.toFixed(1)}%`,
        icon: <Calendar size={24} />,
        color: avgUsageRate > 80 ? ('error' as const) : ('warning' as const),
      },
    ],
    [totalBudget, totalUsed, avgUsageRate]
  );

  // 列定义
  const columns = useMemo<ColumnDef<Budget>[]>(
    () => [
      {
        id: 'department_id',
        label: '部门',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 500, color: 'grey.900' }}
          >
            {getDepartmentName(row.department_id || '')}
          </Typography>
        ),
      },
      {
        id: 'budget_type',
        label: '预算类型',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ color: 'grey.900' }}
          >
            {getBudgetTypeName(row.budget_type || '')}
          </Typography>
        ),
      },
      {
        id: 'fiscal_year',
        label: '财年',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ color: 'grey.900' }}
          >
            {row.fiscal_year}年
          </Typography>
        ),
      },
      {
        id: 'total_budget',
        label: '预算总额',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{ fontWeight: 700, color: 'primary.main' }}
          >
            ¥{row.total_budget.toLocaleString()}
          </Typography>
        ),
      },
      {
        id: 'usage',
        label: '使用进度',
        render: (row) => (
          <Box sx={{ width: '100%', maxWidth: 320 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography
                variant='body2'
                sx={{ fontSize: '0.75rem', color: 'grey.600' }}
              >
                已用: ¥{(row.used_amount ?? 0).toLocaleString()}
              </Typography>
              <Typography
                variant='body2'
                sx={{
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: (row.usage_rate ?? 0) > 80 ? 'error.main' : 'primary.main',
                }}
              >
                {(row.usage_rate ?? 0).toFixed(1)}%
              </Typography>
            </Box>
            <Box
              sx={{
                width: '100%',
                bgcolor: 'grey.200',
                borderRadius: 1,
                height: 8,
              }}
            >
              <Box
                sx={{
                  height: 8,
                  borderRadius: 1,
                  transition: 'width 0.3s',
                  width: `${Math.min(row.usage_rate ?? 0, 100)}%`,
                  bgcolor: getProgressColor(row.usage_rate ?? 0),
                }}
              />
            </Box>
          </Box>
        ),
      },
      {
        id: 'remaining_amount',
        label: '剩余',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{
              fontWeight: 700,
              color:
                (row.remaining_amount ?? 0) < row.total_budget * 0.2
                  ? 'error.main'
                  : 'success.main',
            }}
          >
            ¥{(row.remaining_amount ?? 0).toLocaleString()}
          </Typography>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row) => getStatusBadge(row.status),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [departments]
  );

  // 行操作
  const rowActions = useMemo<RowAction<Budget>[]>(
    () => [
      {
        label: '编辑',
        icon: <Edit sx={{ width: 16, height: 16 }} />,
        onClick: (row) => setEditingBudget(row),
      },
      {
        label: '删除',
        icon: <Trash2 sx={{ width: 16, height: 16 }} />,
        color: 'error',
        onClick: (row) => handleDelete(row.id),
        confirm: true,
        confirmMessage: '确定要删除这条预算记录吗？',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // 批量操作
  const batchActions = useMemo<BatchAction[]>(
    () => [
      {
        label: '批量更新状态',
        icon: <Settings sx={{ width: 16, height: 16 }} />,
        onClick: handleBatchUpdateStatus,
        showWhenSelected: true,
      },
      {
        label: '批量删除',
        icon: <Trash2 sx={{ width: 16, height: 16 }} />,
        color: 'error',
        onClick: handleBatchDelete,
        showWhenSelected: true,
        confirm: true,
        confirmMessage: '确定要删除选中的预算记录吗？',
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIds]
  );

  // 筛选器配置
  const filters = useMemo(
    () => [
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { value: '', label: '全部' },
          { value: 'active', label: '进行中' },
          { value: 'frozen', label: '已冻结' },
          { value: 'exhausted', label: '已耗尽' },
        ],
      },
      {
        id: 'budget_type',
        label: '预算类型',
        type: 'select' as const,
        options: [
          { value: '', label: '全部' },
          { value: 'office', label: '办公费' },
          { value: 'marketing', label: '市场费' },
          { value: 'development', label: '研发费' },
          { value: 'travel', label: '差旅费' },
          { value: 'training', label: '培训费' },
          { value: 'other', label: '其他' },
        ],
      },
    ],
    []
  );

  return (
    <PageContainer padding={false} maxWidth={false}>
      <Box
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <BackButton href='/dashboard' />
              <Box>
                <Typography
                  variant='h5'
                  sx={{
                    fontWeight: 700,
                    color: 'grey.900',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <TrendingUp
                    sx={{
                      width: 28,
                      height: 28,
                      mr: 1.5,
                      color: 'success.main',
                    }}
                  />
                  预算管理
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ mt: 0.5, color: 'grey.500' }}
                >
                  管理各部门预算，追踪预算使用情况
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ModeToggle />
              <Button
                variant='contained'
                onClick={() => setShowCreateModal(true)}
              >
                <Plus sx={{ width: 20, height: 20, mr: 1 }} />
                新增预算
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1280, mx: 'auto', px: 3, py: 3 }}>
        {/* 组织筛选 */}
        <Box sx={{ bgcolor: 'grey.200', borderRadius: 2, p: 2, mb: 3 }}>
          <OrganizationFilter
            value={organizationFilter}
            onChange={setOrganizationFilter}
            showCompany={true}
            showDepartment={true}
            showEmployee={false}
          />
        </Box>

        {/* 统计卡片 */}
        <Box sx={{ mb: 3 }}>
          <StatCardGroup
            stats={statCards}
            columns={3}
          />
        </Box>

        {/* 预算列表 */}
        <ListPageTemplate
          columns={columns}
          data={budgets}
          loading={loading}
          error={error}
          searchable
          searchPlaceholder='搜索预算...'
          filters={filters}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          rowActions={rowActions}
          batchActions={batchActions}
          showBatchActionBar
          onRefresh={loadData}
          emptyMessage='暂无预算数据'
        />
      </Box>

      {/* 创建预算弹窗 */}
      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新增预算</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
            <Box>
              <FormLabel htmlFor='department'>部门</FormLabel>
              <FormControl
                size='small'
                fullWidth
              >
                <Select
                  value={newBudget.department_id}
                  onChange={(e) =>
                    setNewBudget({
                      ...newBudget,
                      department_id: e.target.value,
                    })
                  }
                  displayEmpty
                >
                  <MenuItem
                    value=''
                    disabled
                  >
                    选择部门
                  </MenuItem>
                  {departments.map((dept) => (
                    <MenuItem
                      key={dept.id}
                      value={dept.id}
                    >
                      {dept.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box>
              <FormLabel htmlFor='type'>预算类型</FormLabel>
              <FormControl
                size='small'
                fullWidth
              >
                <Select
                  value={newBudget.budget_type}
                  onChange={(e) => setNewBudget({ ...newBudget, budget_type: e.target.value })}
                  displayEmpty
                >
                  <MenuItem
                    value=''
                    disabled
                  >
                    选择类型
                  </MenuItem>
                  <MenuItem value='office'>办公费</MenuItem>
                  <MenuItem value='marketing'>市场费</MenuItem>
                  <MenuItem value='development'>研发费</MenuItem>
                  <MenuItem value='travel'>差旅费</MenuItem>
                  <MenuItem value='training'>培训费</MenuItem>
                  <MenuItem value='other'>其他</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box>
              <FormLabel htmlFor='year'>财年</FormLabel>
              <TextField
                id='year'
                size='small'
                fullWidth
                type='text'
                value={newBudget.fiscal_year}
                onChange={(e) => setNewBudget({ ...newBudget, fiscal_year: e.target.value })}
                placeholder='例如: 2024'
              />
            </Box>

            <Box>
              <FormLabel htmlFor='amount'>预算金额</FormLabel>
              <TextField
                id='amount'
                size='small'
                fullWidth
                type='number'
                value={newBudget.total_budget}
                onChange={(e) =>
                  setNewBudget({
                    ...newBudget,
                    total_budget: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder='输入预算金额'
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setShowCreateModal(false)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleCreate}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 编辑预算弹窗 */}
      <Dialog
        open={!!editingBudget}
        onClose={() => setEditingBudget(null)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>编辑预算</DialogTitle>
        <DialogContent>
          {editingBudget && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
              <Box>
                <FormLabel htmlFor='edit-department'>部门</FormLabel>
                <FormControl
                  size='small'
                  fullWidth
                >
                  <Select
                    value={editingBudget.department_id || ''}
                    onChange={(e) =>
                      setEditingBudget({
                        ...editingBudget,
                        department_id: e.target.value || undefined,
                      })
                    }
                    displayEmpty
                  >
                    <MenuItem
                      value=''
                      disabled
                    >
                      选择部门
                    </MenuItem>
                    {departments.map((dept) => (
                      <MenuItem
                        key={dept.id}
                        value={dept.id}
                      >
                        {dept.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <FormLabel htmlFor='edit-type'>预算类型</FormLabel>
                <FormControl
                  size='small'
                  fullWidth
                >
                  <Select
                    value={editingBudget.budget_type || ''}
                    onChange={(e) =>
                      setEditingBudget({
                        ...editingBudget,
                        budget_type: e.target.value || undefined,
                      })
                    }
                    displayEmpty
                  >
                    <MenuItem
                      value=''
                      disabled
                    >
                      选择类型
                    </MenuItem>
                    <MenuItem value='office'>办公费</MenuItem>
                    <MenuItem value='marketing'>市场费</MenuItem>
                    <MenuItem value='development'>研发费</MenuItem>
                    <MenuItem value='travel'>差旅费</MenuItem>
                    <MenuItem value='training'>培训费</MenuItem>
                    <MenuItem value='other'>其他</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <FormLabel htmlFor='edit-year'>财年</FormLabel>
                <TextField
                  id='edit-year'
                  size='small'
                  fullWidth
                  type='text'
                  value={editingBudget.fiscal_year}
                  onChange={(e) =>
                    setEditingBudget({
                      ...editingBudget,
                      fiscal_year: e.target.value,
                    })
                  }
                />
              </Box>

              <Box>
                <FormLabel htmlFor='edit-total'>预算总额</FormLabel>
                <TextField
                  id='edit-total'
                  size='small'
                  fullWidth
                  type='number'
                  value={editingBudget.total_budget}
                  onChange={(e) =>
                    setEditingBudget({
                      ...editingBudget,
                      total_budget: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Box>

              <Box>
                <FormLabel htmlFor='edit-used'>已使用金额</FormLabel>
                <TextField
                  id='edit-used'
                  size='small'
                  fullWidth
                  type='number'
                  value={editingBudget.used_amount}
                  onChange={(e) =>
                    setEditingBudget({
                      ...editingBudget,
                      used_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Box>

              <Box>
                <FormLabel htmlFor='edit-status'>状态</FormLabel>
                <FormControl
                  size='small'
                  fullWidth
                >
                  <Select
                    value={editingBudget.status}
                    onChange={(e) =>
                      setEditingBudget({
                        ...editingBudget,
                        status: e.target.value,
                      })
                    }
                  >
                    <MenuItem value='active'>执行中</MenuItem>
                    <MenuItem value='frozen'>已冻结</MenuItem>
                    <MenuItem value='exhausted'>已耗尽</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            onClick={() => setEditingBudget(null)}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={handleUpdate}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 批量更新状态弹窗 */}
      <Dialog
        open={showBatchStatusModal}
        onClose={() => setShowBatchStatusModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>批量更新状态</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <FormLabel htmlFor='batch_status'>选择新状态</FormLabel>
              <FormControl
                size='small'
                fullWidth
              >
                <Select
                  value={batchStatus}
                  onChange={(e) => setBatchStatus(e.target.value)}
                  displayEmpty
                >
                  <MenuItem
                    value=''
                    disabled
                  >
                    请选择状态
                  </MenuItem>
                  <MenuItem value='active'>进行中</MenuItem>
                  <MenuItem value='frozen'>已冻结</MenuItem>
                  <MenuItem value='exhausted'>已耗尽</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Typography
              variant='body2'
              sx={{ color: 'grey.500' }}
            >
              将批量更新{' '}
              <Box
                component='span'
                sx={{ fontWeight: 600 }}
              >
                {selectedIds.length}
              </Box>{' '}
              条预算的状态
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ mt: 2 }}>
          <Button
            variant='outlined'
            onClick={() => {
              setShowBatchStatusModal(false);
              setBatchStatus('');
            }}
          >
            取消
          </Button>
          <Button
            variant='contained'
            onClick={confirmBatchUpdateStatus}
            disabled={!batchStatus}
          >
            确认更新
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default BudgetManagementPage;
