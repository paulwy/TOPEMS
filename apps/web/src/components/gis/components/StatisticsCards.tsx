import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { MapPin, ArrowRight, Warehouse, Camera, Map, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { semanticTileSx } from '@/theme/semanticTile';

interface StatisticsCardsProps {
  statistics?: {
    device_points?: number;
    pipelines?: number;
    storage_locations?: number;
    evidence_records?: number;
    factory_maps?: number;
    business_locations?: number;
  } | null;
  devicePointsLength: number;
  pipelinesLength: number;
  storageLocationsLength: number;
  evidenceRecordsLength: number;
  factoryMapsLength: number;
  businessLocationsLength: number;
}

export const StatisticsCards: React.FC<StatisticsCardsProps> = ({
  statistics,
  devicePointsLength,
  pipelinesLength,
  storageLocationsLength,
  evidenceRecordsLength,
  factoryMapsLength,
  businessLocationsLength,
}) => {
  const { t } = useTranslation();

  // 瓦片统一走语义软底：原先 bg 用 'success.lighter'/'indigo.light' 这类不存在的色阶，
  // 整条背景被丢弃，图标则用旧 --success-text/--warning-text 变量，暗色下压白底不可辨。
  const cards = [
    {
      count: statistics?.device_points || devicePointsLength,
      label: t('gis.index.stat_device_points'),
      icon: <MapPin size={20} />,
      key: 'success',
    },
    {
      count: statistics?.pipelines || pipelinesLength,
      label: t('gis.index.stat_pipelines'),
      icon: <ArrowRight size={20} />,
      key: 'primary',
    },
    {
      count: statistics?.storage_locations || storageLocationsLength,
      label: t('gis.index.stat_storage_locations'),
      icon: <Warehouse size={20} />,
      key: 'warning',
    },
    {
      count: statistics?.evidence_records || evidenceRecordsLength,
      label: t('gis.index.stat_evidence_records'),
      icon: <Camera size={20} />,
      key: 'secondary',
    },
    {
      count: statistics?.factory_maps || factoryMapsLength,
      label: t('gis.index.stat_factory_maps'),
      icon: <Map size={20} />,
      key: 'secondary',
    },
    {
      count: statistics?.business_locations || businessLocationsLength,
      label: t('gis.index.stat_business_locations'),
      icon: <Building2 size={20} />,
      key: 'info',
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(6, 1fr)',
        },
        gap: 4,
        mb: 6,
      }}
    >
      {cards.map((card, index) => (
        <Paper
          key={index}
          sx={{
            borderRadius: 2,
            p: 4,
            boxShadow: 1,
            border: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                ...semanticTileSx(card.key, 0.14),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {card.icon}
            </Box>
            <Box>
              <Typography
                variant='h6'
                sx={{ fontWeight: 700, color: 'text.primary' }}
              >
                {card.count}
              </Typography>
              <Typography
                variant='body2'
                sx={{ color: 'text.secondary' }}
              >
                {card.label}
              </Typography>
            </Box>
          </Box>
        </Paper>
      ))}
    </Box>
  );
};
