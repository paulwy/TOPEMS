// EHS Components and Utilities

export {
  EHSStatusBadge,
  EHSMeasureTypeBadge,
  type HazardStatus,
  type IncidentStatus,
  type ControlStatus,
  type RiskLevel,
  type MeasureType,
} from './EHSBadges';

export {
  calculateRiskLevel,
  getSeverityLabel,
  type SeverityValue,
  type LikelihoodValue,
  type RiskCalculationResult,
} from './riskUtils';
