import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import i18n from '@/i18n';
import { FlaskConical, AlertTriangle, Package, Clock, FileWarning } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import CrudPage from '@/components/templates/CrudPage';
import type { RowAction } from '@/components/templates';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { hazardousMaterialSchema } from '@/schemas/ehs';
import { hazardousMaterialApi } from '@/api/ehs';
import type {
  HazardousMaterial,
  MSDS,
  CreateHazardousMaterialRequest,
  UpdateHazardousMaterialRequest,
} from '@/api/ehs/types/hazardousMaterial';
import { PageContainer } from '@/components/common';
import { designTokens } from '@/theme/tokens';
import { useNotificationStore } from '@/store';
import { apiLogger } from '@/utils/logger';
import { useTranslation } from 'react-i18next';

const ct = designTokens.colors;

// 用于统计计算的字段（原页面使用的字段集合）
interface HazardousMaterialItem {
  id: string;
  material_code?: string;
  name?: string;
  category?: string;
  danger_level?: string;
  expiry_date?: string;
  created_at?: string;
}

const materialApi = {
  list: hazardousMaterialApi.listHazardousMaterials,
  create: hazardousMaterialApi.createHazardousMaterial,
  update: hazardousMaterialApi.updateHazardousMaterial,
  delete: hazardousMaterialApi.deleteHazardousMaterial,
};

const materialAdapter = createCrudPageAdapter<
  HazardousMaterial,
  CreateHazardousMaterialRequest,
  UpdateHazardousMaterialRequest
