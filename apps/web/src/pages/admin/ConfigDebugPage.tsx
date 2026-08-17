import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Typography, CardContent, CardHeader } from '@mui/material';
import { Server, Database, Code } from 'lucide-react';
import config from '../../config/runtime';
import { SettingsPageTemplate, type SettingSection } from '@/components/templates';
import { designTokens } from '@/theme/tokens';
import i18n from '@/i18n';
import { adminApi } from '@/api/admin';

const ct = designTokens.colors;
const ConfigDebugPage: React.FC = () => {
  const { data: backendData, isLoading: isBackendLoading } = useQuery({
    queryKey: ['admin-config-debug'],
    queryFn: async () => {
      try {
        // TODO: adminApi 暂无 config debug 对应方法
        return {};
      } catch {
        return {};
      }
    },
  });
  const sections: SettingSection[] = [
    {
      id: 'services',
      title: i18n.t('admin.config_debug_page.k0'),
      description: i18n.t('admin.config_debug_page.k1'),
      icon: <Server style={{ width: 20, height: 20 }} />,
      color: 'primary',
      fields: [],
    },
    {
      id: 'api',
      title: i18n.t('pages.config_debug_page.api_0'),
      description: i18n.t('pages.config_debug_page.api_1'),
      icon: <Database style={{ width: 20, height: 20 }} />,
      color: 'success',
      fields: [],
    },
    {
      id: 'env',
      title: i18n.t('admin.config_debug_page.k2'),
      description: i18n.t('admin.config_debug_page.k3'),
      icon: <Code style={{ width: 20, height: 20 }} />,
      color: 'warning',
      fields: [],
    },
  ];
  return (
    <SettingsPageTemplate
      title={i18n.t('admin.config_debug_page.k4')}
      subtitle={i18n.t('admin.config_debug_page.k5')}
      sections={sections}
      showSaveButton={false}
      showResetButton={false}
    >
      <Box sx={{ mt: 2 }}>
        <Paper sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'primary.light',
                    color: 'primary.main',
                  }}
                >
                  <Server style={{ width: 20, height: 20 }} />
                </Box>
                <Box>
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 600 }}
                  >
                    {i18n.t('pages.config_debug_page.k0')}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('pages.config_debug_page.k1')}
                  </Typography>
                </Box>
              </Box>
            }
          />
          <CardContent>
            <pre
              style={{
                backgroundColor: ct.grey[900],
                color: ct.grey[200],
                padding: 16,
                borderRadius: 8,
                overflow: 'auto',
                fontSize: 14,
              }}
            >
              {JSON.stringify(config.services, null, 2)}
            </pre>
          </CardContent>
        </Paper>
        <Paper sx={{ borderRadius: 3, mb: 3, overflow: 'hidden' }}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'success.light',
                    color: 'success.main',
                  }}
                >
                  <Database style={{ width: 20, height: 20 }} />
                </Box>
                <Box>
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 600 }}
                  >
                    {i18n.t('pages.config_debug_page.api_2')}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('pages.config_debug_page.api_3')}
                  </Typography>
                </Box>
              </Box>
            }
          />
          <CardContent>
            <pre
              style={{
                backgroundColor: ct.grey[900],
                color: ct.grey[200],
                padding: 16,
                borderRadius: 8,
                overflow: 'auto',
                fontSize: 14,
              }}
            >
              {JSON.stringify(config.api, null, 2)}
            </pre>
          </CardContent>
        </Paper>
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <CardHeader
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'warning.light',
                    color: 'warning.main',
                  }}
                >
                  <Code style={{ width: 20, height: 20 }} />
                </Box>
                <Box>
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 600 }}
                  >
                    {i18n.t('pages.config_debug_page.k4')}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('pages.config_debug_page.k5')}
                  </Typography>
                </Box>
              </Box>
            }
          />
          <CardContent>
            <pre
              style={{
                backgroundColor: ct.grey[900],
                color: ct.grey[200],
                padding: 16,
                borderRadius: 8,
                overflow: 'auto',
                fontSize: 14,
                fontFamily: 'monospace',
              }}
            >
              {typeof import.meta !== 'undefined' && import.meta.env
                ? Object.entries(import.meta.env)
                    .filter(([key]) => key.startsWith('VITE_'))
                    .map(([key, value]) => `${key}=${value}`)
                    .join('\n')
                : 'import.meta.env not available'}
            </pre>
          </CardContent>
        </Paper>
      </Box>
    </SettingsPageTemplate>
  );
};
export default ConfigDebugPage;
