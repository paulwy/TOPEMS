import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Sparkles, ChevronRight, Activity } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { designTokens } from '@topems/tokens';
import i18n from '@/i18n';

export const HeroSection: React.FC = () => {
  const { user } = useAuth();

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return i18n.t('shared.hero_section.k0');
    if (hour < 18) return i18n.t('shared.hero_section.k1');
    return i18n.t('shared.hero_section.k2');
  };

  return (
    <Box sx={{ mb: 8 }}>
      <Box
        sx={{
          background: `linear-gradient(135deg, ${designTokens.colors.grey['800']} 0%, ${designTokens.colors.common.black} 100%)`,
          borderRadius: 3,
          p: { xs: 4, md: 8 },
          position: 'relative',
          overflow: 'hidden',
          border: `1px solid ${designTokens.colors.cyber.glass.bgLight}`,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.3,
            background:
              'radial-gradient(circle at 80% 20%, rgba(96, 165, 250, 0.15) 0%, transparent 50%)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.2,
            background:
              'radial-gradient(circle at 20% 80%, rgba(167, 139, 250, 0.15) 0%, transparent 50%)',
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 10 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${designTokens.colors.primary['400']}, secondary.light)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles
                size={16}
                color='var(--color-primary-foreground, #ffffff)'
              />
            </Box>
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: 'primary.light',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {getGreeting()}，
              {user?.full_name || user?.username || i18n.t('shared.hero_section.k3')}
            </Typography>
          </Box>

          <Typography
            sx={{
              fontSize: { xs: '2rem', md: '3rem' },
              fontWeight: 800,
              color: 'grey.50',
              mb: 3,
              lineHeight: 1.2,
            }}
          >
            {i18n.t('components.hero_section.k0')}
            <Box
              component='span'
              sx={{
                background:
                  'linear-gradient(to right, rgb(96, 165, 250), rgb(167, 139, 250), rgb(244, 114, 182))',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {' TOPEMS '}
            </Box>
            {i18n.t('components.hero_section.k1')}
          </Typography>

          <Typography
            sx={{
              fontSize: '1.125rem',
              color: 'grey.400',
              mb: 6,
              maxWidth: '600px',
            }}
          >
            {i18n.t('components.hero_section.k2')}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Button
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 3,
                py: 1.5,
                background: 'linear-gradient(to right, rgb(59, 130, 246), rgb(147, 51, 234))',
                color: 'common.white',
                fontWeight: 600,
                borderRadius: 3,
                transition: 'all 0.3s',
                '&:hover': {
                  boxShadow: `0 10px 15px -3px ${designTokens.colors.cyber.grid.lineHeavy}`,
                  transform: 'scale(1.05)',
                },
              }}
            >
              <Activity size={20} />
              <span>{i18n.t('shared.hero_section.k4')}</span>
              <ChevronRight size={18} />
            </Button>
            <Button
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 3,
                py: 1.5,
                bgcolor: 'action.disabledBackground',
                color: 'common.white',
                fontWeight: 600,
                borderRadius: 3,
                border: `1px solid ${designTokens.colors.cyber.metal.topLight}`,
                transition: 'all 0.3s',
                '&:hover': {
                  bgcolor: 'action.disabledBackground',
                },
              }}
            >
              <span>{i18n.t('shared.hero_section.k5')}</span>
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            position: 'absolute',
            bottom: '-5rem',
            right: '-5rem',
            width: '16rem',
            height: '16rem',
            background: `linear-gradient(to bottom right, ${designTokens.colors.cyber.grid.lineHeavy}, rgba(147, 51, 234, 0.2))`,
            borderRadius: '50%',
            filter: 'blur(64px)',
          }}
        />
      </Box>
    </Box>
  );
};
