export type SeverityValue = "high" | "medium" | "low";
export type LikelihoodValue = "high" | "medium" | "low";
export type ExposureValue = "high" | "medium" | "low";
export interface RiskCalculationResult {
    score: number;
    level: "高" | "中" | "低";
    color: string;
    bgColor: string;
    description: string;
}
/**
 * Calculate risk level based on severity and likelihood
 * Basic risk matrix calculation
 */
export declare function calculateRiskLevel(severity: SeverityValue | string, likelihood: LikelihoodValue | string): RiskCalculationResult;
/**
 * Calculate comprehensive risk score including exposure
 * More detailed risk assessment
 */
export declare function calculateComprehensiveRisk(severity: SeverityValue | string, likelihood: LikelihoodValue | string, exposure: ExposureValue | string): RiskCalculationResult & {
    exposureScore: number;
    severityScore: number;
    likelihoodScore: number;
};
/**
 * Get risk level color class for styling
 */
export declare function getRiskLevelColor(level: string): string;
/**
 * Get severity label in Chinese
 */
export declare function getSeverityLabel(severity: string): string;
/**
 * Get likelihood label in Chinese
 */
export declare function getLikelihoodLabel(likelihood: string): string;
/**
 * Get exposure label in Chinese
 */
export declare function getExposureLabel(exposure: string): string;
/**
 * Risk matrix data for visualization
 */
export declare const riskMatrixData: {
    severity: string;
    likelihood: string;
    score: number;
    level: string;
    color: string;
}[];
/**
 * Control measure effectiveness rating
 */
export type EffectivenessLevel = "high" | "medium" | "low";
export declare function getEffectivenessLabel(effectiveness: string): string;
/**
 * Calculate residual risk after control measures
 */
export declare function calculateResidualRisk(initialRisk: RiskCalculationResult, controlEffectiveness: EffectivenessLevel | string): RiskCalculationResult;
