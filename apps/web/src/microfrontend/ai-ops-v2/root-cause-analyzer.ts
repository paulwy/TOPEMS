/**
 * V50.0 微前端 AI 运维 - 根因分析模块
 * 提供智能故障诊断、因果关系分析、事件关联能力
 */

export interface CausalFactor {
  id: string;
  name: string;
  type: 'metric' | 'event' | 'resource' | 'dependency' | 'configuration';
  contribution: number;
  confidence: number;
  description: string;
  evidence: string[];
  relatedFactors: string[];
}

export interface RootCauseResult {
  id: string;
  incidentId: string;
  primaryCause: CausalFactor;
  secondaryCauses: CausalFactor[];
  timeline: CausalEvent[];
  confidence: number;
  analysisTime: number;
  recommendations: string[];
  metadata: Record<string, any>;
}

export interface CausalEvent {
  timestamp: number;
  type: 'trigger' | 'contributor' | 'symptom' | 'resolution';
  description: string;
  source: string;
  impact: 'low' | 'medium' | 'high';
}

export interface CorrelationRule {
  id: string;
  name: string;
  conditions: CorrelationCondition[];
  result: {
    probability: number;
    causalRelation: string;
  };
  enabled: boolean;
}

export interface CorrelationCondition {
  metric1: string;
  metric2: string;
  correlationType: 'pearson' | 'spearman' | 'kendall' | 'granger';
  threshold: number;
  timeLag: number;
}

export interface AnalysisContext {
  incidentId: string;
  startTime: number;
  endTime?: number;
  affectedMetrics: string[];
  affectedModules?: string[];
  errorLogs?: string[];
  changeEvents?: string[];
  metadata?: Record<string, any>;
}

export interface RootCauseAnalyzerConfig {
  maxAnalysisDepth: number;
  minConfidence: number;
  correlationThreshold: number;
  enableGrangerTest: boolean;
  enablePatternMatching: boolean;
  knowledgeBaseEnabled: boolean;
  analysisTimeout: number;
  maxRecommendations: number;
}

const DEFAULT_CONFIG: RootCauseAnalyzerConfig = {
  maxAnalysisDepth: 5,
  minConfidence: 0.6,
  correlationThreshold: 0.7,
  enableGrangerTest: true,
  enablePatternMatching: true,
  knowledgeBaseEnabled: true,
  analysisTimeout: 30000,
  maxRecommendations: 5,
};

export class RootCauseAnalyzer {
  private config: RootCauseAnalyzerConfig;
  private knowledgeBase: Map<string, CausalFactor[]> = new Map();
  private correlationRules: Map<string, CorrelationRule> = new Map();
  private analysisHistory: RootCauseResult[] = [];
  private patternLibrary: Map<string, Partial<RootCauseResult>> = new Map();

  constructor(config: Partial<RootCauseAnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeDefaultRules();
  }

