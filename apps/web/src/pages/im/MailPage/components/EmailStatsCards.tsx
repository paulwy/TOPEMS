import { Card, CardContent, Typography, Box } from '@mui/material';
import { Mail, CheckCircle, Clock, XCircle } from 'lucide-react';
import { designTokens } from '@/theme/tokens';
import type { EmailStats } from '@/api/mail';
import { useTranslation } from 'react-i18next';

const ct = designTokens.colors;

interface EmailStatsCardsProps {
  stats: EmailStats | null;
  statsLoading: boolean;
}

const EmailStatsCards: React.FC<EmailStatsCardsProps> = ({ stats, statsLoading }) => {
  const { t } = useTranslation('im');
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: 'repeat(2, 1fr)',
          lg: 'repeat(4, 1fr)',
        },
        gap: 2,
        mb: 3,
      }}
    >
      <Card
        sx={{
          background: 'linear-gradient(135deg, primary.main 0%, primary.dark 100%)',
          border: 'none',
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography sx={{ color: 'primary.light', fontSize: '0.875rem' }}>
                {t('im.mail_page_components_email_stats_cards.e1')}
              </Typography>
              <Typography
                sx={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  color: 'common.white',
                  mt: 0.5,
                }}
              >
                {statsLoading ? '...' : stats?.total || 0}
              </Typography>
            </Box>
            <Box
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'action.disabledBackground',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mail
                size={24}
                color='white'
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card
        sx={{
          background: `linear-gradient(135deg, ${ct.success.main} 0%, ${ct.success.dark} 100%)`,
          border: 'none',
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography sx={{ color: 'success.light', fontSize: '0.875rem' }}>
                {t('im.email_stats_cards.k0')}
              </Typography>
              <Typography
                sx={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  color: 'common.white',
                  mt: 0.5,
                }}
              >
                {statsLoading ? '...' : stats?.sent_count || 0}
              </Typography>
            </Box>
            <Box
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'action.disabledBackground',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle
                size={24}
                color='white'
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card
        sx={{
          background: `linear-gradient(135deg, ${ct.yellow.main} 0%, ${ct.yellow[600]} 100%)`,
          border: 'none',
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography sx={{ color: 'warning.100', fontSize: '0.875rem' }}>
                {t('im.email_stats_cards.k1')}
              </Typography>
              <Typography
                sx={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  color: 'common.white',
                  mt: 0.5,
                }}
              >
                {statsLoading ? '...' : stats?.pending_count || 0}
              </Typography>
            </Box>
            <Box
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'action.disabledBackground',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock
                size={24}
                color='white'
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
      <Card
        sx={{
          background: 'linear-gradient(135deg, error.main 0%, error.dark 100%)',
          border: 'none',
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography sx={{ color: 'error.light', fontSize: '0.875rem' }}>
                {t('im.email_stats_cards.k2')}
              </Typography>
              <Typography
                sx={{
                  fontSize: '1.875rem',
                  fontWeight: 700,
                  color: 'common.white',
                  mt: 0.5,
                }}
              >
                {statsLoading ? '...' : stats?.failed_count || 0}
              </Typography>
            </Box>
            <Box
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'action.disabledBackground',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <XCircle
                size={24}
                color='white'
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EmailStatsCards;
