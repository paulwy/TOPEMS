import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { X as XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { edgeRenderer, faas, onDemandLoader } from '@/microfrontend';
import PanelCard from './PanelCard';
import { designTokens } from '@topems/tokens';

const V47IntegrationPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const [serverlessStats, setServerlessStats] = React.useState<{
    pages: number;
    hits: number;
  } | null>(null);
  const [faasStats, setFaasStats] = React.useState<{
    functions: number;
    invocations: number;
  } | null>(null);
  const [loaderStats, setLoaderStats] = React.useState<{
    loaded: number;
    pending: number;
  } | null>(null);

  React.useEffect(() => {
    try {
      const stats = edgeRenderer.getStats();
      setServerlessStats({
        pages: stats.totalRenders || 0,
        hits: stats.cacheHits || 0,
      });
    } catch {
      setServerlessStats({ pages: 0, hits: 0 });
    }

    try {
      setFaasStats({
        functions: faas.listFunctions().length,
        invocations: faas.getStats()?.totalInvocations || 0,
      });
    } catch {
      setFaasStats({ functions: 0, invocations: 0 });
    }

    try {
      const lStats = onDemandLoader.getStats();
      setLoaderStats({
        loaded: lStats?.loadedModules || 0,
        pending: lStats?.queuedLoads || 0,
      });
    } catch {
      setLoaderStats({ loaded: 0, pending: 0 });
    }
  }, []);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: 'action.active',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          width: '95%',
          maxWidth: 1400,
          maxHeight: '90vh',
          bgcolor: 'background.paper',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: designTokens.darkShadows.xl,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'secondary.500',
            color: 'common.white',
          }}
        >
          <Typography
            variant='h6'
            sx={{ fontWeight: 600 }}
          >
            {t('devtools.panels.v47Integration.title')}
          </Typography>
          <IconButton
            size='small'
            onClick={onClose}
            sx={{ color: 'common.white' }}
          >
            <XIcon size={20} />
          </IconButton>
        </Box>
        <Box sx={{ overflow: 'auto', maxHeight: 'calc(90vh - 56px)', p: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <PanelCard
              title={t('devtools.panels.v47Integration.cards.lowCode.title')}
              subtitle={t('devtools.panels.v47Integration.cards.lowCode.subtitle')}
              status={t('devtools.panels.v47Integration.cards.lowCode.status')}
            />
            <PanelCard
              title={t('devtools.panels.v47Integration.cards.unifiedPlatform.title')}
              subtitle={t('devtools.panels.v47Integration.cards.unifiedPlatform.subtitle')}
              status={t('devtools.panels.v47Integration.cards.unifiedPlatform.status')}
            />
            <PanelCard
              title={t('devtools.panels.v47Integration.cards.serverless.title')}
              subtitle={t('devtools.panels.v47Integration.cards.serverless.subtitle')}
              status={
                serverlessStats
                  ? t('devtools.panels.v47Integration.cards.serverless.statusWithCache', {
                      pages: serverlessStats.pages,
                      hits: serverlessStats.hits,
                    })
                  : t('devtools.common.loaded')
              }
            />
            <PanelCard
              title={t('devtools.panels.v47Integration.cards.faas.title')}
              subtitle={t('devtools.panels.v47Integration.cards.faas.subtitle')}
              status={
                faasStats
                  ? t('devtools.panels.v47Integration.cards.faas.statusWithInvocations', {
                      functions: faasStats.functions,
                      invocations: faasStats.invocations,
                    })
                  : t('devtools.common.loaded')
              }
            />
            <PanelCard
              title={t('devtools.panels.v47Integration.cards.aiDriven.title')}
              subtitle={t('devtools.panels.v47Integration.cards.aiDriven.subtitle')}
              status={t('devtools.panels.v47Integration.cards.aiDriven.status')}
            />
            <PanelCard
              title={t('devtools.panels.v47Integration.cards.onDemand.title')}
              subtitle={t('devtools.panels.v47Integration.cards.onDemand.subtitle')}
              status={
                loaderStats
                  ? t('devtools.panels.v47Integration.cards.onDemand.statusWithLoader', {
                      loaded: loaderStats.loaded,
                      pending: loaderStats.pending,
                    })
                  : t('devtools.common.loaded')
              }
            />
            <PanelCard
              title={t('devtools.panels.v47Integration.cards.aiOpsV2.title')}
              subtitle={t('devtools.panels.v47Integration.cards.aiOpsV2.subtitle')}
              status={t('devtools.panels.v47Integration.cards.aiOpsV2.status')}
              span
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default V47IntegrationPanel;
