import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Download,
  Calculator,
  AlertTriangle,
  Search,
  Package,
  CheckCircle,
  PauseCircle,
  XCircle,
  DollarSign,
} from 'lucide-react';
import { useAppStore } from '../../store';
import { DataExport, BackButton, PageContainer } from '@/components/common';
import { ListPageTemplate, StatCardGroup } from '@/components';
import { financeApi, accountApi } from '@/api/finance';
import type { Account } from '@/types/finance';
import { apiLogger } from '@/utils/logger';

import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Box as MuiBox,
  Typography,
  Stack,
  Tooltip,
  Button,
} from '@mui/material';
import { ConfirmDialog } from '@topems/shared-components';

const FinanceAssetPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [assetData, setAssetData] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDepreciationModal, setShowDepreciationModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Account | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Account | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [disablingAsset, setDisablingAsset] = useState<Account | null>(null);

  const [newAsset, setNewAsset] = useState<{
    code: string;
    name: string;
    category: 'asset' | 'liability' | 'equity' | 'cost' | 'expense' | 'income';
    balance_direction: 'debit' | 'credit';
    level: number;
    status: 'active' | 'disabled';
    description: string;
  }>({
    code: '',
    name: '',
    category: 'asset',
    balance_direction: 'debit',
    level: 1,
    status: 'active',
    description: '',
  });

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await financeApi.account.list({
        category: 'asset',
        keyword: searchQuery || undefined,
        status: filterStatus || undefined,
      });
      if (response.success && response.data) {
        setAssetData(response.data.items || []);
      }
    } catch (err: unknown) {
      apiLogger.error('加载资产数据失败:', err);
      setError('加载资产数据失败');
      addNotification({
        title: '错误',
        message: '加载资产数据失败',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return assetData.filter((asset) => {
      if (filterCategory && asset.category !== filterCategory) return false;
      if (filterStatus && asset.status !== filterStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !asset.code.toLowerCase().includes(query) &&
          !asset.name.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [assetData, filterCategory, filterStatus, searchQuery]);

  const statCards = useMemo(() => {
    const totalCount = assetData.length;
    const activeCount = assetData.filter((a) => a.status === 'active').length;
    const disabledCount = assetData.filter((a) => a.status === 'disabled').length;
    const hasChildrenCount = assetData.filter((a) => a.haschildren).length;
    const leafCount = assetData.filter((a) => !a.haschildren).length;

    return [
      {
        title: '资产科目总数',
        value: totalCount,
        icon: <Package size={24} />,
        color: 'primary' as const,
      },
      {
        title: '启用',
        value: activeCount,
        icon: <CheckCircle size={24} />,
        color: 'success' as const,
      },
      {
        title: '停用',
        value: disabledCount,
        icon: <XCircle size={24} />,
        color: 'error' as const,
      },
      {
        title: '上级科目',
        value: hasChildrenCount,
        icon: <PauseCircle size={24} />,
        color: 'warning' as const,
      },
      {
        title: '明细科目',
        value: leafCount,
        icon: <DollarSign size={24} />,
        color: 'secondary' as const,
      },
      {
        title: '层级深度',
        value: Math.max(...assetData.map((a) => a.level), 0),
        icon: <DollarSign size={24} />,
        color: 'info' as const,
      },
    ];
  }, [assetData]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      active: 'success',
      disabled: 'error',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: '启用',
      disabled: '停用',
    };
    return labels[status] || status;
  };

  const handleCreate = async () => {
    try {
      const response = await financeApi.account.create(newAsset);
      if (response.success) {
        addNotification({
          title: '成功',
          message: '资产科目新增成功',
          type: 'success',
        });
        setShowCreateModal(false);
        setNewAsset({
          code: '',
          name: '',
          category: 'asset' as const,
          balance_direction: 'debit' as const,
          level: 1,
          status: 'active' as const,
          description: '',
        });
        loadAssets();
      }
    } catch (err: unknown) {
      apiLogger.error('创建资产科目失败:', err);
      addNotification({
        title: '错误',
        message: '创建资产科目失败',
        type: 'error',
      });
    }
  };

  const handleEdit = (asset: Account) => {
    setEditingAsset({ ...asset });
  };

  const handleUpdate = async () => {
    if (!editingAsset) return;
    try {
      const response = await financeApi.account.update(editingAsset.id, editingAsset);
      if (response.success) {
        addNotification({
          title: '成功',
          message: '资产科目更新成功',
          type: 'success',
        });
        setEditingAsset(null);
        loadAssets();
      }
    } catch (err: unknown) {
      apiLogger.error('更新资产科目失败:', err);
      addNotification({
        title: '错误',
        message: '更新资产科目失败',
        type: 'error',
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const response = await financeApi.account.delete(deletingId);
    if (response.success) {
      addNotification({
        title: '成功',
        message: '资产科目删除成功',
        type: 'success',
      });
      loadAssets();
    } else {
      throw new Error('删除资产科目失败');
    }
  };

  const handleDisableClick = (asset: Account) => {
    setDisablingAsset(asset);
    setDisableDialogOpen(true);
  };

  const handleDisable = async () => {
    if (!disablingAsset) return;
    const response = await financeApi.account.update(disablingAsset.id, {
      ...disablingAsset,
      status: 'disabled',
    });
    if (response.success) {
      addNotification({
        title: '成功',
        message: `科目 "${disablingAsset.name}" 已停用`,
        type: 'success',
      });
      loadAssets();
    } else {
      throw new Error('停用科目失败');
    }
  };

  const handleDepreciation = (asset: Account) => {
    setSelectedAsset(asset);
    setShowDepreciationModal(true);
  };

  const confirmDepreciation = async () => {
    if (!selectedAsset) return;
    try {
      const currentPeriod = new Date().toISOString().slice(0, 7);
      const response = await financeApi.voucher.create({
        voucher_date: new Date().toISOString().split('T')[0],
        period: currentPeriod,
        summary: `计提折旧 - ${selectedAsset.name}`,
        entries: [
          {
            account_id: '1602',
            subject_code: '1602',
            subject_name: '累计折旧',
            debit_amount: 1000,
            summary: `计提折旧`,
          },
          {
            account_id: selectedAsset.id,
            subject_code: selectedAsset.code || '',
            subject_name: selectedAsset.name || '',
            credit_amount: 1000,
            summary: `累计折旧`,
          },
        ],
      });
      if (response.success) {
        addNotification({
          title: '成功',
          message: '计提折旧凭证创建完成',
          type: 'success',
        });
        loadAssets();
      }
    } catch (err: unknown) {
      apiLogger.error('计提折旧失败:', err);
      addNotification({
        title: '错误',
        message: '计提折旧失败',
        type: 'error',
      });
    } finally {
      setShowDepreciationModal(false);
    }
  };

  const handleScrap = (asset: Account) => {
    handleDisableClick(asset);
  };

  const handleExport = () => {
    addNotification({
      title: '导出成功',
      message: '资产数据已导出',
      type: 'success',
    });
  };

  const columns = useMemo(
    () => [
      {
        id: 'code',
        label: '科目编码',
        render: (row: Account) => (
          <MuiBox sx={{ fontWeight: 600, color: 'success.main' }}>{row.code}</MuiBox>
        ),
      },
      {
        id: 'name',
        label: '科目名称',
        render: (row: Account) => <MuiBox sx={{ fontWeight: 500 }}>{row.name}</MuiBox>,
      },
      {
        id: 'category',
        label: '科目类别',
        render: (row: Account) => (
          <Chip
            label={row.category === 'asset' ? '资产类' : row.category}
            size='small'
          />
        ),
      },
      {
        id: 'balance_direction',
        label: '余额方向',
        render: (row: Account) => (
          <MuiBox sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
            {row.balance_direction === 'debit' ? '借方' : '贷方'}
          </MuiBox>
        ),
      },
      {
        id: 'level',
        label: '层级',
        render: (row: Account) => (
          <MuiBox sx={{ color: 'warning.main', fontFamily: 'monospace' }}>{row.level}</MuiBox>
        ),
      },
      {
        id: 'haschildren',
        label: '是否有下级',
        render: (row: Account) => (
          <MuiBox
            sx={{
              fontWeight: 700,
              color: row.haschildren ? 'success.main' : 'text.secondary',
            }}
          >
            {row.haschildren ? '是' : '否'}
          </MuiBox>
        ),
      },
      {
        id: 'status',
        label: '状态',
        render: (row: Account) => (
          <Chip
            label={getStatusLabel(row.status)}
            size='small'
            color={getStatusColor(row.status)}
          />
        ),
      },
    ],
    []
  );

  const rowActions = useMemo(
    () => [
      {
        label: '计提折旧',
        icon: <Calculator sx={{ width: 16, height: 16 }} />,
        color: 'success' as const,
        onClick: (row: Account) => handleDepreciation(row),
      },
      {
        label: '编辑',
        icon: <Edit sx={{ width: 16, height: 16 }} />,
        onClick: (row: Account) => handleEdit(row),
      },
      {
        label: '停用',
        icon: <AlertTriangle sx={{ width: 16, height: 16 }} />,
        color: 'warning' as const,
        onClick: (row: Account) => handleScrap(row),
      },
      {
        label: '删除',
        icon: <Trash2 sx={{ width: 16, height: 16 }} />,
        color: 'error' as const,
        onClick: (row: Account) => handleDeleteClick(row.id),
      },
    ],
    []
  );

  const advancedFilters = useMemo(
    () => [
      {
        id: 'category',
        label: '科目类别',
        type: 'select' as const,
        options: [{ value: 'asset', label: '资产类' }],
        value: filterCategory,
        onChange: (value: unknown) => setFilterCategory(value as string),
      },
      {
        id: 'status',
        label: '状态',
        type: 'select' as const,
        options: [
          { value: 'active', label: '启用' },
          { value: 'disabled', label: '停用' },
        ],
        value: filterStatus,
        onChange: (value: unknown) => setFilterStatus(value as string),
      },
    ],
    [filterCategory, filterStatus]
  );

  const exportFields = useMemo(
    () => [
      { key: 'code', title: '科目编码' },
      { key: 'name', title: '科目名称' },
      { key: 'category', title: '科目类别' },
      { key: 'balance_direction', title: '余额方向' },
      { key: 'level', title: '层级' },
      { key: 'haschildren', title: '是否有下级' },
      { key: 'status', title: '状态' },
    ],
    []
  );

  return (
    <PageContainer
      padding={false}
      maxWidth={false}
    >
      <MuiBox
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 'sm',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <MuiBox
          sx={{
            maxWidth: 1280,
            mx: 'auto',
            px: { xs: 2, sm: 3, lg: 4 },
            py: 3,
          }}
        >
          <Stack
            direction='row'
            sx={{ justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Stack
              direction='row'
              sx={{ alignItems: 'center' }}
              spacing={2}
            >
              <BackButton href='/finance/dashboard' />
              <MuiBox>
                <Typography
                  variant='h5'
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: 700,
                  }}
                >
                  <MuiBox
                    component='span'
                    sx={{
                      width: 28,
                      height: 28,
                      mr: 1.5,
                      color: 'success.main',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Calculator size={28} />
                  </MuiBox>
                  资产管理
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  管理企业固定资产，计提折旧和处理报废
                </Typography>
              </MuiBox>
            </Stack>
            <Stack
              direction='row'
              spacing={1}
            >
              <Button
                variant='outlined'
                startIcon={<Download sx={{ width: 20, height: 20 }} />}
                onClick={handleExport}
              >
                导出
              </Button>
              <DataExport
                data={assetData as unknown as Record<string, unknown>[]}
                fields={exportFields}
                defaultFileName='资产数据'
                buttonText='数据导出'
              />
              <Button
                variant='contained'
                startIcon={<Plus sx={{ width: 20, height: 20 }} />}
                onClick={() => setShowCreateModal(true)}
              >
                新增资产
              </Button>
            </Stack>
          </Stack>
        </MuiBox>
      </MuiBox>

      <MuiBox sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}>
        <StatCardGroup
          stats={statCards}
          columns={6}
        />

        <ListPageTemplate
          columns={columns}
          data={filteredData}
          loading={loading}
          error={error}
          searchable
          searchPlaceholder='搜索资产编号、名称...'
          searchValue={searchQuery}
          onSearch={setSearchQuery}
          filters={advancedFilters}
          filtersValue={{
            asset_category: filterCategory,
            status: filterStatus,
          }}
          onFilterChange={(filters) => {
            if (filters.asset_category !== undefined)
              setFilterCategory(filters.asset_category as string);
            if (filters.status !== undefined) setFilterStatus(filters.status as string);
          }}
          rowActions={rowActions}
          onRefresh={loadAssets}
        />
      </MuiBox>

      <Dialog
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>新增资产科目</DialogTitle>
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
                fullWidth
                required
                value={newAsset.code}
                onChange={(e) => setNewAsset({ ...newAsset, code: e.target.value })}
              />
              <TextField
                label='科目名称 *'
                fullWidth
                required
                value={newAsset.name}
                onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
              />
            </Stack>
            <Stack
              direction='row'
              spacing={2}
            >
              <FormControl fullWidth>
                <InputLabel>余额方向</InputLabel>
                <Select
                  value={newAsset.balance_direction}
                  label='余额方向'
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
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
                  value={newAsset.level}
                  label='层级'
                  onChange={(e) =>
                    setNewAsset({
                      ...newAsset,
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
              value={newAsset.description || ''}
              onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
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

      <Dialog
        open={!!editingAsset}
        onClose={() => setEditingAsset(null)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>编辑资产科目</DialogTitle>
        <DialogContent>
          {editingAsset && (
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
                  value={editingAsset.code}
                  slotProps={{ input: { readOnly: true } }}
                />
                <TextField
                  label='科目名称'
                  fullWidth
                  value={editingAsset.name}
                  onChange={(e) =>
                    setEditingAsset({
                      ...editingAsset,
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
                    value={editingAsset.balance_direction}
                    label='余额方向'
                    onChange={(e) =>
                      setEditingAsset({
                        ...editingAsset,
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
                    value={editingAsset.status}
                    label='状态'
                    onChange={(e) =>
                      setEditingAsset({
                        ...editingAsset,
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
                value={editingAsset.description || ''}
                onChange={(e) =>
                  setEditingAsset({
                    ...editingAsset,
                    description: e.target.value,
                  })
                }
                placeholder='请输入科目描述...'
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingAsset(null)}>取消</Button>
          <Button
            variant='contained'
            onClick={handleUpdate}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showDepreciationModal}
        onClose={() => setShowDepreciationModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>计提折旧</DialogTitle>
        <DialogContent>
          {selectedAsset && (
            <Stack
              spacing={3}
              sx={{ pt: 2 }}
            >
              <MuiBox sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  科目名称
                </Typography>
                <Typography
                  variant='body1'
                  sx={{ fontWeight: 500 }}
                >
                  {selectedAsset.name}
                </Typography>
              </MuiBox>
              <MuiBox sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  科目编码
                </Typography>
                <Typography
                  variant='body1'
                  sx={{ fontWeight: 500 }}
                >
                  {selectedAsset.code}
                </Typography>
              </MuiBox>
              <MuiBox
                sx={{
                  p: 2,
                  bgcolor: 'success.light',
                  borderRadius: 1,
                  textAlign: 'center',
                }}
              >
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  折旧金额
                </Typography>
                <Typography
                  variant='h5'
                  sx={{ fontWeight: 700, color: 'success.main' }}
                >
                  ¥1,000.00
                </Typography>
              </MuiBox>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                此操作将创建一张计提折旧凭证，借方为累计折旧科目，贷方为该资产科目。
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDepreciationModal(false)}>取消</Button>
          <Button
            variant='contained'
            color='success'
            onClick={confirmDepreciation}
          >
            确认计提
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
        message='确定要删除该资产科目吗？'
        danger
      />

      <ConfirmDialog
        isOpen={disableDialogOpen}
        onClose={() => {
          setDisableDialogOpen(false);
          setDisablingAsset(null);
        }}
        onConfirm={handleDisable}
        title='确认停用'
        message={`确定要停用科目 "${disablingAsset?.name}" 吗？`}
        type='warning'
        confirmLabel='停用'
        cancelLabel='取消'
      />
    </PageContainer>
  );
};

export default FinanceAssetPage;
