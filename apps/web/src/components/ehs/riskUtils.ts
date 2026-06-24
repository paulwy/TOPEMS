// EHS Risk Calculation Utilities

export type SeverityValue = 'high' | 'medium' | 'low';
export type LikelihoodValue = 'high' | 'medium' | 'low';
export type ExposureValue = 'high' | 'medium' | 'low';

export interface RiskCalculationResult {
  score: number;
  level: '高' | '中' | '低';
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
      level: '高',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: '高风险：需要立即采取控制措施',
    };
  }

  if (score >= 3) {
    return {
      score,
      level: '中',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: '中风险：需要制定控制计划',
    };
  }

  return {
    score,
    level: '低',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: '低风险：可以接受，定期监控',
  };
}

/**
 * Calculate comprehensive risk score including exposure
 * More detailed risk assessment
 */
export function calculateComprehensiveRisk(
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
      level: '高',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: '高风险：需要立即采取控制措施并上报管理层',
      exposureScore: e,
      severityScore: s,
      likelihoodScore: l,
    };
  }

  if (normalizedScore >= 6) {
    return {
      score: normalizedScore,
      level: '中',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: '中风险：需要制定控制计划并定期评估',
      exposureScore: e,
      severityScore: s,
      likelihoodScore: l,
    };
  }

  return {
    score: normalizedScore,
    level: '低',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: '低风险：可以接受，保持现有控制措施',
    exposureScore: e,
    severityScore: s,
    likelihoodScore: l,
  };
}

/**
 * Get risk level color class for styling
 */
export function getRiskLevelColor(level: string): string {
  const colorMap: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    高: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    中: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700',
    低: 'bg-green-100 text-green-700',
  };
  return colorMap[level] || 'bg-gray-100 text-gray-700';
}

/**
 * Get severity label in Chinese
 */
export function getSeverityLabel(severity: string): string {
  const labelMap: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  };
  return labelMap[severity] || severity;
}

/**
 * Get likelihood label in Chinese
 */
export function getLikelihoodLabel(likelihood: string): string {
  const labelMap: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  };
  return labelMap[likelihood] || likelihood;
}

/**
 * Get exposure label in Chinese
 */
export function getExposureLabel(exposure: string): string {
  const labelMap: Record<string, string> = {
    high: '高',
    medium: '中',
    low: '低',
  };
  return labelMap[exposure] || exposure;
}

/**
 * Risk matrix data for visualization
 */
export const riskMatrixData = [
  // High severity
  {
    severity: 'high',
    likelihood: 'high',
    score: 9,
    level: '高',
    color: '#ef4444',
  },
  {
    severity: 'high',
    likelihood: 'medium',
    score: 6,
    level: '高',
    color: '#ef4444',
  },
  {
    severity: 'high',
    likelihood: 'low',
    score: 3,
    level: '中',
    color: '#f59e0b',
  },
  // Medium severity
  {
    severity: 'medium',
    likelihood: 'high',
    score: 6,
    level: '高',
    color: '#ef4444',
  },
  {
    severity: 'medium',
    likelihood: 'medium',
    score: 4,
    level: '中',
    color: '#f59e0b',
  },
  {
    severity: 'medium',
    likelihood: 'low',
    score: 2,
    level: '低',
    color: '#10b981',
  },
  // Low severity
  {
    severity: 'low',
    likelihood: 'high',
    score: 3,
    level: '中',
    color: '#f59e0b',
  },
  {
    severity: 'low',
    likelihood: 'medium',
    score: 2,
    level: '低',
    color: '#10b981',
  },
  {
    severity: 'low',
    likelihood: 'low',
    score: 1,
    level: '低',
    color: '#10b981',
  },
];

/**
 * Control measure effectiveness rating
 */
export type EffectivenessLevel = 'high' | 'medium' | 'low';

export function getEffectivenessLabel(effectiveness: string): string {
  const labelMap: Record<string, string> = {
    high: '高效',
    medium: '中等',
    low: '低效',
  };
  return labelMap[effectiveness] || effectiveness;
}

/**
 * Calculate residual risk after control measures
 */
export function calculateResidualRisk(
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
      level: '高',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: '控制措施效果不足，需要加强',
    };
  }

  if (residualScore >= 3) {
    return {
      score: residualScore,
      level: '中',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: '控制措施有效，需要持续监控',
    };
  }

  return {
    score: residualScore,
    level: '低',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: '控制措施效果良好，风险可控',
  };
}
