import React from 'react';
import { Stack, Button } from '@mui/material';
import { Download, TrendingUp } from 'lucide-react';
import CrudPage, { type CrudApiAdapter } from '@/components/templates/CrudPage';
import { scmApi } from '@/api/scm';
import type { InventoryTurnoverStat } from '@/api/scm';
import { inventoryTurnoverSchema } from '@/schemas/scm';
import { useNotificationStore } from '@/store';

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
    throw new Error('库存周转数据为只读，不支持创建');
  },
  update: async () => {
    throw new Error('库存周转数据为只读，不支持编辑');
  },
  delete: async () => {
    throw new Error('库存周转数据为只读，不支持删除');
  },
};

const HeaderActions: React.FC = () => {
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
          addNotification({ title: '导出', message: '库存周转报表导出中...', type: 'info' })
        }
      >
        导出报表
      </Button>
      <Button
        variant='outlined'
        size='small'
        startIcon={<TrendingUp size={16} />}
        onClick={() =>
          addNotification({ title: '趋势', message: '正在加载周转趋势分析...', type: 'info' })
        }
      >
        趋势分析
      </Button>
    </Stack>
  );
};

const ScmInventoryTurnoverPage: React.FC = () => {
  return (
    <CrudPage
      schema={inventoryTurnoverSchema}
      apiAdapter={apiAdapter}
      breadcrumbs={[
        { label: '首页', href: '/dashboard' },
        { label: 'SCM' },
        { label: '库存周转分析' },
      ]}
      headerContent={<HeaderActions />}
    />
  );
};

export default ScmInventoryTurnoverPage;
