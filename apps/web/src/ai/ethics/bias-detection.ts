import i18n from '@/i18n';
export type BiasType = 'Gender' | 'Race' | 'Age' | 'Socioeconomic';

export type BiasSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface BiasReport {
  id: string;
  modelId: string;
  biasType: BiasType;
  severity: BiasSeverity;
  affectedGroups: string[];
  findings: string[];
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface BiasMetric {
  metric: string;
  group: string;
  value: number;
  threshold: number;
  deviation: number;
  severity: BiasSeverity;
}

export interface BiasRule {
  id: string;
  name: string;
  biasType: BiasType;
  description: string;
  threshold: number;
  severity: BiasSeverity;
  enabled: boolean;
}

const DEFAULT_RULES: BiasRule[] = [
  {
    id: 'rule-gender-parity',
    name: i18n.t('ai.bias-detection.k0'),
    biasType: 'Gender',
    description: i18n.t('ai.bias-detection.k1'),
    threshold: 0.1,
    severity: 'high',
    enabled: true,
  },
  {
    id: 'rule-race-parity',
    name: i18n.t('ai.bias-detection.k2'),
    biasType: 'Race',
    description: i18n.t('ai.bias-detection.k3'),
    threshold: 0.1,
    severity: 'high',
    enabled: true,
  },
  {
    id: 'rule-age-parity',
    name: i18n.t('ai.bias-detection.k4'),
    biasType: 'Age',
    description: i18n.t('ai.bias-detection.k5'),
    threshold: 0.15,
    severity: 'medium',
    enabled: true,
  },
  {
    id: 'rule-socioeconomic-parity',
    name: i18n.t('ai.bias-detection.k6'),
    biasType: 'Socioeconomic',
    description: i18n.t('ai.bias-detection.k7'),
    threshold: 0.15,
    severity: 'medium',
    enabled: true,
  },
];

export class BiasDetector {
  private static instance: BiasDetector | null = null;
  private reports: Map<string, BiasReport> = new Map();
  private rules: Map<string, BiasRule> = new Map();
  private modelReports: Map<string, string[]> = new Map();

  private constructor() {
    DEFAULT_RULES.forEach((rule) => this.rules.set(rule.id, { ...rule }));
  }

  static getInstance(): BiasDetector {
    if (!BiasDetector.instance) {
      BiasDetector.instance = new BiasDetector();
    }
    return BiasDetector.instance;
  }

  analyzeBias(
    modelId: string,
    options?: {
      biasTypes?: BiasType[];
      threshold?: number;
    }
  ): BiasReport[] {
    const results: BiasReport[] = [];
    const activeRules = Array.from(this.rules.values()).filter((r) => r.enabled);
    const biasTypes = options?.biasTypes ?? ['Gender', 'Race', 'Age', 'Socioeconomic'];
    const globalThreshold = options?.threshold;

    for (const rule of activeRules) {
      if (!biasTypes.includes(rule.biasType)) continue;

      const threshold = globalThreshold ?? rule.threshold;
      const metrics = this.generateMetrics(rule.biasType);
      const violations = metrics.filter((m) => Math.abs(m.deviation) > threshold);

      if (violations.length > 0) {
        const maxSeverity = this.determineSeverity(violations);
        const report: BiasReport = {
          id: `bias-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          modelId,
          biasType: rule.biasType,
          severity: maxSeverity,
          affectedGroups: violations.map((v) => v.group),
          findings: violations.map(
            (v) =>
              `${i18n.t('ai.bias-detection.k0')}${v.metric}${i18n.t('ai.bias-detection.k1')}${v.group}${i18n.t('ai.bias-detection.k2')}${(v.deviation * 100).toFixed(2)}${i18n.t('ai.bias-detection.k3')}${(threshold * 100).toFixed(1)}%`
          ),
          timestamp: Date.now(),
        };
        results.push(report);
        this.reports.set(report.id, report);

        const modelReportList = this.modelReports.get(modelId) ?? [];
        modelReportList.push(report.id);
        this.modelReports.set(modelId, modelReportList);
      }
    }

    if (results.length === 0) {
      const cleanReport: BiasReport = {
        id: `bias-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        modelId,
        biasType: biasTypes[0],
        severity: 'info',
        affectedGroups: [],
        findings: [i18n.t('ai.bias-detection.k8')],
        timestamp: Date.now(),
      };
      results.push(cleanReport);
      this.reports.set(cleanReport.id, cleanReport);
    }

    return results;
  }

  getBiasReport(reportId: string): BiasReport | null {
    return this.reports.get(reportId) ?? null;
  }

  listReports(limit?: number): BiasReport[] {
    const results = Array.from(this.reports.values()).sort((a, b) => b.timestamp - a.timestamp);
    return limit ? results.slice(0, limit) : results;
  }

  getModelBias(modelId: string): BiasReport[] {
    const reportIds = this.modelReports.get(modelId) ?? [];
    return reportIds
      .map((id) => this.reports.get(id))
      .filter((r): r is BiasReport => r !== undefined)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  createBiasRule(rule: Omit<BiasRule, 'id'>): BiasRule {
    const newRule: BiasRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    this.rules.set(newRule.id, newRule);
    return newRule;
  }

  updateBiasThreshold(ruleId: string, threshold: number): BiasRule | null {
    const rule = this.rules.get(ruleId);
    if (!rule) return null;
    rule.threshold = threshold;
    this.rules.set(ruleId, rule);
    return rule;
  }

  getBiasSummary(): {
    total_reports: number;
    bySeverity: Record<BiasSeverity, number>;
    byBiasType: Record<BiasType, number>;
    affected_models: number;
    recent_findings: string[];
  } {
    const reports = Array.from(this.reports.values());
    const total = reports.length;

    const bySeverity: Record<BiasSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    const byBiasType: Record<BiasType, number> = {
      Gender: 0,
      Race: 0,
      Age: 0,
      Socioeconomic: 0,
    };

    for (const report of reports) {
      bySeverity[report.severity]++;
      byBiasType[report.biasType]++;
    }

    const affectedModels = new Set(reports.map((r) => r.modelId)).size;
    const recentFindings = reports
      .filter((r) => r.severity !== 'info')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
      .map((r) => `[${r.biasType}] ${r.modelId}: ${r.findings[0] ?? i18n.t('ai.bias-detection.k9')}`);

    return {
      total_reports: total,
      bySeverity,
      byBiasType,
      affected_models: affectedModels,
      recent_findings: recentFindings,
    };
  }

  listRules(): BiasRule[] {
    return Array.from(this.rules.values());
  }

  private generateMetrics(biasType: BiasType): BiasMetric[] {
    const groupMappings: Record<BiasType, Array<{ group: string; base: number }>> = {
      Gender: [
        { group: 'male', base: 0.52 },
        { group: 'female', base: 0.48 },
        { group: 'non_binary', base: 0.5 },
      ],
      Race: [
        { group: 'asian', base: 0.45 },
        { group: 'african', base: 0.42 },
        { group: 'caucasian', base: 0.48 },
        { group: 'hispanic', base: 0.44 },
      ],
      Age: [
        { group: 'under_25', base: 0.55 },
        { group: '25_34', base: 0.5 },
        { group: '35_44', base: 0.47 },
        { group: '45_54', base: 0.43 },
        { group: '55_plus', base: 0.38 },
      ],
      Socioeconomic: [
        { group: 'low_income', base: 0.35 },
        { group: 'middle_income', base: 0.48 },
        { group: 'high_income', base: 0.55 },
      ],
    };

    const groups = groupMappings[biasType];
    const metrics: BiasMetric[] = [];
    const thresholds: Record<BiasType, number> = {
      Gender: 0.1,
      Race: 0.1,
      Age: 0.15,
      Socioeconomic: 0.15,
    };

    for (const g of groups) {
      const noise = (Math.random() - 0.5) * 0.3;
      const value = Math.max(0, Math.min(1, g.base + noise));
      const deviation = value - g.base;
      const severity = this.classifySeverity(Math.abs(deviation), thresholds[biasType]);

      metrics.push({
        metric: 'selection_rate',
        group: g.group,
        value: Math.round(value * 10000) / 10000,
        threshold: thresholds[biasType],
        deviation: Math.round(deviation * 10000) / 10000,
        severity,
      });
    }

    return metrics;
  }

  private classifySeverity(deviation: number, threshold: number): BiasSeverity {
    if (deviation > threshold * 3) return 'critical';
    if (deviation > threshold * 2) return 'high';
    if (deviation > threshold) return 'medium';
    if (deviation > threshold * 0.5) return 'low';
    return 'info';
  }

  private determineSeverity(metrics: BiasMetric[]): BiasSeverity {
    const order: BiasSeverity[] = ['critical', 'high', 'medium', 'low', 'info'];
    let worst: BiasSeverity = 'info';
    for (const m of metrics) {
      if (order.indexOf(m.severity) < order.indexOf(worst)) {
        worst = m.severity;
      }
    }
    return worst;
  }
}

export const biasDetector = BiasDetector.getInstance();
