import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Stack, Chip, Button } from '@mui/material';
import { Settings, Database, Cloud, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { useErpConnections } from '@/hooks/useExternalErp';
import { PageContainer } from '@/components/common';
import { INTEGRATION_PATHS } from '@/modules/integration/config';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

interface ErpConnection {
  id: string;
  type: string;
  name: string;
  api_url: string;
  sync_direction: string;
  sync_mode: string;
  status?: string;
  isactive?: boolean;
  last_sync_at?: string;
}

function getErpTypeConfig(): Record<string, { name: string; logo: string; color: string }> {
  return {
    kingdee: {
      name: i18n.t('integration.integration_external_erp_overview_page.k3_0'),
      logo: 'K',
      color: 'primary.main',
    },
    yonyou: {
      name: i18n.t('integration.integration_external_erp_overview_page.u8_1'),
      logo: 'Y',
      color: 'warning.main',
    },
    sap: {
      name: 'SAP S/4',
      logo: 'S',
      color: 'success.dark',
    },
  };
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: 'success' | 'default' | 'error' | 'warning' }
> = {
  connected: {
    label: i18n.t('integration.integration_external_erp_overview_page.k2'),
    color: 'success',
  },
  disconnected: {
    label: i18n.t('integration.integration_external_erp_overview_page.k3'),
    color: 'default',
  },
  error: {
    label: i18n.t('integration.integration_external_erp_overview_page.k4'),
    color: 'error',
  },
  syncing: {
    label: i18n.t('integration.integration_external_erp_overview_page.k5'),
    color: 'warning',
  },
};

const IntegrationExternalErpOverviewPage: React.FC = () => {
  const { t } = useTranslation('integration');
  const navigate = useNavigate();
  const { data: connectionsData } = useErpConnections();

  const connections = useMemo(() => {
    return connectionsData?.data?.items || [];
  }, [connectionsData]);

  const connectionStats = useMemo(() => {
    const stats = {
      total: connections.length,
      connected: connections.filter((c: ErpConnection) => c.status === 'connected').length,
      active: connections.filter((c: ErpConnection) => c.isactive).length,
      disconnected: connections.filter((c: ErpConnection) => c.status !== 'connected').length,
    };
    return stats;
  }, [connections]);

  const groupedByType = useMemo(() => {
    const groups: Record<string, ErpConnection[]> = {};
    connections.forEach((conn: ErpConnection) => {
      if (!groups[conn.type]) {
        groups[conn.type] = [];
      }
      groups[conn.type].push(conn);
    });
    return groups;
  }, [connections]);

  return (
    <PageContainer maxWidth='xl'>
      <Box>
        <Stack
          direction='row'
          sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
        >
          <Box>
            <Typography
              variant='h5'
              sx={{ fontWeight: 700, color: 'text.primary' }}
            >
              🔗 {t('integration.integration_external_erp_overview_page.m1')}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('integration.integration_external_erp_overview_page.e1')}
            </Typography>
          </Box>
          <Button
            variant='contained'
            startIcon={<Settings size={18} />}
            onClick={() => navigate(INTEGRATION_PATHS.externalErp)}
            sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
          >
            {t('integration.integration_external_erp_overview_page.e2')}
          </Button>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          <Card>
            <CardContent sx={{ pt: 3 }}>
              <Stack
                direction='row'
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    {t('integration.integration_external_erp_overview_page.e3')}
                  </Typography>
                  <Typography
                    variant='h4'
                    sx={{ fontWeight: 700, mt: 0.5 }}
                  >
                    {connectionStats.total}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    bgcolor: 'primary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Database
                    size={24}
                    color='primary.main'
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ pt: 3 }}>
              <Stack
                direction='row'
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    {t('integration.integration_external_erp_overview_page.e4')}
                  </Typography>
                  <Typography
                    variant='h4'
                    sx={{ fontWeight: 700, mt: 0.5, color: 'success.main' }}
                  >
                    {connectionStats.connected}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    bgcolor: 'success.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle
                    size={24}
                    color='success.main'
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ pt: 3 }}>
              <Stack
                direction='row'
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    {t('integration.integration_external_erp_overview_page.e5')}
                  </Typography>
                  <Typography
                    variant='h4'
                    sx={{ fontWeight: 700, mt: 0.5, color: 'secondary.main' }}
                  >
                    {connectionStats.active}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    bgcolor: 'secondary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Zap
                    size={24}
                    color='secondary.main'
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ pt: 3 }}>
              <Stack
                direction='row'
                sx={{ alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Box>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    {t('integration.integration_external_erp_overview_page.e6')}
                  </Typography>
                  <Typography
                    variant='h4'
                    sx={{ fontWeight: 700, mt: 0.5, color: 'error.main' }}
                  >
                    {connectionStats.disconnected}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    bgcolor: 'error.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertCircle
                    size={24}
                    color='error.main'
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
            mb: 3,
          }}
        >
          {Object.entries(groupedByType).map(([type, conns]) => {
            const config = getErpTypeConfig()[type] || {
              name: type,
              logo: '?',
              color: 'text.disabled',
            };
            return (
              <Card
                key={type}
                sx={{
                  borderColor: config.color,
                  borderWidth: 2,
                  borderStyle: 'solid',
                }}
              >
                <CardContent>
                  <Stack
                    direction='row'
                    sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
                  >
                    <Typography
                      variant='h6'
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Cloud size={20} /> {config.name}
                    </Typography>
                    <Chip
                      label={t('integration.integration_external_erp_overview_page.e7')}
                      size='small'
                    />
                  </Stack>

                  <Stack spacing={2}>
                    {conns.map((conn: ErpConnection) => {
                      const statusConfig = STATUS_CONFIG[conn.status || 'disconnected'];
                      return (
                        <Stack
                          key={conn.id}
                          direction='row'
                          sx={{
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 2,
                            borderRadius: 1,
                            bgcolor: 'grey.50',
                          }}
                        >
                          <Box>
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 500 }}
                            >
                              {conn.name}
                            </Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {conn.sync_direction === 'bidirectional'
                                ? t('integration.integration_external_erp_overview_page.k6')
                                : conn.sync_direction === 'import'
                                  ? t('integration.integration_external_erp_overview_page.k7')
                                  : t('integration.integration_external_erp_overview_page.k8')}
                              {' / '}
                              {conn.sync_mode === 'realtime'
                                ? t('integration.integration_external_erp_overview_page.k9')
                                : conn.sync_mode === 'scheduled'
                                  ? t('integration.integration_external_erp_overview_page.k10')
                                  : t('integration.integration_external_erp_overview_page.k11')}
                            </Typography>
                          </Box>
                          <Chip
                            label={statusConfig.label}
                            color={statusConfig.color}
                            size='small'
                          />
                        </Stack>
                      );
                    })}
                  </Stack>

                  <Button
                    size='small'
                    variant='outlined'
                    startIcon={<Settings size={14} />}
                    onClick={() => navigate(INTEGRATION_PATHS.externalErp)}
                    sx={{ mt: 2 }}
                  >
                    {t('integration.integration_external_erp_overview_page.e2')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {Object.keys(groupedByType).length === 0 && (
            <>
              <Card
                sx={{
                  borderColor: 'primary.main',
                  borderWidth: 2,
                  borderStyle: 'solid',
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.8 },
                }}
                onClick={() => navigate(INTEGRATION_PATHS.externalErp)}
              >
                <CardContent>
                  <Stack
                    direction='row'
                    sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
                  >
                    <Typography
                      variant='h6'
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Cloud size={20} />{' '}
                      {t('integration.integration_external_erp_overview_page.m2')}
                    </Typography>
                  </Stack>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('integration.integration_external_erp_overview_page.e9')}
                  </Typography>
                  <Button
                    size='small'
                    variant='contained'
                    startIcon={<Settings size={14} />}
                    sx={{ mt: 2, bgcolor: 'primary.dark' }}
                  >
                    {t('integration.integration_external_erp_overview_page.e2')}
                  </Button>
                </CardContent>
              </Card>

              <Card
                sx={{
                  borderColor: 'warning.main',
                  borderWidth: 2,
                  borderStyle: 'solid',
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.8 },
                }}
                onClick={() => navigate(INTEGRATION_PATHS.externalErp)}
              >
                <CardContent>
                  <Stack
                    direction='row'
                    sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
                  >
                    <Typography
                      variant='h6'
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Cloud size={20} />{' '}
                      {t('integration.integration_external_erp_overview_page.m3')}
                    </Typography>
                  </Stack>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('integration.integration_external_erp_overview_page.e11')}
                  </Typography>
                  <Button
                    size='small'
                    variant='contained'
                    startIcon={<Settings size={14} />}
                    sx={{ mt: 2, bgcolor: 'warning.600' }}
                  >
                    {t('integration.integration_external_erp_overview_page.e2')}
                  </Button>
                </CardContent>
              </Card>

              <Card
                sx={{
                  borderColor: 'success.main',
                  borderWidth: 2,
                  borderStyle: 'solid',
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.8 },
                }}
                onClick={() => navigate(INTEGRATION_PATHS.externalErp)}
              >
                <CardContent>
                  <Stack
                    direction='row'
                    sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
                  >
                    <Typography
                      variant='h6'
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <Cloud size={20} /> SAP S/4HANA
                    </Typography>
                  </Stack>
                  <Typography
                    variant='body2'
                    color='text.secondary'
                  >
                    {t('integration.integration_external_erp_overview_page.e13')}
                  </Typography>
                  <Button
                    size='small'
                    variant='contained'
                    startIcon={<Settings size={14} />}
                    sx={{ mt: 2, bgcolor: 'success.dark' }}
                  >
                    {t('integration.integration_external_erp_overview_page.e2')}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </Box>

        <Card>
          <CardContent>
            <Typography
              variant='h6'
              sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}
            >
              🔗 {t('integration.integration_external_erp_overview_page.m4')}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {t('integration.integration_external_erp_overview_page.e15')}
              {t('integration.integration_external_erp_overview_page.e16')}
            </Typography>

            <Stack
              direction='row'
              sx={{ mt: 3, gap: 4 }}
            >
              <Stack spacing={1}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {t('integration.integration_external_erp_overview_page.e17')}
                </Typography>
                <Stack
                  direction='row'
                  spacing={1}
                >
                  <Chip
                    label={t('integration.integration_external_erp_overview_page.k3_12')}
                    size='small'
                  />
                  <Chip
                    label={t('integration.integration_external_erp_overview_page.u8_13')}
                    size='small'
                  />
                  <Chip
                    label='SAP S/4'
                    size='small'
                  />
                </Stack>
              </Stack>
              <Stack spacing={1}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {t('integration.integration_external_erp_overview_page.e18')}
                </Typography>
                <Stack
                  direction='row'
                  spacing={1}
                >
                  <Chip
                    label={t('integration.integration_external_erp_overview_page.k14')}
                    size='small'
                  />
                  <Chip
                    label={t('integration.integration_external_erp_overview_page.k15')}
                    size='small'
                  />
                  <Chip
                    label={t('integration.integration_external_erp_overview_page.k16')}
                    size='small'
                  />
                </Stack>
              </Stack>
              <Stack spacing={1}>
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 500 }}
                >
                  {t('integration.integration_external_erp_overview_page.e19')}
                </Typography>
                <Stack
                  direction='row'
                  spacing={1}
                >
                  <Chip
                    label={t('integration.integration_external_erp_overview_page.k17')}
                    size='small'
                  />
                  <Chip
                    label={t('integration.integration_external_erp_overview_page.k18')}
                    size='small'
                  />
                  <Chip
                    label={t('integration.integration_external_erp_overview_page.k19')}
                    size='small'
                  />
                </Stack>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </PageContainer>
  );
};

export default IntegrationExternalErpOverviewPage;
