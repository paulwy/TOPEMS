import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Loader2, ShoppingCart } from 'lucide-react';
import { Box, Typography, Button, Chip, Divider, Card, CardContent, Rating } from '@mui/material';
import type { Plugin, PluginReview } from '@/api/plugin';

interface PluginDetailSidebarProps {
  plugin: Plugin;
  installed: boolean;
  isInstalling: boolean;
  onInstall: () => void;
  averageRating: number;
  reviews: PluginReview[];
}

const PluginDetailSidebar: React.FC<PluginDetailSidebarProps> = ({
  plugin,
  installed,
  isInstalling,
  onInstall,
  averageRating,
  reviews,
}) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ position: 'sticky', top: 24 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 'bold', mb: 1 }}
            >
              {plugin.is_free
                ? ` + ${t('plugin.common.free')} + `
                : `¥${((plugin.price_cents || 0) / 100).toFixed(2)}`}
            </Typography>
            {!plugin.is_free && (
              <Typography
                variant='body2'
                color='textSecondary'
              >
                {t('plugin.detail_page.pricing.permanent_usage')}
              </Typography>
            )}
          </Box>

          <Button
            variant='contained'
            fullWidth
            size='large'
            disabled={installed || isInstalling}
            onClick={onInstall}
            startIcon={
              installed ? (
                <CheckCircle sx={{ width: 20, height: 20 }} />
              ) : isInstalling ? (
                <Loader2 sx={{ width: 20, height: 20, animation: 'spin 1s linear infinite' }} />
              ) : (
                <ShoppingCart sx={{ width: 20, height: 20 }} />
              )
            }
          >
            {installed
              ? t('plugin.common.installed')
              : isInstalling
                ? t('plugin.common.installing')
                : plugin.is_free
                  ? t('plugin.common.install_now')
                  : t('plugin.common.buy_now')}
          </Button>

          <Divider />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color='textSecondary'>{t('plugin.field.category')}</Typography>
              <Typography sx={{ fontWeight: 'medium' }}>{plugin.category}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color='textSecondary'>{t('plugin.field.type')}</Typography>
              <Chip
                label={
                  plugin.plugin_type === 'core'
                    ? t('plugin.plugin_type.core')
                    : t('plugin.plugin_type.business')
                }
                size='small'
                variant='outlined'
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color='textSecondary'>{t('plugin.field.latest_version')}</Typography>
              <Typography sx={{ fontWeight: 'medium' }}>v{plugin.version}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color='textSecondary'>{t('plugin.field.publish_time')}</Typography>
              <Typography sx={{ fontWeight: 'medium' }}>
                {plugin.created_at ? new Date(plugin.created_at).toLocaleDateString() : '-'}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography
            variant='h6'
            sx={{ fontWeight: 'bold', mb: 2 }}
          >
            {t('plugin.common.rating_overview')}
          </Typography>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography
              variant='h3'
              sx={{ fontWeight: 'bold' }}
            >
              {(averageRating || plugin.rating || 0).toFixed(1)}
            </Typography>
            <Rating
              value={averageRating || plugin.rating || 0}
              readOnly
            />
            <Typography
              variant='body2'
              color='textSecondary'
            >
              {t('plugin.common.review_count', { count: reviews.length })}
            </Typography>
          </Box>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = reviews.filter((r) => Math.floor(r.rating || 0) === star).length;
            const percent = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            return (
              <Box
                key={star}
                sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}
              >
                <Typography
                  variant='body2'
                  sx={{ width: 24 }}
                >
                  {t('plugin.common.star_label', { star })}
                </Typography>
                <Box
                  sx={{
                    flexGrow: 1,
                    height: 8,
                    bgcolor: 'grey.200',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: `${percent}%`,
                      height: '100%',
                      bgcolor: 'warning.main',
                      borderRadius: 4,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </Box>
                <Typography
                  variant='body2'
                  color='textSecondary'
                  sx={{ width: 32, textAlign: 'right' }}
                >
                  {count}
                </Typography>
              </Box>
            );
          })}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PluginDetailSidebar;