>(materialApi);

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  bgColor: string;
  iconBgColor: string;
  iconColor: string;
}> = ({ label, value, icon, bgColor, iconBgColor, iconColor }) => (
  <Card sx={{ bgcolor: bgColor }}>
    <CardContent sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            bgcolor: iconBgColor,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ color: iconColor, display: 'flex' }}>{icon}</Box>
        </Box>
        <Box>
          <Typography
            variant='body2'
            sx={{
              color: 'slate.600',
              fontSize: designTokens.typography.fontSize.scale['0.875rem'],
            }}
          >
            {label}
          </Typography>
          <Typography
            variant='h5'
            sx={{ fontWeight: 700, color: 'slate.900' }}
          >
            {value}
          </Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const EhsHazardousMaterialPage: React.FC = () => {
  const { t } = useTranslation();
  const addNotification = useNotificationStore((state) => state.addNotification);

  // 统计数据查询（使用 schema entity 作为 key 前缀，CRUD 变更会自动失效）
  const { data: allMaterialsData } = useQuery({
    queryKey: [hazardousMaterialSchema.entity, 'stats'],
    queryFn: async () => {
      const response = await hazardousMaterialApi.listHazardousMaterials({
        pagesize: 500,
      });
      if (response.success && response.data) {
        const data = response.data as unknown as Record<string, unknown>;
        return Array.isArray(data) ? data : data.items || data.data || [];
      }
      return [];
    },
    staleTime: 60 * 1000,
  });
  const allMaterials = (allMaterialsData as HazardousMaterialItem[]) || [];

  const stats = useMemo(() => {
    const isExpiring = (m: HazardousMaterialItem) => {
      if (!m.expiry_date) return false;
      const expiry = new Date(m.expiry_date);
      if (Number.isNaN(expiry.getTime())) return false;
      const daysDiff = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 30;
    };
    return {
      total: allMaterials.length,
      expiring: allMaterials.filter(isExpiring).length,
      severe: allMaterials.filter(
        (m) =>
          m.danger_level === t('ehs.ehs_hazardous_material_page.k1') ||
          m.danger_level === t('ehs.ehs_hazardous_material_page.k0')
      ).length,
      thisMonth: allMaterials.filter((m) => {
        if (!m.created_at) return false;
        const d = new Date(m.created_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
    };
  }, [allMaterials]);

  // MSDS 弹窗状态
  const [showMSDSModal, setShowMSDSModal] = useState(false);
  const [msdsData, setMsdsData] = useState<MSDS | null>(null);
  const [msdsLoading, setMsdsLoading] = useState(false);
  const [selectedMaterialName, setSelectedMaterialName] = useState<string>('');

  const handleOpenMSDS = async (row: Record<string, unknown>) => {
    const id = row.id as string;
    const name = (row.name as string) || '';
    try {
      setMsdsLoading(true);
      setSelectedMaterialName(name);
      const response = await hazardousMaterialApi.getMSDSByMaterialId(id);
      if (response.success && response.data) {
        setMsdsData(response.data);
      } else {
        setMsdsData(null);
      }
    } catch (err: unknown) {
      apiLogger.error(t('ehs.ehs_hazardous_material_page.msds_2'), err);
      addNotification({
        title: t('ehs.ehs_hazardous_material_page.error'),
        message: t('ehs.ehs_hazardous_material_page.fail_1'),
        type: 'error',
      });
      setMsdsData(null);
    } finally {
      setMsdsLoading(false);
      setShowMSDSModal(true);
    }
  };

  const customRowActions: RowAction[] = [
    {
      label: 'MSDS',
      icon: <FileWarning size={16} />,
      onClick: (row) => {
        void handleOpenMSDS(row);
      },
      color: 'primary',
    },
  ];

  const headerContent = () => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      <StatCard
        label={t('ehs.ehs_hazardous_material_page.text_9856ee')}
        value={stats.total}
        icon={<FlaskConical />}
        bgColor='error.light'
        iconBgColor='error.lighter'
        iconColor='error.main'
      />
      <StatCard
        label={t('ehs.ehs_hazardous_material_page.text_c516b4')}
        value={stats.expiring}
        icon={<AlertTriangle />}
        bgColor='background.paper'
        iconBgColor='warning.100'
        iconColor={ct.yellow[600]}
      />
      <StatCard
        label={t('ehs.ehs_hazardous_material_page.text_edaacc')}
        value={stats.severe}
        icon={<Package />}
        bgColor='background.paper'
        iconBgColor='error.100'
        iconColor='error.700'
      />
      <StatCard
        label={t('ehs.ehs_hazardous_material_page.inbound')}
        value={stats.thisMonth}
        icon={<Clock />}
        bgColor='background.paper'
        iconBgColor='primary.100'
        iconColor='primary.dark'
      />
    </Box>
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <FlaskConical sx={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.error.main} 0%, ${ct.error[600]} 100%)`,
      }}
      maxWidth='xl'
    >
      <CrudPage
        schema={hazardousMaterialSchema}
        apiAdapter={materialAdapter}
        breadcrumbs={[
          { label: t('ehs.title') },
          { label: i18n.t('pages.ehs_hazardous_material_page.k0') },
        ]}
        headerContent={headerContent}
        customRowActions={customRowActions}
      />

      {/* MSDS Dialog */}
      <Dialog
        open={showMSDSModal}
        onClose={() => setShowMSDSModal(false)}
        maxWidth='lg'
        fullWidth
      >
        <DialogTitle>
          MSDS - {selectedMaterialName || t('ehs.ehs_hazardous_material_page.description_2')}
        </DialogTitle>
        <DialogContent>
          {msdsLoading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  border: 3,
                  borderColor: 'primary.main',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  mx: 'auto',
                  mb: 2,
                }}
              />
              <Typography sx={{ color: 'slate.600' }}>
                {i18n.t('pages.ehs_hazardous_material_page.msds_1')}
              </Typography>
            </Box>
          ) : msdsData ? (
            <Box sx={{ pt: 2 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Box>
                  <Typography
                    sx={{
                      color: 'text.secondary',
                      fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    }}
                  >
                    {i18n.t('pages.ehs_hazardous_material_page.k0')}
                  </Typography>
                  <Typography sx={{ fontWeight: 500 }}>
                    {msdsData.product_name || msdsData.material_name || '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    sx={{
                      color: 'text.secondary',
                      fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    }}
                  >
                    {i18n.t('pages.ehs_hazardous_material_page.k1')}
                  </Typography>
                  <Typography>{msdsData.manufacturer || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    sx={{
                      color: 'text.secondary',
                      fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    }}
                  >
                    {i18n.t('pages.ehs_hazardous_material_page.k2')}
                  </Typography>
                  <Typography>{msdsData.emergency_phone || '-'}</Typography>
                </Box>
                <Box>
                  <Typography
                    sx={{
                      color: 'text.secondary',
                      fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                    }}
                  >
                    {i18n.t('pages.ehs_hazardous_material_page.k3')}
                  </Typography>
                  <Typography>{msdsData.version || '-'}</Typography>
                </Box>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  {i18n.t('pages.ehs_hazardous_material_page.k4')}
                </Typography>
                <Typography>
                  {msdsData.hazard_identification || t('ehs.ehs_hazardous_material_page.info')}
                </Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  {i18n.t('pages.ehs_hazardous_material_page.k5')}
                </Typography>
                <Typography>
                  {msdsData.first_aid_measures || t('ehs.ehs_hazardous_material_page.info')}
                </Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  {i18n.t('pages.ehs_hazardous_material_page.k6')}
                </Typography>
                <Typography>
                  {msdsData.fire_fighting_measures || t('ehs.ehs_hazardous_material_page.info')}
                </Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  {i18n.t('pages.ehs_hazardous_material_page.k7')}
                </Typography>
                <Typography>
                  {msdsData.accidental_release_measures ||
                    t('ehs.ehs_hazardous_material_page.info')}
                </Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant='subtitle2'
                  sx={{ fontWeight: 600, mb: 1 }}
                >
                  {i18n.t('pages.ehs_hazardous_material_page.k8')}
                </Typography>
                <Typography>
                  {msdsData.handling_and_storage || t('ehs.ehs_hazardous_material_page.info')}
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 6, color: 'slate.500' }}>
              {t('ehs.ehs_hazardous_material_page.msds_3')}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMSDSModal(false)}>
            {t('ehs.ehs_hazardous_material_page.k4')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default EhsHazardousMaterialPage;
