import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { MapPin, ArrowRight, Warehouse, Camera, Map, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

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

  const cards = [
    {
      count: statistics?.device_points || devicePointsLength,
      label: t('gis.index.stat_device_points'),
      icon: (
        <MapPin
          size={20}
          style={{ color: 'success.dark' } as React.CSSProperties}
        />
      ),
      bg: 'success.lighter' as const,
    },
    {
      count: statistics?.pipelines || pipelinesLength,
      label: t('gis.index.stat_pipelines'),
      icon: (
        <ArrowRight
          size={20}
          style={{ color: 'primary.light' } as React.CSSProperties}
        />
      ),
      bg: 'indigo.light' as const,
    },
    {
      count: statistics?.storage_locations || storageLocationsLength,
      label: t('gis.index.stat_storage_locations'),
      icon: (
        <Warehouse
          size={20}
          style={{ color: 'warning.dark' } as React.CSSProperties}
        />
      ),
      bg: 'warning.light' as const,
    },
    {
      count: statistics?.evidence_records || evidenceRecordsLength,
      label: t('gis.index.stat_evidence_records'),
      icon: (
        <Camera
          size={20}
          style={{ color: ct.pink.dark } as React.CSSProperties}
        />
      ),
      bg: 'secondary.100' as const,
    },
    {
      count: statistics?.factory_maps || factoryMapsLength,
      label: t('gis.index.stat_factory_maps'),
      icon: (
        <Map
          size={20}
          style={{ color: ct.purple.dark } as React.CSSProperties}
        />
      ),
      bg: 'secondary.100' as const,
    },
    {
      count: statistics?.business_locations || businessLocationsLength,
      label: t('gis.index.stat_business_locations'),
      icon: (
        <Building2
          size={20}
          style={{ color: ct.teal.main } as React.CSSProperties}
        />
      ),
      bg: ct.teal[100],
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
            borderColor: 'grey.100',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: card.bg,
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
