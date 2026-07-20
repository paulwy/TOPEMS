import React from 'react';
import { Grid } from '@/components';
import MetricCard from '@/components/bi/MetricCard';
import StatsChart from '@/components/bi/StatsChart';
import { MapPin, ArrowRight, Warehouse, Camera, Map, Building2 } from 'lucide-react';
import { designTokens } from '@/theme/tokens';

import { useTranslation } from 'react-i18next';
const ct = designTokens.colors;

interface StatsSectionProps {
  statistics: {
    device_points?: number;
    active_devices?: number;
    pipelines?: number;
    active_pipelines?: number;
    storage_locations?: number;
    evidence_records?: number;
    factory_maps?: number;
    business_locations?: number;
  } | null;
}

export const StatsSection: React.FC<StatsSectionProps> = ({ statistics }) => {
  const { t } = useTranslation();
  return (
    <>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <MetricCard
            title={t('bi.gis_page_components__stats_section.equipment')}
            value={statistics?.device_points || 0}
            icon={<MapPin size={24} />}
            gradient={[ct.success.main, ct.success.dark]}
            subtitle={`启用: ${statistics?.active_devices || 0}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <MetricCard
            title={t('bi.gis_page_components__stats_section.text_09a0d3')}
            value={statistics?.pipelines || 0}
            icon={<ArrowRight size={24} />}
            gradient={[ct.secondary[400], ct.secondary[600]]}
            subtitle={`启用: ${statistics?.active_pipelines || 0}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <MetricCard
            title={t('bi.gis_page_components__stats_section.text_423a98')}
            value={statistics?.storage_locations || 0}
            icon={<Warehouse size={24} />}
            gradient={['warning.main', ct.warning.dark]}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <MetricCard
            title={t('bi.gis_page_components__stats_section.text_3548b7')}
            value={statistics?.evidence_records || 0}
            icon={<Camera size={24} />}
            gradient={[ct.pink[500], ct.pink.dark]}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <MetricCard
            title={t('bi.gis_page_components__stats_section.text_0ab201')}
            value={statistics?.factory_maps || 0}
            icon={<Map size={24} />}
            gradient={[ct.secondary.main, ct.secondary.dark]}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <MetricCard
            title={t('bi.gis_page_components__stats_section.text_71c01c')}
            value={statistics?.business_locations || 0}
            icon={<Building2 size={24} />}
            gradient={[ct.teal.main, ct.teal.dark]}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <StatsChart
            title={t('bi.gis_page_components__stats_section.type')}
            type='pie'
            data={[
              {
                name: t('bi.gis_page_components__stats_section.equipment'),
                value: statistics?.device_points || 0,
                color: ct.success.main,
              },
              {
                name: t('bi.gis_page_components__stats_section.text_87c037'),
                value: statistics?.pipelines || 0,
                color: ct.secondary[400],
              },
              {
                name: t('bi.gis_page_components__stats_section.text_423a98'),
                value: statistics?.storage_locations || 0,
                color: 'warning.main',
              },
              {
                name: t('bi.gis_page_components__stats_section.text_0ab201'),
                value: statistics?.factory_maps || 0,
                color: 'secondary.main',
              },
              {
                name: t('bi.gis_page_components__stats_section.text_71c01c'),
                value: statistics?.business_locations || 0,
                color: ct.teal.main,
              },
            ].filter((d) => d.value > 0)}
            dataKey='value'
            nameKey='name'
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <StatsChart
            title={t('bi.gis_page_components__stats_section.status')}
            type='bar'
            data={[
              {
                name: t('bi.gis_page_components__stats_section.equipment'),
                启用: statistics?.active_devices || 0,
                总数: statistics?.device_points || 0,
              },
              {
                name: t('bi.gis_page_components__stats_section.text_87c037'),
                启用: statistics?.active_pipelines || 0,
                总数: statistics?.pipelines || 0,
              },
            ]}
            dataKey='name'
            yKeys={[t('bi.gis_page_components__stats_section.active_2'), t('bi.gis_page_components__stats_section.text_9ed7d3')]}
            colors={[ct.success.main, ct.secondary[400]]}
          />
        </Grid>
      </Grid>
    </>
  );
};
