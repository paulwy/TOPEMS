import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { FINANCE_PATHS } from '@/modules/finance/config';
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
import { useNotificationStore } from '@/store';
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

import { useTranslation } from 'react-i18next';
const FinanceAssetPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const queryClient = useQueryClient();

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

  const assetsQuery = useQuery<Account[]>({
    queryKey: [...QUERY_KEYS.FINANCE.ASSET, { searchQuery, filterStatus }],
    queryFn: async () => {
      const response = await financeApi.account.list({
        category: 'asset',
        keyword: searchQuery || undefined,
        status: filterStatus || undefined,
      });
      if (response.success && response.data) {
        return response.data.items || [];
      }
      return [];
    },
  });

  const assetData = assetsQuery.data || [];
  const loading = assetsQuery.isLoading;
  const error = assetsQuery.error ? t('finance.finance_asset_page.fail') : undefined;

  const invalidateAssets = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FINANCE.ASSET });
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof newAsset) => {
      const response = await financeApi.account.create(data);
      if (!response.success) {
        throw new Error(t('finance.finance_asset_page.create'));
      }
      return response;
    },
    onSuccess: () => {
      addNotification({ title: t('finance.finance_asset_page.success'), message: t('finance.finance_asset_page.add_success'), type: 'success' });
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
      invalidateAssets();
    },
    onError: (err: unknown) => {
      apiLogger.error(t('finance.finance_asset_page.create_1'), err);
      addNotification({ title: t('finance.finance_asset_page.error'), message: t('finance.finance_asset_page.create'), type: 'error' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await financeApi.account.delete(id);
      if (!response.success) {
        throw new Error(t('finance.finance_asset_page.delete'));
      }
      return response;
    },
    onSuccess: () => {
      addNotification({ title: t('finance.finance_asset_page.success'), message: t('finance.finance_asset_page.delete_success'), type: 'success' });
      setDeleteDialogOpen(false);
      setDeletingId(null);
      invalidateAssets();
    },
    onError: (err: unknown) => {
      apiLogger.error(t('finance.finance_asset_page.delete_1'), err);
      addNotification({ title: t('finance.finance_asset_page.error'), message: t('finance.finance_asset_page.delete'), type: 'error' });
    },
  });

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
        title: t('finance.finance_asset_page.text_2d49ee'),
        value: totalCount,
        icon: <Package size={24} />,
        color: 'primary' as const,
      },
      {
        title: t('finance.finance_asset_page.active'),
        value: activeCount,
        icon: <CheckCircle size={24} />,
        color: 'success' as const,
      },
      {
        title: t('finance.finance_asset_page.inactive'),
        value: disabledCount,
        icon: <XCircle size={24} />,
        color: 'error' as const,
      },
      {
        title: t('finance.finance_asset_page.text_e18d32'),
        value: hasChildrenCount,
        icon: <PauseCircle size={24} />,
        color: 'warning' as const,
      },
      {
        title: t('finance.finance_asset_page.text_7586c1'),
        value: leafCount,
        icon: <DollarSign size={24} />,
        color: 'secondary' as const,
      },
      {
        title: t('finance.finance_asset_page.text_b1e385'),
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
      active: t('finance.finance_asset_page.active'),
      disabled: t('finance.finance_asset_page.inactive'),
    };
    return labels[status] || status;
  };

  const handleCreate = () => {
    createMutation.mutate(newAsset);
  };

  const handleEdit = (asset: Account) => {
    setEditingAsset({ ...asset });
  };

  const updateMutation = useMutation({
    mutationFn: async (params: { id: string; data: any }) => {
      const response = await financeApi.account.update(params.id, params.data);
      if (!response.success) {
        throw new Error(t('finance.finance_asset_page.update'));
      }
      return response;
    },
    onSuccess: () => {
      addNotification({ title: t('finance.finance_asset_page.success'), message: t('finance.finance_asset_page.update_1'), type: 'success' });
      setEditingAsset(null);
      invalidateAssets();
    },
    onError: (err: unknown) => {
      apiLogger.error(t('finance.finance_asset_page.update_2'), err);
      addNotification({ title: t('finance.finance_asset_page.error'), message: t('finance.finance_asset_page.update'), type: 'error' });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (asset: Account) => {
      const response = await financeApi.account.update(asset.id, {
        ...asset,
        status: 'disabled',
      });
      if (!response.success) {
        throw new Error(t('finance.finance_asset_page.fail_1'));
      }
      return response;
    },
    onSuccess: (data, asset) => {
      addNotification({ title: t('finance.finance_asset_page.success'), message: `科目 "${asset.name}" 已停用`, type: 'success' });
      setDisableDialogOpen(false);
      setDisablingAsset(null);
      invalidateAssets();
    },
    onError: (err: unknown) => {
      apiLogger.error(t('finance.finance_asset_page.fail_2'), err);
      addNotification({ title: t('finance.finance_asset_page.error'), message: t('finance.finance_asset_page.fail_1'), type: 'error' });
    },
  });

  const depreciationMutation = useMutation({
    mutationFn: async (asset: Account) => {
      const currentPeriod = new Date().toISOString().slice(0, 7);
      const response = await financeApi.voucher.create({
        voucher_date: new Date().toISOString().split('T')[0],
        period: currentPeriod,
        summary: `计提折旧 - ${asset.name}`,
        entries: [
          {
            account_id: '1602',
            subject_code: '1602',
            subject_name: t('finance.finance_asset_page.text_d32915'),
            debit_amount: 1000,
            summary: t('finance.finance_asset_page.text_bca84a'),
          },
          {
            account_id: asset.id,
            subject_code: asset.code || '',
            subject_name: asset.name || '',
            credit_amount: 1000,
            summary: t('finance.finance_asset_page.text_d32915'),
          },
        ],
      });
      if (!response.success) {
        throw new Error(t('finance.finance_asset_page.fail_3'));
      }
      return response;
    },
    onSuccess: () => {
      addNotification({ title: t('finance.finance_asset_page.success'), message: t('finance.finance_asset_page.create_2'), type: 'success' });
      invalidateAssets();
      setShowDepreciationModal(false);
    },
    onError: (err: unknown) => {
      apiLogger.error(t('finance.finance_asset_page.fail_4'), err);
      addNotification({ title: t('finance.finance_asset_page.error'), message: t('finance.finance_asset_page.fail_3'), type: 'error' });
    },
  });

  const handleUpdate = () => {
    if (!editingAsset) return;
    updateMutation.mutate({ id: editingAsset.id, data: editingAsset });
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteMutation.mutate(deletingId);
  };

  const handleDisableClick = (asset: Account) => {
    setDisablingAsset(asset);
    setDisableDialogOpen(true);
  };

  const handleDisable = () => {
    if (!disablingAsset) return;
    disableMutation.mutate(disablingAsset);
  };

  const handleDepreciation = (asset: Account) => {
    setSelectedAsset(asset);
    setShowDepreciationModal(true);
  };

  const confirmDepreciation = () => {
    if (!selectedAsset) return;
    depreciationMutation.mutate(selectedAsset);
  };

  const handleScrap = (asset: Account) => {
    handleDisableClick(asset);
  };

  const handleExport = () => {
    addNotification({
      title: t('finance.finance_asset_page.export'),
      message: t('finance.finance_asset_page.export_1'),
      type: 'success',
    });
  };

  const columns = useMemo(
    () => [
      {
        id: 'code',
        label: t('finance.finance_asset_page.code'),
        render: (row: Account) => (
          <MuiBox sx={{ fontWeight: 600, color: 'success.main' }}>{row.code}</MuiBox>
        ),
      },
      {
        id: 'name',
        label: t('finance.finance_asset_page.name'),
        render: (row: Account) => <MuiBox sx={{ fontWeight: 500 }}>{row.name}</MuiBox>,
      },
      {
        id: 'category',
        label: t('finance.finance_asset_page.text_f31b4e'),
        render: (row: Account) => (
          <Chip
            label={row.category === 'asset' ? t('finance.finance_asset_page.text_8b786a') : row.category}
            size='small'
          />
        ),
      },
      {
        id: 'balance_direction',
        label: t('finance.finance_asset_page.text_98f933'),
        render: (row: Account) => (
          <MuiBox sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
            {row.balance_direction === 'debit' ? t('finance.finance_asset_page.text_63e2bc') : t('finance.finance_asset_page.text_9ff9a6')}
          </MuiBox>
        ),
      },
      {
        id: 'level',
        label: t('finance.finance_asset_page.text_6896da'),
        render: (row: Account) => (
          <MuiBox sx={{ color: 'warning.main', fontFamily: 'monospace' }}>{row.level}</MuiBox>
        ),
      },
      {
        id: 'haschildren',
        label: t('finance.finance_asset_page.yes'),
        render: (row: Account) => (
          <MuiBox
            sx={{
              fontWeight: 700,
              color: row.haschildren ? 'success.main' : 'text.secondary',
            }}
          >
            {row.haschildren ? t('finance.finance_asset_page.yes_1') : t('finance.finance_asset_page.no')}
          </MuiBox>
        ),
      },
      {
        id: 'status',
        label: t('finance.finance_asset_page.status'),
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
        label: t('finance.finance_asset_page.text_bca84a'),
        icon: <Calculator sx={{ width: 16, height: 16 }} />,
        color: 'success' as const,
        onClick: (row: Account) => handleDepreciation(row),
      },
      {
        label: t('finance.finance_asset_page.edit'),
        icon: <Edit sx={{ width: 16, height: 16 }} />,
        onClick: (row: Account) => handleEdit(row),
      },
      {
        label: t('finance.finance_asset_page.inactive'),
        icon: <AlertTriangle sx={{ width: 16, height: 16 }} />,
        color: 'warning' as const,
        onClick: (row: Account) => handleScrap(row),
      },
      {
        label: t('finance.finance_asset_page.delete_2'),
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
        label: t('finance.finance_asset_page.text_f31b4e'),
        type: 'select' as const,
        options: [{ value: 'asset', label: t('finance.finance_asset_page.text_8b786a') }],
        value: filterCategory,
        onChange: (value: unknown) => setFilterCategory(value as string),
      },
      {
        id: 'status',
        label: t('finance.finance_asset_page.status'),
        type: 'select' as const,
        options: [
          { value: 'active', label: t('finance.finance_asset_page.active') },
          { value: 'disabled', label: t('finance.finance_asset_page.inactive') },
        ],
        value: filterStatus,
        onChange: (value: unknown) => setFilterStatus(value as string),
      },
    ],
    [filterCategory, filterStatus]
  );

  const exportFields = useMemo(
    () => [
      { key: 'code', title: t('finance.finance_asset_page.code') },
      { key: 'name', title: t('finance.finance_asset_page.name') },
      { key: 'category', title: t('finance.finance_asset_page.text_f31b4e') },
      { key: 'balance_direction', title: t('finance.finance_asset_page.text_98f933') },
      { key: 'level', title: t('finance.finance_asset_page.text_6896da') },
      { key: 'haschildren', title: t('finance.finance_asset_page.yes') },
      { key: 'status', title: t('finance.finance_asset_page.status') },
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
              <BackButton href={FINANCE_PATHS.dashboard} />
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
                defaultFileName={t('finance.finance_asset_page.text_386dcd')}
                buttonText={t('finance.finance_asset_page.export_2')}
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
          searchPlaceholder={t('finance.finance_asset_page.search')}
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
          onRefresh={() => assetsQuery.refetch()}
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
                label={t('finance.finance_asset_page.code_1')}
                fullWidth
                required
                value={newAsset.code}
                onChange={(e) => setNewAsset({ ...newAsset, code: e.target.value })}
              />
              <TextField
                label={t('finance.finance_asset_page.name_1')}
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
                  label={t('finance.finance_asset_page.text_98f933')}
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
                  label={t('finance.finance_asset_page.text_6896da')}
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
              label={t('finance.finance_asset_page.description')}
              fullWidth
              multiline
              rows={3}
              value={newAsset.description || ''}
              onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
              placeholder={t('finance.finance_asset_page.please_input')}
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
                  label={t('finance.finance_asset_page.code')}
                  fullWidth
                  value={editingAsset.code}
                  slotProps={{ input: { readOnly: true } }}
                />
                <TextField
                  label={t('finance.finance_asset_page.name')}
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
                    label={t('finance.finance_asset_page.text_98f933')}
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
                    label={t('finance.finance_asset_page.status')}
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
                label={t('finance.finance_asset_page.description')}
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
                placeholder={t('finance.finance_asset_page.please_input')}
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
        title={t('finance.finance_asset_page.confirm_delete')}
        message={t('finance.finance_asset_page.confirm')}
        danger
      />

      <ConfirmDialog
        isOpen={disableDialogOpen}
        onClose={() => {
          setDisableDialogOpen(false);
          setDisablingAsset(null);
        }}
        onConfirm={handleDisable}
        title={t('finance.finance_asset_page.inactive_2')}
        message={`确定要停用科目 "${disablingAsset?.name}" 吗？`}
        type='warning'
        confirmLabel={t('finance.finance_asset_page.inactive')}
        cancelLabel={t('finance.finance_asset_page.cancel')}
      />
    </PageContainer>
  );
};

export default FinanceAssetPage;
