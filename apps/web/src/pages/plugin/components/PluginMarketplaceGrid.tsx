import React from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Star, Download, ExternalLink } from 'lucide-react';
import { Box, Card, CardContent, Typography, Button, Chip } from '@mui/material';
import type { Plugin } from '@/api/plugin';
import { PluginInstallProgress } from './PluginInstallProgress';

type HealthStatus = Record<string, { healthy: boolean; status?: string; latency?: number }>;

export interface PluginCardProps {
  plugin: Plugin;
  healthStatus?: boolean;
  onViewDetails?: () => void;
}

export const PluginCard: React.FC<PluginCardProps> = ({ plugin, healthStatus, onViewDetails }) => {
  const { t } = useTranslation();

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        '&:hover': { boxShadow: 4 },
        transition: 'box-shadow 0.3s ease',
        borderRadius: 3,
      }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                background: 'linear-gradient(135deg, primary.main 0%, primary.main 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package
                sx={{
                  width: 24,
                  height: 24,
                  color: 'common.white',
                }}
              />
            </Box>
            <Box>
              <Typography
                variant='h6'
                sx={{ fontWeight: 'bold' }}
              >
                {plugin.name}
              </Typography>
              <Typography
                variant='body2'
                color='textSecondary'
              >
                v{plugin.version}
              </Typography>
            </Box>
          </Box>
          {healthStatus !== undefined && (
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: healthStatus ? 'success.main' : 'error.main',
              }}
            />
          )}
        </Box>

        <Typography
          variant='body2'
          color='textSecondary'
          sx={{ mb: 3, flexGrow: 1 }}
        >
          {plugin.description || t('plugin.common.no_description')}
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          {plugin.tags?.slice(0, 3).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size='small'
              variant='outlined'
              sx={{ fontSize: 10 }}
            />
          ))}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Star sx={{ width: 16, height: 16, color: 'warning.main', fill: 'warning.main' }} />
            <Typography
              variant='body2'
              sx={{ fontWeight: 'medium' }}
            >
              {plugin.rating || 0}
            </Typography>
            <Typography
              variant='body2'
              color='textSecondary'
            >
              ({plugin.rating_count || 0})
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Download sx={{ width: 16, height: 16, color: 'grey.400' }} />
            <Typography
              variant='body2'
              color='textSecondary'
            >
              {plugin.install_count?.toLocaleString() || 0}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant='outlined'
            size='small'
            fullWidth
            onClick={onViewDetails}
            startIcon={<ExternalLink sx={{ width: 16, height: 16 }} />}
          >
            {t('plugin.common.details')}
          </Button>
          <PluginInstallProgress
            plugin={plugin}
            size='small'
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export interface PluginMarketplaceGridProps {
  plugins: Plugin[];
  healthStatus: HealthStatus;
  viewMode: 'grid' | 'list';
  onViewDetails: (plugin: Plugin) => void;
}

const PluginMarketplaceGrid: React.FC<PluginMarketplaceGridProps> = ({
  plugins,
  healthStatus,
  viewMode,
  onViewDetails,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gap: 6,
          gridTemplateColumns:
            viewMode === 'grid' ? { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' } : '1fr',
        }}
      >
        {plugins.map((plugin) => (
          <PluginCard
            key={plugin.id}
            plugin={plugin}
            healthStatus={healthStatus[plugin.code]?.healthy}
            onViewDetails={() => onViewDetails(plugin)}
          />
        ))}
      </Box>

      {plugins.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 16 }}>
          <Package sx={{ width: 64, height: 64, color: 'grey.300', mx: 'auto', mb: 4 }} />
          <Typography
            variant='h6'
            sx={{ fontWeight: 'medium' }}
          >
            {t('plugin.marketplace_page.empty_title')}
          </Typography>
          <Typography
            variant='body2'
            color='textSecondary'
          >
            {t('plugin.marketplace_page.empty_hint')}
          </Typography>
        </Box>
      )}
    </>
  );
};

export default PluginMarketplaceGrid;
