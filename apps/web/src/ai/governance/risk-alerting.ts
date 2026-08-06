export type RiskCategory = 'Security' | 'Compliance' | 'Performance' | 'Financial';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface RiskIndicator {
  id: string;
  name: string;
  category: RiskCategory;
  threshold: number;
  current_value: number;
  severity: RiskLevel;
  unit: string;
  description: string;
  direction: 'above' | 'below';
  metadata?: Record<string, unknown>;
}

export interface RiskAlert {
  id: string;
  indicator_id: string;
  indicator_name: string;
  category: RiskCategory;
  severity: RiskLevel;
  message: string;
  created_at: number;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: number;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: number;
  evidence: string;
  channel: 'email' | 'sms' | 'webhook' | 'in_app';
  assignee?: string;
  tags: string[];
}

export interface RiskScore {
  overall: number;
  by_category: Record<RiskCategory, number>;
  bySeverity: Record<RiskLevel, number>;
  trend: 'improving' | 'stable' | 'deteriorating';
  components: Array<{
    indicator_id: string;
    score: number;
    weight: number;
    contribution: number;
  }>;
}

export type AlertSubscriber = (alert: RiskAlert) => void;

const DEFAULT_INDICATORS: RiskIndicator[] = [
  {
    id: 'sec-failed-logins',
    name: '登录失败率',
    category: 'Security',
    threshold: 10,
    current_value: 3,
    severity: 'high',
    unit: '%',
    description: '每分钟登录失败尝试比例',
    direction: 'above',
  },
  {
    id: 'sec-unusual-access',
    name: '异常访问检测',
    category: 'Security',
    threshold: 5,
    current_value: 1,
    severity: 'critical',
    unit: '次/小时',
    description: '检测到的异常访问行为数量',
    direction: 'above',
  },
  {
    id: 'comp-pending-items',
    name: '待处理合规项',
    category: 'Compliance',
    threshold: 20,
    current_value: 12,
    severity: 'medium',
    unit: '项',
    description: '未完成的合规检查项数量',
    direction: 'above',
  },
  {
    id: 'comp-regulation-gaps',
    name: '法规差距',
    category: 'Compliance',
    threshold: 3,
    current_value: 2,
    severity: 'high',
    unit: '项',
    description: '与法规要求的差距数量',
    direction: 'above',
  },
  {
    id: 'perf-api-latency',
    name: 'API 响应延迟',
    category: 'Performance',
    threshold: 500,
    current_value: 280,
    severity: 'medium',
    unit: 'ms',
    description: 'API 平均响应时间',
    direction: 'above',
  },
  {
    id: 'perf-error-rate',
    name: '错误发生率',
    category: 'Performance',
    threshold: 1,
    current_value: 0.2,
    severity: 'high',
    unit: '%',
    description: '请求错误响应比例',
    direction: 'above',
  },
  {
    id: 'perf-resource-usage',
    name: '资源使用率',
    category: 'Performance',
    threshold: 85,
    current_value: 62,
    severity: 'high',
    unit: '%',
    description: '系统资源平均使用率',
    direction: 'above',
  },
  {
    id: 'fin-budget-utilization',
    name: '预算使用率',
    category: 'Financial',
    threshold: 90,
    current_value: 68,
    severity: 'medium',
    unit: '%',
    description: '当前预算使用比例',
    direction: 'above',
  },
  {
    id: 'fin-revenue-decline',
    name: '收入下降',
    category: 'Financial',
    threshold: 10,
    current_value: 3,
    severity: 'high',
    unit: '%',
    description: '环比收入下降百分比',
    direction: 'above',
  },
  {
    id: 'fin-cost-overrun',
    name: '成本超支',
    category: 'Financial',
    threshold: 15,
    current_value: 5,
    severity: 'medium',
    unit: '%',
    description: '项目成本超支比例',
    direction: 'above',
  },
];

