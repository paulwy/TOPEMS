import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Package, Star, Download, Shield, ArrowLeft } from 'lucide-react';
import { Box, Typography, Button, Chip } from '@mui/material';
import { PluginRating } from '@/components/plugin';
import { PLUGIN_PATHS } from '@/modules/plugin/config';
import type { Plugin } from '@/api/plugin';

interface PluginDetailHeaderProps {
  plugin: Plugin;
  averageRating: number;
  reviewsCount: number;
  healthStatusValue: { healthy: boolean } | null;
}

const PluginDetailHeader: React.FC<PluginDetailHeaderProps> = ({
  plugin,
  averageRating,
  reviewsCount,
  healthStatusValue,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box sx={{ mb: 4 }}>
      <Button
        startIcon={<ArrowLeft sx={{ width: 20, height: 20 }} />}
        onClick={() => navigate(PLUGIN_PATHS.marketplace)}
        sx={{ mb: 3 }}
      >
        {t('plugin.detail_page.back_to_market')}
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3, mb: 4 }}>
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: 3,
            flexShrink: 0,
            background: 'linear-gradient(135deg, primary.light 0%, primary.main 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Package sx={{ width: 36, height: 36, color: 'common.white' }} />
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Typography
              variant='h4'
              sx={{ fontWeight: 'bold' }}
            >
              {plugin.name}
            </Typography>
            <Chip
              label={`v${plugin.version}`}
              size='small'
              variant='outlined'
            />
            {plugin.is_featured && (
              <Chip
                icon={<Star sx={{ width: 14, height: 14 }} />}
                label={t('plugin.common.featured')}
                size='small'
                color='warning'
              />
            )}
            {healthStatusValue && (
              <Chip
                label={
                  healthStatusValue.healthy
                    ? t('plugin.status.running')
                    : t('plugin.status.unhealthy')
                }
                size='small'
                color={healthStatusValue.healthy ? 'success' : 'error'}
              />
            )}
          </Box>
          <Typography
            variant='body1'
            color='textSecondary'
            sx={{ mb: 2 }}
          >
            {plugin.description}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <PluginRating
              value={averageRating || plugin.rating || 0}
              count={reviewsCount}
              size='medium'
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Download sx={{ width: 18, height: 18, color: 'grey.500' }} />
              <Typography variant='body2'>
                {t('plugin.detail_page.install_count', {
                  count: plugin.install_count?.toLocaleString() || 0,
                })}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Shield sx={{ width: 18, height: 18, color: 'grey.500' }} />
              <Typography variant='body2'>
                {plugin.author_name || t('plugin.common.unknown_author')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PluginDetailHeader;
