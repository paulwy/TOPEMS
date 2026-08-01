import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, HardDrive, Shield } from 'lucide-react';
import {
  Box,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import type { PluginVersion } from '@/api/plugin';

interface PluginVersionsTabProps {
  versions: PluginVersion[];
  expandedVersion: string | null;
  onToggleVersion: (id: string) => void;
  formatFileSize: (bytes?: number) => string;
}

const PluginVersionsTab: React.FC<PluginVersionsTabProps> = ({
  versions,
  expandedVersion,
  onToggleVersion,
  formatFileSize,
}) => {
  const { t } = useTranslation();

  return (
    <Box>
      <Typography
        variant='h6'
        sx={{ fontWeight: 'bold', mb: 3 }}
      >
        {t('plugin.detail_page.section.version_history')}
      </Typography>
      {versions.length > 0 ? (
        versions.map((version) => (
          <Accordion
            key={version.id}
            expanded={expandedVersion === version.id}
            onChange={() => onToggleVersion(expandedVersion === version.id ? '' : version.id)}
            sx={{ mb: 2, borderRadius: 3 }}
          >
            <AccordionSummary
              expandIcon={expandedVersion === version.id ? <ChevronUp /> : <ChevronDown />}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography sx={{ fontWeight: 'medium' }}>{version.version}</Typography>
                {version.is_latest && (
                  <Chip
                    label={t('plugin.common.latest')}
                    size='small'
                    color='primary'
                  />
                )}
                {version.is_stable && (
                  <Chip
                    label={t('plugin.common.stable')}
                    size='small'
                    color='success'
                    variant='outlined'
                  />
                )}
                <Box sx={{ flexGrow: 1 }} />
                <Typography
                  variant='body2'
                  color='textSecondary'
                >
                  {new Date(version.created_at).toLocaleDateString()}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {version.release_notes && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant='subtitle2'
                    sx={{ mb: 1 }}
                  >
                    {t('plugin.detail_page.version.update_notes')}
                  </Typography>
                  <Typography
                    variant='body2'
                    color='textSecondary'
                  >
                    {version.release_notes}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <HardDrive sx={{ width: 16, height: 16, color: 'grey.500' }} />
                  <Typography
                    variant='body2'
                    color='textSecondary'
                  >
                    {t('plugin.detail_page.version.size_label', {
                      size: formatFileSize(version.filesize),
                    })}
                  </Typography>
                </Box>
                {version.min_app_version && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Shield sx={{ width: 16, height: 16, color: 'grey.500' }} />
                    <Typography
                      variant='body2'
                      color='textSecondary'
                    >
                      {t('plugin.detail_page.version.min_version_label', {
                        version: version.min_app_version,
                      })}
                    </Typography>
                  </Box>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))
      ) : (
        <Typography
          variant='body2'
          color='textSecondary'
        >
          {t('plugin.common.no_version_info')}
        </Typography>
      )}
    </Box>
  );
};

export default PluginVersionsTab;