  analyze(context: AnalysisContext): Promise<RootCauseResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('分析超时'));
      }, this.config.analysisTimeout);

      try {
        const result = this.performAnalysis(context);
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  addCorrelationRule(rule: CorrelationRule): void {
    this.correlationRules.set(rule.id, rule);
  }

  removeCorrelationRule(id: string): boolean {
    return this.correlationRules.delete(id);
  }

  getCorrelationRules(): CorrelationRule[] {
    return Array.from(this.correlationRules.values());
  }

  addToKnowledgeBase(incidentType: string, factors: CausalFactor[]): void {
    this.knowledgeBase.set(incidentType, factors);
  }

  getFromKnowledgeBase(incidentType: string): CausalFactor[] | undefined {
    return this.knowledgeBase.get(incidentType);
  }

  getAnalysisHistory(options?: {
    incidentId?: string;
    minConfidence?: number;
    limit?: number;
  }): RootCauseResult[] {
    let history = [...this.analysisHistory];

    if (options?.incidentId) {
      history = history.filter((r) => r.incidentId === options.incidentId);
    }
    if (options?.minConfidence) {
      history = history.filter((r) => r.confidence >= options.minConfidence!);
    }

    history.sort((a, b) => b.analysisTime - a.analysisTime);

    if (options?.limit) {
      history = history.slice(0, options.limit);
    }

    return history;
  }

  calculateCorrelation(
    values1: number[],
    values2: number[],
    method: 'pearson' | 'spearman' = 'pearson'
  ): number {
    if (values1.length !== values2.length || values1.length < 2) {
      return 0;
    }

    if (method === 'pearson') {
      return this.pearsonCorrelation(values1, values2);
    } else {
      return this.spearmanCorrelation(values1, values2);
    }
  }

  grangerCausalityTest(
    series1: number[],
    series2: number[],
    lag: number = 1
  ): { fStatistic: number; pValue: number; isGrangerCausal: boolean } {
    // 简化的 Granger 因果检验实现
    if (series1.length < lag + 2 || series2.length < lag + 2) {
      return { fStatistic: 0, pValue: 1, isGrangerCausal: false };
    }

    // 计算自回归残差平方和
    const ssr1 = this.calculateAutoRegressionSSR(series1, lag);
    const ssr2 = this.calculateAutoRegressionSSR(series1, lag, series2);

    const n = series1.length;
    const df1 = lag;
    const df2 = n - 2 * lag - 1;

    const fStatistic = (ssr1 - ssr2) / df1 / (ssr2 / df2);
    const pValue = this.fisherPValue(fStatistic, df1, df2);
    const isGrangerCausal = pValue < 0.05;

    return { fStatistic, pValue, isGrangerCausal };
  }

  getConfig(): RootCauseAnalyzerConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<RootCauseAnalyzerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  clear(): void {
    this.knowledgeBase.clear();
    this.analysisHistory = [];
    this.patternLibrary.clear();
  }

  private performAnalysis(context: AnalysisContext): RootCauseResult {
    const startTime = Date.now();

    // 1. 识别潜在原因
    const factors = this.identifyCauses(context);

    // 2. 评估因果关系
    const evaluatedFactors = factors.map((f) => this.evaluateCause(f, context));

    // 3. 排序并选择主要和次要原因
    const sortedFactors = evaluatedFactors.sort((a, b) => b.contribution - a.contribution);

    const primaryCause = sortedFactors[0] || this.createDefaultCause();
    const secondaryCauses = sortedFactors.slice(1, 4);

    // 4. 构建时间线
    const timeline = this.buildTimeline(context, primaryCause, secondaryCauses);

    // 5. 生成建议
    const recommendations = this.generateRecommendations(primaryCause, secondaryCauses);

    // 6. 计算总体置信度
    const confidence = this.calculateOverallConfidence(primaryCause, secondaryCauses);

    const result: RootCauseResult = {
      id: `rca-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      incidentId: context.incidentId,
      primaryCause,
      secondaryCauses,
      timeline,
      confidence,
      analysisTime: startTime,
      recommendations,
      metadata: context.metadata || {},
    };

    this.analysisHistory.push(result);
    return result;
  }

  private identifyCauses(context: AnalysisContext): CausalFactor[] {
    const causes: CausalFactor[] = [];

    // 基于知识库的推理
    if (this.config.knowledgeBaseEnabled) {
      causes.push(...this.matchKnowledgeBase(context));
    }

    // 基于指标异常
    context.affectedMetrics.forEach((metric) => {
      causes.push({
        id: `cause-metric-${metric}`,
        name: metric,
        type: 'metric',
        contribution: 0,
        confidence: 0,
        description: `指标异常: ${metric}`,
        evidence: [],
        relatedFactors: [],
      });
    });

    // 基于变更事件
    if (context.changeEvents && context.changeEvents.length > 0) {
      context.changeEvents.forEach((event, i) => {
        causes.push({
          id: `cause-change-${i}`,
          name: event,
          type: 'configuration',
          contribution: 0,
          confidence: 0,
          description: `配置变更: ${event}`,
          evidence: [],
          relatedFactors: [],
        });
      });
    }

    return causes;
  }

  private evaluateCause(factor: CausalFactor, context: AnalysisContext): CausalFactor {
    // 计算贡献度（简化实现）
    const contribution = this.calculateContribution(factor, context);

    // 计算置信度
    const confidence = this.calculateConfidence(factor, context);

    // 收集证据
    const evidence = this.collectEvidence(factor, context);

    // 查找相关因素
    const relatedFactors = this.findRelatedFactors(factor, context);

    return {
      ...factor,
      contribution,
      confidence,
      evidence,
      relatedFactors,
    };
  }

  private calculateContribution(factor: CausalFactor, _context: AnalysisContext): number {
    // 简化实现：基于类型和上下文计算贡献度
    const typeWeights = {
      metric: 0.25,
      event: 0.2,
      resource: 0.25,
      dependency: 0.2,
      configuration: 0.1,
    };

    const baseWeight = typeWeights[factor.type] || 0.1;

    // 如果有证据，增加权重
    const evidenceBoost = factor.evidence.length > 0 ? 0.1 : 0;

    // 如果是知识库匹配，增加权重
    const knowledgeBoost = this.knowledgeBase.has(factor.name) ? 0.15 : 0;

    return Math.min(1, baseWeight + evidenceBoost + knowledgeBoost);
  }

  private calculateConfidence(factor: CausalFactor, _context: AnalysisContext): number {
    // 简化实现：基于证据强度和类型计算置信度
    let confidence = 0.5;

    // 证据数量影响置信度
    confidence += Math.min(0.3, factor.evidence.length * 0.1);

    // 相关因素数量影响置信度
    confidence += Math.min(0.2, factor.relatedFactors.length * 0.05);

    return Math.min(1, confidence);
  }

  private collectEvidence(factor: CausalFactor, context: AnalysisContext): string[] {
    const evidence: string[] = [];

    // 从错误日志中提取证据
    if (context.errorLogs) {
      const relevantLogs = context.errorLogs.filter((log) =>
        log.toLowerCase().includes(factor.name.toLowerCase())
      );
      evidence.push(...relevantLogs.slice(0, 3));
    }

    // 从知识库获取证据
    if (this.knowledgeBase.has(factor.name)) {
      evidence.push(`知识库匹配: ${factor.name}`);
    }

    return evidence;
  }

  private findRelatedFactors(factor: CausalFactor, context: AnalysisContext): string[] {
    const related: string[] = [];

    // 基于相关性规则查找
    this.correlationRules.forEach((rule) => {
      rule.conditions.forEach((condition) => {
        if (condition.metric1 === factor.name || condition.metric2 === factor.name) {
          const relatedMetric =
            condition.metric1 === factor.name ? condition.metric2 : condition.metric1;
          if (context.affectedMetrics.includes(relatedMetric)) {
            related.push(relatedMetric);
          }
        }
      });
    });

    return related;
  }

  private buildTimeline(
    context: AnalysisContext,
    primary: CausalFactor,
    secondary: CausalFactor[]
  ): CausalEvent[] {
    const timeline: CausalEvent[] = [];

    // 添加触发事件
    timeline.push({
      timestamp: context.startTime,
      type: 'trigger',
      description: primary.description,
      source: primary.name,
      impact: 'high',
    });

    // 添加次要贡献事件
    secondary.forEach((factor) => {
      timeline.push({
        timestamp: context.startTime + Math.random() * 1000,
        type: 'contributor',
        description: factor.description,
        source: factor.name,
        impact: 'medium',
      });
    });

    // 添加症状事件
    context.affectedMetrics.forEach((metric) => {
      timeline.push({
        timestamp: context.startTime + Math.random() * 2000,
        type: 'symptom',
        description: `观察到 ${metric} 异常`,
        source: metric,
        impact: 'low',
      });
    });

    return timeline.sort((a, b) => a.timestamp - b.timestamp);
  }

  private generateRecommendations(primary: CausalFactor, secondary: CausalFactor[]): string[] {
    const recommendations: string[] = [];

    // 基于主要原因生成建议
    switch (primary.type) {
      case 'metric':
        recommendations.push(`检查并优化 ${primary.name} 指标`);
        break;
      case 'resource':
        recommendations.push(`增加或调整 ${primary.name} 资源配额`);
        break;
      case 'dependency':
        recommendations.push(`检查 ${primary.name} 依赖服务的健康状态`);
        break;
      case 'configuration':
        recommendations.push(`回滚或修复 ${primary.name} 配置变更`);
        break;
      case 'event':
        recommendations.push(`调查并处理 ${primary.name} 事件`);
        break;
    }

    // 基于次要原因补充建议
    secondary.slice(0, this.config.maxRecommendations - 1).forEach((factor) => {
      if (factor.type === 'dependency') {
        recommendations.push(`监控 ${factor.name} 依赖项的性能`);
      } else if (factor.type === 'resource') {
        recommendations.push(`优化 ${factor.name} 资源使用`);
      }
    });

    return recommendations.slice(0, this.config.maxRecommendations);
  }

  private calculateOverallConfidence(primary: CausalFactor, secondary: CausalFactor[]): number {
    // 加权平均计算总体置信度
    const primaryWeight = 0.6;
    const secondaryWeight = 0.4 / Math.max(1, secondary.length);

    let confidence = primary.confidence * primaryWeight;

    secondary.forEach((factor) => {
      confidence += factor.confidence * secondaryWeight;
    });

    return Math.min(1, confidence);
  }

  private matchKnowledgeBase(context: AnalysisContext): CausalFactor[] {
    const matches: CausalFactor[] = [];

    this.knowledgeBase.forEach((factors, incidentType) => {
      if (context.affectedMetrics.some((m) => incidentType.includes(m))) {
        matches.push(...factors);
      }
    });

    return matches;
  }

  private createDefaultCause(): CausalFactor {
    return {
      id: 'cause-unknown',
      name: '未知原因',
      type: 'event',
      contribution: 0.1,
      confidence: 0.1,
      description: '无法确定具体原因',
      evidence: [],
      relatedFactors: [],
    };
  }

  private initializeDefaultRules(): void {
    // 添加一些默认的相关性规则
    this.addCorrelationRule({
      id: 'cpu-memory-correlation',
      name: 'CPU-内存相关性',
      conditions: [
        {
          metric1: 'cpu_usage',
          metric2: 'memory_usage',
          correlationType: 'pearson',
          threshold: 0.7,
          timeLag: 0,
        },
      ],
      result: {
        probability: 0.8,
        causalRelation: '内存泄漏可能导致 CPU 使用率升高',
      },
      enabled: true,
    });

    this.addCorrelationRule({
      id: 'latency-error-correlation',
      name: '延迟-错误相关性',
      conditions: [
        {
          metric1: 'response_time',
          metric2: 'error_rate',
          correlationType: 'pearson',
          threshold: 0.6,
          timeLag: 1000,
        },
      ],
      result: {
        probability: 0.75,
        causalRelation: '高延迟可能导致错误率上升',
      },
      enabled: true,
    });
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.reduce((total, xi) => total + xi * xi, 0);
    const sumY2 = y.reduce((total, yi) => total + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private spearmanCorrelation(x: number[], y: number[]): number {
    const rankX = this.rank(x);
    const rankY = this.rank(y);
    return this.pearsonCorrelation(rankX, rankY);
  }

  private rank(values: number[]): number[] {
    const sorted = values.map((v, i) => ({ value: v, index: i })).sort((a, b) => a.value - b.value);
    const ranks = new Array(values.length).fill(0);
    sorted.forEach((item, i) => {
      ranks[item.index] = i + 1;
    });
    return ranks;
  }

  private calculateAutoRegressionSSR(
    series: number[],
    lag: number,
    otherSeries?: number[]
  ): number {
    // 简化的自回归残差平方和计算
    let ssr = 0;
    for (let i = lag; i < series.length; i++) {
      let prediction = 0;
      for (let j = 1; j <= lag; j++) {
        prediction += series[i - j] * 0.5;
      }
      if (otherSeries) {
        for (let j = 0; j < lag; j++) {
          prediction += otherSeries[i - j - 1] * 0.3;
        }
      }
      ssr += Math.pow(series[i] - prediction, 2);
    }
    return ssr;
  }

  private fisherPValue(f: number, df1: number, df2: number): number {
    // 简化的 Fisher 分布 p 值计算
    // 使用正态近似
    const x = df2 / (df2 + df1 * f);
    return 1 - Math.pow(x, df2 / 2);
  }
}

export const rootCauseAnalyzer = new RootCauseAnalyzer();
export default rootCauseAnalyzer;
