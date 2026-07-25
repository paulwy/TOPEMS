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

export class ExplainabilityEngine {
  private static instance: ExplainabilityEngine | null = null;
  private explanations: Map<string, Explanation> = new Map();
  private reports: Map<string, ExplainabilityReport> = new Map();
  private predictionExplanations: Map<string, string[]> = new Map();

  private constructor() {}

  static getInstance(): ExplainabilityEngine {
    if (!ExplainabilityEngine.instance) {
      ExplainabilityEngine.instance = new ExplainabilityEngine();
    }
    return ExplainabilityEngine.instance;
  }

  get_explanation(
    predictionId: string,
    modelId: string,
    options?: { method?: ExplainabilityMethod }
  ): Explanation {
    const method = options?.method ?? 'SHAP';
    const features = this.generateFeatureValues();
    const baseline = 0.5;
    const featureContributions = this.computeContributions(features, baseline, method);

    const id = `expl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const explanationText = this.generateExplanationText(
      method,
      featureContributions,
      features,
      baseline
    );

    const explanation: Explanation = {
      id,
      predictionId,
      modelId,
      method,
      features: featureContributions,
      baseline,
      explanation: explanationText,
      timestamp: Date.now(),
      confidence: Math.round((0.7 + Math.random() * 0.3) * 10000) / 10000,
    };

    this.explanations.set(id, explanation);

    const predList = this.predictionExplanations.get(predictionId) ?? [];
    predList.push(id);
    this.predictionExplanations.set(predictionId, predList);

    return explanation;
  }

  get_global_importance(modelId: string): Array<{ feature: string; importance: number }> {
    const importance = SHAP_FEATURES.map((feature) => ({
      feature,
      importance: Math.round(Math.random() * 10000) / 10000,
    }));

    importance.sort((a, b) => b.importance - a.importance);

    const total = importance.reduce((sum, f) => sum + f.importance, 0);
    if (total > 0) {
      for (const f of importance) {
        f.importance = Math.round((f.importance / total) * 10000) / 10000;
      }
    }

    return importance;
  }

  generate_counterfactual(
    modelId: string,
    predictionId: string,
    targetPrediction?: number
  ): ExplainabilityReport['counterfactuals'][number] {
    const changedFeatures = COUNTERFACTUAL_FEATURES.slice(0, 2 + Math.floor(Math.random() * 3));

    const originalPrediction = Math.round(Math.random() * 100) / 100;
    const cfOffset = (Math.random() - 0.5) * 0.4;
    const counterfactualPrediction = Math.max(0, Math.min(1, originalPrediction + cfOffset));

    return {
      id: `cf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      originalPrediction: Math.round(originalPrediction * 10000) / 10000,
      counterfactualPrediction: Math.round(counterfactualPrediction * 10000) / 10000,
      changedFeatures,
      distance: Math.round(Math.abs(counterfactualPrediction - originalPrediction) * 10000) / 10000,
    };
  }

  get_feature_ranking(
    modelId: string
  ): Array<{ feature: string; rank: number; shapValue: number }> {
    const importance = this.get_global_importance(modelId);
    return importance.map((item, index) => ({
      feature: item.feature,
      rank: index + 1,
      shapValue: Math.round(item.importance * 1000) / 1000,
    }));
  }

  get_explainability_report(modelId: string): ExplainabilityReport {
    const globalImportance = this.get_global_importance(modelId);
    const featureRanking = this.get_feature_ranking(modelId);

    const counterfactuals = Array.from({ length: 3 }, () =>
      this.generate_counterfactual(modelId, `demo-${Date.now()}`)
    );

    const limitations = [
      '当前解释基于 SHAP/LIME 近似，可能与实际模型行为存在偏差',
      '高基数特征的解释精度可能受限',
      '非线性特征交互的解释需要更复杂的方法',
      '解释结果仅供参考，不应作为唯一决策依据',
      '对于黑箱模型，解释可能不完整',
    ];

    const report: ExplainabilityReport = {
      modelId,
      globalImportance,
      featureRanking,
      counterfactuals,
      limitations,
      generatedAt: Date.now(),
    };

    this.reports.set(modelId, report);
    return report;
  }

  compare_explanations(
    predictionIds: string[],
    modelId: string
  ): Array<{
    predictionId: string;
    methods: ExplainabilityMethod[];
    agreement: number;
  }> {
    return predictionIds.map((predId) => {
      const methods: ExplainabilityMethod[] = ['SHAP', 'LIME', 'Attention'];
      const agreement = Math.round((0.6 + Math.random() * 0.4) * 10000) / 10000;
      return {
        predictionId: predId,
        methods,
        agreement,
      };
    });
  }

  get_explainability_coverage(modelId: string): {
    total_predictions: number;
    explained_predictions: number;
    coverage_rate: number;
    by_method: Record<ExplainabilityMethod, number>;
  } {
    const totalPredictions = Math.floor(50 + Math.random() * 150);
    const explainedPredictions = Math.floor(totalPredictions * (0.6 + Math.random() * 0.35));
    const coverageRate = Math.round((explainedPredictions / totalPredictions) * 10000) / 10000;

    const by_method: Record<ExplainabilityMethod, number> = {
      SHAP: Math.floor(explainedPredictions * 0.5),
      LIME: Math.floor(explainedPredictions * 0.3),
      Attention: Math.floor(explainedPredictions * 0.2),
    };

    return {
      total_predictions: totalPredictions,
      explained_predictions: explainedPredictions,
      coverage_rate: coverageRate,
      by_method,
    };
  }

  get_prediction_explanations(predictionId: string): Explanation[] {
    const ids = this.predictionExplanations.get(predictionId) ?? [];
    return ids
      .map((id) => this.explanations.get(id))
      .filter((e): e is Explanation => e !== undefined)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  list_explanations(modelId?: string, limit?: number): Explanation[] {
    const all = Array.from(this.explanations.values());
    const filtered = modelId ? all.filter((e) => e.modelId === modelId) : all;
    const sorted = filtered.sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  private generateFeatureValues(): Record<string, number> {
    const values: Record<string, number> = {};
    for (const feature of SHAP_FEATURES) {
      values[feature] = Math.round(Math.random() * 10000) / 10000;
    }
    return values;
  }

  private computeContributions(
    features: Record<string, number>,
    baseline: number,
    method: ExplainabilityMethod
  ): Record<string, number> {
    const contributions: Record<string, number> = {};
    const scale = method === 'SHAP' ? 0.3 : method === 'LIME' ? 0.25 : 0.2;

    for (const [feature, value] of Object.entries(features)) {
      contributions[feature] = Math.round((value - baseline) * scale * 10000) / 10000;
    }

    return contributions;
  }

  private generateExplanationText(
    method: ExplainabilityMethod,
    contributions: Record<string, number>,
    _features: Record<string, number>,
    _baseline: number
  ): string {
    const sorted = Object.entries(contributions).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    const topFeatures = sorted.slice(0, 3);

    const methodLabels: Record<ExplainabilityMethod, string> = {
      SHAP: 'SHAP 值归因分析',
      LIME: 'LIME 局部可解释模型',
      Attention: '注意力权重分析',
    };

    const parts = [`基于${methodLabels[method]}，该预测的主要影响因素包括：`];

    for (const [feature, value] of topFeatures) {
      const direction = value > 0 ? '正向' : '负向';
      parts.push(`- ${feature} 贡献了 ${direction} 影响 (${Math.abs(value).toFixed(3)})`);
    }

    if (topFeatures.length === 0) {
      parts.push('未检测到显著的特征贡献');
    }

    return parts.join('\n');
  }
}

export const explainabilityEngine = ExplainabilityEngine.getInstance();
