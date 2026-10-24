export type UXMetricType = 'CLS' | 'LCP' | 'INP' | 'FCP';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';
export type UserSegment =
  'all' | 'desktop' | 'mobile' | 'tablet' | 'new_user' | 'returning_user' | 'power_user';

export interface FunnelStep {
  name: string;
  value: number;
  percentage: number;
  previousValue?: number;
}
