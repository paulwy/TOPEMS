export type RiskCategory = 'Security' | 'Compliance' | 'Performance' | 'Financial';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

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
