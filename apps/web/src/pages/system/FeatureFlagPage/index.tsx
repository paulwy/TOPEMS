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

const FeatureFlagPage: React.FC = () => {
  const { flags, loading, error, fetchFlags, updateFlag, refreshFlag } =
    useFeatureFlagStore();
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
        return <Chip label='开启' color='success' size='small' />;
      case 'Disabled':
        return <Chip label='关闭' color='default' size='small' />;
      case 'Conditional':
        return <Chip label='条件开启' color='warning' size='small' />;
      default:
        return <Chip label={state} size='small' />;
    }
  };

  return (
    <PageContainer
      title='特性开关管理'
      subtitle='管理系统 Feature Flag，控制功能开启/关闭'
      maxWidth='lg'
      headerProps={{
        actions: [
          {
            label: '刷新',
            icon: <RefreshCw size={16} />,
            onClick: handleRefreshAll,
            variant: 'outlined',
          },
        ],
      }}
    >
      {error && (
        <Alert severity='error' sx={{ mb: 2 }} icon={<AlertCircle />}>
          {error}
        </Alert>
      )}

      {loading && flags.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={48} />
        </Box>
      ) : (
        <TableContainer component={Paper} variant='outlined'>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: '25%' }}>Key</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '20%' }}>名称</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '15%' }}>状态</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>描述</TableCell>
                <TableCell sx={{ fontWeight: 600, width: '120px' }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {flags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align='center' sx={{ py: 6 }}>
                    <Typography color='text.secondary'>
                      暂无 Feature Flag，等待后端注册或刷新
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                flags.map((flag) => (
                  <TableRow key={flag.key} hover>
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
                        <Typography variant='body2' color='text.secondary'>
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
                        <Tooltip title='刷新'>
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
        <Typography variant='body2' color='text.secondary'>
          共 {flags.length} 个 Feature Flag · In-Memory 存储（重启后重置）
        </Typography>
      </Box>
    </PageContainer>
  );
};

export default FeatureFlagPage;
