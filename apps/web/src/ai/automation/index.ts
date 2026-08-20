export type {
  TestScenario,
  TestResult,
  TestStep,
  TestType,
  TestPriority,
  TestStatus,
  CoverageReport,
  FailureAnalysis,
  SmartTestEvent,
} from './smart-testing';

export type {
  CIConfig,
  CIResult,
  CIStage,
  CIStatus,
  CIProvider,
  TriggerType,
  RunArtifact,
  CIEvent,
} from './ci-integration';

export type {
  GateCriteria,
  GateResult,
  GateOverride,
  GateType,
  GateAction,
  GateStatus,
  MetricComparison,
  TrendPoint,
  GateEvent,
} from './quality-gate';

export { V57AutomationPanel } from './v57-automation-panel';
