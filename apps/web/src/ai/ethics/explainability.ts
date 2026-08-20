export type ExplainabilityMethod = 'SHAP' | 'LIME' | 'Attention';

export interface Explanation {
  id: string;
  predictionId: string;
  modelId: string;
  method: ExplainabilityMethod;
  features: Record<string, number>;
  baseline: number;
  explanation: string;
  timestamp: number;
  confidence: number;
}

export interface ExplainabilityReport {
  modelId: string;
  globalImportance: Array<{ feature: string; importance: number }>;
  featureRanking: Array<{ feature: string; rank: number; shapValue: number }>;
  counterfactuals: Array<{
    id: string;
    originalPrediction: number;
    counterfactualPrediction: number;
    changedFeatures: string[];
    distance: number;
  }>;
  limitations: string[];
  generatedAt: number;
}

const SHAP_FEATURES = [
  'age',
  'income',
  'credit_score',
  'employment_years',
  'debt_ratio',
  'loan_amount',
  'loan_term',
  'payment_history',
  'marital_status',
  'education_level',
  'home_owner',
  'num_dependents',
];

const COUNTERFACTUAL_FEATURES = [
  'income',
  'credit_score',
  'employment_years',
  'debt_ratio',
  'loan_amount',
];
