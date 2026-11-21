import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { RefreshCw, Power } from 'lucide-react';
import { Box, Typography, Switch, Chip, Alert } from '@mui/material';
import { ListPageTemplate } from '@/components/templates';
import type { ColumnDef, RowAction } from '@/components/templates/list/types';
import { useFeatureFlagStore } from '@/store/featureFlagStore';
import { useTranslation } from 'react-i18next';
import type { FeatureFlag } from '@/api/system';

type FeatureFlagRow = FeatureFlag & { id: string };

const FeatureFlagPage: React.FC = () => {
  const { t } = useTranslation('system');
  const { flags, loading, error, fetchFlags, updateFlag, refreshFlag } = useFeatureFlagStore();
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleToggle = useCallback(
    async (key: string, currentState: string) => {
      setTogglingKey(key);
      const enabled = currentState !== 'Enabled';
      await updateFlag(key, enabled);
      setTogglingKey(null);
    },
    [updateFlag]
  );

  const handleRefresh = useCallback(
    async (key: string) => {
      await refreshFlag(key);
    },
    [refreshFlag]
  );

  const handleRefreshAll = useCallback(() => {
    fetchFlags(true);
  }, [fetchFlags]);

  const getStateChip = useCallback(
    (state: string) => {
      switch (state) {
        case 'Enabled':
          return (
            <Chip
              label={t('system.index.k0')}
              color='success'
              size='small'
            />
          );
        case 'Disabled':
          return (
            <Chip
              label={t('system.index.k1')}
              color='default'
              size='small'
            />
          );
        case 'Conditional':
          return (
            <Chip
              label={t('system.index.k2')}
              color='warning'
              size='small'
            />
          );
        default:
          return (
            <Chip
              label={state}
              size='small'
            />
          );
      }
    },
    [t]
  );

  const columns: ColumnDef<FeatureFlagRow>[] = useMemo(
    () => [
      {
        id: 'key',
        label: 'Key',
        render: (row) => (
          <Typography
            variant='body2'
            sx={{
              fontFamily: 'monospace',
              bgcolor: 'action.hover',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              display: 'inline-block',
            }}
          >
            {row.key}
          </Typography>
        ),
      },
      {
        id: 'name',
        label: t('system.index.k6'),
        render: (row) => <Typography>{row.name}</Typography>,
      },
      {
        id: 'state',
        label: t('system.index.k7'),
        render: (row) => getStateChip(row.state),
      },
      {
        id: 'description',
        label: t('system.index.k8'),
        render: (row) =>
          row.description ? (
            <Typography>{row.description}</Typography>
          ) : (
            <Typography color='text.secondary'>-</Typography>
          ),
      },
      {
        id: 'toggle',
        label: t('system.index.k9'),
        render: (row) => (
          <Switch
            size='small'
            checked={row.state === 'Enabled'}
            disabled={togglingKey === row.key || loading}
            onChange={() => handleToggle(row.key, row.state)}
          />
        ),
      },
    ],
    [t, getStateChip, togglingKey, loading, handleToggle]
  );

  const rowActions: RowAction<FeatureFlagRow>[] = useMemo(
    () => [
      {
        key: 'refresh',
        label: t('system.index.k10'),
        icon: <RefreshCw size={16} />,
        onClick: (row) => handleRefresh(row.key),
        color: 'info',
        disabled: () => loading,
      },
    ],
    [t, loading, handleRefresh]
  );

  const actions = useMemo(
    () => [
      {
        label: t('system.index.k5'),
        icon: <RefreshCw size={16} />,
        onClick: handleRefreshAll,
        variant: 'outlined' as const,
        disabled: loading,
      },
    ],
    [t, loading, handleRefreshAll]
  );

  const footerContent = useMemo(
    () => (
      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Power size={14} />
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {t('system.feature_flag_page_index.r1', { v1: flags.length })}
        </Typography>
      </Box>
    ),
    [flags.length, t]
  );

  return (
    <>
      {error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}
      <ListPageTemplate<FeatureFlagRow>
        title={t('system.index.k3')}
        subtitle={t('system.index.k4')}
        columns={columns}
        data={flags.map((f) => ({ ...f, id: f.key }))}
        loading={loading && flags.length === 0}
        actions={actions}
        rowActions={rowActions}
        footerContent={footerContent}
        emptyMessage={t('system.feature_flag_page_index.e1')}
      />
    </>
  );
};

export default FeatureFlagPage;
