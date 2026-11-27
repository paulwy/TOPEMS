import React from 'react';
import { Grid } from '@/components';
import MetricCard from '@/components/bi/MetricCard';
import StatsChart from '@/components/bi/StatsChart';
import { MapPin, ArrowRight, Warehouse, Camera, Map, Building2 } from 'lucide-react';
import i18n from '@/i18n';
import { useTheme } from '@mui/material';

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
  const theme = useTheme();
  return (
    <>
      <Grid
        container
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <MetricCard
            title={i18n.t('bi.gis_page_components__stats_section.equipment')}
            value={statistics?.device_points || 0}
            icon={<MapPin size={24} />}
            gradient={[theme.palette.success.main, theme.palette.success.dark]}
            subtitle={`${i18n.t('pages.stats_section.k0')}${statistics?.active_devices || 0}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <MetricCard
            title={i18n.t('bi.gis_page_components__stats_section.pipeline_mgmt_card')}
            value={statistics?.pipelines || 0}
            icon={<ArrowRight size={24} />}
            gradient={[theme.palette.secondary[400], theme.palette.secondary[600]]}
            subtitle={`${i18n.t('pages.stats_section.k1')}${statistics?.active_pipelines || 0}`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <MetricCard
            title={i18n.t('bi.gis_page_components__stats_section.pipeline_mgmt_title')}
            value={statistics?.storage_locations || 0}
            icon={<Warehouse size={24} />}
            gradient={['warning.main', theme.palette.warning.dark]}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <MetricCard
            title={i18n.t('bi.gis_page_components__stats_section.storage_location_card')}
            value={statistics?.evidence_records || 0}
            icon={<Camera size={24} />}
            gradient={[theme.palette.pink[500], theme.palette.pink.dark]}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <MetricCard
            title={i18n.t('bi.gis_page_components__stats_section.plant_map_card')}
            value={statistics?.factory_maps || 0}
            icon={<Map size={24} />}
            gradient={[theme.palette.secondary.main, theme.palette.secondary.dark]}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
          <MetricCard
            title={i18n.t('bi.gis_page_components__stats_section.business_location_card')}
            value={statistics?.business_locations || 0}
            icon={<Building2 size={24} />}
            gradient={[theme.palette.teal.main, theme.palette.teal.dark]}
          />
        </Grid>
      </Grid>
      <Grid
        container
        spacing={3}
        sx={{ mb: 4 }}
      >
        <Grid size={{ xs: 12, lg: 6 }}>
          <StatsChart
            title={i18n.t('bi.gis_page_components__stats_section.type')}
            type='pie'
            data={[
              {
                name: i18n.t('bi.gis_page_components__stats_section.equipment'),
                value: statistics?.device_points || 0,
                color: theme.palette.success[700],
              },
              {
                name: i18n.t('bi.gis_page_components__stats_section.pipeline_label'),
                value: statistics?.pipelines || 0,
                color: theme.palette.secondary[400],
              },
              {
                name: i18n.t('bi.gis_page_components__stats_section.pipeline_mgmt_title'),
                value: statistics?.storage_locations || 0,
                color: 'warning.700',
              },
              {
                name: i18n.t('bi.gis_page_components__stats_section.plant_map_card'),
                value: statistics?.factory_maps || 0,
                color: 'secondary.main',
              },
              {
                name: i18n.t('bi.gis_page_components__stats_section.business_location_card'),
                value: statistics?.business_locations || 0,
                color: theme.palette.teal.main,
              },
            ].filter((d) => d.value > 0)}
            dataKey='value'
            nameKey='name'
          />
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <StatsChart
            title={i18n.t('bi.gis_page_components__stats_section.status')}
            type='bar'
            data={[
              {
                name: i18n.t('bi.gis_page_components__stats_section.equipment'),
                [i18n.t('pages.stats_section.k0')]: statistics?.active_devices || 0,
                [i18n.t('pages.stats_section.k1')]: statistics?.device_points || 0,
              },
              {
                name: i18n.t('bi.gis_page_components__stats_section.pipeline_label'),
                [i18n.t('pages.stats_section.k2')]: statistics?.active_pipelines || 0,
                [i18n.t('pages.stats_section.k3')]: statistics?.pipelines || 0,
              },
            ]}
            dataKey='name'
            yKeys={[
              i18n.t('bi.gis_page_components__stats_section.active_2'),
              i18n.t('bi.gis_page_components__stats_section.disabled_status'),
            ]}
            colors={[theme.palette.success.main, theme.palette.secondary[400]]}
          />
        </Grid>
      </Grid>
    </>
  );
};
