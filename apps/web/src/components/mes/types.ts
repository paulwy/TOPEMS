import type { WorkStation } from '@/api/mes';

export interface RealtimeAlarm {
  id: string;
  level: 'critical' | 'warning' | 'info';
  source: string;
  message: string;
  timestamp: string;
  acknowledged?: boolean;
}

export interface WorkStationUtilization {
  workStation: WorkStation;
  utilization: number;
  activeOrders: number;
  todayOutput: number;
}

export interface EquipmentStatusBucket {
  status: string;
  label: string;
  count: number;
  color?: string;
}

export interface TrendPoint {
  name: string;
  value: number;
  target?: number;
}

export type RefreshStatus = 'idle' | 'loading' | 'success' | 'error';
