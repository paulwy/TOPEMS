import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react';
import { Box, Typography, Chip } from '@mui/material';
import type { Plugin } from '@/api/plugin';

interface PluginIntroTabProps {
  plugin: Plugin;
}

const PluginIntroTab: React.FC<PluginIntroTabProps> = ({ plugin }) => {
  const { t } = useTranslation();

  const features = [
    t('plugin.detail_page.feature.business_flow'),
    t('plugin.detail_page.feature.flexible_config'),
    t('plugin.detail_page.feature.rich_api'),
    t('plugin.detail_page.feature.multi_platform'),
    t('plugin.detail_page.feature.data_security'),
    t('plugin.detail_page.feature.continuous_update'),
  ];

  return (
    <Box>
      <Typography
        variant='h6'
        sx={{ fontWeight: 'bold', mb: 2 }}
      >
        {t('plugin.detail_page.section.plugin_intro')}
      </Typography>
      <Typography
        variant='body1'
        sx={{ mb: 4, lineHeight: 1.8 }}
      >
        {plugin.description}
      </Typography>

      <Typography
        variant='h6'
        sx={{ fontWeight: 'bold', mb: 2 }}
      >
        {t('plugin.detail_page.section.main_features')}
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 4 }}>
        {features.map((feature, idx) => (
          <Box
            key={`plugin-feature-${idx}`}
            sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
          >
            <CheckCircle sx={{ width: 20, height: 20, color: 'success.main', flexShrink: 0 }} />
            <Typography variant='body2'>{feature}</Typography>
          </Box>
        ))}
      </Box>

      <Typography
        variant='h6'
        sx={{ fontWeight: 'bold', mb: 2 }}
      >
        {t('plugin.detail_page.section.tags')}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {plugin.tags?.map((tag) => (
          <Chip
            key={tag}
            label={tag}
            variant='outlined'
          />
        ))}
      </Box>
    </Box>
  );
};

export default PluginIntroTab;
