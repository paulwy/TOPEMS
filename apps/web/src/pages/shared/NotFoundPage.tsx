import { designTokens } from '@topems/tokens';
import React, { useMemo } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import { Home, Search, FileQuestion } from 'lucide-react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { navigationRegistryV2 } from '@/lib/navigation';
import type { ModuleCardConfig } from '@/lib/navigation/types';
import { lucideIcons } from '@/lib/iconMapping';
import { DASHBOARD_PATHS } from '@/routes/dashboard';
import i18n, { ensureNamespacesLoaded } from '@/i18n';
import { AuthPageTemplate } from '@/components/templates';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  const suggestedModules = useMemo<ModuleCardConfig[]>(() => {
    try {
      const cards = navigationRegistryV2.getModuleCards?.() ?? [];
      return cards.slice(0, 6);
    } catch {
      return [];
    }
  }, []);

  // 加载建议模块的语言包，确保模块名/描述可翻译
  const [nsReady, setNsReady] = React.useState(false);
  React.useEffect(() => {
    const codes = suggestedModules.map((m) => m.code).filter(Boolean);
    if (codes.length > 0) {
      ensureNamespacesLoaded(codes).finally(() => setNsReady(true));
    } else {
      setNsReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthPageTemplate
      backgroundGradient={designTokens.colors.grey[100]}
      maxWidth={640}
    >
      <Box
        sx={{
          width: '100%',
          textAlign: 'center',
          px: 4,
        }}
      >
        {/* 404 数字展示 */}
        <Typography
          component='div'
          sx={{
            fontSize: { xs: 96, sm: 144 },
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.05em',
            background: 'linear-gradient(135deg, primary.main 0%, secondary.main 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2,
            userSelect: 'none',
          }}
        >
          404
        </Typography>

        <Box
          sx={{
            width: 72,
            height: 72,
            bgcolor: 'primary.100',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <FileQuestion sx={{ width: 36, height: 36, color: 'primary.main' }} />
        </Box>

        <Typography
          variant='h5'
          sx={{ fontWeight: 700, color: 'grey.900', mb: 1 }}
        >
          {i18n.t('pages.not_found_page.k0')}
        </Typography>
        <Typography
          variant='body1'
          sx={{ color: 'grey.600', mb: 4 }}
        >
          {i18n.t('pages.not_found_page.k1')}
        </Typography>

        {/* 操作按钮组 */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
            mb: 6,
          }}
        >
          <Button
            variant='contained'
            size='large'
            startIcon={<Home />}
            onClick={() => navigate(DASHBOARD_PATHS.dashboard)}
            sx={{ borderRadius: 2, px: 3, py: 1.25 }}
          >
            {i18n.t('pages.not_found_page.k2')}
          </Button>
          <Button
            variant='outlined'
            size='large'
            startIcon={<Search />}
            onClick={() => navigate(DASHBOARD_PATHS.modules)}
            sx={{ borderRadius: 2, px: 3, py: 1.25 }}
          >
            {i18n.t('pages.not_found_page.k3')}
          </Button>
          <Button
            variant='text'
            size='large'
            onClick={() => navigate(-1)}
            sx={{ borderRadius: 2, px: 3, py: 1.25 }}
          >
            {i18n.t('pages.not_found_page.k4')}
          </Button>
        </Box>

        {/* 推荐模块入口 */}
        {suggestedModules.length > 0 && (
          <Box sx={{ textAlign: 'left' }}>
            <Typography
              variant='subtitle2'
              sx={{ color: 'text.secondary', mb: 2, fontWeight: 500 }}
            >
              {i18n.t('pages.not_found_page.k5')}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                },
                gap: 1.5,
              }}
            >
              {nsReady &&
                suggestedModules.map((mod) => {
                  const targetPath = mod.path || '/modules';
                  const IconComp = mod.icon
                    ? (lucideIcons as Record<string, React.ComponentType<{ size?: number }>>)[
                        mod.icon
                      ]
                    : undefined;
                  return (
                    <Paper
                      key={mod.code}
                      component={RouterLink}
                      to={targetPath}
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        border: 1,
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover',
                          transform: 'translateY(-1px)',
                          boxShadow: 2,
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1.5,
                          bgcolor: 'primary.50',
                          color: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {IconComp ? <IconComp size={18} /> : <Search size={18} />}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          sx={{
                            fontSize: designTokens.typography.fontSize.scale['0.875rem'],
                            fontWeight: 600,
                            color: 'text.primary',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {i18n.t(mod.nameKey || mod.name)}
                        </Typography>
                        {mod.description && (
                          <Typography
                            sx={{
                              fontSize: designTokens.typography.fontSize.scale['0.75rem'],
                              color: 'text.secondary',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {i18n.t(mod.description, { defaultValue: mod.description })}
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  );
                })}
            </Box>
          </Box>
        )}
      </Box>
    </AuthPageTemplate>
  );
};

export default NotFoundPage;
