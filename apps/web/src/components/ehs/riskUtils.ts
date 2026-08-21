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

const exposureScores: Record<ExposureValue, number> = {
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
 * Calculate comprehensive risk score including exposure
 * More detailed risk assessment
 */
function calculateComprehensiveRisk(
  severity: SeverityValue | string,
  likelihood: LikelihoodValue | string,
  exposure: ExposureValue | string
): RiskCalculationResult & {
  exposureScore: number;
  severityScore: number;
  likelihoodScore: number;
} {
  const s = severityScores[severity as SeverityValue] || 2;
  const l = likelihoodScores[likelihood as LikelihoodValue] || 2;
  const e = exposureScores[exposure as ExposureValue] || 2;
  const score = s * l * e;

  // Normalize to 1-27 range for display
  const normalizedScore = Math.min(Math.max(score, 1), 27);

  if (normalizedScore >= 12) {
    return {
      score: normalizedScore,
      level: i18n.t('shared.risk_utils.k9'),
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: i18n.t('shared.risk_utils.k10'),
      exposureScore: e,
      severityScore: s,
      likelihoodScore: l,
    };
  }

  if (normalizedScore >= 6) {
    return {
      score: normalizedScore,
      level: i18n.t('shared.risk_utils.k11'),
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: i18n.t('shared.risk_utils.k12'),
      exposureScore: e,
      severityScore: s,
      likelihoodScore: l,
    };
  }

  return {
    score: normalizedScore,
    level: i18n.t('shared.risk_utils.k13'),
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: i18n.t('shared.risk_utils.k14'),
    exposureScore: e,
    severityScore: s,
    likelihoodScore: l,
  };
}

/**
 * Get risk level color class for styling
 */
function getRiskLevelColor(level: string): string {
  const colorMap: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    [i18n.t('components.risk_utils.k0')]: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    [i18n.t('components.risk_utils.k1')]: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
    [i18n.t('components.risk_utils.k2')]: 'bg-green-100 text-green-700',
  };
  return colorMap[level] || 'bg-gray-100 text-gray-700';
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
 * Get likelihood label in Chinese
 */
function getLikelihoodLabel(likelihood: string): string {
  const labelMap: Record<string, string> = {
    high: i18n.t('shared.risk_utils.k18'),
    medium: i18n.t('shared.risk_utils.k19'),
    low: i18n.t('shared.risk_utils.k20'),
  };
  return labelMap[likelihood] || likelihood;
}

/**
 * Get exposure label in Chinese
 */
function getExposureLabel(exposure: string): string {
  const labelMap: Record<string, string> = {
    high: i18n.t('shared.risk_utils.k21'),
    medium: i18n.t('shared.risk_utils.k22'),
    low: i18n.t('shared.risk_utils.k23'),
  };
  return labelMap[exposure] || exposure;
}

/**
 * Risk matrix data for visualization
 */
const riskMatrixData = [
  // High severity
  {
    severity: 'high',
    likelihood: 'high',
    score: 9,
    level: i18n.t('shared.risk_utils.k24'),
    color: 'error.main',
  },
  {
    severity: 'high',
    likelihood: 'medium',
    score: 6,
    level: i18n.t('shared.risk_utils.k25'),
    color: 'error.main',
  },
  {
    severity: 'high',
    likelihood: 'low',
    score: 3,
    level: i18n.t('shared.risk_utils.k26'),
    color: 'warning.main',
  },
  // Medium severity
  {
    severity: 'medium',
    likelihood: 'high',
    score: 6,
    level: i18n.t('shared.risk_utils.k27'),
    color: 'error.main',
  },
  {
    severity: 'medium',
    likelihood: 'medium',
    score: 4,
    level: i18n.t('shared.risk_utils.k28'),
    color: 'warning.main',
  },
  {
    severity: 'medium',
    likelihood: 'low',
    score: 2,
    level: i18n.t('shared.risk_utils.k29'),
    color: 'success.main',
  },
  // Low severity
  {
    severity: 'low',
    likelihood: 'high',
    score: 3,
    level: i18n.t('shared.risk_utils.k30'),
    color: 'warning.main',
  },
  {
    severity: 'low',
    likelihood: 'medium',
    score: 2,
    level: i18n.t('shared.risk_utils.k31'),
    color: 'success.main',
  },
  {
    severity: 'low',
    likelihood: 'low',
    score: 1,
    level: i18n.t('shared.risk_utils.k32'),
    color: 'success.main',
  },
];

/**
 * Control measure effectiveness rating
 */
export type EffectivenessLevel = 'high' | 'medium' | 'low';

function getEffectivenessLabel(effectiveness: string): string {
  const labelMap: Record<string, string> = {
    high: i18n.t('shared.risk_utils.k33'),
    medium: i18n.t('shared.risk_utils.k34'),
    low: i18n.t('shared.risk_utils.k35'),
  };
  return labelMap[effectiveness] || effectiveness;
}

/**
 * Calculate residual risk after control measures
 */
function calculateResidualRisk(
  initialRisk: RiskCalculationResult,
  controlEffectiveness: EffectivenessLevel | string
): RiskCalculationResult {
  const effectivenessFactors: Record<string, number> = {
    high: 0.3,
    medium: 0.5,
    low: 0.8,
  };

  const factor = effectivenessFactors[controlEffectiveness] || 0.5;
  const residualScore = Math.round(initialRisk.score * factor);

  if (residualScore >= 6) {
    return {
      score: residualScore,
      level: i18n.t('shared.risk_utils.k36'),
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: i18n.t('shared.risk_utils.k37'),
    };
  }

  if (residualScore >= 3) {
    return {
      score: residualScore,
      level: i18n.t('shared.risk_utils.k38'),
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: i18n.t('shared.risk_utils.k39'),
    };
  }

  return {
    score: residualScore,
    level: i18n.t('shared.risk_utils.k40'),
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: i18n.t('shared.risk_utils.k41'),
  };
}