export class RiskAlerter {
  private indicators: RiskIndicator[];
  private alerts: RiskAlert[];
  private subscribers: AlertSubscriber[];

  constructor() {
    this.indicators = [...DEFAULT_INDICATORS];
    this.alerts = [];
    this.subscribers = [];
  }

  evaluateRisks(indicators?: RiskIndicator[]): RiskAlert[] {
    const targets = indicators ?? this.indicators;
    const newAlerts: RiskAlert[] = [];

    for (const indicator of targets) {
      const breached = this.isThresholdBreached(indicator);

      if (breached) {
        const existing = this.alerts.some((a) => a.indicator_id === indicator.id && !a.resolved);

        if (!existing) {
          const alert: RiskAlert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            indicator_id: indicator.id,
            indicator_name: indicator.name,
            category: indicator.category,
            severity: indicator.severity,
            message: this.generateAlertMessage(indicator),
            created_at: Date.now(),
            acknowledged: false,
            resolved: false,
            evidence: this.generateEvidence(indicator),
            channel: this.determineChannel(indicator.severity),
            tags: [indicator.category, indicator.severity],
          };
          newAlerts.push(alert);
          this.alerts.push(alert);
          this.notifySubscribers(alert);
        }
      } else {
        const activeAlerts = this.alerts.filter(
          (a) => a.indicator_id === indicator.id && !a.resolved
        );
        for (const alert of activeAlerts) {
          alert.resolved = true;
          alert.resolved_at = Date.now();
          alert.resolved_by = 'system';
        }
      }
    }

