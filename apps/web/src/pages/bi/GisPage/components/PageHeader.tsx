import React from 'react';
import { Stack, IconButton, Typography, Box, Button } from '@mui/material';
import { ChevronRight, Plus, RefreshCw, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import type { TabType } from '../types';

import { useTranslation } from 'react-i18next';

interface PageHeaderProps {
  activeTab: TabType;
  loading: boolean;
  onRefresh: () => void;
  onCreate: () => void;
  onImport: () => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  activeTab,
  loading,
  onRefresh,
  onCreate,
  onImport,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Stack
      direction='row'
      spacing={2}
      sx={{
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        mb: 4,
      }}
    >
      <Stack
        direction='row'
        spacing={1.5}
        sx={{ alignItems: 'center' }}
      >
        <IconButton
          onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
          aria-label={t('bi.gis_page_components__page_header.back')}
        >
          <ChevronRight style={{ transform: 'rotate(180deg)' }} />
        </IconButton>
        <Box>
          <Typography
            variant='h4'
            sx={{ fontWeight: 700 }}
          >
            厂区空间数字化
          </Typography>
          <Typography color='text.secondary'>
            管理设备点位、管线、仓储位置、现场取证、厂区地图和业务位置
          </Typography>
        </Box>
      </Stack>
      <Stack
        direction='row'
        spacing={1.5}
        sx={{ alignItems: 'center' }}
      >
        <Button
          variant='contained'
          color='success'
          startIcon={<Upload size={16} />}
          onClick={onImport}
        >
          导入
        </Button>
        {activeTab !== 'map' && (
          <Button
            variant='contained'
            sx={{
              bgcolor: 'info.main',
              '&:hover': { bgcolor: 'cyan.dark' },
            }}
            startIcon={<Plus size={16} />}
            onClick={onCreate}
          >
            新建
          </Button>
        )}
        <IconButton
          onClick={onRefresh}
          sx={{ border: 1, borderColor: 'divider' }}
          aria-label='刷新'
        >
          <RefreshCw
            size={20}
            className={loading ? 'animate-spin' : ''}
            style={{
              animation: loading ? 'spin 1s linear infinite' : undefined,
            }}
          />
        </IconButton>
      </Stack>
    </Stack>
  );
};
