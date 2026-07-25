// STATUS: WIRED | Integrated in App.tsx DevTools panel
export {
  BiasDetector,
  biasDetector,
  type BiasReport,
  type BiasMetric,
  type BiasRule,
  type BiasType,
  type BiasSeverity,
} from './bias-detection';

export {
  FairnessAssurance,
  fairnessAssurance,
  type FairnessConfig,
  type FairnessResult,
  type FairnessTrend,
  type FairnessBenchmark,
  type FairnessType,
  type AuditStatus,
} from './fairness-assurance';

export {
  ExplainabilityEngine,
  explainabilityEngine,
  type Explanation,
  type ExplainabilityReport,
  type ExplainabilityMethod,
} from './explainability';

export { V60EthicsPanel } from './v60-ethics-panel';
