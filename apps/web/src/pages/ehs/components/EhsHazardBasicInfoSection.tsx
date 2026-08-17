/**
 * @done V80 split
 * Basic info tab content: risk badge, category, location, severity/exposure/likelihood tiles, description.
 */
import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { Shield, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { designTokens } from '@/theme/tokens';
import { calculateRiskLevel } from '@/components/ehs';
import type { Hazard } from '@/api/ehs';

const ct = designTokens.colors;

export interface EhsHazardBasicInfoSectionProps {
  hazard: Hazard;
}

const EhsHazardBasicInfoSection: React.FC<EhsHazardBasicInfoSectionProps> = ({ hazard }) => {
  const { t } = useTranslation();

  const content = useMemo(() => {
    if (!hazard) return null;
    const riskInfo = calculateRiskLevel(hazard.severity || 'medium', hazard.likelihood || 'medium');
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography
            variant='subtitle1'
            sx={{ fontWeight: 600, mb: 2 }}
          >
            {t('ehs.ehshazarddetailpage.text_47ba19')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              component={Shield}
              sx={{ fontSize: 48, color: 'warning.600' }}
            />
            <Box>
              <Typography sx={{ color: 'warning.600', fontSize: 14 }}>
                {t('ehs.ehshazarddetailpage.text_47ba19')}
              </Typography>
              <Typography
                sx={{
                  fontSize: 24,
                  fontWeight: 700,
                  mt: 0.5,
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  bgcolor: riskInfo.bgColor,
                  color: riskInfo.color,
                  display: 'inline-block',
                }}
              >
                {t(
                  `ehs.ehs_hazard_detail_page.${
                    riskInfo.score >= 6 ? 'high' : riskInfo.score >= 3 ? 'medium' : 'low'
                  }_risk`
                )}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Box>
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
              {t('ehs.ehshazarddetailpage.text_000a6b')}
            </Typography>
            <Typography sx={{ color: 'text.primary', mt: 0.5 }}>
              {hazard.category || '-'}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
              {t('ehs.ehshazarddetailpage.text_000a19')}
            </Typography>
            <Typography sx={{ color: 'text.primary', mt: 0.5 }}>
              <Box
                component={MapPin}
                sx={{ fontSize: 16, mr: 0.5, display: 'inline' }}
              />
              {hazard.location || '-'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
            <Typography sx={{ color: 'error.dark', fontSize: 12 }}>
              {t('ehs.ehshazarddetailpage.text_25b83c')}
            </Typography>
            <Typography sx={{ fontWeight: 500, color: 'error.darker', mt: 0.5 }}>
              {hazard.severity === 'high'
                ? t('ehs.ehs_hazard_detail_page.text_4296d7')
                : hazard.severity === 'medium'
                  ? t('ehs.ehs_hazard_detail_page.text_aed1df')
                  : t('ehs.ehs_hazard_detail_page.text_19ac67')}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.lighter', borderRadius: 1 }}>
            <Typography sx={{ color: ct.yellow[600], fontSize: 12 }}>
              {t('ehs.ehshazarddetailpage.text_30fa2c')}
            </Typography>
            <Typography sx={{ fontWeight: 500, color: ct.yellow[700], mt: 0.5 }}>
              {hazard.exposure === 'high'
                ? t('ehs.ehs_hazard_detail_page.text_4296d7')
                : hazard.exposure === 'medium'
                  ? t('ehs.ehs_hazard_detail_page.text_aed1df')
                  : t('ehs.ehs_hazard_detail_page.text_19ac67')}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
            <Typography sx={{ color: 'primary.dark', fontSize: 12 }}>
              {t('ehs.ehshazarddetailpage.text_27deb2')}
            </Typography>
            <Typography sx={{ fontWeight: 500, color: 'primary.dark', mt: 0.5 }}>
              {hazard.likelihood === 'high'
                ? t('ehs.ehs_hazard_detail_page.text_4296d7')
                : hazard.likelihood === 'medium'
                  ? t('ehs.ehs_hazard_detail_page.text_aed1df')
                  : t('ehs.ehs_hazard_detail_page.text_19ac67')}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
            {t('ehs.ehshazarddetailpage.text_000ca6')}
          </Typography>
          <Typography sx={{ color: 'text.primary', mt: 0.5, fontSize: 14, lineHeight: 1.6 }}>
            {hazard.description || t('ehs.ehs_hazard_detail_page.description_1')}
          </Typography>
        </Box>
      </Box>
    );
  }, [hazard]);

  return <>{content}</>;
};

export default EhsHazardBasicInfoSection;
