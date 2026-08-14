import i18n from '@/i18n';
export type AttackType = 'PromptInjection' | 'ModelPoisoning' | 'DataExfiltration' | 'SideChannel';

export type AttackSeverity = 'critical' | 'high' | 'medium' | 'low';

export type TestStatus = 'completed' | 'running' | 'failed' | 'pending';

export interface AttackVector {
  id: string;
  type: AttackType;
  severity: AttackSeverity;
  vector: string;
  mitigation: string;
  description?: string;
  examples?: string[];
}

export interface RobustnessTest {
  id: string;
  modelId: string;
  attackVector: AttackVector;
  success_rate: number;
  defense_rate: number;
  status: TestStatus;
  details?: {
    test_cases: number;
    passed_cases: number;
    failed_cases: number;
    mitigations_applied: string[];
    timestamp: number;
    duration_ms: number;
  };
}

export interface Defense {
  id: string;
  name: string;
  type: AttackType;
  description: string;
  enabled: boolean;
  effectiveness: number;
  configuration: Record<string, unknown>;
}

const DEFAULT_ATTACK_VECTORS: AttackVector[] = [
  {
    id: 'av-prompt-injection',
    type: 'PromptInjection',
    severity: 'critical',
    vector: i18n.t('ai.adversarial-robustness.k0'),
    mitigation: i18n.t('ai.adversarial-robustness.k1'),
    description: i18n.t('ai.adversarial-robustness.k2'),
    examples: [i18n.t('ai.adversarial-robustness.k3'), i18n.t('ai.adversarial-robustness.system_0')],
  },
  {
    id: 'av-model-poisoning',
    type: 'ModelPoisoning',
    severity: 'critical',
    vector: i18n.t('ai.adversarial-robustness.k4'),
    mitigation: i18n.t('ai.adversarial-robustness.k5'),
    description: i18n.t('ai.adversarial-robustness.k6'),
    examples: [i18n.t('ai.adversarial-robustness.k8'), i18n.t('ai.adversarial-robustness.k7')],
  },
  {
    id: 'av-data-exfiltration',
    type: 'DataExfiltration',
    severity: 'high',
    vector: i18n.t('ai.adversarial-robustness.k9'),
    mitigation: i18n.t('ai.adversarial-robustness.k10'),
    description: i18n.t('ai.adversarial-robustness.k11'),
    examples: [i18n.t('ai.adversarial-robustness.k13'), i18n.t('ai.adversarial-robustness.k12')],
  },
  {
    id: 'av-side-channel',
    type: 'SideChannel',
    severity: 'medium',
    vector: i18n.t('ai.adversarial-robustness.k14'),
    mitigation: i18n.t('ai.adversarial-robustness.k15'),
    description: i18n.t('ai.adversarial-robustness.k16'),
    examples: [i18n.t('ai.adversarial-robustness.k18'), i18n.t('ai.adversarial-robustness.k17')],
  },
];

const DEFAULT_DEFENSES: Defense[] = [
  {
    id: 'def-input-sanitization',
    name: i18n.t('ai.adversarial-robustness.k19'),
    type: 'PromptInjection',
    description: i18n.t('ai.adversarial-robustness.k20'),
    enabled: true,
    effectiveness: 0.85,
    configuration: {
      max_input_length: 4096,
      block_patterns: ['ignore previous', 'disregard', 'system prompt'],
      sanitize_html: true,
    },
  },
  {
    id: 'def-output-filter',
    name: i18n.t('ai.adversarial-robustness.k21'),
    type: 'DataExfiltration',
    description: i18n.t('ai.adversarial-robustness.k22'),
    enabled: true,
    effectiveness: 0.8,
    configuration: {
      block_pii: true,
      block_secrets: true,
      max_output_length: 8192,
    },
  },
  {
    id: 'def-dp-noise',
    name: i18n.t('ai.adversarial-robustness.k23'),
    type: 'DataExfiltration',
    description: i18n.t('ai.adversarial-robustness.k24'),
    enabled: false,
    effectiveness: 0.6,
    configuration: {
      epsilon: 1.0,
      delta: 1e-5,
      noise_type: 'gaussian',
    },
  },
  {
    id: 'def-behavior-guard',
    name: i18n.t('ai.adversarial-robustness.k25'),
    type: 'ModelPoisoning',
    description: i18n.t('ai.adversarial-robustness.k26'),
    enabled: true,
    effectiveness: 0.75,
    configuration: {
      anomaly_threshold: 2.0,
      auto_block: true,
      alert_on_anomaly: true,
    },
  },
];

