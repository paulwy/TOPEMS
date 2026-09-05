import { designTokens } from '@topems/tokens';
import React from 'react';
import CrudPage from '@/components/templates/CrudPage';
import { createCrudPageAdapter } from '@/schema/crudPageAdapter';
import { hazardSchema } from '@/schemas/ehs/hazard';
import { ehsApi } from '@/api/ehs';
import type { CreateSafetyHazardRequest } from '@/api/ehs';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography } from '@mui/material';
import { AlertTriangle, ShieldAlert, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

const HazardStats: React.FC = () => {
  const { t } = useTranslation('ehs');
  const { data } = useQuery({
    queryKey: [QUERY_KEYS.EHS.HAZARDS, 'stats'],
    queryFn: async () => {
      const response = await ehsApi.listHazards({ page: 0, pagesize: 1000 } as Parameters<
        typeof ehsApi.listHazards
      >[0]);
      if (!response.success) throw new Error(i18n.t('ehs.hazard_page.k0'));
      const result = response.data;
      return result?.items || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const hazards = data || [];
  const total = hazards.length;
  const active = hazards.filter((h) => h.status === 'active').length;
  const controlled = hazards.filter((h) => h.status === 'controlled').length;
  const highRisk = hazards.filter((h) => {
    const severityScore = { high: 3, medium: 2, low: 1 };
    const likelihoodScore = { high: 3, medium: 2, low: 1 };
    const exposureScore = { high: 3, medium: 2, low: 1 };
    const total =
      (severityScore[h.severity as keyof typeof severityScore] || 2) *
      (likelihoodScore[h.likelihood as keyof typeof likelihoodScore] || 2) *
      (exposureScore[h.exposure as keyof typeof exposureScore] || 2);
    return total >= 9;
  }).length;

  const statCards = [
    {
      label: i18n.t('ehs.hazard_page.k1'),
      value: total,
      color: 'error.light',
      textColor: 'text.secondary',
      icon: (
        <AlertTriangle
          size={20}
          color='error.main'
        />
      ),
    },
    {
      label: i18n.t('ehs.hazard_page.k2'),
      value: active,
      color: 'error.lighter',
      textColor: 'error.dark',
      icon: (
        <AlertTriangle
          size={20}
          color='error.dark'
        />
      ),
    },
    {
      label: i18n.t('ehs.hazard_page.k3'),
      value: controlled,
      color: 'warning.lighter',
      textColor: 'warning.dark',
      icon: (
        <ShieldAlert
          size={20}
          color='warning.dark'
        />
      ),
    },
    {
      label: i18n.t('ehs.hazard_page.k4'),
      value: highRisk,
      color: 'error.light',
      textColor: 'error.dark',
      icon: (
        <Clock
          size={20}
          color='error.dark'
        />
      ),
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 4,
      }}
    >
      {statCards.map((stat) => (
        <Box
          key={stat.label}
          sx={{ p: 2, bgcolor: stat.color, borderRadius: 3 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'action.hover',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {stat.icon}
            </Box>
            <Box>
              <Typography
                variant='body2'
                sx={{
                  color: 'slate.600',
                  fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                }}
              >
                {stat.label}
              </Typography>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'slate.900' }}
              >
                {stat.value}
              </Typography>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const hazardApiAdapter = createCrudPageAdapter({
  list: (params?) => ehsApi.listHazards(params),
  create: (data: CreateSafetyHazardRequest) => ehsApi.createHazard(data),
  update: (id, data) => ehsApi.updateHazard(id, data),
  delete: (id: string) => ehsApi.deleteHazard(id),
});

const HazardPage: React.FC = () => {
  return (
    <CrudPage
      schema={hazardSchema}
      apiAdapter={hazardApiAdapter}
      breadcrumbs={[
        { label: i18n.t('ehs.hazard_page.k9'), href: '/dashboard' },
        { label: 'EHS', href: '/ehs' },
        { label: i18n.t('ehs.hazard_page.k10') },
      ]}
      headerContent={<HazardStats />}
    />
  );
};

export default HazardPage;
