import React from 'react';
import { Stack, Button } from '@mui/material';
import { Download, TrendingUp } from 'lucide-react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { scmApi } from '@/api/scm';
import type { InventoryTurnoverStat } from '@/api/scm';
import { inventoryTurnoverSchema } from '@/schemas/scm';
import { useNotificationStore } from '@/store';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const apiAdapter: CrudApiAdapter<InventoryTurnoverStat> = {
  list: async (params) => {
    const response = await scmApi.inventoryTurnover.list(params as Record<string, unknown>);
    if (response.success && response.data) {
      return {
        data: response.data.items || [],
        total: response.data.total || 0,
      };
    }
    return { data: [], total: 0 };
  },
  create: async () => {
    throw new Error(i18n.t('scm.scm_inventory_turnover_page.k0'));
  },
  update: async () => {
    throw new Error(i18n.t('scm.scm_inventory_turnover_page.k1'));
  },
  delete: async () => {
    throw new Error(i18n.t('scm.scm_inventory_turnover_page.k2'));
  },
};

const HeaderActions: React.FC = () => {
  const { t } = useTranslation('scm');
  const addNotification = useNotificationStore((state) => state.addNotification);
  return (
    <Stack
      direction='row'
      spacing={1}
      sx={{ mb: 2 }}
    >
      <Button
        variant='outlined'
        size='small'
        startIcon={<Download size={16} />}
        onClick={() =>
          addNotification({
            title: t('scm.scm_inventory_turnover_page.k3'),
            message: '库存周转报表导出中...',
            type: 'info',
          })
        }
      >
        导出报表
      </Button>
      <Button
        variant='outlined'
        size='small'
        startIcon={<TrendingUp size={16} />}
        onClick={() =>
          addNotification({
            title: t('scm.scm_inventory_turnover_page.k4'),
            message: '正在加载周转趋势分析...',
            type: 'info',
          })
        }
      >
        趋势分析
      </Button>
    </Stack>
  );
};

const ScmInventoryTurnoverPage: React.FC = () => {
  const { t } = useTranslation('scm');
  return (
    <CrudPage
      schema={inventoryTurnoverSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[
        { label: t('scm.scm_inventory_turnover_page.k5'), href: '/dashboard' },
        { label: 'SCM' },
        { label: t('scm.scm_inventory_turnover_page.k6') },
      ]}
      headerContent={<HeaderActions />}
    />
  );
};

export default ScmInventoryTurnoverPage;
