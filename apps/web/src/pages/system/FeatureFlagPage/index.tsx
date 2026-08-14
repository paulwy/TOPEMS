import React, { useEffect, useState } from 'react';
import { RefreshCw, Power, AlertCircle } from 'lucide-react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  Chip,
  CircularProgress,
  Typography,
  IconButton,
  Tooltip,
  Alert,
  Paper,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import { useFeatureFlagStore } from '@/store/featureFlagStore';
import { useTranslation } from 'react-i18next';

const FeatureFlagPage: React.FC = () => {
  const { t } = useTranslation('system');
  const { flags, loading, error, fetchFlags, updateFlag, refreshFlag } = useFeatureFlagStore();
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleToggle = async (key: string, currentState: string) => {
    setTogglingKey(key);
    const enabled = currentState !== 'Enabled';
    await updateFlag(key, enabled);
    setTogglingKey(null);
  };

  const handleRefresh = async (key: string) => {
    await refreshFlag(key);
  };

  const handleRefreshAll = () => {
    fetchFlags(true);
  };

  const getStateChip = (state: string) => {
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
  };

  return (
    <PageContainer
      title={t('system.index.k3')}
      subtitle={t('system.index.k4')}
      maxWidth='lg'
      headerProps={{
        actions: [
          {
            label: t('system.index.k5'),
            icon: <RefreshCw size={16} />,
            onClick: handleRefreshAll,
            variant: 'outlined',
          },
        ],
      }}
    >
      {error && (
        <Alert
          severity='error'
          sx={{ mb: 2 }}
          icon={<AlertCircle />}
        >
          {error}
        </Alert>
      )}

      {loading && flags.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={48} />
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          variant='outlined'
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: '25%' }}>Key</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '20%' }}>{t('system.index.k6')}</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '15%' }}>{t('system.index.k7')}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{t('system.index.k8')}</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '120px' }}>
                  {t('system.index.k9')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flags.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    align='center'
                    sx={{ py: 6 }}
                  >
                    <Typography color='text.secondary'>
                      {t('system.feature_flag_page_index.e1')}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                flags.map((flag) => (
                  <TableRow
                    key={flag.key}
                    hover
                  >
                    <TableCell>
                      <Typography
                        variant='body2'
                        sx={{
                          fontFamily: 'monospace',
                          bgcolor: 'action.hover',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                        }}
                      >
                        {flag.key}
                      </Typography>
                    </TableCell>
                    <TableCell>{flag.name}</TableCell>
                    <TableCell>{getStateChip(flag.state)}</TableCell>
                    <TableCell>
                      {flag.description || (
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Switch
                          size='small'
                          checked={flag.state === 'Enabled'}
                          disabled={togglingKey === flag.key}
                          onChange={() => handleToggle(flag.key, flag.state)}
                        />
                        <Tooltip title={t('system.index.k10')}>
                          <IconButton
                            size='small'
                            onClick={() => handleRefresh(flag.key)}
                            disabled={loading}
                          >
                            <RefreshCw size={16} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Power size={14} />
        <Typography
          variant='body2'
          color='text.secondary'
        >
          共 {flags.length} 个 Feature Flag · In-Memory 存储（重启后重置）
        </Typography>
      </Box>
    </PageContainer>
  );
};

export default FeatureFlagPage;
