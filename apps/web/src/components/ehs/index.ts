// EHS Components and Utilities

export {
  EHSStatusBadge,
  EHSSeverityBadge,
  EHSRiskLevelBadge,
  EHSMeasureTypeBadge,
  EHSIncidentTypeBadge,
  type HazardStatus,
  type IncidentStatus,
  type ControlStatus,
  type SeverityLevel,
  type RiskLevel,
  type MeasureType,
  type IncidentType,
} from './EHSBadges';

export {
  calculateRiskLevel,
  getSeverityLabel,
  type SeverityValue,
  type LikelihoodValue,
  type ExposureValue,
  type EffectivenessLevel,
  type RiskCalculationResult,
} from './riskUtils';
