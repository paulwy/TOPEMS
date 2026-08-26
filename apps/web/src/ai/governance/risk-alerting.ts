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
