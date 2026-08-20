import i18n from '@/i18n';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'firing' | 'acknowledged' | 'resolved' | 'suppressed';
export type AlertConditionOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'in' | 'nin';

export interface AlertCondition {
  metricName: string;
  operator: AlertConditionOperator;
  threshold: number | number[];
  duration?: number;
  moduleId?: string;
}

export interface CorrelationRule {
  id: string;
  name: string;
  description?: string;
  groupBy: string[];
  windowSize: number;
  minAlerts: number;
  enabled: boolean;
}

export interface SuppressionRule {
  id: string;
  name: string;
  description?: string;
  condition: Partial<{
    moduleId: string;
    alertName: string;
    severity: AlertSeverity;
    metricName: string;
  }>;
  startTime?: number;
  endTime?: number;
  enabled: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  enabled: boolean;
  notificationChannels?: string[];
  cooldown: number;
  createdAt: number;
  lastTriggered?: number;
  labels?: Record<string, string>;
}

export interface Alert {
  id: string;
  ruleId: string;
  name: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  metricName: string;
  moduleId?: string;
  value: number;
  threshold: number | number[];
  labels?: Record<string, string>;
  startedAt: number;
  endedAt?: number;
  acknowledgedAt?: number;
  acknowledgedBy?: string;
  resolvedBy?: string;
  resolvedReason?: string;
  count: number;
  fingerprint: string;
  suppressedBy?: string;
}

export interface AlertStats {
  total: number;
  firing: number;
  acknowledged: number;
  resolved: number;
  suppressed: number;
  bySeverity: Record<AlertSeverity, number>;
  byModule: Record<string, number>;
  byMetric: Record<string, number>;
  last24h: number;
  last1h: number;
}

interface SmartAlertingConfig {
  defaultCooldown: number;
  maxAlerts: number;
  enableCorrelation: boolean;
  enableSuppression: boolean;
}

const DEFAULT_CONFIG: SmartAlertingConfig = {
  defaultCooldown: 300000,
  maxAlerts: 2000,
  enableCorrelation: true,
  enableSuppression: true,
};

export class SmartAlertManager {
  private config: SmartAlertingConfig;
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private correlationRules: Map<string, CorrelationRule> = new Map();
  private suppressionRules: Map<string, SuppressionRule> = new Map();
  private listeners: Set<(alert: Alert, event: 'created' | 'updated' | 'resolved') => void> =
    new Set();
  private lastFired: Map<string, number> = new Map();

