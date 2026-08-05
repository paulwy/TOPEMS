import React, { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Typography,
  Button,
  InputLabel,
} from '@mui/material';
import { Calculator, RefreshCw, BarChart3, TrendingUp, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates/list/types';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { fixedAssetSchema } from '@/schemas/finance';
import { fixedAssetApi } from '@/api/erp';
import type { FixedAsset } from '@/api/erp';
import { apiLogger } from '@/utils/logger';

const DepreciationPage: React.FC = () => {
  const { t } = useTranslation();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();

  const [showDepreciateDialog, setShowDepreciateDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [depreciatePeriod, setDepreciatePeriod] = useState('');
  const [statsData, setStatsData] = useState({
    total: 0,
    totalValue: 0,
    totalDepreciation: 0,
    monthlyDepreciation: 0,
  });

  const depreciateMutation = useMutation({
    mutationFn: async (data: { period: string; asset_ids?: string[] }) => {
      return fixedAssetApi.depreciate(data);
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        addNotification({
          type: 'success',
          title: t('asset.depreciation_page.success'),
          message: t('asset:depreciation.notify_success_message', {
            count: result.data.depreciated_count,
          }),
        });
        queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
        setShowDepreciateDialog(false);
        setDepreciatePeriod('');
        setSelectedIds([]);
      }
    },
    onError: (error) => {
      apiLogger.error(t('asset.depreciation_page.fail'), error);
      addNotification({
        type: 'error',
        title: t('asset.depreciation_page.fail_1'),
        message: t('asset.depreciation_page.text_e69527'),
      });
    },
  });

  const handleBatchDepreciate = useCallback((rows: Record<string, unknown>[]) => {
    const ids = rows.map((row) => row.id as string);
    setSelectedIds(ids);
    setShowDepreciateDialog(true);
  }, []);

  const handleSingleDepreciate = useCallback((row: Record<string, unknown>) => {
    setSelectedIds([row.id as string]);
    setShowDepreciateDialog(true);
  }, []);

  const handleConfirmDepreciate = async () => {
    if (!depreciatePeriod) {
      addNotification({
        type: 'warning',
        title: t('asset.depreciation_page.hint'),
        message: t('asset.depreciation_page.please_select'),
      });
      return;
    }
    await depreciateMutation.mutateAsync({
      period: depreciatePeriod,
      asset_ids: selectedIds.length > 0 ? selectedIds : undefined,
    });
  };

  const apiAdapter: CrudApiAdapter = useMemo(
    () => ({
      list: async (params) => {
        const search = params?.search as string | undefined;
        const statusFilter = params?.status as string | undefined;
        const page = params?.page ?? 1;
        const pageSize = params?.pageSize ?? 10;

        const queryParams: Record<string, unknown> = {
          page,
          pagesize: pageSize,
        };
        if (search) queryParams.search = search;
        if (statusFilter && statusFilter !== 'all') queryParams.status = statusFilter;

        const response = await fixedAssetApi.list(queryParams);
        if (response.success && response.data) {
          const items = response.data.items || [];
          setStatsData({
            total: items.length,
            totalValue: items.reduce((sum, a) => sum + (a.original_value || 0), 0),
            totalDepreciation: items.reduce((sum, a) => sum + (a.accumulated_depreciation || 0), 0),
            monthlyDepreciation: items.reduce((sum, a) => sum + (a.monthly_depreciation || 0), 0),
          });
          return { data: items as any[], total: response.data.total || 0 };
        }
        return { data: [], total: 0 };
      },
      create: async (data) => {
        const res = await fixedAssetApi.create(data as Partial<FixedAsset>);
        if (res.success && res.data) {
          return res.data as any;
        }
        throw new Error(res.message || t('asset:depreciation.create_fail'));
      },
      update: async (id, data) => {
        const res = await fixedAssetApi.update(id, data as Partial<FixedAsset>);
        if (res.success && res.data) {
          return res.data as any;
        }
        throw new Error(res.message || t('asset:depreciation.update_fail'));
      },
      delete: async (id) => {
        await fixedAssetApi.delete(id);
      },
    }),
    [t]
  );

  const customRowActions: RowAction[] = useMemo(
    () => [
      {
        key: 'view-detail',
        label: t('asset.depreciation_page.view_detail'),
        icon: <Eye size={16} />,
        onClick: () => {},
      },
      {
        key: 'depreciate',
        label: t('asset.depreciation_page.text_943ca0'),
        icon: <Calculator size={16} />,
        onClick: handleSingleDepreciate,
      },
    ],
    [handleSingleDepreciate, t]
  );

  const statsContent = (rows: any[], _total: number) => {
    const currentTotal = rows.length || statsData.total;
    const currentValue =
      rows.length > 0
        ? rows.reduce((sum, a) => sum + (a.original_value || 0), 0)
        : statsData.totalValue;
    const currentDepreciation =
      rows.length > 0
        ? rows.reduce((sum, a) => sum + (a.accumulated_depreciation || 0), 0)
        : statsData.totalDepreciation;
    const currentMonthly =
      rows.length > 0
        ? rows.reduce((sum, a) => sum + (a.monthly_depreciation || 0), 0)
        : statsData.monthlyDepreciation;

    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ p: 2, bgcolor: 'primary.lighter', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <BarChart3
              size={16}
              color='primary'
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              {t('asset.depreciation_page.total_assets')}
            </Typography>
          </Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            {currentTotal}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'success.lighter', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <TrendingUp
              size={16}
              color='success'
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              {t('asset.depreciation_page.asset_value')}
            </Typography>
          </Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            ¥{currentValue.toLocaleString()}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'warning.lighter', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Calculator
              size={16}
              color='warning'
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              {t('asset.depreciation_page.accumulated_depreciation')}
            </Typography>
          </Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            ¥{currentDepreciation.toLocaleString()}
          </Typography>
        </Box>
        <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <RefreshCw
              size={16}
              color='info'
            />
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary' }}
            >
              {t('asset.depreciation_page.monthly_depreciation')}
            </Typography>
          </Box>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700 }}
          >
            ¥{currentMonthly.toFixed(2)}
          </Typography>
        </Box>
      </Box>
    );
  };

  const renderDepreciateDialog = () => (
    <Dialog
      open={showDepreciateDialog}
      onClose={() => {
        setShowDepreciateDialog(false);
        setDepreciatePeriod('');
        setSelectedIds([]);
      }}
      maxWidth='md'
    >
      <DialogTitle>
        {selectedIds.length > 0
          ? t('asset.depreciation_page.text_b33d6b')
          : t('asset.depreciation_page.text_943ca0')}
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            mt: 2,
          }}
        >
          {selectedIds.length > 0 && (
            <Box>
              <InputLabel sx={{ color: 'text.secondary', fontSize: 12 }}>
                {t('asset.depreciation_page.selected_assets', { count: selectedIds.length })}
              </InputLabel>
            </Box>
          )}
          <Box>
            <InputLabel htmlFor='depreciate_period'>
              {t('asset.depreciation_page.depreciate_period')} *
            </InputLabel>
            <TextField
              id='depreciate_period'
              type='date'
              required
              size='small'
              fullWidth
              value={depreciatePeriod}
              onChange={(e) => setDepreciatePeriod(e.target.value)}
            />
          </Box>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mt: 2 }}
          >
            {selectedIds.length > 0
              ? t('asset.depreciation_page.text_a67937')
              : t('asset.depreciation_page.text_1162f9')}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          type='button'
          variant='outlined'
          onClick={() => {
            setShowDepreciateDialog(false);
            setDepreciatePeriod('');
            setSelectedIds([]);
          }}
        >
          {t('asset.depreciation_page.cancel')}
        </Button>
        <Button
          type='button'
          variant='contained'
          onClick={handleConfirmDepreciate}
          disabled={depreciateMutation.isPending || !depreciatePeriod}
          startIcon={
            depreciateMutation.isPending ? <RefreshCw size={16} /> : <Calculator size={16} />
          }
        >
          {depreciateMutation.isPending
            ? t('asset.depreciation_page.text_3afd7f')
            : t('asset.depreciation_page.confirm_2')}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <PageContainer
      title={t('asset.depreciation_page.text_2eef93')}
      subtitle={t('asset.depreciation_page.info')}
    >
      <CrudPage
        schema={fixedAssetSchema}
        apiAdapter={apiAdapter}
        customRowActions={customRowActions}
        headerContent={statsContent}
        breadcrumbs={[
          { label: t('asset.depreciation_page.breadcrumb_home'), href: '/dashboard' },
          { label: t('asset.depreciation_page.breadcrumb_module'), href: '/erp' },
          { label: t('asset.depreciation_page.text_2eef93') },
        ]}
      />

      {renderDepreciateDialog()}
    </PageContainer>
  );
};

export default DepreciationPage;