export class AdversarialRobustness {
  private static instance: AdversarialRobustness | null = null;
  private tests: Map<string, RobustnessTest[]> = new Map();
  private attackVectors: Map<string, AttackVector> = new Map();
  private defenses: Map<string, Defense> = new Map();
  private modelTests: Map<string, string[]> = new Map();

  private constructor() {
    DEFAULT_ATTACK_VECTORS.forEach((v) => this.attackVectors.set(v.id, { ...v }));
    DEFAULT_DEFENSES.forEach((d) => this.defenses.set(d.id, { ...d }));
  }

  static getInstance(): AdversarialRobustness {
    if (!AdversarialRobustness.instance) {
      AdversarialRobustness.instance = new AdversarialRobustness();
    }
    return AdversarialRobustness.instance;
  }

  runTest(modelId: string, attackVectorId: string): RobustnessTest {
    const vector = this.attackVectors.get(attackVectorId);
    if (!vector) {
      throw new Error(`Attack vector not found: ${attackVectorId}`);
    }

    const startTime = Date.now();
    const relatedDefenses = Array.from(this.defenses.values()).filter(
      (d) => d.type === vector.type && d.enabled
    );

    const baseSuccessRate = this.estimateSuccessRate(vector);
    const defenseEffectiveness = relatedDefenses.reduce(
      (acc, d) => acc + d.effectiveness / Math.max(relatedDefenses.length, 1),
      0
    );
    const finalSuccessRate = Math.max(0, baseSuccessRate * (1 - defenseEffectiveness));
    const defenseRate = Math.min(1, defenseEffectiveness);

    const testCases = 100;
    const passedCases = Math.round(testCases * (1 - finalSuccessRate));
    const failedCases = testCases - passedCases;

    const test: RobustnessTest = {
      id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      modelId,
      attackVector: vector,
      success_rate: Math.round(finalSuccessRate * 10000) / 10000,
      defense_rate: Math.round(defenseRate * 10000) / 10000,
      status: 'completed',
      details: {
        test_cases: testCases,
        passed_cases: passedCases,
        failed_cases: failedCases,
        mitigations_applied: relatedDefenses.map((d) => d.name),
        timestamp: Date.now(),
        duration_ms: Date.now() - startTime,
      },
    };

    const modelTestList = this.modelTests.get(modelId) ?? [];
    modelTestList.push(test.id);
    this.modelTests.set(modelId, modelTestList);

    const testList = this.tests.get(modelId) ?? [];
    testList.push(test);
    this.tests.set(modelId, testList);

    return test;
  }

  getTestResult(testId: string): RobustnessTest | null {
    for (const tests of this.tests.values()) {
      const found = tests.find((t) => t.id === testId);
      if (found) return found;
    }
    return null;
  }

  listTests(modelId?: string, limit?: number): RobustnessTest[] {
    let results: RobustnessTest[];
    if (modelId) {
      results = this.tests.get(modelId) ?? [];
    } else {
      results = Array.from(this.tests.values()).flat();
    }
    results = results.sort((a, b) => (b.details?.timestamp ?? 0) - (a.details?.timestamp ?? 0));
    return limit ? results.slice(0, limit) : results;
  }

  getAttackVectors(type?: AttackType): AttackVector[] {
    const vectors = Array.from(this.attackVectors.values());
    return type ? vectors.filter((v) => v.type === type) : vectors;
  }

