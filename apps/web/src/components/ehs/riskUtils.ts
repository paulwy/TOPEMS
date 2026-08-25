// EHS Risk Calculation Utilities

import i18n from '@/i18n';

export type SeverityValue = 'high' | 'medium' | 'low';
export type LikelihoodValue = 'high' | 'medium' | 'low';
export type ExposureValue = 'high' | 'medium' | 'low';

export interface RiskCalculationResult {
  score: number;
  level: string;
  color: string;
  bgColor: string;
  description: string;
}

// Risk scoring values
const severityScores: Record<SeverityValue, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const likelihoodScores: Record<LikelihoodValue, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Calculate risk level based on severity and likelihood
 * Basic risk matrix calculation
 */
export function calculateRiskLevel(
  severity: SeverityValue | string,
  likelihood: LikelihoodValue | string
): RiskCalculationResult {
  const s = severityScores[severity as SeverityValue] || 2;
  const l = likelihoodScores[likelihood as LikelihoodValue] || 2;
  const score = s * l;

  if (score >= 6) {
    return {
      score,
      level: i18n.t('shared.risk_utils.k3'),
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: i18n.t('shared.risk_utils.k4'),
    };
  }

  if (score >= 3) {
    return {
      score,
      level: i18n.t('shared.risk_utils.k5'),
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: i18n.t('shared.risk_utils.k6'),
    };
  }

  return {
    score,
    level: i18n.t('shared.risk_utils.k7'),
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: i18n.t('shared.risk_utils.k8'),
  };
}

/**
 * Get severity label in Chinese
 */
export function getSeverityLabel(severity: string): string {
  const labelMap: Record<string, string> = {
    high: i18n.t('shared.risk_utils.k15'),
    medium: i18n.t('shared.risk_utils.k16'),
    low: i18n.t('shared.risk_utils.k17'),
  };
  return labelMap[severity] || severity;
}

/**
 * Control measure effectiveness rating
 */
export type EffectivenessLevel = 'high' | 'medium' | 'low';