    return newAlerts;
  }

  getAlerts(filter?: {
    status?: 'active' | 'acknowledged' | 'resolved' | 'all';
    category?: RiskCategory;
    severity?: RiskLevel;
    limit?: number;
  }): RiskAlert[] {
    let result = [...this.alerts];

    if (filter?.status && filter.status !== 'all') {
      switch (filter.status) {
        case 'active':
          result = result.filter((a) => !a.acknowledged && !a.resolved);
          break;
        case 'acknowledged':
          result = result.filter((a) => a.acknowledged && !a.resolved);
          break;
        case 'resolved':
          result = result.filter((a) => a.resolved);
          break;
      }
    }

    if (filter?.category) {
      result = result.filter((a) => a.category === filter.category);
    }
    if (filter?.severity) {
      result = result.filter((a) => a.severity === filter.severity);
    }

    result = result.sort((a, b) => b.created_at - a.created_at);

    if (filter?.limit) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  acknowledgeAlert(alert_id: string, by: string): boolean {
    const alert = this.alerts.find((a) => a.id === alert_id);
    if (!alert || alert.acknowledged) return false;

    alert.acknowledged = true;
    alert.acknowledged_by = by;
    alert.acknowledged_at = Date.now();
    return true;
  }

  resolveAlert(alert_id: string, by: string): boolean {
    const alert = this.alerts.find((a) => a.id === alert_id);
    if (!alert || alert.resolved) return false;

    alert.resolved = true;
    alert.resolved_by = by;
    alert.resolved_at = Date.now();
    return true;
  }

  configureThreshold(indicator_id: string, threshold: number): boolean {
    const indicator = this.indicators.find((i) => i.id === indicator_id);
    if (!indicator) return false;

    indicator.threshold = threshold;
    return true;
  }

  getRiskScore(): RiskScore {
    const activeAlerts = this.alerts.filter((a) => !a.resolved);
    const scoresByCategory: Record<RiskCategory, number> = {
      Security: 0,
      Compliance: 0,
      Performance: 0,
      Financial: 0,
    };
    const scoresBySeverity: Record<RiskLevel, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    const severityWeights: Record<RiskLevel, number> = {
      critical: 40,
      high: 25,
      medium: 12,
      low: 5,
    };

    for (const alert of activeAlerts) {
      const weight = severityWeights[alert.severity];
      scoresByCategory[alert.category] += weight;
      scoresBySeverity[alert.severity] += weight;
    }

    const maxPossibleScore = this.indicators.length * severityWeights.critical;
    const rawScore = Object.values(scoresBySeverity).reduce((sum, v) => sum + v, 0);
    const overall = Math.min(100, Math.round((rawScore / maxPossibleScore) * 100));

    const components = this.indicators.map((indicator) => {
      const breached = this.isThresholdBreached(indicator);
      const sevWeight = severityWeights[indicator.severity];
      const score = breached ? sevWeight : 0;
      const weight = sevWeight / maxPossibleScore;
      return {
        indicator_id: indicator.id,
        score,
        weight,
        contribution: Math.round(weight * 100),
      };
    });

    let trend: RiskScore['trend'] = 'stable';
    const recentAlerts = this.alerts.slice(-5);
    if (recentAlerts.length >= 2) {
      const firstHalf = recentAlerts.slice(0, Math.floor(recentAlerts.length / 2));
      const secondHalf = recentAlerts.slice(Math.floor(recentAlerts.length / 2));
      const firstScore = this.calculateAlertScore(firstHalf);
      const secondScore = this.calculateAlertScore(secondHalf);
      if (secondScore > firstScore * 1.2) trend = 'deteriorating';
      else if (secondScore < firstScore * 0.8) trend = 'improving';
    }

    return {
      overall,
      by_category: scoresByCategory,
      bySeverity: scoresBySeverity,
      trend,
      components,
    };
  }

  subscribeAlerts(callback: AlertSubscriber): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  getIndicators(): RiskIndicator[] {
    return [...this.indicators];
  }

  updateIndicator(id: string, updates: Partial<RiskIndicator>): boolean {
    const idx = this.indicators.findIndex((i) => i.id === id);
    if (idx === -1) return false;
    this.indicators[idx] = { ...this.indicators[idx], ...updates };
    return true;
  }

  addIndicator(indicator: Omit<RiskIndicator, 'id'>): RiskIndicator {
    const newIndicator: RiskIndicator = {
      ...indicator,
      id: `ind-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    this.indicators.push(newIndicator);
    return newIndicator;
  }

  private isThresholdBreached(indicator: RiskIndicator): boolean {
    if (indicator.direction === 'above') {
      return indicator.current_value >= indicator.threshold;
    }
    return indicator.current_value <= indicator.threshold;
  }

  private generateAlertMessage(indicator: RiskIndicator): string {
    const direction = indicator.direction === 'above' ? '超过' : '低于';
    return `[${indicator.severity.toUpperCase()}] ${indicator.name} ${direction}阈值: 当前 ${indicator.current_value}${indicator.unit}，阈值 ${indicator.threshold}${indicator.unit}`;
  }

  private generateEvidence(indicator: RiskIndicator): string {
    return `指标 ${indicator.name}(ID: ${indicator.id}) 当前值 ${indicator.current_value}${indicator.unit} ${indicator.direction === 'above' ? '≥' : '≤'} 阈值 ${indicator.threshold}${indicator.unit}。分类: ${indicator.category}。`;
  }

  private determineChannel(severity: RiskLevel): RiskAlert['channel'] {
    switch (severity) {
      case 'critical':
        return 'sms';
      case 'high':
        return 'email';
      case 'medium':
        return 'webhook';
      case 'low':
        return 'in_app';
    }
  }

  private calculateAlertScore(alerts: RiskAlert[]): number {
    const weights: Record<RiskLevel, number> = {
      critical: 40,
      high: 25,
      medium: 12,
      low: 5,
    };
    return alerts.reduce((sum, a) => sum + (weights[a.severity] || 0), 0);
  }

  private notifySubscribers(alert: RiskAlert): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(alert);
      } catch {
        // silently ignore subscriber errors
      }
    }
  }
}

export const riskAlerter = new RiskAlerter();
