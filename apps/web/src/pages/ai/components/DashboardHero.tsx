import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AI_PATHS } from '@/modules/ai/config';
import { alpha } from '@mui/material/styles';
import { designTokens } from '@/theme/tokens';

const ct = designTokens.colors;

const DashboardHero: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        p: 4,
        mb: 4,
        borderRadius: 3,
        background: 'linear-gradient(135deg, primary.main 0%, secondary.main 100%)',
        color: 'common.white',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Sparkles size={28} />
        <Typography
          variant='h5'
          sx={{ fontWeight: 700 }}
        >
          {t('ai.dashboard.hero_title')}
        </Typography>
      </Box>
      <Typography variant='body1'>
        {t('ai.dashboard.hero_welcome')}
        {t('ai.dashboard.hero_desc')}
      </Typography>
      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button
          size='small'
          variant='contained'
          sx={{
            bgcolor: 'common.white',
            color: 'primary.main',
            '&:hover': { bgcolor: 'grey.100' },
          }}
          onClick={() => navigate(AI_PATHS.chat)}
        >
          {t('ai.dashboard.button.start_chat')}
        </Button>
        <Button
          size='small'
          variant='outlined'
          sx={{
            borderColor: 'common.white',
            color: 'common.white',
            '&:hover': { bgcolor: alpha(ct.background.paper, 0.1) },
          }}
          onClick={() => navigate(AI_PATHS.prompts)}
        >
          {t('ai.dashboard.button.view_prompts')}
        </Button>
      </Box>
    </Box>
  );
};
