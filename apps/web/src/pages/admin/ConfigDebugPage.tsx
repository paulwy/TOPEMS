import React from 'react';
import { Box, Paper, Typography, Card, CardContent, CardHeader } from '@mui/material';
import { Server, Database, Code } from 'lucide-react';
import config from '../../config/runtime';
import { SettingsPageTemplate, type SettingSection } from '@/components/templates';
import { PageContainer } from '@/components/common';

const ConfigDebugPage: React.FC = () => {
  const sections: SettingSection[] = [
    {
      id: 'services',
      title: '服务配置',
      description: '各微服务的连接配置信息',
      icon: <Server style={{ width: 20, height: 20 }} />,
      color: 'primary',
      fields: [],
    },
    {
      id: 'api',
      title: 'API 配置',
      description: 'API 端点和请求配置',
      icon: <Database style={{ width: 20, height: 20 }} />,
      color: 'success',
      fields: [],
    },
    {
      id: 'env',
      title: '环境变量',
      description: '前端运行时环境变量',
      icon: <Code style={{ width: 20, height: 20 }} />,
      color: 'warning',
      fields: [],
    },
  ];

  return (
    <SettingsPageTemplate
      title='配置诊断'
      subtitle='系统配置信息和环境变量'
      sections={sections}
      showSaveButton={false}
      showResetButton={false}
    >
      <Box sx={{ mt: 2 }}>
        <Paper sx={{ borderRadius: 2, mb: 3, overflow: 'hidden' }}>
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
                    服务配置
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    各微服务的连接配置信息
                  </Typography>
                </Box>
              </Box>
            }
          />
          <CardContent>
            <pre
              style={{
                backgroundColor: '#1a1a2e',
                color: '#e0e0e0',
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

        <Paper sx={{ borderRadius: 2, mb: 3, overflow: 'hidden' }}>
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
                    API 配置
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    API 端点和请求配置
                  </Typography>
                </Box>
              </Box>
            }
          />
          <CardContent>
            <pre
              style={{
                backgroundColor: '#1a1a2e',
                color: '#e0e0e0',
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

        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
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
                    环境变量
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    前端运行时环境变量
                  </Typography>
                </Box>
              </Box>
            }
          />
          <CardContent>
            <pre
              style={{
                backgroundColor: '#1a1a2e',
                color: '#e0e0e0',
                padding: 16,
                borderRadius: 8,
                overflow: 'auto',
                fontSize: 14,
                fontFamily: 'monospace',
              }}
            >
              {Object.entries(import.meta.env)
                .filter(([key]) => key.startsWith('VITE_'))
                .map(([key, value]) => `${key}=${value}`)
                .join('\n')}
            </pre>
          </CardContent>
        </Paper>
      </Box>
    </SettingsPageTemplate>
  );
};

export default ConfigDebugPage;