  constructor(config: Partial<SmartAlertingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  addRule(rule: Omit<AlertRule, 'id' | 'createdAt'> & { id?: string }): AlertRule {
    const id = rule.id || `rule-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const newRule: AlertRule = {
      ...rule,
      id,
      createdAt: Date.now(),
      cooldown: rule.cooldown || this.config.defaultCooldown,
    };
    this.rules.set(id, newRule);
    return newRule;
  }

  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  getRule(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  updateRule(ruleId: string, updates: Partial<AlertRule>): AlertRule | undefined {
    const rule = this.rules.get(ruleId);
    if (!rule) return undefined;
    const updated = { ...rule, ...updates };
    this.rules.set(ruleId, updated);
    return updated;
  }

  addCorrelationRule(rule: Omit<CorrelationRule, 'id'> & { id?: string }): CorrelationRule {
    const id = rule.id || `corr-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const newRule: CorrelationRule = { ...rule, id };
    this.correlationRules.set(id, newRule);
    return newRule;
  }

  removeCorrelationRule(id: string): boolean {
    return this.correlationRules.delete(id);
  }

  addSuppressionRule(rule: Omit<SuppressionRule, 'id'> & { id?: string }): SuppressionRule {
    const id = rule.id || `supp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const newRule: SuppressionRule = { ...rule, id };
    this.suppressionRules.set(id, newRule);
    return newRule;
  }

  removeSuppressionRule(id: string): boolean {
    return this.suppressionRules.delete(id);
  }

  processMetrics(
    metrics: { metricName: string; value: number; moduleId?: string; timestamp?: number }[]
  ): Alert[] {
    const triggeredAlerts: Alert[] = [];
    const now = Date.now();

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      const matchingMetrics = metrics.filter(
        (m) =>
          m.metricName === rule.condition.metricName &&
          (!rule.condition.moduleId || m.moduleId === rule.condition.moduleId)
      );

      for (const metric of matchingMetrics) {
        if (this.checkCondition(metric.value, rule.condition)) {
          const key = this.getFingerprint(rule, metric.moduleId);
          const lastFired = this.lastFired.get(key);

          if (lastFired && now - lastFired < rule.cooldown) {
            const existing = this.alerts.get(key);
            if (existing && existing.status === 'firing') {
              existing.count++;
              existing.value = metric.value;
            }
            continue;
          }

          const isSuppressed = this.checkSuppression(rule, metric.moduleId);
          const alert = this.createAlert(rule, metric, isSuppressed);

          this.alerts.set(alert.id, alert);
          this.lastFired.set(key, now);

          if (this.config.enableCorrelation) {
            this.checkCorrelation(alert);
          }

          if (!isSuppressed) {
            triggeredAlerts.push(alert);
            this.notifyListeners(alert, 'created');
          }
        }
      }
    }

    this.cleanupOldAlerts();
    return triggeredAlerts;
  }

  triggerAlert(
    alert: Omit<Alert, 'id' | 'startedAt' | 'count' | 'fingerprint' | 'status'> & {
      status?: AlertStatus;
    }
  ): Alert {
    const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const fingerprint = this.generateFingerprint(alert.ruleId, alert.metricName, alert.moduleId);
    const newAlert: Alert = {
      ...alert,
      id,
      status: alert.status || 'firing',
      startedAt: Date.now(),
      count: 1,
      fingerprint,
    };
    this.alerts.set(id, newAlert);
    this.notifyListeners(newAlert, 'created');
    return newAlert;
  }

  acknowledgeAlert(alertId: string, acknowledgedBy?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    alert.status = 'acknowledged';
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = acknowledgedBy;
    this.notifyListeners(alert, 'updated');
    return true;
  }

  resolveAlert(alertId: string, resolvedBy?: string, reason?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    alert.status = 'resolved';
    alert.endedAt = Date.now();
    alert.resolvedBy = resolvedBy;
    alert.resolvedReason = reason;
    this.notifyListeners(alert, 'resolved');
    return true;
  }

  suppressAlert(alertId: string, suppressedBy?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;
    alert.status = 'suppressed';
    alert.suppressedBy = suppressedBy;
    this.notifyListeners(alert, 'updated');
    return true;
  }

  subscribe(
    callback: (alert: Alert, event: 'created' | 'updated' | 'resolved') => void
  ): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getAlerts(options?: {
    status?: AlertStatus;
    severity?: AlertSeverity;
    moduleId?: string;
    metricName?: string;
    limit?: number;
    offset?: number;
  }): Alert[] {
    let alerts = Array.from(this.alerts.values());

    if (options?.status) {
      alerts = alerts.filter((a) => a.status === options.status);
    }
    if (options?.severity) {
      alerts = alerts.filter((a) => a.severity === options.severity);
    }
    if (options?.moduleId) {
      alerts = alerts.filter((a) => a.moduleId === options.moduleId);
    }
    if (options?.metricName) {
      alerts = alerts.filter((a) => a.metricName === options.metricName);
    }

    alerts.sort((a, b) => b.startedAt - a.startedAt);

    if (options?.offset) {
      alerts = alerts.slice(options.offset);
    }
    if (options?.limit) {
      alerts = alerts.slice(0, options.limit);
    }

    return alerts;
  }

  getAlertStats(): AlertStats {
    const alerts = Array.from(this.alerts.values());
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const last1h = now - 60 * 60 * 1000;

    const stats: AlertStats = {
      total: alerts.length,
      firing: 0,
      acknowledged: 0,
      resolved: 0,
      suppressed: 0,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byModule: {},
      byMetric: {},
      last24h: 0,
      last1h: 0,
    };

    for (const alert of alerts) {
      stats[alert.status]++;
      stats.bySeverity[alert.severity]++;

      if (alert.moduleId) {
        stats.byModule[alert.moduleId] = (stats.byModule[alert.moduleId] || 0) + 1;
      }
      stats.byMetric[alert.metricName] = (stats.byMetric[alert.metricName] || 0) + 1;

      if (alert.startedAt >= last24h) stats.last24h++;
      if (alert.startedAt >= last1h) stats.last1h++;
    }

    return stats;
  }

  getConfig(): SmartAlertingConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<SmartAlertingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  clear(): void {
    this.rules.clear();
    this.alerts.clear();
    this.correlationRules.clear();
    this.suppressionRules.clear();
    this.lastFired.clear();
  }

  private checkCondition(value: number, condition: AlertCondition): boolean {
    const threshold = condition.threshold;
    switch (condition.operator) {
      case 'gt':
        return value > (threshold as number);
      case 'gte':
        return value >= (threshold as number);
      case 'lt':
        return value < (threshold as number);
      case 'lte':
        return value <= (threshold as number);
      case 'eq':
        return value === (threshold as number);
      case 'neq':
        return value !== (threshold as number);
      case 'in':
        return (threshold as number[]).includes(value);
      case 'nin':
        return !(threshold as number[]).includes(value);
      default:
        return false;
    }
  }

  private checkSuppression(rule: AlertRule, moduleId?: string): boolean {
    if (!this.config.enableSuppression) return false;

    const now = Date.now();
    for (const suppression of this.suppressionRules.values()) {
      if (!suppression.enabled) continue;
      if (suppression.startTime && now < suppression.startTime) continue;
      if (suppression.endTime && now > suppression.endTime) continue;

      const cond = suppression.condition;
      if (cond.moduleId && moduleId !== cond.moduleId) continue;
      if (cond.alertName && rule.name !== cond.alertName) continue;
      if (cond.severity && rule.severity !== cond.severity) continue;
      if (cond.metricName && rule.condition.metricName !== cond.metricName) continue;

      return true;
    }
    return false;
  }

  private checkCorrelation(alert: Alert): void {
    if (!this.config.enableCorrelation) return;

    const now = Date.now();
    for (const rule of this.correlationRules.values()) {
      if (!rule.enabled) continue;

      const recentAlerts = Array.from(this.alerts.values()).filter(
        (a) => a.status === 'firing' && now - a.startedAt < rule.windowSize
      );

      if (recentAlerts.length >= rule.minAlerts) {
        alert.message = `${i18n.t('microfrontend.smart-alerting.k0')}${recentAlerts.length}${i18n.t('microfrontend.smart-alerting.k1')}${alert.message}`;
      }
    }
  }

  private createAlert(
    rule: AlertRule,
    metric: { metricName: string; value: number; moduleId?: string; timestamp?: number },
    isSuppressed: boolean
  ): Alert {
    const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const fingerprint = this.getFingerprint(rule, metric.moduleId);
    return {
      id,
      ruleId: rule.id,
      name: rule.name,
      severity: rule.severity,
      status: isSuppressed ? 'suppressed' : 'firing',
      message: `${rule.name}: ${metric.metricName} = ${metric.value}`,
      metricName: metric.metricName,
      moduleId: metric.moduleId,
      value: metric.value,
      threshold: rule.condition.threshold,
      labels: rule.labels,
      startedAt: Date.now(),
      count: 1,
      fingerprint,
      suppressedBy: isSuppressed ? 'rule' : undefined,
    };
  }

  private getFingerprint(rule: AlertRule, moduleId?: string): string {
    return `${rule.id}:${moduleId || 'global'}`;
  }

  private generateFingerprint(ruleId: string, metricName: string, moduleId?: string): string {
    return `${ruleId}:${metricName}:${moduleId || 'global'}`;
  }

  private cleanupOldAlerts(): void {
    const alerts = Array.from(this.alerts.values());
    if (alerts.length <= this.config.maxAlerts) return;

    alerts.sort((a, b) => a.startedAt - b.startedAt);
    const toRemove = alerts.slice(0, alerts.length - this.config.maxAlerts);
    for (const alert of toRemove) {
      this.alerts.delete(alert.id);
    }
  }

  private notifyListeners(alert: Alert, event: 'created' | 'updated' | 'resolved'): void {
    this.listeners.forEach((listener) => listener(alert, event));
  }
}

export const smartAlertManager = new SmartAlertManager();
export default smartAlertManager;
