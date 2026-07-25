// V58.0 平台 AI 演进 - A/B 测试

export type ExperimentStatus = 'Draft' | 'Running' | 'Paused' | 'Completed';

export interface Variant {
  id: string;
  name: string;
  modelVersion: string;
  weight: number;
  metrics: Record<string, number>;
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: Variant[];
  status: ExperimentStatus;
  traffic_split: number;
  startDate: number;
  endDate: number;
}

export interface ExperimentResult {
  experimentId: string;
  variant: Variant;
  visitors: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
}

export interface SignificanceResult {
  isSignificant: boolean;
  confidenceLevel: number;
  pValue: number;
  winner: string | null;
  relativeLift: number;
}

type Listener = () => void;

const generateId = () => `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

class ABTestManagerImpl {
  private experiments: Map<string, Experiment> = new Map();
  private results: Map<string, Map<string, ExperimentResult>> = new Map();
  private listeners: Set<Listener> = new Set();

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  create_experiment(
    name: string,
    description: string,
    variants: Omit<Variant, 'id'>[],
    trafficSplit: number
  ): Experiment {
    const totalWeight = variants.reduce((s, v) => s + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01 && Math.abs(totalWeight - 1) > 0.01) {
      throw new Error(`Variant weights must sum to 100 (or 1), got ${totalWeight}`);
    }

    const experiment: Experiment = {
      id: generateId(),
      name,
      description,
      variants: variants.map((v) => ({ ...v, id: generateId() })),
      status: 'Draft',
      traffic_split: trafficSplit,
      startDate: Date.now(),
      endDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    };

    this.experiments.set(experiment.id, experiment);
    this.notify();
    return experiment;
  }

  start_experiment(experimentId: string): void {
    const exp = this.experiments.get(experimentId);
    if (!exp) throw new Error(`Experiment not found: ${experimentId}`);
    if (exp.status !== 'Draft' && exp.status !== 'Paused') {
      throw new Error(`Cannot start experiment in status: ${exp.status}`);
    }

    exp.status = 'Running';
    exp.startDate = Date.now();
    this.generate_mock_results(exp);
    this.notify();
  }

  stop_experiment(experimentId: string): void {
    const exp = this.experiments.get(experimentId);
    if (!exp) throw new Error(`Experiment not found: ${experimentId}`);
    exp.status = 'Completed';
    exp.endDate = Date.now();
    this.notify();
  }

  get_results(experimentId: string): ExperimentResult[] {
    const exp = this.experiments.get(experimentId);
    if (!exp) throw new Error(`Experiment not found: ${experimentId}`);

    const resultsMap = this.results.get(experimentId);
    if (!resultsMap) return [];

    return exp.variants.map((v) => {
      const result = resultsMap.get(v.id);
      if (!result) {
        const visitors = Math.floor(1000 + Math.random() * 5000);
        const conversions = Math.floor(visitors * (0.02 + Math.random() * 0.08));
        const conversionRate = conversions / visitors;
        return {
          experimentId,
          variant: v,
          visitors,
          conversions,
          conversionRate,
          confidence: 0,
        };
      }
      return result;
    });
  }

  list_experiments(): Experiment[] {
    return Array.from(this.experiments.values()).sort((a, b) => b.startDate - a.startDate);
  }

  get_experiment(experimentId: string): Experiment | null {
    return this.experiments.get(experimentId) ?? null;
  }

  get_variant_stats(experimentId: string, variantId: string): ExperimentResult | null {
    const results = this.get_results(experimentId);
    return results.find((r) => r.variant.id === variantId) ?? null;
  }

  check_significance(experimentId: string): SignificanceResult {
    const results = this.get_results(experimentId);
    if (results.length < 2) {
      return { isSignificant: false, confidenceLevel: 0, pValue: 1, winner: null, relativeLift: 0 };
    }

    const [control, treatment] = results;
    const p1 = control.conversionRate;
    const p2 = treatment.conversionRate;
    const n1 = control.visitors;
    const n2 = treatment.visitors;

    const pPool = (control.conversions + treatment.conversions) / (n1 + n2);
    const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
    const z = se > 0 ? (p2 - p1) / se : 0;
    const pValue = 2 * (1 - this.normal_cdf(Math.abs(z)));
    const confidence = 1 - pValue;
    const relativeLift = p1 > 0 ? (p2 - p1) / p1 : 0;

    const isSignificant = pValue < 0.05;
    const winner =
      isSignificant && p2 > p1
        ? treatment.variant.name
        : isSignificant && p1 > p2
          ? control.variant.name
          : null;

    return {
      isSignificant,
      confidenceLevel: confidence,
      pValue,
      winner,
      relativeLift,
    };
  }

  private normal_cdf(x: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
    let p =
      d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (x > 0) p = 1 - p;
    return p;
  }

  private generate_mock_results(exp: Experiment): void {
    const resultsMap = new Map<string, ExperimentResult>();
    const baseRate = 0.05;

    exp.variants.forEach((v, idx) => {
      const visitors = Math.floor(2000 + Math.random() * 8000);
      const variantRate = baseRate + (idx === 0 ? 0 : Math.random() * 0.04 - 0.01);
      const conversions = Math.floor(visitors * variantRate);
      const conversionRate = conversions / visitors;

      resultsMap.set(v.id, {
        experimentId: exp.id,
        variant: v,
        visitors,
        conversions,
        conversionRate,
        confidence: 0,
      });
    });

    this.results.set(exp.id, resultsMap);
  }

  seed(): void {
    if (this.experiments.size > 0) return;

    const exp1 = this.create_experiment(
      'V58 NLU 模型 A/B 测试',
      '对比 V2.0.0 与 V1.1.0 在意图识别准确率上的表现',
      [
        {
          name: 'control (v1.1.0)',
          modelVersion: 'v1.1.0',
          weight: 50,
          metrics: { accuracy: 0.85 },
        },
        {
          name: 'treatment (v2.0.0)',
          modelVersion: 'v2.0.0',
          weight: 50,
          metrics: { accuracy: 0.9 },
        },
      ],
      100
    );
    this.start_experiment(exp1.id);

    const exp2 = this.create_experiment(
      'Copilot 响应延迟测试',
      '测试新模型版本对用户响应延迟的影响',
      [
        { name: 'control (v1.0.0)', modelVersion: 'v1.0.0', weight: 33, metrics: { latency: 80 } },
        {
          name: 'treatment-A (v1.1.0)',
          modelVersion: 'v1.1.0',
          weight: 33,
          metrics: { latency: 72 },
        },
        {
          name: 'treatment-B (v1.1.0-optimized)',
          modelVersion: 'v1.1.0',
          weight: 34,
          metrics: { latency: 65 },
        },
      ],
      100
    );

    const exp3 = this.create_experiment(
      '运维异常检测准确率',
      '验证新模型在生产环境中的异常检测能力',
      [
        { name: 'control', modelVersion: 'v1.0.0', weight: 50, metrics: { precision: 0.88 } },
        { name: 'challenger', modelVersion: 'v1.0.1', weight: 50, metrics: { precision: 0.91 } },
      ],
      50
    );
    this.start_experiment(exp3.id);
  }
}

export const abTestManager = new ABTestManagerImpl();
export { ABTestManagerImpl as ABTestManager };
