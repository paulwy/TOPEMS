/**
 * @done V80 split
 * Info card used by DetailPageTemplate to render hazard header (avatar/title/subtitle/tags/stats).
 */
import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EHSStatusBadge, calculateRiskLevel } from '@/components/ehs';
import type { Hazard } from '@/api/ehs';

export interface EhsHazardInfoCardProps {
  hazard: Hazard;
}

export interface HazardInfoCardData {
  avatar: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
  tags: string[];
  stats: { label: string; value: string }[];
}

const EhsHazardInfoCard: React.FC<EhsHazardInfoCardProps> = ({ hazard }) => {
  const { t } = useTranslation();

  const infoCard: HazardInfoCardData | undefined = useMemo(() => {
    if (!hazard) return;
    const riskInfo = calculateRiskLevel(hazard.severity || 'medium', hazard.likelihood || 'medium');
    return {
      avatar: (
        <AlertTriangle
          size={32}
          color='warning.600'
        />
      ),
      title: hazard.name,
      subtitle: (
        <EHSStatusBadge
          status={hazard.status}
          type='hazard'
        />
      ),
      tags: [hazard.category || ''],
      stats: [
        {
          label: t('ehs.ehs_hazard_detail_page.text_08fe50'),
          value:
            hazard.severity === 'high'
              ? t('ehs.ehs_hazard_detail_page.text_4296d7')
              : hazard.severity === 'medium'
                ? t('ehs.ehs_hazard_detail_page.text_aed1df')
                : t('ehs.ehs_hazard_detail_page.text_19ac67'),
        },
        {
          label: t('ehs.ehs_hazard_detail_page.text_25eb6b'),
          value: t('ehs.ehs_hazard_detail_page.text_49c4d5', { arg0: riskInfo.level }),
        },
      ],
    };
  }, [hazard]);

  return <>{infoCard}</>;
};

export default EhsHazardInfoCard;
