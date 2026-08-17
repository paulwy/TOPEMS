import React, { useMemo, useCallback } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { Package, Edit, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CrudPage from '@/components/templates/CrudPage';
import type { CrudApiAdapter } from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { materialSchema } from '@/schemas/rd';
import { materialApi } from '@/api/rd';
import type { Material, CreateMaterialRequest, UpdateMaterialRequest } from '@/api/rd';
import { PageContainer } from '@/components/common';
import { useNotificationStore } from '@/store';
import { logger } from '@/utils/logger';
import { extractErrorMessage } from '@/utils/errors';
import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

const baseAdapter = createCrudPageAdapter<Material, CreateMaterialRequest, UpdateMaterialRequest>({
  list: materialApi.listMaterials,
  create: materialApi.createMaterial,
  update: materialApi.updateMaterial,
  delete: materialApi.deleteMaterial,
});
const materialAdapter = baseAdapter as unknown as CrudApiAdapter<Material>;
function getStockStatus(material: Material): string {
  const stock = material.stock_quantity || 0;
  const max = material.max_stock || 0;
  if (max > 0) {
    const ratio = stock / max;
    if (ratio >= 0.7) return 'sufficient';
    if (ratio >= 0.4) return 'normal';
    if (ratio >= 0.2) return 'low';
    return 'insufficient';
  }
  return 'normal';
}
const RsMaterialListPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();
  const { data: materialsResp } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.RD_MATERIALS_STATS_BASE,
    queryFn: async () => materialApi.listMaterials({ pagesize: 500 }),

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const importMaterialMutation = useMutation({
    mutationFn: async (file: File) => {
      const response = await materialApi.importMaterials(file);
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('rd.material_list_page.error.import_failed'));
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.RD_MATERIALS_BASE,
        exact: false,
        refetchType: 'active',
      });
      const { success, failed } = data;
      if (failed === 0) {
        addNotification({
          type: 'success',
          title: i18n.t('rd.material_list_page.notification.import_success_title'),
          message: i18n.t('rd.material_list_page.notification.import_success_message', { success }),
        });
      } else {
        addNotification({
          type: 'warning',
          title: i18n.t('rd.material_list_page.notification.import_partial_title'),
          message: i18n.t('rd.material_list_page.notification.import_partial_message', {
            success,
            failed,
          }),
        });
      }
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('pages.rs_material_list_page.k0'), error);
      addNotification({
        type: 'error',
        title: i18n.t('rd.material_list_page.notification.import_failed_title'),
        message: extractErrorMessage(
          error,
          i18n.t('rd.material_list_page.notification.import_failed_message')
        ),
      });
    },
  });
  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        await importMaterialMutation.mutateAsync(file);
      } catch {
      } finally {
        event.target.value = '';
      }
    },
    [importMaterialMutation]
  );
  const handleExport = useCallback(async () => {
    try {
      const blob = await materialApi.exportMaterials();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `materials_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      addNotification({
        type: 'success',
        title: i18n.t('rd.material_list_page.notification.export_success_title'),
        message: i18n.t('rd.material_list_page.notification.export_success_message'),
      });
    } catch (err: unknown) {
      logger.error(i18n.t('pages.rs_material_list_page.k1'), err);
      addNotification({
        type: 'error',
        title: i18n.t('rd.material_list_page.notification.export_failed_title'),
        message: i18n.t('rd.material_list_page.notification.export_failed_message'),
      });
    }
  }, [addNotification, i18n.t]);
  const stats = useMemo(() => {
    const materials = materialsResp?.data?.materials || [];
    const total = materialsResp?.data?.total || materials.length;
    return {
      total,
      sufficient: materials.filter((m) => getStockStatus(m) === 'sufficient').length,
      low: materials.filter((m) => ['low', 'insufficient'].includes(getStockStatus(m))).length,
    };
  }, [materialsResp]);
  const customRowActions: RowAction<Record<string, unknown>>[] = [
    {
      label: i18n.t('rd.material_list_page.row_action.apply'),
      onClick: () => {
        addNotification({
          type: 'info',
          title: i18n.t('rd.material_list_page.notification.tip_title'),
          message: i18n.t('rd.material_list_page.notification.apply_in_development'),
        });
      },
    },
    {
      label: i18n.t('rd.material_list_page.row_action.edit'),
      icon: <Edit size={16} />,
      onClick: () => {
        addNotification({
          type: 'info',
          title: i18n.t('rd.material_list_page.notification.tip_title'),
          message: i18n.t('rd.material_list_page.notification.edit_in_development'),
        });
      },
    },
    {
      label: i18n.t('rd.material_list_page.row_action.delete'),
      icon: <Trash2 size={16} />,
      color: 'error',
      onClick: () => {},
    },
  ];
  const headerContent = () => (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Typography
                  color='text.secondary'
                  variant='body2'
                >
                  {i18n.t('rd.material_list_page.stat_card.total')}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 'bold' }}
                >
                  {stats.total}
                </Typography>
              </div>
              <Package
                color='primary'
                size={32}
              />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Typography
                  color='text.secondary'
                  variant='body2'
                >
                  {i18n.t('rd.material_list_page.stat_card.sufficient')}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 'bold', color: 'success.main' }}
                >
                  {stats.sufficient}
                </Typography>
              </div>
              <Package
                color='success'
                size={32}
              />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Typography
                  color='text.secondary'
                  variant='body2'
                >
                  {i18n.t('rd.material_list_page.stat_card.insufficient')}
                </Typography>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 'bold', color: 'error.main' }}
                >
                  {stats.low}
                </Typography>
              </div>
              <Package
                color='error'
                size={32}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>
      <input
        accept='.csv'
        style={{ display: 'none' }}
        id='import-material-file'
        type='file'
        onChange={handleImport}
      />
    </Box>
  );
  return (
    <PageContainer
      title={i18n.t('rd.material_list_page.title')}
      subtitle={i18n.t('rd.material_list_page.subtitle')}
      maxWidth='xl'
    >
      <CrudPage
        schema={materialSchema}
        apiAdapter={materialAdapter}
        breadcrumbs={[
          { label: i18n.t('rd.material_list_page.breadcrumb.home'), href: '/dashboard' },
          { label: i18n.t('rd.material_list_page.breadcrumb.rd'), href: '/rs' },
          { label: i18n.t('rd.material_list_page.breadcrumb.material') },
        ]}
        headerContent={headerContent}
        customRowActions={customRowActions}
      />
    </PageContainer>
  );
};
export default RsMaterialListPage;