  addDefense(defense: Omit<Defense, 'id'>): Defense {
    const newDefense: Defense = {
      ...defense,
      id: `def-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    this.defenses.set(newDefense.id, newDefense);
    return newDefense;
  }

  getDefenseStatus(): {
    total_defenses: number;
    enabled_defenses: number;
    byType: Record<AttackType, { total: number; enabled: number; avg_effectiveness: number }>;
    defenses: Defense[];
  } {
    const defenses = Array.from(this.defenses.values());
    const enabled = defenses.filter((d) => d.enabled);

    const byType: Record<
      AttackType,
      { total: number; enabled: number; avg_effectiveness: number }
    > = {
      PromptInjection: { total: 0, enabled: 0, avg_effectiveness: 0 },
      ModelPoisoning: { total: 0, enabled: 0, avg_effectiveness: 0 },
      DataExfiltration: { total: 0, enabled: 0, avg_effectiveness: 0 },
      SideChannel: { total: 0, enabled: 0, avg_effectiveness: 0 },
    };

    for (const defense of defenses) {
      const entry = byType[defense.type];
      entry.total++;
      if (defense.enabled) {
        entry.enabled++;
      }
    }

    for (const type of Object.keys(byType) as AttackType[]) {
      const typeDefenses = defenses.filter((d) => d.type === type);
      if (typeDefenses.length > 0) {
        byType[type].avg_effectiveness =
          Math.round(
            (typeDefenses.reduce((sum, d) => sum + d.effectiveness, 0) / typeDefenses.length) * 100
          ) / 100;
      }
    }

    return {
      total_defenses: defenses.length,
      enabled_defenses: enabled.length,
      byType,
      defenses,
    };
  }

  compareRobustness(modelIds: string[]): Array<{
    modelId: string;
    overall_score: number;
    byAttackType: Record<AttackType, { success_rate: number; defense_rate: number }>;
    recommendation: string;
  }> {
    return modelIds.map((modelId) => {
      const modelTestList = this.tests.get(modelId) ?? [];
      const byAttackType: Record<AttackType, { success_rate: number; defense_rate: number }> = {
        PromptInjection: { success_rate: 0, defense_rate: 0 },
        ModelPoisoning: { success_rate: 0, defense_rate: 0 },
        DataExfiltration: { success_rate: 0, defense_rate: 0 },
        SideChannel: { success_rate: 0, defense_rate: 0 },
      };

      const typeCounts: Record<AttackType, number> = {
        PromptInjection: 0,
        ModelPoisoning: 0,
        DataExfiltration: 0,
        SideChannel: 0,
      };

      for (const test of modelTestList) {
        const attackType = test.attackVector.type;
        const entry = byAttackType[attackType];
        const count = typeCounts[attackType];
        entry.success_rate = (entry.success_rate * count + test.success_rate) / (count + 1);
        entry.defense_rate = (entry.defense_rate * count + test.defense_rate) / (count + 1);
        typeCounts[attackType]++;
      }

      const overallScore =
        1 -
        Object.values(byAttackType).reduce((sum, v) => sum + v.success_rate, 0) /
          Math.max(modelTestList.length, 1);

      const maxRiskType = (Object.keys(byAttackType) as AttackType[]).reduce(
        (max, t) => (byAttackType[t].success_rate > byAttackType[max].success_rate ? t : max),
        'PromptInjection' as AttackType
      );

      return {
        modelId,
        overall_score: Math.round(Math.max(0, overallScore) * 100) / 100,
        byAttackType,
        recommendation:
          byAttackType[maxRiskType].success_rate > 0.3
            ? `${i18n.t('ai.adversarial-robustness.k1')}${maxRiskType}${i18n.t('ai.adversarial-robustness.k2')}${(byAttackType[maxRiskType].success_rate * 100).toFixed(1)}%`
            : i18n.t('ai.adversarial-robustness.k0'),
      };
    });
  }

  private estimateSuccessRate(vector: AttackVector): number {
    const baseRates: Record<AttackType, number> = {
      PromptInjection: 0.35,
      ModelPoisoning: 0.25,
      DataExfiltration: 0.3,
      SideChannel: 0.2,
    };
    return baseRates[vector.type];
  }
}

export const adversarialRobustness = AdversarialRobustness.getInstance();
